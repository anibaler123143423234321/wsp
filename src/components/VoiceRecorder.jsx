import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaStop } from 'react-icons/fa';
import './VoiceRecorder.css';

// Icono de micrófono personalizado (estilo WhatsApp)
const MicrophoneIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    height="24"
    width="24"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    fill="currentColor"
  >
    <path d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM12 21C11.4477 21 11 20.5523 11 20V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.78727 14.5396 5.24207 13.3387 5.06441 11.9973C4.9919 11.4498 5.44772 11 6 11C6.55228 11 6.98782 11.4518 7.0905 11.9945C7.27271 12.9574 7.73004 13.805 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.27 13.805 16.7273 12.9574 16.9095 11.9945C17.0122 11.4518 17.4477 11 18 11C18.5523 11 19.0081 11.4498 18.9356 11.9973C18.7579 13.3387 18.2127 14.5396 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V20C13 20.5523 12.5523 21 12 21ZM12 12C12.2833 12 12.5208 11.9042 12.7125 11.7125C12.9042 11.5208 13 11.2833 13 11V5C13 4.71667 12.9042 4.47917 12.7125 4.2875C12.5208 4.09583 12.2833 4 12 4C11.7167 4 11.4792 4.09583 11.2875 4.2875C11.0958 4.47917 11 4.71667 11 5V11C11 11.2833 11.0958 11.5208 11.2875 11.7125C11.4792 11.9042 11.7167 12 12 12Z" />
  </svg>
);

const VoiceRecorder = ({ onSendAudio, canSendMessages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup al desmontar
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar temporizador
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRecording(false);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const sendAudio = () => {
    if (audioBlob) {
      // Crear un archivo desde el blob
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      onSendAudio(audioFile);
      
      // Limpiar
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Si está grabando o tiene un audio grabado, mostrar la interfaz de grabación
  if (isRecording || audioBlob) {
    return (
      <div className="voice-recorder-active">
        <button
          className="voice-recorder-cancel"
          onClick={cancelRecording}
          title="Cancelar grabación"
        >
          <FaTimes />
        </button>

        <div className="voice-recorder-info">
          {isRecording ? (
            <>
              <div className="voice-recorder-pulse">
                <MicrophoneIcon />
              </div>
              <span className="voice-recorder-time recording">{formatTime(recordingTime)}</span>
            </>
          ) : (
            <>
              <div className="voice-recorder-icon">
                <MicrophoneIcon />
              </div>
              <span className="voice-recorder-time">{formatTime(recordingTime)}</span>
            </>
          )}
        </div>

        {isRecording ? (
          <button
            className="voice-recorder-stop"
            onClick={stopRecording}
            title="Detener grabación"
          >
            <FaStop />
          </button>
        ) : (
          <button
            className="voice-recorder-send"
            onClick={sendAudio}
            title="Enviar audio"
          >
            <FaPaperPlane />
          </button>
        )}
      </div>
    );
  }

  // Botón normal de micrófono
  return (
    <button
      className={`voice-recorder-btn ${!canSendMessages ? 'disabled' : ''}`}
      onClick={startRecording}
      disabled={!canSendMessages}
      title={canSendMessages ? "Grabar mensaje de voz" : "No puedes enviar mensajes en esta conversación"}
    >
      <MicrophoneIcon className="voice-recorder-icon-btn" />
    </button>
  );
};

export default VoiceRecorder;

