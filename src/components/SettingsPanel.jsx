import { FaTimes, FaKey, FaUserCircle } from 'react-icons/fa';
import './SettingsPanel.css';

const SettingsPanel = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay para cerrar al hacer click fuera */}
      <div 
        className="settings-overlay"
        onClick={onClose}
      />
      
      {/* Panel de configuración */}
      <div className="settings-panel">
        {/* Header */}
        <div className="settings-header">
          <h2>Ajustes</h2>
          <button 
            className="settings-close-btn"
            onClick={onClose}
            title="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        {/* Contenido */}
        <div className="settings-content">
          {/* Información de la cuenta */}
          <div className="settings-section">
            <div className="settings-section-header">
              <FaUserCircle className="settings-section-icon" />
              <h3>Cuenta</h3>
            </div>
            <div className="settings-section-content">
              <div className="settings-item">
                <div className="settings-item-label">Nombre de usuario</div>
                <div className="settings-item-value">{user?.username || 'N/A'}</div>
              </div>
              <div className="settings-item">
                <div className="settings-item-label">Nombre completo</div>
                <div className="settings-item-value">
                  {user?.nombre && user?.apellido 
                    ? `${user.nombre} ${user.apellido}` 
                    : 'N/A'}
                </div>
              </div>
              <div className="settings-item">
                <div className="settings-item-label">Rol</div>
                <div className="settings-item-value">{user?.role || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Notificaciones de seguridad */}
          <div className="settings-section">
            <div className="settings-section-header">
              <FaKey className="settings-section-icon" />
              <h3>Notificaciones de seguridad</h3>
            </div>
            <div className="settings-section-content">
              <div className="settings-info-box">
                <p>
                  Las notificaciones de seguridad te alertan sobre cambios importantes en tu cuenta,
                  como inicios de sesión desde nuevos dispositivos o cambios en la configuración de seguridad.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;

