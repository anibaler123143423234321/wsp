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
  user, userList, groupList, assignedConversations, isAdmin, showAdminMenu, setShowAdminMenu, showSidebar,
  onUserSelect, onGroupSelect, onPersonalNotes, onLogout,
  onShowCreateRoom, onShowJoinRoom, onShowAdminRooms, onShowCreateConversation, onShowManageConversations,
  onShowManageUsers, onShowSystemConfig, loadingAdminRooms, myActiveRooms, onRoomSelect, onKickUser,

      // Props del chat
      to, isGroup, currentRoomCode, roomUsers, messages, input, setInput,
  onSendMessage, onFileSelect, onRecordAudio, onStopRecording, isRecording,
  mediaFiles, mediaPreviews, onCancelMediaUpload, onRemoveMediaFile, onLeaveRoom, onToggleMenu,
  onEditMessage, hasMoreMessages, isLoadingMore, onLoadMoreMessages,
  onStartCall, onStartVideoCall, hasCamera, canSendMessages, adminViewConversation,

  // Props de modales
  showCreateRoomModal, setShowCreateRoomModal, roomForm, setRoomForm, onCreateRoom,
  showJoinRoomModal, setShowJoinRoomModal, joinRoomForm, setJoinRoomForm, onJoinRoom,
  showAdminRoomsModal, setShowAdminRoomsModal, adminRooms, onDeleteRoom, onDeactivateRoom, onEditRoom, onViewRoomUsers,

  // Props de notificaciones
  unreadMessages,

  // Props del socket
  soundsEnabled, onEnableSounds, socket, isTyping,

  // Props del usuario
  currentUsername,

  // Props de búsqueda
  highlightMessageId, onMessageHighlighted,

  // Props de respuesta a mensajes
  replyingTo, onCancelReply
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
    <div className="flex gap-0 w-full max-w-full m-0 h-screen rounded-none overflow-hidden shadow-none bg-white">

      {/* Botón hamburguesa flotante para mobile - solo visible cuando hay chat seleccionado y el sidebar está cerrado */}
      {!showSidebar && to && (
        <button
          onClick={onToggleMenu}
          className="hidden max-[768px]:flex fixed top-4 left-4 z-[101] w-12 h-12 items-center justify-center bg-[#13467A] text-white rounded-lg shadow-lg hover:bg-[#0f3660] transition-all duration-200 active:scale-95"
          title="Abrir menú"
        >
          <FaBars className="text-xl" />
        </button>
      )}

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
        onKickUser={onKickUser}
        to={to}
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
        />
      </div>

      {/* ChatContent - Desktop: siempre visible | Mobile: solo cuando hay chat seleccionado */}
      <div className={`flex-1 flex flex-col bg-white relative transition-all duration-300 ease-in-out max-[768px]:h-[calc(100vh-60px)] max-[600px]:h-screen ${!to ? 'max-[768px]:hidden' : ''}`}>
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
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
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
