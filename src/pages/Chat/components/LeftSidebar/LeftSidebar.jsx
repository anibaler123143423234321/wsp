import { FaPlus, FaSignInAlt, FaDoorOpen, FaUserFriends, FaClipboardList, FaTimes, FaSun, FaCog, FaSignOutAlt } from 'react-icons/fa';
import menuBackground from '../../../../assets/menu.png';
import './LeftSidebar.css';

const LeftSidebar = ({
  user,
  onShowCreateRoom,
  onShowJoinRoom,
  onShowAdminRooms,
  onShowCreateConversation,
  onShowManageConversations,
  showAdminMenu,
  setShowAdminMenu,
  onLogout,
  onToggleSidebar,
  isCollapsed,
  onToggleCollapse
}) => {
  return (
    <div
      className={`left-sidebar-container group flex flex-col p-0 flex-shrink-0 left-sidebar-responsive h-full ${isCollapsed ? 'collapsed' : ''} relative`}
      style={{
        backgroundImage: `url(${menuBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Botón circular de toggle en el borde derecho - aparece con hover en todo el sidebar */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn flex items-center justify-center bg-[#075E54] hover:bg-[#128C7E] rounded-full transition-all duration-300 active:scale-95 max-[768px]:hidden opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl"
          role="button"
          tabIndex="0"
          aria-label={isCollapsed ? "Expandir" : "Colapsar"}
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          style={{
            width: '28px',
            height: '28px',
            position: 'absolute',
            right: '-14px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 200,
            border: '2px solid white'
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 text-white transition-transform duration-300"
            style={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
            }}
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Área de cierre táctil para mobile - invisible pero funcional */}
      {onToggleSidebar && (
        <div
          className="hidden max-[768px]:block absolute top-0 right-0 w-16 h-16 z-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSidebar();
          }}
          style={{ touchAction: 'manipulation' }}
        />
      )}


      {/* Contenedor con flex-1 para empujar el footer hacia abajo */}
      <div className="flex-1 flex flex-col overflow-y-auto max-[768px]:flex-1">
        {/* Avatar y nombre de usuario */}
        <div
          className="flex items-center max-[1280px]:flex-col max-[1280px]:items-center max-[1280px]:text-center max-[1280px]:!px-3 max-[1280px]:!py-2 max-[1024px]:!px-2 max-[1024px]:!py-2 max-[768px]:!px-4 max-[768px]:!py-3"
          style={{
            paddingLeft: '19.64px',
            paddingRight: '19.64px',
            paddingTop: '18px',
            paddingBottom: '12px',
            gap: '6.48px'
          }}
        >
          <div
            className="rounded-full overflow-hidden flex-shrink-0 max-[1280px]:w-10 max-[1280px]:h-10 max-[1024px]:w-7 max-[1024px]:h-7 max-[768px]:!w-10 max-[768px]:!h-10"
            style={{
              width: '41.46px',
              height: '41.46px'
            }}
          >
            {user?.picture ? (
              <img src={user.picture} alt={user?.username || 'Usuario'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-bold max-[1280px]:text-xs max-[1024px]:text-[10px] max-[768px]:!text-base" style={{ color: '#FFFFFF', fontSize: '16px' }}>
                {(user?.nombre?.[0] || user?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <div className={`flex flex-col flex-1 gap-1 min-w-0 overflow-hidden max-[1280px]:w-full max-[1280px]:gap-0.5 ${isCollapsed ? 'hidden' : ''}`}>
            <div
              className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:!text-[10px] max-[1024px]:!text-[11px] max-[768px]:!text-sm truncate max-[1280px]:break-words max-[1280px]:overflow-visible"
              style={{
                fontSize: '13px',
                fontWeight: 400,
                lineHeight: '16px',
                letterSpacing: '0px',
                color: '#FFFFFF'
              }}
            >
              {user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username || 'Usuario'}
            </div>
            <div
              className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:hidden max-[1024px]:!text-[9px] max-[768px]:!text-xs truncate"
              style={{
                fontSize: '11px',
                fontWeight: 300,
                lineHeight: '14px',
                letterSpacing: '0px',
                color: '#B8D4F1'
              }}
            >
              {user?.role && user?.numeroAgente ? (
                <>Rol: {user.role} • N° Agente: {user.numeroAgente}</>
              ) : user?.numeroAgente ? (
                <>N° Agente: {user.numeroAgente}</>
              ) : (
                <>Rol: {user?.role || 'Sin rol'}</>
              )}
            </div>
          </div>
        </div>

        {/* Línea separadora */}
        <div
          style={{
            border: '1.3px solid #FFFFFF',
            width: 'calc(100% - 40px)',
            height: '0px',
            marginLeft: '20px',
            marginRight: '20px',
            marginBottom: '16px'
          }}
        ></div>

        {/* Botón Unirse a Sala - VISIBLE PARA TODOS */}
        <div
          className="flex flex-col items-center left-sidebar-button-container max-[1280px]:!px-3 max-[1280px]:!gap-2 max-[1024px]:!px-2 max-[1024px]:!gap-1.5 max-[768px]:!px-4 max-[768px]:!gap-2"
          style={{
            paddingLeft: 'clamp(12px, 5%, 27.08px)',
            paddingRight: 'clamp(12px, 5%, 27.08px)',
            paddingTop: '4px',
            gap: '10px'
          }}
        >
          <button
            className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg"
            onClick={onShowJoinRoom}
            title="Unirse a sala"
            style={{
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <FaSignInAlt
              className="left-sidebar-icon text-white max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
            />
            <span
              className="left-sidebar-text text-white"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                lineHeight: '100%'
              }}
            >
              Unirse a sala
            </span>
          </button>
        </div>

        {/* Botones de acción - Para roles administrativos */}
        {['ADMIN', 'JEFEPISO', 'SUPERADMIN', 'PROGRAMADOR'].includes(user?.role) && (
          <div
            className="flex flex-col items-center left-sidebar-button-container max-[1280px]:!px-3 max-[1280px]:!gap-2 max-[1024px]:!px-2 max-[1024px]:!gap-1.5 max-[768px]:!px-4 max-[768px]:!gap-2"
            style={{
              paddingLeft: 'clamp(12px, 5%, 27.08px)',
              paddingRight: 'clamp(12px, 5%, 27.08px)',
              paddingTop: '4px',
              gap: '10px'
            }}
          >
            {/* Botón Crear Sala */}
            <button
              className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg"
              onClick={onShowCreateRoom}
              title="Crear Sala"
              style={{
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <FaPlus
                className="text-white"
              />
              <span
                className="left-sidebar-text text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  lineHeight: '100%'
                }}
              >
                Crear Sala
              </span>
            </button>

            {/* Botón Mis Salas */}
            <button
              className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg"
              onClick={onShowAdminRooms}
              title="Mis salas"
              style={{
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <FaDoorOpen
                className="text-white"
              />
              <span
                className="left-sidebar-text text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  lineHeight: '100%'
                }}
              >
                Mis salas
              </span>
            </button>

            {/* Botón Asignar Chat */}
            <button
              className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg"
              onClick={onShowCreateConversation}
              title="Asignar Chat"
              style={{
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <FaUserFriends
                className="text-white"
              />
              <span
                className="left-sidebar-text text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  lineHeight: '100%'
                }}
              >
                Asignar Chat
              </span>
            </button>

            {/* Botón Gestionar Chats */}
            <button
              className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg"
              onClick={onShowManageConversations}
              title="Gestionar Chats"
              style={{
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <FaClipboardList
                className="text-white"
              />
              <span
                className="left-sidebar-text text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  lineHeight: '100%'
                }}
              >
                Gestionar Chats
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer con iconos */}
      <div
        className="flex flex-col left-sidebar-button-container"
        style={{
          paddingLeft: 'clamp(12px, 5%, 27.08px)',
          paddingRight: 'clamp(12px, 5%, 27.08px)',
          paddingBottom: '24px',
          paddingTop: '24px',
          gap: '4px'
        }}
      >
        {/* Botón de cambio de tema */}
        <button
          className="left-sidebar-button group bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg"
          onClick={() => {
            const isDark = document.documentElement.classList.contains('dark');
            document.documentElement.classList.toggle('dark', !isDark);
            localStorage.setItem('theme', !isDark ? 'dark' : 'light');
          }}
          title="Modo Oscuro"
        >
          <FaSun className="left-sidebar-icon text-white" />
          <span className="left-sidebar-text text-white">Modo Oscuro</span>
        </button>
        {/* Botón de configuración */}
        <button
          className="left-sidebar-button group bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg"
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          title="Configuración"
        >
          <FaCog className="left-sidebar-icon text-white" />
          <span className="left-sidebar-text text-white">Configuración</span>
        </button>
        {/* Botón de cerrar sesión */}
        <button
          className="left-sidebar-button group bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg"
          onClick={onLogout}
          title="Cerrar sesión"
        >
          <FaSignOutAlt className="left-sidebar-icon text-white" />
          <span className="left-sidebar-text text-white">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;

