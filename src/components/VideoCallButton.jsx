import React from 'react';
import { FaVideo } from 'react-icons/fa';

const VideoCallButton = ({ onStartVideoCall, isGroup, user }) => {
    // 1. Si no hay función, no renderizamos nada
    if (!onStartVideoCall) return null;

    // 2. LOG DE DEPURACIÓN (Abre la consola con F12 para ver esto)
    // Esto te dirá exactamente qué rol está leyendo el sistema
    // console.log("🔍 Debug VideoCall - Usuario:", user);
    // console.log("🔍 Debug VideoCall - Rol detectado:", user?.role || user?.rol);

    // 3. Lógica de permisos robusta
    // Aceptamos 'role' o 'rol', y convertimos a mayúsculas para evitar errores
    const userRole = (user?.role || user?.rol || '').toUpperCase();

    const allowedRoles = ['ADMIN', 'JEFEPISO', 'PROGRAMADOR'];
    const hasPermission = allowedRoles.includes(userRole);

    // 4. Decidir si mostrar el botón
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
            <FaVideo />
        </button>
    );
};

export default VideoCallButton;