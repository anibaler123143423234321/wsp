import { useState, useEffect } from 'react';
// 🔥 BLOQUEADO: FaPhone y FaVideo removidos (iconos de llamadas deshabilitados)
import { FaArrowLeft, FaKeyboard, FaUserPlus, FaUserMinus, FaVideo } from 'react-icons/fa';
import './ChatHeader.css';
const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  onLeaveRoom,
  userPicture,
  targetUser,
  onBack,
  isTyping,
  adminViewConversation,
  onAddUsersToRoom,
  onRemoveUsersFromRoom,
  user,
  onStartVideoCall // Agregar esta línea
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
        <div className="chat-header-info">
          {/* Avatar */}
          {userPicture ? (
            <img src={userPicture} alt={to} className="chat-avatar-img" />
          ) : (
            <div className="chat-avatar">

              {/* === 🔥 CÓDIGO ACTUALIZADO Y LIMPIO 🔥 === */}
              {isGroup ? (
                <svg
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  role="img"
                  className="chat-avatar-svg-icon" // Nuestra propia clase
                >
                  <title>Icono de Grupo</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M17.822 21.678Q19.143 23 21 23t3.178-1.322T25.5 18.5t-1.322-3.178Q22.857 14 21 14t-3.178 1.322T16.5 18.5t1.322 3.178M12.66 32.34q.66.66 1.589.661h13.5q.928 0 1.59-.66.66-.662.66-1.59v-.9q0-.956-.492-1.758A3.3 3.3 0 0 0 28.2 26.87a16.7 16.7 0 0 0-3.544-1.308q-1.8-.435-3.656-.436-1.856 0-3.656.436T13.8 26.869a3.3 3.3 0 0 0-1.308 1.223A3.3 3.3 0 0 0 12 29.85v.9q0 .928.66 1.59m21.09.66h-2.392A4.16 4.16 0 0 0 32 30.75v-.9c0-1-.263-1.95-.788-2.804a5.3 5.3 0 0 0-1.675-1.713q.563.093 1.119.228 1.8.436 3.544 1.308.815.422 1.308 1.223.492.802.492 1.758v.9q0 .928-.661 1.59-.66.66-1.59.66M27 23a4.6 4.6 0 0 1-1.18-.147c1.105-1.211 1.68-2.692 1.68-4.353s-.575-3.142-1.68-4.353A4.6 4.6 0 0 1 27 14q1.856 0 3.178 1.322Q31.5 16.643 31.5 18.5t-1.322 3.178T27 23"
                  ></path>
                </svg>
              ) : (
                '👤' // Se mantiene el ícono para chat individual
              )}
              {/* === FIN DEL CAMBIO === */}

            </div>
          )}

          {/* Información del usuario/grupo */}
          <div className="chat-user-info">
            <div className="chat-title">
              {adminViewConversation && adminViewConversation.participants ? (
                // 🔥 Calcular el nombre a mostrar según el usuario actual
                (() => {
                  const participants = adminViewConversation.participants || [];
                  const participant1Name = participants[0] || 'Usuario 1';
                  const participant2Name = participants[1] || 'Usuario 2';

                  const currentUserFullName = user?.nombre && user?.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user?.username;

                  // Si el usuario actual es uno de los participantes, mostrar solo el nombre del otro
                  if (currentUserFullName === participant1Name) {
                    return participant2Name;
                  } else if (currentUserFullName === participant2Name) {
                    return participant1Name;
                  } else {
                    // 🔥 CORREGIDO: Si el usuario no es participante (admin monitoreando), SIEMPRE mostrar ambos
                    return `${participant1Name} ↔️ ${participant2Name}`;
                  }
                })()
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
                    {/* 🔥 MODIFICADO: Contar TODOS los usuarios en la sala (connectedMembers) */}
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

        {/* Botón de salir del grupo - LADO IZQUIERDO */}
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

        {/* Botones de acción */}
        <div className="chat-header-actions">
          {/* 🔥 BLOQUEADO: Botones de llamada deshabilitados */}
          {/* Botón de videollamada */}
          {onStartVideoCall && (
            <>
              {!isGroup && (
                <button
                  className="header-icon-btn"
                  onClick={onStartVideoCall}
                  title="Iniciar videollamada"
                >
                  <FaVideo />
                </button>
              )}
              {isGroup && user?.role === 'COORDINADOR' && (
                <button
                  className="header-icon-btn"
                  onClick={onStartVideoCall}
                  title="Iniciar videollamada grupal"
                >
                  <FaVideo />
                </button>
              )}
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

          {/* Botón de atrás en mobile - MOVIDO AL LADO DERECHO */}
          {onBack && (
            <button className="back-btn-mobile" onClick={onBack} title="Volver">
              <FaArrowLeft />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;