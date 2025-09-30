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
  user, userList, groupList, isAdmin, showAdminMenu, setShowAdminMenu, showSidebar,
  onUserSelect, onGroupSelect, onPersonalNotes, onLogout,
  onShowCreateRoom, onShowJoinRoom, onShowAdminRooms, onShowCreateConversation,
  onShowManageUsers, onShowSystemConfig, loadingAdminRooms,
  
      // Props del chat
      to, isGroup, currentRoomCode, roomUsers, roomDuration, roomExpiresAt, messages, input, setInput,
  onSendMessage, onFileSelect, onRecordAudio, onStopRecording, isRecording,
  mediaFiles, mediaPreviews, onCancelMediaUpload, onRemoveMediaFile, onLeaveRoom, onToggleMenu,
  
  // Props de modales
  showCreateRoomModal, setShowCreateRoomModal, roomForm, setRoomForm, onCreateRoom,
  showJoinRoomModal, setShowJoinRoomModal, joinRoomForm, setJoinRoomForm, onJoinRoom,
  showAdminRoomsModal, setShowAdminRoomsModal, adminRooms, onDeleteRoom, onDeactivateRoom, onViewRoomUsers, onEditRoom,
  
  // Props de notificaciones
  unreadMessages,
  
  // Props del socket
  soundsEnabled, onEnableSounds,

  // Props del usuario
  currentUsername
}) => {
  return (
    <div className="chat-app">
      
      {showSidebar && (
        <Sidebar
          user={user}
          userList={userList}
          groupList={groupList}
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
          onShowManageUsers={onShowManageUsers}
          onShowSystemConfig={onShowSystemConfig}
          loadingAdminRooms={loadingAdminRooms}
          unreadMessages={unreadMessages}
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
          onEditRoom={onEditRoom}
        />
      )}
      
      {/* Otros modales... */}
    </div>
  );
};

export default ChatLayout;
