import React, { useState } from 'react';
import apiService from '../apiService';

const Login = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiService.login(credentials);
      
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Error en el login');
      }
    } catch {
      setError('Error de conexión. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="login-logo">
          <div className="logo-icon">💬</div>
          <h1>WhatsApp Web</h1>
        </div>
        <h2>Iniciar Sesión</h2>
        <p>Conecta con tu cuenta del sistema</p>
      </div>
      
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <div className="input-container">
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              required
              placeholder=" "
              className="form-input"
            />
            <label htmlFor="username" className="form-label">
              <span className="label-text">Usuario</span>
            </label>
            <div className="input-icon">👤</div>
          </div>
        </div>
        
        <div className="form-group">
          <div className="input-container">
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              placeholder=" "
              className="form-input"
            />
            <label htmlFor="password" className="form-label">
              <span className="label-text">Contraseña</span>
            </label>
            <div className="input-icon">🔒</div>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <span>{error}</span>
          </div>
        )}
        
        <button 
          type="submit" 
          className="login-button"
          disabled={loading}
        >
          <span className="button-content">
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Iniciando sesión...
              </>
            ) : (
              <>
                <span className="button-icon">🚀</span>
                Iniciar Sesión
              </>
            )}
          </span>
        </button>
      </form>
      
      <div className="login-footer">
        <div className="footer-info">
          <div className="info-icon">ℹ️</div>
          <p>Usa las mismas credenciales que usas en el sistema principal</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
