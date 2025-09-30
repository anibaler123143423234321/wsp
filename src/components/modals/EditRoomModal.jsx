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
          <h2>Editar Duración de Sala</h2>
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
            <label htmlFor="editDuration">Nueva duración de la sala:</label>
            <div className="duration-inputs">
              <div className="duration-field">
                <input
                  type="number"
                  id="editDurationHours"
                  value={editForm.durationHours || 0}
                  onChange={(e) => setEditForm({...editForm, durationHours: parseInt(e.target.value) || 0})}
                  min="0"
                  max="8760"
                  placeholder="0"
                />
                <label htmlFor="editDurationHours">horas</label>
              </div>
              <div className="duration-field">
                <input
                  type="number"
                  id="editDurationMinutes"
                  value={editForm.durationMinutes || 0}
                  onChange={(e) => setEditForm({...editForm, durationMinutes: parseInt(e.target.value) || 0})}
                  min="0"
                  max="59"
                  placeholder="0"
                />
                <label htmlFor="editDurationMinutes">minutos</label>
              </div>
            </div>
            <div className="duration-help">
              <small>Ejemplos: 1h 30m, 2h 15m, 30m, 6h</small>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Actualizar Duración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoomModal;
