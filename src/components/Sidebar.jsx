import React, { useState } from 'react';
import { FaCog, FaSignOutAlt, FaSignInAlt, FaPlus, FaDoorOpen } from 'react-icons/fa';
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

    return displayUsers.map((userItem, index) => {
      // Manejar tanto strings (usuarios normales) como objetos (usuarios de sala con info completa)
      const userName = typeof userItem === 'string' ? userItem : userItem.username;
      const userPicture = typeof userItem === 'object' ? userItem.picture : null;
      const userNombre = typeof userItem === 'object' ? userItem.nombre : null;
      const userApellido = typeof userItem === 'object' ? userItem.apellido : null;

      return {
        id: `user-${userName}`,
        name: userName,
        displayName: userNombre && userApellido ? `${userNombre} ${userApellido}` : userName,
        picture: userPicture,
        lastMessage: isGroup ? 'Usuario en sala' : 'Haz clic para chatear',
        time: '16:45',
        unread: !isGroup && unreadMessages[`user-${userName}`] ? unreadMessages[`user-${userName}`] : 0,
        avatar: userName.charAt(0).toUpperCase()
      };
    });
  };

  const conversations = createConversations();

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-list">
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
          </div>

          <button className="create-space-btn-left" onClick={onShowCreateRoom} title="Crear un espacio">
            <FaPlus className="create-icon-left" />
            <span className="create-text-left">Crear un espacio</span>
          </button>

          <button className="join-room-btn-left" onClick={onShowJoinRoom} title="Unirse a sala">
            <FaSignInAlt className="join-icon-left" />
            <span className="join-text-left">Unirse a sala</span>
          </button>

          {isAdmin && (
            <button className="my-rooms-btn-left" onClick={onShowAdminRooms} title="Mis salas">
              <FaDoorOpen className="my-rooms-icon-left" />
              <span className="my-rooms-text-left">Mis salas</span>
            </button>
          )}
        </div>

        <div className="sidebar-footer-left">
          <button className="settings-btn" onClick={() => setShowAdminMenu(!showAdminMenu)} title="Configuración">
            <FaCog className="settings-icon" />
          </button>
          <button className="logout-btn-icon" onClick={onLogout} title="Cerrar sesión">
            <FaSignOutAlt className="logout-icon" />
          </button>
        </div>
      </div>

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
                {conversation.picture ? (
                  <img src={conversation.picture} alt={conversation.name} className="conversation-avatar-img" />
                ) : (
                  <div className="conversation-avatar">
                    {conversation.avatar}
                  </div>
                )}
                <div className="conversation-info">
                  <div className="conversation-header">
                    <div className="conversation-name">{conversation.displayName || conversation.name}</div>
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
      </div>
    </div>
  );
};

export default Sidebar;
