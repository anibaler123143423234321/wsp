import { useState, useRef, useEffect } from "react";
import { FaTrash, FaPaperPlane, FaStop, FaPlay, FaPause } from "react-icons/fa";
import "./VoiceRecorder.css";

//  TU ICONO DE MICRÓFONO (SVG EXACTO)
const MicrophoneIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className={className} fill="currentColor">
    <path d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM12 21C11.4477 21 11 20.5523 11 20V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.78727 14.5396 5.24207 13.3387 5.06441 11.9973C4.9919 11.4498 5.44772 11 6 11C6.55228 11 6.98782 11.4518 7.0905 11.9945C7.27271 12.9574 7.73004 13.805 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.27 13.805 16.7273 12.9574 16.9095 11.9945C17.0122 11.4518 17.4477 11 18 11C18.5523 11 19.0081 11.4498 18.9356 11.9973C18.7579 13.3387 18.2127 14.5396 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V20C13 20.5523 12.5523 21 12 21ZM12 12C12.2833 12 12.5208 11.9042 12.7125 11.7125C12.9042 11.5208 13 11.2833 13 11V5C13 4.71667 12.9042 4.47917 12.7125 4.2875C12.5208 4.09583 12.2833 4 12 4C11.7167 4 11.4792 4.09583 11.2875 4.2875C11.0958 4.47917 11 4.71667 11 5V11C11 11.2833 11.0958 11.5208 11.2875 11.7125C11.4792 11.9042 11.7167 12 12 12Z" />
  </svg>
);

// Icono pequeño para el botón de reanudar
const FaMicrophoneIconSmall = () => (
  <svg viewBox="0 0 24 24" height="16" width="16" fill="currentColor">
    <path d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM12 21C11.4477 21 11 20.5523 11 20V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.78727 14.5396 5.24207 13.3387 5.06441 11.9973C4.9919 11.4498 5.44772 11 6 11C6.55228 11 6.98782 11.4518 7.0905 11.9945C7.27271 12.9574 7.73004 13.805 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.27 13.805 16.7273 12.9574 16.9095 11.9945C17.0122 11.4518 17.4477 11 18 11C18.5523 11 19.0081 11.4498 18.9356 11.9973C18.7579 13.3387 18.2127 14.5396 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V20C13 20.5523 12.5523 21 12 21ZM12 12C12.2833 12 12.5208 11.9042 12.7125 11.7125C12.9042 11.5208 13 11.2833 13 11V5C13 4.71667 12.9042 4.47917 12.7125 4.2875C12.5208 4.09583 12.2833 4 12 4C11.7167 4 11.4792 4.09583 11.2875 4.2875C11.0958 4.47917 11 4.71667 11 5V11C11 11.2833 11.0958 11.5208 11.2875 11.7125C11.4792 11.9042 11.7167 12 12 12Z" />
  </svg>
);

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const VoiceRecorder = ({ onSendAudio, canSendMessages, onRecordingStart, onRecordingStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(() => Array(20).fill(10));
  const [isSendingLocal, setIsSendingLocal] = useState(false);

  // Estados para Preview
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanup();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);

  // --- LÓGICA DE VISUALIZACIÓN DE AUDIO ---
  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateWave = () => {
      if (!isRecording || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Tomamos una muestra de las frecuencias para las 20 barras
      const step = Math.floor(bufferLength / 20);
      const newLevels = [];

      for (let i = 0; i < 20; i++) {
        const value = dataArray[i * step];
        // Normalizamos el valor para que sea un porcentaje de altura (min 10%, max 100%)
        const height = Math.max(10, (value / 255) * 100);
        newLevels.push(height);
      }

      setAudioLevel(newLevels);
      animationFrameRef.current = requestAnimationFrame(updateWave);
    };

    updateWave();
  };

  // --- CONTROLES DE GRABACIÓN ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Configurar AudioContext para visualización
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Configurar MediaRecorder
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
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setRecordedUrl(url);

        // Obtener duración del audio
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          if (audio.duration === Infinity) {
            audio.currentTime = 1e101;
            audio.ontimeupdate = function () {
              this.ontimeupdate = () => {
                return;
              }
              audio.currentTime = 0;
              setPreviewDuration(audio.duration);
            }
          } else {
            setPreviewDuration(audio.duration);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (onRecordingStart) onRecordingStart();

      // Iniciar Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Iniciar Visualizador
      visualizeAudio();

    } catch (error) {
      console.error("Error accediendo al micrófono:", error);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      // Mantener audioContext suspendido si es necesario, pero generalmente pause del recorder basta
      if (audioContextRef.current) audioContextRef.current.suspend();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Reanudar Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Reanudar Visualizador
      if (audioContextRef.current) audioContextRef.current.resume();
      visualizeAudio();
    }
  };

  const stopRecordingToPreview = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      cleanupRecordingResources();
      setIsRecording(false);
      // Nota: No limpiamos el blob ni la URL aquí, porque pasamos a modo Preview
    }
  };

  const cleanupRecordingResources = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const cleanup = () => {
    cleanupRecordingResources();
    setRecordingTime(0);
    setAudioLevel(Array(20).fill(10));
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsPlayingPreview(false);
    setPreviewTime(0);
    if (onRecordingStop) onRecordingStop();
  };

  const handleCancel = () => {
    cleanup();
  };

  const handleSend = () => {
    if (!recordedBlob) return;

    setIsSendingLocal(true);
    const ext = recordedBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const audioFile = new File([recordedBlob], `audio-${Date.now()}.${ext}`, { type: recordedBlob.type });

    onSendAudio(audioFile);
    setIsSendingLocal(false);
    cleanup();
  };

  // --- PREVIEW LOGIC ---
  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
    }
    setIsPlayingPreview(!isPlayingPreview);
  };

  const handlePreviewTimeUpdate = () => {
    if (previewAudioRef.current) {
      setPreviewTime(previewAudioRef.current.currentTime);
    }
  };

  const handlePreviewEnded = () => {
    setIsPlayingPreview(false);
    setPreviewTime(0);
    if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
  };

  // --- RENDERIZADO ---

  if (!isRecording && !recordedBlob) {
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

  if (isRecording) {
    return (
      <div className="voice-recorder-active">
        <button className="voice-recorder-cancel" onClick={handleCancel} title="Cancelar">
          <FaTrash />
        </button>

        <div className="voice-recorder-info">
          <span className={`voice-recorder-time ${isPaused ? "paused" : "recording"}`}>
            {formatTime(recordingTime)}
          </span>

          <div className="wave-bars-container">
            {audioLevel.map((height, idx) => (
              <div
                key={idx}
                className={`wave-bar ${isPaused ? "paused" : ""}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="voice-recorder-controls">
          {isPaused ? (
            <button className="voice-recorder-control-btn" onClick={resumeRecording} title="Reanudar">
              <FaMicrophoneIconSmall />
            </button>
          ) : (
            <button className="voice-recorder-control-btn" onClick={pauseRecording} title="Pausar">
              <FaPause />
            </button>
          )}
          <button className="voice-recorder-stop-btn" onClick={stopRecordingToPreview} title="Detener y Revisar">
            <FaStop />
          </button>
        </div>
      </div>
    );
  }

  if (recordedBlob) {
    return (
      <div className="voice-recorder-active preview-mode">
        <button className="voice-recorder-cancel" onClick={handleCancel} title="Descartar">
          <FaTrash />
        </button>

        <div className="voice-recorder-preview">
          <button className="preview-play-btn" onClick={togglePreviewPlay}>
            {isPlayingPreview ? <FaPause /> : <FaPlay />}
          </button>

          <div className="preview-progress">
            <div
              className="preview-progress-bar"
              style={{ width: `${(previewTime / previewDuration) * 100}%` }}
            />
          </div>

          <span className="preview-time">
            {formatTime(previewDuration - previewTime)}
          </span>

          <audio
            ref={previewAudioRef}
            src={recordedUrl}
            onTimeUpdate={handlePreviewTimeUpdate}
            onEnded={handlePreviewEnded}
            style={{ display: 'none' }}
          />
        </div>

        <button className="voice-recorder-send" onClick={handleSend} disabled={isSendingLocal}>
          {isSendingLocal ? (
            <div className="spinner-small"></div>
          ) : (
            <FaPaperPlane size={14} />
          )}
        </button>
      </div>
    );
  }

  return null;
};

export default VoiceRecorder;