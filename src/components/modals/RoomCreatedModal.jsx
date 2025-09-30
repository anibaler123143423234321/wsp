import React from 'react';
import { FaCheckCircle, FaTimes, FaHome, FaClipboard } from 'react-icons/fa';
import './Modal.css';

const RoomCreatedModal = ({ isOpen, onClose, roomData }) => {
  if (!isOpen || !roomData) return null;

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content room-created-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FaCheckCircle style={{color:'green',marginRight:6}}/> Sala Creada Exitosamente</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        
        <div className="modal-body">
          <div className="room-info">
            <h3><FaHome style={{marginRight:4}}/> {roomData.name}</h3>
            
            <div className="info-section">
              <label>Código de la sala:</label>
              <div className="copy-field">
                <input 
                  type="text" 
                  value={roomData.roomCode} 
                  readOnly 
                  className="code-input"
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
              <label>Enlace de la sala:</label>
              <div className="copy-field">
                <input 
                  type="text" 
                  value={roomData.roomUrl} 
                  readOnly 
                  className="url-input"
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
                <span className="stat-label">Capacidad:</span>
                <span className="stat-value">{roomData.currentMembers}/{roomData.maxCapacity}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Estado:</span>
                <span className="stat-value">{roomData.isActive ? '🟢 Activa' : '🔴 Inactiva'}</span>
              </div>
            </div>

            <div className="instructions">
              <p><strong>📝 Instrucciones:</strong></p>
              <ul>
                <li>Comparte el <strong>código</strong> o el <strong>enlace</strong> con los participantes</li>
                <li>Los usuarios pueden unirse usando cualquiera de los dos métodos</li>
                <li>La sala estará disponible hasta que expire su duración</li>
              </ul>
            </div>
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Entrar a la Sala
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreatedModal;
