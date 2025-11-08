import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaPaperclip, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import apiService from '../apiService';
import './ThreadPanel.css';

const ThreadPanel = ({
  message,
  onClose,
  currentUsername,
  socket,
  onSendMessage
}) => {
  const [threadMessages, setThreadMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentThreadCount, setCurrentThreadCount] = useState(message?.threadCount || 0);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Cargar mensajes del hilo
  useEffect(() => {
    if (message?.id) {
      loadThreadMessages();
    }
  }, [message?.id]);

  // Actualizar el contador cuando cambia el mensaje
  useEffect(() => {
    setCurrentThreadCount(message?.threadCount || 0);
  }, [message?.threadCount]);

  // Scroll automático al final
  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  // Cerrar emoji picker al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escuchar nuevos mensajes del hilo
  useEffect(() => {
    if (!socket) return;

    const handleThreadMessage = (newMessage) => {
      if (newMessage.threadId === message?.id) {
        setThreadMessages(prev => [...prev, newMessage]);
        // Incrementar el contador local
        setCurrentThreadCount(prev => prev + 1);
      }
    };

    socket.on('threadMessage', handleThreadMessage);

    return () => {
      socket.off('threadMessage', handleThreadMessage);
    };
  }, [socket, message?.id]);

  const loadThreadMessages = async () => {
    setLoading(true);
    try {
      const data = await apiService.getThreadMessages(message.id);
      setThreadMessages(data);
      // Actualizar el contador con la cantidad real de mensajes cargados
      setCurrentThreadCount(data.length);
    } catch (error) {
      console.error('Error al cargar mensajes del hilo:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const messageData = {
      text: input,
      threadId: message.id,
      from: currentUsername,
      to: message.from === currentUsername ? message.to : message.from,
      isGroup: message.isGroup,
      roomCode: message.roomCode
    };

    onSendMessage(messageData);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (!message) return null;

  return (
    <div className="thread-panel">
      <div className="thread-panel-header">
        <div className="thread-panel-title">
          <span className="thread-icon">🧵</span>
          <span>Hilo</span>
        </div>
        <button className="thread-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="thread-main-message">
        <div className="thread-main-message-header">
          <strong>{message.from}</strong>
          <span className="thread-main-message-time">{formatTime(message.sentAt)}</span>
        </div>
        <div className="thread-main-message-text">{message.text}</div>
        <div className="thread-replies-count">
          {currentThreadCount} {currentThreadCount === 1 ? 'respuesta' : 'respuestas'}
        </div>
      </div>

      <div className="thread-messages">
        {loading ? (
          <div className="thread-loading">Cargando mensajes...</div>
        ) : threadMessages.length === 0 ? (
          <div className="thread-empty">
            <p>Sé el primero en responder en este hilo</p>
          </div>
        ) : (
          threadMessages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`thread-message ${msg.from === currentUsername ? 'thread-message-own' : 'thread-message-other'}`}
            >
              <div className="thread-message-header">
                <strong>{msg.from}</strong>
                <span className="thread-message-time">{formatTime(msg.sentAt)}</span>
              </div>
              <div className="thread-message-text">{msg.message || msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="thread-input-container">
        {showEmojiPicker && (
          <div className="thread-emoji-picker" ref={emojiPickerRef}>
            <EmojiPicker onEmojiClick={handleEmojiClick} width={280} height={350} />
          </div>
        )}
        
        <div className="thread-input-wrapper">
          <button
            className="thread-emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
          >
            <FaSmile />
          </button>
          
          <textarea
            className="thread-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Responder en hilo..."
            rows={1}
          />
          
          <button
            className="thread-send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Enviar"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadPanel;

