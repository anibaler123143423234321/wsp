import { FaArrowLeft, FaUserPlus, FaUserMinus, FaComments } from 'react-icons/fa';
// Importamos el nuevo componente
import VideoCallButton from '../VideoCallButton/VideoCallButton';
import './ChatHeader.css';

const ChatHeader = ({
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  maxCapacity,
  userPicture,
  onBack,
  adminViewConversation,
  onAddUsersToRoom,
  onRemoveUsersFromRoom,
  user,
  onStartVideoCall,
  onToggleMembersPanel,
  onToggleInfoPanel,
  onToggleThreadsPanel
}) => {
  // No mostrar el header si no hay chat seleccionado
  if (!to) {
    return null;
  }

  //  Verificar permisos para agregar/eliminar usuarios
  const userRole = (user?.role || user?.rol || '').toUpperCase();
  const allowedRoles = ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'SUPERVISOR', 'SUPERADMIN'];
  const canManageUsers = allowedRoles.includes(userRole);



  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <div className="chat-header-info">
          {/* Avatar */}
          {userPicture ? (
            <img src={userPicture} alt={to} className="chat-avatar-img" />
          ) : (
            <div className="chat-avatar">
              {isGroup ? (
                <svg viewBox="0 0 48 48" aria-hidden="true" role="img" className="chat-avatar-svg-icon">
                  <title>Icono de Grupo</title>
                  <path fillRule="evenodd" clipRule="evenodd" d="M17.822 21.678Q19.143 23 21 23t3.178-1.322T25.5 18.5t-1.322-3.178Q22.857 14 21 14t-3.178 1.322T16.5 18.5t1.322 3.178M12.66 32.34q.66.66 1.589.661h13.5q.928 0 1.59-.66.66-.662.66-1.59v-.9q0-.956-.492-1.758A3.3 3.3 0 0 0 28.2 26.87a16.7 16.7 0 0 0-3.544-1.308q-1.8-.435-3.656-.436-1.856 0-3.656.436T13.8 26.869a3.3 3.3 0 0 0-1.308 1.223A3.3 3.3 0 0 0 12 29.85v.9q0 .928.66 1.59m21.09.66h-2.392A4.16 4.16 0 0 0 32 30.75v-.9c0-1-.263-1.95-.788-2.804a5.3 5.3 0 0 0-1.675-1.713q.563.093 1.119.228 1.8.436 3.544 1.308.815.422 1.308 1.223.492.802.492 1.758v.9q0 .928-.661 1.59-.66.66-1.59.66M27 23a4.6 4.6 0 0 1-1.18-.147c1.105-1.211 1.68-2.692 1.68-4.353s-.575-3.142-1.68-4.353A4.6 4.6 0 0 1 27 14q1.856 0 3.178 1.322Q31.5 16.643 31.5 18.5t-1.322 3.178T27 23"></path>
                </svg>
              ) : (
                '👤'
              )}
            </div>
          )}

          {/* Información del usuario/grupo */}
          <div className="chat-user-info">
            <div className="chat-title">
              {adminViewConversation && adminViewConversation.participants ? (
                (() => {
                  const participants = adminViewConversation.participants || [];
                  const participant1Name = participants[0] || 'Usuario 1';
                  const participant2Name = participants[1] || 'Usuario 2';
                  const currentUserFullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username;

                  if (currentUserFullName === participant1Name) {
                    return participant2Name;
                  } else if (currentUserFullName === participant2Name) {
                    return participant1Name;
                  } else {
                    return `${participant1Name} ↔️ ${participant2Name}`;
                  }
                })()
              ) : (
                <>
                  {to}
                  {isGroup && currentRoomCode && (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && (
                    <span className="room-code">• {currentRoomCode}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Avatares de miembros de la sala (solo para grupos) */}
          {isGroup && roomUsers && roomUsers.length > 0 && (
            <div className="room-members-wrapper">
              <div className="room-members-pile" onClick={onToggleMembersPanel}>
                <div className="stacked-avatars">
                  {roomUsers.slice(0, 3).map((member, index) => {
                    const username = typeof member === 'string' ? member : member.username;
                    const picture = typeof member === 'object' ? member.picture : null;
                    const nombre = typeof member === 'object' ? member.nombre : null;
                    const apellido = typeof member === 'object' ? member.apellido : null;
                    const memberDisplayName = typeof member === 'object' ? member.displayName : null;

                    // Intentar obtener el mejor nombre disponible
                    const displayName = nombre && apellido
                      ? `${nombre} ${apellido}`
                      : (memberDisplayName || username || 'Usuario');

                    // Obtener iniciales (primera letra del nombre, o primera letra del apellido si existe)
                    const getInitials = (name) => {
                      if (!name || name === 'Usuario') return 'U';
                      const parts = name.split(' ').filter(p => p.length > 0);
                      if (parts.length >= 2) {
                        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                      }
                      return name[0]?.toUpperCase() || 'U';
                    };

                    // Determinamos el color para el avatar sin imagen (basado en índice o nombre)
                    const colorIndex = (index % 3) + 1;

                    return (
                      <span
                        key={index}
                        className="stacked-avatar-item"
                        title={displayName}
                        data-color={colorIndex}
                      >
                        {picture ? (
                          <img
                            src={picture}
                            alt={displayName}
                            className="stacked-avatar-img"
                          />
                        ) : (
                          <span className="stacked-avatar-placeholder">
                            {getInitials(displayName)}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className="members-count" title={maxCapacity > 0 ? `${roomUsers.length} de ${maxCapacity} miembros` : `${roomUsers.length} miembros`}>
                  {maxCapacity > 0 ? `${roomUsers.length}/${maxCapacity}` : roomUsers.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="chat-header-actions">

          {/*  NUEVO: Botón de Videollamada Refactorizado */}
          <VideoCallButton
            onStartVideoCall={onStartVideoCall}
            isGroup={isGroup}
            user={user}
          />

          {/* Botón para agregar usuarios a la sala - Solo ADMIN, JEFEPISO, PROGRAMADOR, SUPERVISOR */}
          {isGroup && currentRoomCode && onAddUsersToRoom && canManageUsers && (
            <button
              className="header-icon-btn add-users-btn"
              onClick={onAddUsersToRoom}
              title="Agregar usuarios a la sala"
            >
              <FaUserPlus />
            </button>
          )}

          {/* Botón para eliminar usuarios de la sala - Solo ADMIN, JEFEPISO, PROGRAMADOR, SUPERVISOR */}
          {isGroup && currentRoomCode && onRemoveUsersFromRoom && canManageUsers && (
            <button
              className="header-icon-btn remove-users-btn"
              onClick={onRemoveUsersFromRoom}
              title="Eliminar usuarios de la sala"
              style={{ color: '#ef4444' }}
            >
              <FaUserMinus />
            </button>
          )}

          {/* Botón de Hilos */}
          {onToggleThreadsPanel && (
            <button
              className="header-icon-btn threads-btn"
              onClick={onToggleThreadsPanel}
              title="Ver hilos"
            >
              <FaComments size={20} />
            </button>
          )}

          {/* Botón de Info*/}
          {onToggleInfoPanel && (
            <button
              className="header-icon-btn tools-btn"
              onClick={onToggleInfoPanel}
              title="Información del chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17a.97.97 0 0 0 .713-.288A.968.968 0 0 0 13 16v-4a.968.968 0 0 0-.287-.713A.968.968 0 0 0 12 11a.968.968 0 0 0-.713.287A.968.968 0 0 0 11 12v4c0 .283.096.52.287.712.192.192.43.288.713.288Zm0-8c.283 0 .52-.096.713-.287A.967.967 0 0 0 13 8a.967.967 0 0 0-.287-.713A.968.968 0 0 0 12 7a.968.968 0 0 0-.713.287A.967.967 0 0 0 11 8c0 .283.096.52.287.713.192.191.43.287.713.287Zm0 13a9.738 9.738 0 0 1-3.9-.788 10.099 10.099 0 0 1-3.175-2.137c-.9-.9-1.612-1.958-2.137-3.175A9.738 9.738 0 0 1 2 12a9.74 9.74 0 0 1 .788-3.9 10.099 10.099 0 0 1 2.137-3.175c.9-.9 1.958-1.612 3.175-2.137A9.738 9.738 0 0 1 12 2a9.74 9.74 0 0 1 3.9.788 10.098 10.098 0 0 1 3.175 2.137c.9.9 1.613 1.958 2.137 3.175A9.738 9.738 0 0 1 22 12a9.738 9.738 0 0 1-.788 3.9 10.098 10.098 0 0 1-2.137 3.175c-.9.9-1.958 1.613-3.175 2.137A9.738 9.738 0 0 1 12 22Z"></path>
              </svg>
            </button>
          )}

          {/* Botón de atrás en mobile - Al final (lado derecho) */}
          {onBack && (
            <button className="back-btn-mobile" onClick={onBack} title="Volver al listado">
              <FaArrowLeft />
            </button>
          )}

        </div>
      </div>


    </div >
  );
};

export default ChatHeader;