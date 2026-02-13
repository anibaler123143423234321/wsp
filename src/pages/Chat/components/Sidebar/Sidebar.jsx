import { useState, useRef, useCallback, useEffect } from 'react';
import LeftSidebar from '../LeftSidebar/LeftSidebar';
import ConversationList from '../ConversationList/ConversationList';
import './Sidebar.css';

/**
 * Sidebar - Componente principal del sidebar
 */
const Sidebar = ({
  user,
  userList,
  assignedConversations = [],
  monitoringConversations = [],
  monitoringPage = 1,
  monitoringTotal = 0,
  monitoringTotalPages = 0,
  monitoringLoading = false,
  onLoadMonitoringConversations,
  isGroup,
  showAdminMenu,
  setShowAdminMenu,
  onUserSelect,
  onLogout,
  onShowCreateRoom,
  onShowJoinRoom,
  onShowAdminRooms,
  onShowCreateConversation,
  onShowManageConversations,
  userListHasMore,
  userListLoading,
  onLoadMoreUsers,
  unreadMessages,
  onToggleSidebar,
  myActiveRooms = [],
  currentRoomCode,
  onRoomSelect,
  to,
  sidebarCollapsed,
  onToggleCollapse,
  roomTypingUsers = {},
  favoriteRoomCodes = [],
  setFavoriteRoomCodes,
  lastFavoriteUpdate,
  showSidebar = false,
  assignedPage = 1,
  assignedTotal = 0,
  assignedTotalPages = 0,
  assignedLoading = false,
  onLoadAssignedConversations,
  roomsPage = 1,
  roomsTotal = 0,
  roomsTotalPages = 0,
  roomsLoading = false,
  onLoadUserRooms,
  roomsLimit = 50,
  onRoomsLimitChange,
  onGoToRoomsPage,
  soundsEnabled,
  onEnableSounds,
  favoriteRooms, // 🔥 NUEVO
  setFavoriteRooms, // 🔥 NUEVO
  pendingMentions = {}, // 🔥 NUEVO: Para detectar menciones pendientes
  pendingThreads = {} // 🔥 NUEVO: Para detectar hilos pendientes
}) => {

  // Estado para el ancho del sidebar
  const initialWidth = sidebarCollapsed ? 450 : 540;
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const maxWidth = useRef(initialWidth); // 🔥 Ancho máximo = ancho inicial

  // Modo compacto cuando el ancho es menor a 300px
  const isCompactMode = sidebarWidth <= 300;

  // Sincronizar sidebarWidth cuando cambia sidebarCollapsed
  useEffect(() => {
    if (isCompactMode) {
      // En modo compacto: ajustar según estado de colapso
      setSidebarWidth(sidebarCollapsed ? 170 : 260);
    } else {
      // Modo normal
      setSidebarWidth(sidebarCollapsed ? 450 : 540);
    }
  }, [sidebarCollapsed, isCompactMode]);

  // Refs para redimensionamiento
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, [sidebarWidth]);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const deltaX = e.clientX - startX.current;
    const newWidth = startWidth.current + deltaX;
    // 🔥 Usamos maxWidth.current como límite máximo en lugar de 800
    if (newWidth >= 170 && newWidth <= maxWidth.current) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);

  return (
    <>
      {/* Contenedor Principal */}
      <div
        className={`
          h-screen bg-white relative
          sidebar-responsive-container
          ${sidebarCollapsed ? 'collapsed' : ''} 
          ${isCompactMode ? 'compact-mode' : ''} 
          ${to ? 'max-[768px]:!hidden' : 'max-[768px]:w-full max-[768px]:flex'}
          ${!to ? 'flex flex-row' : 'flex flex-row'}
        `}
        style={{
          width: `${sidebarWidth}px`,
          minWidth: '170px',
          maxWidth: '800px',
          borderRight: '1.3px solid #EEEEEE'
        }}
      >
        {/* LeftSidebar - Siempre visible en desktop */}
        <div className={`
          max-[768px]:hidden h-full flex-shrink-0 overflow-visible
          ${sidebarCollapsed ? 'w-[90px]' : 'w-[220px]'}
          transition-all duration-300
        `}>
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
            onToggleSidebar={onToggleSidebar}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </div>

        {/* ConversationList - Ocupa el resto del espacio */}
        <div className="h-screen flex-1 min-w-0 overflow-hidden">
          <ConversationList
            user={user}
            soundsEnabled={soundsEnabled}
            onEnableSounds={onEnableSounds}
            userList={userList}
            assignedConversations={assignedConversations}
            monitoringConversations={monitoringConversations}
            monitoringPage={monitoringPage}
            monitoringTotal={monitoringTotal}
            monitoringTotalPages={monitoringTotalPages}
            monitoringLoading={monitoringLoading}
            onLoadMonitoringConversations={onLoadMonitoringConversations}
            myActiveRooms={myActiveRooms}
            currentRoomCode={currentRoomCode}
            isGroup={isGroup}
            onUserSelect={onUserSelect}
            onRoomSelect={onRoomSelect}
            favoriteRoomCodes={favoriteRoomCodes}
            favoriteRooms={favoriteRooms}
            setFavoriteRooms={setFavoriteRooms}
            setFavoriteRoomCodes={setFavoriteRoomCodes}
            lastFavoriteUpdate={lastFavoriteUpdate}
            unreadMessages={unreadMessages}
            onToggleSidebar={onToggleSidebar}
            userListHasMore={userListHasMore}
            userListLoading={userListLoading}
            onLoadMoreUsers={onLoadMoreUsers}
            roomTypingUsers={roomTypingUsers}
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
            isCompact={isCompactMode}
            to={to}
            pendingMentions={pendingMentions} // 🔥 NUEVO: Pasar menciones pendientes
            pendingThreads={pendingThreads} // 🔥 NUEVO: Pasar hilos pendientes
          />
        </div>

        {/* Barra de redimensionamiento */}
        <div
          className="sidebar-resize-handle max-[768px]:hidden"
          onMouseDown={startResizing}
        />
      </div>

      {/* LeftSidebar overlay para mobile */}
      <div className={`
        hidden max-[768px]:block fixed left-0 top-0 h-full z-[101] 
        transition-transform duration-300 ease-in-out 
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
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
          onToggleSidebar={onToggleSidebar}
          isCollapsed={false}
          onToggleCollapse={null}
        />
      </div>
    </>
  );
};

export default Sidebar;