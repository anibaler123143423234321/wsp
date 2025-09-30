import React from 'react';
import { FaTimes } from 'react-icons/fa';
import './Modal.css';

const JoinRoomModal = ({ isOpen, onClose, joinRoomForm, setJoinRoomForm, onJoinRoom }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onJoinRoom();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unirse a Sala</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="roomCode">Código de la sala:</label>
            <input
              type="text"
              id="roomCode"
              value={joinRoomForm.roomCode}
              onChange={(e) => setJoinRoomForm({...joinRoomForm, roomCode: e.target.value})}
              placeholder="Ej: ABC123"
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Unirse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomModal;
