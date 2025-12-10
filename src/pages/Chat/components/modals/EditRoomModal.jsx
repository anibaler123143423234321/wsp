import React from 'react';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';

const EditRoomModal = ({ isOpen, onClose, room, editForm, setEditForm, onUpdateRoom }) => {
  if (!room) return null;

  const handleSubmit = () => {
    onUpdateRoom();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Capacidad de Sala"
      icon={<FaEdit />}
      onSubmit={handleSubmit}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
    >
      {/* Info de la sala */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#666', fontSize: '13px' }}>Sala:</span>
          <span style={{
            color: '#000',
            fontWeight: '600',
            fontSize: '16px',
            marginLeft: '8px'
          }}>
            {room.name}
          </span>
        </div>
        <div style={{
          display: 'inline-block',
          backgroundColor: '#f0f0f0',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#555',
          fontFamily: 'monospace'
        }}>
          Código: {room.roomCode}
        </div>
      </div>

      {/* Input de capacidad */}
      <div style={{ padding: '20px' }}>
        <label
          htmlFor="editMaxCapacity"
          style={{
            display: 'block',
            color: '#333',
            fontWeight: '500',
            marginBottom: '10px',
            fontSize: '14px'
          }}
        >
          Capacidad máxima:
        </label>
        <input
          type="number"
          id="editMaxCapacity"
          value={editForm.maxCapacity || 50}
          onChange={(e) => setEditForm({ ...editForm, maxCapacity: parseInt(e.target.value) || 50 })}
          min="1"
          max="500"
          placeholder="50"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#000',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#A50104'}
          onBlur={(e) => e.target.style.borderColor = '#ddd'}
        />
        <p style={{
          color: '#888',
          fontSize: '12px',
          marginTop: '8px',
          marginBottom: 0
        }}>
          Número máximo de usuarios que pueden unirse a la sala (1-500)
        </p>
      </div>

      {/* Botones de acción */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fafafa'
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#555',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f5f5f5';
            e.target.style.borderColor = '#ccc';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#fff';
            e.target.style.borderColor = '#ddd';
          }}
        >
          <FaTimes size={12} />
          Cancelar
        </button>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#A50104',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#8a0103'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#A50104'}
        >
          <FaSave size={12} />
          Actualizar Capacidad
        </button>
      </div>
    </BaseModal>
  );
};

export default EditRoomModal;
