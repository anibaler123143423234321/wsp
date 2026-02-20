import React from 'react';
import { FaSignInAlt } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';
import './SimpleFormModal.css';

const JoinRoomModal = ({ isOpen, onClose, joinRoomForm, setJoinRoomForm, onJoinRoom }) => {
  const isDark = document.documentElement.classList.contains('dark');

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
      bodyBgColor={isDark ? '#111b21' : '#ffffff'}
      titleColor="#FFFFFF"
    >
      <div className="sfm-body">
        <div className="sfm-field">
          <label className="sfm-label" htmlFor="roomCode">Código de la sala:</label>
          <input
            type="text"
            id="roomCode"
            className="sfm-input"
            value={joinRoomForm.roomCode}
            onChange={(e) => setJoinRoomForm({ ...joinRoomForm, roomCode: e.target.value })}
            placeholder="Ej: ABC123"
            required
          />
        </div>

        <div className="sfm-actions">
          <button type="button" className="sfm-btn cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="sfm-btn submit">
            Unirse
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default JoinRoomModal;
