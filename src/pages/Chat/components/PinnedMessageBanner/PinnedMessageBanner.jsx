import React from 'react';
import { FaThumbtack, FaTimes } from 'react-icons/fa';
import './PinnedMessageBanner.css';

const PinnedMessageBanner = ({ pinnedMessage, onUnpin, onClickMessage, canUnpin }) => {
  if (!pinnedMessage) return null;
  const formatTime = (time) => {
    if (!time) return '';

    // 1. Si ya viene como hora simple "HH:mm", devolverla directa
    if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) {
      return time;
    }

    try {
      const date = new Date(time);

      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) return '';

      // 2. 🔥 TRUCO: Usamos 'UTC' para que NO reste 5 horas.
      // Si el servidor manda "18:00Z" y tú quieres ver "18:00", usa 'UTC'.
      // Si usaras 'America/Lima', convertiría "18:00Z" a "13:00" (5 horas menos).
      return date.toLocaleTimeString('es-PE', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Formato 24 horas (ej: 18:30)
      });
    } catch (error) {
      console.error("Error formateando hora:", error);
      return '';
    }
  };
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="pinned-message-banner" onClick={onClickMessage}>
      <div className="pinned-icon">
        <FaThumbtack />
      </div>

      <div className="pinned-content">
        <div className="pinned-header">
          <span className="pinned-label">Mensaje fijado</span>
          {pinnedMessage.sender && (
            <span className="pinned-sender">• {pinnedMessage.sender}</span>
          )}
          {pinnedMessage.sentAt && (
            <span className="pinned-time">• {formatTime(pinnedMessage.sentAt)}</span>
          )}
        </div>

        <div className="pinned-text">
          {pinnedMessage.text ? (
            truncateText(pinnedMessage.text)
          ) : pinnedMessage.fileUrl ? (
            <span className="pinned-file">
              📎 {pinnedMessage.fileName || 'Archivo adjunto'}
            </span>
          ) : (
            'Mensaje multimedia'
          )}
        </div>
      </div>

      {canUnpin && (
        <button
          className="pinned-unpin-btn"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          title="Desfijar mensaje"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default PinnedMessageBanner;
