import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaTimes, FaUserPlus, FaSearch, FaCheck } from 'react-icons/fa';
import BaseModal from './BaseModal';
import apiService from "../../../../apiService";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "../../../../sweetalert2";
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

      //  IMPORTANTE: Agregar usuarios SECUENCIALMENTE para evitar condiciones de carrera
      // Si se agregan en paralelo con Promise.all(), pueden fallar por límite de capacidad
      const results = [];
      const errors = [];

      for (const username of selectedUsers) {
        try {
          // console.log(`➕ Agregando usuario: ${username}`);
          //  MODIFICADO: Usar addUserDirectlyToRoom en lugar de joinRoom
          // Esto bypasses el pending approval y agrega usuarios directameente
          const result = await apiService.addUserDirectlyToRoom(roomCode, username);
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

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Usuarios a la Sala"
      icon={<FaUserPlus />}
      headerBgColor="#A50104"
      bodyBgColor={isDark ? '#111b21' : '#ffffff'}
      titleColor="#FFFFFF"
      maxWidth="700px"
      closeOnOverlayClick={false}
    >
      <div className="aum-content">
        {/* Info de la sala */}
        <div className="aum-room-info">
          <div className="aum-room-name">{roomName}</div>
          <div className="aum-room-code">
            <span className="aum-code-badge">{roomCode}</span>
          </div>
          <div className="aum-room-members">
            {currentMembers.length} miembro{currentMembers.length !== 1 ? 's' : ''} actual{currentMembers.length !== 1 ? 'es' : ''}
          </div>
          <div className="aum-hint">
            💡 Solo se muestran usuarios que no están en la sala
          </div>
        </div>

        {/* Selector de Sede */}
        <div className="aum-sede-section">
          <label className="aum-label">🏢 Seleccionar Sede</label>
          <div className="aum-sede-buttons">
            <button
              type="button"
              className={`aum-sede-btn ${selectedSede === 'CHICLAYO_PIURA' ? 'active' : ''}`}
              onClick={() => setSelectedSede('CHICLAYO_PIURA')}
            >
              CHICLAYO / PIURA
            </button>
            <button
              type="button"
              className={`aum-sede-btn ${selectedSede === 'LIMA' ? 'active' : ''}`}
              onClick={() => setSelectedSede('LIMA')}
            >
              LIMA
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="aum-search-wrap">
          <FaSearch className="aum-search-icon" />
          <input
            type="text"
            className="aum-search-input"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lista de usuarios */}
        <div className="aum-users-list" onScroll={handleScroll}>
          {loading ? (
            <div className="aum-empty-state">⏳ Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="aum-empty-state">
              <div className="aum-empty-icon">{searchTerm ? '🔍' : '👥'}</div>
              <div className="aum-empty-title">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </div>
              {!searchTerm && (
                <div className="aum-empty-sub">Todos los usuarios ya están en la sala</div>
              )}
            </div>
          ) : (
            <>
              <div className="aum-users-cards">
                {users.map((user) => {
                  const displayName = user.nombre && user.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user.username;
                  const isSelected = selectedUsers.includes(displayName);

                  return (
                    <div
                      key={user.username}
                      className={`aum-user-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleUser(user)}
                    >
                      {user.picture ? (
                        <img src={user.picture} alt={displayName} className="aum-user-avatar-img" />
                      ) : (
                        <div className="aum-user-avatar">
                          {displayName[0]?.toUpperCase() || '?'}
                        </div>
                      )}

                      <div className="aum-user-info">
                        <div className="aum-user-displayname">{displayName}</div>
                        <div className="aum-user-username">@{user.username}</div>
                        {user.numeroAgente && (
                          <div className="aum-user-agent">N° Agente: {user.numeroAgente}</div>
                        )}
                      </div>

                      <div className={`aum-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <FaCheck size={10} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {loadingMore && (
                <div className="aum-loading-more">Cargando más usuarios...</div>
              )}

              {!hasMore && users.length > 0 && (
                <div className="aum-no-more">No hay más usuarios</div>
              )}
            </>
          )}
        </div>

        {/* Usuarios seleccionados */}
        {selectedUsers.length > 0 && (
          <div className="aum-selection-summary">
            <div className="aum-selection-count">
              {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
            </div>
            <div className="aum-selection-names">{selectedUsers.join(', ')}</div>
          </div>
        )}

        {/* Botones */}
        <div className="aum-footer">
          <button type="button" className="aum-btn cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="aum-btn submit"
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
          >
            <FaUserPlus size={12} />
            Agregar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AddUsersToRoomModal;


