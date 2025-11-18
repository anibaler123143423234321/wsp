import LeftSidebar from './LeftSidebar';
import ConversationList from './ConversationList';
import './Sidebar.css';

/**
 * Sidebar - Componente principal del sidebar
 * 
 * Estructura simplificada y modular:
 * - LeftSidebar: Menú azul izquierdo (233.22px)
 *   - Chat corporativo (título)
 *   - Avatar y nombre de usuario
 *   - Botones de módulos (solo para ADMIN/JEFEPISO)
 *   - Footer (Configuración y Cerrar sesión)
 * 
 * - ConversationList: Lista de conversaciones derecha (436.63px)
 *   - Pestañas (Conversaciones, Salas Activas, Chats Asignados)
 *   - Barra de búsqueda
 *   - Lista de conversaciones/salas/chats asignados
 * 
 * Total width: 669.85px (233.22px + 436.63px)
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
  // 🔥 NUEVOS PROPS para paginación real
  assignedPage = 1,
  assignedTotal = 0,
  assignedTotalPages = 0,
  assignedLoading = false,
  onLoadAssignedConversations,
  roomsPage = 1,
  roomsTotal = 0,
  roomsTotalPages = 0,
  roomsLoading = false,
  onLoadUserRooms
}) => {
  return (
    <>
      {/* Desktop: Ambos sidebars juntos */}
      <div
        className={`flex flex-row h-screen overflow-hidden max-[768px]:hidden bg-white sidebar-responsive-container ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          borderRight: '1.3px solid #EEEEEE'
        }}
      >

        {/* Sidebar izquierdo - Menú azul (233.22px) */}
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

        {/* Lista de conversaciones - Columna derecha (436.63px) */}
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
        />
      </div>

      {/* Mobile: Solo ConversationList (LeftSidebar se muestra como overlay desde ChatLayout) */}
      {/* Se oculta cuando hay un chat seleccionado (to existe) */}
      {!to && (
        <div className="hidden max-[768px]:block w-full h-screen bg-white">
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
          />
        </div>
      )}
    </>
  );
};

export default Sidebar;

