import { useEffect, useRef, useState } from 'react';
import { FaPaperclip, FaPaperPlane, FaEdit, FaTimes, FaReply } from 'react-icons/fa';
import LoadMoreMessages from './LoadMoreMessages';
import WelcomeScreen from './WelcomeScreen';
import './ChatContent.css';

const ChatContent = ({
  messages,
  input,
  setInput,
  onSendMessage,
  onFileSelect,
  isRecording,
  mediaFiles,
  mediaPreviews,
  onCancelMediaUpload,
  onRemoveMediaFile,
  to,
  hasMoreMessages,
  isLoadingMore,
  onLoadMoreMessages,
  currentUsername,
  onEditMessage,
  socket,
  highlightMessageId,
  onMessageHighlighted,
  canSendMessages = true,
  replyingTo,
  onCancelReply
}) => {
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const typingTimeoutRef = useRef(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Función para descargar archivos
  const handleDownload = (url) => {
    // Abrir en nueva pestaña
    window.open(url, '_blank');
  };

  // 🔥 Manejar drag & drop de archivos
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSendMessages) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canSendMessages) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Crear un evento sintético para onFileSelect
      const syntheticEvent = {
        target: {
          files: files,
          value: ''
        }
      };
      onFileSelect(syntheticEvent);
    }
  };

  // 🔥 Manejar paste de archivos/imágenes
  const handlePaste = (e) => {
    if (!canSendMessages) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      // Crear un evento sintético para onFileSelect
      const syntheticEvent = {
        target: {
          files: files,
          value: ''
        }
      };
      onFileSelect(syntheticEvent);
    }
  };

  // Iniciar edición de mensaje
  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Guardar edición
  const handleSaveEdit = () => {
    if (editText.trim() && editingMessageId) {
      onEditMessage(editingMessageId, editText);
      setEditingMessageId(null);
      setEditText('');
    }
  };

  // Manejar cambio de input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    // Emitir evento "typing" si hay un destinatario y socket conectado
    if (socket && socket.connected && to && currentUsername) {
      // Emitir que está escribiendo
      socket.emit('typing', {
        from: currentUsername,
        to: to,
        isTyping: true
      });

      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Después de 2 segundos sin escribir, emitir que dejó de escribir
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          from: currentUsername,
          to: to,
          isTyping: false
        });
      }, 2000);
    }
  };

  // Manejar tecla Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  // Manejar tecla Enter en edición
  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };


  // Scroll al mensaje resaltado cuando se selecciona desde la búsqueda
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      // Esperar a que los mensajes se rendericen
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${highlightMessageId}`);
        if (messageElement) {
          // Hacer scroll al mensaje
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Resaltar el mensaje
          setHighlightedMessageId(highlightMessageId);

          // Quitar el resaltado después de 3 segundos
          setTimeout(() => {
            setHighlightedMessageId(null);
            if (onMessageHighlighted) {
              onMessageHighlighted();
            }
          }, 3000);
        }
      }, 500);
    }
  }, [highlightMessageId, messages, onMessageHighlighted]);

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
    // 🔥 Usar isSelf si está definido (mensajes históricos), sino usar la lógica anterior
    const isOwnMessage = message.isSelf !== undefined
      ? message.isSelf
      : (message.sender === 'Tú' || message.sender === currentUsername);

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

    const isHighlighted = highlightedMessageId === message.id;

    return (
      <div
        key={index}
        id={`message-${message.id}`}
        className={`message ${isOwnMessage ? 'own-message' : 'other-message'} ${isHighlighted ? 'highlighted-message' : ''}`}
        style={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          margin: '4px 0',
          padding: '0 16px',
          gap: '8px',
          transition: 'all 0.3s ease'
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
            backgroundColor: isHighlighted
              ? (isOwnMessage ? '#007a5e' : '#2a3942')
              : (isOwnMessage ? '#005c4b' : '#202c33'),
            color: '#e9edef',
            padding: '6px 12px 8px 12px',
            borderRadius: '7.5px',
            maxWidth: '65%',
            minWidth: '100px',
            position: 'relative',
            boxShadow: isHighlighted
              ? '0 0 15px rgba(0, 168, 132, 0.5)'
              : '0 1px 0.5px rgba(0,0,0,.13)',
            wordWrap: 'break-word',
            transition: 'all 0.3s ease',
            border: isHighlighted ? '2px solid #00a884' : 'none'
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

          {/* Preview del mensaje al que se responde */}
          {message.replyToMessageId && (
            <div
              style={{
                backgroundColor: isOwnMessage ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                borderLeft: '3px solid #00a884',
                padding: '6px 8px',
                borderRadius: '5px',
                marginBottom: '6px',
                fontSize: '12px'
              }}
            >
              <div style={{ color: '#00a884', fontWeight: '600', marginBottom: '2px' }}>
                {message.replyToSender}
              </div>
              <div style={{ color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.replyToText || 'Archivo multimedia'}
              </div>
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
          ) : editingMessageId === message.id ? (
            // Modo de edición
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyPress}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#2a3942',
                  border: '1px solid #00a884',
                  borderRadius: '5px',
                  color: '#e9edef',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#00a884',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Guardar
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#374151',
                    color: '#e9edef',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
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
                {message.isEdited && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#8696a0',
                      marginLeft: '6px',
                      fontStyle: 'italic'
                    }}
                  >
                    (editado)
                  </span>
                )}
              </div>
              {/* Botones de acción del mensaje */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                {/* Botón de responder - disponible para todos los mensajes */}
                <button
                  onClick={() => {
                    if (window.handleReplyMessage) {
                      window.handleReplyMessage(message);
                    }
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#8696a0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Responder mensaje"
                >
                  <FaReply /> Responder
                </button>

                {/* Botón de editar solo para mensajes propios sin multimedia */}
                {isOwnMessage && !message.mediaType && (
                  <button
                    onClick={() => handleStartEdit(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Editar mensaje"
                  >
                    <FaEdit /> Editar
                  </button>
                )}
              </div>
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
                  color: message.isRead ? '#53bdeb' : '#8696a0', // Azul si leído, gris si no
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
      <div className="chat-content max-[768px]:hidden">
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
    <div
      className="chat-content"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {isDragging && canSendMessages && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-icon">📎</div>
            <div className="drag-text">Suelta los archivos aquí</div>
          </div>
        </div>
      )}

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
            {mediaPreviews.map((preview, index) => {
              // Función para obtener el ícono según el tipo de archivo
              const getFileIcon = (type) => {
                switch(type) {
                  case 'image': return '🖼️';
                  case 'pdf': return '📄';
                  case 'video': return '🎥';
                  case 'audio': return '🎵';
                  case 'document': return '📝';
                  case 'spreadsheet': return '📊';
                  default: return '📎';
                }
              };

              return (
                <div key={index} className="media-preview-item">
                  {preview.type === 'image' ? (
                    <img
                      src={preview.data}
                      alt={preview.name}
                      className="preview-image"
                    />
                  ) : (
                    <div className="preview-file">
                      <div className="preview-icon">{getFileIcon(preview.type)}</div>
                      <div className="preview-name">{preview.name}</div>
                      <div className="preview-size">
                        {preview.size > 1024 * 1024
                          ? `${(preview.size / 1024 / 1024).toFixed(1)} MB`
                          : `${(preview.size / 1024).toFixed(1)} KB`
                        }
                      </div>
                    </div>
                  )}
                  <button
                    className="remove-media-btn"
                    onClick={() => onRemoveMediaFile(index)}
                    title="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              className="cancel-media-btn"
              onClick={onCancelMediaUpload}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Preview del mensaje al que se está respondiendo */}
        {replyingTo && (
          <div
            style={{
              backgroundColor: '#202c33',
              borderLeft: '3px solid #00a884',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#00a884', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                Respondiendo a {replyingTo.sender}
              </div>
              <div style={{ color: '#8696a0', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyingTo.text || 'Archivo multimedia'}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#8696a0',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Cancelar respuesta"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="input-group">
          <label className={`btn-attach ${!canSendMessages ? 'disabled' : ''}`} title={canSendMessages ? "Adjuntar archivos (imágenes, PDFs, documentos - máx. 5, 10MB cada uno)" : "No puedes enviar mensajes en esta conversación"}>
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={onFileSelect}
              style={{ display: 'none' }}
              disabled={!canSendMessages}
            />
            <FaPaperclip className="attach-icon" />
          </label>

          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={canSendMessages ? "Escribe tu mensaje aquí." : "Solo puedes monitorear esta conversación"}
            className="message-input"
            disabled={isRecording || !canSendMessages}
          />

          <button
            onClick={onSendMessage}
            className="btn-send"
            disabled={!input && mediaFiles.length === 0 || !canSendMessages}
            title={canSendMessages ? "Enviar mensaje" : "No puedes enviar mensajes en esta conversación"}
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
