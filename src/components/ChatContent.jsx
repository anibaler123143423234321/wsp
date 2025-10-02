import { useEffect, useRef } from 'react';
import { FaPaperclip, FaPaperPlane } from 'react-icons/fa';
import LoadMoreMessages from './LoadMoreMessages';
import WelcomeScreen from './WelcomeScreen';
import './ChatContent.css';
import backgroundImage from '../assets/login.png';

const ChatContent = ({
  messages,
  input,
  setInput,
  onSendMessage,
  onFileSelect,
  onRecordAudio,
  onStopRecording,
  isRecording,
  mediaFiles,
  mediaPreviews,
  onCancelMediaUpload,
  onRemoveMediaFile,
  to,
  isGroup,
  hasMoreMessages,
  isLoadingMore,
  onLoadMoreMessages,
  currentUsername
}) => {
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Función para descargar archivos
  const handleDownload = (url, fileName) => {
    // Abrir en nueva pestaña
    window.open(url, '_blank');
  };

  // Manejar cambio de input
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Manejar tecla Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };


  // Scroll automático al final para mensajes nuevos (estilo WhatsApp)
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 100;

    // Si hay nuevos mensajes y el usuario está cerca del final, hacer scroll automático
    if (messages.length > lastMessageCountRef.current && (isAtBottom || !isUserScrollingRef.current)) {
      setTimeout(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
        isUserScrollingRef.current = false;
      }, 100);
    }

    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Detectar cuando el usuario está haciendo scroll manual
  const handleScroll = () => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 50;

    if (!isAtBottom) {
      isUserScrollingRef.current = true;
    } else {
      isUserScrollingRef.current = false;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  const renderMessage = (message, index) => {
    // Determinar si es mensaje propio comparando con el username actual
    const isOwnMessage = message.sender === 'Tú' ||
                        message.sender === currentUsername ||
                        message.isSent;
    const isInfoMessage = message.type === 'info';
    const isErrorMessage = message.type === 'error';

    if (isInfoMessage) {
      return (
        <div
          key={index}
          className="message info-message"
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '8px 0',
            padding: '0 16px'
          }}
        >
          <div
            className="info-content"
            style={{
              backgroundColor: 'rgba(0, 168, 132, 0.1)',
              color: '#00a884',
              padding: '6px 12px',
              borderRadius: '7.5px',
              fontSize: '13px',
              textAlign: 'center',
              border: '1px solid rgba(0, 168, 132, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="info-icon">ℹ️</span>
            <span className="info-text">{message.text}</span>
          </div>
        </div>
      );
    }

    if (isErrorMessage) {
      return (
        <div
          key={index}
          className="message error-message"
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '8px 0',
            padding: '0 16px'
          }}
        >
          <div
            className="error-content"
            style={{
              backgroundColor: 'rgba(255, 69, 58, 0.1)',
              color: '#ff453a',
              padding: '6px 12px',
              borderRadius: '7.5px',
              fontSize: '13px',
              textAlign: 'center',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="error-icon">⚠️</span>
            <span className="error-text">{message.text}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
        style={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          margin: '4px 0',
          padding: '0 16px',
          gap: '8px'
        }}
      >
        {/* Avatar para mensajes de otros */}
        {!isOwnMessage && (
          <div
            className="message-avatar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              marginBottom: '2px'
            }}
          >
            {message.sender?.charAt(0).toUpperCase() || '👤'}
          </div>
        )}

        <div
          className="message-content"
          style={{
            backgroundColor: isOwnMessage ? '#005c4b' : '#202c33',
            color: '#e9edef',
            padding: '6px 12px 8px 12px',
            borderRadius: '7.5px',
            maxWidth: '65%',
            minWidth: '100px',
            position: 'relative',
            boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
            wordWrap: 'break-word'
          }}
        >
          {!isOwnMessage && (
            <div
              className="message-sender"
              style={{
                color: '#00a884',
                fontSize: '12.8px',
                fontWeight: '600',
                marginBottom: '2px'
              }}
            >
              {message.sender}
            </div>
          )}
          
          {message.mediaType && message.mediaData ? (
            <div
              className="media-message"
              style={{
                marginBottom: '4px'
              }}
            >
              {message.mediaType === 'image' ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={message.mediaData}
                    alt={message.fileName || 'Imagen'}
                    className="media-image"
                    style={{
                      maxWidth: '100%',
                      borderRadius: '7.5px',
                      display: 'block',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDownload(message.mediaData, message.fileName || 'imagen')}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(message.mediaData, message.fileName || 'imagen');
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                  >
                    ⬇️ Descargar
                  </button>
                </div>
              ) : message.mediaType === 'video' ? (
                <div style={{ position: 'relative' }}>
                  <video
                    src={message.mediaData}
                    controls
                    className="media-video"
                    style={{
                      maxWidth: '100%',
                      borderRadius: '7.5px',
                      display: 'block'
                    }}
                  />
                  <button
                    onClick={() => handleDownload(message.mediaData, message.fileName || 'video')}
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                  >
                    ⬇️ Descargar video
                  </button>
                </div>
              ) : message.mediaType === 'audio' ? (
                <div>
                  <audio
                    src={message.mediaData}
                    controls
                    className="media-audio"
                    style={{
                      width: '100%',
                      maxWidth: '300px'
                    }}
                  />
                  <button
                    onClick={() => handleDownload(message.mediaData, message.fileName || 'audio')}
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                  >
                    ⬇️ Descargar audio
                  </button>
                </div>
              ) : (
                <div
                  className="file-message"
                  onClick={() => handleDownload(message.mediaData, message.fileName || 'archivo')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '7.5px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                >
                  <div className="file-icon" style={{ fontSize: '24px' }}>📎</div>
                  <div style={{ flex: 1 }}>
                    <div
                      className="file-name"
                      style={{
                        color: '#e9edef',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {message.fileName}
                    </div>
                    {message.fileSize && (
                      <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>
                        {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#00a884', fontSize: '20px' }}>⬇️</div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="message-text"
              style={{
                color: '#e9edef',
                fontSize: '14.2px',
                lineHeight: '19px',
                marginBottom: '2px',
                whiteSpace: 'pre-wrap'
              }}
            >
              {message.text}
            </div>
          )}
          
          <div
            className="message-time"
            style={{
              fontSize: '11px',
              color: isOwnMessage ? '#8696a0' : '#8696a0',
              textAlign: 'right',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px'
            }}
          >
            <span>{formatTime(message.time)}</span>
            {isOwnMessage && (
              <span
                className="message-status"
                style={{
                  color: '#53bdeb',
                  fontSize: '12px'
                }}
              >
                {message.isSent ? '✓✓' : '⏳'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!to) {
    return (
      <div className="chat-content">
        <div className="welcome-screen">
          <div className="welcome-icon">💬</div>
          <div className="welcome-title">Bienvenido al Chat</div>
          <div className="welcome-subtitle">
            Selecciona un chat para comenzar a conversar
          </div>
          <div className="welcome-description">
            Usa el menú lateral para ver usuarios y grupos disponibles
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-content">
      <div
        className="chat-history"
        ref={chatHistoryRef}
        onScroll={handleScroll}
      >
        <LoadMoreMessages
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMoreMessages}
        />

        {/* Separador de fecha */}
        {messages.length > 0 && (
          <div className="date-separator">
            <div className="date-separator-content">Hoy</div>
          </div>
        )}

        {messages.map((message, index) => renderMessage(message, index))}
      </div>

      <div className="chat-input-container">
        {mediaFiles.length > 0 && (
          <div className="media-preview">
            {mediaPreviews.map((preview, index) => (
              <div key={index} className="media-preview-item">
                {preview.type === 'image' ? (
                  <img
                    src={preview.data}
                    alt={preview.name}
                    className="preview-image"
                  />
                ) : (
                  <div className="preview-file">
                    <div className="preview-icon">📎</div>
                    <div className="preview-name">{preview.name}</div>
                  </div>
                )}
                <button
                  className="remove-media-btn"
                  onClick={() => onRemoveMediaFile(index)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="cancel-media-btn"
              onClick={onCancelMediaUpload}
            >
              Cancelar
            </button>
          </div>
        )}
        
        <div className="input-group">
          <label className="btn-attach" title="Adjuntar archivos (máx. 5)">
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />
            <FaPaperclip className="attach-icon" />
          </label>

          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu mensaje aquí."
            className="message-input"
            disabled={isRecording}
          />

          <button
            onClick={onSendMessage}
            className="btn-send"
            disabled={!input && mediaFiles.length === 0}
            title="Enviar mensaje"
          >
            <span className="send-text">Enviar mensaje</span>
            <FaPaperPlane className="send-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContent;
