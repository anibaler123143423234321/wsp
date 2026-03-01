import { useCallback, useEffect, useRef } from 'react';
import apiService from '../apiService';
import { showSuccessAlert, showErrorAlert } from '../sweetalert2';

/**
 * Hook personalizado para gestionar conversaciones asignadas y de monitoreo
 */
export const useConversations = (
    isAuthenticated,
    username,
    socket,
    user,
    chatState
) => {
    const {
        setAssignedConversations,
        setAssignedPage,
        setAssignedTotal,
        setAssignedTotalPages,
        setAssignedLoading,
        setMonitoringConversations,
        setMonitoringPage,
        setMonitoringTotal,
        setMonitoringTotalPages,
        setMonitoringLoading,
        setUnreadMessages,
        setUnreadCountsLoaded,
        setIsAdminViewLoading,
        setIsAdminViewLoadingMore, //  NUEVO
        setInitialMessages,
        setAdminViewHasMore, //  NUEVO
        setAdminViewOffset, //  NUEVO
    } = chatState;

    // Función para cargar conversaciones asignadas con paginación
    const loadAssignedConversations = useCallback(
        async (page = 1, append = false) => {
            if (!isAuthenticated || !username) {
                return;
            }

            try {
                console.log('🔄 useConversations: Loading assigned. Page:', page, 'Append:', append);
                setAssignedLoading(true);

                const result = await apiService.getAssignedConversationsPaginated(page, 50);

                // Actualizar estados de paginación
                setAssignedPage(result.page);
                setAssignedTotal(result.total);
                setAssignedTotalPages(result.totalPages);

                // Actualizar conversaciones
                //  CORREGIDO: Si append=true, SIEMPRE hacer append (no importa la página)
                if (append) {
                    setAssignedConversations((prev) => {
                        // Filtrar duplicados usando ID
                        const existingIds = new Set(prev.map((c) => c.id));
                        const newConversations = (result.conversations || []).filter(
                            (c) => !existingIds.has(c.id)
                        );
                        return [...prev, ...newConversations];
                    });
                } else {
                    setAssignedConversations(result.conversations || []);
                }

                // 🚀 OPTIMIZADO: getUnreadCounts ya se llama en ChatPage.jsx
                // No es necesario llamarlo aquí también (evitar duplicación)

                // 🚀 OPTIMIZADO: updateAssignedConversations ya no es necesario
                // El backend obtiene las conversaciones al registrar el usuario
                // Esto reduce significativamente la carga del servidor
            } catch (error) {
                console.error('❌ Error al cargar conversaciones asignadas:', error);
                if (!append) {
                    setAssignedConversations([]);
                }
            } finally {
                setAssignedLoading(false);
            }
        },
        [
            isAuthenticated,
            username,
            socket,
            user,
            setAssignedConversations,
            setAssignedPage,
            setAssignedTotal,
            setAssignedTotalPages,
            setAssignedLoading,
        ]
    );

    // Función para cargar conversaciones de monitoreo
    const loadMonitoringConversations = useCallback(
        async (page = 1, append = false) => {
            if (!isAuthenticated || !username) {
                return;
            }

            setMonitoringLoading(true);
            try {
                const result = await apiService.getMonitoringConversations(page, 20);

                if (append) {
                    setMonitoringConversations((prev) => {
                        const existingIds = new Set(prev.map((c) => c.id));
                        const newConversations = (result.data || []).filter(
                            (c) => !existingIds.has(c.id)
                        );
                        return [...prev, ...newConversations];
                    });
                } else {
                    setMonitoringConversations(result.data || []);
                }

                setMonitoringPage(result.page);
                setMonitoringTotal(result.total);
                setMonitoringTotalPages(result.totalPages);
            } catch (error) {
                console.error('❌ Error al cargar conversaciones de monitoreo:', error);
                if (!append) {
                    setMonitoringConversations([]);
                }
            } finally {
                setMonitoringLoading(false);
            }
        },
        [
            isAuthenticated,
            username,
            setMonitoringConversations,
            setMonitoringPage,
            setMonitoringTotal,
            setMonitoringTotalPages,
            setMonitoringLoading,
        ]
    );

    // Función para cargar conteos de mensajes no leídos
    const loadUnreadCounts = useCallback(async () => {
        if (!isAuthenticated || !username) {
            return;
        }

        try {
            const counts = await apiService.getUnreadCounts();
            setUnreadMessages(counts || {});
            setUnreadCountsLoaded(true); //  Marcar que los contadores ya están cargados
        } catch (error) {
            console.error('❌ Error al cargar conteos de mensajes no leídos:', error);
            setUnreadMessages({});
            setUnreadCountsLoaded(true); // Marcar como cargado incluso en error (vacío)
        }
    }, [isAuthenticated, username, setUnreadMessages, setUnreadCountsLoaded]);

    // Función para cargar mensajes en vista de admin
    const loadAdminViewMessages = useCallback(
        async (adminViewConversation, currentUserFullName) => {
            if (
                !adminViewConversation ||
                !adminViewConversation.participants ||
                adminViewConversation.participants.length < 2
            ) {
                return;
            }

            setIsAdminViewLoading(true);

            try {
                const [participant1, participant2] = adminViewConversation.participants;

                // Cargar mensajes
                const historicalMessages = await apiService.getUserMessagesOrderedById(
                    participant1,
                    participant2,
                    10,
                    0
                );

                // Marcar como leídos si el usuario tiene permisos
                const canMarkAsRead =
                    user?.role === 'ADMIN' ||
                    user?.role === 'PROGRAMADOR' ||
                    user?.role === 'JEFEPISO';

                if (canMarkAsRead) {
                    const unreadMessages = historicalMessages.filter((msg) => !msg.isRead);

                    if (unreadMessages.length > 0) {
                        try {
                            // Marcar mensajes de participant1 (emisor) como leídos por participant2 (lector)
                            const unreadFromP1 = unreadMessages.filter(
                                (msg) => msg.from === participant1
                            );
                            if (unreadFromP1.length > 0) {
                                //  FIX: El primer parámetro es el LECTOR (p2), el segundo el EMISOR (p1)
                                await apiService.markConversationAsRead(participant2, participant1);

                                if (socket && socket.connected) {
                                    socket.emit('markConversationAsRead', {
                                        from: participant2,
                                        to: participant1,
                                    });
                                }
                            }

                            // Marcar mensajes de participant2 (emisor) como leídos por participant1 (lector)
                            const unreadFromP2 = unreadMessages.filter(
                                (msg) => msg.from === participant2
                            );
                            if (unreadFromP2.length > 0) {
                                //  FIX: El primer parámetro es el LECTOR (p1), el segundo el EMISOR (p2)
                                await apiService.markConversationAsRead(participant1, participant2);

                                if (socket && socket.connected) {
                                    socket.emit('markConversationAsRead', {
                                        from: participant1,
                                        to: participant2,
                                    });
                                }
                            }

                            // Resetear el contador
                            setAssignedConversations((prevConversations) => {
                                return prevConversations.map((conv) => {
                                    if (conv.id === adminViewConversation.id) {
                                        return {
                                            ...conv,
                                            unreadCount: 0,
                                        };
                                    }
                                    return conv;
                                });
                            });
                        } catch (error) {
                            console.error('Error al marcar conversación como leída:', error);
                        }
                    }
                }

                // Convertir mensajes al formato del frontend
                const formattedMessages = historicalMessages.map((msg) => {
                    const fromLower = msg.from?.toLowerCase().trim();
                    const isOwnMessage = fromLower === username?.toLowerCase().trim() ||
                        fromLower === currentUserFullName?.toLowerCase().trim();

                    return {
                        sender: msg.from,
                        realSender: msg.from,
                        receiver: msg.to,
                        text: msg.message || '',
                        isGroup: false,
                        time:
                            msg.time ||
                            new Date(msg.sentAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }),
                        isSent: true,
                        isSelf: isOwnMessage,
                        mediaType: msg.mediaType,
                        mediaData: msg.mediaData,
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        id: msg.id,
                        sentAt: msg.sentAt,
                        isRead: msg.isRead,
                        readAt: msg.readAt,
                        readBy: msg.readBy,
                        replyToMessageId: msg.replyToMessageId,
                        replyToSender: msg.replyToSender,
                        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null,
                        replyToText: msg.replyToText,
                        threadCount: msg.threadCount || 0,
                        lastReplyFrom: msg.lastReplyFrom || null,
                        isEdited: msg.isEdited || false,
                        editedAt: msg.editedAt,
                        isDeleted: msg.isDeleted || false,
                        deletedBy: msg.deletedBy || null,
                        deletedAt: msg.deletedAt || null,
                        reactions: msg.reactions || [],
                        attachments: msg.attachments || [],
                    };
                });

                setInitialMessages(formattedMessages);

                //  NUEVO: Inicializar paginación
                setAdminViewOffset(formattedMessages.length);
                setAdminViewHasMore(historicalMessages.length === 10); // Si vinieron 10, asumimos hay más

                // Cargar threads si es necesario
                const messagesWithThreads = formattedMessages.filter(
                    (msg) => msg.threadCount > 0
                );

                if (messagesWithThreads.length > 0) {
                    const threadPromises = messagesWithThreads.map((msg) =>
                        apiService
                            .getThreadMessages(msg.id)
                            .then((threadMsgs) => ({
                                messageId: msg.id,
                                threads: threadMsgs,
                            }))
                            .catch((err) => {
                                console.error(`Error cargando threads para mensaje ${msg.id}:`, err);
                                return { messageId: msg.id, threads: [] };
                            })
                    );

                    try {
                        await Promise.all(threadPromises);
                    } catch (error) {
                        console.error('Error cargando threads en paralelo:', error);
                    }
                }
            } catch (error) {
                console.error('❌ Error al cargar mensajes de admin view:', error);
            } finally {
                setIsAdminViewLoading(false);
            }
        },
        [
            user?.role,
            socket,
            setIsAdminViewLoading,
            setInitialMessages,
            setAssignedConversations,
            setAdminViewOffset, //  NUEVO
            setAdminViewHasMore, //  NUEVO
        ]
    );

    //  NUEVO: Función para cargar MÁS mensajes en vista de admin (Paginación)
    const loadMoreAdminViewMessages = useCallback(
        async (adminViewConversation, offset, currentUserFullName) => {
            if (
                !adminViewConversation ||
                !adminViewConversation.participants ||
                adminViewConversation.participants.length < 2
            ) {
                return;
            }

            setIsAdminViewLoadingMore(true); //  NUEVO

            try {
                const [participant1, participant2] = adminViewConversation.participants;

                // Cargar mensajes con offset
                const historicalMessages = await apiService.getUserMessagesOrderedById(
                    participant1,
                    participant2,
                    20, // Cargar de a 20 para paginación
                    offset
                );

                if (historicalMessages.length === 0) {
                    setAdminViewHasMore(false);
                    return;
                }

                // Convertir mensajes al formato del frontend
                const formattedMessages = historicalMessages.map((msg) => {
                    const fromLower = msg.from?.toLowerCase().trim();
                    const isOwnMessage = fromLower === username?.toLowerCase().trim() ||
                        fromLower === currentUserFullName?.toLowerCase().trim();
                    return {
                        sender: msg.from,
                        realSender: msg.from,
                        receiver: msg.to,
                        text: msg.message || '',
                        isGroup: false,
                        time: msg.time || new Date(msg.sentAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
                        isSent: true,
                        isSelf: isOwnMessage,
                        mediaType: msg.mediaType,
                        mediaData: msg.mediaData,
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        id: msg.id,
                        sentAt: msg.sentAt,
                        isRead: msg.isRead,
                        readAt: msg.readAt,
                        readBy: msg.readBy,
                        replyToMessageId: msg.replyToMessageId,
                        replyToSender: msg.replyToSender,
                        replyToText: msg.replyToText,
                        threadCount: msg.threadCount || 0,
                        lastReplyFrom: msg.lastReplyFrom || null,
                        isEdited: msg.isEdited || false,
                        editedAt: msg.editedAt,
                        isDeleted: msg.isDeleted || false,
                        deletedBy: msg.deletedBy || null,
                        deletedAt: msg.deletedAt || null,
                        reactions: msg.reactions || [],
                        attachments: msg.attachments || [],
                    };
                });

                // Prepend mensajes usando setInitialMessages de forma funcional si es posible,
                // o pasando setMessages en el chatState
                if (chatState.setMessages) {
                    chatState.setMessages(prev => [...formattedMessages, ...prev]);
                } else if (setInitialMessages) {
                    // Si solo tenemos setInitialMessages, esperamos que el que lo pasó soporte actualización
                    setInitialMessages(prev => [...formattedMessages, ...prev]);
                }

                setAdminViewOffset(prev => prev + formattedMessages.length);
                setAdminViewHasMore(historicalMessages.length === 20);

            } catch (error) {
                console.error('Error al cargar más mensajes de admin:', error);
            } finally {
                setIsAdminViewLoadingMore(false); //  NUEVO
            }
        },
        [setAdminViewOffset, setAdminViewHasMore, setIsAdminViewLoadingMore, chatState, setInitialMessages]
    );

    // Crear nueva conversación asignada
    const handleCreateConversation = useCallback(
        async (data) => {
            try {
                const result = await apiService.createAdminAssignedConversation(
                    data.user1,
                    data.user2,
                    data.name
                );

                chatState.setShowCreateConversationModal(false);

                await showSuccessAlert(
                    'Conversación creada',
                    `Conversación creada exitosamente entre ${data.user1} y ${data.user2}`
                );

                // Recargar conversaciones asignadas
                await loadAssignedConversations();

                // Notificar via Socket.io
                if (socket && socket.connected) {
                    socket.emit('conversationAssigned', {
                        user1: data.user1,
                        user2: data.user2,
                        conversationName: data.name,
                        linkId: result.linkId,
                    });
                }
            } catch (error) {
                console.error('Error al crear conversación:', error);
                await showErrorAlert('Error', 'Error al crear la conversación: ' + error.message);
            }
        },
        [socket, loadAssignedConversations, chatState]
    );

    // Callbacks para paginación
    const handleLoadAssignedConversations = useCallback(
        async (page) => {
            await loadAssignedConversations(page, true);
        },
        [loadAssignedConversations]
    );

    //  FIX: Usar ref para evitar llamadas repetidas
    const hasLoadedInitialConversations = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !username) {
            // Reset cuando no hay autenticación
            hasLoadedInitialConversations.current = false;
            return;
        }

        // ✅ FIX: Solo cargar una vez al montar el componente
        if (hasLoadedInitialConversations.current) return;
        if (chatState.assignedConversations.length > 0 || chatState.assignedLoading) return;

        hasLoadedInitialConversations.current = true;
        loadAssignedConversations(1); // Cargar solo página 1
    }, [isAuthenticated, username]); // Removemos loadAssignedConversations de las dependencias

    return {
        loadAssignedConversations,
        loadMonitoringConversations,
        loadUnreadCounts,
        loadAdminViewMessages,
        loadMoreAdminViewMessages, //  NUEVO
        handleCreateConversation,
        handleLoadAssignedConversations,
    };
};

