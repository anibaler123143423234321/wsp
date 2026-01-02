import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import apiService from '../../apiService';
import Label from '../../components/form/Label';
import Input from '../../components/form/Input';
import Button from '../../components/form/Button';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [selectedSede, setSelectedSede] = useState('CHICLAYO_PIURA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      // Pasar la sede seleccionada al servicio de login
      const result = await apiService.login(credentials, selectedSede);

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
        <h1 className="welcome-title">Acceso al Sistema</h1>
        <p className="welcome-subtitle">AI Chat de +34 Call Center</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Label>
              Usuario <span className="text-error-500">*</span>{" "}
            </Label>
            <Input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              required
              placeholder="Ingrese su usuario"
              className="pl-5"
              style={{ paddingLeft: '1rem' }}
              autoComplete="username"
            />
          </div>

          <div>
            <Label>
              Contraseña <span className="text-error-500">*</span>{" "}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                placeholder="Ingrese su contraseña"
                className="pl-5"
                style={{ paddingLeft: '1rem' }}
                autoComplete="current-password"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </span>
            </div>
          </div>

          {/* Sede Selector - Premium Segmented Control */}
          <div className="sede-toggle-container">
            <div
              className="sede-toggle"
              onClick={() => setSelectedSede(selectedSede === 'CHICLAYO_PIURA' ? 'LIMA' : 'CHICLAYO_PIURA')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedSede(selectedSede === 'CHICLAYO_PIURA' ? 'LIMA' : 'CHICLAYO_PIURA');
                }
              }}
              aria-label="Seleccionar sede"
            >
              {/* Slider animado */}
              <div className={`sede-toggle-slider ${selectedSede === 'LIMA' ? 'lima' : ''}`}></div>

              {/* Opciones */}
              <div className={`sede-toggle-option ${selectedSede === 'CHICLAYO_PIURA' ? 'active' : ''}`}>
                CHICLAYO / PIURA
              </div>
              <div className={`sede-toggle-option ${selectedSede === 'LIMA' ? 'active' : ''}`}>
                LIMA
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold uppercase bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <span className="button-content">
                  <div className="loading-spinner"></div>
                  INGRESANDO...
                </span>
              ) : (
                'INGRESAR'
              )}
            </Button>
          </div>

          <div className="forgot-password">
            <a href="#" onClick={(e) => e.preventDefault()}>¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </form >
    </div >
  );
};

export default Login;
