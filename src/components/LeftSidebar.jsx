import { FaPlus, FaSignInAlt, FaDoorOpen, FaUserFriends, FaClipboardList, FaCog, FaSignOutAlt, FaTimes } from 'react-icons/fa';

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
    <div className="w-[233.22px] flex flex-col p-0 max-[768px]:w-full bg-[#13467A]">
      <div className="flex-1 flex flex-col">
        {/* Header con título "Chat corporativo" */}
        <div 
          className="max-[768px]:flex max-[768px]:items-start max-[768px]:justify-between"
          style={{
            paddingTop: '50px',
            paddingLeft: '41px',
            paddingRight: '41px',
            paddingBottom: '41.81px'
          }}
        >
          <h1 
            className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[768px]:text-xl"
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
              className="hidden max-[768px]:flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 active:scale-95"
              title="Cerrar menú"
            >
              <FaTimes className="text-white text-lg" />
            </button>
          )}
        </div>

        {/* Avatar y nombre de usuario */}
        <div 
          className="flex items-center max-[768px]:px-4 max-[768px]:py-3"
          style={{
            paddingLeft: '19.64px',
            paddingRight: '19.64px',
            paddingBottom: '15px',
            gap: '6.48px'
          }}
        >
          <div 
            className="rounded-full overflow-hidden flex-shrink-0 max-[768px]:w-10 max-[768px]:h-10"
            style={{
              width: '41.46px',
              height: '41.46px'
            }}
          >
            {user?.picture ? (
              <img src={user.picture} alt={user?.username || 'Usuario'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-bold max-[768px]:text-base" style={{ color: '#FFFFFF', fontSize: '16px' }}>
                {(user?.nombre?.[0] || user?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <div 
            className="font-['Inter',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] max-[768px]:text-sm"
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
            className="flex flex-col max-[768px]:px-4"
            style={{
              paddingLeft: '27.08px',
              paddingRight: '27.08px',
              gap: '6.48px'
            }}
          >
            <button 
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-[13px] max-[768px]:min-h-[44px]" 
              onClick={onShowCreateRoom} 
              title="Crear Sala Temporal"
              style={{
                width: '180.35px',
                height: '38.87px',
                borderRadius: '7.77px',
                padding: '6.48px',
                gap: '6.48px'
              }}
            >
              <FaPlus 
                className="max-[768px]:text-[16px] max-[768px]:shrink-0" 
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }} 
              />
              <span 
                className="max-[768px]:truncate" 
                style={{
                  width: '135px',
                  height: '17px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Crear Sala Temporal
              </span>
            </button>

            <button 
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-[13px] max-[768px]:min-h-[44px]" 
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
                className="max-[768px]:text-[16px] max-[768px]:shrink-0" 
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }} 
              />
              <span 
                className="max-[768px]:truncate" 
                style={{
                  width: '135px',
                  height: '17px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Unirse a sala
              </span>
            </button>

            <button 
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-[13px] max-[768px]:min-h-[44px]" 
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
                className="max-[768px]:text-[16px] max-[768px]:shrink-0" 
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }} 
              />
              <span 
                className="max-[768px]:truncate" 
                style={{
                  width: '135px',
                  height: '17px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Mis salas
              </span>
            </button>

            <button 
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-[13px] max-[768px]:min-h-[44px]" 
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
                className="max-[768px]:text-[16px] max-[768px]:shrink-0" 
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }} 
              />
              <span 
                className="max-[768px]:truncate" 
                style={{
                  width: '135px',
                  height: '17px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}
              >
                Asignar Chat
              </span>
            </button>

            <button 
              className="bg-transparent border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/5 max-[768px]:px-4 max-[768px]:py-3 max-[768px]:text-[13px] max-[768px]:min-h-[44px]" 
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
                className="max-[768px]:text-[16px] max-[768px]:shrink-0" 
                style={{
                  width: '25.91px',
                  height: '25.91px',
                  color: '#FFFFFF'
                }} 
              />
              <span 
                className="max-[768px]:truncate" 
                style={{
                  width: '135px',
                  height: '17px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '16.84px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textAlign: 'center',
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
        className="flex flex-col max-[768px]:px-4 max-[768px]:pb-4 max-[768px]:border-t max-[768px]:border-white/10"
        style={{
          paddingLeft: '20px',
          paddingRight: '7.77px',
          paddingBottom: '24px',
          paddingTop: '24px',
          gap: '6.48px'
        }}
      >
        <button
          className="bg-transparent border-none text-white flex items-center justify-start cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[768px]:py-3 max-[768px]:min-h-[44px]"
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
            className="max-[768px]:text-xl"
            style={{
              fontSize: '26px',
              color: 'white'
            }}
          />
        </button>
        <button
          className="bg-transparent border-none text-white flex items-center justify-start cursor-pointer transition-all duration-200 hover:bg-white/5 rounded-lg max-[768px]:py-3 max-[768px]:min-h-[44px]"
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            width: '48px',
            height: '48px',
            padding: 0,
            color: 'white'
          }}
        >
          <FaSignOutAlt
            className="max-[768px]:text-xl"
            style={{
              fontSize: '26px',
              color: 'white'
            }}
          />
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;

