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
          className="max-[1280px]:!pt-6 max-[1280px]:!px-4 max-[1280px]:!pb-6 max-[1024px]:!pt-4 max-[1024px]:!px-3 max-[1024px]:!pb-4 max-[768px]:flex max-[768px]:items-start max-[768px]:justify-between max-[768px]:!pt-4 max-[768px]:!px-4 max-[768px]:!pb-4"
          style={{
            paddingTop: '50px',
            paddingLeft: '41px',
            paddingRight: '41px',
            paddingBottom: '41.81px'
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
          <div
            className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[768px]:!text-sm"
            style={{
              fontSize: '13px',
              fontWeight: 400,
              lineHeight: '16px',
              letterSpacing: '0px',
              color: '#FFFFFF',
              flex: 1,
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {user?.nombre && user?.apellido
              ? `${user.nombre} ${user.apellido}`
              : user?.username || 'Usuario'}
          </div>
        </div>

        {/* Línea separadora */}
        <div 
          className="mx-[19.64px] mb-[15px] max-[768px]:mx-4 max-[768px]:mb-3"
          style={{
            borderTop: '1px solid #FFFFFF'
          }}
        ></div>

        {/* Botones de acción - Solo para ADMIN y JEFEPISO */}
        {(user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && (
          <div
            className="flex flex-col max-[1280px]:!px-3 max-[1280px]:!gap-1 max-[1024px]:!px-2 max-[1024px]:!gap-1 max-[768px]:!px-4"
            style={{
              paddingLeft: '27.08px',
              paddingRight: '27.08px',
              gap: '6.48px'
            }}
          >
            <button
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!h-9 max-[1280px]:!px-2 max-[1280px]:!gap-2 max-[1024px]:!h-8 max-[1024px]:!px-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-3 max-[768px]:!gap-3"
              onClick={onShowCreateRoom}
              title="Crear Sala"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaPlus
                className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!text-[18px] max-[768px]:!shrink-0"
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }}
              />
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Crear Sala
              </span>
            </button>

            <button
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!h-9 max-[1280px]:!px-2 max-[1280px]:!gap-2 max-[1024px]:!h-8 max-[1024px]:!px-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-3 max-[768px]:!gap-3"
              onClick={onShowJoinRoom}
              title="Unirse a sala"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaSignInAlt
                className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!text-[18px] max-[768px]:!shrink-0"
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }}
              />
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Unirse a sala
              </span>
            </button>

            <button
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!h-9 max-[1280px]:!px-2 max-[1280px]:!gap-2 max-[1024px]:!h-8 max-[1024px]:!px-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-3 max-[768px]:!gap-3"
              onClick={onShowAdminRooms}
              title="Mis salas"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaDoorOpen
                className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!text-[18px] max-[768px]:!shrink-0"
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }}
              />
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Mis salas
              </span>
            </button>

            <button
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!h-9 max-[1280px]:!px-2 max-[1280px]:!gap-2 max-[1024px]:!h-8 max-[1024px]:!px-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-3 max-[768px]:!gap-3"
              onClick={onShowCreateConversation}
              title="Asignar Chat"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaUserFriends
                className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!text-[18px] max-[768px]:!shrink-0"
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }}
              />
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Asignar Chat
              </span>
            </button>

            <button
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[1280px]:!h-9 max-[1280px]:!px-2 max-[1280px]:!gap-2 max-[1024px]:!h-8 max-[1024px]:!px-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-3 max-[768px]:!gap-3"
              onClick={onShowManageConversations}
              title="Gestionar Chats"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaClipboardList
                className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!text-[18px] max-[768px]:!shrink-0"
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }}
              />
              <span
                className="max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  color: 'rgba(255, 255, 255, 0.7)'
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

