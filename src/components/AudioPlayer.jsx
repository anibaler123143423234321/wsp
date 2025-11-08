import { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import './AudioPlayer.css';

const AudioPlayer = ({ src, fileName, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Error al cargar el audio');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="audio-player-controls">
        {/* Botón Play/Pause */}
        <button
          className="audio-play-btn"
          onClick={togglePlayPause}
          disabled={isLoading}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isLoading ? (
            <div className="audio-loading-spinner" />
          ) : isPlaying ? (
            <FaPause size={12} />
          ) : (
            <FaPlay size={12} />
          )}
        </button>

        {/* Barra de progreso */}
        <div className="audio-progress-container">
          <div className="audio-progress-bar" onClick={handleSeek}>
            <div 
              className="audio-progress-fill" 
              style={{ width: `${progress}%` }}
            />
            <div 
              className="audio-progress-thumb" 
              style={{ left: `${progress}%` }}
            />
          </div>
          
          {/* Tiempo */}
          <div className="audio-time">
            <span className="audio-time-current">{formatTime(currentTime)}</span>
            <span className="audio-time-separator">/</span>
            <span className="audio-time-duration">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Botón de descarga */}
        <button
          className="audio-download-btn"
          onClick={() => onDownload(src, fileName)}
          title="Descargar audio"
        >
          <FaDownload size={12} />
        </button>
      </div>

      {/* Nombre del archivo */}
      {fileName && (
        <div className="audio-file-name">
          🎵 {fileName}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;

