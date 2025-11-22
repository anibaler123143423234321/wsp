import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Cargando...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

