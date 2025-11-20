import { useState, useEffect } from 'react';
import './ActiveVideoCallBanner.css';

const ActiveVideoCallBanner = ({ messages, currentUsername, isGroup, currentRoomCode, to, socket, user }) => {
  const [activeCall, setActiveCall] = useState(null);

  // Función para calcular tiempo relativo
  const getRelativeTime = (timeStr) => {
    if (!timeStr) return '';

    try {
      const now = new Date();
      const messageTime = new Date(timeStr);
      const diffMs = now - messageTime;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours}h`;

      return timeStr.split(' ')[1] || timeStr; // Retornar solo la hora
    } catch {
      return timeStr;
    }
  };

  useEffect(() => {
    console.log('🔍 ActiveVideoCallBanner - Buscando videollamadas en:', {
      totalMessages: messages.length,
      isGroup,
      currentRoomCode,
      to
    });

    // 🔥 NUEVO: Buscar el mensaje de videollamada más reciente (por ID, no por fecha)
    // Filtrar solo mensajes de videollamada de esta sala/chat
    const videoCallMessages = messages.filter(msg => {
      // Detectar si es videollamada
      const messageText = msg.text || msg.message || '';
      const isVideoCall = msg.type === 'video_call' ||
                          (typeof messageText === 'string' && messageText.includes('📹 Videollamada'));

      console.log('🔍 Revisando mensaje:', {
        id: msg.id,
        type: msg.type,
        text: messageText?.substring(0, 50),
        isVideoCall,
        videoCallUrl: msg.videoCallUrl,
        videoRoomID: msg.videoRoomID,
        receiver: msg.receiver,
        metadata: msg.metadata
      });

      if (!isVideoCall) return false;

      // 🔥 NUEVO: Verificar que la videollamada esté activa
      const isActive = !msg.metadata || msg.metadata.isActive !== false;
      console.log('🔍 Verificando si videollamada está activa:', {
        id: msg.id,
        hasMetadata: !!msg.metadata,
        metadataIsActive: msg.metadata?.isActive,
        isActive
      });

      if (!isActive) {
        console.log('❌ Videollamada inactiva, no mostrar banner:', msg.id);
        return false;
      }

      // 🔥 SIMPLIFICADO: Solo verificar que pertenezca a este chat (sin verificar fecha)
      // El mensaje más reciente (por ID) será el que se muestre
      if (isGroup) {
        // Para grupos, verificar que el receiver coincida con el nombre del grupo
        return msg.receiver === to;
      } else {
        // Para chats individuales
        return (msg.sender === to || msg.receiver === to || msg.to === to);
      }
    });

    console.log('📹 Mensajes de videollamada encontrados:', videoCallMessages.length);

    // Obtener la más reciente
    if (videoCallMessages.length > 0) {
      const mostRecent = videoCallMessages[videoCallMessages.length - 1];

      console.log('📹 Mensaje más reciente:', mostRecent);

      // Extraer URL
      let videoUrl = mostRecent.videoCallUrl;
      if (!videoUrl && (mostRecent.text || mostRecent.message)) {
        const textToSearch = mostRecent.text || mostRecent.message;
        const urlMatch = textToSearch.match(/http[s]?:\/\/[^\s]+/);
        if (urlMatch) videoUrl = urlMatch[0];
      }

      console.log('🔗 URL extraída:', videoUrl);

      if (videoUrl) {
        const callData = {
          url: videoUrl,
          roomID: mostRecent.videoRoomID,
          initiator: mostRecent.sender || mostRecent.from,
          time: getRelativeTime(mostRecent.sentAt || mostRecent.time),
          isOwn: mostRecent.sender === currentUsername || mostRecent.sender === 'Tú' || mostRecent.isSelf
        };
        console.log('✅ Activando banner con:', callData);
        setActiveCall(callData);
      } else {
        console.log('❌ No se encontró URL, no se muestra banner');
        setActiveCall(null);
      }
    } else {
      console.log('❌ No hay mensajes de videollamada recientes');
      setActiveCall(null);
    }
  }, [messages, currentUsername, isGroup, currentRoomCode, to]);

  if (!activeCall) return null;

  const handleJoinCall = () => {
    window.open(activeCall.url, '_blank', 'width=1280,height=720,menubar=no,toolbar=no');
  };

  const handleCloseCall = () => {
    if (!socket || !activeCall) return;

    // 🔥 Obtener nombre completo del usuario
    const closedByName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : currentUsername;

    // Emitir evento para cerrar la sala
    socket.emit('endVideoCall', {
      roomID: activeCall.roomID,
      roomCode: currentRoomCode,
      closedBy: closedByName,
      isGroup
    });

    console.log('🔴 Cerrando videollamada para todos:', {
      roomID: activeCall.roomID,
      roomCode: currentRoomCode,
      closedBy: closedByName
    });

    // Ocultar el banner localmente
    setActiveCall(null);
  };

  return (
    <div className="active-video-call-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>

        <div className="banner-info">
          <div className="banner-title">
            {activeCall.isOwn ? 'Tu videollamada' : `${activeCall.initiator} inició videollamada`}
          </div>
        </div>

        <button className="banner-join-btn" onClick={handleJoinCall}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
          Unirse
        </button>

        {activeCall.isOwn && (
          <button className="banner-close-btn" onClick={handleCloseCall} title="Cerrar sala para todos">
            ✕ Cerrar
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveVideoCallBanner;

