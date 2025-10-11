import React, { useState, useEffect } from 'react';
import { FaCog, FaSignOutAlt, FaSignInAlt, FaPlus, FaDoorOpen, FaUserFriends, FaClipboardList, FaTimes } from 'react-icons/fa';
import './Sidebar.css';
import apiService from '../apiService';

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
  onToggleSidebar,
  myActiveRooms = [],
  onRoomSelect,
  currentRoomCode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Buscar mensajes cuando cambia el término de búsqueda
  useEffect(() => {
    const searchMessages = async () => {
      if (!searchTerm || searchTerm.trim().length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        // Obtener el nombre completo del usuario actual
        const currentUserFullName = user?.nombre && user?.apellido
          ? `${user.nombre} ${user.apellido}`
          : user?.username || user?.email;

        // Buscar mensajes en el backend
        const results = await apiService.searchMessages(currentUserFullName, searchTerm);
        console.log('🔍 Resultados de búsqueda:', results);
        setSearchResults(results);
      } catch (error) {
        console.error('Error al buscar mensajes:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(() => {
      searchMessages();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, user]);

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
      const isOnline = typeof userItem === 'object' ? userItem.isOnline : true; // Por defecto true para usuarios normales

      return {
        id: `user-${userName}`,
        name: userName,
        displayName: userNombre && userApellido ? `${userNombre} ${userApellido}` : userName,
        picture: userPicture,
        lastMessage: isGroup
          ? (isOnline ? 'Conectado' : 'Desconectado')
          : 'Haz clic para chatear',
        time: '16:45',
        unread: !isGroup && unreadMessages[`user-${userName}`] ? unreadMessages[`user-${userName}`] : 0,
        avatar: userName.charAt(0).toUpperCase(),
        isAssigned: false,
        isOnline: isOnline
      };
    });

    // Agregar conversaciones asignadas (solo si no estamos en una sala)
    if (!isGroup && assignedConversations && assignedConversations.length > 0) {
      // Obtener el nombre completo del usuario actual
      const currentUserFullName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;

      const assignedConvs = assignedConversations.map((conv) => {
        // Verificar si el usuario actual está en la conversación
        const isUserInConversation = conv.participants?.includes(currentUserFullName);

        let displayName, targetUserName, targetUserPicture, avatarLetter;

        if (isUserInConversation) {
          // Si el usuario está en la conversación, mostrar solo el otro usuario
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

          targetUserName = otherUserName;
          displayName = otherUserName;
          targetUserPicture = typeof otherUserInfo === 'object' ? otherUserInfo.picture : null;
          avatarLetter = otherUserName.charAt(0).toUpperCase();
        } else {
          // Si el usuario NO está en la conversación (es admin viendo otras conversaciones)
          // Mostrar ambos participantes
          const participant1 = conv.participants?.[0] || 'Usuario 1';
          const participant2 = conv.participants?.[1] || 'Usuario 2';

          // Extraer solo los primeros nombres para el sidebar (más corto)
          const getFirstName = (fullName) => {
            const parts = fullName.split(' ');
            return parts.length > 2 ? `${parts[0]} ${parts[1]}` : parts[0];
          };

          const shortName1 = getFirstName(participant1);
          const shortName2 = getFirstName(participant2);

          // Usar el nombre de la conversación si existe, sino crear uno corto
          displayName = conv.name || `${shortName1} ↔ ${shortName2}`;
          targetUserName = participant1; // Para el onClick

          // Buscar información de ambos participantes
          let participant1Info = null;
          let participant2Info = null;

          if (userList && userList.length > 0) {
            participant1Info = userList.find(u => {
              const uName = typeof u === 'string' ? u : u.username;
              const uFullName = typeof u === 'object' && u.nombre && u.apellido
                ? `${u.nombre} ${u.apellido}`
                : uName;
              return uFullName === participant1 || uName === participant1;
            });

            participant2Info = userList.find(u => {
              const uName = typeof u === 'string' ? u : u.username;
              const uFullName = typeof u === 'object' && u.nombre && u.apellido
                ? `${u.nombre} ${u.apellido}`
                : uName;
              return uFullName === participant2 || uName === participant2;
            });
          }

          // Usar picture del segundo participante si existe, sino null
          targetUserPicture = typeof participant2Info === 'object' ? participant2Info.picture : null;

          // Crear iniciales de ambos participantes
          const initial1 = participant1.charAt(0).toUpperCase();
          const initial2 = participant2.charAt(0).toUpperCase();
          avatarLetter = `${initial1}${initial2}`; // Ejemplo: "DC" para Dagner y Carlos
        }

        return {
          id: `assigned-${conv.id}`,
          name: targetUserName,
          displayName: displayName,
          picture: targetUserPicture,
          lastMessage: 'Conversación asignada',
          time: new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: avatarLetter,
          isAssigned: true,
          conversationData: conv,
          isAdminView: !isUserInConversation // Flag para saber si es vista de admin
        };
      });

      // Combinar y eliminar duplicados (priorizar conversaciones asignadas)
      const allConversations = [...assignedConvs];

      // Crear un Set con todos los participantes de las conversaciones asignadas
      const participantsInAssignedConvs = new Set();
      assignedConvs.forEach(assignedConv => {
        if (assignedConv.conversationData && assignedConv.conversationData.participants) {
          assignedConv.conversationData.participants.forEach(participant => {
            participantsInAssignedConvs.add(participant);
          });
        }
      });

      userConversations.forEach(userConv => {
        // Verificar si este usuario está en alguna conversación asignada
        const isUserInAssignedConv = participantsInAssignedConvs.has(userConv.name) ||
                                      participantsInAssignedConvs.has(userConv.displayName);

        // Comparar tanto con name como con displayName para evitar duplicados
        const isDuplicate = assignedConvs.some(assignedConv =>
          assignedConv.name === userConv.name ||
          assignedConv.name === userConv.displayName ||
          assignedConv.displayName === userConv.displayName
        );

        // Solo agregar si NO es duplicado Y NO está en una conversación asignada
        if (!isDuplicate && !isUserInAssignedConv) {
          allConversations.push(userConv);
        }
      });

      return allConversations;
    }

    return userConversations;
  };

  const conversations = createConversations();

  // Si hay término de búsqueda, filtrar y combinar resultados
  let filteredConversations = conversations;

  if (searchTerm.trim().length > 0) {
    // Filtrar conversaciones por nombre
    const nameMatches = conversations.filter(conv =>
      conv.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Si hay resultados de búsqueda de mensajes, agregarlos
    if (searchResults.length > 0) {
      // Crear un Set con los nombres de las conversaciones que ya coinciden por nombre
      const nameMatchSet = new Set(nameMatches.map(conv => conv.name));

      // Agregar resultados de búsqueda de mensajes que NO estén ya en nameMatches
      const messageMatches = searchResults
        .filter(result => !nameMatchSet.has(result.user))
        .map((result, index) => {
          // Buscar si existe una conversación con este usuario para obtener su picture
          const existingConv = conversations.find(conv => conv.name === result.user);

          return {
            id: `search-${index}`,
            name: result.user,
            displayName: result.user,
            picture: existingConv?.picture || null,
            avatar: existingConv?.avatar || '👤',
            lastMessage: result.lastMessage?.text || '',
            lastMessageTime: result.lastMessage?.sentAt || new Date(),
            time: new Date(result.lastMessage?.sentAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            isSearchResult: true,
            matchedMessages: result.messages,
            isAssigned: existingConv?.isAssigned || false,
          };
        });

      // Combinar: primero los que coinciden por nombre, luego los que coinciden por mensaje
      filteredConversations = [...nameMatches, ...messageMatches];
    } else {
      // Solo hay coincidencias por nombre
      filteredConversations = nameMatches;
    }
  }

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
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
              >
                <FaTimes />
              </button>
            )}
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

        {/* Sección de Mis Salas Activas - Solo para ADMIN y JEFEPISO */}
        {!isGroup && (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') && myActiveRooms && myActiveRooms.length > 0 && (
          <div className="my-active-rooms-section" style={{
            padding: '10px 15px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              fontSize: '13px',
              fontWeight: '600',
              color: '#00a884',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaDoorOpen /> Mis Salas Activas
            </h4>
            <div className="active-rooms-list">
              {myActiveRooms.map((room) => (
                <div
                  key={room.id}
                  className={`room-item-sidebar ${currentRoomCode === room.roomCode ? 'selected' : ''}`}
                  onClick={() => onRoomSelect && onRoomSelect(room)}
                  style={{
                    padding: '8px 10px',
                    marginBottom: '5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: currentRoomCode === room.roomCode ? '#e7f3f0' : '#fff',
                    border: currentRoomCode === room.roomCode ? '1px solid #00a884' : '1px solid #e0e0e0',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentRoomCode !== room.roomCode) {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentRoomCode !== room.roomCode) {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#111' }}>
                        🏠 {room.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#667781', marginTop: '2px' }}>
                        {room.currentMembers}/{room.maxCapacity} usuarios
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: room.isActive ? '#00a884' : '#999' }}>
                      {room.isActive ? '🟢' : '🔴'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de conversaciones */}
        <div className="conversations-container">
          {isSearching ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#00a884',
              fontSize: '14px'
            }}>
              <p>🔍 Buscando mensajes...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px'
            }}>
              {searchTerm.trim().length > 0 ? (
                <p>No se encontraron resultados para "{searchTerm}"</p>
              ) : !isAdmin && !isGroup ? (
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

                    // Si es vista de admin, pasar la conversación completa
                    if (conversation.isAdminView && conversation.conversationData) {
                      onUserSelect(conversation.name, null, conversation.conversationData);
                    }
                    // Si es un resultado de búsqueda, pasar el ID del primer mensaje encontrado
                    else if (conversation.isSearchResult && conversation.matchedMessages?.length > 0) {
                      onUserSelect(conversation.name, conversation.matchedMessages[0].id);
                    } else {
                      onUserSelect(conversation.name);
                    }

                    // Cerrar sidebar en mobile después de seleccionar usuario
                    if (onToggleSidebar && window.innerWidth <= 600) {
                      onToggleSidebar();
                    }
                  }}
                  style={{
                    cursor: isGroup ? 'default' : 'pointer',
                    opacity: isGroup ? 0.7 : 1,
                    borderLeft: conversation.isAssigned
                      ? (conversation.isAdminView ? '4px solid #3b82f6' : '4px solid #10b981')
                      : 'none'
                  }}
                  title={
                    isGroup
                      ? 'Usuarios en la sala (no seleccionable)'
                      : conversation.isAdminView
                        ? 'Conversación entre otros usuarios - Hacer clic para ver'
                        : conversation.isAssigned
                          ? 'Conversación asignada - Hacer clic para chatear'
                          : 'Hacer clic para chatear'
                  }
                >
                  {conversation.picture ? (
                    <img src={conversation.picture} alt={conversation.name} className="conversation-avatar-img" />
                  ) : (
                    <div className="conversation-avatar" style={{
                      backgroundColor: conversation.isAdminView
                        ? '#3b82f6'
                        : conversation.isAssigned
                          ? '#10b981'
                          : undefined
                    }}>
                      {conversation.avatar}
                    </div>
                  )}
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <div className="conversation-name">
                        <span className="conversation-name-text">{conversation.displayName || conversation.name}</span>
                        {conversation.isAdminView ? (
                          <span className="admin-view-badge">👁️ Vista Admin</span>
                        ) : conversation.isAssigned ? (
                          <span className="assigned-badge">✓ Asignado</span>
                        ) : null}
                        {conversation.isSearchResult && (
                          <span className="search-result-badge">
                            🔍 {conversation.matchedMessages?.length || 0} mensaje{conversation.matchedMessages?.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="conversation-time">{conversation.time}</div>
                    </div>
                    <div className="conversation-preview">
                      <span className="preview-text">
                        {conversation.isSearchResult
                          ? `"${conversation.lastMessage.substring(0, 50)}${conversation.lastMessage.length > 50 ? '...' : ''}"`
                          : conversation.lastMessage
                        }
                      </span>
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
