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
        setRoomUsers, setMyActiveRooms, myActiveRooms, setAssignedConversations, //  Agregado myActiveRooms
        setMonitoringConversations, setUnreadMessages, setPendingMentions,
        setTypingUser, setRoomTypingUsers, setPinnedMessageId,
        setLastFavoriteUpdate, //  Para notificar actualizaciones a favoritos
        // Refs vitales
        currentRoomCodeRef, toRef, isGroupRef, currentUserFullNameRef,
        adminViewConversationRef //  Para detectar chat asignado abierto
    } = chatState;

    // Desestructurar funciones
    const {
        addNewMessage, updateMessage, playMessageSound,
        playRingtone, stopRingtone,
        loadAssignedConversations, loadMyActiveRooms, clearMessages
    } = messageFunctions;

    const { username, user, soundsEnabled, favoriteRoomCodes = [] } = authData;

    //  CRÍTICO: Usar ref para tener siempre el valor actualizado
    const soundsEnabledRef = useRef(soundsEnabled);
    const myActiveRoomsRef = useRef(myActiveRooms || []); //  Nuevo Ref
    const favoriteRoomCodesRef = useRef(favoriteRoomCodes); //  Ref para favoritos

    // Actualizar ref cuando cambie soundsEnabled
    useEffect(() => {
        soundsEnabledRef.current = soundsEnabled;
    }, [soundsEnabled]);

    //  Actualizar ref cuando cambie myActiveRooms
    useEffect(() => {
        myActiveRoomsRef.current = myActiveRooms || [];
    }, [myActiveRooms]);

    //  Actualizar ref cuando cambien favoritos
    useEffect(() => {
        favoriteRoomCodesRef.current = favoriteRoomCodes;
    }, [favoriteRoomCodes]);

    //  FUNCIÓN DE ORDENAMIENTO IDÉNTICA AL BACKEND
    const sortRoomsByBackendLogic = (rooms, favoriteRoomCodes) => {
        console.log('🔄 sortRoomsByBackendLogic llamado con', rooms.length, 'salas');
        console.log('🔄 favoriteRoomCodes:', favoriteRoomCodes);

        // Separar favoritas y no favoritas
        const favorites = rooms.filter(r => favoriteRoomCodes.includes(r.roomCode));
        const nonFavorites = rooms.filter(r => !favoriteRoomCodes.includes(r.roomCode));

        console.log('⭐ Favoritos encontrados:', favorites.length, favorites.map(f => f.roomCode));

        // Función para ordenar un grupo (CON mensajes primero, SIN mensajes después)
        const sortGroup = (group, groupName) => {
            const withMessages = group.filter(r => r.lastMessage?.sentAt);
            const withoutMessages = group.filter(r => !r.lastMessage?.sentAt);

            console.log(`🔄 ${groupName}: con mensajes: ${withMessages.length}, sin mensajes: ${withoutMessages.length}`);

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

            const result = [...withMessages, ...withoutMessages];
            if (result.length > 0) {
                console.log(`🔄 ${groupName} - Primer item:`, result[0].roomCode, result[0].name, 'sentAt:', result[0].lastMessage?.sentAt);
            }
            return result;
        };

        // Ordenar cada grupo y combinar
        const sortedFavorites = sortGroup(favorites, 'FAVORITOS');
        const sortedNonFavorites = sortGroup(nonFavorites, 'NO-FAVORITOS');

        return [...sortedFavorites, ...sortedNonFavorites];
    };

    useEffect(() => {
        if (!socket) return;

        const s = socket;

        s.on('roomJoined', (data) => {
            chatState.setRoomUsers(data.users);
            chatState.setPinnedMessageId(data.pinnedMessageId || null);
        });

        s.on('messagePinned', (data) => {
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

        // 🚀 NUEVO: Listener para actualizaciones de estado de usuario (ligero)
        // Este evento reemplaza los broadcasts masivos cuando alguien se conecta/desconecta
        s.on("userStatusChanged", (data) => {
            const { username: changedUser, originalUsername, isOnline, nombre, apellido } = data;
            const changedUserLower = changedUser?.toLowerCase().trim();
            const originalUsernameLower = originalUsername?.toLowerCase().trim();

            setUserList((prev) => {
                // Buscar si el usuario ya existe en la lista (Case Insensitive)
                //  FIX: Buscar por originalUsername (username real) ADEMÁS de displayName
                const existingIndex = prev.findIndex(u => {
                    const uUsername = u.username?.toLowerCase().trim();
                    const uNombre = u.nombre?.toLowerCase().trim();
                    const uApellido = u.apellido?.toLowerCase().trim();
                    const fullName = (uNombre && uApellido) ? `${uNombre} ${uApellido}` : uUsername;

                    //  FIX: Comparar con displayName, username original, O el nombre completo
                    return fullName === changedUserLower ||
                        uUsername === changedUserLower ||
                        uUsername === originalUsernameLower ||
                        fullName === originalUsernameLower;
                });

                if (existingIndex >= 0) {
                    // Usuario existe: actualizar su estado
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        isOnline
                    };
                    return updated;
                } else {
                    // Si el usuario no está en la lista visible, agregarlo con datos mínimos
                    if (nombre || apellido || changedUser || originalUsername) {
                        return [...prev, {
                            username: originalUsername || changedUser,
                            nombre: nombre || changedUser,
                            apellido: apellido || "",
                            isOnline
                        }];
                    }
                }
                return prev;
            });
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
            // Si es un mensaje de monitoreo, ignorarlo aquí
            if (data.isMonitoring) return;

            //  FIX: Si es un mensaje de hilo (respuesta), no agregarlo al chat principal
            // Los mensajes de hilo se manejan por el evento 'threadMessage' en ThreadPanel
            if (data.threadId) {
                console.log('🚫 useSocketListeners: Ignorando mensaje con threadId:', data.threadId, data.message);
                return;
            }

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
            //  CÁLCULO DE ESTADO DE CHAT ABIERTO
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

                // Verificar también adminViewConversation para chats asignados
                const adminConv = adminViewConversationRef?.current;
                const adminConvParticipants = adminConv?.participants?.map(p => p?.toLowerCase().trim()) || [];

                //  DEBUG: Diagnosticar por qué no se abre el chat
                console.log('🔍 DEBUG isChatOpen (DM):', {
                    chatPartner,
                    msgFrom,
                    msgTo,
                    match1: chatPartner === msgFrom,
                    match2: chatPartner === msgTo,
                    conversationId: data.conversationId,
                    adminConvParticipants
                });

                if (chatPartner && (chatPartner === msgFrom || chatPartner === msgTo)) {
                    isChatOpen = true;
                }

                // También verificar si el chat asignado está abierto (modo observador)
                if (!isChatOpen && adminConvParticipants.length > 0) {
                    if (adminConvParticipants.includes(msgFrom) && adminConvParticipants.includes(msgTo)) {
                        isChatOpen = true;
                    }
                }
            }
            // CASO A: GRUPOS
            if (data.isGroup) {
                //  Limpiar indicador de typing inmediatamente cuando llega el mensaje
                if (data.roomCode) {
                    setRoomTypingUsers(prev => {
                        const current = prev[data.roomCode] || [];
                        const filtered = current.filter(u => u.username !== data.from);
                        if (filtered.length === current.length) return prev;
                        return { ...prev, [data.roomCode]: filtered };
                    });
                }

                //  SIEMPRE agregar mensaje al chat si está abierto (propio o no)
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

                //  Incrementar contador si NO estamos en esa sala, NO es mensaje propio
                // y NO es favorito (los favoritos reciben unreadCountUpdate del backend)
                const isFavorite = favoriteRoomCodesRef.current.includes(data.roomCode);
                if (!isChatOpen && !isOwnMessage && !isFavorite) {
                    setUnreadMessages(prev => ({
                        ...prev,
                        [data.roomCode]: (prev[data.roomCode] || 0) + 1
                    }));
                }

                //  SIEMPRE actualizar la lista de conversaciones
                if (data.roomCode) {
                    setMyActiveRooms(prev => {
                        const updated = prev.map(r => {
                            if (r.roomCode === data.roomCode) {
                                return {
                                    ...r,
                                    lastMessage: {
                                        text: messageText,
                                        from: data.from,
                                        time: timeString,
                                        sentAt: data.sentAt || new Date().toISOString(),
                                        mediaType: data.mediaType,
                                        fileName: data.fileName
                                    }
                                };
                            }
                            return r;
                        });
                        return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                    });

                    //  NOTIFICACIÓN TOAST para grupos (solo si NO es mensaje propio y chat NO está abierto)
                    if (!isOwnMessage && !isChatOpen) {
                        playMessageSound(soundsEnabledRef.current);

                        if (systemNotifications.canShow()) {
                            systemNotifications.show(
                                `Nuevo mensaje en ${data.roomName || data.roomCode}`,
                                `${data.from}: ${messageText}`,
                                { tag: `room-${data.roomCode}`, silent: !soundsEnabledRef.current },
                                () => {
                                    window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                        detail: { roomCode: data.roomCode, messageId: data.id }
                                    }));
                                }
                            );
                        }

                        Swal.fire({
                            toast: true,
                            position: "bottom-end",
                            icon: "info",
                            title: `Mensaje en ${data.roomName || data.roomCode}`,
                            html: `
                                <div class="toast-content">
                                    <div class="toast-sender">${data.from}</div>
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
                                window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                    detail: { roomCode: data.roomCode, messageId: data.id }
                                }));
                            }
                        });
                    }
                }

                // CASO B: CHATS INDIVIDUALES
            } else {
                //  Limpiar indicador de typing inmediatamente cuando llega el mensaje
                if (!isOwnMessage) {
                    setTypingUser(null);
                }

                //  SIEMPRE agregar mensaje al chat si está abierto
                console.log('🔍 DEBUG CASO B - isChatOpen:', isChatOpen, 'isOwnMessage:', isOwnMessage);
                if (isChatOpen) {
                    console.log('✅ CASO B: Llamando addNewMessage para DM:', data.id, data.message?.substring(0, 30));
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

                //  NO actualizar assignedConversations aquí
                // El evento 'assignedConversationUpdated' del backend se encarga de esto
                // para evitar incremento doble del contador

                //  NOTIFICACIONES SOLO si NO es mensaje propio y chat NO está abierto
                if (!isOwnMessage && !isChatOpen) {
                    playMessageSound(soundsEnabledRef.current);

                    if (systemNotifications.canShow()) {
                        systemNotifications.show(
                            `Nuevo mensaje de ${data.from}`,
                            messageText,
                            { tag: `chat-${data.from}`, silent: !soundsEnabledRef.current },
                            () => {
                                window.dispatchEvent(new CustomEvent("navigateToChat", {
                                    detail: { to: data.from, messageId: data.id }
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
                                detail: { to: data.from, messageId: data.id }
                            }));
                        }
                    });
                }

            }
        });

        // =====================================================
        // 4. EVENTOS DE ACTUALIZACIÓN DE CONTADORES (BACKEND)
        // =====================================================
        console.log('📬 Registrando listener unreadCountUpdate');
        s.on("unreadCountUpdate", (data) => {
            console.log('📬 EVENTO unreadCountUpdate RECIBIDO:', data);
            // Solo incrementar contador si NO estamos en esa sala
            const isCurrentRoom = data.roomCode === currentRoomCodeRef.current;

            //  FIX: Si hay lastMessage, significa que llegó un mensaje nuevo
            // Incrementar en 1 aunque el backend envíe count: 0
            const incrementCount = data.lastMessage ? Math.max(data.count || 0, 1) : (data.count || 0);

            console.log('📬 unreadCountUpdate:', {
                roomCode: data.roomCode,
                isCurrentRoom,
                hasLastMessage: !!data.lastMessage,
                incrementCount
            });

            // Solo incrementar para FAVORITOS (los grupos normales ya incrementan en roomMessage)
            const isFavorite = favoriteRoomCodesRef.current.includes(data.roomCode);

            if (!isCurrentRoom && incrementCount > 0 && isFavorite) {
                // Incrementar contador solo para favoritos
                setUnreadMessages(prev => ({
                    ...prev,
                    [data.roomCode]: (prev[data.roomCode] || 0) + incrementCount
                }));
            }

            // Sonido para todos (favoritos y no favoritos)
            if (!isCurrentRoom && incrementCount > 0) {
                playMessageSound(soundsEnabledRef.current);

                //  NUEVO: Mostrar notificación visual (Toast)
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

            //  SIEMPRE actualizar lastMessage y reordenar (fuera del if anterior)
            if (data.lastMessage) {
                console.log('📬 unreadCountUpdate: Actualizando lastMessage para', data.roomCode, 'sentAt:', data.lastMessage.sentAt);

                const newSentAt = data.lastMessage.sentAt || new Date().toISOString();

                //  Si es un favorito, notificar para que ConversationList actualice su estado local
                if (favoriteRoomCodesRef.current.includes(data.roomCode)) {
                    console.log('⭐ unreadCountUpdate: Notificando actualización de favorito:', data.roomCode);
                    setLastFavoriteUpdate({
                        roomCode: data.roomCode,
                        lastMessage: {
                            text: data.lastMessage.text || "",
                            from: data.lastMessage.from,
                            time: data.lastMessage.time,
                            sentAt: newSentAt,
                            mediaType: data.lastMessage.mediaType || null,
                            fileName: data.lastMessage.fileName || null
                        },
                        timestamp: Date.now() // Para forzar re-render
                    });
                }

                setMyActiveRooms((prevRooms) => {
                    const updated = prevRooms.map((room) =>
                        room.roomCode === data.roomCode
                            ? {
                                ...room,
                                lastMessage: {
                                    text: data.lastMessage.text || "",
                                    from: data.lastMessage.from,
                                    time: data.lastMessage.time,
                                    sentAt: newSentAt,
                                    mediaType: data.lastMessage.mediaType || null,
                                    fileName: data.lastMessage.fileName || null
                                }
                            }
                            : room
                    );

                    console.log('📬 Sala actualizada:', data.roomCode, 'nuevo sentAt:', newSentAt);

                    //  IMPORTANTE: Reordenar para que suba al inicio
                    const sorted = sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                    console.log('📬 unreadCountUpdate: Lista reordenada, primer item:', sorted[0]?.roomCode, sorted[0]?.name);
                    return sorted;
                });
            }
        });

        //  NUEVO: Listener profesional para actualizaciones de conversaciones asignadas
        // El backend emite este evento cuando llega un nuevo mensaje a una conversación asignada
        s.on("assignedConversationUpdated", (data) => {
            console.log("💬 assignedConversationUpdated recibido:", data);

            // Verificar si es mensaje propio
            const currentFullName = currentUserFullNameRef.current;
            const isOwnMessage = data.lastMessageFrom === username || data.lastMessageFrom === currentFullName;

            // Capturar valores de refs ANTES del setAssignedConversations
            const adminConv = adminViewConversationRef?.current;
            const currentTo = toRef.current?.toLowerCase().trim();
            const currentIsGroup = isGroupRef.current;

            console.log("💬 REFS actuales:", {
                currentTo,
                currentIsGroup,
                adminConvId: adminConv?.id,
                conversationIdRecibido: data.conversationId
            });

            setAssignedConversations(prev => {
                // Primero encontrar la conversación para verificar si está abierta
                const targetConv = prev.find(c => c.id === data.conversationId);

                if (!targetConv) {
                    console.log("⚠️ No se encontró conversación con id:", data.conversationId);
                    return prev;
                }

                console.log("💬 targetConv encontrada:", {
                    id: targetConv.id,
                    participants: targetConv.participants,
                    currentUnreadCount: targetConv.unreadCount
                });

                let isChatOpen = false;

                if (!currentIsGroup) {
                    // Verificar por adminViewConversation (modo observador)
                    if (adminConv?.id === data.conversationId) {
                        isChatOpen = true;
                        console.log("💬 isChatOpen=true por adminConv");
                    } else if (currentTo) {
                        // Verificar si currentTo es participante de esta conversación
                        const participants = targetConv.participants || [];
                        const participantsLower = participants.map(p => p?.toLowerCase().trim());
                        isChatOpen = participantsLower.includes(currentTo);
                        console.log("💬 Verificando participantes:", { participantsLower, currentTo, isChatOpen });
                    }
                } else {
                    console.log("💬 currentIsGroup=true, isChatOpen=false");
                }

                // Incrementar unreadCount solo si NO es mensaje propio y chat NO está abierto
                const shouldIncrement = !isOwnMessage && !isChatOpen;
                const newUnreadCount = shouldIncrement ? (targetConv.unreadCount || 0) + 1 : targetConv.unreadCount;

                console.log("💬 DECISIÓN FINAL:", {
                    isOwnMessage,
                    isChatOpen,
                    shouldIncrement,
                    oldUnreadCount: targetConv.unreadCount,
                    newUnreadCount
                });

                // 🔥 CRÍTICO: También actualizar unreadMessages para que el UI se sincronice
                if (shouldIncrement) {
                    setUnreadMessages(prev => ({
                        ...prev,
                        [data.conversationId]: newUnreadCount
                    }));
                }

                // Actualizar la conversación correspondiente
                const updated = prev.map(conv => {
                    if (conv.id === data.conversationId) {
                        return {
                            ...conv,
                            lastMessage: data.lastMessage,
                            lastMessageTime: data.lastMessageTime,
                            lastMessageFrom: data.lastMessageFrom,
                            lastMessageMediaType: data.lastMessageMediaType,
                            unreadCount: newUnreadCount
                        };
                    }
                    return conv;
                });

                // Reordenar: más recientes primero
                return updated.sort((a, b) => {
                    const aTime = a.lastMessageTime || a.createdAt || '';
                    const bTime = b.lastMessageTime || b.createdAt || '';
                    if (!aTime && !bTime) return 0;
                    if (!aTime) return 1;
                    if (!bTime) return -1;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
            });
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
            if (data.isGroup) return;

            const currentTo = toRef.current?.toLowerCase().trim();
            const fromUser = data.from?.toLowerCase().trim();
            const toUser = data.to?.toLowerCase().trim();
            const currentUserFullName = currentUserFullNameRef.current?.toLowerCase().trim();

            //  FIX: Verificar que el typing sea:
            // 1. DE la persona con la que estamos chateando (currentTo)
            // 2. PARA el usuario actual (currentUserFullName)
            const isFromCurrentChat = currentTo && fromUser === currentTo;
            const isForMe = currentUserFullName && toUser === currentUserFullName;

            if (isFromCurrentChat && isForMe) {
                setTypingUser(data.isTyping ? { username: data.from } : null);
            }
        });

        s.on("roomTyping", (data) => {
            const { from, roomCode, isTyping } = data;
            const currentUserFullName = currentUserFullNameRef.current?.toLowerCase().trim();
            const fromUser = from?.toLowerCase().trim();

            // No mostrar indicador de typing para el usuario actual
            if (fromUser === currentUserFullName) return;

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

        // Usar un Set para evitar procesar el mismo evento dos veces
        const processedThreadUpdates = new Set();

        s.on("threadCountUpdated", (data) => {
            // Crear clave única para este evento
            const eventKey = `${data.messageId}-${data.threadCount}-${Date.now().toString().slice(0, -3)}`;

            // Si ya procesamos un evento similar en el último segundo, ignorar
            if (processedThreadUpdates.has(eventKey)) {
                console.log('⏭️ threadCountUpdated duplicado, ignorando:', eventKey);
                return;
            }
            processedThreadUpdates.add(eventKey);

            // Limpiar eventos antiguos después de 2 segundos
            setTimeout(() => processedThreadUpdates.delete(eventKey), 2000);

            //  FIX: Usar el valor del backend si existe, sino incrementar
            updateMessage(data.messageId, (prev) => {
                // Si el backend envía threadCount, usarlo directamente
                if (data.threadCount !== undefined) {
                    return {
                        threadCount: data.threadCount,
                        lastReplyFrom: data.lastReplyFrom
                    };
                }
                // Si no, incrementar solo si no hemos procesado este messageId recientemente
                return {
                    threadCount: (prev.threadCount || 0) + 1,
                    lastReplyFrom: data.lastReplyFrom
                };
            });

            // Variables para las notificaciones
            const currentFullName = currentUserFullNameRef.current;
            const isOwnReply = data.lastReplyFrom === username || data.lastReplyFrom === currentFullName;

            //  Notificación para respuestas en hilos
            // (Usamos las variables isOwnReply y currentFullName ya declaradas arriba)

            // Solo notificar si NO es respuesta propia
            if (!isOwnReply) {
                // Verificar si el chat/grupo está abierto
                const currentRoom = currentRoomCodeRef.current;
                const currentTo = toRef.current;
                const currentIsGroup = isGroupRef.current;
                let isChatOpen = false;

                if (data.isGroup && data.roomCode) {
                    isChatOpen = currentIsGroup && currentRoom === data.roomCode;
                } else if (data.to) {
                    const chatPartner = currentTo?.toLowerCase().trim();
                    const msgFrom = data.from?.toLowerCase().trim();
                    const msgTo = data.to?.toLowerCase().trim();
                    isChatOpen = chatPartner && (chatPartner === msgFrom || chatPartner === msgTo);
                }

                // Reproducir sonido y mostrar notificación si el chat no está abierto
                if (!isChatOpen) {
                    playMessageSound(soundsEnabledRef.current);

                    // Buscar nombre del grupo usando REF
                    let groupName = 'Grupo';
                    if (data.isGroup && data.roomCode) {
                        const rooms = myActiveRoomsRef.current;
                        const foundRoom = rooms.find(r => r.roomCode === data.roomCode);
                        groupName = foundRoom?.roomName || foundRoom?.name || foundRoom?.groupName || data.roomName || data.roomCode;
                    }

                    const notificationTitle = data.isGroup
                        ? `Nueva respuesta en hilo - ${groupName}`
                        : `Nueva respuesta en hilo`;

                    if (systemNotifications.canShow()) {
                        systemNotifications.show(
                            notificationTitle,
                            `${data.lastReplyFrom} respondió en un hilo`,
                            { tag: `thread-${data.messageId}`, silent: !soundsEnabledRef.current },
                            () => {
                                if (data.isGroup && data.roomCode) {
                                    window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                        detail: { roomCode: data.roomCode, messageId: data.messageId }
                                    }));
                                } else {
                                    window.dispatchEvent(new CustomEvent("navigateToChat", {
                                        detail: { to: data.from, messageId: data.messageId }
                                    }));
                                }
                            }
                        );
                    }

                    Swal.fire({
                        toast: true,
                        position: "bottom-end",
                        icon: "info",
                        title: notificationTitle,
                        html: `
                            <div class="toast-content">
                                <div class="toast-sender">${data.lastReplyFrom}</div>
                                <div class="toast-message">Respondió en un hilo</div>
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
                            if (data.isGroup && data.roomCode) {
                                window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                    detail: { roomCode: data.roomCode, messageId: data.messageId }
                                }));
                            } else {
                                window.dispatchEvent(new CustomEvent("navigateToChat", {
                                    detail: { to: data.from, messageId: data.messageId }
                                }));
                            }
                        }
                    });
                }
            }
        });

        //  Listener para mensajes individuales marcados como leídos
        s.on("messageRead", (data) => {
            updateMessage(data.messageId, (prev) => ({
                isRead: true,
                readBy: prev.readBy
                    ? (prev.readBy.includes(data.readBy) ? prev.readBy : [...prev.readBy, data.readBy])
                    : [data.readBy],
                readAt: data.readAt
            }));
        });

        //  Listener para mensajes de sala/grupo marcados como leídos
        //  FIX: Deduplicación para evitar actualizaciones múltiples cuando llegan eventos de diferentes clusters
        s.on("roomMessageRead", (data) => {
            if (data.roomCode === currentRoomCodeRef.current) {
                updateMessage(data.messageId, (prevMessage) => {
                    //  DEDUPLICACIÓN: Si readBy ya es igual, no actualizar (evita re-renders)
                    if (prevMessage.readBy &&
                        JSON.stringify(prevMessage.readBy) === JSON.stringify(data.readBy)) {
                        return null; // Sin cambios - updateMessage ignora este caso
                    }
                    return {
                        ...prevMessage,
                        isRead: true,
                        readBy: data.readBy,
                        readAt: data.readAt
                    };
                });
            }
        });

        s.on("conversationRead", (data) => {
            if (data.messageIds) {
                data.messageIds.forEach(id => updateMessage(id, (prev) => ({
                    isRead: true,
                    readBy: prev.readBy
                        ? (prev.readBy.includes(data.readBy) ? prev.readBy : [...prev.readBy, data.readBy])
                        : [data.readBy]
                })));
            }
        });

        //  NUEVO: Manejo de errores genéricos del socket
        s.on("error", (data) => {
            console.error("❌ Socket Error:", data);
            showErrorAlert("Error", data.message || "Ocurrió un error en la conexión");
        });

        //  NUEVO: Manejo de error al unirse a sala
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
            stopRingtone(); //  Detener tono
            updateMessage(null, {
                videoRoomID: data.roomID,
                metadata: { isActive: false, closedBy: data.closedBy }
            });
        });

        //  CLUSTER FIX: Listener para notificación de nueva conexión
        // Facebook-style: permitir múltiples tabs, solo informar
        s.on("forceDisconnect", (data) => {
            // Solo loguear - NO desconectar para permitir múltiples tabs como Facebook
            console.log("ℹ️ Nueva conexión detectada en otro lugar:", data.reason);
            // La deduplicación en roomMessageRead evita eventos duplicados
        });

        return () => {
            //  CRÍTICO: Cleanup de TODOS los event listeners para evitar memory leaks
            // Sin esto, cada re-render agrega nuevos listeners sin remover los anteriores
            s.off('roomJoined');
            s.off('messagePinned');
            s.off('userList');
            s.off('userListPage');
            s.off('roomUsers');
            s.off('userJoinedRoom');
            s.off('message');
            s.off('unreadCountUpdate');
            s.off('assignedConversationUpdated');
            s.off('unreadCountReset');
            s.off('monitoringMessage');
            s.off('messageDeleted');
            s.off('messageEdited');
            s.off('kicked');
            s.off('roomDeactivated');
            s.off('addedToRoom');
            s.off('removedFromRoom');
            s.off('newConversationAssigned');
            s.off('userTyping');
            s.off('roomTyping');
            s.off('roomCreated');
            s.off('reactionUpdated');
            s.off('threadCountUpdated');
            s.off('messageRead');
            s.off('roomMessageRead');
            s.off('conversationRead');
            s.off('error');
            s.off('joinRoomError');
            s.off('videoCallEnded');
            s.off('forceDisconnect'); //  NUEVO: Cleanup del listener de desconexión forzada
        };
    }, [socket, username, user]); //  NO incluir soundsEnabled aquí para evitar re-registrar todos los listeners
};