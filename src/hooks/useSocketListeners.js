import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { showSuccessAlert, showErrorAlert } from '../sweetalert2';
import { systemNotifications } from '../utils/systemNotifications';


export const useSocketListeners = (
    socket,
    chatState,
    messageFunctions,
    authData
) => {
    // Desestructurar estado
    const {
        setUserList, setUserListPage, setUserListHasMore, setUserListLoading,
        setRoomUsers, setMyActiveRooms, myActiveRooms, setAssignedConversations, // 🔥 Agregado myActiveRooms
        setMonitoringConversations, setUnreadMessages, setPendingMentions,
        setTypingUser, setRoomTypingUsers, setPinnedMessageId,
        // Refs vitales
        currentRoomCodeRef, toRef, isGroupRef, currentUserFullNameRef
    } = chatState;

    // Desestructurar funciones
    const {
        addNewMessage, updateMessage, playMessageSound,
        playRingtone, stopRingtone,
        loadAssignedConversations, loadMyActiveRooms, clearMessages
    } = messageFunctions;

    const { username, user, soundsEnabled, favoriteRoomCodes = [] } = authData;

    // 🔥 CRÍTICO: Usar ref para tener siempre el valor actualizado
    const soundsEnabledRef = useRef(soundsEnabled);
    const myActiveRoomsRef = useRef(myActiveRooms || []); // 🔥 Nuevo Ref

    // Actualizar ref cuando cambie soundsEnabled
    useEffect(() => {
        soundsEnabledRef.current = soundsEnabled;
    }, [soundsEnabled]);

    // 🔥 Actualizar ref cuando cambie myActiveRooms
    useEffect(() => {
        myActiveRoomsRef.current = myActiveRooms || [];
    }, [myActiveRooms]);

    // 🔥 FUNCIÓN DE ORDENAMIENTO IDÉNTICA AL BACKEND
    const sortRoomsByBackendLogic = (rooms, favoriteRoomCodes) => {
        // Separar favoritas y no favoritas
        const favorites = rooms.filter(r => favoriteRoomCodes.includes(r.roomCode));
        const nonFavorites = rooms.filter(r => !favoriteRoomCodes.includes(r.roomCode));

        // Función para ordenar un grupo (CON mensajes primero, SIN mensajes después)
        const sortGroup = (group) => {
            const withMessages = group.filter(r => r.lastMessage?.sentAt);
            const withoutMessages = group.filter(r => !r.lastMessage?.sentAt);

            // Ordenar CON mensajes por sentAt DESC
            withMessages.sort((a, b) => {
                const aDate = new Date(a.lastMessage.sentAt).getTime();
                const bDate = new Date(b.lastMessage.sentAt).getTime();
                return bDate - aDate;
            });

            // Ordenar SIN mensajes por createdAt DESC
            withoutMessages.sort((a, b) => {
                const aDate = new Date(a.createdAt).getTime();
                const bDate = new Date(b.createdAt).getTime();
                return bDate - aDate;
            });

            return [...withMessages, ...withoutMessages];
        };

        // Ordenar cada grupo y combinar
        const sortedFavorites = sortGroup(favorites);
        const sortedNonFavorites = sortGroup(nonFavorites);

        return [...sortedFavorites, ...sortedNonFavorites];
    };

    useEffect(() => {
        if (!socket) return;

        const s = socket;

        s.on('roomJoined', (data) => {
            console.log('🏠 Room Joined:', data);
            chatState.setRoomUsers(data.users);
            chatState.setPinnedMessageId(data.pinnedMessageId || null);
        });

        s.on('messagePinned', (data) => {
            console.log('📌 Message Pinned Event:', data);
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
            console.log("📩 Mensaje recibido en frontend:", data);

            // Si es un mensaje de monitoreo, ignorarlo aquí
            if (data.isMonitoring) return;

            let timeString = data.time || new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

            // Derivar texto del mensaje
            let messageText = data.text || data.message || "";
            if (!messageText && data.mediaType) {
                if (data.mediaType === 'image') messageText = "📷 Imagen";
                else if (data.mediaType === 'video') messageText = "🎥 Video";
                else if (data.mediaType === 'audio') messageText = "🎵 Audio";
                else if (data.mediaType === 'document') messageText = "📄 Documento";
                else messageText = "📎 Archivo";
            } else if (!messageText && data.fileName) {
                messageText = "📎 Archivo";
            }

            const currentFullName = currentUserFullNameRef.current;
            const isOwnMessage = data.from === username || data.from === currentFullName;

            // ------------------------------------------------
            // 🔥 CÁLCULO DE ESTADO DE CHAT ABIERTO
            // ------------------------------------------------
            const currentTo = toRef.current;
            const currentRoom = currentRoomCodeRef.current;
            const currentIsGroup = isGroupRef.current;
            let isChatOpen = false;

            if (data.isGroup) {
                if (currentIsGroup && currentRoom === data.roomCode) {
                    isChatOpen = true;
                }
            } else {
                const chatPartner = currentTo?.toLowerCase().trim();
                const msgFrom = data.from?.toLowerCase().trim();
                const msgTo = data.to?.toLowerCase().trim();
                if (chatPartner && (chatPartner === msgFrom || chatPartner === msgTo)) {
                    isChatOpen = true;
                }
            }

            if (!isOwnMessage) {
                const currentSoundsEnabled = soundsEnabledRef.current;

                // CASO A: GRUPOS
                if (data.isGroup) {
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
                        if (!isOwnMessage && data.roomCode) {
                            setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + 1 }));
                        }
                    }

                    if (data.roomCode) {
                        setMyActiveRooms(prev => {
                            const updated = prev.map(r => {
                                if (r.roomCode === data.roomCode) {
                                    return {
                                        ...r,
                                        lastMessage: messageText,
                                        lastMessageFrom: data.from,
                                        lastMessageTime: timeString,
                                        lastMessageAt: data.sentAt || new Date().toISOString(),
                                        lastMessageMediaType: data.mediaType,
                                        lastMessageFileName: data.fileName
                                    };
                                }
                                return r;
                            });
                            return sortRoomsByBackendLogic(updated, favoriteRoomCodes);
                        });
                    }

                    // CASO B: CHATS INDIVIDUALES
                } else {
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

                    setAssignedConversations(prev => prev.map(conv => {
                        if (data.conversationId && conv.id == data.conversationId) {
                            return {
                                ...conv,
                                lastMessage: messageText,
                                lastMessageTime: data.sentAt || new Date().toISOString(),
                                lastMessageFrom: data.from,
                                lastMessageMediaType: data.mediaType,
                                unreadCount: (!isChatOpen && !isOwnMessage) ? (conv.unreadCount || 0) + 1 : 0
                            };
                        }

                        if (!data.conversationId) {
                            const participants = conv.participants || [];
                            const participantsLower = participants.map(p => p?.toLowerCase().trim());
                            const isThisConv = participantsLower.includes(data.from?.toLowerCase().trim()) &&
                                participantsLower.includes(data.to?.toLowerCase().trim());

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
                        }
                        return conv;
                    }));

                    // 🔥 NOTIFICACIONES PARA CHATS INDIVIDUALES
                    if (!isChatOpen || systemNotifications.canShow()) {
                        playMessageSound(soundsEnabledRef.current);

                        if (systemNotifications.canShow()) {
                            systemNotifications.show(
                                `Nuevo mensaje de ${data.from}`,
                                messageText,
                                { tag: `chat-${data.from}`, silent: !soundsEnabledRef.current },
                                () => {
                                    window.dispatchEvent(new CustomEvent("navigateToChat", {
                                        detail: { to: data.from }
                                    }));
                                }
                            );
                        }

                        Swal.fire({
                            toast: true,
                            position: "bottom-end",
                            icon: "info",
                            title: `Mensaje de ${data.from}`,
                            html: `
                                <div class="toast-content">
                                    <div class="toast-message">${messageText.substring(0, 80)}${messageText.length > 80 ? "..." : ""}</div>
                                </div>
                            `,
                            showConfirmButton: true,
                            confirmButtonText: "Ver",
                            showCloseButton: true,
                            timer: 6000,
                            customClass: {
                                popup: 'modern-toast',
                                title: 'modern-toast-title',
                                htmlContainer: 'modern-toast-html',
                                confirmButton: 'modern-toast-btn',
                                icon: 'modern-toast-icon',
                                closeButton: 'modern-toast-close'
                            }
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.dispatchEvent(new CustomEvent("navigateToChat", {
                                    detail: { to: data.from }
                                }));
                            }
                        });
                    }
                }
            }
        });

        // =====================================================
        // 4. EVENTOS DE ACTUALIZACIÓN DE CONTADORES (BACKEND)
        // =====================================================
        s.on("unreadCountUpdate", (data) => {
            if ((data.roomCode !== currentRoomCodeRef.current || systemNotifications.canShow()) && data.count > 0) {
                setUnreadMessages(prev => ({ ...prev, [data.roomCode]: (prev[data.roomCode] || 0) + data.count }));
                playMessageSound(soundsEnabledRef.current);

                // 🔥 NUEVO: Mostrar notificación visual (Toast)
                let messageText = data.lastMessage?.text || "";
                if (!messageText && data.lastMessage?.mediaType) {
                    if (data.lastMessage.mediaType === 'image') messageText = "📷 Imagen";
                    else if (data.lastMessage.mediaType === 'video') messageText = "🎥 Video";
                    else if (data.lastMessage.mediaType === 'audio') messageText = "🎵 Audio";
                    else if (data.lastMessage.mediaType === 'document') messageText = "📄 Documento";
                    else messageText = "📎 Archivo";
                } else if (!messageText) {
                    messageText = "Nuevo mensaje";
                }

                const sender = data.lastMessage?.from || "Usuario";

                // Buscar nombre del grupo usando REF y múltiples propiedades posibles
                const rooms = myActiveRoomsRef.current;
                const foundRoom = rooms.find(r => r.roomCode === data.roomCode);
                const groupName = foundRoom?.roomName || foundRoom?.name || foundRoom?.groupName || data.groupName || data.roomName || "Grupo";

                const notificationTitle = `${sender} en ${groupName}`;

                // Intentar mostrar notificación del sistema primero
                if (systemNotifications.canShow()) {
                    systemNotifications.show(
                        notificationTitle,
                        messageText,
                        { tag: `room-${data.roomCode}`, silent: !soundsEnabledRef.current },
                        () => {
                            window.dispatchEvent(new CustomEvent("navigateToGroup", {
                                detail: { roomCode: data.roomCode }
                            }));
                        }
                    );
                }

                // SIEMPRE mostrar SweetAlert Toast
                Swal.fire({
                    toast: true,
                    position: "bottom-end",
                    icon: "info",
                    title: notificationTitle,
                    html: `
                        <div class="toast-content">
                            <div class="toast-message">${messageText.substring(0, 80)}${messageText.length > 80 ? "..." : ""}</div>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: "Ver",
                    showCloseButton: true,
                    timer: 6000,
                    customClass: {
                        popup: 'modern-toast',
                        title: 'modern-toast-title',
                        htmlContainer: 'modern-toast-html',
                        confirmButton: 'modern-toast-btn',
                        icon: 'modern-toast-icon',
                        closeButton: 'modern-toast-close'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.dispatchEvent(new CustomEvent("navigateToGroup", {
                            detail: { roomCode: data.roomCode }
                        }));
                    }
                });
            }

            if (data.lastMessage) {
                setMyActiveRooms((prevRooms) =>
                    prevRooms.map((room) =>
                        room.roomCode === data.roomCode
                            ? {
                                ...room,
                                lastMessage: data.lastMessage.text || "", // 🔥 String
                                lastMessageFrom: data.lastMessage.from,
                                lastMessageTime: data.lastMessage.time,
                                lastMessageAt: data.lastMessage.sentAt,
                                lastMessageMediaType: data.lastMessage.mediaType || null, // 🔥 Propiedad directa
                                lastMessageFileName: data.lastMessage.fileName || null,
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

        // 🔥 NUEVO: Manejo de errores genéricos del socket
        s.on("error", (data) => {
            console.error("❌ Socket Error:", data);
            showErrorAlert("Error", data.message || "Ocurrió un error en la conexión");
        });

        // 🔥 NUEVO: Manejo de error al unirse a sala
        s.on("joinRoomError", (data) => {
            console.error("❌ Error al unirse a sala:", data);
            showErrorAlert("Error al unirse", data.message || "No se pudo unir a la sala");

            // Limpiar estado si falló la unión
            if (currentRoomCodeRef.current === data.roomCode) {
                chatState.setCurrentRoomCode(null);
                currentRoomCodeRef.current = null;
                chatState.setIsGroup(false);
            }
        });

        s.on("videoCallEnded", (data) => {
            stopRingtone(); // 🔥 Detener tono
            updateMessage(null, {
                videoRoomID: data.roomID,
                metadata: { isActive: false, closedBy: data.closedBy }
            });
        });

        return () => {
            // Cleanup si es necesario
        };
    }, [socket, username, user]); // 🔥 NO incluir soundsEnabled aquí para evitar re-registrar todos los listeners
};