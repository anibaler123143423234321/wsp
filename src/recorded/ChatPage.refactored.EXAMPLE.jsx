/**
 * ChatPage.jsx - VERSIÓN REFACTORIZADA (EJEMPLO)
 * 
 * Este archivo muestra cómo quedaría ChatPage.jsx después de aplicar
 * la refactorización con los nuevos hooks y componentes.
 * 
 * IMPORTANTE: Este es un archivo de EJEMPLO.
 * NO reemplaces el ChatPage.jsx actual sin antes hacer backup y testing.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import ChatLayout from '../layouts/ChatLayout';
import Login from '../pages/Login/Login';
import LoadingScreen from '../pages/Chat/components/LoadingScreen/LoadingScreen';
import ChatModalsContainer from '../pages/Chat/components/ChatModalsContainer';
import SettingsPanel from '../pages/Chat/components/SettingsPanel/SettingsPanel';

// Hooks personalizados
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { useChatState } from '../hooks/useChatState';
import { useRoomManagement } from '../hooks/useRoomManagement';
import { useConversations } from '../hooks/useConversations';

import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../sweetalert2';

const ChatPageRefactored = () => {
    // ===== HOOKS DE AUTENTICACIÓN Y SOCKET =====
    const {
        isAuthenticated,
        user,
        username,
        isAdmin,
        isLoading,
        logout,
        refreshAuth,
    } = useAuth();

    const socket = useSocket(isAuthenticated, username, user);

    // ===== HOOK DE ESTADOS CENTRALIZADOS =====
    const chatState = useChatState();

    // ===== HOOKS DE MENSAJERÍA =====
    const {
        input,
        setInput,
        mediaFiles,
        mediaPreviews,
        isRecording,
        setIsRecording,
        messageSound,
        playMessageSound,
        handleFileSelect,
        handleRemoveMediaFile,
        cancelMediaUpload,
        clearInput,
    } = useMessages();

    const currentUserFullName =
        user?.nombre && user?.apellido
            ? `${user.nombre} ${user.apellido}`
            : username;

    const {
        messages,
        hasMoreMessages,
        isLoadingMore,
        loadInitialMessages,
        loadMoreMessages,
        addNewMessage,
        updateMessage,
        clearMessages,
        setInitialMessages,
        isLoading: isLoadingMessages,
    } = useMessagePagination(
        chatState.currentRoomCode,
        username,
        chatState.to,
        chatState.isGroup,
        socket,
        user
    );

    // Estados locales que permanecen aquí por necesidad
    const [highlightMessageId, setHighlightMessageId] = useState(null);
    const [pollVotes, setPollVotes] = useState({});

    // ===== HOOK DE GESTIÓN DE SALAS =====
    const roomManagement = useRoomManagement(
        socket,
        username,
        chatState,
        { clearMessages, loadInitialMessages }
    );

    // ===== HOOK DE CONVERSACIONES =====
    const conversations = useConversations(
        isAuthenticated,
        username,
        socket,
        user,
        {
            ...chatState,
            setInitialMessages,
        }
    );

    // ===== FUNCIONES QUE PERMANECEN AQUÍ =====
    // (Estas tienen dependencias muy específicas con el estado local)

    // Efecto para actualizar refs
    useEffect(() => {
        chatState.toRef.current = chatState.to;
        chatState.isGroupRef.current = chatState.isGroup;
        chatState.adminViewConversationRef.current = chatState.adminViewConversation;
        chatState.currentUserFullNameRef.current = currentUserFullName;
        chatState.userListRef.current = chatState.userList;
    }, [
        chatState.to,
        chatState.isGroup,
        chatState.adminViewConversation,
        currentUserFullName,
        chatState.userList,
    ]);

    // Efecto para título de pestaña
    useEffect(() => {
        const myAssignedConversations = chatState.assignedConversations.filter((conv) => {
            const displayName =
                user?.nombre && user?.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user?.username;
            return conv.participants?.includes(displayName);
        });

        const unreadAssignedCount = myAssignedConversations.filter(
            (conv) => conv.unreadCount > 0
        ).length;

        const unreadRoomsCount =
            chatState.myActiveRooms?.filter((room) => {
                const roomUnread = chatState.unreadMessages?.[room.roomCode] || 0;
                return roomUnread > 0;
            }).length || 0;

        const totalUnread = unreadAssignedCount + unreadRoomsCount;

        if (totalUnread > 0) {
            document.title = `(${totalUnread}) Chat +34`;
        } else {
            document.title = 'Chat +34';
        }
    }, [chatState.assignedConversations, chatState.myActiveRooms, chatState.unreadMessages, user]);

    // Efecto para estado del socket
    useEffect(() => {
        const handleSocketConnected = () => {
            chatState.setSocketConnected(true);
        };

        const handleSocketDisconnected = () => {
            chatState.setSocketConnected(false);
        };

        window.addEventListener('socketConnected', handleSocketConnected);
        window.addEventListener('socketDisconnected', handleSocketDisconnected);

        return () => {
            window.removeEventListener('socketConnected', handleSocketConnected);
            window.removeEventListener('socketDisconnected', handleSocketDisconnected);
        };
    }, [chatState]);

    // Efecto para verificar conexión del socket
    useEffect(() => {
        if (socket) {
            chatState.setSocketConnected(socket.connected);
        } else {
            chatState.setSocketConnected(false);
        }
    }, [socket, chatState]);

    // Función para marcar mensajes como leídos
    const markRoomMessagesAsRead = useCallback(
        async (roomCode) => {
            if (!socket || !socket.connected || !roomCode) {
                return;
            }

            socket.emit('markRoomMessagesAsRead', {
                roomCode,
                username,
            });
        },
        [socket, username]
    );

    // Efecto para restaurar sala
    useEffect(() => {
        if (!isAuthenticated || !username) return;

        if (!chatState.hasRestoredRoom.current) {
            chatState.hasRestoredRoom.current = true;
        }

        roomManagement.loadMyActiveRooms(1, false, null, user);
    }, [isAuthenticated, username, user, roomManagement.loadMyActiveRooms]);

    // Efecto para detectar código de sala en URL
    useEffect(() => {
        if (!isAuthenticated || !username) return;

        const hash = window.location.hash;
        const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/);

        if (roomMatch && roomMatch[1]) {
            const roomCode = roomMatch[1];
            chatState.setJoinRoomForm({ roomCode: roomCode });
            chatState.setShowJoinRoomModal(true);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [isAuthenticated, username, chatState]);

    // Cargar mensajes cuando cambie currentRoomCode
    useEffect(() => {
        if (chatState.currentRoomCode && username && chatState.isGroup) {
            loadInitialMessages();
        }
    }, [chatState.currentRoomCode, username, chatState.isGroup, loadInitialMessages]);

    // Marcar mensajes como leídos
    const markedRoomsRef = useRef(new Set());

    useEffect(() => {
        if (chatState.isGroup && chatState.currentRoomCode && messages.length > 0) {
            if (!markedRoomsRef.current.has(chatState.currentRoomCode)) {
                markedRoomsRef.current.add(chatState.currentRoomCode);

                const timer = setTimeout(() => {
                    markRoomMessagesAsRead(chatState.currentRoomCode);
                }, 500);

                return () => clearTimeout(timer);
            }
        }

        if (!chatState.isGroup || !chatState.currentRoomCode) {
            markedRoomsRef.current.clear();
        }
    }, [chatState.isGroup, chatState.currentRoomCode, messages.length, markRoomMessagesAsRead]);

    // Cargar mensajes cuando cambie 'to'
    useEffect(() => {
        if (
            chatState.to &&
            username &&
            !chatState.isGroup &&
            !chatState.currentRoomCode &&
            !chatState.adminViewConversation
        ) {
            loadInitialMessages();
        }
    }, [
        chatState.to,
        username,
        chatState.isGroup,
        chatState.currentRoomCode,
        loadInitialMessages,
        chatState.adminViewConversation,
    ]);

    // Efecto para cargar mensajes en vista admin
    useEffect(() => {
        if (chatState.adminViewConversation) {
            conversations.loadAdminViewMessages(chatState.adminViewConversation, currentUserFullName);
        }
    }, [chatState.adminViewConversation, conversations.loadAdminViewMessages, currentUserFullName]);

    // === FUNCIONES DE NAVEGACIÓN ===
    const loadMoreUsers = useCallback(async () => {
        // Implementación existente
    }, []);

    const handleUserSelect = useCallback(
        (userName, messageId = null, conversationData = null) => {
            // Implementación existente
        },
        []
    );

    const handleGroupSelect = useCallback((group) => {
        // Implementación existente
    }, []);

    const handlePersonalNotes = useCallback(() => {
        // Implementación existente
    }, []);

    const handleToggleMenu = useCallback(() => {
        if (window.innerWidth <= 768) {
            chatState.setShowSidebar(!chatState.showSidebar);
        }
    }, [chatState.showSidebar, chatState.setShowSidebar]);

    const handleEscKey = useCallback((event) => {
        if (event.key === 'Escape') {
            if (window.innerWidth <= 768 && chatState.showSidebar) {
                chatState.setShowSidebar(false);
            }
        }
    }, [chatState.showSidebar, chatState.setShowSidebar]);

    useEffect(() => {
        window.addEventListener('keydown', handleEscKey);
        return () => window.removeEventListener('keydown', handleEscKey);
    }, [handleEscKey]);

    const handleNavigateToMention = useCallback((event) => {
        // Implementación existente
    }, []);

    const handleNavigateToGroup = useCallback((event) => {
        // Implementación existente
    }, []);

    const handleNavigateToChat = useCallback((event) => {
        // Implementación existente
    }, []);

    // === FUNCIONES DE MENSAJERÍA ===
    const handleSendMessage = useCallback(async () => {
        // Implementación existente (muy grande, mantener aquí)
    }, []);

    const handleEditMessage = useCallback(async (messageId, newText, newFile = null) => {
        // Implementación existente
    }, []);

    const handleDeleteMessage = useCallback(async (messageId, messageSender) => {
        // Implementación existente
    }, []);

    const handleReplyMessage = useCallback((message) => {
        chatState.setReplyingTo(message);
    }, [chatState]);

    const handleCancelReply = useCallback(() => {
        chatState.setReplyingTo(null);
    }, [chatState]);

    const handleSendVoiceMessage = useCallback(async (audioFile) => {
        // Implementación existente
    }, []);

    const handleSendThreadMessage = useCallback(async (messageData) => {
        // Implementación existente
    }, []);

    const handleStartVideoCall = useCallback(async () => {
        // Implementación existente
    }, []);

    const handlePinMessage = useCallback(async (message) => {
        try {
            const newPinnedId = chatState.pinnedMessageId === message.id ? null : message.id;
            chatState.setPinnedMessageId(newPinnedId);

            if (socket && socket.connected) {
                socket.emit('pinMessage', {
                    roomCode: chatState.currentRoomCode,
                    to: !chatState.isGroup ? chatState.to : null,
                    messageId: newPinnedId,
                    isGroup: chatState.isGroup,
                    pinnedBy: username,
                });
            }

            if (newPinnedId) {
                await showSuccessAlert('Mensaje fijado', 'El mensaje se ha fijado en la parte superior.');
            }
        } catch (error) {
            console.error('Error al fijar mensaje:', error);
            await showErrorAlert('Error', 'No se pudo fijar el mensaje.');
        }
    }, [chatState, socket, username]);

    const handlePollVote = useCallback(async (pollId, optionIndex) => {
        // Implementación existente
    }, []);

    const handleEnableSounds = useCallback(() => {
        chatState.setSoundsEnabled(true);
        localStorage.setItem('soundsEnabled', 'true');
    }, [chatState]);

    const handleSoundToggle = useCallback(() => {
        const newValue = !chatState.soundsEnabled;
        chatState.setSoundsEnabled(newValue);
        localStorage.setItem('soundsEnabled', String(newValue));
    }, [chatState.soundsEnabled, chatState]);

    const handleLoginSuccess = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userData.token || 'mock-token');
        refreshAuth();
    };

    const handleLogout = async () => {
        try {
            if (chatState.currentRoomCode && socket && socket.connected) {
                socket.emit('leaveRoom', {
                    roomCode: chatState.currentRoomCode,
                    from: username,
                });
            }

            chatState.setTo('');
            chatState.setIsGroup(false);
            chatState.setRoomUsers([]);
            chatState.setCurrentRoomCode(null);
            chatState.currentRoomCodeRef.current = null;
            chatState.setMyActiveRooms([]);
            chatState.setAssignedConversations([]);
            chatState.setAdminViewConversation(null);
            clearMessages();
            clearInput();
            chatState.setReplyingTo(null);

            if (socket) {
                socket.disconnect();
            }

            logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            logout();
        }
    };

    const normalizeUsername = (username) => {
        return (
            username
                ?.toLowerCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') || ''
        );
    };

    const canSendMessages = useMemo(() => {
        if (!chatState.to) return false;

        const currentUserFullName =
            user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username;

        const currentUserNormalized = normalizeUsername(currentUserFullName);
        const toNormalized = normalizeUsername(chatState.to);

        const assignedConv = chatState.assignedConversations?.find((conv) => {
            const otherUser = conv.participants?.find(
                (p) => normalizeUsername(p) !== currentUserNormalized
            );
            return (
                normalizeUsername(otherUser) === toNormalized ||
                normalizeUsername(conv.name) === toNormalized
            );
        });

        if (assignedConv && assignedConv.participants) {
            const isUserParticipant = assignedConv.participants.some(
                (p) => normalizeUsername(p) === currentUserNormalized
            );
            if (!isUserParticipant) {
                return false;
            }
        }

        return true;
    }, [chatState.to, user, chatState.assignedConversations]);

    // Callbacks para paginación
    const handleLoadUserRooms = useCallback(
        async (page) => {
            await roomManagement.loadMyActiveRooms(page, true, null, user);
        },
        [roomManagement, user]
    );

    const handleRoomsLimitChange = useCallback(
        async (newLimit) => {
            const normalized = Math.max(5, Math.min(50, Number(newLimit) || 10));
            chatState.setRoomsLimit(normalized);
            await roomManagement.loadMyActiveRooms(1, false, normalized, user);
        },
        [roomManagement, chatState, user]
    );

    const handleGoToRoomsPage = useCallback(
        async (page) => {
            const safePage = Math.max(1, Number(page) || 1);
            await roomManagement.loadMyActiveRooms(safePage, false, null, user);
        },
        [roomManagement, user]
    );

    // === RENDERIZADO ===
    if (isLoading) {
        return <LoadingScreen message="Verificando sesión..." />;
    }

    if (!isAuthenticated) {
        return (
            <div className="login-container">
                <Login onLoginSuccess={handleLoginSuccess} />
            </div>
        );
    }

    const effectiveIsLoadingMessages = isLoadingMessages || chatState.isAdminViewLoading;

    return (
        <>
            {/* Elemento de audio */}
            <audio
                ref={messageSound}
                preload="auto"
                src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
            />

            {/* Layout principal */}
            <ChatLayout
                // Props del sidebar
                user={user}
                userList={chatState.userList}
                groupList={chatState.groupList}
                assignedConversations={chatState.assignedConversations}
                monitoringConversations={chatState.monitoringConversations}
                monitoringPage={chatState.monitoringPage}
                monitoringTotal={chatState.monitoringTotal}
                monitoringTotalPages={chatState.monitoringTotalPages}
                monitoringLoading={chatState.monitoringLoading}
                onLoadMonitoringConversations={conversations.loadMonitoringConversations}
                assignedPage={chatState.assignedPage}
                assignedTotal={chatState.assignedTotal}
                assignedTotalPages={chatState.assignedTotalPages}
                assignedLoading={chatState.assignedLoading}
                onLoadAssignedConversations={conversations.handleLoadAssignedConversations}
                roomsPage={chatState.roomsPage}
                roomsTotal={chatState.roomsTotal}
                roomsTotalPages={chatState.roomsTotalPages}
                roomsLoading={chatState.roomsLoading}
                onLoadUserRooms={handleLoadUserRooms}
                roomsLimit={chatState.roomsLimit}
                onRoomsLimitChange={handleRoomsLimitChange}
                onGoToRoomsPage={handleGoToRoomsPage}
                isAdmin={isAdmin}
                showAdminMenu={chatState.showAdminMenu}
                setShowAdminMenu={chatState.setShowAdminMenu}
                showSidebar={chatState.showSidebar}
                sidebarCollapsed={chatState.sidebarCollapsed}
                onToggleCollapse={() => chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)}
                onUserSelect={handleUserSelect}
                onGroupSelect={handleGroupSelect}
                onPersonalNotes={handlePersonalNotes}
                onLogout={handleLogout}
                onShowCreateRoom={() => chatState.setShowCreateRoomModal(true)}
                onShowJoinRoom={() => chatState.setShowJoinRoomModal(true)}
                onShowAdminRooms={roomManagement.handleShowAdminRooms}
                onShowCreateConversation={() => chatState.setShowCreateConversationModal(true)}
                onShowManageConversations={() => chatState.setShowManageConversationsModal(true)}
                onShowManageUsers={() => { }}
                onShowSystemConfig={() => { }}
                unreadMessages={chatState.unreadMessages}
                myActiveRooms={chatState.myActiveRooms}
                onRoomSelect={roomManagement.handleRoomSelect}
                onKickUser={roomManagement.handleKickUser}
                userListHasMore={chatState.userListHasMore}
                userListLoading={chatState.userListLoading}
                onLoadMoreUsers={loadMoreUsers}
                roomTypingUsers={chatState.roomTypingUsers}
                // Props del chat
                to={chatState.to}
                isGroup={chatState.isGroup}
                currentRoomCode={chatState.currentRoomCode}
                roomUsers={chatState.roomUsers}
                messages={messages}
                adminViewConversation={chatState.adminViewConversation}
                input={input}
                setInput={setInput}
                onSendMessage={handleSendMessage}
                canSendMessages={canSendMessages}
                onFileSelect={handleFileSelect}
                onRecordAudio={() => setIsRecording(true)}
                onStopRecording={() => setIsRecording(false)}
                isRecording={isRecording}
                mediaFiles={mediaFiles}
                mediaPreviews={mediaPreviews}
                onCancelMediaUpload={cancelMediaUpload}
                onRemoveMediaFile={handleRemoveMediaFile}
                onLeaveRoom={roomManagement.handleLeaveRoom}
                hasMoreMessages={hasMoreMessages}
                isLoadingMore={isLoadingMore}
                isLoadingMessages={effectiveIsLoadingMessages}
                onLoadMoreMessages={loadMoreMessages}
                onToggleMenu={handleToggleMenu}
                socket={socket}
                socketConnected={chatState.socketConnected}
                soundsEnabled={chatState.soundsEnabled}
                onEnableSounds={handleEnableSounds}
                currentUsername={username}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                isTyping={chatState.typingUser !== null}
                typingUser={chatState.typingUser}
                highlightMessageId={highlightMessageId}
                onMessageHighlighted={() => setHighlightMessageId(null)}
                replyingTo={chatState.replyingTo}
                onCancelReply={handleCancelReply}
                onAddUsersToRoom={roomManagement.handleAddUsersToRoom}
                onRemoveUsersFromRoom={roomManagement.handleRemoveUsersFromRoom}
                onOpenThread={(message) => { }}
                onSendThreadMessage={handleSendThreadMessage}
                onSendVoiceMessage={handleSendVoiceMessage}
                onStartVideoCall={handleStartVideoCall}
                isUploadingFile={chatState.isUploadingFile}
                isSending={chatState.isSending}
                onPinMessage={handlePinMessage}
                pinnedMessageId={chatState.pinnedMessageId}
                onPollVote={handlePollVote}
                onRoomUpdated={() => roomManagement.loadMyActiveRooms(1, false, null, user)}
                // Props de modales
                showCreateRoomModal={chatState.showCreateRoomModal}
                setShowCreateRoomModal={chatState.setShowCreateRoomModal}
                roomForm={chatState.roomForm}
                setRoomForm={chatState.setRoomForm}
                onCreateRoom={roomManagement.handleCreateRoom}
                showJoinRoomModal={chatState.showJoinRoomModal}
                setShowJoinRoomModal={chatState.setShowJoinRoomModal}
                joinRoomForm={chatState.joinRoomForm}
                setJoinRoomForm={chatState.setJoinRoomForm}
                onJoinRoom={roomManagement.handleJoinRoom}
                showAdminRoomsModal={chatState.showAdminRoomsModal}
                setShowAdminRoomsModal={chatState.setShowAdminRoomsModal}
                onDeleteRoom={(roomId, roomName) => roomManagement.handleDeleteRoom(roomId, roomName, user)}
                onDeactivateRoom={(roomId, roomName) =>
                    roomManagement.handleDeactivateRoom(roomId, roomName, user)
                }
                onActivateRoom={(roomId, roomName) =>
                    roomManagement.handleActivateRoom(roomId, roomName, user)
                }
                onEditRoom={roomManagement.handleEditRoom}
                onViewRoomUsers={roomManagement.handleViewRoomUsers}
            />

            {/* Contenedor de modales */}
            <ChatModalsContainer
                // Edit Room Modal
                showEditRoomModal={chatState.showEditRoomModal}
                setShowEditRoomModal={chatState.setShowEditRoomModal}
                editingRoom={chatState.editingRoom}
                setEditingRoom={chatState.setEditingRoom}
                editForm={chatState.editForm}
                setEditForm={chatState.setEditForm}
                onUpdateRoom={() => roomManagement.handleUpdateRoom(user)}
                // Room Created Modal
                showRoomCreatedModal={chatState.showRoomCreatedModal}
                setShowRoomCreatedModal={chatState.setShowRoomCreatedModal}
                createdRoomData={chatState.createdRoomData}
                setCreatedRoomData={chatState.setCreatedRoomData}
                // Create Conversation Modal
                showCreateConversationModal={chatState.showCreateConversationModal}
                setShowCreateConversationModal={chatState.setShowCreateConversationModal}
                onCreateConversation={conversations.handleCreateConversation}
                currentUser={user}
                // Manage Conversations Modal
                showManageConversationsModal={chatState.showManageConversationsModal}
                setShowManageConversationsModal={chatState.setShowManageConversationsModal}
                onConversationUpdated={() => conversations.loadAssignedConversations()}
                socket={socket}
                // Add Users To Room Modal
                showAddUsersToRoomModal={chatState.showAddUsersToRoomModal}
                setShowAddUsersToRoomModal={chatState.setShowAddUsersToRoomModal}
                currentRoomCode={chatState.currentRoomCode}
                to={chatState.to}
                roomUsers={chatState.roomUsers}
                onUsersAdded={roomManagement.handleUsersAdded}
                // Remove Users From Room Modal
                showRemoveUsersFromRoomModal={chatState.showRemoveUsersFromRoomModal}
                setShowRemoveUsersFromRoomModal={chatState.setShowRemoveUsersFromRoomModal}
                username={username}
                onUsersRemoved={roomManagement.handleUsersRemoved}
            />

            {/* Panel de configuración */}
            <SettingsPanel
                isOpen={chatState.showAdminMenu}
                onClose={() => chatState.setShowAdminMenu(false)}
                user={user}
                isSoundEnabled={chatState.soundsEnabled}
                onSoundToggle={handleSoundToggle}
            />
        </>
    );
};

export default ChatPageRefactored;
