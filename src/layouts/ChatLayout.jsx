import React from 'react';
import { FaBars } from 'react-icons/fa';
import Sidebar from '../pages/Chat/components/Sidebar/Sidebar';
import LeftSidebar from '../pages/Chat/components/LeftSidebar/LeftSidebar';
import ChatHeader from '../pages/Chat/components/ChatHeader/ChatHeader';
import ChatContent from '../pages/Chat/components/ChatContent/ChatContent';
import MembersPanel from '../pages/Chat/components/MembersPanel/MembersPanel';
import ThreadPanel from '../pages/Chat/components/ThreadPanel/ThreadPanel';
import InfoPanel from '../pages/Chat/components/InfoPanel/InfoPanel';
import ActiveVideoCallBanner from '../pages/Chat/components/ActiveVideoCallBanner/ActiveVideoCallBanner';
import PinnedMessageBanner from '../pages/Chat/components/PinnedMessageBanner/PinnedMessageBanner';
import CreateRoomModal from '../pages/Chat/components/modals/CreateRoomModal';
import JoinRoomModal from '../pages/Chat/components/modals/JoinRoomModal';
import CreatePollModal from '../pages/Chat/components/modals/CreatePollModal';
import AdminRoomsModal from '../pages/Chat/components/modals/AdminRoomsModal';
import './ChatLayout.css';

const ChatLayout = ({
  // Props del sidebar
  user, userList, groupList, assignedConversations, monitoringConversations, monitoringPage, monitoringTotal, monitoringTotalPages, monitoringLoading, onLoadMonitoringConversations, isAdmin, showAdminMenu, setShowAdminMenu, showSidebar, sidebarCollapsed, onToggleCollapse,
  onUserSelect, onGroupSelect, onPersonalNotes, onLogout,
  onShowCreateRoom, onShowJoinRoom, onShowAdminRooms, onShowCreateConversation, onShowManageConversations,
  onShowManageUsers, onShowSystemConfig, myActiveRooms, onRoomSelect, onKickUser,
  userListHasMore, userListLoading, onLoadMoreUsers, roomTypingUsers,
  // 🔥 NUEVOS PROPS para paginación real
  assignedPage, assignedTotal, assignedTotalPages, assignedLoading, onLoadAssignedConversations,
  roomsPage, roomsTotal, roomsTotalPages, roomsLoading, onLoadUserRooms, roomsLimit, onRoomsLimitChange, onGoToRoomsPage,

  // Props del chat
  to, isGroup, currentRoomCode, roomUsers, messages, input, setInput,
  onSendMessage, onFileSelect, onRecordAudio, onStopRecording, isRecording,
  mediaFiles, mediaPreviews, onCancelMediaUpload, onRemoveMediaFile, onLeaveRoom, onToggleMenu,
  onEditMessage, onDeleteMessage, hasMoreMessages, isLoadingMore, isLoadingMessages, onLoadMoreMessages,
  messagesError, onRetryMessages, // 🔥 Props de error y reintento
  onStartCall, onStartVideoCall, hasCamera, canSendMessages, adminViewConversation,

  // Props de modales
  showCreateRoomModal, setShowCreateRoomModal, roomForm, setRoomForm, onCreateRoom,
  showJoinRoomModal, setShowJoinRoomModal, joinRoomForm, setJoinRoomForm, onJoinRoom,
  showAdminRoomsModal, setShowAdminRoomsModal, onDeleteRoom, onDeactivateRoom, onActivateRoom, onEditRoom, onViewRoomUsers,

  // Props de notificaciones
  unreadMessages,

  // Props del socket
  soundsEnabled, onEnableSounds, socket, isTyping, typingUser, stopRingtone, // 🔥 Prop para detener tono
  // Props del usuario
  currentUsername,

  // Props de búsqueda
  highlightMessageId, onMessageHighlighted,

  // Props de respuesta a mensajes
  replyingTo, onCancelReply,

  // Props para agregar usuarios a sala
  onAddUsersToRoom,
  onRemoveUsersFromRoom,

  // Props para hilos
  onOpenThread,
  onSendThreadMessage,

  // Props para mensajes de voz
  // Props para mensajes de voz
  onSendVoiceMessage,

  // 🔥 Props de estado de carga
  isUploadingFile,
  isSending,
  pinnedMessage,
  onPinMessage,
  onUnpinMessage,
  onClickPinnedMessage,
  pinnedMessageId,
  onPollVote,
  // 🔥 Props de actualización de sala
  onRoomUpdated,
  selectedRoomData, // 🔥 NUEVO: Datos de sala seleccionada (fallback)
}) => {
  // State para el panel de miembros (lifted from ChatHeader)
  const [showMembersPanel, setShowMembersPanel] = React.useState(false);

  // State para el panel de hilos
  const [showThreadPanel, setShowThreadPanel] = React.useState(false);
  const [threadMessage, setThreadMessage] = React.useState(null);

  // State para el panel de información
  const [showCreatePollModal, setShowCreatePollModal] = React.useState(false);
  const [showInfoPanel, setShowInfoPanel] = React.useState(false);

  const toggleMembersPanel = () => {
    setShowMembersPanel(!showMembersPanel);
  };

  const toggleInfoPanel = () => {
    setShowInfoPanel(!showInfoPanel);
  };

  const handleCreatePoll = () => {
    setShowCreatePollModal(true);
  };

  const handlePollCreated = (pollData) => {
    // Enviar la encuesta como mensaje
    if (onSendMessage) {
      onSendMessage({
        poll: pollData,
        isPoll: true
      });
    }
  };

  // Handler para abrir panel de hilos
  const handleOpenThread = (message) => {
    setThreadMessage(message);
    setShowThreadPanel(true);
  };

  // Cerrar paneles si cambia el chat
  React.useEffect(() => {
    setShowMembersPanel(false);
    setShowThreadPanel(false);
    setShowInfoPanel(false);
  }, [to]);

  // Función para obtener el usuario completo con el que se está chateando
  const getTargetUser = () => {
    if (!to || isGroup) return null;

    // Si es una conversación asignada (adminViewConversation), buscar en los participantes
    if (adminViewConversation && adminViewConversation.participants) {
      // Obtener el nombre completo del usuario actual
      const currentUserFullName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;

      // Buscar en userList por cada participante
      for (const participant of adminViewConversation.participants) {
        const targetUser = userList?.find(u => {
          const uName = typeof u === 'string' ? u : u.username;
          const uFullName = typeof u === 'object' && u.nombre && u.apellido
            ? `${u.nombre} ${u.apellido}`
            : uName;

          return uFullName === participant || uName === participant;
        });

        // Retornar el primer participante que NO sea el usuario actual
        if (targetUser && typeof targetUser === 'object') {
          const targetFullName = targetUser.nombre && targetUser.apellido
            ? `${targetUser.nombre} ${targetUser.apellido}`
            : targetUser.username;

          if (targetFullName !== currentUserFullName) {
            return targetUser;
          }
        }
      }
    }

    // Buscar el usuario en userList (conversación normal)
    const targetUser = userList?.find(u => {
      const uName = typeof u === 'string' ? u : u.username;
      const uFullName = typeof u === 'object' && u.nombre && u.apellido
        ? `${u.nombre} ${u.apellido}`
        : uName;
      return uFullName === to || uName === to;
    });

    return typeof targetUser === 'object' ? targetUser : null;
  };

  // Función para obtener el picture del usuario con el que se está chateando
  const getUserPicture = () => {
    if (isGroup) {
      const room = myActiveRooms?.find(r => r.roomCode === currentRoomCode);
      // 🔥 Fallback: Si no hay picture, revisar description por si guardamos la URL ahí
      if (room?.picture) return room.picture;
      if (room?.description && room.description.trim().length > 0) return room.description;

      // 🔥 Fallback 2: Revisar selectedRoomData (para Favoritos que no están en myActiveRooms)
      // Relaxed check: trust selectedRoomData if present
      if (selectedRoomData) {
        if (selectedRoomData.picture) return selectedRoomData.picture;
        if (selectedRoomData.description && selectedRoomData.description.trim().length > 0) return selectedRoomData.description;
      }

      return null;
    }
    const targetUser = getTargetUser();
    return targetUser?.picture || null;
  };

  return (
    <div className="flex gap-0 w-full max-w-full m-0 h-screen rounded-none overflow-hidden shadow-none bg-white">

      {/* Botón hamburguesa flotante ELIMINADO - ahora usamos el botón de atrás en el header */}

      {/* Overlay para mobile - cuando el sidebar está abierto */}
      {showSidebar && (
        <div
          className="hidden max-[768px]:block fixed top-0 left-0 w-screen h-screen bg-black/50 z-[99] animate-[fadeIn_0.3s_ease]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // console.log('🔴 Overlay clickeado - cerrando sidebar');
            onToggleMenu();
          }}
          style={{ touchAction: 'manipulation' }}
        ></div>
      )}

      {/* Sidebar - Desktop: siempre visible | Mobile: ConversationList siempre visible, LeftSidebar como overlay */}
      <Sidebar
        user={user}
        userList={userList}
        groupList={groupList}
        assignedConversations={assignedConversations}
        monitoringConversations={monitoringConversations}
        monitoringPage={monitoringPage}
        monitoringTotal={monitoringTotal}
        monitoringTotalPages={monitoringTotalPages}
        monitoringLoading={monitoringLoading}
        onLoadMonitoringConversations={onLoadMonitoringConversations}
        roomUsers={roomUsers}
        isGroup={isGroup}
        isAdmin={isAdmin}
        showAdminMenu={showAdminMenu}
        setShowAdminMenu={setShowAdminMenu}
        onUserSelect={onUserSelect}
        onGroupSelect={onGroupSelect}
        onPersonalNotes={onPersonalNotes}
        onLogout={onLogout}
        onShowCreateRoom={onShowCreateRoom}
        onShowJoinRoom={onShowJoinRoom}
        onShowAdminRooms={onShowAdminRooms}
        onShowCreateConversation={onShowCreateConversation}
        onShowManageConversations={onShowManageConversations}
        onShowManageUsers={onShowManageUsers}
        onShowSystemConfig={onShowSystemConfig}
        unreadMessages={unreadMessages}
        onToggleSidebar={onToggleMenu}
        myActiveRooms={myActiveRooms}
        onRoomSelect={onRoomSelect}
        currentRoomCode={currentRoomCode}
        onKickUser={onKickUser}
        to={to}
        userListHasMore={userListHasMore}
        userListLoading={userListLoading}
        onLoadMoreUsers={onLoadMoreUsers}
        roomTypingUsers={roomTypingUsers}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={onToggleCollapse}
        showSidebar={showSidebar}
        assignedPage={assignedPage}
        assignedTotal={assignedTotal}
        assignedTotalPages={assignedTotalPages}
        assignedLoading={assignedLoading}
        onLoadAssignedConversations={onLoadAssignedConversations}
        roomsPage={roomsPage}
        roomsTotal={roomsTotal}
        roomsTotalPages={roomsTotalPages}
        roomsLoading={roomsLoading}
        onLoadUserRooms={onLoadUserRooms}
        roomsLimit={roomsLimit}
        onRoomsLimitChange={onRoomsLimitChange}
        onGoToRoomsPage={onGoToRoomsPage}
      />



      {/* ChatContent - Desktop: siempre visible | Mobile: solo cuando hay chat seleccionado */}
      <div className={`flex-1 flex flex-row bg-white relative transition-all duration-300 ease-in-out max-[768px]:h-[calc(100vh-60px)] max-[600px]:h-screen overflow-hidden max-w-full ${!to ? 'max-[768px]:hidden' : ''}`}>

        {/* Main Chat Area (Header + Content) */}
        <div className="flex-1 flex flex-col h-full min-w-0 relative">
          <ChatHeader
            to={to}
            isGroup={isGroup}
            currentRoomCode={currentRoomCode}
            roomUsers={roomUsers}
            onLeaveRoom={onLeaveRoom}
            onToggleMenu={onToggleMenu}
            showSidebar={showSidebar}
            soundsEnabled={soundsEnabled}
            onEnableSounds={onEnableSounds}
            userPicture={getUserPicture()}
            targetUser={getTargetUser()}
            onStartCall={onStartCall}
            onStartVideoCall={onStartVideoCall}
            hasCamera={hasCamera}
            onBack={onToggleMenu}
            isTyping={isTyping}
            adminViewConversation={adminViewConversation}
            onAddUsersToRoom={onAddUsersToRoom}
            onRemoveUsersFromRoom={onRemoveUsersFromRoom}
            user={user}
            onToggleMembersPanel={toggleMembersPanel}
            onToggleInfoPanel={toggleInfoPanel}
          />

          {/* 🔥 NUEVO: Banner de videollamada activa */}
          {to && (
            <ActiveVideoCallBanner
              messages={messages}
              currentUsername={currentUsername}
              isGroup={isGroup}
              currentRoomCode={currentRoomCode}
              to={to}
              socket={socket}
              user={user}
              stopRingtone={stopRingtone} // 🔥 Pasar función
            />
          )}

          {/* 🔥 NUEVO: Banner de mensaje fijado */}
          {isGroup && pinnedMessage && (
            <PinnedMessageBanner
              pinnedMessage={pinnedMessage}
              onUnpin={onUnpinMessage}
              onClickMessage={onClickPinnedMessage}
              canUnpin={user?.role === 'ADMIN' || user?.role === 'JEFEPISO' || user?.role === 'PROGRAMADOR' || user?.role === 'SUPERVISOR'}
            />
          )}

          <ChatContent
            messages={messages}
            input={input}
            setInput={setInput}
            onSendMessage={onSendMessage}
            onFileSelect={onFileSelect}
            onRecordAudio={onRecordAudio}
            onStopRecording={onStopRecording}
            isRecording={isRecording}
            mediaFiles={mediaFiles}
            mediaPreviews={mediaPreviews}
            onCancelMediaUpload={onCancelMediaUpload}
            onRemoveMediaFile={onRemoveMediaFile}
            to={to}
            isGroup={isGroup}
            currentRoomCode={currentRoomCode}
            roomUsers={roomUsers}
            currentUsername={currentUsername}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMore}
            isLoadingMessages={isLoadingMessages} // 🔥 Estado de carga inicial
            onLoadMoreMessages={onLoadMoreMessages}
            messagesError={messagesError} // 🔥 Error de carga
            onRetryMessages={onRetryMessages} // 🔥 Función para reintentar
            socket={socket}
            highlightMessageId={highlightMessageId}
            onMessageHighlighted={onMessageHighlighted}
            canSendMessages={canSendMessages}
            replyingTo={replyingTo}
            onCancelReply={onCancelReply}
            onOpenThread={handleOpenThread}
            onSendVoiceMessage={onSendVoiceMessage}
            isAdmin={isAdmin}
            isOtherUserTyping={isTyping}
            typingUser={typingUser}
            roomTypingUsers={roomTypingUsers}
            isUploadingFile={isUploadingFile} // 🔥 Pasar prop de loading
            isSending={isSending} // 🔥 NUEVO: Estado de envío
            onStartVideoCall={onStartVideoCall} // 🔥 NUEVO: Handler de videollamada
            onPinMessage={onPinMessage} // 🔥 NUEVO: Fijar mensajes
            onUnpinMessage={onUnpinMessage} // 🔥 NUEVO: Desfijar mensajes
            onClickPinnedMessage={onClickPinnedMessage} // 🔥 NUEVO: Click en mensaje fijado
            pinnedMessageId={pinnedMessageId} // 🔥 Usa la prop directa, NO pinnedMessage?.id
            pinnedMessage={pinnedMessage}     // ❌ TE FALTA ESTO (El objeto con los datos)
            userRole={user?.role} // 🔥 NUEVO: Rol del usuario
            chatInfo={{ // 🔥 NUEVO: Información del chat
              name: to,
              picture: getUserPicture(),
              isOnline: isGroup ? false : getTargetUser()?.isOnline
            }}
            user={user} // 🔥 NUEVO: Usuario para modal de reenvío
            myActiveRooms={myActiveRooms} // 🔥 NUEVO: Grupos para modal de reenvío
            assignedConversations={assignedConversations} // 🔥 NUEVO: Chats asignados para modal de reenvío
          />
        </div>
        {/* Thread Panel (Displacement Layout) */}
        <ThreadPanel
          isOpen={showThreadPanel}
          message={threadMessage}
          onClose={() => setShowThreadPanel(false)}
          currentUsername={currentUsername}
          socket={socket}
          onSendMessage={onSendThreadMessage}
          currentRoomCode={currentRoomCode}
          roomUsers={roomUsers}
          myActiveRooms={myActiveRooms} // 🔥 NUEVO: Para modal de reenvío
          assignedConversations={assignedConversations} // 🔥 NUEVO: Para modal de reenvío
          user={user} // 🔥 NUEVO: Para modal de reenvío
        />

        {/* Members Panel (Displacement Layout) */}
        <MembersPanel
          isOpen={showMembersPanel}
          onClose={() => setShowMembersPanel(false)}
          roomUsers={roomUsers}
          onAddUsersToRoom={onAddUsersToRoom}
          currentRoomCode={currentRoomCode}
          user={user}
        />

        {/* Info Panel (Displacement Layout) */}
        <InfoPanel
          isOpen={showInfoPanel}
          onClose={() => setShowInfoPanel(false)}
          chatInfo={{
            isGroup: isGroup,
            roomCode: currentRoomCode,
            roomName: to,
            roomUsers: roomUsers,
            to: to,
            picture: getUserPicture(),
            description: isGroup
              ? (myActiveRooms?.find(r => r.roomCode === currentRoomCode)?.description || selectedRoomData?.description)
              : null,
            roomId: currentRoomCode
          }}
          onCreatePoll={handleCreatePoll}
          user={user} // 🔥 Pass user for permission checks
          onRoomUpdated={onRoomUpdated} // 🔥 Pass callback for updates
        />

      </div >

      {/* Modales */}
      {
        showCreateRoomModal && (
          <CreateRoomModal
            isOpen={showCreateRoomModal}
            onClose={() => setShowCreateRoomModal(false)}
            roomForm={roomForm}
            setRoomForm={setRoomForm}
            onCreateRoom={onCreateRoom}
          />
        )
      }

      {
        showJoinRoomModal && (
          <JoinRoomModal
            isOpen={showJoinRoomModal}
            onClose={() => setShowJoinRoomModal(false)}
            joinRoomForm={joinRoomForm}
            setJoinRoomForm={setJoinRoomForm}
            onJoinRoom={onJoinRoom}
          />
        )
      }

      {
        showAdminRoomsModal && (
          <AdminRoomsModal
            isOpen={showAdminRoomsModal}
            onClose={() => setShowAdminRoomsModal(false)}
            onDeleteRoom={onDeleteRoom}
            onDeactivateRoom={onDeactivateRoom}
            onActivateRoom={onActivateRoom}
            onEditRoom={onEditRoom}
            onViewRoomUsers={onViewRoomUsers}
            currentUser={user}
          />
        )
      }

      {/* Modal de Crear Encuesta */}
      {
        showCreatePollModal && (
          <CreatePollModal
            isOpen={showCreatePollModal}
            onClose={() => setShowCreatePollModal(false)}
            onCreatePoll={handlePollCreated}
          />
        )
      }

      {/* Otros modales... */}
    </div >
  );
};

export default ChatLayout;
