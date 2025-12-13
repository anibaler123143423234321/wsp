import { useCallback, useEffect } from 'react';
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
        setIsAdminViewLoading,
        setInitialMessages,
    } = chatState;

    // Función para cargar conversaciones asignadas con paginación
    const loadAssignedConversations = useCallback(
        async (page = 1, append = false) => {
            if (!isAuthenticated || !username) {
                return;
            }

            try {
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
        async (page = 1) => {
            if (!isAuthenticated || !username) {
                return;
            }

            setMonitoringLoading(true);
            try {
                const result = await apiService.getMonitoringConversations(page, 10);
                setMonitoringConversations(result.data || []);
                setMonitoringPage(result.page);
                setMonitoringTotal(result.total);
                setMonitoringTotalPages(result.totalPages);
            } catch (error) {
                console.error('❌ Error al cargar conversaciones de monitoreo:', error);
                setMonitoringConversations([]);
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
        } catch (error) {
            console.error('❌ Error al cargar conteos de mensajes no leídos:', error);
            setUnreadMessages({});
        }
    }, [isAuthenticated, username, setUnreadMessages]);

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
                            // Marcar mensajes de participant1 a participant2
                            const unreadFromP1 = unreadMessages.filter(
                                (msg) => msg.from === participant1
                            );
                            if (unreadFromP1.length > 0) {
                                await apiService.markConversationAsRead(participant1, participant2);

                                if (socket && socket.connected) {
                                    socket.emit('markConversationAsRead', {
                                        from: participant1,
                                        to: participant2,
                                    });
                                }
                            }

                            // Marcar mensajes de participant2 a participant1
                            const unreadFromP2 = unreadMessages.filter(
                                (msg) => msg.from === participant2
                            );
                            if (unreadFromP2.length > 0) {
                                await apiService.markConversationAsRead(participant2, participant1);

                                if (socket && socket.connected) {
                                    socket.emit('markConversationAsRead', {
                                        from: participant2,
                                        to: participant1,
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
                    const isOwnMessage = msg.from === currentUserFullName;

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
                    };
                });

                setInitialMessages(formattedMessages);

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
        ]
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

    // Effect para cargar conversaciones asignadas
    // Effect para cargar conversaciones asignadas
    useEffect(() => {
        if (!isAuthenticated || !username) {
            return;
        }

        // ✅ FIX: Verificar si ya tenemos conversaciones cargadas para no repetir
        if (chatState.assignedConversations.length > 0) return;

        loadAssignedConversations(1); // Cargar solo página 1
    }, [isAuthenticated, username, loadAssignedConversations, chatState.assignedConversations.length]); // Agregamos length a dependencias

    return {
        loadAssignedConversations,
        loadMonitoringConversations,
        loadUnreadCounts,
        loadAdminViewMessages,
        handleCreateConversation,
        handleLoadAssignedConversations,
    };
};
