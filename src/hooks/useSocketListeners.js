import { useEffect } from 'react';
import Swal from 'sweetalert2';
import { showSuccessAlert, showErrorAlert } from '../sweetalert2';

export const useSocketListeners = (
    socket,
    chatState,
    messageFunctions,
    authData
) => {
    // Desestructurar estado
    const {
        setUserList, setUserListPage, setUserListHasMore, setUserListLoading,
        setRoomUsers, setMyActiveRooms, setAssignedConversations,
        setMonitoringConversations, setUnreadMessages, setPendingMentions,
        setTypingUser, setRoomTypingUsers, setPinnedMessageId,
        // Refs vitales
        currentRoomCodeRef, toRef, isGroupRef, currentUserFullNameRef
    } = chatState;

    // Desestructurar funciones
    const {
        addNewMessage, updateMessage, playMessageSound,
        loadAssignedConversations, loadMyActiveRooms, clearMessages
    } = messageFunctions;

    const { username, user, isAdmin } = authData;

    useEffect(() => {
        if (!socket) return;

        const s = socket;

        // =====================================================
        // 1. USUARIOS Y LISTAS
        // =====================================================
        s.on("userList", (data) => {
            setUserList(data.users);
            setUserListPage(data.page || 0);
            setUserListHasMore(data.hasMore || false);
            setUserListLoading(false);
        });

        s.on("userListPage", (data) => {
            setUserList((prev) => [...prev, ...data.users]);
            setUserListPage(data.page);
            setUserListHasMore(data.hasMore || false);
            setUserListLoading(false);
        });

        // =====================================================
        // 2. SALAS Y GRUPOS
        // =====================================================
        s.on("roomUsers", (data) => {
            if (data.roomCode === currentRoomCodeRef.current) {
                setRoomUsers(data.users);
            }
            if (data.roomCode !== currentRoomCodeRef.current) {
                setMyActiveRooms((prevRooms) =>
                    prevRooms.map((room) =>
                        room.roomCode === data.roomCode
                            ? { ...room, currentMembers: data.users.length }
                            : room
                    )
                );
            }
        });

        s.on("userJoinedRoom", (data) => {
            if (data.roomCode === currentRoomCodeRef.current) {
                setRoomUsers((prev) => {
                    const exists = prev.some(u => (u.username || u) === data.user.username);
                    return exists ? prev : [...prev, data.user];
                });
            }
        });

        // =====================================================
        // 3. MENSAJERÍA (CORE)
        // =====================================================
        s.on("message", (data) => {
            let timeString = data.time || new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

            const currentFullName = currentUserFullNameRef.current;
            const isOwnMessage = data.from === username || data.from === currentFullName;

            // Filtro: ¿Pertenece al chat abierto?
            let shouldAdd = false;
            const currentTo = toRef.current;
            const currentRoom = currentRoomCodeRef.current;
            const currentIsGroup = isGroupRef.current;

            if (data.isGroup) {
                if (currentIsGroup && currentRoom === data.roomCode) {
                    shouldAdd = true;
                } else {
                    // Notificación de fondo para grupos
                    if (data.roomCode) {
                        setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + 1 }));
                        setMyActiveRooms(prev => prev.map(r => r.roomCode === data.roomCode ? {
                            ...r, lastMessage: { text: data.message, from: data.from, time: timeString },
                            lastMessageFrom: data.from, lastMessageTime: timeString
                        } : r));
                    }
                    if (!isOwnMessage) playMessageSound(true);
                }
            } else {
                // Chat 1 a 1
                const chatPartner = currentTo?.toLowerCase().trim();
                const msgFrom = data.from?.toLowerCase().trim();
                const msgTo = data.to?.toLowerCase().trim();

                if (chatPartner && (chatPartner === msgFrom || chatPartner === msgTo)) {
                    shouldAdd = true;
                } else {
                    // Actualizar preview en lista de asignados si no está abierto
                    setAssignedConversations(prev => prev.map(conv => {
                        const participants = conv.participants || [];
                        const isThisConv = participants.some(p => p.toLowerCase() === msgFrom) &&
                            participants.some(p => p.toLowerCase() === msgTo);
                        if (isThisConv) {
                            return { ...conv, lastMessage: data.message, lastMessageTime: data.sentAt, unreadCount: (conv.unreadCount || 0) + 1 };
                        }
                        return conv;
                    }));
                    if (!isOwnMessage) playMessageSound(true);
                }
            }

            if (shouldAdd) {
                addNewMessage({
                    ...data,
                    id: data.id,
                    sender: isOwnMessage ? "Tú" : data.from,
                    realSender: data.from,
                    isSent: isOwnMessage,
                    isSelf: isOwnMessage,
                    time: timeString,
                    // 🔥 AQUÍ ESTÁ EL FIX: Asignar message a text
                    text: data.text || data.message || "",

                    // Resto de propiedades igual...
                    mediaType: data.mediaType,
                    mediaData: data.mediaData,
                    fileName: data.fileName,
                    type: data.type,
                    videoCallUrl: data.videoCallUrl,
                    videoRoomID: data.videoRoomID,
                    metadata: data.metadata
                });
            }
        });

        // =====================================================
        // 4. MONITOREO (ADMIN)
        // =====================================================
        s.on("monitoringMessage", (data) => {
            // Actualizar lista de monitoreo en tiempo real
            setMonitoringConversations((prevConversations) => {
                let conversationFound = false;
                const dateTimeString = data.sentAt || new Date().toISOString();

                const updatedConversations = prevConversations.map((conv) => {
                    const participants = conv.participants || [];
                    const isThisConversation =
                        participants.some(p => p.toLowerCase().trim() === data.from.toLowerCase().trim()) &&
                        participants.some(p => p.toLowerCase().trim() === data.to.toLowerCase().trim());

                    if (isThisConversation) {
                        conversationFound = true;
                        return {
                            ...conv,
                            lastMessage: data.message || "",
                            lastMessageTime: dateTimeString,
                            lastMessageFrom: data.from,
                        };
                    }
                    return conv;
                });

                if (!conversationFound) {
                    // Si es nueva, agregarla (lógica simplificada)
                    return [{
                        id: data.id || `temp-${Date.now()}`,
                        name: `${data.from} • ${data.to}`,
                        participants: [data.from, data.to],
                        lastMessage: data.message,
                        lastMessageTime: dateTimeString,
                        isGroup: false,
                        unreadCount: 0
                    }, ...updatedConversations];
                }
                return updatedConversations;
            });
        });

        // =====================================================
        // 5. EVENTOS DE GESTIÓN Y NOTIFICACIONES
        // =====================================================

        s.on("messageDeleted", (data) => {
            updateMessage(data.messageId, {
                isDeleted: true,
                text: data.deletedBy ? `Eliminado por ${data.deletedBy}` : "Mensaje eliminado"
            });
        });

        s.on("messageEdited", (data) => {
            updateMessage(data.messageId, {
                text: data.newText,
                isEdited: true,
                editedAt: data.editedAt
            });
        });

        s.on("kicked", async (data) => {
            clearMessages();
            chatState.setTo('');
            chatState.setIsGroup(false);
            chatState.setCurrentRoomCode(null);
            currentRoomCodeRef.current = null;
            await showErrorAlert("Expulsado", data.message || "Has sido expulsado de la sala");
        });

        s.on("roomDeactivated", async (data) => {
            if (currentRoomCodeRef.current === data.roomCode) {
                chatState.setTo('');
                chatState.setIsGroup(false);
                chatState.setCurrentRoomCode(null);
                currentRoomCodeRef.current = null;
                clearMessages();
                showErrorAlert("Sala desactivada", data.message);
            }
            if (user?.role === "ADMIN") loadMyActiveRooms();
        });

        s.on("addedToRoom", (data) => {
            if (currentRoomCodeRef.current !== data.roomCode) {
                showSuccessAlert("Agregado a sala", data.message);
            }
            loadMyActiveRooms(); // Recargar lista de salas
        });

        s.on("removedFromRoom", (data) => {
            if (currentRoomCodeRef.current === data.roomCode) {
                chatState.setTo('');
                chatState.setIsGroup(false);
                chatState.setCurrentRoomCode(null);
                currentRoomCodeRef.current = null;
                clearMessages();
            }
            loadMyActiveRooms();
            showErrorAlert("Eliminado de sala", data.message);
        });

        s.on("newConversationAssigned", () => {
            loadAssignedConversations();
            showSuccessAlert("Nueva conversación", "Se te ha asignado un nuevo chat.");
        });

        s.on("userTyping", (data) => {
            if (data.from === toRef.current && !data.isGroup) {
                setTypingUser(data.isTyping ? { username: data.from } : null);
            }
        });

        s.on("roomTyping", (data) => {
            const { from, roomCode, isTyping } = data;
            setRoomTypingUsers(prev => {
                const current = prev[roomCode] || [];
                if (isTyping) {
                    if (!current.find(u => u.username === from)) return { ...prev, [roomCode]: [...current, { username: from }] };
                } else {
                    return { ...prev, [roomCode]: current.filter(u => u.username !== from) };
                }
                return prev;
            });
        });

        s.on("roomCreated", (data) => {
            if (user?.role === "ADMIN" || user?.role === "JEFEPISO") {
                loadMyActiveRooms();
            }
        });

        s.on("reactionUpdated", (data) => {
            updateMessage(data.messageId, { reactions: data.reactions });
        });

        s.on("threadCountUpdated", (data) => {
            updateMessage(data.messageId, (prev) => ({
                threadCount: (prev.threadCount || 0) + 1,
                lastReplyFrom: data.lastReplyFrom
            }));
        });

        s.on("conversationRead", (data) => {
            if (data.messageIds) {
                data.messageIds.forEach(id => updateMessage(id, { isRead: true, readBy: [data.readBy] }));
            }
        });

        s.on("unreadCountUpdate", (data) => {
            if (data.roomCode !== currentRoomCodeRef.current) {
                setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + data.count }));
            }
        });

        s.on("videoCallEnded", (data) => {
            updateMessage(null, {
                videoRoomID: data.roomID,
                metadata: { isActive: false, closedBy: data.closedBy }
            });
        });

        // Limpieza al desmontar
        return () => {
            s.off("userList"); s.off("userListPage"); s.off("roomUsers");
            s.off("userJoinedRoom"); s.off("message"); s.off("messageDeleted");
            s.off("messageEdited"); s.off("newConversationAssigned");
            s.off("userTyping"); s.off("roomTyping"); s.off("roomCreated");
            s.off("conversationRead"); s.off("unreadCountUpdate");
            s.off("videoCallEnded"); s.off("kicked"); s.off("roomDeactivated");
            s.off("addedToRoom"); s.off("removedFromRoom"); s.off("monitoringMessage");
            s.off("reactionUpdated"); s.off("threadCountUpdated");
        };

    }, [socket, username]);
};