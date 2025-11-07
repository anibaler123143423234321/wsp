import { FaPlus, FaSignInAlt, FaDoorOpen, FaUserFriends, FaClipboardList, FaCog, FaTimes } from 'react-icons/fa';
import logoutIcon from '../assets/mbrilogout_99583.svg';

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
  onToggleSidebar
}) => {
  return (
    <div className="w-[233.22px] flex flex-col p-0 max-[1280px]:w-[180px] max-[1024px]:w-[160px] max-[768px]:w-full max-[768px]:h-screen bg-[#13467A]">
      <div className="flex-1 flex flex-col max-[768px]:h-full">
        {/* Header con título "Chat corporativo" */}
        <div
          className="max-[1280px]:!pt-4 max-[1280px]:!px-4 max-[1280px]:!pb-4 max-[1024px]:!pt-3 max-[1024px]:!px-3 max-[1024px]:!pb-3 max-[768px]:flex max-[768px]:items-start max-[768px]:justify-between max-[768px]:!pt-4 max-[768px]:!px-4 max-[768px]:!pb-4"
          style={{
            paddingTop: '30px',
            paddingLeft: '41px',
            paddingRight: '41px',
            paddingBottom: '30px'
          }}
        >
          <h1
            className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:!text-lg max-[1280px]:!leading-tight max-[1280px]:!w-auto max-[1280px]:!h-auto max-[1024px]:!text-base max-[768px]:!text-lg max-[768px]:!leading-tight"
            style={{
              width: '139px',
              height: '42px',
              fontSize: '24px',
              fontWeight: 800,
              lineHeight: '28px',
              letterSpacing: '0px',
              color: '#FFFFFF'
            }}
          >
            Chat<br/>corporativo
          </h1>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden max-[768px]:flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 active:scale-95"
              title="Cerrar menú"
            >
              <FaTimes className="text-white text-base" />
            </button>
          )}
        </div>

        {/* Avatar y nombre de usuario */}
        <div
          className="flex items-center max-[1280px]:!px-3 max-[1280px]:!py-2 max-[1024px]:!px-2 max-[1024px]:!py-2 max-[768px]:!px-4 max-[768px]:!py-3"
          style={{
            paddingLeft: '19.64px',
            paddingRight: '19.64px',
            paddingTop: '8px',
            paddingBottom: '12px',
            gap: '6.48px'
          }}
        >
          <div
            className="rounded-full overflow-hidden flex-shrink-0 max-[1280px]:w-8 max-[1280px]:h-8 max-[1024px]:w-7 max-[1024px]:h-7 max-[768px]:!w-10 max-[768px]:!h-10"
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
          <div className="flex flex-col flex-1 gap-1">
            <div
              className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[768px]:!text-sm"
              style={{
                fontSize: '13px',
                fontWeight: 400,
                lineHeight: '16px',
                letterSpacing: '0px',
                color: '#FFFFFF',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username || 'Usuario'}
            </div>
            <div
              className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:!text-[10px] max-[1024px]:!text-[9px] max-[768px]:!text-xs"
              style={{
                fontSize: '11px',
                fontWeight: 300,
                lineHeight: '14px',
                letterSpacing: '0px',
                color: '#B8D4F1',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
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
          className="mx-[19.64px] mb-[20px] max-[768px]:mx-4 max-[768px]:mb-4"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: '24px'
          }}
        ></div>

        {/* Botón Unirse a Sala - VISIBLE PARA TODOS */}
        <div
          className="flex flex-col max-[1280px]:!px-3 max-[1280px]:!gap-2 max-[1024px]:!px-2 max-[1024px]:!gap-1.5 max-[768px]:!px-4 max-[768px]:!gap-2"
          style={{
            paddingLeft: '27.08px',
            paddingRight: '27.08px',
            paddingTop: '4px',
            gap: '10px'
          }}
        >
          <button
            className="group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
            onClick={onShowJoinRoom}
            title="Unirse a sala"
            style={{
              width: '180.35px',
              height: '42px',
              borderRadius: '10px',
              padding: '10px 12px',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center justify-center w-7 h-7 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-200">
              <FaSignInAlt
                className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#FFFFFF'
                }}
              />
            </div>
            <span
              className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '100%',
                color: '#FFFFFF'
              }}
            >
              Unirse a sala
            </span>
          </button>
        </div>

        {/* Botones de acción - Solo para ADMIN y JEFEPISO */}
        {(user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && (
          <div
            className="flex flex-col max-[1280px]:!px-3 max-[1280px]:!gap-2 max-[1024px]:!px-2 max-[1024px]:!gap-1.5 max-[768px]:!px-4 max-[768px]:!gap-2"
            style={{
              paddingLeft: '27.08px',
              paddingRight: '27.08px',
              paddingTop: '4px',
              gap: '10px'
            }}
          >
            {/* Botón Crear Sala */}
            <button
              className="group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
              onClick={onShowCreateRoom}
              title="Crear Sala"
              style={{
                width: '180.35px',
                height: '42px',
                borderRadius: '10px',
                padding: '10px 12px',
                gap: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center justify-center w-7 h-7 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-200">
                <FaPlus
                  className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                  style={{
                    width: '16px',
                    height: '16px',
                    color: '#FFFFFF'
                  }}
                />
              </div>
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  color: '#FFFFFF'
                }}
              >
                Crear Sala
              </span>
            </button>

            {/* Botón Mis Salas */}
            <button
              className="group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
              onClick={onShowAdminRooms}
              title="Mis salas"
              style={{
                width: '180.35px',
                height: '42px',
                borderRadius: '10px',
                padding: '10px 12px',
                gap: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center justify-center w-7 h-7 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-200">
                <FaDoorOpen
                  className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                  style={{
                    width: '16px',
                    height: '16px',
                    color: '#FFFFFF'
                  }}
                />
              </div>
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  color: '#FFFFFF'
                }}
              >
                Mis salas
              </span>
            </button>

            {/* Botón Asignar Chat */}
            <button
              className="group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
              onClick={onShowCreateConversation}
              title="Asignar Chat"
              style={{
                width: '180.35px',
                height: '42px',
                borderRadius: '10px',
                padding: '10px 12px',
                gap: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center justify-center w-7 h-7 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-200">
                <FaUserFriends
                  className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                  style={{
                    width: '16px',
                    height: '16px',
                    color: '#FFFFFF'
                  }}
                />
              </div>
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  color: '#FFFFFF'
                }}
              >
                Asignar Chat
              </span>
            </button>

            {/* Botón Gestionar Chats */}
            <button
              className="group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
              onClick={onShowManageConversations}
              title="Gestionar Chats"
              style={{
                width: '180.35px',
                height: '42px',
                borderRadius: '10px',
                padding: '10px 12px',
                gap: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex items-center justify-center w-7 h-7 bg-white/10 rounded-lg group-hover:bg-white/20 transition-all duration-200">
                <FaClipboardList
                  className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                  style={{
                    width: '16px',
                    height: '16px',
                    color: '#FFFFFF'
                  }}
                />
              </div>
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '100%',
                  color: '#FFFFFF'
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
        className="flex flex-col max-[1280px]:!px-3 max-[1280px]:!py-3 max-[1280px]:!gap-1 max-[1024px]:!px-2 max-[1024px]:!py-2 max-[1024px]:!gap-1 max-[768px]:!px-4 max-[768px]:!pb-safe max-[768px]:!pt-3 max-[768px]:!border-t max-[768px]:!border-white/10 max-[768px]:!gap-2"
        style={{
          paddingLeft: '20px',
          paddingRight: '7.77px',
          paddingBottom: '24px',
          paddingTop: '24px',
          gap: '6.48px'
        }}
      >
        <button
          className="bg-transparent border-none text-white flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!w-9 max-[1280px]:!h-9 max-[1024px]:!w-8 max-[1024px]:!h-8 max-[768px]:!w-full max-[768px]:!h-12 max-[768px]:!justify-start max-[768px]:!px-3 max-[768px]:!gap-3"
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          title="Configuración"
          style={{
            width: '48px',
            height: '48px',
            padding: 0,
            color: 'white'
          }}
        >
          <FaCog
            className="max-[1280px]:!text-base max-[1024px]:!text-sm max-[768px]:!text-lg"
            style={{
              fontSize: '26px',
              color: 'white'
            }}
          />
          <span className="hidden max-[768px]:inline text-sm font-medium">Configuración</span>
        </button>
        <button
          className="bg-transparent border-none text-white flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!w-9 max-[1280px]:!h-9 max-[1024px]:!w-8 max-[1024px]:!h-8 max-[768px]:!w-full max-[768px]:!h-12 max-[768px]:!justify-start max-[768px]:!px-3 max-[768px]:!gap-3"
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            width: '48px',
            height: '48px',
            padding: 0,
            paddingLeft: '0px'
          }}
        >
          <img
            src={logoutIcon}
            alt="Cerrar sesión"
            className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!w-[18px] max-[768px]:!h-[18px]"
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)' // Hace el SVG blanco
            }}
          />
          <span className="hidden max-[768px]:inline text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;

