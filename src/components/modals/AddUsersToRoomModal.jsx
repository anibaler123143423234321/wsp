import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaUserPlus, FaSearch } from 'react-icons/fa';
import apiService from '../../apiService';
import { showSuccessAlert, showErrorAlert } from '../../sweetalert2';
import './Modal.css';

const AddUsersToRoomModal = ({ isOpen, onClose, roomCode, roomName, currentMembers = [], onUserAdded }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const loadUsers = useCallback(async (pageNumber = 0, reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Cargar usuarios de 10 en 10
      const newUsers = await apiService.getUsersFromBackend(pageNumber, 10);

      // Filtrar usuarios que ya están en la sala
      const currentMemberUsernames = currentMembers.map(m =>
        typeof m === 'string' ? m : m.username
      );
      const availableUsers = newUsers.filter(user =>
        !currentMemberUsernames.includes(user.username)
      );

      if (reset) {
        setUsers(availableUsers);
      } else {
        setUsers(prev => [...prev, ...availableUsers]);
      }

      // Si recibimos menos de 10 usuarios, no hay más páginas
      setHasMore(newUsers.length === 10);
      setPage(pageNumber);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      if (reset) {
        await showErrorAlert('Error', 'No se pudieron cargar los usuarios');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentMembers]);

  // Función para buscar usuarios
  const searchUsers = useCallback(async (query, pageNumber = 0, reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setIsSearching(true);

    try {
      const newUsers = await apiService.searchUsersFromBackend(query, pageNumber, 10);

      // Filtrar usuarios que ya están en la sala
      const currentMemberUsernames = currentMembers.map(m =>
        typeof m === 'string' ? m : m.username
      );
      const availableUsers = newUsers.filter(user =>
        !currentMemberUsernames.includes(user.username)
      );

      if (reset) {
        setUsers(availableUsers);
      } else {
        setUsers(prev => [...prev, ...availableUsers]);
      }

      setHasMore(newUsers.length === 10);
      setPage(pageNumber);
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  }, [currentMembers]);

  useEffect(() => {
    if (isOpen) {
      // Resetear todo cuando se abre el modal
      setUsers([]);
      setPage(0);
      setHasMore(true);
      setSelectedUsers([]);
      setSearchTerm('');
      setIsSearching(false);
      // Cargar usuarios iniciales
      loadUsers(0, true);
    }
  }, [isOpen, loadUsers]);

  // Efecto para buscar cuando cambia el searchTerm (con debounce)
  useEffect(() => {
    if (!isOpen) return;

    // No ejecutar si searchTerm está vacío (ya se cargó en el useEffect anterior)
    if (searchTerm.trim().length === 0) return;

    const timer = setTimeout(() => {
      // Solo buscar si hay texto de búsqueda
      searchUsers(searchTerm, 0, true);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, searchUsers]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Cargar más cuando esté cerca del final (100px antes del final)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMore && !loadingMore && !loading) {
        // Si hay búsqueda activa, usar searchUsers, sino loadUsers
        if (searchTerm.trim().length > 0) {
          searchUsers(searchTerm, page + 1, false);
        } else {
          loadUsers(page + 1, false);
        }
      }
    }
  };

  const handleToggleUser = (username) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) {
        return prev.filter(u => u !== username);
      } else {
        return [...prev, username];
      }
    });
  };

  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      await showErrorAlert('Error', 'Debes seleccionar al menos un usuario');
      return;
    }

    try {
      // Aquí llamaremos al endpoint del backend para agregar usuarios
      // Por ahora, solo mostramos un mensaje de éxito
      await showSuccessAlert(
        '¡Usuarios agregados!',
        `Se han agregado ${selectedUsers.length} usuario(s) a la sala`
      );
      
      if (onUserAdded) {
        onUserAdded(selectedUsers);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al agregar usuarios:', error);
      await showErrorAlert('Error', 'No se pudieron agregar los usuarios');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>
            <FaUserPlus style={{ marginRight: '8px' }} />
            Agregar Usuarios a la Sala
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="room-info" style={{ marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, color: '#1f2937' }}>{roomName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Código: {roomCode}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {currentMembers.length} miembro{currentMembers.length !== 1 ? 's' : ''} actual{currentMembers.length !== 1 ? 'es' : ''}
            </div>
          </div>

          {/* Buscador */}
          <div className="search-box" style={{ marginBottom: '16px' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 36px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Lista de usuarios */}
          <div
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            onScroll={handleScroll}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                Cargando usuarios...
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map((user) => {
                  const displayName = user.nombre && user.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user.username;
                  const isSelected = selectedUsers.includes(user.username);

                  return (
                    <div
                      key={user.username}
                      onClick={() => handleToggleUser(user.username)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: `2px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? '#ecfdf5' : '#ffffff',
                        transition: 'all 0.2s ease'
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
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{displayName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>@{user.username}</div>
                        {user.numeroAgente && (
                          <div style={{ fontSize: '11px', color: '#10b981' }}>
                            N° Agente: {user.numeroAgente}
                          </div>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: `2px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                          background: isSelected ? '#10b981' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicador de carga de más usuarios */}
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                  Cargando más usuarios...
                </div>
              )}

              {/* Mensaje de no hay más usuarios */}
              {!hasMore && users.length > 0 && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#9ca3af', fontSize: '12px' }}>
                  No hay más usuarios
                </div>
              )}
            </>
            )}
          </div>

          {/* Usuarios seleccionados */}
          {selectedUsers.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', marginBottom: '4px' }}>
                {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#047857' }}>
                {selectedUsers.join(', ')}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: selectedUsers.length > 0 ? '#10b981' : '#d1d5db',
              color: 'white',
              cursor: selectedUsers.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            Agregar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUsersToRoomModal;

