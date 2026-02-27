import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserMinus, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import BaseModal from './BaseModal';
import apiService from "../../../../apiService";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "../../../../sweetalert2";
import './Modal.css';

const RemoveUsersFromRoomModal = ({ isOpen, onClose, roomCode, roomName, currentMembers = [], userList = [], onUsersRemoved, currentUser, removerUser }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);

  const resolveMemberUsername = (member) => {
    if (typeof member === 'string') return member;
    if (!member || typeof member !== 'object') return '';
    return member.username || member.userName || member.id || member.uid || '';
  };

  const resolveMemberDisplayName = (member, username) => {
    const fromUserList = userList.find((u) => {
      if (!u || typeof u !== 'object') return false;
      const uUsername = (u.username || '').toString().toLowerCase().trim();
      const uDisplayName = (u.displayName || '').toString().toLowerCase().trim();
      const target = (username || '').toString().toLowerCase().trim();
      return uUsername === target || uDisplayName === target;
    });

    const fromUserListFullName = fromUserList
      ? [fromUserList.nombre, fromUserList.apellido].filter(Boolean).join(' ').trim()
      : '';

    if (typeof member === 'string') {
      const candidates = [
        fromUserListFullName,
        fromUserList?.fullName,
        fromUserList?.displayName,
        username,
      ];
      const firstValid = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
      return firstValid || 'Usuario desconocido';
    }

    if (!member || typeof member !== 'object') {
      const candidates = [
        fromUserListFullName,
        fromUserList?.fullName,
        fromUserList?.displayName,
        username,
      ];
      const firstValid = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
      return firstValid || 'Usuario desconocido';
    }

    const fullNameFromNames = [member.nombre, member.apellido].filter(Boolean).join(' ').trim();
    const candidates = [
      member.fullName,
      fullNameFromNames,
      fromUserListFullName,
      fromUserList?.fullName,
      fromUserList?.displayName,
      member.displayName,
      member.name,
      username,
    ];

    const firstValid = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return firstValid || 'Usuario desconocido';
  };

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
      // Obtener nombre de quien elimina
      const removerName = removerUser?.nombre && removerUser?.apellido
        ? `${removerUser.nombre} ${removerUser.apellido}`
        : (removerUser?.displayName || removerUser?.username || 'Administrador');

      // Eliminar cada usuario de la sala
      const promises = selectedUsers.map(username =>
        apiService.removeUserFromRoom(roomCode, username, removerName)
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
    const username = resolveMemberUsername(member);
    return username !== currentUser;
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar Usuarios de la Sala"
      icon={<FaUserMinus />}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
      maxWidth="650px"
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
        </div>

        {/* Advertencia */}
        <div style={{
          marginBottom: '15px',
          padding: '12px 15px',
          background: '#fff5f5',
          border: '1px solid #ffcccc',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <FaExclamationTriangle style={{ color: '#A50104', fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: '#A50104', fontWeight: '600', marginBottom: '4px' }}>
              Advertencia
            </div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
              Los usuarios seleccionados serán eliminados de la sala y perderán acceso a los mensajes.
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#000' }}>
            Selecciona usuarios para eliminar:
          </h3>

          {removableMembers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
              fontSize: '14px',
              background: '#f9f9f9',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              No hay otros usuarios en la sala
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '350px',
              overflowY: 'auto',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}>
              {removableMembers.map((member, index) => {
                const username = resolveMemberUsername(member);
                const displayName = resolveMemberDisplayName(member, username);

                const isSelected = selectedUsers.includes(username);

                return (
                  <div
                    key={index}
                    onClick={() => handleToggleUser(username)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
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
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      background: '#A50104',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#fff',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {(displayName || '?').charAt(0).toUpperCase()}
                    </div>

                    {/* Info del usuario */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>
                        {displayName || 'Usuario desconocido'}
                      </div>
                      {username !== displayName && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          @{username}
                        </div>
                      )}
                    </div>

                    {/* Checkbox */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#A50104' : '#ccc'}`,
                      background: isSelected ? '#A50104' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      color: '#fff',
                      fontSize: '12px',
                      flexShrink: 0
                    }}>
                      {isSelected && <FaCheck />}
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
            marginTop: '15px',
            padding: '12px 15px',
            background: '#fff5f5',
            border: '1px solid #ffcccc',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#A50104',
            fontWeight: '600'
          }}>
            {selectedUsers.length} usuario(s) seleccionado(s) para eliminar
          </div>
        )}

        {/* Botones de acción */}
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
            onClick={handleRemoveUsers}
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
            <FaUserMinus />
            Eliminar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default RemoveUsersFromRoomModal;

