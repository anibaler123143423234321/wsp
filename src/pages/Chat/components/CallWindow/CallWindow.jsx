import React, { useEffect, useRef, useState } from 'react';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaExpand,
  FaCompress,
  FaTimes
} from 'react-icons/fa';
import './CallWindow.css';

const CallWindow = ({
  isOpen,
  callType, // 'audio' | 'video'
  isIncoming,
  callerName,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
  callStatus, // 'ringing' | 'connecting' | 'connected' | 'ended'
  callDuration
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null); // Para reproducir audio remoto
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Asignar streams a los elementos de video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Asignar stream remoto al elemento de audio (para llamadas de audio)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      // console.log('🔊 Asignando stream remoto al elemento de audio');
      remoteAudioRef.current.srcObject = remoteStream;
      // Asegurarse de que se reproduzca
      remoteAudioRef.current.play().catch(err => {
        console.error('❌ Error al reproducir audio remoto:', err);
      });
    }
  }, [remoteStream]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className={`call-window ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Audio remoto oculto - siempre presente para reproducir el audio */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      <div className="call-header">
        <div className="call-info">
          <h3>{callerName}</h3>
          <p className="call-status">
            {callStatus === 'ringing' && (isIncoming ? 'Llamada entrante...' : 'Llamando...')}
            {callStatus === 'connecting' && 'Conectando...'}
            {callStatus === 'connected' && formatDuration(callDuration)}
            {callStatus === 'ended' && 'Llamada finalizada'}
          </p>
        </div>
        <div className="call-header-buttons">
          {callStatus !== 'ended' && (
            <button
              className="fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          )}
          {callStatus === 'ended' && (
            <button
              className="close-btn"
              onClick={onEnd}
              title="Cerrar"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="call-video-container">
        {/* Video remoto (principal) */}
        {callType === 'video' && (
          <div className="remote-video-wrapper">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
              />
            ) : (
              <div className="video-placeholder">
                <div className="avatar-large">
                  {callerName.charAt(0).toUpperCase()}
                </div>
                <p>{callerName}</p>
              </div>
            )}
          </div>
        )}

        {/* Solo audio - mostrar avatar */}
        {callType === 'audio' && (
          <div className="audio-call-display">
            <div className="avatar-large">
              {callerName.charAt(0).toUpperCase()}
            </div>
            <h2>{callerName}</h2>
            <p className="call-status-large">
              {callStatus === 'ringing' && (isIncoming ? 'Llamada entrante...' : 'Llamando...')}
              {callStatus === 'connecting' && 'Conectando...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
            </p>
          </div>
        )}

        {/* Video local (miniatura) */}
        {callType === 'video' && localStream && !isVideoOff && (
          <div className="local-video-wrapper">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        )}
      </div>

      <div className="call-controls">
        {/* Controles durante llamada activa */}
        {callStatus === 'connected' && (
          <>
            <button
              className={`control-btn ${isMuted ? 'active' : ''}`}
              onClick={onToggleMute}
              title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            >
              {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>

            {callType === 'video' && (
              <button
                className={`control-btn ${isVideoOff ? 'active' : ''}`}
                onClick={onToggleVideo}
                title={isVideoOff ? 'Activar cámara' : 'Desactivar cámara'}
              >
                {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
              </button>
            )}

            <button
              className="control-btn end-call"
              onClick={onEnd}
              title="Finalizar llamada"
            >
              <FaPhoneSlash />
            </button>
          </>
        )}

        {/* Controles para llamada entrante */}
        {callStatus === 'ringing' && isIncoming && (
          <>
            <button
              className="control-btn accept-call"
              onClick={onAccept}
              title="Aceptar llamada"
            >
              📞 Aceptar
            </button>
            <button
              className="control-btn reject-call"
              onClick={onReject}
              title="Rechazar llamada"
            >
              <FaPhoneSlash /> Rechazar
            </button>
          </>
        )}

        {/* Controles para llamada saliente en espera */}
        {callStatus === 'ringing' && !isIncoming && (
          <button
            className="control-btn end-call"
            onClick={onEnd}
            title="Cancelar llamada"
          >
            <FaPhoneSlash /> Cancelar
          </button>
        )}

        {/* Controles para llamada conectando */}
        {callStatus === 'connecting' && (
          <button
            className="control-btn end-call"
            onClick={onEnd}
            title="Finalizar llamada"
          >
            <FaPhoneSlash />
          </button>
        )}

        {/* Botón para cerrar cuando la llamada finaliza */}
        {callStatus === 'ended' && (
          <button
            className="control-btn close-call"
            onClick={onEnd}
            title="Cerrar"
          >
            ✕ Cerrar
          </button>
        )}
      </div>
    </div>
  );
};

export default CallWindow;

