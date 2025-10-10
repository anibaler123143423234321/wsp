import React from 'react';
import { FaTimes } from 'react-icons/fa';
import './Modal.css';

const CreateRoomModal = ({ isOpen, onClose, roomForm, setRoomForm, onCreateRoom }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateRoom();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Sala Temporal</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="roomName">Nombre de la sala:</label>
            <input
              type="text"
              id="roomName"
              value={roomForm.name}
              onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
              placeholder="Ej: Reunión de equipo"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxCapacity">Capacidad máxima:</label>
            <input
              type="number"
              id="maxCapacity"
              value={roomForm.maxCapacity}
              onChange={(e) => setRoomForm({...roomForm, maxCapacity: parseInt(e.target.value)})}
              min="2"
              max="100"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear Sala
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
