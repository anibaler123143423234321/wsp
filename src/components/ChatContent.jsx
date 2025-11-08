import { useEffect, useRef, useState } from 'react';
import { FaPaperclip, FaPaperPlane, FaEdit, FaTimes, FaReply, FaSmile, FaInfoCircle, FaComments } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import LoadMoreMessages from './LoadMoreMessages';
import WelcomeScreen from './WelcomeScreen';
import AudioPlayer from './AudioPlayer';
import VoiceRecorder from './VoiceRecorder';
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
  isGroup,
  currentRoomCode,
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
  onCancelReply,
  onOpenThread,
  onSendVoiceMessage
}) => {
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const typingTimeoutRef = useRef(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(null); // Mensaje seleccionado para ver info
  const [showReactionPicker, setShowReactionPicker] = useState(null); // ID del mensaje para mostrar selector de reacciones
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);

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
      // Si es una sala, incluir roomCode en el evento
      const typingData = {
        from: currentUsername,
        to: to,
        isTyping: true
      };

      if (isGroup && currentRoomCode) {
        typingData.roomCode = currentRoomCode;
      }

      // Emitir que está escribiendo
      socket.emit('typing', typingData);

      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Después de 2 segundos sin escribir, emitir que dejó de escribir
      typingTimeoutRef.current = setTimeout(() => {
        const stopTypingData = {
          from: currentUsername,
          to: to,
          isTyping: false
        };

        if (isGroup && currentRoomCode) {
          stopTypingData.roomCode = currentRoomCode;
        }

        socket.emit('typing', stopTypingData);
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

  // Manejar selección de emoji
  const handleEmojiClick = (emojiData) => {
    setInput(prevInput => prevInput + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Cerrar emoji picker al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
    };

    if (showEmojiPicker || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showReactionPicker]);

  // Manejar reacción a mensaje
  const handleReaction = (message, emoji) => {
    if (!socket || !socket.connected || !currentUsername) return;

    socket.emit('toggleReaction', {
      messageId: message.id,
      username: currentUsername,
      emoji: emoji,
      roomCode: isGroup ? currentRoomCode : undefined,
      to: isGroup ? undefined : message.sender === currentUsername ? message.receiver : message.sender
    });

    setShowReactionPicker(null);
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

  // Marcar mensajes de sala como leídos cuando se visualizan
  useEffect(() => {
    if (!socket || !socket.connected || !isGroup || !currentRoomCode || !currentUsername) return;

    // Filtrar mensajes no leídos que no son del usuario actual
    const unreadMessages = messages.filter(msg =>
      msg.id &&
      msg.sender !== currentUsername &&
      msg.sender !== 'Tú' &&
      (!msg.readBy || !msg.readBy.includes(currentUsername))
    );

    // Marcar cada mensaje como leído
    unreadMessages.forEach(msg => {
      socket.emit('markRoomMessageAsRead', {
        messageId: msg.id,
        username: currentUsername,
        roomCode: currentRoomCode
      });
    });
  }, [messages, socket, isGroup, currentRoomCode, currentUsername]);

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
          margin: '2px 0',
          padding: '0 8px',
          gap: '6px',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Avatar para mensajes de otros */}
        {!isOwnMessage && (
          <div
            className="message-avatar"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
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
              ? (isOwnMessage ? '#c9e8ba' : '#d4d2e0')
              : (isOwnMessage ? '#E1F4D6' : '#E8E6F0'),
            color: '#1f2937',
            padding: '6px 19.25px',
            borderRadius: isOwnMessage ? '17.11px 17.11px 17.11px 17.11px' : '17.11px 17.11px 17.11px 4px',
            borderTopRightRadius: '17.11px',
            borderBottomRightRadius: '17.11px',
            borderBottomLeftRadius: '17.11px',
            borderTopLeftRadius: isOwnMessage ? '17.11px' : '4px',
            maxWidth: message.mediaType ? '400px' : '65%',
            minWidth: '80px',
            width: 'fit-content',
            height: 'fit-content',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '4.28px',
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
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '1px'
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
                borderLeft: '2px solid #00a884',
                padding: '4px 6px',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '11px'
              }}
            >
              <div style={{ color: '#00a884', fontWeight: '600', marginBottom: '1px' }}>
                {message.replyToSender}
              </div>
              <div style={{ color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.replyToText || 'Archivo multimedia'}
              </div>
            </div>
          )}

          {message.mediaType && message.mediaData ? (
            <div>
              <div
                className="media-message"
                style={{
                  marginBottom: '2px'
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
                        bottom: '6px',
                        right: '6px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
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
                        marginTop: '4px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                    >
                      ⬇️ Descargar
                    </button>
                  </div>
                ) : message.mediaType === 'audio' ? (
                  <AudioPlayer
                    src={message.mediaData}
                    fileName={message.fileName}
                    onDownload={handleDownload}
                  />
                ) : (
                  <div
                    className="file-message"
                    onClick={() => handleDownload(message.mediaData, message.fileName || 'archivo')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 5px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  >
                    <div className="file-icon" style={{ fontSize: '14px' }}>📎</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="file-name"
                        style={{
                          color: '#000000D9',
                          fontSize: '10.5px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '1px'
                        }}
                      >
                        {message.fileName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {message.fileSize && (
                          <span style={{ color: '#8696a0', fontSize: '8.5px' }}>
                            {(message.fileSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                        <span style={{ color: '#8696a0', fontSize: '8.5px' }}>•</span>
                        <span style={{ color: '#8696a0', fontSize: '8.5px' }}>
                          {formatTime(message.time)}
                        </span>
                        {isOwnMessage && (
                          <span
                            style={{
                              color: message.isRead ? '#53bdeb' : '#8696a0',
                              fontSize: '9px'
                            }}
                          >
                            {message.isSent ? '✓✓' : '⏳'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ color: '#00a884', fontSize: '13px' }}>⬇️</div>
                  </div>
                )}
              </div>

              {/* Botones de acción para mensajes multimedia */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {/* Botón de responder */}
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
                    fontSize: '11px',
                    padding: '2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Responder mensaje"
                >
                  <FaReply /> Responder
                </button>

                {/* Botón de responder en hilo */}
                {onOpenThread && (
                  <button
                    onClick={() => onOpenThread(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Responder en hilo"
                  >
                    <FaComments />
                    {message.threadCount > 0 ? (
                      <span>
                        {message.threadCount} {message.threadCount === 1 ? 'respuesta' : 'respuestas'}
                        {message.lastReplyFrom && ` • ${message.lastReplyFrom}`}
                      </span>
                    ) : (
                      <span>Hilo</span>
                    )}
                  </button>
                )}

                {/* Botón de info - solo para mensajes propios en salas */}
                {isOwnMessage && isGroup && message.id && (
                  <button
                    onClick={() => setShowMessageInfo(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Ver quién leyó este mensaje"
                  >
                    <FaInfoCircle /> Info
                  </button>
                )}

                {/* Botón de reacción */}
                {message.id && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#8696a0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Reaccionar"
                    >
                      <FaSmile />
                    </button>

                    {/* Selector de reacciones rápidas */}
                    {showReactionPicker === message.id && (
                      <div
                        ref={reactionPickerRef}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: isOwnMessage ? 'auto' : '0',
                          right: isOwnMessage ? '0' : 'auto',
                          backgroundColor: '#fff',
                          borderRadius: '20px',
                          padding: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          display: 'flex',
                          gap: '4px',
                          zIndex: 1000,
                          marginBottom: '4px'
                        }}
                      >
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message, emoji)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              fontSize: '20px',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '50%',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                  color: '#000000D9',
                  fontSize: '14.97px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontStyle: 'Regular',
                  marginBottom: '1px',
                  whiteSpace: 'pre-wrap',
                  display: 'inline'
                }}
              >
                {message.text}
                {message.isEdited && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#8696a0',
                      marginLeft: '4px',
                      fontStyle: 'italic'
                    }}
                  >
                    (editado)
                  </span>
                )}
                {/* Hora y checks inline */}
                <span
                  className="message-time-inline"
                  style={{
                    fontSize: '10px',
                    color: '#8696a0',
                    marginLeft: '6px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    verticalAlign: 'bottom'
                  }}
                >
                  <span>{formatTime(message.time)}</span>
                  {isOwnMessage && (
                    <>
                      <span
                        className="message-status"
                        style={{
                          color: (message.readBy && message.readBy.length > 0) ? '#53bdeb' : '#8696a0',
                          fontSize: '11px',
                          cursor: isGroup ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                          if (isGroup && message.id) {
                            setShowMessageInfo(message);
                          }
                        }}
                        title={isGroup ? 'Ver información de lectura' : ''}
                      >
                        {message.isSent ? '✓✓' : '⏳'}
                      </span>
                    </>
                  )}
                </span>
              </div>
              {/* Botones de acción del mensaje */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
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
                    fontSize: '11px',
                    padding: '2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Responder mensaje"
                >
                  <FaReply /> Responder
                </button>

                {/* Botón de responder en hilo */}
                {onOpenThread && (
                  <button
                    onClick={() => onOpenThread(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Responder en hilo"
                  >
                    <FaComments />
                    {message.threadCount > 0 ? (
                      <span>
                        {message.threadCount} {message.threadCount === 1 ? 'respuesta' : 'respuestas'}
                        {message.lastReplyFrom && ` • ${message.lastReplyFrom}`}
                      </span>
                    ) : (
                      <span>Hilo</span>
                    )}
                  </button>
                )}

                {/* Botón de info - solo para mensajes propios en salas */}
                {isOwnMessage && isGroup && message.id && (
                  <button
                    onClick={() => setShowMessageInfo(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Ver quién leyó este mensaje"
                  >
                    <FaInfoCircle /> Info
                  </button>
                )}

                {/* Botón de editar solo para mensajes propios sin multimedia */}
                {isOwnMessage && !message.mediaType && (
                  <button
                    onClick={() => handleStartEdit(message)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Editar mensaje"
                  >
                    <FaEdit /> Editar
                  </button>
                )}

                {/* Botón de reacción - disponible para todos los mensajes */}
                {message.id && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#8696a0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Reaccionar"
                    >
                      <FaSmile />
                    </button>

                    {/* Selector de reacciones rápidas */}
                    {showReactionPicker === message.id && (
                      <div
                        ref={reactionPickerRef}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: isOwnMessage ? 'auto' : '0',
                          right: isOwnMessage ? '0' : 'auto',
                          backgroundColor: '#fff',
                          borderRadius: '20px',
                          padding: '8px 12px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          display: 'flex',
                          gap: '8px',
                          zIndex: 1000,
                          marginBottom: '4px'
                        }}
                      >
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message, emoji)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              fontSize: '20px',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '50%',
                              transition: 'transform 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.3)';
                              e.currentTarget.style.backgroundColor = '#f5f6f6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mostrar reacciones del mensaje */}
              {message.reactions && message.reactions.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginTop: '4px'
                  }}
                >
                  {/* Agrupar reacciones por emoji */}
                  {Object.entries(
                    message.reactions.reduce((acc, reaction) => {
                      if (!acc[reaction.emoji]) {
                        acc[reaction.emoji] = [];
                      }
                      acc[reaction.emoji].push(reaction.username);
                      return acc;
                    }, {})
                  ).map(([emoji, users]) => (
                    <div
                      key={emoji}
                      style={{
                        backgroundColor: users.includes(currentUsername) ? '#e1f4d6' : '#f5f6f6',
                        border: users.includes(currentUsername) ? '1px solid #00a884' : '1px solid #ddd',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleReaction(message, emoji)}
                      title={users.join(', ')}
                    >
                      <span style={{ fontSize: '14px' }}>{emoji}</span>
                      <span style={{ fontSize: '11px', color: '#667781', fontWeight: '500' }}>
                        {users.length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!to) {
    return (
      <div className="chat-content max-[768px]:hidden">
        <WelcomeScreen />
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

          {/* Botón de emoji picker */}
          <div style={{ position: 'relative' }} ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn-attach ${!canSendMessages ? 'disabled' : ''}`}
              disabled={!canSendMessages}
              title="Emojis"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: canSendMessages ? 'pointer' : 'not-allowed',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FaSmile className="attach-icon" style={{ color: showEmojiPicker ? '#00a884' : '#8696a0' }} />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '50px',
                  left: '0',
                  zIndex: 1000
                }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={320}
                  height={400}
                  theme="light"
                  searchPlaceholder="Buscar emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* Botón de grabación de voz */}
          <VoiceRecorder
            onSendAudio={onSendVoiceMessage}
            canSendMessages={canSendMessages}
          />

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

      {/* Modal de información de lectura */}
      {showMessageInfo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowMessageInfo(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111' }}>
                Información del mensaje
              </h3>
              <button
                onClick={() => setShowMessageInfo(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#8696a0',
                  padding: '4px'
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  backgroundColor: '#E1F4D6',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <p style={{ margin: 0, fontSize: '14px', color: '#111', wordBreak: 'break-word' }}>
                  {showMessageInfo.text || '📎 Archivo multimedia'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#8696a0' }}>
                  {formatTime(showMessageInfo.time)}
                </p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#00a884', marginBottom: '8px' }}>
                  ✓✓ Leído por ({showMessageInfo.readBy?.length || 0})
                </h4>
                {showMessageInfo.readBy && showMessageInfo.readBy.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {showMessageInfo.readBy.map((reader, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px',
                          backgroundColor: '#f5f6f6',
                          borderRadius: '8px'
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: '#fff',
                            fontWeight: '600'
                          }}
                        >
                          {reader.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111' }}>
                            {reader}
                          </p>
                        </div>
                        <div style={{ fontSize: '16px', color: '#53bdeb' }}>
                          ✓✓
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#8696a0', fontStyle: 'italic' }}>
                    Aún no ha sido leído por nadie
                  </p>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#8696a0', marginBottom: '8px' }}>
                  ✓ Entregado
                </h4>
                <p style={{ fontSize: '13px', color: '#8696a0' }}>
                  Enviado a todos los miembros de la sala
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContent;
