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

// 🔥 NUEVO: Resolver nombre amigable contra roomUsers o userList
const resolveDisplayName = (identifier, roomUsers = [], userList = []) => {
    if (!identifier) return 'Usuario';
    const idLower = identifier.toString().toLowerCase().trim();

    const getBestName = (u) => {
        if (!u || typeof u !== 'object') return null;
        return u.displayName || u.fullName || u.fullname || u.name ||
            ((u.nombre || u.apellido) ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : null);
    };

    // 1. Buscar en userList (global)
    const foundGlobal = (userList || []).find(u => (u.username || '').toString().toLowerCase().trim() === idLower);
    if (foundGlobal) {
        const name = getBestName(foundGlobal);
        if (name) return name;
    }

    // 2. Buscar en roomUsers (específico de la sala)
    const foundRoom = (roomUsers || []).find(u => {
        if (typeof u === 'string') return u.toLowerCase().trim() === idLower;
        return (u.username || '').toString().toLowerCase().trim() === idLower;
    });

    if (foundRoom) {
        const name = getBestName(foundRoom);
        if (name) return name;
    }

    // 3. Fallback final
    return (foundGlobal?.username || foundRoom?.username || identifier);
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
        roomUsers, userList,
        setUserList, setUserListPage, setUserListHasMore, setUserListLoading,
        setRoomUsers, setMyActiveRooms, myActiveRooms, setAssignedConversations, //  Agregado myActiveRooms
        setMonitoringConversations, setUnreadMessages, setPendingMentions, setPendingThreads,
        setTypingUser, setRoomTypingUsers, setPinnedMessageId,
        setLastFavoriteUpdate, setFavoriteRooms, // 🔥 NUEVO: setFavoriteRooms agregado
        // Refs vitales
        currentRoomCodeRef, toRef, isGroupRef, currentUserFullNameRef,
        adminViewConversationRef //  Para detectar chat asignado abierto
    } = chatState;

    // Desestructurar funciones
    const {
        addNewMessage, updateMessage, playMessageSound,
        playRingtone, stopRingtone,
        loadAssignedConversations, loadMyActiveRooms, loadFavoriteRoomCodes, clearMessages
    } = messageFunctions;

    const { username, user, userList: authUserList, soundsEnabled, favoriteRoomCodes = [], areAlertsEnabled = true } = authData;

    // 🔥 SYNC: Refs para evitar cierres obsoletos (stale closures)
    const roomUsersRef = useRef(roomUsers || []);
    const userListRef = useRef(authUserList || userList || []);
    const soundsEnabledRef = useRef(soundsEnabled);
    const areAlertsEnabledRef = useRef(areAlertsEnabled); // 🔥 NUEVO Ref para alertas globales
    const myActiveRoomsRef = useRef(myActiveRooms || []); //  Nuevo Ref
    const favoriteRoomCodesRef = useRef(favoriteRoomCodes); //  Ref para favoritos
    const lastThreadUpdateRef = useRef({}); // Para deduplicación de eventos de hilo
    const processedMessagesRef = useRef(new Set()); // 🔥 NUEVO: Para deduplicación de mensajes
    const lastAssignedUpdateRef = useRef({}); // 🔥 FIX: Deduplicación de assignedConversationUpdated

    // Actualizar ref cuando cambie soundsEnabled
    useEffect(() => {
        soundsEnabledRef.current = soundsEnabled;
    }, [soundsEnabled]);

    // 🔥 NUEVO: Actualizar ref cuando cambie areAlertsEnabled
    useEffect(() => {
        console.log('🔄 useSocketListeners: areAlertsEnabled actualizado a:', areAlertsEnabled);
        areAlertsEnabledRef.current = areAlertsEnabled;
    }, [areAlertsEnabled]);

    // 🔥 NUEVO: Mantener sincronizado el ref de favoritos
    useEffect(() => {
        favoriteRoomCodesRef.current = favoriteRoomCodes;
    }, [favoriteRoomCodes]);

    // 🔥 NUEVO: Refs para alertas granulares
    const areThreadAlertsEnabledRef = useRef(authData.areThreadAlertsEnabled);
    const areMessageAlertsEnabledRef = useRef(authData.areMessageAlertsEnabled);

    useEffect(() => {
        areThreadAlertsEnabledRef.current = authData.areThreadAlertsEnabled;
        areMessageAlertsEnabledRef.current = authData.areMessageAlertsEnabled;
    }, [authData.areThreadAlertsEnabled, authData.areMessageAlertsEnabled]);

    // 🔥 SYNC: Mantener refs actualizados
    useEffect(() => {
        roomUsersRef.current = roomUsers || [];
    }, [roomUsers]);

    useEffect(() => {
        userListRef.current = authUserList || userList || [];
    }, [authUserList, userList]);

    useEffect(() => {
        myActiveRoomsRef.current = myActiveRooms || [];
    }, [myActiveRooms]);

    //  Actualizar ref cuando cambien favoritos
    // 🔥 NUEVO: Mantener el nombre completo del usuario actualizado para menciones
    useEffect(() => {
        if (user) {
            const fullName = (user.nombre || user.apellido)
                ? `${user.nombre || ''} ${user.apellido || ''}`.trim()
                : user.username;
            console.log('👤 [useSocketListeners] Sincronizando currentUserFullNameRef:', fullName);
            currentUserFullNameRef.current = fullName;
        }
    }, [user]);

    useEffect(() => {
        favoriteRoomCodesRef.current = favoriteRoomCodes;
    }, [favoriteRoomCodes]);

    //  FUNCIÓN DE ORDENAMIENTO IDÉNTICA AL BACKEND
    const sortRoomsByBackendLogic = (rooms, favoriteRoomCodes) => {
        if (!rooms || !Array.isArray(rooms)) return rooms;
        const codes = Array.isArray(favoriteRoomCodes) ? favoriteRoomCodes.map(c => String(c).toLowerCase().trim()) : [];

        console.log('🔍 [SORT-DEBUG] Iniciando ordenamiento:', {
            roomsCount: rooms.length,
            favoriteRoomCodes: codes
        });

        // Separar favoritas y no favoritas
        const favorites = rooms.filter(r => {
            const rCode = r.roomCode ? String(r.roomCode).toLowerCase().trim() : '';
            const rId = r.id ? String(r.id).toLowerCase().trim() : '';
            const isFav = codes.includes(rCode) || codes.includes(rId);

            if (isFav) console.log(`⭐ [SORT-DEBUG] Favorito detectado: ${r.name || rCode} (id: ${rId}, code: ${rCode})`);
            return isFav;
        });

        const nonFavorites = rooms.filter(r => {
            const rCode = r.roomCode ? String(r.roomCode).toLowerCase().trim() : '';
            const rId = r.id ? String(r.id).toLowerCase().trim() : '';
            return !codes.includes(rCode) && !codes.includes(rId);
        });

        const parseDate = (r) => {
            // 🔥 Priorizar lastActivity del backend (fecha real del último mensaje)
            const dateStr = r.lastActivity || r.lastMessage?.sentAt || r.lastMessage?.time || r.lastMessageTime || r.createdAt;
            if (!dateStr) return 0;
            const d = new Date(dateStr).getTime();
            return isNaN(d) ? 0 : d;
        };

        // Función para ordenar un grupo
        const sortGroup = (group, label) => {
            return [...group].sort((a, b) => {
                const aTime = parseDate(a);
                const bTime = parseDate(b);
                console.log(`⏱️ [SORT-DEBUG] Comparando en ${label}:`, {
                    a: a.name || a.roomCode, aTime: new Date(aTime).toISOString(),
                    b: b.name || b.roomCode, bTime: new Date(bTime).toISOString()
                });
                return bTime - aTime;
            });
        };

        const sortedFavorites = sortGroup(favorites, 'FAVS');
        const sortedNonFavorites = sortGroup(nonFavorites, 'NON-FAVS');

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
                const existingIndex = prev.findIndex(u => {
                    const uUsername = u.username?.toLowerCase().trim();
                    const uNombre = u.nombre?.toLowerCase().trim();
                    const uApellido = u.apellido?.toLowerCase().trim();

                    // 🔥 FIX: Construcción robusta de nombre completo (permitir nombres o apellidos solos)
                    let fullName = "";
                    if (uNombre || uApellido) {
                        fullName = `${uNombre || ''} ${uApellido || ''}`.trim();
                    } else {
                        fullName = uUsername;
                    }

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
            if (loadFavoriteRoomCodes) loadFavoriteRoomCodes(username); //  Refrescar favoritos
            if (loadAssignedConversations) loadAssignedConversations(1); //  Refrescar asignados
        });

        s.on("joinRequestRejected", (data) => {
            console.log('❌ joinRequestRejected:', data);
            Swal.fire({
                icon: 'error',
                title: 'Solicitud Rechazada',
                text: data.message || `Tu solicitud para unirte a ${data.roomCode} fue rechazada.`,
            });
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
                        const friendlySender = resolveDisplayName(data.lastReplyFrom, roomUsersRef.current, chatState.userList);

                        const notificationTitle = `Hilo en ${roomName}`;
                        const notificationBody = `${friendlySender}: ${data.lastReplyText}`;

                        // 🔥 CHECK: Alertas Globales AND Alertas de Hilos
                        if (areAlertsEnabledRef.current && areThreadAlertsEnabledRef.current) {
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
            }
        });

        // =====================================================
        // 3. MENSAJERÍA (CORE)
        // =====================================================
        s.on("message", (data) => {
            console.log('📨 LISTENER message recibido:', {
                id: data.id,
                from: data.from,
                roomCode: data.roomCode,
                isGroup: data.isGroup,
                conversationId: data.conversationId,
                messagePreview: (data.text || data.message || '').substring(0, 50),
                timestamp: new Date().toISOString()
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
                console.log('📬 [GRUPO] Procesando mensaje:', {
                    roomCode: data.roomCode,
                    from: data.from,
                    isOwnMessage,
                    isChatOpen,
                    currentRoom: currentRoomCodeRef.current
                });

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

                const shouldIncrement = !isChatOpen && !isOwnMessage;
                console.log('🔍 Evaluando incremento de contador:', {
                    isChatOpen,
                    isOwnMessage,
                    shouldIncrement,
                    roomCode: data.roomCode
                });

                if (shouldIncrement) {
                    console.log(`✅ [GRUPO] Incrementando contador:`, {
                        roomCode: data.roomCode,
                        from: data.from,
                        timestamp: new Date().toISOString()
                    });

                    setUnreadMessages(prev => {
                        const prevCount = prev[data.roomCode] || 0;
                        const newCount = prevCount + 1;
                        console.log(`   📊 Estado ANTES: unreadMessages[${data.roomCode}] = ${prevCount}`);
                        console.log(`   📊 Estado DESPUÉS: unreadMessages[${data.roomCode}] = ${newCount}`);
                        console.log(`   📊 Estado completo ANTES:`, prev);
                        const newState = {
                            ...prev,
                            [data.roomCode]: newCount
                        };
                        console.log(`   📊 Estado completo DESPUÉS:`, newState);
                        return newState;
                    });

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
                                        lastActivity: sentAt, // 🔥 Actualizar para que el sort lo mueva arriba
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
                                name: data.roomName || data.roomCode,
                                lastMessage: {
                                    text: messageText,
                                    from: data.from,
                                    time: timeString,
                                    sentAt: sentAt,
                                    mediaType: data.mediaType,
                                    fileName: data.fileName
                                },
                                unreadCount: (!isChatOpen && !isOwnMessage) ? 1 : 0
                            };
                            updated = [newRoom, ...prev];
                        }
                        return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                    });

                    // 🔥 CRÍTICO: También actualizar FAVORITOS si es un grupo favorito
                    setFavoriteRooms(prev => {
                        const targetFav = prev.find(f => String(f.roomCode) === String(data.roomCode));

                        // Si es favorito pero no está en la lista (recién agregado),
                        // pero tenemos el código en el ref, intentamos actualizar de todos modos
                        const isFavCode = favoriteRoomCodesRef.current.includes(String(data.roomCode));
                        if (!targetFav && !isFavCode) return prev;

                        const updated = targetFav ? prev.map(f => {
                            if (String(f.roomCode) === String(data.roomCode)) {
                                return {
                                    ...f,
                                    lastMessage: {
                                        text: messageText,
                                        from: data.from,
                                        time: timeString,
                                        sentAt: sentAt,
                                        mediaType: data.mediaType,
                                        fileName: data.fileName
                                    },
                                    unreadCount: shouldIncrement ? (f.unreadCount || 0) + 1 : f.unreadCount
                                };
                            }
                            return f;
                        }) : prev; // Por ahora no creamos esqueletos si no existe
                        return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                    });

                    // ------------------------------------------------
                    //  NOTIFICACIÓN Y SONIDO (solo si NO es mensaje propio)
                    // ------------------------------------------------
                    if (!isOwnMessage) {
                        const currentUserFullName = currentUserFullNameRef.current || username;
                        const hasMention = hasMentionToCurrentUser(messageText, currentUserFullName);

                        console.log('🔊 [GRUPO] Evaluación de sonido:', {
                            hasMention,
                            isChatOpen,
                            roomCode: data.roomCode,
                            areAlertsEnabled: areAlertsEnabledRef.current
                        });

                        // 🔥 REGLA DE SONIDO: Sonar si el chat está cerrado O si es una mención (aunque esté abierto)
                        if (areAlertsEnabledRef.current && (!isChatOpen || hasMention)) {
                            playMessageSound(soundsEnabledRef.current, hasMention);
                        }

                        // NOTIFICACIONES (Solo si el chat NO está abierto y las alertas están activadas)
                        if (!isChatOpen && areAlertsEnabledRef.current && areMessageAlertsEnabledRef.current) {
                            const friendlySender = resolveDisplayName(data.from, roomUsersRef.current, userListRef.current);

                            if (systemNotifications.canShow()) {
                                systemNotifications.show(
                                    hasMention ? `🔴 Te mencionaron en ${data.roomName || data.roomCode}` : `Nuevo mensaje en ${data.roomName || data.roomCode}`,
                                    hasMention ? `${friendlySender} te mencionó: ${messageText}` : `${friendlySender}: ${messageText}`,
                                    { tag: `room-${data.roomCode}`, silent: !soundsEnabledRef.current },
                                    () => {
                                        const realId = getRealMessageId(data.id);
                                        const messageId = realId || (data.id?.toString().startsWith('temp_') ? null : data.id);
                                        window.dispatchEvent(new CustomEvent("navigateToGroup", {
                                            detail: { roomCode: data.roomCode, messageId }
                                        }));
                                    }
                                );
                            } else {
                                // Fallback a Swal Toast si la pestaña está visible
                                Swal.fire({
                                    toast: true,
                                    position: "top-end",
                                    icon: hasMention ? "warning" : "info",
                                    title: hasMention ? `🔴 Te mencionaron en ${data.roomName || data.roomCode}` : `Mensaje en ${data.roomName || data.roomCode}`,
                                    html: `
                                        <div class="toast-content">
                                            <div class="toast-sender">${friendlySender}</div>
                                            <div class="toast-message">${messageText.substring(0, 80)}${messageText.length > 80 ? "..." : ""}</div>
                                        </div>
                                    `,
                                    showConfirmButton: true,
                                    confirmButtonText: "Ver",
                                    showCloseButton: true,
                                    timer: hasMention ? 10000 : 6000,
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
                                        window.dispatchEvent(new CustomEvent("navigateToGroup", {
                                            detail: { roomCode: data.roomCode, messageId }
                                        }));
                                    }
                                });
                            }
                        }
                    }
                }

                // CASO B: CHATS INDIVIDUALES
            } else {
                //  Limpiar indicadores
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

                //  🔥 ACTUALIZAR assignedConversations como FALLBACK
                // El evento 'assignedConversationUpdated' del backend debería encargarse de esto,
                // pero si no llega en 300ms, actualizamos aquí para evitar que el chat no suba

                // 🔥 FIX: Si no hay conversationId, buscar la conversación por participantes
                {
                    const explicitConvId = data.conversationId;
                    const fromLower = data.from?.toLowerCase().trim();
                    const toLower = data.to?.toLowerCase().trim();

                    // Función para resolver el conversationId y ejecutar el fallback
                    const runDmFallback = (convId) => {
                        if (!convId) return;

                        const messageKey = `${convId}-${data.id}`;

                        // Marcar como procesado por 'message'
                        processedMessagesRef.current.add(messageKey);

                        // Esperar 300ms para ver si llega assignedConversationUpdated
                        setTimeout(() => {
                            // 🔥 FIX: Verificar AMBAS condiciones:
                            // 1. La marca del messageKey fue borrada (assignedConversationUpdated llegó ANTES que message)
                            // 2. Existe marca assigned-done (assignedConversationUpdated ya procesó este convId)
                            if (!processedMessagesRef.current.has(messageKey) || processedMessagesRef.current.has(`assigned-done-${convId}`)) {
                                console.log(`⏭️ [FALLBACK] assignedConversationUpdated SÍ llegó, ignorando fallback`);
                                processedMessagesRef.current.delete(messageKey);
                                return;
                            }

                            console.log(`🔄 [FALLBACK] assignedConversationUpdated NO llegó, usando fallback para ${convId}`);

                            setAssignedConversations(prev => {
                                const targetConv = prev.find(c => c.id === convId);
                                if (!targetConv) return prev;

                                let isChatOpenLocal = false;
                                if (!currentIsGroup) {
                                    if (String(currentRoomCodeRef.current) === String(convId)) {
                                        isChatOpenLocal = true;
                                    } else if (adminViewConversationRef?.current?.id === convId) {
                                        isChatOpenLocal = true;
                                    } else if (currentTo) {
                                        const participants = (targetConv.participants || []).map(p => p?.toLowerCase().trim());
                                        isChatOpenLocal = participants.includes(currentTo);
                                    }
                                }

                                const shouldInc = !isOwnMessage && !isChatOpenLocal;
                                const newUnreadCount = shouldInc ? (targetConv.unreadCount || 0) + 1 : targetConv.unreadCount;

                                console.log('📬 [FALLBACK] Actualizando assignedConversations:', {
                                    convId,
                                    shouldInc,
                                    newUnreadCount,
                                    isChatOpenLocal
                                });

                                const updated = prev.map(conv => {
                                    if (conv.id === convId) {
                                        return {
                                            ...conv,
                                            lastMessage: {
                                                text: messageText,
                                                sentAt: data.sentAt || new Date().toISOString(),
                                                from: data.from,
                                                mediaType: data.mediaType
                                            },
                                            lastMessageTime: data.sentAt || new Date().toISOString(),
                                            lastMessageFrom: data.from,
                                            lastMessageMediaType: data.mediaType,
                                            unreadCount: newUnreadCount
                                        };
                                    }
                                    return conv;
                                });

                                return updated.sort((a, b) => {
                                    const aTime = a.lastMessage?.sentAt || a.lastMessageTime || a.createdAt || 0;
                                    const bTime = b.lastMessage?.sentAt || b.lastMessageTime || b.createdAt || 0;
                                    const aDate = new Date(aTime).getTime();
                                    const bDate = new Date(bTime).getTime();
                                    const safeA = isNaN(aDate) ? 0 : aDate;
                                    const safeB = isNaN(bDate) ? 0 : bDate;
                                    return safeB - safeA;
                                });
                            });

                            // También actualizar unreadMessages
                            if (!isOwnMessage && !isChatOpen) {
                                console.log(`✅ [ASIGNADO-FALLBACK] Incrementando contador:`, {
                                    conversationId: convId,
                                    from: data.from
                                });

                                setUnreadMessages(prev => {
                                    const prevCount = prev[convId] || 0;
                                    const newCount = prevCount + 1;
                                    console.log(`   Contador ASIGNADO ${convId}: ${prevCount} → ${newCount}`);
                                    return {
                                        ...prev,
                                        [convId]: newCount
                                    };
                                });

                                setFavoriteRooms(prev => {
                                    const targetFav = prev.find(c => String(c.id) === String(convId));
                                    if (!targetFav) return prev;
                                    return prev.map(conv => {
                                        if (String(conv.id) === String(convId)) {
                                            return { ...conv, unreadCount: (conv.unreadCount || 0) + 1 };
                                        }
                                        return conv;
                                    });
                                });
                            }

                            processedMessagesRef.current.delete(messageKey);
                        }, 300);
                    };

                    if (explicitConvId) {
                        // Caso normal: el backend envió conversationId
                        runDmFallback(explicitConvId);
                    } else if (!data.isGroup && fromLower && toLower) {
                        // 🔥 FIX: Buscar conversación por participantes
                        setAssignedConversations(prev => {
                            const found = prev.find(c => {
                                const participants = (c.participants || []).map(p => p?.toLowerCase().trim());
                                return participants.includes(fromLower) && participants.includes(toLower);
                            });
                            if (found) {
                                console.log(`🔍 [DM-RESOLVE] Conversación encontrada por participantes: ${found.id} (${data.from} ↔ ${data.to})`);
                                // Ejecutar el fallback con el ID encontrado (en el siguiente tick)
                                setTimeout(() => runDmFallback(found.id), 0);
                            }
                            return prev; // No modificar
                        });
                    }
                }

                // 🔥 Sincronizar FAVORITOS para DMs: solo lastMessage (NO contador)
                // El contador se maneja en assignedConversationUpdated o en el fallback
                setFavoriteRooms(prev => {
                    // 🔥 FIX: Buscar por conversationId o por participantes
                    let favConvId = data.conversationId;
                    if (!favConvId && !data.isGroup && data.from && data.to) {
                        const fromL = data.from?.toLowerCase().trim();
                        const toL = data.to?.toLowerCase().trim();
                        const found = prev.find(c => {
                            if (c.type !== 'conv') return false;
                            const participants = (c.participants || []).map(p => p?.toLowerCase().trim());
                            return participants.includes(fromL) && participants.includes(toL);
                        });
                        if (found) favConvId = found.id;
                    }
                    if (!favConvId) return prev;

                    const targetFav = prev.find(c => String(c.id) === String(favConvId));
                    if (!targetFav) return prev;

                    console.log('⭐ [SYNC-FAV] Actualizando lastMessage para favorito (DM):', targetFav.name || targetFav.id);

                    const updated = prev.map(conv => {
                        if (String(conv.id) === String(favConvId)) {
                            return {
                                ...conv,
                                lastActivity: data.sentAt || new Date().toISOString(), // 🔥 FIX: Para que suba arriba
                                lastMessage: {
                                    text: messageText,
                                    from: data.from,
                                    time: timeString,
                                    sentAt: data.sentAt || new Date().toISOString(),
                                    mediaType: data.mediaType,
                                    fileName: data.fileName
                                }
                                // 🔥 FIX: NO tocar unreadCount aquí - lo maneja assignedConversationUpdated o fallback
                            };
                        }
                        return conv;
                    });

                    return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
                });

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

                // ------------------------------------------------
                //  NOTIFICACIÓN Y SONIDO (solo si NO es mensaje propio)
                // ------------------------------------------------
                if (!isOwnMessage) {
                    const currentUserFullName = currentUserFullNameRef.current || username;
                    const hasMention = hasMentionToCurrentUser(messageText, currentUserFullName);

                    console.log('🔊 [DIRECTO] Evaluación de sonido:', {
                        hasMention,
                        isChatOpen,
                        from: data.from,
                        areAlertsEnabled: areAlertsEnabledRef.current
                    });

                    // 🔥 REGLA DE SONIDO: Sonar si (chat cerrado) O (hay mención aunque esté abierto)
                    if (areAlertsEnabledRef.current && (!isChatOpen || hasMention)) {
                        playMessageSound(soundsEnabledRef.current, hasMention);
                    }

                    // NOTIFICACIONES (Solo si el chat NO está abierto y las alertas están activadas)
                    if (!isChatOpen && areAlertsEnabledRef.current && areMessageAlertsEnabledRef.current) {
                        const friendlySender = resolveDisplayName(data.from, roomUsersRef.current, userListRef.current);

                        if (systemNotifications.canShow()) {
                            systemNotifications.show(
                                hasMention ? `🔴 ${friendlySender} te mencionó` : `Mensaje de ${friendlySender}`,
                                messageText,
                                { tag: `chat-${data.from}`, silent: !soundsEnabledRef.current },
                                () => window.dispatchEvent(new CustomEvent("navigateToChat", { detail: { to: data.from } }))
                            );
                        } else {
                            // Fallback a Swal Toast
                            Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: hasMention ? "warning" : "info",
                                title: hasMention ? `🔴 ${friendlySender} te mencionó` : `Mensaje de ${friendlySender}`,
                                html: `
                            <div class="toast-content">
                                <div class="toast-message">${messageText.substring(0, 80)}${messageText.length > 80 ? "..." : ""}</div>
                            </div>
                        `,
                                showConfirmButton: true,
                                confirmButtonText: "Ver",
                                showCloseButton: true,
                                timer: hasMention ? 10000 : 6000,
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

            console.log('📬 unreadCountUpdate:', {
                roomCode: data.roomCode,
                isCurrentRoom,
                hasLastMessage: !!data.lastMessage,
                backendCount: data.count
            });

            // 🔥 FIX: NO actualizar contador NI reproducir sonido aquí
            // El evento 'message' ya maneja ambos correctamente
            // Este listener solo actualiza lastMessage para el ordenamiento

            //  SIEMPRE actualizar lastMessage y reordenar (fuera del if anterior)
            if (data.lastMessage) {
                console.log('📬 unreadCountUpdate: Actualizando lastMessage para', data.roomCode, 'sentAt:', data.lastMessage.sentAt);

                const newSentAt = data.lastMessage.sentAt || new Date().toISOString();

                //  Si es un favorito, notificar para que ConversationList actualice su estado local
                const isFavorite = favoriteRoomCodesRef.current.includes(String(data.roomCode)) ||
                    (data.conversationId && favoriteRoomCodesRef.current.includes(String(data.conversationId)));

                if (isFavorite) {
                    console.log('⭐ [SYNC-FAV] unreadCountUpdate: Actualizando favorito:', data.roomCode || data.conversationId);

                    setFavoriteRooms(prev => {
                        const targetId = data.conversationId || data.roomCode;

                        // Si no está en favoritos pero sabemos que es un favorito (por el ref), 
                        // pero no queremos crear esqueletos aquí, solo actualizamos si existe.
                        const updated = prev.map(f => {
                            const isMatch = (data.roomCode && String(f.roomCode) === String(data.roomCode)) ||
                                (data.conversationId && String(f.id) === String(data.conversationId));

                            if (isMatch) {
                                return {
                                    ...f,
                                    lastMessage: {
                                        text: data.lastMessage.text || "",
                                        from: data.lastMessage.from,
                                        time: data.lastMessage.time,
                                        sentAt: newSentAt,
                                        mediaType: data.lastMessage.mediaType || null,
                                        fileName: data.lastMessage.fileName || null
                                    }
                                    // 🔥 FIX: NO actualizar unreadCount aquí
                                    // El evento 'message' ya lo actualizó correctamente
                                };
                            }
                            return f;
                        });

                        return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
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

            // 🔥 FIX: Deduplicar - el backend puede emitir este evento más de una vez para el mismo mensaje
            const dedupeKey = `${data.conversationId}-${data.lastMessage}-${data.lastMessageTime}`;
            if (lastAssignedUpdateRef.current[data.conversationId] === dedupeKey) {
                console.log("⏭️ assignedConversationUpdated DUPLICADO, ignorando:", data.conversationId);
                return;
            }
            lastAssignedUpdateRef.current[data.conversationId] = dedupeKey;
            // Limpiar la marca después de 2s para permitir mensajes futuros idénticos
            setTimeout(() => {
                if (lastAssignedUpdateRef.current[data.conversationId] === dedupeKey) {
                    delete lastAssignedUpdateRef.current[data.conversationId];
                }
            }, 2000);

            // 🔥 FIX: Limpiar marcas existentes Y marcar que este convId ya fue procesado
            // Esto cubre tanto el caso donde 'message' llegó antes, como donde llega después
            for (const key of processedMessagesRef.current) {
                if (key.startsWith(`${data.conversationId}-`)) {
                    processedMessagesRef.current.delete(key);
                    console.log(`🧹 Limpiando marca de fallback: ${key}`);
                }
            }
            // Marcar que assignedConversationUpdated YA procesó este conversationId
            // El fallback del listener 'message' revisará esta marca
            processedMessagesRef.current.add(`assigned-done-${data.conversationId}`);
            setTimeout(() => {
                processedMessagesRef.current.delete(`assigned-done-${data.conversationId}`);
            }, 1000);

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

            const setUnreadMessages = chatState.setUnreadMessages;
            const setFavoriteRooms = chatState.setFavoriteRooms;

            // 1. Actualizar CHATS ASIGNADOS
            setAssignedConversations(prev => {
                const targetConv = prev.find(c => c.id === data.conversationId);

                // Si no está en la lista de asignados, no hacemos nada en este hook
                if (!targetConv) return prev;

                let isChatOpen = false;
                if (!currentIsGroup) {
                    if (String(currentRoomCodeRef.current) === String(data.conversationId)) {
                        isChatOpen = true;
                    } else if (adminConv?.id === data.conversationId) {
                        isChatOpen = true;
                    } else if (currentTo) {
                        const participants = (targetConv.participants || []).map(p => p?.toLowerCase().trim());
                        isChatOpen = participants.includes(currentTo);
                    }
                }

                const shouldIncrement = !isOwnMessage && !isChatOpen;
                const newUnreadCount = shouldIncrement ? (targetConv.unreadCount || 0) + 1 : targetConv.unreadCount;

                // Actualizar la conversación correspondiente
                const updated = prev.map(conv => {
                    if (conv.id === data.conversationId) {
                        return {
                            ...conv,
                            lastMessage: {
                                text: data.lastMessage,
                                sentAt: data.lastMessageTime, // 🔥 FIX: Usar estructura correcta
                                from: data.lastMessageFrom,
                                mediaType: data.lastMessageMediaType
                            },
                            lastMessageTime: data.lastMessageTime, // Mantener por compatibilidad
                            lastMessageFrom: data.lastMessageFrom,
                            lastMessageMediaType: data.lastMessageMediaType,
                            unreadCount: newUnreadCount
                        };
                    }
                    return conv;
                });

                // Reordenar: más recientes primero
                return updated.sort((a, b) => {
                    const aTime = a.lastMessage?.sentAt || a.lastMessageTime || a.createdAt || 0;
                    const bTime = b.lastMessage?.sentAt || b.lastMessageTime || b.createdAt || 0;
                    const aDate = new Date(aTime).getTime();
                    const bDate = new Date(bTime).getTime();
                    const safeA = isNaN(aDate) ? 0 : aDate;
                    const safeB = isNaN(bDate) ? 0 : bDate;
                    return safeB - safeA;
                });
            });

            // 2. 🔥 NUEVO: También actualizar FAVORITOS si la conversación está ahí
            setFavoriteRooms(prev => {
                const targetFav = prev.find(c => String(c.id) === String(data.conversationId));
                const isFavCode = favoriteRoomCodesRef.current.includes(String(data.conversationId));

                // Si no está en favoritos pero el ref dice que debería serlo, 
                // por ahora no lo "creamos" aquí para evitar inconsistencias,
                // rely on ConversationList to have added it initially.
                if (!targetFav && !isFavCode) return prev;

                let isChatOpen = false;
                if (!currentIsGroup) {
                    if (String(currentRoomCodeRef.current) === String(data.conversationId)) {
                        isChatOpen = true;
                    } else if (adminConv?.id === data.conversationId) {
                        isChatOpen = true;
                    } else if (currentTo) {
                        const participants = (targetFav?.participants || []).map(p => p?.toLowerCase().trim());
                        isChatOpen = participants.includes(currentTo);
                    }
                }

                const shouldIncrement = !isOwnMessage && !isChatOpen;
                // Si targetFav no existe, usamos null-coalescing pero el map no hará nada.
                const updated = prev.map(conv => {
                    if (String(conv.id) === String(data.conversationId)) {
                        const currentUnread = conv.unreadCount || 0;
                        return {
                            ...conv,
                            // Unificar estructura para que sortRoomsByBackendLogic funcione
                            lastActivity: data.lastMessageTime, // 🔥 CRÍTICO: Para que suba arriba en favoritos
                            lastMessage: {
                                text: data.lastMessage,
                                from: data.lastMessageFrom || data.from,
                                time: data.lastMessageTime,
                                sentAt: data.lastMessageTime, // ISO string
                                mediaType: data.lastMessageMediaType
                            },
                            unreadCount: shouldIncrement ? currentUnread + 1 : currentUnread
                        };
                    }
                    return conv;
                });

                // 🔥 CRÍTICO: Usar el ordenamiento unificado para que suba al principio
                return sortRoomsByBackendLogic(updated, favoriteRoomCodesRef.current);
            });

            // 3. 🔥 CRÍTICO: Asegurar que el contador global se actualice siempre
            if (!isOwnMessage) {
                const isCurrentRoom = String(currentRoomCodeRef.current) === String(data.conversationId);
                const isCurrentChat = currentTo && (currentTo === data.lastMessageFrom?.toLowerCase().trim());

                if (!isCurrentRoom && !isCurrentChat) {
                    setUnreadMessages(prev => {
                        const currentCount = prev[data.conversationId] || 0;
                        return {
                            ...prev,
                            [data.conversationId]: currentCount + 1
                        };
                    });
                }
            }
        });


        s.on("unreadCountReset", (data) => {
            console.log('📥 EVENTO unreadCountReset RECIBIDO:', data);

            // 🔥 FIX: Manejar reset de conversaciones asignadas (por conversationId)
            if (data.conversationId) {
                // 🔥 FIX: Solo resetear si el chat asignado está realmente abierto
                const adminConv = adminViewConversationRef?.current;
                const currentTo = toRef.current?.toLowerCase().trim();
                const currentIsGroup = isGroupRef.current;

                let isChatOpen = false;
                if (!currentIsGroup) {
                    if (String(currentRoomCodeRef.current) === String(data.conversationId)) {
                        isChatOpen = true;
                    } else if (adminConv?.id === data.conversationId) {
                        isChatOpen = true;
                    } else if (currentTo) {
                        // Buscar la conversación para verificar por participantes
                        const convRef = chatState.assignedConversations?.find(c => c.id === data.conversationId);
                        if (convRef) {
                            const participants = (convRef.participants || []).map(p => p?.toLowerCase().trim());
                            isChatOpen = participants.includes(currentTo);
                        }
                    }
                }

                console.log(`📬 unreadCountReset para conversación asignada: ${data.conversationId}, isChatOpen: ${isChatOpen}`);

                if (!isChatOpen) {
                    console.log(`⏭️ Ignorando unreadCountReset para conv ${data.conversationId} - chat no está abierto`);
                    return;
                }

                setUnreadMessages((prev) => ({ ...prev, [data.conversationId]: 0 }));

                // 1. Resetear en Asignados
                setAssignedConversations(prev => prev.map(c =>
                    c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
                ));

                // 2. Resetear en Favoritos (si aplica)
                setFavoriteRooms(prev => prev.map(f =>
                    (f.type === 'conv' && f.id === data.conversationId) ? { ...f, unreadCount: 0 } : f
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

            console.log('📥 unreadCountReset - Estado:', {
                roomCode: data.roomCode,
                currentRoom,
                currentIsGroup,
                isChatOpen
            });

            if (isChatOpen) {
                console.log('✅ Reseteando contador para:', data.roomCode);
                setUnreadMessages((prev) => ({ ...prev, [data.roomCode]: 0 }));

                // 1. Resetear en Salas Activas
                setMyActiveRooms(prev => prev.map(room =>
                    room.roomCode === data.roomCode
                        ? { ...room, unreadCount: 0, hasUnreadThreadMentions: false }
                        : room
                ));

                // 2. Resetear en Favoritos (si aplica)
                setFavoriteRooms(prev => prev.map(f =>
                    (f.type === 'room' && f.roomCode === data.roomCode)
                        ? { ...f, unreadCount: 0 }
                        : f
                ));
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
            if (loadMyActiveRooms) loadMyActiveRooms();
            if (loadFavoriteRoomCodes) loadFavoriteRoomCodes(username);
            if (loadAssignedConversations) loadAssignedConversations();
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
            if (loadMyActiveRooms) loadMyActiveRooms();
            if (loadFavoriteRoomCodes) loadFavoriteRoomCodes(username);
            if (loadAssignedConversations) loadAssignedConversations();
            showErrorAlert("Eliminado de sala", data.message);
        });

        s.on("newConversationAssigned", () => {
            loadAssignedConversations();
            showSuccessAlert("Nueva conversación", "Se te ha asignado un nuevo chat.");
        });

        s.on("favoriteStatusChanged", (data) => {
            console.log("⭐ favoriteStatusChanged recibido:", data);
            if (loadFavoriteRoomCodes) loadFavoriteRoomCodes(username);

            // Si el backend lo excluye de la lista activa al ser favorito,
            // refrescamos también las otras listas para mantener coherencia.
            if (loadMyActiveRooms) loadMyActiveRooms();
            if (loadAssignedConversations) loadAssignedConversations();
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
                // 🔥 CHECK: Globales AND Hilos
                if (!isChatOpen && areAlertsEnabledRef.current && areThreadAlertsEnabledRef.current) {
                    // 🔥 NUEVO: Detectar si hay mención en la respuesta del hilo
                    const hasMention = hasMentionToCurrentUser(data.lastReplyText, currentFullName || username);
                    console.log('🔊 [THREAD] Reproduciendo sonido:', { hasMention, lastReplyText: data.lastReplyText });
                    playMessageSound(soundsEnabledRef.current, hasMention);

                    // Buscar nombre del grupo usando REF
                    let groupName = 'Grupo';
                    if (data.isGroup && data.roomCode) {
                        const rooms = myActiveRoomsRef.current;
                        const foundRoom = rooms.find(r => r.roomCode === data.roomCode);
                        groupName = foundRoom?.roomName || foundRoom?.name || foundRoom?.groupName || data.roomName || data.roomCode;
                    }

                    const friendlySender = resolveDisplayName(data.lastReplyFrom, roomUsersRef.current, userListRef.current);
                    const notificationTitle = data.isGroup
                        ? (hasMention ? `🔴 Te mencionaron en hilo - ${groupName}` : `Nueva respuesta en hilo - ${groupName}`)
                        : (hasMention ? `🔴 Te mencionaron en hilo` : `Nueva respuesta en hilo`);

                    if (systemNotifications.canShow()) {
                        systemNotifications.show(
                            notificationTitle,
                            `${friendlySender} respondió en un hilo: ${data.lastReplyText}`,
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
                            icon: hasMention ? "warning" : "info",
                            title: notificationTitle,
                            html: `
                            <div class="toast-content">
                                <div class="toast-sender">${friendlySender}</div>
                                <div class="toast-message">Respondió en un hilo</div>
                            </div>
                        `,
                            showConfirmButton: true,
                            confirmButtonText: "Ver",
                            showCloseButton: true,
                            timer: hasMention ? 10000 : 6000,
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