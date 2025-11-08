import { FaPlus, FaSignInAlt, FaDoorOpen, FaUserFriends, FaClipboardList, FaTimes } from 'react-icons/fa';
import logoutIcon from '../assets/mbrilogout_99583.svg';
import menuBackground from '../assets/menu.png';
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
  onToggleSidebar
}) => {
  return (
    <div
      className="w-[233.22px] flex flex-col p-0 max-[1400px]:w-[200px] max-[1280px]:w-[180px] max-[1024px]:w-[160px] max-[768px]:w-full max-[768px]:h-screen"
      style={{
        backgroundImage: `url(${menuBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
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

      {/* Contenedor con flex-1 para empujar el footer hacia abajo */}
      <div className="flex-1 flex flex-col overflow-y-auto max-[768px]:flex-1">
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
          style={{
            width: '208.6px',
            height: '0px',
            border: '1.3px solid #FFFFFF',
            marginLeft: '11.66px',
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
            className="left-sidebar-button group bg-white/5 border-none flex items-center cursor-pointer transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-lg max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!gap-2.5 max-[1024px]:!h-9 max-[1024px]:!px-2 max-[1024px]:!gap-2 max-[768px]:!w-full max-[768px]:!justify-start max-[768px]:!h-12 max-[768px]:!px-4 max-[768px]:!gap-3"
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
            <FaSignInAlt
              className="left-sidebar-icon text-white max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
              style={{
                width: '16px',
                height: '16px'
              }}
            />
            <span
              className="left-sidebar-text text-white max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!hidden max-[768px]:!inline max-[768px]:!text-sm max-[768px]:!flex-1 max-[768px]:!text-left max-[768px]:!font-medium"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '100%'
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
              <FaPlus
                className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#FFFFFF'
                }}
              />
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
              <FaDoorOpen
                className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#FFFFFF'
                }}
              />
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
              <FaUserFriends
                className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#FFFFFF'
                }}
              />
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
              <FaClipboardList
                className="max-[1280px]:!w-3.5 max-[1280px]:!h-3.5 max-[1024px]:!w-3 max-[1024px]:!h-3 max-[768px]:!text-base max-[768px]:!shrink-0"
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#FFFFFF'
                }}
              />
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
          <svg
            width="22"
            height="24"
            viewBox="0 0 22 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="max-[1280px]:!w-4 max-[1280px]:!h-4 max-[1024px]:!w-3.5 max-[1024px]:!h-3.5 max-[768px]:!w-[18px] max-[768px]:!h-[18px]"
            style={{
              width: '26px',
              height: '26px',
              filter: 'brightness(0) invert(1)'
            }}
          >
            <path d="M10.7514 23.3217C10.4572 23.3217 10.1657 23.3114 9.88586 23.2893C9.27011 23.2325 8.69235 22.9666 8.24854 22.536C7.80474 22.1054 7.5216 21.5359 7.44615 20.9222L7.35416 20.286C7.30938 20.0872 7.21966 19.9012 7.09187 19.7424C6.96407 19.5837 6.80161 19.4562 6.61693 19.37C6.45627 19.2832 6.2969 19.1912 6.14402 19.0953C5.90796 18.9417 5.63393 18.8565 5.35237 18.8491C5.22568 18.8477 5.09989 18.8706 4.98182 18.9165L4.38322 19.1549C4.0409 19.2906 3.67606 19.3605 3.30783 19.3609C2.87744 19.368 2.45199 19.2685 2.06945 19.0711C1.68692 18.8737 1.35921 18.5847 1.11559 18.2298C0.789295 17.7502 0.499132 17.247 0.247503 16.7243C-0.0107753 16.1627 -0.0689685 15.5297 0.082607 14.9304C0.234183 14.3312 0.586386 13.8019 1.08061 13.4307L1.58721 13.0291C1.73729 12.8916 1.85379 12.7216 1.9277 12.532C2.00161 12.3424 2.03096 12.1383 2.01348 11.9355C2.01348 11.8539 2.01348 11.7632 2.01348 11.6609C2.01348 11.5585 2.01348 11.4678 2.01348 11.3862C2.03096 11.1834 2.00161 10.9794 1.9277 10.7898C1.85379 10.6002 1.73729 10.4301 1.58721 10.2927L1.08061 9.89101C0.586579 9.51964 0.234525 8.99039 0.0829646 8.39122C-0.0685956 7.79205 -0.0105323 7.15906 0.247503 6.59746C0.498915 6.07467 0.789087 5.57141 1.11559 5.09191C1.35921 4.73704 1.68692 4.44801 2.06945 4.25064C2.45199 4.05327 2.87744 3.95369 3.30783 3.96081C3.67606 3.96125 4.0409 4.03114 4.38322 4.16682L4.98182 4.40522C5.09989 4.45115 5.22568 4.47402 5.35237 4.47259C5.63393 4.46528 5.90796 4.38007 6.14402 4.22642C6.2969 4.13054 6.45627 4.03725 6.61693 3.95174C6.80172 3.86565 6.96428 3.7383 7.0921 3.57948C7.21991 3.42067 7.30957 3.23464 7.35416 3.03571L7.44615 2.40084C7.5215 1.7868 7.80455 1.21699 8.24832 0.78595C8.69208 0.35491 9.26989 0.0885603 9.88586 0.0310957C10.1709 0.0103652 10.4611 0 10.7514 0C11.0416 0 11.3331 0.0103652 11.6181 0.0310957C12.2339 0.0883227 12.8115 0.354458 13.255 0.7853C13.6986 1.21614 13.9814 1.78576 14.0566 2.39955L14.1499 3.03442C14.1938 3.2334 14.2831 3.41957 14.4108 3.57844C14.5384 3.73731 14.7009 3.86461 14.8858 3.95044C15.04 4.03207 15.1954 4.12277 15.36 4.22512C15.596 4.37877 15.8701 4.46398 16.1516 4.4713C16.2788 4.4728 16.405 4.44993 16.5235 4.40392L17.1208 4.16552C17.4631 4.02994 17.828 3.96005 18.1962 3.95951C18.6265 3.95251 19.052 4.05214 19.4345 4.2495C19.817 4.44686 20.1447 4.73582 20.3884 5.09062C20.7158 5.57003 21.0068 6.07329 21.2591 6.59617C21.5171 7.15776 21.5752 7.79076 21.4236 8.38993C21.2721 8.98909 20.92 9.51835 20.426 9.88971L19.9181 10.2914C19.7681 10.4288 19.6517 10.5989 19.578 10.7886C19.5043 10.9782 19.4753 11.1822 19.4931 11.3849C19.4931 11.4756 19.4931 11.5676 19.4931 11.6596C19.4931 11.7516 19.4931 11.8436 19.4931 11.9343C19.4753 12.1369 19.5043 12.341 19.578 12.5306C19.6517 12.7202 19.7681 12.8903 19.9181 13.0278L20.426 13.4294C20.9202 13.8006 21.2724 14.3299 21.424 14.9291C21.5756 15.5284 21.5174 16.1614 21.2591 16.723C21.0066 17.2457 20.7156 17.749 20.3884 18.2285C20.1447 18.5833 19.817 18.8723 19.4345 19.0696C19.052 19.267 18.6265 19.3666 18.1962 19.3596C17.828 19.3591 17.4631 19.2892 17.1208 19.1536L16.5235 18.9152C16.405 18.8692 16.2788 18.8463 16.1516 18.8479C15.8701 18.8552 15.596 18.9404 15.36 19.094C15.1941 19.1977 15.04 19.2871 14.8858 19.3687C14.7011 19.4548 14.5387 19.5822 14.4111 19.741C14.2835 19.8998 14.1941 20.0859 14.1499 20.2847L14.0566 20.9209C13.9816 21.5346 13.6988 22.1042 13.2552 22.5349C12.8115 22.9655 12.2338 23.2313 11.6181 23.2881C11.3383 23.3114 11.0468 23.3217 10.7514 23.3217ZM5.3446 16.9031C5.99087 16.9128 6.62201 17.1001 7.16888 17.4447C7.31529 17.5341 7.42801 17.6001 7.53684 17.6571C7.99137 17.8843 8.38585 18.2156 8.68821 18.624C8.99057 19.0324 9.19227 19.5064 9.2769 20.0075L9.36889 20.6423C9.38213 20.8177 9.45442 20.9834 9.57397 21.1123C9.69351 21.2413 9.85325 21.3259 10.0271 21.3523C10.2603 21.3692 10.5039 21.3783 10.7514 21.3783C10.9988 21.3783 11.2424 21.3692 11.4756 21.3523C11.6495 21.3259 11.8092 21.2413 11.9287 21.1123C12.0483 20.9834 12.1206 20.8177 12.1338 20.6423L12.2258 20.0075C12.3107 19.5063 12.5126 19.0323 12.8152 18.6239C13.1178 18.2155 13.5125 17.8843 13.9672 17.6571C14.0851 17.5937 14.2004 17.5276 14.3364 17.4447C14.8828 17.1001 15.5135 16.9127 16.1594 16.9031C16.5303 16.902 16.898 16.9719 17.2426 17.1091L17.8399 17.3475C17.9526 17.3936 18.0731 17.4178 18.1949 17.4187C18.3089 17.4225 18.4221 17.3985 18.5247 17.3488C18.6274 17.2992 18.7165 17.2254 18.7844 17.1337C19.0567 16.7343 19.2988 16.315 19.5087 15.8795C19.5742 15.7166 19.5816 15.5361 19.5297 15.3683C19.4778 15.2005 19.3697 15.0557 19.2236 14.9583L18.7157 14.5554C18.3237 14.2325 18.0136 13.8214 17.8109 13.3557C17.6082 12.89 17.5187 12.3829 17.5496 11.8759V11.6609V11.4458C17.5188 10.9387 17.6084 10.4314 17.8111 9.96553C18.0137 9.49963 18.3237 9.08828 18.7157 8.76509L19.2236 8.36343C19.3698 8.26577 19.478 8.12076 19.5299 7.95277C19.5818 7.78478 19.5743 7.60405 19.5087 7.44093C19.2988 7.0054 19.0567 6.58617 18.7844 6.18674C18.7165 6.09473 18.6272 6.02061 18.5243 5.97073C18.4214 5.92085 18.3079 5.89672 18.1936 5.9004C18.0722 5.90143 17.9522 5.92561 17.8399 5.97166L17.2426 6.21136C16.8975 6.34843 16.5294 6.41835 16.1581 6.41737C15.5126 6.408 14.8822 6.22058 14.3364 5.87578C14.2198 5.80582 14.0941 5.73197 13.9672 5.662C13.5125 5.43547 13.1178 5.10474 12.8152 4.69676C12.5126 4.28878 12.3107 3.81509 12.2258 3.31428L12.1338 2.67941C12.1219 2.50374 12.0501 2.33749 11.9302 2.20848C11.8104 2.07947 11.6499 1.99552 11.4756 1.97069C11.2424 1.95384 10.9988 1.94477 10.7514 1.94477C10.5039 1.94477 10.2603 1.95384 10.0271 1.97069C9.85278 1.99552 9.69229 2.07947 9.57248 2.20848C9.45266 2.33749 9.38079 2.50374 9.36889 2.67941L9.2769 3.31428C9.19261 3.81511 8.99118 4.28894 8.68902 4.69715C8.38686 5.10537 7.99252 5.43641 7.53814 5.6633C7.42801 5.7216 7.3114 5.79286 7.17017 5.87708C6.62387 6.2218 5.99309 6.4092 5.34719 6.41866C4.97625 6.41895 4.60865 6.34859 4.26402 6.21136L3.66802 5.97166C3.5557 5.92571 3.43567 5.90152 3.31431 5.9004C3.19999 5.8966 3.08646 5.92069 2.98353 5.97058C2.88059 6.02046 2.79135 6.09465 2.72349 6.18674C2.45076 6.58616 2.20824 7.00539 1.99793 7.44093C1.93305 7.60414 1.92594 7.78464 1.97779 7.95244C2.02964 8.12025 2.13733 8.26527 2.28297 8.36343L2.79087 8.76509C3.18305 9.08815 3.49316 9.49947 3.69584 9.9654C3.89851 10.4313 3.98799 10.9386 3.95695 11.4458V11.6609V11.8759C3.9881 12.3829 3.89866 12.8901 3.69597 13.3558C3.49328 13.8216 3.1831 14.2326 2.79087 14.5554L2.28297 14.9583C2.13725 15.0561 2.02946 15.2009 1.97758 15.3685C1.92571 15.5362 1.93289 15.7165 1.99793 15.8795C2.20802 16.3152 2.45056 16.7344 2.72349 17.1337C2.79129 17.2255 2.88037 17.2993 2.98307 17.349C3.08577 17.3986 3.19901 17.4226 3.31302 17.4187C3.4348 17.4177 3.55528 17.3935 3.66802 17.3475L4.26402 17.1091C4.60785 16.9724 4.97459 16.9025 5.3446 16.9031ZM10.7514 16.5144C9.79018 16.5144 8.85059 16.2293 8.05147 15.6952C7.25235 15.1611 6.6296 14.4019 6.26201 13.5138C5.89442 12.6257 5.79851 11.6485 5.9864 10.7059C6.17429 9.76326 6.63756 8.89753 7.31757 8.21824C7.99759 7.53894 8.86382 7.07661 9.80665 6.88972C10.7495 6.70283 11.7266 6.79979 12.6143 7.16833C13.502 7.53686 14.2605 8.16042 14.7937 8.96011C15.327 9.7598 15.6111 10.6997 15.6101 11.6609C15.6087 12.9491 15.0963 14.1841 14.1855 15.095C13.2746 16.0059 12.0395 16.5182 10.7514 16.5196V16.5144ZM10.7514 8.74047C10.175 8.74047 9.61158 8.91131 9.13229 9.23141C8.653 9.55151 8.27934 10.0065 8.05855 10.5389C7.83775 11.0713 7.77972 11.6572 7.89178 12.2225C8.00384 12.7879 8.28098 13.3073 8.68816 13.7152C9.09534 14.1231 9.6143 14.4012 10.1795 14.5143C10.7446 14.6273 11.3306 14.5703 11.8634 14.3505C12.3962 14.1306 12.8518 13.7578 13.1728 13.2791C13.4937 12.8003 13.6655 12.2372 13.6666 11.6609C13.6655 10.888 13.3581 10.1471 12.8116 9.60064C12.2651 9.05415 11.5242 8.74668 10.7514 8.74565V8.74047Z" fill="white"/>
          </svg>
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

