import React from 'react';
import { FaEdit } from 'react-icons/fa';
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
      <div className="form-group">
        <label style={{ color: '#000000' }}>Sala: <strong>{room.name}</strong></label>
        <div className="room-info">
          <small style={{ color: '#666666' }}>Código: {room.roomCode}</small>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="editMaxCapacity" style={{ color: '#000000' }}>Capacidad máxima:</label>
        <input
          type="number"
          id="editMaxCapacity"
          value={editForm.maxCapacity || 50}
          onChange={(e) => setEditForm({...editForm, maxCapacity: parseInt(e.target.value) || 50})}
          min="1"
          max="500"
          placeholder="50"
          className="form-input"
          style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
        />
        <div className="duration-help">
          <small style={{ color: '#666666' }}>Número máximo de usuarios que pueden unirse a la sala (1-500)</small>
        </div>
      </div>

      <div className="modal-actions" style={{ borderTop: '1px solid #e0e0e0' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Actualizar Capacidad
        </button>
      </div>
    </BaseModal>
  );
};

export default EditRoomModal;
