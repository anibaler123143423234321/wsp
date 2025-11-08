import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaTimes, FaUser, FaComments, FaInfoCircle, FaSearch, FaGlobe, FaLink } from 'react-icons/fa';
import './Modal.css';
import './CreateConversationModal.css';
import apiService from '../../apiService';

const CreateConversationModal = ({
  isOpen,
  onClose,
  onCreateConversation,
  userList,
  currentUser
}) => {
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [conversationName, setConversationName] = useState('');
  const [error, setError] = useState('');
  const [searchUser1, setSearchUser1] = useState('');
  const [searchUser2, setSearchUser2] = useState('');
  const [pageUser1, setPageUser1] = useState(1);
  const [pageUser2, setPageUser2] = useState(1);
  const [userSource, setUserSource] = useState('connected'); // 'connected' o 'backend'
  const [backendUsers, setBackendUsers] = useState([]);
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [loadingBackendUsers, setLoadingBackendUsers] = useState(false);
  const debounceTimer1 = useRef(null);
  const debounceTimer2 = useRef(null);
  const ITEMS_PER_PAGE = 10;
  const DEBOUNCE_DELAY = 500; // 500ms de delay

  // Obtener usuarios según la fuente seleccionada
  const sourceUsers = useMemo(() => {
    if (userSource === 'backend') {
      return backendUsers;
    }
    return userList;
  }, [userSource, userList, backendUsers]);

  // Filtrar usuarios para excluir al usuario actual
  const availableUsers = useMemo(() => {
    return sourceUsers.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== currentUser?.username;
    });
  }, [sourceUsers, currentUser]);

  // Cargar usuarios del backend cuando se abre el modal
  useEffect(() => {
    if (isOpen && userSource === 'backend' && backendUsers.length === 0) {
      loadBackendUsers();
    }
  }, [isOpen, userSource]);

  // Cargar usuarios del backend
  const loadBackendUsers = async () => {
    setLoadingBackendUsers(true);
    try {
      // Usar tamaño de página más pequeño para evitar problemas de paginación
      const users = await apiService.getUsersFromBackend(0, 10);
      setBackendUsers(users);
    } catch (err) {
      console.error('Error al cargar usuarios del backend:', err);
      setError('Error al cargar usuarios del backend');
    } finally {
      setLoadingBackendUsers(false);
    }
  };

  // Función para buscar usuarios en el backend con debounce
  const handleSearchUser1 = (value) => {
    setSearchUser1(value);
    setPageUser1(1);

    // Limpiar timer anterior
    if (debounceTimer1.current) {
      clearTimeout(debounceTimer1.current);
    }

    // Si está vacío, limpiar resultados de búsqueda
    if (!value.trim()) {
      setSearchResults1([]);
      return;
    }

    // Solo buscar en backend si estamos en modo "Listado General"
    if (userSource !== 'backend') {
      return;
    }

    // Establecer nuevo timer
    debounceTimer1.current = setTimeout(async () => {
      try {
        const results = await apiService.searchUsersFromBackend(value, 0, 10);
        setSearchResults1(results);
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      }
    }, DEBOUNCE_DELAY);
  };

  // Función para buscar usuarios en el backend con debounce (Usuario 2)
  const handleSearchUser2 = (value) => {
    setSearchUser2(value);
    setPageUser2(1);

    // Limpiar timer anterior
    if (debounceTimer2.current) {
      clearTimeout(debounceTimer2.current);
    }

    // Si está vacío, limpiar resultados de búsqueda
    if (!value.trim()) {
      setSearchResults2([]);
      return;
    }

    // Solo buscar en backend si estamos en modo "Listado General"
    if (userSource !== 'backend') {
      return;
    }

    // Establecer nuevo timer
    debounceTimer2.current = setTimeout(async () => {
      try {
        const results = await apiService.searchUsersFromBackend(value, 0, 10);
        setSearchResults2(results);
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      }
    }, DEBOUNCE_DELAY);
  };

  useEffect(() => {
    if (!isOpen) {
      // Limpiar el modal cuando se cierra
      setSelectedUser1('');
      setSelectedUser2('');
      setConversationName('');
      setError('');
      setSearchUser1('');
      setSearchUser2('');
      setPageUser1(1);
      setPageUser2(1);
      setUserSource('connected');
      setSearchResults1([]);
      setSearchResults2([]);
    }
  }, [isOpen]);

  // Generar nombre automático cuando se seleccionan ambos usuarios
  useEffect(() => {
    if (selectedUser1 && selectedUser2) {
      // Combinar todas las fuentes de usuarios para buscar
      const allUsers = [...sourceUsers, ...searchResults1, ...searchResults2];

      // Buscar los objetos de usuario completos
      const user1Obj = allUsers.find(u => {
        const username = typeof u === 'string' ? u : u.username;
        return username === selectedUser1;
      });
      const user2Obj = allUsers.find(u => {
        const username = typeof u === 'string' ? u : u.username;
        return username === selectedUser2;
      });

      // Función para obtener el nombre completo
      const getFullName = (userObj) => {
        if (typeof userObj === 'object' && userObj.nombre && userObj.apellido) {
          return `${userObj.nombre} ${userObj.apellido}`;
        }
        return typeof userObj === 'string' ? userObj : userObj?.username || '';
      };

      const name1 = getFullName(user1Obj);
      const name2 = getFullName(user2Obj);

      // 🔥 Si uno de los usuarios es el usuario actual, mostrar solo el nombre del otro
      // Obtener el nombre completo del usuario actual
      const currentUserFullName = currentUser?.nombre && currentUser?.apellido
        ? `${currentUser.nombre} ${currentUser.apellido}`
        : currentUser?.username;

      console.log('🔍 DEBUG CreateConversationModal:');
      console.log('  - currentUserFullName:', currentUserFullName);
      console.log('  - name1:', name1);
      console.log('  - name2:', name2);

      if (currentUserFullName === name1) {
        // El usuario actual es user1, mostrar solo user2
        console.log('  ✅ Usuario actual es user1, mostrando solo:', name2);
        setConversationName(name2);
      } else if (currentUserFullName === name2) {
        // El usuario actual es user2, mostrar solo user1
        console.log('  ✅ Usuario actual es user2, mostrando solo:', name1);
        setConversationName(name1);
      } else {
        // Ninguno es el usuario actual (admin creando conversación entre otros)
        console.log('  ✅ Admin creando entre otros, mostrando:', `${name1} ↔ ${name2}`);
        setConversationName(`${name1} ↔ ${name2}`);
      }
    } else {
      // Limpiar el nombre si se deselecciona algún usuario
      setConversationName('');
    }
  }, [selectedUser1, selectedUser2, sourceUsers, searchResults1, searchResults2, currentUser]);

  // Filtrar usuarios para el primer select con búsqueda
  const filteredUsers1 = useMemo(() => {
    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults1.length > 0) {
      return searchResults1;
    }

    // Si no hay búsqueda, usar usuarios disponibles
    if (!searchUser1) return availableUsers;

    // Búsqueda local en usuarios disponibles
    return availableUsers.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      const nombre = typeof user === 'object' ? user.nombre : '';
      const apellido = typeof user === 'object' ? user.apellido : '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      const search = searchUser1.toLowerCase();

      return username.toLowerCase().includes(search) || fullName.includes(search);
    });
  }, [availableUsers, searchUser1, searchResults1]);

  // Filtrar usuarios para el segundo select con búsqueda
  const filteredUsers2 = useMemo(() => {
    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults2.length > 0) {
      return searchResults2.filter(user => {
        const username = typeof user === 'string' ? user : user.username;
        return username !== selectedUser1;
      });
    }

    // Si no hay búsqueda, usar usuarios disponibles
    const filtered = availableUsers.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== selectedUser1;
    });

    if (!searchUser2) return filtered;

    // Búsqueda local en usuarios disponibles
    return filtered.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      const nombre = typeof user === 'object' ? user.nombre : '';
      const apellido = typeof user === 'object' ? user.apellido : '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      const search = searchUser2.toLowerCase();

      return username.toLowerCase().includes(search) || fullName.includes(search);
    });
  }, [availableUsers, selectedUser1, searchUser2, searchResults2]);

  // Paginación para usuario 1
  const paginatedUsers1 = useMemo(() => {
    const startIndex = (pageUser1 - 1) * ITEMS_PER_PAGE;
    return filteredUsers1.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers1, pageUser1]);

  const totalPagesUser1 = Math.ceil(filteredUsers1.length / ITEMS_PER_PAGE);

  // Paginación para usuario 2
  const paginatedUsers2 = useMemo(() => {
    const startIndex = (pageUser2 - 1) * ITEMS_PER_PAGE;
    return filteredUsers2.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers2, pageUser2]);

  const totalPagesUser2 = Math.ceil(filteredUsers2.length / ITEMS_PER_PAGE);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser1 || !selectedUser2) {
      setError('Debes seleccionar dos usuarios');
      return;
    }

    if (selectedUser1 === selectedUser2) {
      setError('Debes seleccionar dos usuarios diferentes');
      return;
    }

    // Obtener los nombres completos de los usuarios seleccionados
    const getFullNameForUser = (username) => {
      // Buscar en searchResults primero
      let userObj = searchResults1.find(u => (typeof u === 'string' ? u : u.username) === username);
      if (!userObj) {
        userObj = searchResults2.find(u => (typeof u === 'string' ? u : u.username) === username);
      }
      // Si no está en searchResults, buscar en sourceUsers
      if (!userObj) {
        userObj = sourceUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
      }

      // Si encontramos el objeto y tiene nombre y apellido, retornar nombre completo
      if (userObj && typeof userObj === 'object' && userObj.nombre && userObj.apellido) {
        return `${userObj.nombre} ${userObj.apellido}`;
      }
      // Si no, retornar el username
      return username;
    };

    const user1FullName = getFullNameForUser(selectedUser1);
    const user2FullName = getFullNameForUser(selectedUser2);

    onCreateConversation({
      user1: user1FullName,
      user2: user2FullName,
      name: conversationName
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="conversation-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="conversation-modal-header">
          <div className="flex items-center gap-2">
            <div className="icon-wrapper">
              <FaComments className="text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Crear Conversación Individual</h2>
              <p className="text-xs text-gray-400">Asigna una conversación entre dos usuarios</p>
            </div>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="conversation-modal-body">
            {error && (
              <div className="error-banner">
                <FaInfoCircle className="text-lg" />
                <span>{error}</span>
              </div>
            )}

            {/* Selector de fuente de usuarios */}
            <div className="user-source-selector">
              <label className="section-label">Seleccionar usuarios de:</label>
              <div className="source-buttons">
                <button
                  type="button"
                  className={`source-btn ${userSource === 'connected' ? 'active' : ''}`}
                  onClick={() => {
                    setUserSource('connected');
                    setSelectedUser1('');
                    setSelectedUser2('');
                    setSearchUser1('');
                    setSearchUser2('');
                    setPageUser1(1);
                    setPageUser2(1);
                  }}
                  disabled={loadingBackendUsers}
                >
                  <FaLink className="source-icon" />
                  Usuarios Conectados
                </button>
                <button
                  type="button"
                  className={`source-btn ${userSource === 'backend' ? 'active' : ''}`}
                  onClick={() => {
                    setUserSource('backend');
                    setSelectedUser1('');
                    setSelectedUser2('');
                    setSearchUser1('');
                    setSearchUser2('');
                    setPageUser1(1);
                    setPageUser2(1);
                  }}
                  disabled={loadingBackendUsers}
                >
                  <FaGlobe className="source-icon" />
                  {loadingBackendUsers ? 'Cargando...' : 'Listado General'}
                </button>
              </div>
            </div>

            {/* Usuario 1 */}
            <div className="user-selection-card">
              <div className="card-header">
                <FaUser className="text-emerald-400" />
                <h3 className="text-base font-medium text-white">Primer Usuario</h3>
              </div>

              <div className="card-body">
                {/* Búsqueda */}
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchUser1}
                    onChange={(e) => handleSearchUser1(e.target.value)}
                    className="search-input"
                  />
                </div>

                {/* Lista de usuarios */}
                <div className="modal-users-list">
                  {loadingBackendUsers && userSource === 'backend' ? (
                    <div className="modal-empty-state">
                      <p>⏳ Cargando usuarios...</p>
                    </div>
                  ) : paginatedUsers1.length === 0 ? (
                    <div className="modal-empty-state">
                      <p>No se encontraron usuarios</p>
                    </div>
                  ) : (
                    paginatedUsers1.map((user, index) => {
                      const username = typeof user === 'string' ? user : user.username;
                      const displayName = typeof user === 'object' && user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido}`
                        : username;
                      const isSelected = selectedUser1 === username;

                      return (
                        <div
                          key={index}
                          className={`modal-user-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedUser1(isSelected ? null : username)}
                        >
                          <div className="modal-user-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="modal-user-info">
                            <p className="modal-user-name">{displayName}</p>
                          </div>
                          {isSelected && (
                            <div className="modal-check-icon">✓</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginación */}
                {totalPagesUser1 > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      type="button"
                      onClick={() => setPageUser1(prev => Math.max(1, prev - 1))}
                      disabled={pageUser1 === 1}
                      className="pagination-btn"
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      {pageUser1} / {totalPagesUser1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageUser1(prev => Math.min(totalPagesUser1, prev + 1))}
                      disabled={pageUser1 === totalPagesUser1}
                      className="pagination-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Usuario 2 */}
            <div className="user-selection-card">
              <div className="card-header">
                <FaUser className="text-emerald-400" />
                <h3 className="text-base font-medium text-white">Segundo Usuario</h3>
              </div>

              <div className="card-body">
                {/* Búsqueda */}
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchUser2}
                    onChange={(e) => handleSearchUser2(e.target.value)}
                    className="search-input"
                  />
                </div>

                {/* Lista de usuarios */}
                <div className="modal-users-list">
                  {loadingBackendUsers && userSource === 'backend' ? (
                    <div className="modal-empty-state">
                      <p>⏳ Cargando usuarios...</p>
                    </div>
                  ) : paginatedUsers2.length === 0 ? (
                    <div className="modal-empty-state">
                      <p>No se encontraron usuarios</p>
                    </div>
                  ) : (
                    paginatedUsers2.map((user, index) => {
                      const username = typeof user === 'string' ? user : user.username;
                      const displayName = typeof user === 'object' && user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido}`
                        : username;
                      const isSelected = selectedUser2 === username;

                      return (
                        <div
                          key={index}
                          className={`modal-user-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedUser2(isSelected ? null : username)}
                        >
                          <div className="modal-user-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="modal-user-info">
                            <p className="modal-user-name">{displayName}</p>
                          </div>
                          {isSelected && (
                            <div className="modal-check-icon">✓</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginación */}
                {totalPagesUser2 > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      type="button"
                      onClick={() => setPageUser2(prev => Math.max(1, prev - 1))}
                      disabled={pageUser2 === 1}
                      className="pagination-btn"
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      {pageUser2} / {totalPagesUser2}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageUser2(prev => Math.min(totalPagesUser2, prev + 1))}
                      disabled={pageUser2 === totalPagesUser2}
                      className="pagination-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre de la conversación */}
            <div className="conversation-name-section">
              <label className="section-label">
                <FaComments className="text-emerald-400" />
                Nombre de la Conversación
              </label>
              <input
                type="text"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                placeholder="Selecciona ambos usuarios para generar el nombre..."
                className="conversation-name-input"
                required
              />
              <p className="input-hint">
                {conversationName ? (
                  <>
                    ✏️ Puedes editar el nombre si lo deseas
                  </>
                ) : (
                  <>
                    El nombre se genera automáticamente al seleccionar ambos usuarios
                  </>
                )}
              </p>
            </div>

            {/* Info */}
            <div className="info-banner">
              <FaInfoCircle className="text-base text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm mb-0.5">Conversación Administrada</p>
                <p className="text-xs text-gray-400">
                  Los usuarios podrán chatear entre sí, pero solo el administrador puede eliminar la conversación.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="conversation-modal-footer">
            <button
              type="button"
              className="footer-btn cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="footer-btn create-btn"
              disabled={!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2}
            >
              <FaComments />
              Crear Conversación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateConversationModal;

