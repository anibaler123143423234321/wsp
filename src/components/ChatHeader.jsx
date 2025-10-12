import { useState, useEffect } from 'react';
import { FaSignOutAlt, FaPhone, FaVideo, FaArrowLeft, FaKeyboard } from 'react-icons/fa';
import './ChatHeader.css';

const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  onLeaveRoom,
  userPicture,
  onStartCall,
  onStartVideoCall,
  hasCamera = true,
  onBack,
  isTyping,
  adminViewConversation
}) => {

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
              {adminViewConversation && adminViewConversation.participants ? (
                // Vista de admin: mostrar ambos participantes
                `${adminViewConversation.participants[0]} ↔ ${adminViewConversation.participants[1]}`
              ) : (
                // Vista normal: mostrar solo el destinatario
                <>
                  {to}
                  {isGroup && currentRoomCode && (
                    <span className="room-code">• {currentRoomCode}</span>
                  )}
                </>
              )}
            </div>
            <div className="chat-subtitle">
              {isGroup ? (
                currentRoomCode ? (
                  <>
                    Sala temporal • {roomUsers.length} miembro{roomUsers.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  `Grupo • ${roomUsers.length} miembro${roomUsers.length !== 1 ? 's' : ''}`
                )
              ) : adminViewConversation ? (
                // Vista de admin
                <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                  👁️ Monitoreando conversación
                </span>
              ) : (
                isTyping ? (
                  <span className="typing-status">
                    <FaKeyboard className="typing-icon" />
                    está escribiendo...
                  </span>
                ) : (
                  'Conversación asignada'
                )
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
              title="Regresar"
            >
              <span className="leave-icon"><FaArrowLeft /></span>
              <span className="leave-text">Regresar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
