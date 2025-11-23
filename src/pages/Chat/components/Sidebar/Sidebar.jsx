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
  roomsLimit = 10,
  onRoomsLimitChange,
  onGoToRoomsPage
}) => {
  return (
    <>
      {/* Contenedor Principal (Desktop & Mobile Container) */}
      <div
        className={`flex flex-row h-screen overflow-hidden bg-white sidebar-responsive-container ${sidebarCollapsed ? 'collapsed' : ''} ${
          // En móvil, si hay chat seleccionado ('to' existe), ocultamos todo el sidebar container
          to ? 'max-[768px]:hidden' : 'max-[768px]:w-full max-[768px]:flex'
          }`}
        style={{
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
        {/* 🔥 AL TENER SOLO UNA INSTANCIA AQUÍ, ELIMINAMOS LAS LLAMADAS DUPLICADAS */}
        <div className="flex-1 h-full min-w-0">
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
          />
        </div>
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