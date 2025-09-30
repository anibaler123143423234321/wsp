import React, { useState, useEffect } from 'react';
import { FaVolumeUp, FaUsers, FaUser, FaSignOutAlt, FaBars, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './ChatHeader.css';

const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  roomDuration,
  roomExpiresAt,
  onLeaveRoom,
  onToggleMenu,
  showSidebar,
  soundsEnabled,
  onEnableSounds
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  console.log(showSidebar);
  // Actualizar el tiempo cada minuto para refrescar el contador de expiración
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, []);

  // Función para formatear la duración en minutos a horas y minutos
  const formatDuration = (minutes) => {
    if (!minutes) return 'No especificada';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  // Función para formatear la fecha de expiración
  const formatExpirationDate = (expiresAt) => {
    if (!expiresAt) return null;
    
    const expirationDate = new Date(expiresAt);
    const timeDiff = expirationDate.getTime() - currentTime.getTime();
    
    // Si ya expiró
    if (timeDiff <= 0) {
      return { text: 'Expirada', isUrgent: true };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) {
      text = `Expira en ${days}d ${hours}h`;
    } else if (hours > 0) {
      text = `Expira en ${hours}h ${minutes}m`;
    } else {
      text = `Expira en ${minutes}m`;
    }
    
    // Marcar como urgente si queda menos de 1 hora
    const isUrgent = timeDiff < (60 * 60 * 1000); // 1 hora en milisegundos
    
    return { text, isUrgent };
  };

  if (!to) {
    return (
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="chat-header-info" style={{justifyContent: 'space-between', alignItems: 'center',display: 'flex' , width: '100%'}}>
            <button 
              className={`menu-toggle-btn${showSidebar ? ' open' : ''}`}
              onClick={onToggleMenu}
              title={showSidebar ? "Ocultar menú de usuarios" : "Mostrar menú de usuarios"}
              aria-label={showSidebar ? "Ocultar menú de usuarios" : "Mostrar menú de usuarios"}
              aria-expanded={showSidebar}
            >
              <span className={`menu-icon${showSidebar ? ' open' : ''}`} aria-hidden="true" >
                 {showSidebar ? <FaChevronLeft /> : <FaChevronRight />}
              </span>
            </button>
            
            {!soundsEnabled && (
              <button 
                className="enable-sounds-btn"
                onClick={onEnableSounds}
                title="Habilitar sonidos de notificación"
                aria-label="Habilitar sonidos de notificación"
              >
                <span className="sound-icon"><FaVolumeUp /></span>
                <span className="sound-text">Habilitar sonidos</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <div className="chat-header-info">
          <div className="chat-title">
            {isGroup ? (
              <>
                <span className="group-icon"><FaUsers /></span>
                {to}
                {currentRoomCode && (
                  <span className="room-code">• Código: {currentRoomCode}</span>
                )}
              </>
            ) : (
              <>
                <span className="user-icon"><FaUser /></span>
                {to}
              </>
            )}
          </div>
          <div className="chat-subtitle">
            {isGroup ? (
              currentRoomCode ? (
                <>
                  Sala temporal • {roomUsers.length} miembro{roomUsers.length !== 1 ? 's' : ''}
                  {roomDuration && (
                    <span className="room-duration"> • Duración: {formatDuration(roomDuration)}</span>
                  )}
                  {roomExpiresAt && (() => {
                    const expiration = formatExpirationDate(roomExpiresAt);
                    return (
                      <span className={`room-expiration ${expiration.isUrgent ? 'urgent' : ''}`}>
                        • {expiration.text}
                      </span>
                    );
                  })()}
                </>
              ) : (
                `Grupo • ${roomUsers.length} miembro${roomUsers.length !== 1 ? 's' : ''}`
              )
            ) : (
              'En línea'
            )}
          </div>
        </div>
        
        {isGroup && currentRoomCode && (
          <div className="chat-header-actions">
            <button 
              className="leave-room-btn" 
              onClick={onLeaveRoom}
              title="Salir de la sala"
            >
              <span className="leave-icon"><FaSignOutAlt /></span>
              <span className="leave-text">Salir</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
