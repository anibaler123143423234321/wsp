import { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaTimes, FaPaperPlane, FaStop } from 'react-icons/fa';
import './VoiceRecorder.css';

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
                <FaMicrophone />
              </div>
              <span className="voice-recorder-time recording">{formatTime(recordingTime)}</span>
            </>
          ) : (
            <>
              <div className="voice-recorder-icon">
                <FaMicrophone />
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
      <FaMicrophone className="voice-recorder-icon-btn" />
    </button>
  );
};

export default VoiceRecorder;

