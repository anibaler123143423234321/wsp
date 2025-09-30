import React, { useState } from 'react';
import { FaUser } from 'react-icons/fa';
import apiService from '../apiService';
import './Login.css';

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
        <h1 className="welcome-title">BIENVENIDOS</h1>
        <p className="welcome-subtitle">Al CHAT de +34 Call Center</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <div className="input-wrapper">
            <div className="icon-container">
              <FaUser size={18} color="#666" />
            </div>
            <div className="input-container">
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Usuario"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="input-wrapper">
            <div className="icon-container">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="11" width="16" height="9" rx="2" stroke="#666" strokeWidth="1.5"/>
                <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="input-container">
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="contraseña"
              />
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
              INGRESANDO...
            </span>
          ) : (
            'INGRESAR'
          )}
        </button>

        <div className="forgot-password">
          <a href="#" onClick={(e) => e.preventDefault()}>¿Olvidaste tu contraseña?</a>
        </div>
      </form>
    </div>
  );
};

export default Login;
