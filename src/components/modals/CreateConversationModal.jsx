import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaTimes, FaUser, FaComments, FaInfoCircle, FaSearch, FaCheck } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';
import './CreateConversationModal.css';
import apiService from '../../apiService';

const CreateConversationModal = ({
  isOpen,
  onClose,
  onCreateConversation,
  currentUser
}) => {
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [selectedUser1Obj, setSelectedUser1Obj] = useState(null); // 🔥 Objeto completo del usuario 1
  const [selectedUser2Obj, setSelectedUser2Obj] = useState(null); // 🔥 Objeto completo del usuario 2
  const [conversationName, setConversationName] = useState('');
  const [error, setError] = useState('');
  const [searchUser1, setSearchUser1] = useState('');
  const [searchUser2, setSearchUser2] = useState('');
  const [pageUser1, setPageUser1] = useState(1);
  const [pageUser2, setPageUser2] = useState(1);
  const [selectedSede, setSelectedSede] = useState('CHICLAYO_PIURA'); // 🔥 Sede seleccionada en los botones
  const [sedeUser1, setSedeUser1] = useState('CHICLAYO_PIURA'); // 🔥 Sede del primer usuario
  const [sedeUser2, setSedeUser2] = useState('CHICLAYO_PIURA'); // 🔥 Sede del segundo usuario
  const [searchResults1, setSearchResults1] = useState([]);
  const [searchResults2, setSearchResults2] = useState([]);
  const [loadingBackendUsers, setLoadingBackendUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🔥 Estado para evitar doble envío
  const [cacheVersion, setCacheVersion] = useState(0); // 🔥 Para forzar re-render cuando cambie la caché
  const debounceTimer1 = useRef(null);
  const debounceTimer2 = useRef(null);

  // 🔥 Caché de usuarios por sede para evitar recargas innecesarias
  const usersCache = useRef({
    CHICLAYO_PIURA: [],
    LIMA: []
  });

  const ITEMS_PER_PAGE = 10;
  const DEBOUNCE_DELAY = 500; // 500ms de delay

  // 🔥 Obtener usuarios disponibles para el primer contenedor según su sede
  const availableUsers1 = useMemo(() => {
    // Usar la caché de la sede del primer usuario
    const usersFromSede = usersCache.current[sedeUser1] || [];

    return usersFromSede.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== currentUser?.username;
    });
  }, [sedeUser1, currentUser, cacheVersion]);

  // 🔥 Obtener usuarios disponibles para el segundo contenedor según su sede
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
  }, [isOpen]); // 🔥 Solo cargar cuando se abre el modal, NO cuando cambia la sede

  // Cargar usuarios del backend para ambos contenedores
  const loadBackendUsers = async () => {
    // 🔥 Cargar usuarios para la sede del primer usuario si no hay caché
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

    // 🔥 Cargar usuarios para la sede del segundo usuario si no hay caché
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
        // 🔥 Pasar la sede del primer usuario al método
        const results = await apiService.searchUsersFromBackend(value, 0, 10, sedeUser1);
        setSearchResults1(results);

        // 🔥 Actualizar caché con los nuevos usuarios encontrados (sin forzar re-render)
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
          // 🔥 NO incrementar cacheVersion aquí para evitar afectar otros contenedores
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
        // 🔥 Pasar la sede del segundo usuario al método
        const results = await apiService.searchUsersFromBackend(value, 0, 10, sedeUser2);
        setSearchResults2(results);

        // 🔥 Actualizar caché con los nuevos usuarios encontrados (sin forzar re-render)
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
          // 🔥 NO incrementar cacheVersion aquí para evitar afectar otros contenedores
        }
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      }
    }, DEBOUNCE_DELAY);
  };

  // 🔥 Actualizar sede de cada contenedor cuando cambia selectedSede
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
      setSelectedUser1Obj(null); // 🔥 Limpiar objeto del usuario 1
      setSelectedUser2Obj(null); // 🔥 Limpiar objeto del usuario 2
      setConversationName('');
      setError('');
      setSearchUser1('');
      setSearchUser2('');
      setPageUser1(1);
      setPageUser2(1);
      setSearchResults1([]);
      setSearchResults2([]);
      setIsSubmitting(false); // 🔥 Limpiar estado de envío
      setSedeUser1('CHICLAYO_PIURA'); // 🔥 Resetear sede del primer usuario
      setSedeUser2('CHICLAYO_PIURA'); // 🔥 Resetear sede del segundo usuario
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

    // 🔥 Si hay un usuario seleccionado y NO está en la lista, agregarlo al inicio
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

    // 🔥 Si hay un usuario seleccionado y NO está en la lista, agregarlo al inicio
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

    // 🔥 Evitar doble envío
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

      const user1FullName = getFullNameForUser(selectedUser1);
      const user2FullName = getFullNameForUser(selectedUser2);

      await onCreateConversation({
        user1: user1FullName,
        user2: user2FullName,
        name: conversationName
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Conversación Individual"
      icon={<FaComments />}
      onSubmit={handleSubmit}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
      maxWidth="1000px"
    >
      <div className="create-conversation-content">
        {error && (
          <div className="error-message" style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '15px',
            color: '#c00',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaInfoCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Selector de sede */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#000',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Buscar usuarios en:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
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
              style={{
                flex: 1,
                padding: '8px 16px',
                background: selectedSede === 'CHICLAYO_PIURA' ? '#A50104' : '#f0f0f0',
                color: selectedSede === 'CHICLAYO_PIURA' ? '#fff' : '#333',
                border: selectedSede === 'CHICLAYO_PIURA' ? '2px solid #A50104' : '2px solid #ddd',
                borderRadius: '6px',
                cursor: loadingBackendUsers ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                opacity: loadingBackendUsers ? 0.5 : 1
              }}
            >
              CHICLAYO / PIURA
            </button>
            <button
              type="button"
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
              style={{
                flex: 1,
                padding: '8px 16px',
                background: selectedSede === 'LIMA' ? '#A50104' : '#f0f0f0',
                color: selectedSede === 'LIMA' ? '#fff' : '#333',
                border: selectedSede === 'LIMA' ? '2px solid #A50104' : '2px solid #ddd',
                borderRadius: '6px',
                cursor: loadingBackendUsers ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                opacity: loadingBackendUsers ? 0.5 : 1
              }}
            >
              LIMA
            </button>
          </div>
        </div>

        {/* Grid de 2 columnas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Usuario 1 */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fafafa'
          }}>
            <div style={{
              background: '#A50104',
              padding: '10px 15px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaUser />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Primer Usuario</h3>
            </div>

            <div style={{ padding: '15px' }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999',
                  fontSize: '12px'
                }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o usuario..."
                  value={searchUser1}
                  onChange={(e) => handleSearchUser1(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    color: '#000'
                  }}
                />
              </div>

              {/* Lista de usuarios */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                {loadingBackendUsers ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                    <p>⏳ Cargando usuarios...</p>
                  </div>
                ) : paginatedUsers1.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
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
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUser1(null);
                            setSelectedUser1Obj(null);
                          } else {
                            setSelectedUser1(username);
                            setSelectedUser1Obj(user);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: isSelected ? '#fff5f5' : 'transparent',
                          borderLeft: isSelected ? '3px solid #A50104' : '3px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f9f9f9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#A50104',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {displayName}
                          </p>
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#A50104',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            <FaCheck />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Paginación */}
              {totalPagesUser1 > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #eee'
                }}>
                  <button
                    type="button"
                    onClick={() => setPageUser1(prev => Math.max(1, prev - 1))}
                    disabled={pageUser1 === 1}
                    style={{
                      padding: '5px 12px',
                      background: pageUser1 === 1 ? '#f0f0f0' : '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: pageUser1 === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: pageUser1 === 1 ? '#999' : '#000',
                      opacity: pageUser1 === 1 ? 0.5 : 1
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ color: '#666', fontSize: '12px', fontWeight: '500' }}>
                    {pageUser1} / {totalPagesUser1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPageUser1(prev => Math.min(totalPagesUser1, prev + 1))}
                    disabled={pageUser1 === totalPagesUser1}
                    style={{
                      padding: '5px 12px',
                      background: pageUser1 === totalPagesUser1 ? '#f0f0f0' : '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: pageUser1 === totalPagesUser1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: pageUser1 === totalPagesUser1 ? '#999' : '#000',
                      opacity: pageUser1 === totalPagesUser1 ? 0.5 : 1
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usuario 2 */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fafafa'
          }}>
            <div style={{
              background: '#A50104',
              padding: '10px 15px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaUser />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Segundo Usuario</h3>
            </div>

            <div style={{ padding: '15px' }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999',
                  fontSize: '12px'
                }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o usuario..."
                  value={searchUser2}
                  onChange={(e) => handleSearchUser2(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    color: '#000'
                  }}
                />
              </div>

              {/* Lista de usuarios */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                {loadingBackendUsers ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                    <p>⏳ Cargando usuarios...</p>
                  </div>
                ) : paginatedUsers2.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
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
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUser2(null);
                            setSelectedUser2Obj(null);
                          } else {
                            setSelectedUser2(username);
                            setSelectedUser2Obj(user);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: isSelected ? '#fff5f5' : 'transparent',
                          borderLeft: isSelected ? '3px solid #A50104' : '3px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f9f9f9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#A50104',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {displayName}
                          </p>
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#A50104',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            <FaCheck />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Paginación */}
              {totalPagesUser2 > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #eee'
                }}>
                  <button
                    type="button"
                    onClick={() => setPageUser2(prev => Math.max(1, prev - 1))}
                    disabled={pageUser2 === 1}
                    style={{
                      padding: '5px 12px',
                      background: pageUser2 === 1 ? '#f0f0f0' : '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: pageUser2 === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: pageUser2 === 1 ? '#999' : '#000',
                      opacity: pageUser2 === 1 ? 0.5 : 1
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ color: '#666', fontSize: '12px', fontWeight: '500' }}>
                    {pageUser2} / {totalPagesUser2}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPageUser2(prev => Math.min(totalPagesUser2, prev + 1))}
                    disabled={pageUser2 === totalPagesUser2}
                    style={{
                      padding: '5px 12px',
                      background: pageUser2 === totalPagesUser2 ? '#f0f0f0' : '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: pageUser2 === totalPagesUser2 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: pageUser2 === totalPagesUser2 ? '#999' : '#000',
                      opacity: pageUser2 === totalPagesUser2 ? 0.5 : 1
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nombre de la conversación */}
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="conversationName" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#000',
            fontWeight: '500',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            <FaComments style={{ color: '#A50104' }} />
            Nombre de la Conversación
          </label>
          <input
            type="text"
            id="conversationName"
            value={conversationName}
            onChange={(e) => setConversationName(e.target.value)}
            placeholder="Selecciona ambos usuarios para generar el nombre..."
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d7db',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
              color: '#000'
            }}
          />
          <p style={{
            marginTop: '6px',
            marginBottom: 0,
            color: '#666',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            {conversationName ? (
              <>✏️ Puedes editar el nombre si lo deseas</>
            ) : (
              <>El nombre se genera automáticamente al seleccionar ambos usuarios</>
            )}
          </p>
        </div>

        {/* Info */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '15px'
        }}>
          <FaInfoCircle style={{ color: '#1976d2', fontSize: '16px', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: 0, fontWeight: '600', color: '#000', fontSize: '13px', marginBottom: '4px' }}>
              Conversación Administrada
            </p>
            <p style={{ margin: 0, color: '#555', fontSize: '12px' }}>
              Los usuarios podrán chatear entre sí, pero solo el administrador puede eliminar la conversación.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          paddingTop: '15px',
          borderTop: '1px solid #eee'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: '#333',
              transition: 'all 0.2s'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2 || isSubmitting}
            style={{
              padding: '8px 20px',
              background: (!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2 || isSubmitting) ? '#ccc' : '#A50104',
              border: 'none',
              borderRadius: '6px',
              cursor: (!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2 || isSubmitting) ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: (!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2 || isSubmitting) ? 0.6 : 1
            }}
          >
            <FaComments />
            {isSubmitting ? 'Creando...' : 'Crear Conversación'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default CreateConversationModal;

