import React from 'react';
import { FaUsers, FaUser, FaSignInAlt, FaCog, FaHome, FaClipboard, FaComments, FaSignOutAlt, FaStickyNote } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({
  user,
  userList,
  groupList,
  roomUsers,
  isGroup,
  isAdmin,
  showAdminMenu,
  setShowAdminMenu,
  onUserSelect,
  onGroupSelect,
  onPersonalNotes,
  onLogout,
  onShowCreateRoom,
  onShowJoinRoom,
  onShowAdminRooms,
  onShowCreateConversation,
  onShowManageUsers,
  onShowSystemConfig,
  loadingAdminRooms,
  unreadMessages
}) => {
  // Mostrar usuarios de la sala si estamos en una sala temporal, sino mostrar lista general
  const displayUsers = isGroup && roomUsers ? roomUsers : userList;
  
  const filteredUsersList = displayUsers.filter(user => 
    user.toLowerCase().includes('') // Aquí iría el filtro de búsqueda
  );

  const filteredGroupsList = groupList.filter(group => 
    group.name.toLowerCase().includes('') // Aquí iría el filtro de búsqueda
  );

  return (
    <div className="users-list">
      <h3 data-count={isGroup && roomUsers ? roomUsers.length : userList.length + groupList.length}>
  <span className="main-title"><FaUsers style={{marginRight:4}}/> Chats Midas Solutions Center</span>
        {user?.sede && (
          <span className="sede-info">
            {user.sede}
          </span>
        )}
      </h3>
      
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar o empezar un nuevo chat"
            className="search-input"
          />
        </div>
      </div>
      
      <div className="users-count">
        {isGroup && roomUsers ? 
          `${roomUsers.length} usuario${roomUsers.length !== 1 ? 's' : ''} en la sala` :
          `${userList.length} usuario${userList.length !== 1 ? 's' : ''} | ${groupList.length} grupo${groupList.length !== 1 ? 's' : ''}`
        }
      </div>

      {/* Menú de administrador */}
      {isAdmin && (
        <div className="admin-section">
          <button 
            className="admin-toggle-btn"
            onClick={() => setShowAdminMenu(!showAdminMenu)}
          >
            <span className="admin-icon"><FaCog /></span>
            <span className="admin-text">Administrador</span>
            <span className={`admin-arrow ${showAdminMenu ? 'open' : ''}`}>▼</span>
          </button>
          
          {showAdminMenu && (
            <div className="admin-menu">
              <div className="admin-option" onClick={onShowCreateRoom}>
                <span className="admin-icon"><FaHome /></span>
                <span className="admin-text">Crear sala temporal</span>
              </div>
              <div className="admin-option" onClick={onShowAdminRooms}>
                <span className="admin-icon"><FaClipboard /></span>
                <span className="admin-text">{loadingAdminRooms ? 'Cargando...' : 'Mis salas'}</span>
              </div>
              <div className="admin-option" onClick={onShowCreateConversation}>
                <span className="admin-icon"><FaComments /></span>
                <span className="admin-text">Crear conversación temporal</span>
              </div>
              <div className="admin-option" onClick={onShowManageUsers}>
                <span className="admin-icon"><FaUsers /></span>
                <span className="admin-text">Gestionar usuarios</span>
              </div>
              <div className="admin-option" onClick={onShowSystemConfig}>
                <span className="admin-icon"><FaCog /></span>
                <span className="admin-text">Configuración del sistema</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón para unirse a sala (todos los usuarios) */}
      <div className="join-room-section">
        <button className="join-room-btn" onClick={onShowJoinRoom}>
          <span className="join-icon"><FaSignInAlt /></span>
          <span className="join-text">Unirse a sala</span>
        </button>
      </div>

      {/* Lista de usuarios */}
      <div className="users-container">
        {filteredUsersList.map((userName, index) => (
          <div
            key={index}
            className={`user-item ${userName === user?.username ? 'selected' : ''} ${isGroup ? 'room-user' : ''}`}
            onClick={() => {
              // Si estamos en una sala temporal, no permitir seleccionar usuarios individuales
              if (isGroup) {
                return;
              }
              onUserSelect(userName);
            }}
            style={{ 
              cursor: isGroup ? 'default' : 'pointer',
              opacity: isGroup ? 0.7 : 1
            }}
            title={isGroup ? 'Usuarios en la sala (no seleccionable)' : 'Hacer clic para chatear'}
          >
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-status">En línea</div>
            </div>
            {!isGroup && unreadMessages[`user-${userName}`] > 0 && (
              <div className="unread-badge">
                {unreadMessages[`user-${userName}`]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lista de grupos */}
      {filteredGroupsList.length > 0 && (
        <div className="groups-container">
          <h4>Grupos</h4>
          {filteredGroupsList.map((group, index) => (
            <div
              key={index}
              className={`group-item ${group.name === 'selected' ? 'selected' : ''}`}
              onClick={() => onGroupSelect(group)}
            >
              <div className="group-avatar"><FaUsers /></div>
              <div className="group-info">
                <div className="group-name">{group.name}</div>
                <div className="group-members">{group.members.length} miembros</div>
              </div>
              {unreadMessages[`group-${group.name}`] > 0 && (
                <div className="unread-badge">
                  {unreadMessages[`group-${group.name}`]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notas personales */}
      <div className="personal-notes">
        <div className="user-item" onClick={onPersonalNotes}>
          <div className="user-avatar"><FaStickyNote /></div>
          <div className="user-info">
            <div className="user-name">Notas personales (tú)</div>
            <div className="user-status">Mensajes privados</div>
          </div>
        </div>
      </div>

      {/* Botón de cerrar sesión */}
      <div className="logout-section">
        <button className="logout-btn" onClick={onLogout}>
          <FaSignOutAlt style={{marginRight:6}}/> Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
