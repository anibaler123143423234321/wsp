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
        <h2>Iniciar sesión</h2>
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
            <div className="input-icon" aria-hidden>
              {/* User outline SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" stroke="#98a7b3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 22a9 9 0 1 0-18 0" stroke="#98a7b3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
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
            <div className="input-icon" aria-hidden>
              {/* Lock outline SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="11" width="16" height="9" rx="2" stroke="#98a7b3" strokeWidth="1.8"/>
                <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#98a7b3" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="login-button"
          disabled={loading}
        >
          {loading ? (
            <span className="button-content">
              <div className="loading-spinner"></div>
              Iniciando sesión...
            </span>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
