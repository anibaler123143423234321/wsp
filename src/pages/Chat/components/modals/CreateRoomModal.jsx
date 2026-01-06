import React from 'react';
import { FaPlus } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';

const CreateRoomModal = ({ isOpen, onClose, roomForm, setRoomForm, onCreateRoom }) => {
  const handleSubmit = () => {
    onCreateRoom();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Sala"
      icon={<FaPlus />}
      onSubmit={handleSubmit}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
    >
      <div className="form-group">
        <label htmlFor="roomName" style={{ color: '#000000' }}>Nombre de la sala:</label>
        <input
          type="text"
          id="roomName"
          value={roomForm.name}
          onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
          placeholder="Ej: Reunión de equipo"
          required
          style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxCapacity" style={{ color: '#000000' }}>Capacidad máxima:</label>
        <input
          type="number"
          id="maxCapacity"
          value={roomForm.maxCapacity}
          onChange={(e) => setRoomForm({ ...roomForm, maxCapacity: parseInt(e.target.value) })}
          min="2"
          max="100"
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
            background: 'rgb(165, 1, 4)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Crear Sala
        </button>
      </div>
    </BaseModal>
  );
};

export default CreateRoomModal;
