import { useState, useRef, useEffect } from "react";
import { FaTrash, FaPaperPlane } from "react-icons/fa";
import "./VoiceRecorder.css";

// 🔥 TU ICONO DE MICRÓFONO (SVG EXACTO)
const MicrophoneIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className={className} fill="currentColor">
    <path d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM12 21C11.4477 21 11 20.5523 11 20V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.78727 14.5396 5.24207 13.3387 5.06441 11.9973C4.9919 11.4498 5.44772 11 6 11C6.55228 11 6.98782 11.4518 7.0905 11.9945C7.27271 12.9574 7.73004 13.805 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.27 13.805 16.7273 12.9574 16.9095 11.9945C17.0122 11.4518 17.4477 11 18 11C18.5523 11 19.0081 11.4498 18.9356 11.9973C18.7579 13.3387 18.2127 14.5396 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V20C13 20.5523 12.5523 21 12 21ZM12 12C12.2833 12 12.5208 11.9042 12.7125 11.7125C12.9042 11.5208 13 11.2833 13 11V5C13 4.71667 12.9042 4.47917 12.7125 4.2875C12.5208 4.09583 12.2833 4 12 4C11.7167 4 11.4792 4.09583 11.2875 4.2875C11.0958 4.47917 11 4.71667 11 5V11C11 11.2833 11.0958 11.5208 11.2875 11.7125C11.4792 11.9042 11.7167 12 12 12Z" />
  </svg>
);

const VoiceRecorder = ({ onSendAudio, canSendMessages, onRecordingStart, onRecordingStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  // 20 barras para que se vea más fluido el movimiento
  const [audioLevel, setAudioLevel] = useState(Array(20).fill(10));
  const [isSendingLocal, setIsSendingLocal] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    if (isSendingLocal) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. Configurar MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      if (onRecordingStart) onRecordingStart();

      // 2. Configurar Analizador de Audio (Ondas)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // 3. Loop de animación
      const updateVisualizer = () => {
        if (!analyserRef.current || !isRecording) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Ajustamos a 20 barras
        const newLevels = [];
        const step = Math.floor(dataArray.length / 20);

        for (let i = 0; i < 20; i++) {
          const value = dataArray[i * step] || 0;
          // Hacemos que la barra se mueva más notablemente
          const height = Math.max(15, (value / 255) * 100);
          newLevels.push(height);
        }

        setAudioLevel(newLevels);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecordingInternal = (shouldSend) => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });

      if (shouldSend) {
        setIsSendingLocal(true);
        onSendAudio(audioFile);
        setIsSendingLocal(false);
      }

      cleanup();
    };

    mediaRecorderRef.current.stop();
  };

  const cleanup = () => {
    setIsRecording(false);
    setRecordingTime(0);
    setAudioLevel(Array(20).fill(10));

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (onRecordingStop) onRecordingStop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const handleCancel = () => {
    stopRecordingInternal(false);
  };

  const handleSend = () => {
    stopRecordingInternal(true);
  };

  // --- RENDERIZADO ---

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        className={`voice-recorder-btn ${!canSendMessages ? "disabled" : ""}`}
        disabled={!canSendMessages}
        title="Grabar nota de voz"
      >
        <MicrophoneIcon className="voice-recorder-icon-btn" />
      </button>
    );
  }

  return (
    <div className="voice-recorder-active">
      <button className="voice-recorder-cancel" onClick={handleCancel} title="Cancelar">
        <FaTrash />
      </button>

      <div className="voice-recorder-info">
        <span className="voice-recorder-time recording">{formatTime(recordingTime)}</span>

        {/* Visualizador de ondas */}
        <div className="wave-bars-container">
          {audioLevel.map((height, idx) => (
            <div
              key={idx}
              className="wave-bar"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      {/* 🔥 BOTÓN DE ENVIAR CON TEXTO "Enviar mensaje" */}
      <button className="voice-recorder-send" onClick={handleSend} disabled={isSendingLocal}>
        {isSendingLocal ? (
          <div className="spinner-small"></div>
        ) : (
          <>
            <span style={{ marginRight: '8px', fontSize: '13px', fontWeight: '600' }}>Enviar mensaje</span>
            <FaPaperPlane size={14} />
          </>
        )}
      </button>
    </div>
  );
};

export default VoiceRecorder;