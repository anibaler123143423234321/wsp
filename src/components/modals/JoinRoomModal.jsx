import React from 'react';
import { FaSignInAlt } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';

const JoinRoomModal = ({ isOpen, onClose, joinRoomForm, setJoinRoomForm, onJoinRoom }) => {
  const handleSubmit = () => {
    onJoinRoom();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Unirse a Sala"
      icon={<FaSignInAlt />}
      onSubmit={handleSubmit}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
    >
      <div className="form-group">
        <label htmlFor="roomCode" style={{ color: '#000000' }}>Código de la sala:</label>
        <input
          type="text"
          id="roomCode"
          value={joinRoomForm.roomCode}
          onChange={(e) => setJoinRoomForm({...joinRoomForm, roomCode: e.target.value})}
          placeholder="Ej: ABC123"
          required
          style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
        />
      </div>

      <div className="modal-actions" style={{ borderTop: '1px solid #e0e0e0' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Unirse
        </button>
      </div>
    </BaseModal>
  );
};

export default JoinRoomModal;
