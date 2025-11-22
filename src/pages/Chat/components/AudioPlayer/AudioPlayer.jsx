import { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaMicrophone } from 'react-icons/fa';
import './AudioPlayer.css';

const AudioPlayer = ({
  src,
  time,
  isOwnMessage,
  userPicture,
  isSent,
  isRead,
  readBy
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Estado inicial: barras grises planas mientras carga
  const [waveformBars, setWaveformBars] = useState(Array(40).fill(5));
  const audioRef = useRef(null);

  // Formatear tiempo
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (timeString) => {
    if (!timeString) return '';
    if (typeof timeString === 'string' && timeString.includes(':')) return timeString;
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return "";
    }
  };

  // 🔥 LÓGICA DE ANÁLISIS DE AUDIO REAL
  useEffect(() => {
    if (!src) return;

    const analyzeAudio = async () => {
      try {
        // 1. Obtenemos el archivo de audio como datos crudos
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        // 2. Creamos un contexto de audio para decodificarlo
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 3. Obtenemos los datos del canal (PCM)
        const rawData = audioBuffer.getChannelData(0);
        const samples = 40; // Queremos 40 barras exactamente
        const blockSize = Math.floor(rawData.length / samples); // Tamaño de cada bloque
        const calculatedBars = [];

        // 4. Calculamos el volumen promedio de cada bloque
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            // Usamos valor absoluto porque la onda va de -1 a 1
            sum += Math.abs(rawData[start + j]);
          }
          // Promedio del bloque
          const average = sum / blockSize;

          // 5. Normalizamos para que se vea bien (amplificamos un poco)
          // Multiplicamos por un factor (ej: 500) y limitamos entre 10% y 100%
          let barHeight = average * 1000;

          if (barHeight > 100) barHeight = 100; // Tope máximo
          if (barHeight < 15) barHeight = 15;   // Tope mínimo para que no desaparezca

          calculatedBars.push(barHeight);
        }

        setWaveformBars(calculatedBars);

      } catch (error) {
        console.error("Error analizando audio:", error);
        // Si falla (ej: CORS), dejamos barras aleatorias suaves como fallback
        setWaveformBars(Array.from({ length: 40 }, () => Math.floor(Math.random() * (60 - 20 + 1)) + 20));
      }
    };

    analyzeAudio();
  }, [src]);

  // Lógica de reproducción normal
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    if (audio.readyState >= 1) setAudioData();

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`wa-audio-wrapper ${isOwnMessage ? 'own' : 'other'}`}>
      <audio ref={audioRef} src={src} preload="metadata" crossorigin="anonymous" />

      <div className="wa-avatar-section">
        <div className="wa-avatar-circle">
          {userPicture ? (
            <img src={userPicture} alt="User" onError={(e) => e.target.style.display = 'none'} />
          ) : (
            <div className="wa-avatar-placeholder">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>
        <div className={`wa-mic-badge ${isOwnMessage ? 'green' : 'blue'}`}>
          <FaMicrophone />
        </div>
      </div>

      <div className="wa-controls-section">
        <div className="wa-upper-controls">
          <button className="wa-play-button" onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '2px' }} />}
          </button>

          <div className="wa-waveform-wrapper">
            <div className="wa-waveform-bars">
              {waveformBars.map((height, index) => {
                // Lógica visual de progreso
                const barPosition = (index / waveformBars.length) * 100;
                const isPlayed = barPosition < progressPercent;

                return (
                  <div
                    key={index}
                    className={`wa-bar ${isPlayed ? 'played' : ''}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>

            {/* Slider invisible para control */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="wa-seek-slider-hidden"
            />
          </div>
        </div>

        <div className="wa-audio-footer">
          <span className="wa-duration">
            {formatTime(duration > 0 ? (duration - currentTime) : duration)}
          </span>

          <div className="wa-meta">
            <span className="wa-time">{formatMessageTime(time)}</span>
            {isOwnMessage && (
              <span className={`wa-ticks ${isRead || (readBy && readBy.length > 0) ? 'read' : ''}`}>
                {isSent ? (
                  <svg viewBox="0 0 18 18" height="16" width="16" preserveAspectRatio="xMidYMid meet" fill="currentColor">
                    <path d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.039L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                  </svg>
                ) : (
                  <span style={{ fontSize: '10px' }}>⏳</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;