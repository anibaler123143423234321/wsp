<<<<<<< HEAD
import React from 'react';
import { FaUsers, FaUser, FaSignInAlt, FaCog, FaHome, FaClipboard, FaComments, FaSignOutAlt, FaStickyNote } from 'react-icons/fa';
=======
import React, { useState } from 'react';
>>>>>>> b37357b (mejoras de estilos profesionales)
import './Sidebar.css';
import logo from '../assets/Logotipo +34.svg';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Crear conversaciones de ejemplo con datos más realistas
  const createConversations = () => {
    const displayUsers = isGroup && roomUsers ? roomUsers : userList;

    return displayUsers.map((userName, index) => ({
      id: `user-${userName}`,
      name: userName,
      lastMessage: isGroup ? 'Usuario en sala' : 'Haz clic para chatear',
      time: '16:45',
      unread: !isGroup && unreadMessages[`user-${userName}`] ? unreadMessages[`user-${userName}`] : 0,
      avatar: userName.charAt(0).toUpperCase()
    }));
  };

  const conversations = createConversations();

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-list">
<<<<<<< HEAD
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
=======
      {/* Columna izquierda */}
      <div className="sidebar-left">
        <div className="sidebar-left-content">
          <img src={logo} alt="+34 Logo" className="sidebar-logo" />

          <div className="user-profile">
            {user?.picture ? (
              <img src={user.picture} alt="Avatar" className="user-avatar-image" />
            ) : (
              <div className="user-avatar-small">
                {user?.nombre?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="user-name-tooltip">
              {user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username || 'Usuario'}
            </div>
>>>>>>> b37357b (mejoras de estilos profesionales)
          </div>

          <button className="create-space-btn-left" onClick={onShowCreateRoom} title="Crear un espacio">
            <span className="create-icon">+</span>
            <span className="create-text-left">Crear un espacio</span>
          </button>
        </div>

        <div className="sidebar-footer-left">
          <button className="settings-btn" onClick={() => setShowAdminMenu(!showAdminMenu)} title="Configuración">
            <svg className="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m0-18a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2 2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zm0 18a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2zM1 12h6m6 0h6M1 12a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2zm18 0a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z"></path>
            </svg>
          </button>
          <button className="logout-btn-icon" onClick={onLogout} title="Cerrar sesión">
            <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* Botón de cerrar sesión */}
      <div className="logout-section">
        <button className="logout-btn" onClick={onLogout}>
          <FaSignOutAlt style={{marginRight:6}}/> Cerrar sesión
        </button>
=======
      {/* Columna derecha */}
      <div className="sidebar-right">
        <div className="search-section">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sort-section">
            <span className="sort-label">Ordenar por</span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="conversations-container">
          {filteredConversations.map((conversation) => {
            // Buscar el usuario en userList para obtener su picture
            const userInfo = userList.find(u => u === conversation.name);
            const userPicture = user?.picture; // Aquí deberías obtener la picture del usuario específico

            return (
              <div
                key={conversation.id}
                className={`conversation-item ${conversation.name === user?.username ? 'selected' : ''} ${isGroup ? 'room-user' : ''}`}
                onClick={() => {
                  if (isGroup) {
                    return;
                  }
                  onUserSelect(conversation.name);
                }}
                style={{
                  cursor: isGroup ? 'default' : 'pointer',
                  opacity: isGroup ? 0.7 : 1
                }}
                title={isGroup ? 'Usuarios en la sala (no seleccionable)' : 'Hacer clic para chatear'}
              >
                {userPicture ? (
                  <img src={userPicture} alt={conversation.name} className="conversation-avatar-img" />
                ) : (
                  <div className="conversation-avatar">
                    {conversation.avatar}
                  </div>
                )}
                <div className="conversation-info">
                  <div className="conversation-header">
                    <div className="conversation-name">{conversation.name}</div>
                    <div className="conversation-time">{conversation.time}</div>
                  </div>
                  <div className="conversation-preview">
                    <span className="preview-text">{conversation.lastMessage}</span>
                    {conversation.unread > 0 && (
                      <div className="unread-badge">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
>>>>>>> b37357b (mejoras de estilos profesionales)
      </div>
    </div>
  );
};

export default Sidebar;
