import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { showSuccessAlert, showErrorAlert } from '../sweetalert2';
import { systemNotifications } from '../utils/systemNotifications';

// 🔥 Mapa global de IDs temporales → IDs reales
// Persiste entre re-renders para que el toast pueda acceder al ID real
const tempIdToRealIdMap = new Map();

// Helper para limpiar IDs antiguos (más de 5 minutos)
const cleanupOldIds = () => {
    const now = Date.now();
    for (const [key, value] of tempIdToRealIdMap.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
            tempIdToRealIdMap.delete(key);
        }
    }
};

// Helper para obtener el ID real dado un ID (puede ser temporal o real)
const getRealMessageId = (id) => {
    if (!id) return null;
    const idStr = id.toString();
    // Si es un ID temporal, buscar el real en el mapa
    if (idStr.startsWith('temp_')) {
        const entry = tempIdToRealIdMap.get(idStr);
        return entry?.realId || null; // Retorna null si aún no tenemos el ID real
    }
    // Si no es temporal, es el ID real
    return id;
};

// 🔥 NUEVO: Helper para detectar si un mensaje menciona al usuario actual
const hasMentionToCurrentUser = (messageText, currentUserFullName) => {
    if (!messageText || !currentUserFullName) return false;

    // Regex para detectar menciones: @NOMBRE APELLIDO (acepta mayúsculas y minúsculas)
    // Permite hasta 4 palabras después del @
    const mentionRegex = /@([a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
        mentions.push(match[1].trim().toUpperCase());
    }

    console.log('🔍 hasMentionToCurrentUser:', {
        messageText,
        currentUserFullName,
        mentions,
        userNameUpper: currentUserFullName.toUpperCase()
    });

    const userNameUpper = currentUserFullName.toUpperCase();
    const hasMention = mentions.some(mention =>
        userNameUpper.includes(mention) || mention.includes(userNameUpper)
    );

    console.log('🔍 Resultado de comparación:', { hasMention });

    return hasMention;
};


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
        setMonitoringConversations, setUnreadMessages, setPendingMentions, setPendingThreads,
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
    const lastThreadUpdateRef = useRef({}); // Para deduplicación de eventos de hilo

    // Actualizar ref cuando cambie soundsEnabled
    useEffect(() => {
        soundsEnabledRef.current = soundsEnabled;
    }, [soundsEnabled]);

    // 🔥 SYNC: Mantener myActiveRoomsRef sincronizado con el estado
    useEffect(() => {
        myActiveRoomsRef.current = myActiveRooms || [];
    }, [myActiveRooms]);

    //  Actualizar ref cuando cambien favoritos
    useEffect(() => {
        favoriteRoomCodesRef.current = favoriteRoomCodes;
    }, [favoriteRoomCodes]);

    //  FUNCIÓN DE ORDENAMIENTO IDÉNTICA AL BACKEND
    const sortRoomsByBackendLogic = (rooms, favoriteRoomCodes) => {
        // Separar favoritas y no favoritas
        const favorites = rooms.filter(r => favoriteRoomCodes.includes(r.roomCode));
        const nonFavorites = rooms.filter(r => !favoriteRoomCodes.includes(r.roomCode));

        // Función para ordenar un grupo (CON mensajes primero, SIN mensajes después)
        const sortGroup = (group, groupName) => {
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
        const sortedFavorites = sortGroup(favorites, 'FAVORITOS');
        const sortedNonFavorites = sortGroup(nonFavorites, 'NO-FAVORITOS');

        return [...sortedFavorites, ...sortedNonFavorites];
    };

    useEffect(() => {
        if (!socket) return;

        const s = socket;
        console.log('🔌 useSocketListeners useEffect ejecutado. Socket ID:', s.id);

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

        // 🔥 NUEVO: Manejo de solicitudes de ingreso y expulsiones
        s.on("userApproved", (data) => {
            console.log('✅ userApproved:', data);
            Swal.fire({
                icon: 'success',
                title: '¡Solicitud Aprobada!',
                text: data.message || `Has sido aceptado en la sala ${data.roomCode}`,
                timer: 4000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
            // Recargar mis salas activas para que aparezca la nueva sala
            if (loadMyActiveRooms) loadMyActiveRooms(1);
        });

        s.on("joinRequestRejected", (data) => {
            console.log('❌ joinRequestRejected:', data);
            Swal.fire({
                icon: 'error',
                title: 'Solicitud Rechazada',
                text: data.message || `Tu solicitud para unirte a ${data.roomCode} fue rechazada.`,
            });
        });

        s.on("removedFromRoom", (data) => {
            console.log('🚫 removedFromRoom:', data);
            Swal.fire({
                icon: 'warning',
                title: 'Eliminado de la sala',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Sala:</strong> ${data.roomName || data.roomCode}</p>
                        <p><strong>Por:</strong> ${data.removedBy || 'Administrador'}</p>
                        <p style="margin-top: 10px; font-size: 0.9em; color: #666;">Ya no tienes acceso a este chat.</p>
                    </div>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#d33'
            });

            // Recargar mis salas activas para quitar la sala eliminada
            if (loadMyActiveRooms) loadMyActiveRooms(1);

            // Si el usuario está viendo esa sala en este momento, sacarlo
            if (currentRoomCodeRef.current === data.roomCode) {
                if (clearMessages) clearMessages();
                // Emitir evento para cerrar chat en ChatPage (manejado por handleEscKey o similar)
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            }
        });

        // 🔥 NUEVO: Listener para actualizar IDs temporales → reales
        // El backend envía este evento cuando el mensaje se guarda en BD
        s.on("messageIdUpdate", (data) => {
            console.log('🔄 messageIdUpdate recibido:', data);
            if (data.tempId && data.realId) {
                tempIdToRealIdMap.set(data.tempId.toString(), {
                    realId: data.realId,
                    roomCode: data.roomCode,
                    timestamp: Date.now()
                });
                console.log(`🔄 Mapeado ID temporal ${data.tempId} → ${data.realId}`);

                // 🔥 NUEVO: Actualizar el mensaje en el estado de la UI inmediatamente
                // Esto desbloquea el ThreadPanel al quitar el prefijo 'temp_'
                if (updateMessage) {
                    updateMessage(data.tempId, { id: data.realId });
                }

                // Limpiar IDs antiguos periódicamente
                cleanupOldIds();
            }
        });

        // 🚀 NUEVO: Listener para actualizaciones de lectura en tiempo real
        // Actualiza el estado isRead de los mensajes cuando alguien los lee
        s.on("messageRead", (data) => {
            console.log('👀 messageRead recibido:', data);

            // Si tenemos la función updateMessage, la usamos
            if (updateMessage && data.messageId) {
                // Actualizar el mensaje específico
                updateMessage(data.messageId, (prevMsg) => {
                    const newReaders = data.readBy || [];
                    // Evitar duplicados en el array visual si ya está cargado
                    const currentReadBy = prevMsg.readBy || [];
                    const uniqueNewReaders = prevMsg.readBy
                        ? newReaders.filter(u => !currentReadBy.includes(u))
                        : []; // Si no está cargado (lazy), no agregamos nada para no romper la lógica de lazy loading

                    const nextReadBy = prevMsg.readBy
                        ? [...currentReadBy, ...uniqueNewReaders]
                        : prevMsg.readBy;

                    return {
                        ...prevMsg,
                        isRead: true,
                        // Si ya tenemos la lista visual (lazy loaded), la actualizamos
                        readBy: nextReadBy,
                        // SIEMPRE incrementamos el contador numérico (backend envía solo los nuevos)
                        readByCount: (prevMsg.readByCount || 0) + newReaders.length,
                        readAt: data.readAt
                    };
                });
            }
        });

        // 🚀 NUEVO: Actualizar contadores de hilo en tiempo real
        console.log('🔌 Registrando listener threadCountUpdated');
        s.on("threadCountUpdated", (data) => {
            console.log('🧵 threadCountUpdated:', data, '| updateMessage exists?', !!updateMessage);

            // 🔥 FIX: Si el backend NO envía threadCount, IGNORAR este evento.
            // El backend emite 2 veces: primero sin threadCount, luego CON threadCount.
            // Solo procesamos el evento que tiene el valor real.
            if (typeof data.threadCount !== 'number') {
                console.log('🚫 Ignorando evento sin threadCount (esperando evento completo)');
                return;
            }

            if (updateMessage) {
                updateMessage(data.messageId, (prev) => {
                    const prevCount = prev.threadCount || 0;
                    const newCount = data.threadCount; // Ya verificamos que es number arriba
                    const isIncrease = newCount > prevCount;

                    console.log(`🔢 DEBUG: prevCount=${prevCount}, backendCount=${data.threadCount}, isIncrease=${isIncrease}`);

                    // Si no es un incremento real, solo actualizar texto (no contador)
                    if (!isIncrease) {
                        return {
                            ...prev,
                            threadCount: newCount, // Sincronizar con backend
                            lastReplyFrom: data.lastReplyFrom,
                            lastReplyText: data.lastReplyText
                        };
                    }

                    return {
                        ...prev,
                        threadCount: newCount,
                        // SOLO incrementar no leídos si el count AUMENTÓ y no soy yo
                        unreadThreadCount: (data.from !== username)
                            ? (prev.unreadThreadCount || 0) + 1
                            : prev.unreadThreadCount,
                        lastReplyFrom: data.lastReplyFrom,
                        lastReplyText: data.lastReplyText
                    };
                });
            }

            // 🔥 NUEVO: Si hay una mención al usuario en el hilo, marcar la sala
            if (data.lastReplyText && data.from !== username) {
                const currentFullName = currentUserFullNameRef.current;

                console.log('🔍 Verificando mención en hilo:', {
                    roomCode: data.roomCode,
                    lastReplyText: data.lastReplyText.substring(0, 50),
                    currentFullName,
                    username
                });

                // Usar la misma función helper que para mensajes normales
                const hasMention = hasMentionToCurrentUser(data.lastReplyText, currentFullName || username);

                if (hasMention && data.roomCode) {
                    console.log('🔴 Mención detectada en hilo, marcando sala:', data.roomCode);

                    // Marcar en myActiveRooms
                    setMyActiveRooms(prev => prev.map(room =>
                        room.roomCode === data.roomCode
                            ? { ...room, hasUnreadThreadMentions: true }
                            : room
                    ));

                    // 🔥 NUEVO: También agregar a pendingMentions para que aparezca el punto rojo
                    setPendingMentions(prev => ({
                        ...prev,
                        [data.roomCode]: true
                    }));

                    // 🔥 NUEVO: Marcar el mensaje padre con hasUnreadThreadMentions
                    if (updateMessage) {
                        updateMessage(data.messageId, (prev) => ({
                            ...prev,
                            hasUnreadThreadMentions: true
                        }));
                    }

                    console.log('📝 pendingMentions actualizado por mención en hilo:', data.roomCode);
                } else if (data.roomCode) {
                    // 🔥 NUEVO: Si NO hay mención pero SÍ hay mensaje nuevo en hilo, marcar pendingThreads
                    console.log('🟢 Mensaje nuevo en hilo (sin mención), marcando sala:', data.roomCode);
                    setPendingThreads(prev => ({
                        ...prev,
                        [data.roomCode]: true
                    }));
                }

                // 🔥 NUEVO: Notificar al usuario sobre el mensaje de hilo
                // Solo si NO es mensaje propio Y el chat NO está abierto
                if (data.lastReplyFrom !== username) {
                    // 🔥 FIX: Calcular si el chat está abierto para NO mostrar notificación
                    const currentRoom = currentRoomCodeRef.current;
                    const currentIsGroup = isGroupRef.current;
                    const currentTo = toRef.current?.toLowerCase().trim();
                    let isThreadChatOpen = false;

                    if (data.roomCode) {
                        // Para grupos: verificar si estamos viendo esa misma sala
                        if (currentIsGroup && currentRoom === data.roomCode) {
                            isThreadChatOpen = true;
                        }
                    } else {
                        // Para DMs/Asignados: verificar si estamos chateando con ese usuario
                        const threadPartner = (data.from === username ? data.to : data.from)?.toLowerCase().trim();
                        if (currentTo && currentTo === threadPartner) {
                            isThreadChatOpen = true;
                        }
                        // También verificar adminViewConversation para chats asignados
                        const adminConv = adminViewConversationRef?.current;
                        if (adminConv) {
                            const adminParticipants = adminConv.participants?.map(p => p?.toLowerCase().trim()) || [];
                            const msgFrom = data.from?.toLowerCase().trim();
                            const msgTo = data.to?.toLowerCase().trim();
                            if (adminParticipants.includes(msgFrom) && adminParticipants.includes(msgTo)) {
                                isThreadChatOpen = true;
                            }
                        }
                    }

                    console.log('🧵 Thread notification check:', {
                        isThreadChatOpen,
                        roomCode: data.roomCode,
                        currentRoom,
                        lastReplyFrom: data.lastReplyFrom
                    });

                    // 🔥 Solo mostrar notificación si el chat NO está abierto
                    if (!isThreadChatOpen) {
                        // Buscar nombre de la sala en referencias locales
                        const roomInfo = myActiveRoomsRef.current.find(r => r.roomCode === data.roomCode);
                        const roomName = roomInfo?.name || data.roomCode || 'Chat';

                        const notificationTitle = `Hilo en ${roomName}`;
                        const notificationBody = `${data.lastReplyFrom}: ${data.lastReplyText}`;

                        if (systemNotifications.canShow()) {
                            systemNotifications.show(
                                notificationTitle,
                                notificationBody,
                                { tag: `thread-${data.messageId}`, silent: !soundsEnabledRef.current },
                                () => {
                                    // 🔥 FIX: Si no hay roomCode (es DM/Asignado), navegar por usuario
                                    if (data.roomCode) {
                                        window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                            detail: { roomCode: data.roomCode, messageId: data.messageId, isThread: true }
                                        }));
                                    } else {
                                        // Navegación para chats directos/asignados
                                        const targetUser = data.from === username ? data.to : data.from;
                                        window.dispatchEvent(new CustomEvent("navigateToChat", {
                                            detail: { to: targetUser, messageId: data.messageId }
                                        }));
                                    }
                                }
                            );
                        } else {
                            // Toast fallback
                            Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "info",
                                title: notificationTitle,
                                html: `
                                <div class="toast-content">
                                    <div class="toast-sender">${data.lastReplyFrom}</div>
                                    <div class="toast-message">${(data.lastReplyText || '').substring(0, 80)}</div>
                                </div>
                            `,
                                showConfirmButton: true,
                                confirmButtonText: "Ver Hilo",
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
                                    // 🔥 FIX: Si no hay roomCode (es DM/Asignado), navegar por usuario
                                    if (data.roomCode) {
                                        window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                            detail: { roomCode: data.roomCode, messageId: data.messageId, isThread: true }
                                        }));
                                    } else {
                                        // Navegación para chats directos/asignados (usando remitente)
                                        // Si yo envié la respuesta, el destino es 'to', si me respondieron, es 'from'
                                        const targetUser = data.from === username ? data.to : data.from;
                                        window.dispatchEvent(new CustomEvent("navigateToChat", {
                                            detail: { to: targetUser, messageId: data.messageId }
                                        }));
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });

        // =====================================================
        // 3. MENSAJERÍA (CORE)
        // =====================================================
        s.on("message", (data) => {
            console.log('📨 LISTENER message recibido:', {
                from: data.from,
                roomCode: data.roomCode,
                isGroup: data.isGroup,
                messagePreview: (data.text || data.message || '').substring(0, 50)
            });

            // Si es un mensaje de monitoreo, ignorarlo aquí
            if (data.isMonitoring) return;

            //  FIX: Si es un mensaje de hilo (respuesta), NO retornar temprano.
            //  Permitir que el flujo continúe para procesar notificaciones y contadores.
            //  El filtrado de visualización se hará en addNewMessage.
            if (data.threadId) {
                console.log('🧵 usoSocketListeners: Mensaje de hilo recibido, procesando para notificaciones:', data.threadId);
                // NO RETURN: Dejar continuar para notificaciones
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
            // 🔥 FIX: Comparación case-insensitive para evitar notificaciones propias
            const isOwnMessage = (data.from?.toLowerCase().trim() === username?.toLowerCase().trim()) ||
                (data.from?.toLowerCase().trim() === currentFullName?.toLowerCase().trim());

            console.log('🔍 Estado del mensaje:', {
                isOwnMessage,
                currentFullName,
                username,
                from: data.from
            });

            // ------------------------------------------------
            //  CÁLCULO DE ESTADO DE CHAT ABIERTO
            // ------------------------------------------------
            console.log('📬 [NEW MESSAGE] Evento recibido:', {
                id: data.id,
                from: data.from,
                to: data.to,
                isGroup: data.isGroup,
                roomCode: data.roomCode,
                message: (data.message || "").substring(0, 30)
            });

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
                //  EXCEPTO si es un mensaje de hilo (se muestra en ThreadPanel)
                if (isChatOpen && !data.threadId) {
                    // 🔥 FIX READ RECEIPTS: Si el usuario ESTÁ VIENDO el chat y NO es mensaje propio,
                    // agregarlo automáticamente a readBy[] para que el contador sea correcto desde el inicio
                    let readBy = data.readBy || [];
                    let readByCount = data.readByCount || 0;

                    if (!isOwnMessage) {
                        // Verificar si el usuario ya está en readBy (normalizado)
                        const alreadyRead = readBy.some(
                            u => u?.toLowerCase().trim() === username?.toLowerCase().trim()
                        );

                        if (!alreadyRead) {
                            // Agregar al usuario actual porque ESTÁ VIENDO el mensaje
                            readBy = [...readBy, username];
                            readByCount = readBy.length;
                            console.log(`✅ [AUTO-READ] Usuario ${username} agregado a readBy (está viendo el chat). Total: ${readByCount}`);
                        }
                    }

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
                        metadata: data.metadata,
                        readBy: readBy, // ✅ Usar readBy actualizado
                        readByCount: readByCount, // ✅ Usar contador actualizado
                    });
                }

                //  Incrementar contador si NO estamos en esa sala y NO es mensaje propio
                // FIX: También incrementar para favoritos, ya que unreadCountUpdate no siempre llega
                console.log('🔍 Evaluando incremento de contador:', {
                    isChatOpen,
                    isOwnMessage,
                    shouldIncrement: !isChatOpen && !isOwnMessage,
                    roomCode: data.roomCode
                });

                if (!isChatOpen && !isOwnMessage) {
                    setUnreadMessages(prev => ({
                        ...prev,
                        [data.roomCode]: (prev[data.roomCode] || 0) + 1
                    }));

                    // 🔥 NUEVO: Detectar si el mensaje menciona al usuario actual
                    const currentUserFullName = currentUserFullNameRef.current || username;
                    console.log(`🔍 Verificando mención en grupo ${data.roomCode}:`, {
                        messageText: messageText.substring(0, 50),
                        currentUserFullName,
                        hasMention: hasMentionToCurrentUser(messageText, currentUserFullName)
                    });

                    if (hasMentionToCurrentUser(messageText, currentUserFullName)) {
                        console.log(`🔔 Mención detectada en ${data.roomCode} para ${currentUserFullName}`);
                        setPendingMentions(prev => {
                            const updated = {
                                ...prev,
                                [data.roomCode]: true
                            };
                            console.log(`📝 pendingMentions actualizado:`, updated);
                            return updated;
                        });
                    }
                }

                //  SIEMPRE actualizar la lista de conversaciones
                if (data.roomCode) {
                    const sentAt = data.sentAt || new Date().toISOString();
                    setMyActiveRooms(prev => {
                        const salaExiste = prev.find(r => r.roomCode === data.roomCode);

                        let updated;
                        if (salaExiste) {
                            updated = prev.map(r => {
                                if (r.roomCode === data.roomCode) {
                                    return {
                                        ...r,
                                        lastMessage: {
                                            text: messageText,
                                            from: data.from,
                                            time: timeString,
                                            sentAt: sentAt,
                                            mediaType: data.mediaType,
                                            fileName: data.fileName
                                        }
                                    };
                                }
                                return r;
                            });
                        } else {
                            // 🔥 La sala NO existe, agregarla
                            console.log('📬 newMessage: Sala no encontrada, agregando:', data.roomCode);
                            const newRoom = {
                                roomCode: data.roomCode,
                                name: data.groupName || data.group || data.roomName || data.roomCode,
                                lastMessage: {
                                    text: messageText,
                                    from: data.from,
                                    time: timeString,
                                    sentAt: sentAt,
                                    mediaType: data.mediaType,
                                    fileName: data.fileName
                                },
                                isActive: true
                            };
                            updated = [newRoom, ...prev];
                        }
                        return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                    });

                    //  NOTIFICACIÓN TOAST para grupos (solo si NO es mensaje propio y chat NO está abierto)
                    if (!isOwnMessage && !isChatOpen) {
                        playMessageSound(soundsEnabledRef.current);

                        // 🔥 LÓGICA DE NOTIFICACIÓN MEJORADA:
                        // Si la pestaña está oculta, mostrar notificación de sistema.
                        // Si la pestaña está visible, mostrar SweetAlert (independientemente del foco).
                        if (systemNotifications.canShow()) {
                            systemNotifications.show(
                                `Nuevo mensaje en ${data.roomName || data.roomCode}`,
                                `${data.from}: ${messageText}`,
                                { tag: `room-${data.roomCode}`, silent: !soundsEnabledRef.current },
                                () => {
                                    const realId = getRealMessageId(data.id);
                                    const messageId = realId || (data.id?.toString().startsWith('temp_') ? null : data.id);
                                    window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                        detail: { roomCode: data.roomCode, messageId }
                                    }));
                                }
                            );
                        } else {
                            // Si no podemos mostrar notificación de sistema (pestaña visible),
                            // mostramos el SweetAlert Toast siempre (antes requería focus)
                            console.log('🚀 [ALERT TRIGGER] Llamando a Swal.fire (GRUPO)');
                            Swal.fire({
                                toast: true,
                                position: "top-end",
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
                                    const realId = getRealMessageId(data.id);
                                    const messageId = realId || (data.id?.toString().startsWith('temp_') ? null : data.id);
                                    window.dispatchEvent(new CustomEvent("navigateToRoom", {
                                        detail: { roomCode: data.roomCode, messageId }
                                    }));
                                }
                            });
                        }
                    }
                }

                // CASO B: CHATS INDIVIDUALES
            } else {
                //  Limpiar indicador de typing inmediatamente cuando llega el mensaje
                if (!isOwnMessage) {
                    setTypingUser(null);
                }

                //  SIEMPRE agregar mensaje al chat si está abierto
                //  EXCEPTO si es un mensaje de hilo
                console.log('🔍 DEBUG CASO B - isChatOpen:', isChatOpen, 'isOwnMessage:', isOwnMessage);
                //  Robustez: Verificar también thread_id y parentMessageId
                if (isChatOpen && !data.threadId && !data.thread_id && !data.parentMessageId) {
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

                // 🔥 NUEVO: Detectar menciones en chats individuales (no asignados)
                if (!isOwnMessage && !isChatOpen && !data.isAssignedConversation) {
                    const currentUserFullName = currentUserFullNameRef.current || username;
                    if (hasMentionToCurrentUser(messageText, currentUserFullName)) {
                        // Para chats directos, usar el nombre del remitente como ID
                        const chatId = data.from;
                        console.log(`🔔 Mención detectada en chat directo de ${chatId} para ${currentUserFullName}`);
                        setPendingMentions(prev => ({
                            ...prev,
                            [chatId]: true
                        }));
                    }
                }

                //  NOTIFICACIONES SOLO si NO es mensaje propio y chat NO está abierto
                if (!isOwnMessage && !isChatOpen) {
                    playMessageSound(soundsEnabledRef.current);

                    // 🔥 LÓGICA DE NOTIFICACIÓN MEJORADA (DM):
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
                    } else {
                        // Si pestaña es visible, mostrar toast siempre
                        console.log('🚀 [ALERT TRIGGER] Llamando a Swal.fire (DM)');
                        Swal.fire({
                            toast: true,
                            position: "top-end",
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
            // NOTA: Ya no incrementamos contador aquí para favoritos porque roomMessage ya lo hace
            // Esto evita duplicación del contador

            // Sonido para todos (favoritos y no favoritos)
            if (!isCurrentRoom && incrementCount > 0) {
                playMessageSound(soundsEnabledRef.current);
                // NOTA: Eliminamos notificaciones visuales (Toast/System) de aquí para evitar
                // duplicidad con el evento 'message' que ya las muestra con más detalle.
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
                    const salaExiste = prevRooms.find(r => r.roomCode === data.roomCode);
                    console.log('📬 unreadCountUpdate setMyActiveRooms:', {
                        roomCode: data.roomCode,
                        salaExiste: !!salaExiste,
                        prevRoomsLength: prevRooms.length,
                        newSentAt: newSentAt
                    });

                    let updated;
                    if (salaExiste) {
                        // La sala existe, actualizarla
                        updated = prevRooms.map((room) =>
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
                        // Verificar que se actualizó
                        const salaActualizada = updated.find(r => r.roomCode === data.roomCode);
                        console.log('📬 Sala actualizada:', salaActualizada?.roomCode, 'sentAt:', salaActualizada?.lastMessage?.sentAt);
                    } else {
                        // 🔥 La sala NO existe en la lista, agregarla al inicio
                        console.log('📬 Sala no encontrada en lista, agregando:', data.roomCode);
                        const newRoom = {
                            roomCode: data.roomCode,
                            name: data.roomName || data.roomCode,
                            lastMessage: {
                                text: data.lastMessage.text || "",
                                from: data.lastMessage.from,
                                time: data.lastMessage.time,
                                sentAt: newSentAt,
                                mediaType: data.lastMessage.mediaType || null,
                                fileName: data.lastMessage.fileName || null
                            },
                            isActive: true
                        };
                        updated = [newRoom, ...prevRooms];
                    }

                    //  IMPORTANTE: Reordenar para que suba al inicio
                    const sorted = sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);

                    // Verificar primera sala después de ordenar
                    console.log('📬 Después de sort, primera sala:', sorted[0]?.roomCode, 'sentAt:', sorted[0]?.lastMessage?.sentAt);

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
                    // 🔥 FIX: Verificar por conversationId PRIMERO (más confiable)
                    // Esto funciona tanto para favoritos como para chats normales
                    if (String(currentRoomCodeRef.current) === String(data.conversationId)) {
                        isChatOpen = true;
                        console.log("💬 isChatOpen=true por conversationId match");
                    }
                    // Verificar por adminViewConversation (modo observador)
                    else if (adminConv?.id === data.conversationId) {
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

                    // 🔥 NUEVO: Detectar si el mensaje menciona al usuario actual
                    const currentUserFullName = currentUserFullNameRef.current || username;
                    const lastMessageText = data.lastMessage || '';
                    if (hasMentionToCurrentUser(lastMessageText, currentUserFullName)) {
                        console.log(`🔔 Mención detectada en conversación ${data.conversationId} para ${currentUserFullName}`);
                        setPendingMentions(prev => ({
                            ...prev,
                            [data.conversationId]: true
                        }));
                    }
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
            // 🔥 FIX: Manejar reset de conversaciones asignadas (por conversationId)
            if (data.conversationId) {
                console.log(`📬 unreadCountReset para conversación asignada: ${data.conversationId}`);
                setUnreadMessages((prev) => ({ ...prev, [data.conversationId]: 0 }));
                setAssignedConversations(prev => prev.map(c =>
                    c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
                ));
                return;
            }

            // 🔥 FIX: Solo resetear el contador si el chat está actualmente abierto
            // Si el chat NO está abierto, mantener el contador para que el punto rojo persista
            const currentIsGroup = isGroupRef.current;
            const currentRoom = currentRoomCodeRef.current;
            const currentTo = toRef.current;

            const isChatOpen = currentIsGroup
                ? currentRoom === data.roomCode
                : currentTo === data.roomCode || String(currentRoom) === String(data.roomCode);

            if (isChatOpen) {
                setUnreadMessages((prev) => ({ ...prev, [data.roomCode]: 0 }));
                // 🔥 Limpiar la marca de menciones en hilos cuando se leen todos los mensajes
                if (data.roomCode) {
                    setMyActiveRooms(prev => prev.map(room =>
                        room.roomCode === data.roomCode
                            ? { ...room, hasUnreadThreadMentions: false }
                            : room
                    ));
                }
            } else {
                console.log(`⏭️ Ignorando unreadCountReset para ${data.roomCode} - chat no está abierto`);
            }
        });

        // 🔥 NUEVO: Listener para actualización de lectura en conversaciones (Blue Checks)
        s.on("conversationRead", (data) => {
            console.log("👁️ conversationRead recibido:", data);

            // Si tenemos messageIds, actualizar esos mensajes específicos
            if (data.messageIds && data.messageIds.length > 0) {
                const messageIdsSet = new Set(data.messageIds);

                // Actualizar mensajes en la vista actual
                if (messageFunctions.setInitialMessages) {
                    messageFunctions.setInitialMessages(prevMessages => {
                        return prevMessages.map(msg => {
                            if (messageIdsSet.has(msg.id)) {
                                // Agregar el usuario a readBy si no está
                                const currentReadBy = msg.readBy || [];
                                const newReadBy = currentReadBy.includes(data.readBy)
                                    ? currentReadBy
                                    : [...currentReadBy, data.readBy];

                                return {
                                    ...msg,
                                    isRead: true,
                                    readBy: newReadBy,
                                    readAt: data.readAt || new Date().toISOString()
                                };
                            }
                            return msg;
                        });
                    });
                }
            }
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
            // 🔥 CLUSTER FIX: Filtrar por username porque server.emit envía a TODOS
            const currentFullName = currentUserFullNameRef.current;
            if (data.username !== username && data.username !== currentFullName) {
                return; // Este evento no es para este usuario
            }

            if (currentRoomCodeRef.current !== data.roomCode) {
                showSuccessAlert("Agregado a sala", data.message);
            }
            loadMyActiveRooms();
        });

        s.on("removedFromRoom", (data) => {
            // 🔥 CLUSTER FIX: Filtrar por username porque server.emit envía a TODOS
            const currentFullName = currentUserFullNameRef.current;
            if (data.username !== username && data.username !== currentFullName) {
                return; // Este evento no es para este usuario
            }

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

            // 🔥 NUEVO: Detectar menciones en hilos (segundo listener)
            if (!isOwnReply && data.lastReplyText && data.roomCode) {
                console.log('🔍 [Listener 2] Verificando mención en hilo:', {
                    roomCode: data.roomCode,
                    lastReplyText: data.lastReplyText.substring(0, 50),
                    currentFullName,
                    username
                });

                const hasMention = hasMentionToCurrentUser(data.lastReplyText, currentFullName || username);

                if (hasMention) {
                    console.log('🔴 [Listener 2] Mención detectada en hilo, marcando sala:', data.roomCode);

                    // Marcar en myActiveRooms
                    setMyActiveRooms(prev => prev.map(room =>
                        room.roomCode === data.roomCode
                            ? { ...room, hasUnreadThreadMentions: true }
                            : room
                    ));

                    // Agregar a pendingMentions
                    setPendingMentions(prev => ({
                        ...prev,
                        [data.roomCode]: true
                    }));

                    // 🔥 NUEVO: Marcar el mensaje padre con hasUnreadThreadMentions
                    if (updateMessage) {
                        updateMessage(data.messageId, (prev) => ({
                            ...prev,
                            hasUnreadThreadMentions: true
                        }));
                    }

                    console.log('📝 [Listener 2] pendingMentions actualizado por mención en hilo:', data.roomCode);
                }
            }

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

                    // SIEMPRE mostrar SweetAlert Toast SI TENEMOS EL FOCO
                    if (document.hasFocus()) {
                        Swal.fire({
                            toast: true,
                            position: "top-end",
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

                    // 🔥 FIX: Actualizar readByCount para que coincida con readBy.length
                    const readByArray = data.readBy || [];

                    // 🔥 NUEVO: Si el backend envió readByData con información completa, usarla
                    // readByData es un array de objetos o strings:  [{ username, nombre, apellido, picture }, ...]
                    const readByData = data.readByData || readByArray;

                    return {
                        ...prevMessage,
                        isRead: true,
                        readBy: readByArray, // Array de usernames para compatibilidad
                        readByData, // ✅ Array con datos completos para el popover
                        readByCount: readByArray.length, // ✅ Sincronizar contador
                        readAt: data.readAt
                    };
                });
            }
        });

        // 🚀 OPTIMIZADO: Listener para evento batch de mensajes leídos
        // Reemplaza N eventos 'roomMessageRead' individuales con 1 solo evento
        s.on("roomMessagesReadBatch", (data) => {
            if (data.roomCode === currentRoomCodeRef.current && data.messages) {
                // Actualizar todos los mensajes en un solo batch
                data.messages.forEach(msg => {
                    updateMessage(msg.messageId, (prevMessage) => {
                        // DEDUPLICACIÓN: Si readBy ya es igual, no actualizar
                        if (prevMessage.readBy &&
                            JSON.stringify(prevMessage.readBy) === JSON.stringify(msg.readBy)) {
                            return null;
                        }

                        const readByArray = msg.readBy || [];
                        return {
                            ...prevMessage,
                            isRead: true,
                            readBy: readByArray,
                            readByData: data.readByData || readByArray, // Datos compartidos
                            readByCount: readByArray.length,
                            readAt: msg.readAt
                        };
                    });
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
            s.off('userStatusChanged'); // 🔥 FIX: Faltaba cleanup - causaba memory leak
            s.off('messageIdUpdate');   // 🔥 FIX: Faltaba cleanup - causaba memory leak
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
            s.off('roomMessagesReadBatch'); // 🚀 OPTIMIZADO: Nuevo evento batch
            s.off('conversationRead');
            s.off('error');
            s.off('joinRoomError');
            s.off('videoCallEnded');
            s.off('messageRead');
            s.off('forceDisconnect'); //  NUEVO: Cleanup del listener de desconexión forzada
        };
    }, [socket, username, user]); //  NO incluir soundsEnabled aquí para evitar re-registrar todos los listeners
};