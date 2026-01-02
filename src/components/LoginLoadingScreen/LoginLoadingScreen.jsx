import React from 'react';
import './LoginLoadingScreen.css';

const SpinnerIcon = () => (
    <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 2400 2400"
        className="loading-spinner-icon"
    >
        <g strokeWidth="200" strokeLinecap="round" stroke="currentColor" fill="none" id="spinner">
            <line x1="1200" y1="600" x2="1200" y2="100" />
            <line opacity="0.5" x1="1200" y1="2300" x2="1200" y2="1800" />
            <line opacity="0.917" x1="900" y1="680.4" x2="650" y2="247.4" />
            <line opacity="0.417" x1="1750" y1="2152.6" x2="1500" y2="1719.6" />
            <line opacity="0.833" x1="680.4" y1="900" x2="247.4" y2="650" />
            <line opacity="0.333" x1="2152.6" y1="1750" x2="1719.6" y2="1500" />
            <line opacity="0.75" x1="600" y1="1200" x2="100" y2="1200" />
            <line opacity="0.25" x1="2300" y1="1200" x2="1800" y2="1200" />
            <line opacity="0.667" x1="680.4" y1="1500" x2="247.4" y2="1750" />
            <line opacity="0.167" x1="2152.6" y1="650" x2="1719.6" y2="900" />
            <line opacity="0.583" x1="900" y1="1719.6" x2="650" y2="2152.6" />
            <line opacity="0.083" x1="1750" y1="247.4" x2="1500" y2="680.4" />
            <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667"
                values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"
                dur="0.83333s"
                begin="0s"
                repeatCount="indefinite"
                calcMode="discrete"
            />
        </g>
    </svg>
);

const LoginLoadingScreen = ({ progress = 0, message = 'Cargando...' }) => {
    return (
        <div className="login-loading-screen">
            <div className="login-loading-content">
                {/* Spinner animado */}
                <div className="loading-spinner-container">
                    <SpinnerIcon />
                </div>

                {/* Mensaje y porcentaje */}
                <div className="loading-text">
                    {message} [{Math.round(progress)}%]
                </div>

                {/* Barra de progreso */}
                <div className="loading-progress-bar">
                    <div
                        className="loading-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Mensaje de seguridad */}
                <div className="loading-security">
                    <svg
                        className="lock-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Conexión <span className="highlight">segura</span> establecida</span>
                </div>
            </div>
        </div>
    );
};

export default LoginLoadingScreen;
