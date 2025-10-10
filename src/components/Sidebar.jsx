import React, { useState } from 'react';
import { FaCog, FaSignOutAlt, FaSignInAlt, FaPlus, FaDoorOpen, FaUserFriends, FaClipboardList } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({
  user,
  userList,
  groupList,
  assignedConversations = [],
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
  onShowManageConversations,
  onShowManageUsers,
  onShowSystemConfig,
  loadingAdminRooms,
  unreadMessages,
  onToggleSidebar
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Crear conversaciones de ejemplo con datos más realistas
  const createConversations = () => {
    const displayUsers = isGroup && roomUsers ? roomUsers : userList;

    // Crear conversaciones de usuarios normales
    const userConversations = displayUsers.map((userItem, index) => {
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
        avatar: userName.charAt(0).toUpperCase(),
        isAssigned: false
      };
    });

    // Agregar conversaciones asignadas (solo si no estamos en una sala)
    if (!isGroup && assignedConversations && assignedConversations.length > 0) {
      // Obtener el nombre completo del usuario actual
      const currentUserFullName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;

      const assignedConvs = assignedConversations.map((conv) => {
        // Encontrar el otro usuario en la conversación
        const otherUserName = conv.participants?.find(p => p !== currentUserFullName) || 'Usuario';

        // Buscar la información completa del otro usuario en userList
        let otherUserInfo = null;
        if (userList && userList.length > 0) {
          otherUserInfo = userList.find(u => {
            const uName = typeof u === 'string' ? u : u.username;
            const uFullName = typeof u === 'object' && u.nombre && u.apellido
              ? `${u.nombre} ${u.apellido}`
              : uName;
            return uFullName === otherUserName || uName === otherUserName;
          });
        }

        // Obtener el picture del otro usuario
        const otherUserPicture = typeof otherUserInfo === 'object' ? otherUserInfo.picture : null;

        return {
          id: `assigned-${conv.id}`,
          name: otherUserName,
          displayName: conv.name || otherUserName,
          picture: otherUserPicture,
          lastMessage: 'Conversación asignada',
          time: new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: otherUserName.charAt(0).toUpperCase(),
          isAssigned: true,
          conversationData: conv
        };
      });

      // Combinar y eliminar duplicados (priorizar conversaciones asignadas)
      const allConversations = [...assignedConvs];
      userConversations.forEach(userConv => {
        // Comparar tanto con name como con displayName para evitar duplicados
        const isDuplicate = assignedConvs.some(assignedConv =>
          assignedConv.name === userConv.name ||
          assignedConv.name === userConv.displayName ||
          assignedConv.displayName === userConv.displayName
        );
        if (!isDuplicate) {
          allConversations.push(userConv);
        }
      });

      return allConversations;
    }

    return userConversations;
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

          {(user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && (
            <>
              <button className="create-space-btn-left" onClick={onShowCreateRoom} title="Crear Sala Temporal">
                <FaPlus className="create-icon-left" />
                <span className="create-text-left">Crear Sala Temporal</span>
              </button>

              <button className="join-room-btn-left" onClick={onShowJoinRoom} title="Unirse a sala">
                <FaSignInAlt className="join-icon-left" />
                <span className="join-text-left">Unirse a sala</span>
              </button>

              <button className="my-rooms-btn-left" onClick={onShowAdminRooms} title="Mis salas">
                <FaDoorOpen className="my-rooms-icon-left" />
                <span className="my-rooms-text-left">Mis salas</span>
              </button>

              <button className="create-conversation-btn-left" onClick={onShowCreateConversation} title="Crear conversación entre usuarios">
                <FaUserFriends className="create-conversation-icon-left" />
                <span className="create-conversation-text-left">Asignar Chat</span>
              </button>

              <button className="manage-conversations-btn-left" onClick={onShowManageConversations} title="Gestionar conversaciones asignadas">
                <FaClipboardList className="manage-conversations-icon-left" />
                <span className="manage-conversations-text-left">Gestionar Chats</span>
              </button>
            </>
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
          {filteredConversations.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px'
            }}>
              {!isAdmin && !isGroup ? (
                <>
                  <p>No tienes conversaciones asignadas</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    Espera a que un administrador te asigne una conversación
                  </p>
                </>
              ) : (
                <p>No hay usuarios conectados</p>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              return (
                <div
                  key={conversation.id}
                  className={`conversation-item ${conversation.name === user?.username ? 'selected' : ''} ${isGroup ? 'room-user' : ''} ${conversation.isAssigned ? 'assigned-conversation' : ''}`}
                  onClick={() => {
                    if (isGroup) {
                      return;
                    }
                    onUserSelect(conversation.name);
                    // Cerrar sidebar en mobile después de seleccionar usuario
                    if (onToggleSidebar && window.innerWidth <= 600) {
                      onToggleSidebar();
                    }
                  }}
                  style={{
                    cursor: isGroup ? 'default' : 'pointer',
                    opacity: isGroup ? 0.7 : 1,
                    borderLeft: conversation.isAssigned ? '4px solid #10b981' : 'none'
                  }}
                  title={isGroup ? 'Usuarios en la sala (no seleccionable)' : conversation.isAssigned ? 'Conversación asignada - Hacer clic para chatear' : 'Hacer clic para chatear'}
                >
                  {conversation.picture ? (
                    <img src={conversation.picture} alt={conversation.name} className="conversation-avatar-img" />
                  ) : (
                    <div className="conversation-avatar" style={{
                      backgroundColor: conversation.isAssigned ? '#10b981' : undefined
                    }}>
                      {conversation.avatar}
                    </div>
                  )}
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <div className="conversation-name">
                        {conversation.displayName || conversation.name}
                        {conversation.isAssigned && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#10b981' }}>✓ Asignado</span>}
                      </div>
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
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
