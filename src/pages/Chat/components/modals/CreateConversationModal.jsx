import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaTimes, FaUser, FaComments, FaInfoCircle, FaSearch, FaCheck } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';
import './CreateConversationModal.css';
import apiService from "../../../../apiService";

const CreateConversationModal = ({
  isOpen,
  onClose,
  onCreateConversation,
  currentUser
}) => {
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [selectedUser1Obj, setSelectedUser1Obj] = useState(null); //  Objeto completo del usuario 1
  const [selectedUser2Obj, setSelectedUser2Obj] = useState(null); //  Objeto completo del usuario 2
  const [conversationName, setConversationName] = useState('');
  const [error, setError] = useState('');
  const [searchUser1, setSearchUser1] = useState('');
  const [searchUser2, setSearchUser2] = useState('');
  const [pageUser1, setPageUser1] = useState(1);
  const [pageUser2, setPageUser2] = useState(1);
  const [selectedSede, setSelectedSede] = useState('CHICLAYO_PIURA'); //  Sede seleccionada en los botones
  const [sedeUser1, setSedeUser1] = useState('CHICLAYO_PIURA'); //  Sede del primer usuario
  const [sedeUser2, setSedeUser2] = useState('CHICLAYO_PIURA'); //  Sede del segundo usuario
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [loadingBackendUsers, setLoadingBackendUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); //  Estado para evitar doble envío
  const [cacheVersion, setCacheVersion] = useState(0); //  Para forzar re-render cuando cambie la caché
  const debounceTimer1 = useRef(null);
  const debounceTimer2 = useRef(null);

  //  Caché de usuarios por sede para evitar recargas innecesarias
  const usersCache = useRef({
    CHICLAYO_PIURA: [],
    LIMA: []
  });

  const ITEMS_PER_PAGE = 10;
  const DEBOUNCE_DELAY = 500; // 500ms de delay

  //  Obtener usuarios disponibles para el primer contenedor según su sede
  const availableUsers1 = useMemo(() => {
    // Usar la caché de la sede del primer usuario
    const usersFromSede = usersCache.current[sedeUser1] || [];

    return usersFromSede.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== currentUser?.username;
    });
  }, [sedeUser1, currentUser, cacheVersion]);

  //  Obtener usuarios disponibles para el segundo contenedor según su sede
  const availableUsers2 = useMemo(() => {
    // Usar la caché de la sede del segundo usuario
    const usersFromSede = usersCache.current[sedeUser2] || [];

    return usersFromSede.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== currentUser?.username;
    });
  }, [sedeUser2, currentUser, cacheVersion]);

  // Cargar usuarios del backend cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadBackendUsers();
    }
  }, [isOpen]); //  Solo cargar cuando se abre el modal, NO cuando cambia la sede

  // 🔥 Cargar usuarios cuando cambia la sede
  useEffect(() => {
    if (isOpen) {
      loadBackendUsers();
    }
  }, [sedeUser1, sedeUser2]);

  // Cargar usuarios del backend para ambos contenedores
  const loadBackendUsers = async () => {
    //  Cargar usuarios para la sede del primer usuario si no hay caché
    if (usersCache.current[sedeUser1].length === 0) {
      setLoadingBackendUsers(true);
      try {
        const users = await apiService.getUsersFromBackend(0, 10, sedeUser1);
        usersCache.current[sedeUser1] = users;
        setCacheVersion(prev => prev + 1);
      } catch (err) {
        console.error('Error al cargar usuarios del backend:', err);
        setError('Error al cargar usuarios del backend');
      } finally {
        setLoadingBackendUsers(false);
      }
    }

    //  Cargar usuarios para la sede del segundo usuario si no hay caché
    if (usersCache.current[sedeUser2].length === 0) {
      setLoadingBackendUsers(true);
      try {
        const users = await apiService.getUsersFromBackend(0, 10, sedeUser2);
        usersCache.current[sedeUser2] = users;
        setCacheVersion(prev => prev + 1);
      } catch (err) {
        console.error('Error al cargar usuarios del backend:', err);
        setError('Error al cargar usuarios del backend');
      } finally {
        setLoadingBackendUsers(false);
      }
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

    // Establecer nuevo timer
    debounceTimer1.current = setTimeout(async () => {
      try {
        //  Pasar la sede del primer usuario al método
        const results = await apiService.searchUsersFromBackend(value, 0, 10, sedeUser1);
        setSearchResults1(results);

        //  Actualizar caché con los nuevos usuarios encontrados (sin forzar re-render)
        const currentCache = usersCache.current[sedeUser1];
        const newUsers = results.filter(user => {
          const username = typeof user === 'string' ? user : user.username;
          return !currentCache.some(u => {
            const uname = typeof u === 'string' ? u : u.username;
            return uname === username;
          });
        });
        if (newUsers.length > 0) {
          usersCache.current[sedeUser1] = [...currentCache, ...newUsers];
          //  NO incrementar cacheVersion aquí para evitar afectar otros contenedores
        }
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

    // Establecer nuevo timer
    debounceTimer2.current = setTimeout(async () => {
      try {
        //  Pasar la sede del segundo usuario al método
        const results = await apiService.searchUsersFromBackend(value, 0, 10, sedeUser2);
        setSearchResults2(results);

        //  Actualizar caché con los nuevos usuarios encontrados (sin forzar re-render)
        const currentCache = usersCache.current[sedeUser2];
        const newUsers = results.filter(user => {
          const username = typeof user === 'string' ? user : user.username;
          return !currentCache.some(u => {
            const uname = typeof u === 'string' ? u : u.username;
            return uname === username;
          });
        });
        if (newUsers.length > 0) {
          usersCache.current[sedeUser2] = [...currentCache, ...newUsers];
          //  NO incrementar cacheVersion aquí para evitar afectar otros contenedores
        }
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      }
    }, DEBOUNCE_DELAY);
  };

  //  Actualizar sede de cada contenedor cuando cambia selectedSede
  useEffect(() => {
    // Solo actualizar la sede del primer usuario si NO hay usuario seleccionado
    if (!selectedUser1) {
      setSedeUser1(selectedSede);
    }
    // Solo actualizar la sede del segundo usuario si NO hay usuario seleccionado
    if (!selectedUser2) {
      setSedeUser2(selectedSede);
    }
  }, [selectedSede, selectedUser1, selectedUser2]);

  useEffect(() => {
    if (!isOpen) {
      // Limpiar el modal cuando se cierra
      setSelectedUser1('');
      setSelectedUser2('');
      setSelectedUser1Obj(null); //  Limpiar objeto del usuario 1
      setSelectedUser2Obj(null); //  Limpiar objeto del usuario 2
      setConversationName('');
      setError('');
      setSearchUser1('');
      setSearchUser2('');
      setPageUser1(1);
      setPageUser2(1);
      setSearchResults1([]);
      setSearchResults2([]);
      setIsSubmitting(false); //  Limpiar estado de envío
      setSedeUser1('CHICLAYO_PIURA'); //  Resetear sede del primer usuario
      setSedeUser2('CHICLAYO_PIURA'); //  Resetear sede del segundo usuario
    }
  }, [isOpen]);

  // Generar nombre automático cuando se seleccionan ambos usuarios
  useEffect(() => {
    if (selectedUser1 && selectedUser2 && selectedUser1Obj && selectedUser2Obj) {
      // Función para obtener el nombre completo
      const getFullName = (userObj) => {
        if (typeof userObj === 'object' && userObj.nombre && userObj.apellido) {
          return `${userObj.nombre} ${userObj.apellido}`;
        }
        return typeof userObj === 'string' ? userObj : userObj?.username || '';
      };

      const name1 = getFullName(selectedUser1Obj);
      const name2 = getFullName(selectedUser2Obj);

      //  Si uno de los usuarios es el usuario actual, mostrar solo el nombre del otro
      // Obtener el nombre completo del usuario actual
      const currentUserFullName = currentUser?.nombre && currentUser?.apellido
        ? `${currentUser.nombre} ${currentUser.apellido}`
        : currentUser?.username;

      // console.log('🔍 DEBUG CreateConversationModal:');
      // console.log('  - currentUserFullName:', currentUserFullName);
      // console.log('  - name1:', name1);
      // console.log('  - name2:', name2);

      if (currentUserFullName === name1) {
        // El usuario actual es user1, mostrar solo user2
        // console.log('  ✅ Usuario actual es user1, mostrando solo:', name2);
        setConversationName(name2);
      } else if (currentUserFullName === name2) {
        // El usuario actual es user2, mostrar solo user1
        // console.log('  ✅ Usuario actual es user2, mostrando solo:', name1);
        setConversationName(name1);
      } else {
        // Ninguno es el usuario actual (admin creando conversación entre otros)
        // console.log('  ✅ Admin creando entre otros, mostrando:', `${name1} ↔ ${name2}`);
        setConversationName(`${name1} ↔ ${name2}`);
      }
    } else {
      // Limpiar el nombre si se deselecciona algún usuario
      setConversationName('');
    }
  }, [selectedUser1, selectedUser2, selectedUser1Obj, selectedUser2Obj, currentUser]);

  // Filtrar usuarios para el primer select con búsqueda
  const filteredUsers1 = useMemo(() => {
    let users = [];

    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults1.length > 0) {
      users = searchResults1;
    } else if (!searchUser1) {
      // Si no hay búsqueda, usar usuarios disponibles del primer contenedor
      users = availableUsers1;
    } else {
      // Búsqueda local en usuarios disponibles del primer contenedor
      users = availableUsers1.filter(user => {
        const username = typeof user === 'string' ? user : user.username;
        const nombre = typeof user === 'object' ? user.nombre : '';
        const apellido = typeof user === 'object' ? user.apellido : '';
        const fullName = `${nombre} ${apellido}`.toLowerCase();
        const search = searchUser1.toLowerCase();

        return username.toLowerCase().includes(search) || fullName.includes(search);
      });
    }

    //  Si hay un usuario seleccionado y NO está en la lista, agregarlo al inicio
    if (selectedUser1Obj) {
      const username = typeof selectedUser1Obj === 'string' ? selectedUser1Obj : selectedUser1Obj.username;
      const isInList = users.some(u => {
        const uname = typeof u === 'string' ? u : u.username;
        return uname === username;
      });

      if (!isInList) {
        users = [selectedUser1Obj, ...users];
      }
    }

    return users;
  }, [availableUsers1, searchUser1, searchResults1, selectedUser1Obj]);

  // Filtrar usuarios para el segundo select con búsqueda
  const filteredUsers2 = useMemo(() => {
    let users = [];

    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults2.length > 0) {
      users = searchResults2.filter(user => {
        const username = typeof user === 'string' ? user : user.username;
        return username !== selectedUser1;
      });
    } else {
      // Si no hay búsqueda, usar usuarios disponibles del segundo contenedor
      const filtered = availableUsers2.filter(user => {
        const username = typeof user === 'string' ? user : user.username;
        return username !== selectedUser1;
      });

      if (!searchUser2) {
        users = filtered;
      } else {
        // Búsqueda local en usuarios disponibles del segundo contenedor
        users = filtered.filter(user => {
          const username = typeof user === 'string' ? user : user.username;
          const nombre = typeof user === 'object' ? user.nombre : '';
          const apellido = typeof user === 'object' ? user.apellido : '';
          const fullName = `${nombre} ${apellido}`.toLowerCase();
          const search = searchUser2.toLowerCase();

          return username.toLowerCase().includes(search) || fullName.includes(search);
        });
      }
    }

    //  Si hay un usuario seleccionado y NO está en la lista, agregarlo al inicio
    if (selectedUser2Obj) {
      const username = typeof selectedUser2Obj === 'string' ? selectedUser2Obj : selectedUser2Obj.username;
      const isInList = users.some(u => {
        const uname = typeof u === 'string' ? u : u.username;
        return uname === username;
      });

      if (!isInList) {
        users = [selectedUser2Obj, ...users];
      }
    }

    return users;
  }, [availableUsers2, selectedUser1, searchUser2, searchResults2, selectedUser2Obj]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    //  Evitar doble envío
    if (isSubmitting) {
      return;
    }

    if (!selectedUser1 || !selectedUser2) {
      setError('Debes seleccionar dos usuarios');
      return;
    }

    if (selectedUser1 === selectedUser2) {
      setError('Debes seleccionar dos usuarios diferentes');
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener los nombres completos de los usuarios seleccionados
      const getFullNameForUser = (username) => {
        // Buscar en searchResults primero
        let userObj = searchResults1.find(u => (typeof u === 'string' ? u : u.username) === username);
        if (!userObj) {
          userObj = searchResults2.find(u => (typeof u === 'string' ? u : u.username) === username);
        }
        // Si no está en searchResults, buscar en la caché de ambas sedes
        if (!userObj) {
          const allCachedUsers = [...usersCache.current.CHICLAYO_PIURA, ...usersCache.current.LIMA];
          userObj = allCachedUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
        }

        // Si encontramos el objeto y tiene nombre y apellido, retornar nombre completo
        if (userObj && typeof userObj === 'object' && userObj.nombre && userObj.apellido) {
          return `${userObj.nombre} ${userObj.apellido}`;
        }
        // Si no, retornar el username
        return username;
      };

      await onCreateConversation({
        user1: selectedUser1, // ENVIAMOS EL DNI A LA DB
        user2: selectedUser2, // ENVIAMOS EL DNI A LA DB
        name: conversationName
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Conversación Individual"
      icon={<FaComments />}
      onSubmit={handleSubmit}
      headerBgColor="#A50104"
      bodyBgColor={isDark ? '#111b21' : '#ffffff'}
      titleColor="#FFFFFF"
      maxWidth="1000px"
    >
      <div className="ccm-content">
        {error && (
          <div className="ccm-error-banner">
            <FaInfoCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Selector de sede */}
        <div className="ccm-sede-section">
          <label className="ccm-label">Buscar usuarios en:</label>
          <div className="ccm-sede-buttons">
            <button
              type="button"
              className={`ccm-sede-btn ${selectedSede === 'CHICLAYO_PIURA' ? 'active' : ''}`}
              onClick={() => {
                setSelectedSede('CHICLAYO_PIURA');
                setSearchUser1('');
                setSearchUser2('');
                setSearchResults1([]);
                setSearchResults2([]);
                setPageUser1(1);
                setPageUser2(1);
              }}
              disabled={loadingBackendUsers}
            >
              CHICLAYO / PIURA
            </button>
            <button
              type="button"
              className={`ccm-sede-btn ${selectedSede === 'LIMA' ? 'active' : ''}`}
              onClick={() => {
                setSelectedSede('LIMA');
                setSearchUser1('');
                setSearchUser2('');
                setSearchResults1([]);
                setSearchResults2([]);
                setPageUser1(1);
                setPageUser2(1);
              }}
              disabled={loadingBackendUsers}
            >
              LIMA
            </button>
          </div>
        </div>

        {/* Grid de 2 columnas */}
        <div className="ccm-users-grid">
          {/* Usuario 1 */}
          <div className="ccm-user-card">
            <div className="ccm-card-header">
              <FaUser size={12} />
              <span>Primer Usuario</span>
            </div>
            <div className="ccm-card-body">
              <div className="ccm-search-wrap">
                <FaSearch className="ccm-search-icon" />
                <input
                  type="text"
                  className="ccm-search-input"
                  placeholder="Buscar por nombre o usuario..."
                  value={searchUser1}
                  onChange={(e) => handleSearchUser1(e.target.value)}
                />
              </div>

              <div className="ccm-users-list">
                {loadingBackendUsers ? (
                  <div className="ccm-empty-state">⏳ Cargando usuarios...</div>
                ) : paginatedUsers1.length === 0 ? (
                  <div className="ccm-empty-state">No se encontraron usuarios</div>
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
                        className={`ccm-user-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUser1(null);
                            setSelectedUser1Obj(null);
                          } else {
                            setSelectedUser1(username);
                            setSelectedUser1Obj(user);
                          }
                        }}
                      >
                        <div className="ccm-user-avatar">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ccm-user-name">{displayName}</div>
                        {isSelected && (
                          <div className="ccm-check-icon"><FaCheck size={8} /></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {totalPagesUser1 > 1 && (
                <div className="ccm-pagination">
                  <button type="button" className="ccm-page-btn" onClick={() => setPageUser1(prev => Math.max(1, prev - 1))} disabled={pageUser1 === 1}>
                    ← Anterior
                  </button>
                  <span className="ccm-page-info">{pageUser1} / {totalPagesUser1}</span>
                  <button type="button" className="ccm-page-btn" onClick={() => setPageUser1(prev => Math.min(totalPagesUser1, prev + 1))} disabled={pageUser1 === totalPagesUser1}>
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usuario 2 */}
          <div className="ccm-user-card">
            <div className="ccm-card-header">
              <FaUser size={12} />
              <span>Segundo Usuario</span>
            </div>
            <div className="ccm-card-body">
              <div className="ccm-search-wrap">
                <FaSearch className="ccm-search-icon" />
                <input
                  type="text"
                  className="ccm-search-input"
                  placeholder="Buscar por nombre o usuario..."
                  value={searchUser2}
                  onChange={(e) => handleSearchUser2(e.target.value)}
                />
              </div>

              <div className="ccm-users-list">
                {loadingBackendUsers ? (
                  <div className="ccm-empty-state">⏳ Cargando usuarios...</div>
                ) : paginatedUsers2.length === 0 ? (
                  <div className="ccm-empty-state">No se encontraron usuarios</div>
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
                        className={`ccm-user-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUser2(null);
                            setSelectedUser2Obj(null);
                          } else {
                            setSelectedUser2(username);
                            setSelectedUser2Obj(user);
                          }
                        }}
                      >
                        <div className="ccm-user-avatar">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="ccm-user-name">{displayName}</div>
                        {isSelected && (
                          <div className="ccm-check-icon"><FaCheck size={8} /></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {totalPagesUser2 > 1 && (
                <div className="ccm-pagination">
                  <button type="button" className="ccm-page-btn" onClick={() => setPageUser2(prev => Math.max(1, prev - 1))} disabled={pageUser2 === 1}>
                    ← Anterior
                  </button>
                  <span className="ccm-page-info">{pageUser2} / {totalPagesUser2}</span>
                  <button type="button" className="ccm-page-btn" onClick={() => setPageUser2(prev => Math.min(totalPagesUser2, prev + 1))} disabled={pageUser2 === totalPagesUser2}>
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nombre de la conversación */}
        <div className="ccm-name-section">
          <label className="ccm-label">
            <FaComments style={{ color: '#A50104' }} />
            Nombre de la Conversación
          </label>
          <input
            type="text"
            className="ccm-name-input"
            value={conversationName}
            onChange={(e) => setConversationName(e.target.value)}
            placeholder="Selecciona ambos usuarios para generar el nombre..."
            required
          />
          <p className="ccm-hint">
            {conversationName
              ? '✏️ Puedes editar el nombre si lo deseas'
              : 'El nombre se genera automáticamente al seleccionar ambos usuarios'}
          </p>
        </div>

        {/* Info */}
        <div className="ccm-info-banner">
          <FaInfoCircle className="ccm-info-icon" />
          <div>
            <p className="ccm-info-title">Conversación Administrada</p>
            <p className="ccm-info-text">
              Los usuarios podrán chatear entre sí, pero solo el administrador puede eliminar la conversación.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="ccm-footer">
          <button type="button" className="ccm-btn cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="ccm-btn submit"
            disabled={!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2 || isSubmitting}
          >
            <FaComments size={12} />
            {isSubmitting ? 'Creando...' : 'Crear Conversación'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default CreateConversationModal;

