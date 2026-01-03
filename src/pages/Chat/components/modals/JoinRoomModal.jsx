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

      <div className="modal-actions" style={{ borderTop: '1px solid #e0e0e0', gap: '12px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Unirse
        </button>
      </div>
    </BaseModal>
  );
};

export default JoinRoomModal;
