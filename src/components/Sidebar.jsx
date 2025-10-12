import LeftSidebar from './LeftSidebar';
import ConversationList from './ConversationList';

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
  unreadMessages,
  onToggleSidebar,
  myActiveRooms = [],
  currentRoomCode,
  onRoomSelect
}) => {
  return (
    <div className="w-[669.85px] min-w-[669.85px] max-w-[669.85px] flex flex-row h-screen overflow-hidden max-[1024px]:w-[550px] max-[1024px]:min-w-[550px] max-[1024px]:max-w-[550px] max-[768px]:fixed max-[768px]:left-0 max-[768px]:top-0 max-[768px]:h-screen max-[768px]:z-[100] max-[768px]:w-[320px] max-[768px]:min-w-[320px] max-[768px]:max-w-[320px] max-[768px]:transition-transform max-[768px]:duration-300 max-[768px]:ease-in-out max-[768px]:shadow-[2px_0_15px_rgba(0,0,0,0.3)] bg-white">
      
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
      />

      {/* Lista de conversaciones - Columna derecha (436.63px) */}
      <ConversationList
        user={user}
        userList={userList}
        assignedConversations={assignedConversations}
        myActiveRooms={myActiveRooms}
        currentRoomCode={currentRoomCode}
        isGroup={isGroup}
        onUserSelect={onUserSelect}
        onRoomSelect={onRoomSelect}
        unreadMessages={unreadMessages}
      />
    </div>
  );
};

export default Sidebar;

