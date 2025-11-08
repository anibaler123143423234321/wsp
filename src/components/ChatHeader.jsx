import { useState, useEffect } from 'react';
import { FaSignOutAlt, FaPhone, FaVideo, FaArrowLeft, FaKeyboard, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import './ChatHeader.css';

const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  onLeaveRoom,
  userPicture,
  targetUser,
  onStartCall,
  onStartVideoCall,
  hasCamera = true,
  onBack,
  isTyping,
  adminViewConversation,
  onAddUsersToRoom,
  onRemoveUsersFromRoom,
  user
}) => {

  // No mostrar el header si no hay chat seleccionado
  if (!to) {
    return null;
  }

  // Verificar si el usuario actual es participante de la conversación
  const isUserParticipant = () => {
    if (!adminViewConversation || !adminViewConversation.participants) {
      return false;
    }

    const currentUserFullName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : user?.username;

    return adminViewConversation.participants.includes(currentUserFullName);
  };

  // Obtener el nombre del otro participante cuando eres participante de una conversación asignada
  const getOtherParticipantName = () => {
    if (!adminViewConversation || !adminViewConversation.participants) {
      return null;
    }

    const currentUserFullName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : user?.username;

    // Encontrar el participante que NO es el usuario actual
    const otherParticipant = adminViewConversation.participants.find(
      p => p !== currentUserFullName
    );

    return otherParticipant;
  };

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
                  {isGroup && currentRoomCode && (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && (
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
              ) : isTyping ? (
                <span className="typing-status">
                  <FaKeyboard className="typing-icon" />
                  está escribiendo...
                </span>
              ) : adminViewConversation && !isUserParticipant() && (user?.role === 'ADMIN' || user?.role === 'PROGRAMADOR' || user?.role === 'JEFEPISO') ? (
                // Vista de admin: mostrar "Monitoreando" SOLO si NO es participante
                <>
                  <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                    👁️ Monitoreando conversación
                  </span>
                  {targetUser && (targetUser.role || targetUser.numeroAgente) && (
                    <span style={{ color: '#666', marginLeft: '8px' }}>
                      •{' '}
                      {targetUser.numeroAgente ? (
                        targetUser.role ? (
                          `Rol: ${targetUser.role} • N° Agente: ${targetUser.numeroAgente}`
                        ) : (
                          `N° Agente: ${targetUser.numeroAgente}`
                        )
                      ) : (
                        `Rol: ${targetUser.role}`
                      )}
                    </span>
                  )}
                </>
              ) : (
                // Conversación normal: mostrar rol y número de agente
                <>
                  {targetUser?.numeroAgente ? (
                    // Si tiene número de agente, mostrar rol y número de agente
                    targetUser?.role ? (
                      `Rol: ${targetUser.role} • N° Agente: ${targetUser.numeroAgente}`
                    ) : (
                      `N° Agente: ${targetUser.numeroAgente}`
                    )
                  ) : targetUser?.role ? (
                    // Si NO tiene número de agente, mostrar solo el rol
                    `Rol: ${targetUser.role}`
                  ) : isUserParticipant() && getOtherParticipantName() ? (
                    // Si eres participante de una conversación asignada, mostrar el nombre del otro participante
                    `Conversación con ${getOtherParticipantName()}`
                  ) : (
                    'Sin información'
                  )}
                </>
              )}
            </div>
          </div>

          {/* Avatares de miembros de la sala (solo para grupos) */}
          {isGroup && roomUsers && roomUsers.length > 0 && (
            <div className="room-members-avatars">
              {roomUsers.slice(0, 5).map((user, index) => {
                const username = typeof user === 'string' ? user : user.username;
                const picture = typeof user === 'object' ? user.picture : null;
                const nombre = typeof user === 'object' ? user.nombre : null;
                const apellido = typeof user === 'object' ? user.apellido : null;
                const displayName = nombre && apellido ? `${nombre} ${apellido}` : username;

                return (
                  <div key={index} className="member-avatar" title={displayName}>
                    {picture ? (
                      <img src={picture} alt={displayName} />
                    ) : (
                      <div className="member-avatar-placeholder">
                        {displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                );
              })}
              {roomUsers.length > 5 && (
                <div className="member-avatar member-avatar-more" title={`+${roomUsers.length - 5} más`}>
                  +{roomUsers.length - 5}
                </div>
              )}
            </div>
          )}
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

          {/* Botón para agregar usuarios a la sala */}
          {isGroup && currentRoomCode && onAddUsersToRoom && (
            <button
              className="header-icon-btn add-users-btn"
              onClick={onAddUsersToRoom}
              title="Agregar usuarios a la sala"
            >
              <FaUserPlus />
            </button>
          )}

          {/* Botón para eliminar usuarios de la sala */}
          {isGroup && currentRoomCode && onRemoveUsersFromRoom && (
            <button
              className="header-icon-btn remove-users-btn"
              onClick={onRemoveUsersFromRoom}
              title="Eliminar usuarios de la sala"
              style={{
                color: '#ef4444'
              }}
            >
              <FaUserMinus />
            </button>
          )}

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
