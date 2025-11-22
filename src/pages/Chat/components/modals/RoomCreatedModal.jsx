import React from 'react';
import { FaCheckCircle, FaHome, FaClipboard } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';

const RoomCreatedModal = ({ isOpen, onClose, roomData }) => {
  if (!roomData) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Copiado al portapapeles!');
    }).catch(err => {
      console.error('Error al copiar: ', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('¡Copiado al portapapeles!');
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sala Creada Exitosamente"
      icon={<FaCheckCircle style={{color:'#00FF00'}}/>}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
    >
      <div className="room-info">
        <h3 style={{ color: '#000000' }}><FaHome style={{marginRight:4}}/> {roomData.name}</h3>

        <div className="info-section">
          <label style={{ color: '#000000' }}>Código de la sala:</label>
          <div className="copy-field">
            <input
              type="text"
              value={roomData.roomCode}
              readOnly
              className="code-input"
              style={{ backgroundColor: '#f5f5f5', color: '#000000', border: '1px solid #d1d7db' }}
            />
            <button
              className="btn btn-copy"
              onClick={() => copyToClipboard(roomData.roomCode)}
              title="Copiar código"
            >
              <FaClipboard />
            </button>
          </div>
        </div>

        <div className="info-section">
          <label style={{ color: '#000000' }}>Enlace de la sala:</label>
          <div className="copy-field">
            <input
              type="text"
              value={roomData.roomUrl}
              readOnly
              className="url-input"
              style={{ backgroundColor: '#f5f5f5', color: '#000000', border: '1px solid #d1d7db' }}
            />
            <button
              className="btn btn-copy"
              onClick={() => copyToClipboard(roomData.roomUrl)}
              title="Copiar enlace"
            >
              📋
            </button>
          </div>
        </div>

        <div className="room-stats">
          <div className="stat-item">
            <span className="stat-label" style={{ color: '#666666' }}>Capacidad:</span>
            <span className="stat-value" style={{ color: '#000000' }}>{roomData.currentMembers}/{roomData.maxCapacity}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label" style={{ color: '#666666' }}>Estado:</span>
            <span className="stat-value" style={{ color: '#000000' }}>{roomData.isActive ? '🟢 Activa' : '🔴 Inactiva'}</span>
          </div>
        </div>

        <div className="instructions">
          <p style={{ color: '#000000' }}><strong>📝 Instrucciones:</strong></p>
          <ul style={{ color: '#333333' }}>
            <li>Comparte el <strong>código</strong> o el <strong>enlace</strong> con los participantes</li>
            <li>Los usuarios pueden unirse usando cualquiera de los dos métodos</li>
            <li>La sala estará disponible hasta que expire su duración</li>
          </ul>
        </div>
      </div>

      <div className="modal-actions" style={{ borderTop: '1px solid #e0e0e0' }}>
        <button className="btn btn-primary" onClick={onClose}>
          Entrar a la Sala
        </button>
      </div>
    </BaseModal>
  );
};

export default RoomCreatedModal;
