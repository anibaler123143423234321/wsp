import { useState, useRef, useCallback, useEffect } from 'react';
import LeftSidebar from '../LeftSidebar/LeftSidebar';
import ConversationList from '../ConversationList/ConversationList';
import './Sidebar.css';

/**
 * Sidebar - Componente principal del sidebar
 * Unificado para evitar duplicidad de renderizado y llamadas a API.
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
  onGoToRoomsPage
}) => {

  // Estado y refs para el redimensionamiento
  const [sidebarWidth, setSidebarWidth] = useState(sidebarCollapsed ? 450 : 540);

  // Sincronizar sidebarWidth cuando cambia sidebarCollapsed
  useEffect(() => {
    if (sidebarCollapsed) {
      setSidebarWidth(450); // LeftSidebar colapsado (90px) + ConversationList (360px)
    } else {
      setSidebarWidth(540); // LeftSidebar expandido (180px) + ConversationList (360px)
    }
  }, [sidebarCollapsed]);

  // Forzar ancho fijo en modo compacto
  useEffect(() => {
    if (sidebarWidth <= 300 && sidebarWidth !== 130) {
      setSidebarWidth(130); // LeftSidebar (50px) + ConversationList (80px)
    }
  }, [sidebarWidth]);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Iniciar el redimensionamiento
  const startResizing = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, [sidebarWidth]);

  // Manejar el movimiento del mouse
  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const deltaX = e.clientX - startX.current;
    const newWidth = startWidth.current + deltaX;
    // Aplicar límites: mínimo 340px, máximo 800px
    if (newWidth >= 200 && newWidth <= 800) {
      setSidebarWidth(newWidth);
    }
  }, []);

  // Detener el redimensionamiento
  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);

  return (
    <>
      {/* Contenedor Principal (Desktop & Mobile Container) */}
      <div
        className={`flex flex-row h-screen overflow-hidden bg-white sidebar-responsive-container ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarWidth <= 300 ? 'compact-mode' : ''} ${to ? 'max-[768px]:hidden' : 'max-[768px]:w-full max-[768px]:flex'
          }`}
        style={{
          width: `${sidebarWidth}px`,  /* <- Volver a usar sidebarWidth siempre */
          minWidth: '130px',  /* <- Mínimo absoluto */
          maxWidth: '800px',
          position: 'relative',
          transition: 'none',
          borderRight: '1.3px solid #EEEEEE'
        }}
      >
        {/* Sidebar izquierdo - Menú azul (Visible en Desktop, Oculto en Mobile) */}
        <div className="max-[768px]:hidden h-full">
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

        {/* Lista de conversaciones - (Visible siempre que el contenedor padre lo esté) */}
        <div className={`h-full min-w-0 ${sidebarWidth <= 300 ? '' : 'flex-1'}`}>
          <ConversationList
            user={user}
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
            isCompact={sidebarWidth <= 300}
          />
        </div>

        {/* Barra de redimensionamiento */}
        <div
          className="sidebar-resize-handle max-[768px]:hidden"
          onMouseDown={startResizing}
        />
      </div>

      {/* LeftSidebar overlay para mobile (Solo visible cuando se abre el menú en mobile) */}
      <div className={`hidden max-[768px]:block fixed left-0 top-0 h-full z-[101] transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
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