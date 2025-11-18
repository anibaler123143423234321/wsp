import React from 'react';
import { FaBars } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import LeftSidebar from '../components/LeftSidebar';
import ChatHeader from '../components/ChatHeader';
import ChatContent from '../components/ChatContent';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import JoinRoomModal from '../components/modals/JoinRoomModal';
import AdminRoomsModal from '../components/modals/AdminRoomsModal';
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
  roomsPage, roomsTotal, roomsTotalPages, roomsLoading, onLoadUserRooms,

      // Props del chat
      to, isGroup, currentRoomCode, roomUsers, messages, input, setInput,
  onSendMessage, onFileSelect, onRecordAudio, onStopRecording, isRecording,
  mediaFiles, mediaPreviews, onCancelMediaUpload, onRemoveMediaFile, onLeaveRoom, onToggleMenu,
  onEditMessage, onDeleteMessage, hasMoreMessages, isLoadingMore, onLoadMoreMessages,
  onStartCall, onStartVideoCall, hasCamera, canSendMessages, adminViewConversation,

  // Props de modales
  showCreateRoomModal, setShowCreateRoomModal, roomForm, setRoomForm, onCreateRoom,
  showJoinRoomModal, setShowJoinRoomModal, joinRoomForm, setJoinRoomForm, onJoinRoom,
  showAdminRoomsModal, setShowAdminRoomsModal, onDeleteRoom, onDeactivateRoom, onActivateRoom, onEditRoom, onViewRoomUsers,

  // Props de notificaciones
  unreadMessages,

  // Props del socket
  soundsEnabled, onEnableSounds, socket, isTyping, typingUser,

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

  // Props para mensajes de voz
  onSendVoiceMessage
}) => {
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
          onClick={onToggleMenu}
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
      />

      {/* LeftSidebar overlay para mobile */}
      <div className={`hidden max-[768px]:block fixed left-0 top-0 h-screen z-[100] transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <LeftSidebar
          user={user}
          onShowCreateRoom={onShowCreateRoom}
          onShowJoinRoom={onShowJoinRoom}
          onShowAdminRooms={onShowAdminRooms}
          onShowCreateConversation={onShowCreateConversation}
          onShowManageConversations={onShowManageConversations}
          showAdminMenu={showAdminMenu}
          setShowAdminMenu={setShowAdminMenu}
          onLogout={onLogout}
          onToggleSidebar={onToggleMenu}
          isCollapsed={false}
          onToggleCollapse={null}
        />
      </div>

      {/* ChatContent - Desktop: siempre visible | Mobile: solo cuando hay chat seleccionado */}
      <div className={`flex-1 flex flex-col bg-white relative transition-all duration-300 ease-in-out max-[768px]:h-[calc(100vh-60px)] max-[600px]:h-screen overflow-x-hidden max-w-full ${!to ? 'max-[768px]:hidden' : ''}`}>
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
            />
        
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
          onLoadMoreMessages={onLoadMoreMessages}
          socket={socket}
          highlightMessageId={highlightMessageId}
          onMessageHighlighted={onMessageHighlighted}
          canSendMessages={canSendMessages}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          onOpenThread={onOpenThread}
          onSendVoiceMessage={onSendVoiceMessage}
          isAdmin={isAdmin}
          isOtherUserTyping={isTyping}
          typingUser={typingUser}
          roomTypingUsers={roomTypingUsers}
        />
      </div>
      
      {/* Modales */}
      {showCreateRoomModal && (
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          roomForm={roomForm}
          setRoomForm={setRoomForm}
          onCreateRoom={onCreateRoom}
        />
      )}
      
      {showJoinRoomModal && (
        <JoinRoomModal
          isOpen={showJoinRoomModal}
          onClose={() => setShowJoinRoomModal(false)}
          joinRoomForm={joinRoomForm}
          setJoinRoomForm={setJoinRoomForm}
          onJoinRoom={onJoinRoom}
        />
      )}
      
      {showAdminRoomsModal && (
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
      )}
      
      {/* Otros modales... */}
    </div>
  );
};

export default ChatLayout;
