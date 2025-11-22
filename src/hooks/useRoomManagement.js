import { useCallback } from 'react';
import apiService from '../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../sweetalert2';

/**
 * Hook personalizado para gestionar las salas de chat
 * Incluye crear, unirse, salir, editar y eliminar salas
 */
export const useRoomManagement = (
    socket,
    username,
    chatState,
    messagingFunctions
) => {
    const {
        currentRoomCode,
        setCurrentRoomCode,
        currentRoomCodeRef,
        setTo,
        setIsGroup,
        setRoomUsers,
        setShowCreateRoomModal,
        setRoomForm,
        setCreatedRoomData,
        setShowRoomCreatedModal,
        roomForm,
        setShowJoinRoomModal,
        setJoinRoomForm,
        joinRoomForm,
        setAdminViewConversation,
        setReplyingTo,
        setShowSidebar,
        setUnreadMessages,
        pendingMentions,
        setPendingMentions,
        setShowEditRoomModal,
        setEditingRoom,
        setRoomsPage,
        setRoomsTotal,
        setRoomsTotalPages,
        setRoomsLoading,
        setMyActiveRooms,
        editingRoom,
        editForm,
        setEditForm,
        roomUsers,
        roomsLimit,
    } = chatState;

    const { clearMessages, loadInitialMessages } = messagingFunctions;

    // Función para cargar salas activas con paginación
    const loadMyActiveRooms = useCallback(
        async (page = 1, append = false, limitOverride, user) => {
            const parsedLimit = Number(limitOverride ?? roomsLimit) || 10;
            try {
                setRoomsLoading(true);

                const isPrivilegedUser =
                    user?.role === 'ADMIN' ||
                    user?.role === 'JEFEPISO' ||
                    user?.role === 'PROGRAMADOR';

                // Si es ADMIN/JEFEPISO/PROGRAMADOR usar endpoint de admin
                if (isPrivilegedUser) {
                    const response = await apiService.getAdminRooms(page, parsedLimit, '');
                    const activeRooms = response.data
                        ? response.data.filter((room) => room.isActive)
                        : [];

                    const nextPage = Number(response.page ?? page) || page;
                    const totalRooms =
                        Number(response.total ?? activeRooms.length) || activeRooms.length;
                    const totalPages =
                        Number(response.totalPages ?? Math.ceil(totalRooms / parsedLimit)) || 1;

                    setRoomsPage(nextPage);
                    setRoomsTotal(totalRooms);
                    setRoomsTotalPages(totalPages);

                    if (append && page > 1) {
                        setMyActiveRooms((prev) => {
                            const existingCodes = new Set(prev.map((room) => room.roomCode));
                            const newRooms = activeRooms.filter(
                                (room) => !existingCodes.has(room.roomCode)
                            );
                            return [...prev, ...newRooms];
                        });
                    } else {
                        setMyActiveRooms(activeRooms);
                    }
                } else {
                    // Para usuarios normales, usar paginación real
                    const result = await apiService.getUserRoomsPaginated(page, parsedLimit);

                    const nextPage = Number(result.page ?? page) || page;
                    const totalRooms =
                        Number(result.total ?? result.rooms?.length ?? 0) ||
                        result.rooms?.length ||
                        0;
                    const totalPages =
                        Number(result.totalPages ?? Math.ceil(totalRooms / parsedLimit)) || 1;

                    setRoomsPage(nextPage);
                    setRoomsTotal(totalRooms);
                    setRoomsTotalPages(totalPages);

                    if (append && page > 1) {
                        setMyActiveRooms((prev) => {
                            const existingCodes = new Set(prev.map((room) => room.roomCode));
                            const newRooms = (result.rooms || []).filter(
                                (room) => !existingCodes.has(room.roomCode)
                            );
                            return [...prev, ...newRooms];
                        });
                    } else {
                        setMyActiveRooms(result.rooms || []);
                    }
                }
            } catch (error) {
                console.error('❌ Error al cargar salas activas:', error);
                if (!append) {
                    setMyActiveRooms([]);
                }
            } finally {
                setRoomsLoading(false);
            }
        },
        [roomsLimit, setRoomsLoading, setRoomsPage, setRoomsTotal, setRoomsTotalPages, setMyActiveRooms]
    );

    // Crear nueva sala
    const handleCreateRoom = useCallback(async () => {
        try {
            const createData = {
                name: roomForm.name,
                maxCapacity: roomForm.maxCapacity,
                creatorUsername: username,
            };

            const result = await apiService.createTemporaryRoom(createData);
            setShowCreateRoomModal(false);
            setRoomForm({ name: '', maxCapacity: 50 });

            setCreatedRoomData(result);
            setShowRoomCreatedModal(true);

            setTo(result.name);
            setIsGroup(true);
            setCurrentRoomCode(result.roomCode);
            currentRoomCodeRef.current = result.roomCode;

            // Emitir evento de unirse a la sala
            if (socket && socket.connected) {
                socket.emit('joinRoom', {
                    roomCode: result.roomCode,
                    roomName: result.name,
                    from: username,
                });
            }

            clearMessages();
            setRoomUsers([]);

            // Actualizar la lista de salas activas
            await loadMyActiveRooms();
        } catch (error) {
            console.error('Error al crear sala:', error);
            const errorMessage =
                error.response?.data?.message || error.message || 'Error desconocido';
            await showErrorAlert('Error al crear sala', errorMessage);
        }
    }, [
        roomForm,
        username,
        socket,
        setShowCreateRoomModal,
        setRoomForm,
        setCreatedRoomData,
        setShowRoomCreatedModal,
        setTo,
        setIsGroup,
        setCurrentRoomCode,
        currentRoomCodeRef,
        clearMessages,
        setRoomUsers,
        loadMyActiveRooms,
    ]);

    // Unirse a una sala existente
    const handleJoinRoom = useCallback(async () => {
        try {
            const joinData = {
                roomCode: joinRoomForm.roomCode,
                username: username,
            };

            const result = await apiService.joinRoom(joinData);
            setShowJoinRoomModal(false);
            setJoinRoomForm({ roomCode: '' });

            // Limpiar estado anterior
            clearMessages();
            setAdminViewConversation(null);
            setRoomUsers([]);

            setTo(result.name);
            setIsGroup(true);
            setCurrentRoomCode(result.roomCode);
            currentRoomCodeRef.current = result.roomCode;

            // Cargar mensajes históricos
            await loadInitialMessages();

            // Emitir evento de unirse
            if (socket && socket.connected) {
                socket.emit('joinRoom', {
                    roomCode: result.roomCode,
                    roomName: result.name,
                    from: username,
                });
            }
        } catch (error) {
            console.error('Error al unirse a sala:', error);
            await showErrorAlert('Error', 'Error al unirse a la sala: ' + error.message);
        }
    }, [
        joinRoomForm,
        username,
        socket,
        setShowJoinRoomModal,
        setJoinRoomForm,
        clearMessages,
        setAdminViewConversation,
        setRoomUsers,
        setTo,
        setIsGroup,
        setCurrentRoomCode,
        currentRoomCodeRef,
        loadInitialMessages,
    ]);

    // Salir de la sala actual
    const handleLeaveRoom = useCallback(() => {
        if (socket && socket.connected) {
            const isUserInRoom = roomUsers.some((user) => user.username === username);

            if (isUserInRoom) {
                socket.emit('leaveRoom', {
                    roomCode: currentRoomCode,
                    from: username,
                });
            }
        }

        // Limpiar el chat
        setTo('');
        setIsGroup(false);
        setRoomUsers([]);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setAdminViewConversation(null);
        clearMessages();
        setReplyingTo(null);

        // En mobile, mostrar el sidebar
        if (window.innerWidth <= 768) {
            setShowSidebar(true);
        }
    }, [
        socket,
        roomUsers,
        username,
        currentRoomCode,
        setTo,
        setIsGroup,
        setRoomUsers,
        setCurrentRoomCode,
        currentRoomCodeRef,
        setAdminViewConversation,
        clearMessages,
        setReplyingTo,
        setShowSidebar,
    ]);

    // Seleccionar una sala del sidebar
    const handleRoomSelect = useCallback(
        async (room, messageId = null) => {
            try {
                if (currentRoomCode === room.roomCode && !messageId) {
                    return;
                }

                // Salir de sala anterior si es necesario
                if (currentRoomCode && socket && socket.connected) {
                    const isUserInPreviousRoom = roomUsers.some(
                        (user) => user.username === username
                    );

                    if (isUserInPreviousRoom) {
                        socket.emit('leaveRoom', {
                            roomCode: currentRoomCode,
                            from: username,
                        });
                    }
                }

                // Limpiar estado anterior
                clearMessages();
                setAdminViewConversation(null);
                setRoomUsers([]);
                setReplyingTo(null);

                // Unirse a la nueva sala
                setTo(room.name);
                setIsGroup(true);
                setCurrentRoomCode(room.roomCode);
                currentRoomCodeRef.current = room.roomCode;

                // Resetear contador de no leídos
                setUnreadMessages((prev) => ({
                    ...prev,
                    [room.roomCode]: 0,
                }));

                // Cerrar alerta de mención si existe
                if (pendingMentions[room.roomCode]) {
                    const Swal = (await import('sweetalert2')).default;
                    Swal.close();
                    setPendingMentions((prev) => {
                        const updated = { ...prev };
                        delete updated[room.roomCode];
                        return updated;
                    });
                }

                // Cargar usuarios de la sala
                let roomUsersData = [];
                try {
                    const response = await apiService.getRoomUsers(room.roomCode);
                    if (Array.isArray(response)) {
                        roomUsersData = response;
                    } else if (response && typeof response === 'object') {
                        roomUsersData = response.users || response.data || [];
                    }
                    setRoomUsers(roomUsersData);
                } catch (error) {
                    console.error('Error al cargar usuarios de la sala:', error);
                    setRoomUsers([]);
                    roomUsersData = [];
                }

                // Emitir joinRoom si el usuario está en la lista
                const isUserInNewRoom = roomUsersData.some(
                    (user) =>
                        user.username === username ||
                        user === username ||
                        (user.nombre && user.apellido && `${user.nombre} ${user.apellido}` === username)
                );

                if (socket && socket.connected && isUserInNewRoom) {
                    socket.emit('joinRoom', {
                        roomCode: room.roomCode,
                        roomName: room.name,
                        from: username,
                    });
                }

                // En mobile, ocultar sidebar
                if (window.innerWidth <= 768) {
                    setShowSidebar(false);
                }
            } catch (error) {
                console.error('Error al seleccionar sala:', error);
            }
        },
        [
            currentRoomCode,
            socket,
            roomUsers,
            username,
            clearMessages,
            setAdminViewConversation,
            setRoomUsers,
            setReplyingTo,
            setTo,
            setIsGroup,
            setCurrentRoomCode,
            currentRoomCodeRef,
            setUnreadMessages,
            pendingMentions,
            setPendingMentions,
            setShowSidebar,
        ]
    );

    // Eliminar sala (solo admin)
    const handleDeleteRoom = useCallback(
        async (roomId, roomName, user) => {
            const result = await showConfirmAlert(
                '¿Eliminar sala?',
                `¿Estás seguro de que quieres eliminar la sala "${roomName}"?`
            );

            if (result.isConfirmed) {
                try {
                    await apiService.deleteRoom(roomId);
                    await showSuccessAlert('Éxito', 'Sala eliminada correctamente');
                    await loadMyActiveRooms(1, false, null, user);
                } catch (error) {
                    console.error('Error al eliminar sala:', error);
                    if (error.message.includes('404') || error.message.includes('Not Found')) {
                        await showErrorAlert('Aviso', 'La sala ya fue eliminada');
                        await loadMyActiveRooms(1, false, null, user);
                    } else {
                        await showErrorAlert('Error', 'Error al eliminar la sala: ' + error.message);
                    }
                }
            }
        },
        [loadMyActiveRooms]
    );

    // Expulsar usuario de sala
    const handleKickUser = useCallback(
        async (usernameToKick, roomCode) => {
            const result = await showConfirmAlert(
                '¿Expulsar usuario?',
                `¿Estás seguro de que quieres expulsar a ${usernameToKick} de la sala?`
            );

            if (result.isConfirmed) {
                if (socket && socket.connected) {
                    socket.emit('kickUser', {
                        roomCode: roomCode || currentRoomCode,
                        username: usernameToKick,
                        kickedBy: username,
                    });
                    await showSuccessAlert('Éxito', `Usuario ${usernameToKick} expulsado de la sala`);
                }
            }
        },
        [socket, currentRoomCode, username]
    );

    // Editar sala
    const handleEditRoom = useCallback(
        (room) => {
            setEditingRoom(room);
            setEditForm({ maxCapacity: room.maxCapacity });
            setShowEditRoomModal(true);
        },
        [setEditingRoom, setEditForm, setShowEditRoomModal]
    );

    // Actualizar sala
    const handleUpdateRoom = useCallback(
        async (user) => {
            try {
                await apiService.updateRoom(editingRoom.id, {
                    maxCapacity: editForm.maxCapacity,
                });

                await showSuccessAlert('Éxito', 'Capacidad de sala actualizada correctamente');
                await loadMyActiveRooms(1, false, null, user);

                setShowEditRoomModal(false);
                setEditingRoom(null);
            } catch (error) {
                console.error('Error al actualizar sala:', error);
                await showErrorAlert('Error', 'Error al actualizar la sala: ' + error.message);
            }
        },
        [editingRoom, editForm, loadMyActiveRooms, setShowEditRoomModal, setEditingRoom]
    );

    // Desactivar sala
    const handleDeactivateRoom = useCallback(
        async (roomId, roomName, user) => {
            const result = await showConfirmAlert(
                '¿Desactivar sala?',
                `¿Estás seguro de que quieres desactivar la sala "${roomName}"?`
            );

            if (result.isConfirmed) {
                try {
                    await apiService.deactivateRoom(roomId);
                    await showSuccessAlert('Éxito', 'Sala desactivada correctamente');
                    await loadMyActiveRooms(1, false, null, user);
                } catch (error) {
                    console.error('Error al desactivar sala:', error);
                    await showErrorAlert('Error', 'Error al desactivar la sala: ' + error.message);
                }
            }
        },
        [loadMyActiveRooms]
    );

    // Activar sala
    const handleActivateRoom = useCallback(
        async (roomId, roomName, user) => {
            const result = await showConfirmAlert(
                '¿Activar sala?',
                `¿Estás seguro de que quieres activar la sala "${roomName}"?`
            );

            if (result.isConfirmed) {
                try {
                    await apiService.activateRoom(roomId);
                    await showSuccessAlert('Éxito', 'Sala activada correctamente');
                    await loadMyActiveRooms(1, false, null, user);
                } catch (error) {
                    console.error('Error al activar sala:', error);
                    await showErrorAlert('Error', 'Error al activar la sala: ' + error.message);
                }
            }
        },
        [loadMyActiveRooms]
    );

    // Agregar usuarios a sala
    const handleAddUsersToRoom = useCallback(() => {
        if (currentRoomCode) {
            chatState.setShowAddUsersToRoomModal(true);
        }
    }, [currentRoomCode, chatState]);

    // Callback cuando se agregan usuarios
    const handleUsersAdded = useCallback(
        async (usernames) => {
            if (socket && socket.connected && currentRoomCode) {
                usernames.forEach((username) => {
                    socket.emit('joinRoom', {
                        roomCode: currentRoomCode,
                        roomName: chatState.to,
                        from: username,
                    });
                });

                await new Promise((resolve) => setTimeout(resolve, 500));

                if (currentRoomCode) {
                    const roomUsers = await apiService.getRoomUsers(currentRoomCode);
                    if (Array.isArray(roomUsers)) {
                        setRoomUsers(roomUsers);
                    }
                }
            }
        },
        [socket, currentRoomCode, chatState.to, setRoomUsers]
    );

    // Remover usuarios de sala
    const handleRemoveUsersFromRoom = useCallback(() => {
        if (currentRoomCode) {
            chatState.setShowRemoveUsersFromRoomModal(true);
        }
    }, [currentRoomCode, chatState]);

    // Callback cuando se remueven usuarios
    const handleUsersRemoved = useCallback(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (currentRoomCode) {
            const roomUsers = await apiService.getRoomUsers(currentRoomCode);
            if (Array.isArray(roomUsers)) {
                setRoomUsers(roomUsers);
            }
        }
    }, [currentRoomCode, setRoomUsers]);

    const handleViewRoomUsers = useCallback(async (roomCode, roomName) => {
        try {
            const roomUsersData = await apiService.getRoomUsers(roomCode);

            if (!roomUsersData || roomUsersData.length === 0) {
                await showErrorAlert('Sala inactiva', 'Esta sala ya no está activa o no existe.');
                return;
            }

            // Aquí se crearía el modal personalizado (código existente)
            // Por ahora solo loguear
            console.log('Ver usuarios de sala:', roomCode, roomUsersData);
        } catch (error) {
            console.error('Error al ver usuarios de sala:', error);
            await showErrorAlert('Error', 'Error al cargar usuarios de la sala');
        }
    }, []);

    const handleShowAdminRooms = useCallback(() => {
        chatState.setShowAdminRoomsModal(true);
    }, [chatState]);

    return {
        loadMyActiveRooms,
        handleCreateRoom,
        handleJoinRoom,
        handleLeaveRoom,
        handleRoomSelect,
        handleDeleteRoom,
        handleKickUser,
        handleEditRoom,
        handleUpdateRoom,
        handleDeactivateRoom,
        handleActivateRoom,
        handleAddUsersToRoom,
        handleUsersAdded,
        handleRemoveUsersFromRoom,
        handleUsersRemoved,
        handleViewRoomUsers,
        handleShowAdminRooms,
    };
};
