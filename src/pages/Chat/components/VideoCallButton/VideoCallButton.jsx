import React from 'react';
import { FaPhone } from 'react-icons/fa';

const VideoCallButton = ({ onStartVideoCall, isGroup, user }) => {
    // 1. Si no hay función, no renderizamos nada
    if (!onStartVideoCall) return null;

    // 2. Lógica de permisos robusta
    // Aceptamos 'role' o 'rol', y convertimos a mayúsculas para evitar errores
    const userRole = (user?.role || user?.rol || '').toUpperCase();

    const allowedRoles = ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'COORDINADOR'];
    const hasPermission = allowedRoles.includes(userRole);

    // 3. Decidir si mostrar el botón
    // Si NO es grupo -> Siempre mostrar
    // Si ES grupo -> Solo si tiene permiso
    const showButton = !isGroup || (isGroup && hasPermission);

    if (!showButton) return null;

    return (
        <button
            className="header-icon-btn video-btn"
            onClick={onStartVideoCall}
            title={isGroup ? "Iniciar videollamada grupal" : "Iniciar videollamada"}
        >
            <FaPhone size={20} color="rgb(239, 68, 68)" style={{ transform: 'scaleX(-1)' }} />
        </button>
    );
};

export default VideoCallButton;