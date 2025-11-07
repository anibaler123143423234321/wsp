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
      // Agregar cada usuario a la sala usando el endpoint joinRoom
      const promises = selectedUsers.map(username =>
        apiService.joinRoom({
          roomCode: roomCode,
          username: username
        })
      );

      await Promise.all(promises);

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
      await showErrorAlert('Error', 'No se pudieron agregar los usuarios a la sala');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '85vh' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserPlus />
            Agregar Usuarios a la Sala
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#2a3942',
            borderRadius: '8px',
            border: '1px solid #374045'
          }}>
            <div style={{ fontWeight: 600, color: '#e9edef', fontSize: '15px', marginBottom: '6px' }}>{roomName}</div>
            <div style={{ fontSize: '13px', color: '#8696a0', marginBottom: '2px' }}>
              <span style={{ fontFamily: 'monospace', background: '#374045', padding: '2px 6px', borderRadius: '4px' }}>
                {roomCode}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#00a884', marginTop: '6px' }}>
              {currentMembers.length} miembro{currentMembers.length !== 1 ? 's' : ''} actual{currentMembers.length !== 1 ? 'es' : ''}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8696a0',
              marginTop: '8px',
              padding: '8px',
              background: '#374045',
              borderRadius: '6px',
              fontStyle: 'italic'
            }}>
              💡 Solo se muestran usuarios que no están en la sala
            </div>
          </div>

          {/* Buscador */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <FaSearch style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8696a0',
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '40px'
              }}
            />
          </div>

          {/* Lista de usuarios */}
          <div
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            onScroll={handleScroll}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8696a0' }}>
                Cargando usuarios...
              </div>
            ) : users.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8696a0',
                background: '#2a3942',
                borderRadius: '8px',
                border: '1px solid #374045'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>
                  {searchTerm ? '🔍' : '👥'}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </div>
                {!searchTerm && (
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>
                    Todos los usuarios ya están en la sala
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        gap: '12px',
                        padding: '14px',
                        border: `2px solid ${isSelected ? '#00a884' : '#374045'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 168, 132, 0.1)' : '#2a3942',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#374045';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#2a3942';
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
                        <div style={{ fontWeight: 600, color: '#e9edef', fontSize: '15px' }}>{displayName}</div>
                        <div style={{ fontSize: '13px', color: '#8696a0', marginTop: '2px' }}>@{user.username}</div>
                        {user.numeroAgente && (
                          <div style={{ fontSize: '12px', color: '#00a884', marginTop: '4px', fontWeight: 500 }}>
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
                          border: `2px solid ${isSelected ? '#00a884' : '#8696a0'}`,
                          background: isSelected ? '#00a884' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px'
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
                <div style={{ textAlign: 'center', padding: '16px', color: '#8696a0', fontSize: '14px' }}>
                  Cargando más usuarios...
                </div>
              )}

              {/* Mensaje de no hay más usuarios */}
              {!hasMore && users.length > 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#8696a0', fontSize: '13px' }}>
                  No hay más usuarios
                </div>
              )}
            </>
            )}
          </div>

          {/* Usuarios seleccionados */}
          {selectedUsers.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '14px',
              background: 'rgba(0, 168, 132, 0.1)',
              borderRadius: '8px',
              border: '1px solid #00a884'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#00a884', marginBottom: '6px' }}>
                {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#8696a0' }}>
                {selectedUsers.join(', ')}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
            className="btn btn-primary"
            style={{
              opacity: selectedUsers.length === 0 ? 0.5 : 1,
              cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer'
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

