import React from 'react';
import { FaPlus } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';
import './SimpleFormModal.css';

const CreateRoomModal = ({ isOpen, onClose, roomForm, setRoomForm, onCreateRoom }) => {
  const isDark = document.documentElement.classList.contains('dark');

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
      bodyBgColor={isDark ? '#111b21' : '#ffffff'}
      titleColor="#FFFFFF"
    >
      <div className="sfm-body">
        <div className="sfm-field">
          <label className="sfm-label" htmlFor="roomName">Nombre de la sala:</label>
          <input
            type="text"
            id="roomName"
            className="sfm-input"
            value={roomForm.name}
            onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
            placeholder="Ej: Reunión de equipo"
            required
          />
        </div>

        <div className="sfm-field">
          <label className="sfm-label" htmlFor="maxCapacity">Capacidad máxima:</label>
          <input
            type="number"
            id="maxCapacity"
            className="sfm-input"
            value={roomForm.maxCapacity}
            onChange={(e) => setRoomForm({ ...roomForm, maxCapacity: parseInt(e.target.value) })}
            min="2"
            max="100"
            required
          />
        </div>

        <div className="sfm-actions">
          <button type="button" className="sfm-btn cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="sfm-btn submit">
            Crear Sala
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default CreateRoomModal;
