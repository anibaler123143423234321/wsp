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

    const { username, user } = authData;

    useEffect(() => {
        if (!socket) return;

        const s = socket;

        s.on('roomJoined', (data) => {
            console.log('🏠 Room Joined:', data);

            // 1. Actualizar la lista de usuarios (ya lo haces probablemente)
            chatState.setRoomUsers(data.users);

            // 2. 🔥 ESTO ES LO QUE FALTA: Actualizar el mensaje fijado inicial
            // Si el backend manda null, se limpia. Si manda un ID, se fija.
            chatState.setPinnedMessageId(data.pinnedMessageId || null);
        });

        s.on('messagePinned', (data) => {
            console.log('📌 Message Pinned Event:', data);
            // Actualizar estado en tiempo real cuando alguien fija algo
            chatState.setPinnedMessageId(data.messageId);
        });

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
            const messageText = data.text || data.message || (data.fileName ? "📎 Archivo" : "");

            const currentFullName = currentUserFullNameRef.current;
            const isOwnMessage = data.from === username || data.from === currentFullName;

            // ------------------------------------------------
            // 🔥 LÓGICA DE NOTIFICACIONES Y SONIDO (RESTAURADA)
            // ------------------------------------------------
            if (!isOwnMessage) {
                // 1. Reproducir sonido
                playMessageSound(true);

                // 2. Verificar Menciones (@)
                const isMentioned = data.isGroup && data.hasMention;

                if (isMentioned) {
                    // Alerta especial para menciones
                    Swal.fire({
                        icon: "warning",
                        title: "📢 ¡Te mencionaron!",
                        html: `
                          <strong>${data.from}</strong> te mencionó en <strong>${data.groupName || data.group || "un grupo"}</strong>
                          <br><br>
                          <em>"${messageText.substring(0, 100)}${messageText.length > 100 ? "..." : ""}"</em>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: "Ir al grupo",
                        confirmButtonColor: "#dc2626",
                        showCancelButton: true,
                        cancelButtonText: "Cerrar",
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed && data.roomCode) {
                            window.dispatchEvent(new CustomEvent("navigateToMention", {
                                detail: { roomCode: data.roomCode, messageId: data.id }
                            }));
                        }
                    });
                } else {
                    // 3. Notificación Toast Normal (Bottom-Right)
                    let messageOrigin = data.isGroup ? `📁 ${data.groupName || data.group || "Grupo"}` : "💬 Chat individual";
                    let messageTitle = data.isGroup ? `${data.from} en ${data.groupName}` : `Nuevo mensaje de ${data.from}`;

                    Swal.fire({
                        toast: true,
                        position: "bottom-end",
                        icon: "info",
                        title: messageTitle,
                        html: `
                          <div style="text-align: left; font-size: 13px; margin-bottom: 10px;">
                            <div style="color: #666; margin-bottom: 4px;">${messageOrigin}</div>
                            <div style="color: #333;">${messageText.substring(0, 60)}${messageText.length > 60 ? "..." : ""}</div>
                          </div>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: "Ver",
                        confirmButtonColor: "#dc2626",
                        showCancelButton: true,
                        cancelButtonText: "✕",
                        timer: 5000,
                        timerProgressBar: true
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (data.isGroup) {
                                window.dispatchEvent(new CustomEvent("navigateToGroup", {
                                    detail: { roomCode: data.roomCode, groupName: data.groupName }
                                }));
                            } else {
                                window.dispatchEvent(new CustomEvent("navigateToChat", {
                                    detail: { username: data.from }
                                }));
                            }
                        }
                    });
                }
            }

            // ------------------------------------------------
            // 🔥 LÓGICA DE ACTUALIZACIÓN DE UI Y LISTAS
            // ------------------------------------------------
            const currentTo = toRef.current;
            const currentRoom = currentRoomCodeRef.current;
            const currentIsGroup = isGroupRef.current;

            let isChatOpen = false;

            // --- CASO A: GRUPOS ---
            if (data.isGroup) {
                if (currentIsGroup && currentRoom === data.roomCode) {
                    isChatOpen = true;
                }

                if (isChatOpen) {
                    addNewMessage({
                        ...data,
                        id: data.id,
                        sender: isOwnMessage ? "Tú" : data.from,
                        realSender: data.from,
                        isSent: isOwnMessage,
                        isSelf: isOwnMessage,
                        time: timeString,
                        text: messageText,
                        mediaType: data.mediaType,
                        mediaData: data.mediaData,
                        fileName: data.fileName,
                        type: data.type,
                        videoCallUrl: data.videoCallUrl,
                        videoRoomID: data.videoRoomID,
                        metadata: data.metadata
                    });
                } else {
                    // Si NO está abierto y NO es mío, aumentar contador local
                    if (!isOwnMessage && data.roomCode) {
                        setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + 1 }));
                    }
                }

                // ACTUALIZAR SIDEBAR (myActiveRooms)
                if (data.roomCode) {
                    setMyActiveRooms(prev => prev.map(r => {
                        if (r.roomCode === data.roomCode) {
                            return {
                                ...r,
                                lastMessage: {
                                    text: messageText,
                                    from: data.from,
                                    time: timeString,
                                    mediaType: data.mediaType,
                                    fileName: data.fileName
                                },
                                lastMessageFrom: data.from,
                                lastMessageTime: timeString
                            };
                        }
                        return r;
                    }));
                }

                // --- CASO B: CHATS INDIVIDUALES ---
            } else {
                const chatPartner = currentTo?.toLowerCase().trim();
                const msgFrom = data.from?.toLowerCase().trim();
                const msgTo = data.to?.toLowerCase().trim();

                if (chatPartner && (chatPartner === msgFrom || chatPartner === msgTo)) {
                    isChatOpen = true;
                }

                if (isChatOpen) {
                    addNewMessage({
                        ...data,
                        id: data.id,
                        sender: isOwnMessage ? "Tú" : data.from,
                        realSender: data.from,
                        isSent: isOwnMessage,
                        isSelf: isOwnMessage,
                        time: timeString,
                        text: messageText,
                        mediaType: data.mediaType,
                        mediaData: data.mediaData,
                        fileName: data.fileName,
                        type: data.type,
                        videoCallUrl: data.videoCallUrl,
                        videoRoomID: data.videoRoomID,
                        metadata: data.metadata
                    });
                }

                // Actualizar Sidebar (assignedConversations)
                setAssignedConversations(prev => prev.map(conv => {
                    const participants = conv.participants || [];
                    const participantsLower = participants.map(p => p?.toLowerCase().trim());
                    const isThisConv = participantsLower.includes(msgFrom) || participantsLower.includes(msgTo);

                    if (isThisConv) {
                        return {
                            ...conv,
                            lastMessage: messageText,
                            lastMessageTime: data.sentAt || new Date().toISOString(),
                            lastMessageFrom: data.from,
                            lastMessageMediaType: data.mediaType,
                            unreadCount: (!isChatOpen && !isOwnMessage) ? (conv.unreadCount || 0) + 1 : 0
                        };
                    }
                    return conv;
                }));
            }
        });

        // =====================================================
        // 4. EVENTOS DE ACTUALIZACIÓN DE CONTADORES (BACKEND)
        // =====================================================
        s.on("unreadCountUpdate", (data) => {
            // data = { roomCode, count, lastMessage }

            // 1. Actualizar contador rojo
            if (data.roomCode !== currentRoomCodeRef.current && data.count > 0) {
                setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + data.count }));
                // Reproducir sonido también aquí por si acaso (seguridad extra)
                playMessageSound(true);
            }

            // 2. Actualizar Sidebar (Respaldo del backend)
            if (data.lastMessage) {
                setMyActiveRooms((prevRooms) =>
                    prevRooms.map((room) =>
                        room.roomCode === data.roomCode
                            ? {
                                ...room,
                                lastMessage: {
                                    text: data.lastMessage.text || "",
                                    from: data.lastMessage.from,
                                    time: data.lastMessage.time,
                                    sentAt: data.lastMessage.sentAt,
                                    mediaType: data.lastMessage.mediaType || null,
                                    fileName: data.lastMessage.fileName || null,
                                },
                                lastMessageFrom: data.lastMessage.from,
                                lastMessageTime: data.lastMessage.time,
                                lastMessageAt: data.lastMessage.sentAt,
                            }
                            : room
                    )
                );
            }
        });

        s.on("unreadCountReset", (data) => {
            setUnreadMessages((prev) => ({ ...prev, [data.roomCode]: 0 }));
        });

        // =====================================================
        // 5. MONITOREO (ADMIN)
        // =====================================================
        s.on("monitoringMessage", (data) => {
            const messageText = data.text || data.message || (data.fileName ? "📎 Archivo" : "");

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
                            lastMessage: messageText,
                            lastMessageTime: dateTimeString,
                            lastMessageFrom: data.from,
                            lastMessageMediaType: data.mediaType
                        };
                    }
                    return conv;
                });

                if (!conversationFound) {
                    return [{
                        id: data.id || `temp-${Date.now()}`,
                        name: `${data.from} • ${data.to}`,
                        participants: [data.from, data.to],
                        lastMessage: messageText,
                        lastMessageTime: dateTimeString,
                        lastMessageMediaType: data.mediaType,
                        isGroup: false,
                        unreadCount: 0
                    }, ...updatedConversations];
                }
                return updatedConversations;
            });
        });

        // =====================================================
        // 6. RESTO DE EVENTOS
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
            loadMyActiveRooms();
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
            s.off("conversationRead"); s.off("unreadCountUpdate"); s.off("unreadCountReset");
            s.off("videoCallEnded"); s.off("kicked"); s.off("roomDeactivated");
            s.off("addedToRoom"); s.off("removedFromRoom"); s.off("monitoringMessage");
            s.off("reactionUpdated"); s.off("threadCountUpdated");
            s.off("messagePinned"); s.off("roomJoined");
        };

    }, [socket, username]);
};