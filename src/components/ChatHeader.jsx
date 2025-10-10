import { useState, useEffect } from 'react';
import { FaSignOutAlt, FaPhone, FaVideo, FaArrowLeft } from 'react-icons/fa';
import './ChatHeader.css';

const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  roomDuration,
  roomExpiresAt,
  onLeaveRoom,
  userPicture,
  onStartCall,
  onStartVideoCall,
  hasCamera = true,
  onBack
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // No mostrar el header si no hay chat seleccionado
  if (!to) {
    return null;
  }

  return (
    <div className="chat-header">
      <div className="chat-header-content">
        {/* Botón de atrás en mobile */}
        {onBack && (
          <button className="back-btn-mobile" onClick={onBack} title="Volver">
            <FaArrowLeft />
          </button>
        )}

        <div className="chat-header-info">
          {/* Avatar */}
          {userPicture ? (
            <img src={userPicture} alt={to} className="chat-avatar-img" />
          ) : (
            <div className="chat-avatar">
              {isGroup ? '👥' : '👤'}
            </div>
          )}

          {/* Información del usuario/grupo */}
          <div className="chat-user-info">
            <div className="chat-title">
              {to}
              {isGroup && currentRoomCode && (
                <span className="room-code">• {currentRoomCode}</span>
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
                'Online'
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="chat-header-actions">
          {/* Botones de llamada (solo para chats individuales) */}
          {!isGroup && to && (
            <>
              <button
                className="header-icon-btn call-btn"
                onClick={() => onStartCall && onStartCall(to)}
                title="Llamada de audio"
              >
                <FaPhone />
              </button>
              <button
                className={`header-icon-btn video-btn ${!hasCamera ? 'disabled' : ''}`}
                onClick={() => hasCamera && onStartVideoCall && onStartVideoCall(to)}
                title={hasCamera ? "Videollamada" : "No hay cámara disponible"}
                disabled={!hasCamera}
              >
                <FaVideo />
              </button>
            </>
          )}

          <button className="header-icon-btn" title="Información">
            ℹ️
          </button>

          {isGroup && currentRoomCode && (
            <button
              className="leave-room-btn"
              onClick={onLeaveRoom}
              title="Salir de la sala"
            >
              <span className="leave-icon"><FaSignOutAlt /></span>
              <span className="leave-text">Salir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
