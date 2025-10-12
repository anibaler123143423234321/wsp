import React from 'react';
import { FaTimes } from 'react-icons/fa';
import './Modal.css';

const EditRoomModal = ({ isOpen, onClose, room, editForm, setEditForm, onUpdateRoom }) => {
  if (!isOpen || !room) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateRoom();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Capacidad de Sala</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Sala: <strong>{room.name}</strong></label>
            <div className="room-info">
              <small>Código: {room.roomCode}</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editMaxCapacity">Capacidad máxima:</label>
            <input
              type="number"
              id="editMaxCapacity"
              value={editForm.maxCapacity || 50}
              onChange={(e) => setEditForm({...editForm, maxCapacity: parseInt(e.target.value) || 50})}
              min="1"
              max="500"
              placeholder="50"
              className="form-input"
            />
            <div className="duration-help">
              <small>Número máximo de usuarios que pueden unirse a la sala (1-500)</small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Actualizar Capacidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoomModal;
