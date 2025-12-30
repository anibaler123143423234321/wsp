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
        <h1 className="welcome-title">BIENVENIDOS</h1>
        <p className="welcome-subtitle">Al CHAT de +34 Call Center</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              style={{ paddingLeft: '1.5rem' }}
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
                style={{ paddingLeft: '1.5rem' }}
                autoComplete="current-password"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center w-full mb-4">
            <div
              className="relative flex items-center w-70 h-8 bg-gray-200 rounded-full cursor-pointer p-1"
              onClick={() => setSelectedSede(selectedSede === 'CHICLAYO_PIURA' ? 'LIMA' : 'CHICLAYO_PIURA')}
            >
              {/* Toggle Background/Slider */}
              <div
                className={`absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-red-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${selectedSede === 'LIMA' ? 'translate-x-full' : 'translate-x-0'
                  }`}
              ></div>

              {/* Text Labels */}
              <div className={`z-10 flex-1 text-center text-xs font-bold transition-colors duration-300 ${selectedSede === 'CHICLAYO_PIURA' ? 'text-white' : 'text-gray-500'}`}>
                CHICLAYO / PIURA
              </div>
              <div className={`z-10 flex-1 text-center text-xs font-bold transition-colors duration-300 ${selectedSede === 'LIMA' ? 'text-white' : 'text-gray-500'}`}>
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
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
