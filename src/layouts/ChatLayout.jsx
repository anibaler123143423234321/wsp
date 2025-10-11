import React from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import ChatContent from '../components/ChatContent';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import JoinRoomModal from '../components/modals/JoinRoomModal';
import AdminRoomsModal from '../components/modals/AdminRoomsModal';
import './ChatLayout.css';

const ChatLayout = ({
  // Props del sidebar
  user, userList, groupList, assignedConversations, isAdmin, showAdminMenu, setShowAdminMenu, showSidebar,
  onUserSelect, onGroupSelect, onPersonalNotes, onLogout,
  onShowCreateRoom, onShowJoinRoom, onShowAdminRooms, onShowCreateConversation, onShowManageConversations,
  onShowManageUsers, onShowSystemConfig, loadingAdminRooms, myActiveRooms, onRoomSelect,

      // Props del chat
      to, isGroup, currentRoomCode, roomUsers, roomDuration, roomExpiresAt, messages, input, setInput,
  onSendMessage, onFileSelect, onRecordAudio, onStopRecording, isRecording,
  mediaFiles, mediaPreviews, onCancelMediaUpload, onRemoveMediaFile, onLeaveRoom, onToggleMenu,
  onEditMessage, hasMoreMessages, isLoadingMore, onLoadMoreMessages,
  onStartCall, onStartVideoCall, hasCamera, canSendMessages, adminViewConversation,

  // Props de modales
  showCreateRoomModal, setShowCreateRoomModal, roomForm, setRoomForm, onCreateRoom,
  showJoinRoomModal, setShowJoinRoomModal, joinRoomForm, setJoinRoomForm, onJoinRoom,
  showAdminRoomsModal, setShowAdminRoomsModal, adminRooms, onDeleteRoom, onDeactivateRoom, onViewRoomUsers,

  // Props de notificaciones
  unreadMessages,

  // Props del socket
  soundsEnabled, onEnableSounds, socket, isTyping,

  // Props del usuario
  currentUsername,

  // Props de búsqueda
  highlightMessageId, onMessageHighlighted
}) => {
  // Función para obtener el picture del usuario con el que se está chateando
  const getUserPicture = () => {
    if (!to || isGroup) return null;

    // Buscar el usuario en userList
    const targetUser = userList?.find(u => {
      const uName = typeof u === 'string' ? u : u.username;
      const uFullName = typeof u === 'object' && u.nombre && u.apellido
        ? `${u.nombre} ${u.apellido}`
        : uName;
      return uFullName === to || uName === to;
    });

    return typeof targetUser === 'object' ? targetUser.picture : null;
  };

  return (
    <div className="chat-app">

      {/* Overlay para mobile */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={onToggleMenu}></div>
      )}

      {showSidebar && (
        <Sidebar
          user={user}
          userList={userList}
          groupList={groupList}
          assignedConversations={assignedConversations}
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
          loadingAdminRooms={loadingAdminRooms}
          unreadMessages={unreadMessages}
          onToggleSidebar={onToggleMenu}
          myActiveRooms={myActiveRooms}
          onRoomSelect={onRoomSelect}
          currentRoomCode={currentRoomCode}
        />
      )}
      
      <div className="chat-main">
            <ChatHeader
              to={to}
              isGroup={isGroup}
              currentRoomCode={currentRoomCode}
              roomUsers={roomUsers}
              roomDuration={roomDuration}
              roomExpiresAt={roomExpiresAt}
              onLeaveRoom={onLeaveRoom}
              onToggleMenu={onToggleMenu}
              showSidebar={showSidebar}
              soundsEnabled={soundsEnabled}
              onEnableSounds={onEnableSounds}
              userPicture={getUserPicture()}
              onStartCall={onStartCall}
              onStartVideoCall={onStartVideoCall}
              hasCamera={hasCamera}
              onBack={onToggleMenu}
              isTyping={isTyping}
              adminViewConversation={adminViewConversation}
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
          currentUsername={currentUsername}
          onEditMessage={onEditMessage}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
          onLoadMoreMessages={onLoadMoreMessages}
          socket={socket}
          highlightMessageId={highlightMessageId}
          onMessageHighlighted={onMessageHighlighted}
          canSendMessages={canSendMessages}
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
          adminRooms={adminRooms}
          onDeleteRoom={onDeleteRoom}
          onDeactivateRoom={onDeactivateRoom}
          onViewRoomUsers={onViewRoomUsers}
          currentUser={user}
        />
      )}
      
      {/* Otros modales... */}
    </div>
  );
};

export default ChatLayout;
