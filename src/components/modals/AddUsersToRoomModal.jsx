import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaTimes, FaUserPlus, FaSearch, FaCheck } from 'react-icons/fa';
import BaseModal from './BaseModal';
import apiService from '../../apiService';
import { showSuccessAlert, showErrorAlert } from '../../sweetalert2';
import './Modal.css';
import './AddUsersToRoomModal.css';

const AddUsersToRoomModal = ({ isOpen, onClose, roomCode, roomName, currentMembers = [], onUserAdded }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSede, setSelectedSede] = useState('CHICLAYO_PIURA');
  const [cacheVersion, setCacheVersion] = useState(0);
  const usersCache = useRef({
    CHICLAYO_PIURA: [],
    LIMA: []
  });
  const isFirstLoad = useRef(true);

  const loadUsers = useCallback(async (pageNumber = 0, reset = false, sede = null) => {
    const sedeToUse = sede || selectedSede;

    // Verificar si ya hay usuarios en caché para esta sede
    if (reset && usersCache.current[sedeToUse].length > 0) {
      setUsers(usersCache.current[sedeToUse]);
      setHasMore(false);
      setPage(0);
      return;
    }

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // console.log(`🔄 Cargando usuarios de la sede ${sedeToUse}, página ${pageNumber}`);

      // Cargar usuarios de 10 en 10 según la sede
      const newUsers = await apiService.getUsersFromBackend(pageNumber, 10, sedeToUse);

      // Filtrar usuarios que ya están en la sala
      const currentMemberUsernames = currentMembers.map(m =>
        typeof m === 'string' ? m : m.username
      );
      const availableUsers = newUsers.filter(user =>
        !currentMemberUsernames.includes(user.username)
      );

      if (reset) {
        setUsers(availableUsers);
        // Guardar en caché
        usersCache.current[sedeToUse] = availableUsers;
        setCacheVersion(prev => prev + 1);
      } else {
        setUsers(prev => [...prev, ...availableUsers]);
        // Actualizar caché
        usersCache.current[sedeToUse] = [...usersCache.current[sedeToUse], ...availableUsers];
        setCacheVersion(prev => prev + 1);
      }

      // Si recibimos menos de 10 usuarios, no hay más páginas
      setHasMore(newUsers.length === 10);
      setPage(pageNumber);
      // console.log(`✅ Usuarios cargados exitosamente: ${availableUsers.length}`);
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
      if (reset) {
        // Solo mostrar alerta si es un error real, no si es por cierre de sesión
        if (error.message !== 'Sesión expirada') {
          await showErrorAlert('Error', error.message || 'No se pudieron cargar los usuarios');
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentMembers, selectedSede]);

  // Función para buscar usuarios
  const searchUsers = useCallback(async (query, pageNumber = 0, reset = false, sede = null) => {
    const sedeToUse = sede || selectedSede;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setIsSearching(true);

    try {
      // console.log(`🔍 Buscando usuarios: "${query}" en sede ${sedeToUse}, página ${pageNumber}`);

      // Buscar usuarios según la sede
      const newUsers = await apiService.searchUsersFromBackend(query, pageNumber, 10, sedeToUse);

      // Filtrar usuarios que ya están en la sala
      const currentMemberUsernames = currentMembers.map(m =>
        typeof m === 'string' ? m : m.username
      );
      const availableUsers = newUsers.filter(user =>
        !currentMemberUsernames.includes(user.username)
      );

      if (reset) {
        setUsers(availableUsers);
        // Agregar a caché sin duplicados
        const existingUsernames = usersCache.current[sedeToUse].map(u => u.username);
        const newUniqueUsers = availableUsers.filter(u => !existingUsernames.includes(u.username));
        usersCache.current[sedeToUse] = [...usersCache.current[sedeToUse], ...newUniqueUsers];
        setCacheVersion(prev => prev + 1);
      } else {
        setUsers(prev => [...prev, ...availableUsers]);
        // Agregar a caché sin duplicados
        const existingUsernames = usersCache.current[sedeToUse].map(u => u.username);
        const newUniqueUsers = availableUsers.filter(u => !existingUsernames.includes(u.username));
        usersCache.current[sedeToUse] = [...usersCache.current[sedeToUse], ...newUniqueUsers];
        setCacheVersion(prev => prev + 1);
      }

      setHasMore(newUsers.length === 10);
      setPage(pageNumber);
      // console.log(`✅ Búsqueda completada: ${availableUsers.length} usuarios encontrados`);
    } catch (error) {
      console.error('❌ Error al buscar usuarios:', error);
      // No mostrar alerta aquí, dejar que el usuario intente de nuevo
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, [currentMembers, selectedSede]);

  useEffect(() => {
    if (isOpen) {
      // Resetear todo cuando se abre el modal
      setUsers([]);
      setPage(0);
      setHasMore(true);
      setSelectedUsers([]);
      setSearchTerm('');
      setIsSearching(false);
      setSelectedSede('CHICLAYO_PIURA');
      isFirstLoad.current = true;
      // Cargar usuarios iniciales
      loadUsers(0, true, 'CHICLAYO_PIURA');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Efecto para cambiar de sede
  useEffect(() => {
    if (!isOpen) return;

    // Evitar que se ejecute en la primera carga
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // Limpiar búsqueda y recargar usuarios de la nueva sede
    setSearchTerm('');
    setPage(0);
    setHasMore(true);
    loadUsers(0, true, selectedSede);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSede, isOpen]);

  // Efecto para buscar cuando cambia el searchTerm (con debounce)
  useEffect(() => {
    if (!isOpen) return;

    // No ejecutar si searchTerm está vacío (ya se cargó en el useEffect anterior)
    if (searchTerm.trim().length === 0) return;

    const timer = setTimeout(() => {
      // Solo buscar si hay texto de búsqueda
      searchUsers(searchTerm, 0, true, selectedSede);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, searchUsers, selectedSede]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Cargar más cuando esté cerca del final (100px antes del final)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMore && !loadingMore && !loading) {
        // Si hay búsqueda activa, usar searchUsers, sino loadUsers
        if (searchTerm.trim().length > 0) {
          searchUsers(searchTerm, page + 1, false, selectedSede);
        } else {
          loadUsers(page + 1, false, selectedSede);
        }
      }
    }
  };

  const handleToggleUser = (user) => {
    // Usar displayName (nombre completo) para que coincida con el registro del socket
    const displayName = user.nombre && user.apellido
      ? `${user.nombre} ${user.apellido}`
      : user.username;

    setSelectedUsers(prev => {
      if (prev.includes(displayName)) {
        return prev.filter(u => u !== displayName);
      } else {
        return [...prev, displayName];
      }
    });
  };

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      await showErrorAlert('Error', 'Debes seleccionar al menos un usuario');
      return;
    }

    try {
      // console.log(`🔄 Agregando ${selectedUsers.length} usuarios a la sala ${roomCode}...`);

      // 🔥 IMPORTANTE: Agregar usuarios SECUENCIALMENTE para evitar condiciones de carrera
      // Si se agregan en paralelo con Promise.all(), pueden fallar por límite de capacidad
      const results = [];
      const errors = [];

      for (const username of selectedUsers) {
        try {
          // console.log(`➕ Agregando usuario: ${username}`);
          const result = await apiService.joinRoom({
            roomCode: roomCode,
            username: username
          });
          results.push({ username, success: true, result });
          // console.log(`✅ Usuario ${username} agregado exitosamente`);
        } catch (error) {
          console.error(`❌ Error al agregar usuario ${username}:`, error);
          errors.push({ username, error: error.message || 'Error desconocido' });
        }
      }

      // Mostrar resultado
      if (errors.length === 0) {
        await showSuccessAlert(
          '¡Usuarios agregados!',
          `Se han agregado ${results.length} usuario(s) a la sala`
        );
      } else if (results.length > 0) {
        // Algunos usuarios se agregaron, otros fallaron
        await showErrorAlert(
          'Agregado parcialmente',
          `Se agregaron ${results.length} de ${selectedUsers.length} usuarios.\n\nErrores:\n${errors.map(e => `- ${e.username}: ${e.error}`).join('\n')}`
        );
      } else {
        // Todos fallaron
        await showErrorAlert(
          'Error',
          `No se pudo agregar ningún usuario.\n\nErrores:\n${errors.map(e => `- ${e.username}: ${e.error}`).join('\n')}`
        );
      }

      // Notificar solo los usuarios que se agregaron exitosamente
      if (onUserAdded && results.length > 0) {
        onUserAdded(results.map(r => r.username));
      }

      // Cerrar modal solo si al menos un usuario se agregó
      if (results.length > 0) {
        onClose();
      }
    } catch (error) {
      console.error('Error general al agregar usuarios:', error);
      await showErrorAlert('Error', 'Ocurrió un error inesperado al agregar los usuarios');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Usuarios a la Sala"
      icon={<FaUserPlus />}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
      maxWidth="700px"
      closeOnOverlayClick={false}
    >
      <div style={{ padding: '0' }}>
        {/* Info de la sala */}
        <div style={{
          marginBottom: '15px',
          padding: '12px 15px',
          background: '#f9f9f9',
          borderRadius: '6px',
          border: '1px solid #ddd'
        }}>
          <div style={{ fontWeight: 600, color: '#000', fontSize: '14px', marginBottom: '4px' }}>{roomName}</div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
            <span style={{ fontFamily: 'monospace', background: '#e0e0e0', padding: '2px 6px', borderRadius: '3px', color: '#000' }}>
              {roomCode}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#A50104', marginTop: '4px', fontWeight: '500' }}>
            {currentMembers.length} miembro{currentMembers.length !== 1 ? 's' : ''} actual{currentMembers.length !== 1 ? 'es' : ''}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            marginTop: '6px',
            padding: '6px',
            background: '#fff',
            borderRadius: '4px',
            fontStyle: 'italic',
            border: '1px solid #e0e0e0'
          }}>
            💡 Solo se muestran usuarios que no están en la sala
          </div>
        </div>

        {/* Selector de Sede */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: '#000',
            fontWeight: '500',
            fontSize: '13px'
          }}>
            🏢 Seleccionar Sede
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedSede('CHICLAYO_PIURA')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: selectedSede === 'CHICLAYO_PIURA' ? '#A50104' : '#f0f0f0',
                color: selectedSede === 'CHICLAYO_PIURA' ? '#fff' : '#333',
                border: selectedSede === 'CHICLAYO_PIURA' ? '2px solid #A50104' : '2px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              CHICLAYO / PIURA
            </button>
            <button
              type="button"
              onClick={() => setSelectedSede('LIMA')}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: selectedSede === 'LIMA' ? '#A50104' : '#f0f0f0',
                color: selectedSede === 'LIMA' ? '#fff' : '#333',
                border: selectedSede === 'LIMA' ? '2px solid #A50104' : '2px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              LIMA
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ marginBottom: '15px', position: 'relative' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999',
            fontSize: '12px'
          }} />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
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
        <div
          onScroll={handleScroll}
          style={{
            maxHeight: '350px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: '#fff',
            padding: '8px'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              color: '#999',
              background: '#f9f9f9',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>
                {searchTerm ? '🔍' : '👥'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#000' }}>
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </div>
              {!searchTerm && (
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  Todos los usuarios ya están en la sala
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {users.map((user) => {
                  const displayName = user.nombre && user.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user.username;
                  const isSelected = selectedUsers.includes(displayName);

                  return (
                    <div
                      key={user.username}
                      onClick={() => handleToggleUser(user)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        border: `2px solid ${isSelected ? '#A50104' : '#e0e0e0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#fff5f5' : '#fff',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#f9f9f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#fff';
                        }
                      }}
                    >
                      {/* Avatar */}
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={displayName}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            background: '#A50104',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '16px'
                          }}
                        >
                          {displayName[0]?.toUpperCase() || '?'}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#000', fontSize: '14px' }}>{displayName}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>@{user.username}</div>
                        {user.numeroAgente && (
                          <div style={{ fontSize: '11px', color: '#A50104', marginTop: '3px', fontWeight: 500 }}>
                            N° Agente: {user.numeroAgente}
                          </div>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#A50104' : '#ccc'}`,
                          background: isSelected ? '#A50104' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <FaCheck />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicador de carga de más usuarios */}
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '13px' }}>
                  Cargando más usuarios...
                </div>
              )}

              {/* Mensaje de no hay más usuarios */}
              {!hasMore && users.length > 0 && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '12px' }}>
                  No hay más usuarios
                </div>
              )}
            </>
          )}
        </div>

        {/* Usuarios seleccionados */}
        {selectedUsers.length > 0 && (
          <div style={{
            marginTop: '15px',
            padding: '12px 15px',
            background: '#fff5f5',
            borderRadius: '6px',
            border: '1px solid #A50104'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#A50104', marginBottom: '4px' }}>
              {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {selectedUsers.join(', ')}
            </div>
          </div>
        )}

        {/* Botones */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          paddingTop: '15px',
          marginTop: '15px',
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
            type="button"
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
            style={{
              padding: '8px 20px',
              background: selectedUsers.length === 0 ? '#ccc' : '#A50104',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: selectedUsers.length === 0 ? 0.6 : 1
            }}
          >
            <FaUserPlus />
            Agregar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AddUsersToRoomModal;

