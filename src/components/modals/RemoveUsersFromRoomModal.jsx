import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserMinus, FaExclamationTriangle } from 'react-icons/fa';
import apiService from '../../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../sweetalert2';
import './Modal.css';

const RemoveUsersFromRoomModal = ({ isOpen, onClose, roomCode, roomName, currentMembers = [], onUsersRemoved, currentUser }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Resetear selección cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleUser = (username) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) {
        return prev.filter(u => u !== username);
      } else {
        return [...prev, username];
      }
    });
  };

  const handleRemoveUsers = async () => {
    if (selectedUsers.length === 0) {
      await showErrorAlert('Error', 'Debes seleccionar al menos un usuario');
      return;
    }

    // Confirmar acción
    const result = await showConfirmAlert(
      '¿Estás seguro?',
      `Se eliminarán ${selectedUsers.length} usuario(s) de la sala "${roomName}"`
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Eliminar cada usuario de la sala
      const promises = selectedUsers.map(username =>
        apiService.removeUserFromRoom(roomCode, username)
      );

      await Promise.all(promises);

      await showSuccessAlert(
        '¡Usuarios eliminados!',
        `Se han eliminado ${selectedUsers.length} usuario(s) de la sala`
      );

      if (onUsersRemoved) {
        onUsersRemoved(selectedUsers);
      }

      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error('Error al eliminar usuarios:', error);
      await showErrorAlert('Error', 'No se pudieron eliminar los usuarios de la sala');
    }
  };

  // Filtrar miembros para mostrar solo los que no son el usuario actual
  const removableMembers = currentMembers.filter(member => {
    const username = typeof member === 'string' ? member : member.username;
    return username !== currentUser;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '85vh' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaUserMinus style={{ color: '#f15c6d' }} />
            Eliminar Usuarios de la Sala
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Info de la sala */}
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
          </div>

          {/* Advertencia */}
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: 'rgba(241, 92, 109, 0.1)',
            border: '1px solid rgba(241, 92, 109, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <FaExclamationTriangle style={{ color: '#f15c6d', fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#f15c6d', fontWeight: '600', marginBottom: '4px' }}>
                Advertencia
              </div>
              <div style={{ fontSize: '12px', color: '#e9edef', lineHeight: '1.4' }}>
                Los usuarios seleccionados serán eliminados de la sala y perderán acceso a los mensajes.
              </div>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#e9edef' }}>
              Selecciona usuarios para eliminar:
            </h3>

            {removableMembers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8696a0',
                fontSize: '14px'
              }}>
                No hay otros usuarios en la sala
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                {removableMembers.map((member, index) => {
                  const username = typeof member === 'string' ? member : member.username;
                  const nombre = typeof member === 'object' ? member.nombre : null;
                  const apellido = typeof member === 'object' ? member.apellido : null;
                  const displayName = nombre && apellido ? `${nombre} ${apellido}` : username;
                  const isSelected = selectedUsers.includes(username);

                  return (
                    <div
                      key={index}
                      onClick={() => handleToggleUser(username)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: `1px solid ${isSelected ? '#f15c6d' : '#374045'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(241, 92, 109, 0.15)' : '#2a3942',
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
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: isSelected
                          ? 'linear-gradient(135deg, #f15c6d 0%, #e74c3c 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        color: '#fff',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Info del usuario */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#e9edef' }}>
                          {displayName}
                        </div>
                        {username !== displayName && (
                          <div style={{ fontSize: '12px', color: '#8696a0', marginTop: '2px' }}>
                            @{username}
                          </div>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${isSelected ? '#f15c6d' : '#8696a0'}`,
                        background: isSelected ? '#f15c6d' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}>
                        {isSelected && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contador de seleccionados */}
          {selectedUsers.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(241, 92, 109, 0.1)',
              border: '1px solid rgba(241, 92, 109, 0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '13px',
              color: '#f15c6d',
              fontWeight: '600'
            }}>
              {selectedUsers.length} usuario(s) seleccionado(s) para eliminar
            </div>
          )}

          {/* Botones de acción */}
          <div className="modal-actions">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleRemoveUsers}
              disabled={selectedUsers.length === 0}
              className="btn btn-danger"
              style={{
                opacity: selectedUsers.length === 0 ? 0.5 : 1,
                cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <FaUserMinus style={{ marginRight: '6px' }} />
              Eliminar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveUsersFromRoomModal;

