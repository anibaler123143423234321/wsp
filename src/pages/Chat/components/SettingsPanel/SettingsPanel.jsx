import { FaTimes, FaKey, FaUserCircle, FaCog } from 'react-icons/fa'; // Añadido FaCog
import './SettingsPanel.css';

const SettingsPanel = ({
  isOpen,
  onClose,
  user,
  isSoundEnabled,   // Nueva prop
  onSoundToggle,    // Nueva prop
  onTestSound,      //  Nueva prop: Función para probar sonido mención
  onTestNormalSound,//  Nueva prop: Función para probar sonido normal
  areAlertsEnabled, //  Nueva prop: Estado global de alertas
  onAlertsToggle,    //  Nueva prop: Función para alternar alertas
  areThreadAlertsEnabled, // 🔥 NUEVO
  onThreadAlertsToggle,   // 🔥 NUEVO
  areMessageAlertsEnabled,// 🔥 NUEVO
  onMessageAlertsToggle   // 🔥 NUEVO
}) => {
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

          {/* PERFIL (Centrado y Compacto) */}
          <div className="settings-profile-section">
            <div className="settings-avatar-container">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt="Avatar"
                  className="settings-user-avatar-large"
                />
              ) : (
                <div className="settings-user-avatar-placeholder">
                  {(user?.nombre?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="settings-user-name">
              {user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username || 'Usuario'}
            </h3>
            <p className="settings-user-info">
              @{user?.username} • {user?.role}
            </p>
          </div>

          <div className="settings-cards-container">
            {/* PREFERENCIAS */}
            <div className="settings-card">
              <div className="settings-card-header">
                <h4 style={{ color: '#10B981' }}>Preferencias</h4>
              </div>

              <div className="settings-toggle-item">
                <span className="settings-toggle-label">Silenciar todas las alertas</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={!areAlertsEnabled}
                    onChange={onAlertsToggle}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {/* 🔥 NUEVO: Controles Granulares (Solo si alertas globales están activadas) */}
              {areAlertsEnabled && (
                <div style={{ paddingLeft: '10px', borderLeft: '2px solid #333', marginBottom: '10px' }}>
                  <div className="settings-toggle-item">
                    <span className="settings-toggle-label">Alertas de Mensajes</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={areMessageAlertsEnabled}
                        onChange={onMessageAlertsToggle}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="settings-toggle-item">
                    <span className="settings-toggle-label">Alertas de Hilos</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={areThreadAlertsEnabled}
                        onChange={onThreadAlertsToggle}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              )}

              <div className="settings-toggle-item">
                <span className="settings-toggle-label">Sonido de notificaciones</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={areAlertsEnabled && isSoundEnabled}
                    disabled={!areAlertsEnabled}
                    onChange={onSoundToggle}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="settings-actions">
                <button onClick={onTestNormalSound} className="settings-btn-pill primary" title="Sonido Normal">
                  🔔 Normal
                </button>
                <button onClick={onTestSound} className="settings-btn-pill primary" title="Sonido Mención">
                  🔊 Mención
                </button>
              </div>
            </div>

            {/* SEGURIDAD */}
            <div className="settings-card" style={{ marginTop: '12px' }}>
              <div className="settings-card-header">
                <h4 style={{ color: '#EF4444' }}>Seguridad y Privacidad</h4>
              </div>
              <p className="settings-card-text">
                Te avisaremos si detectamos actividad inusual o nuevos inicios de sesión en tu cuenta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;