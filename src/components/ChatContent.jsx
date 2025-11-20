import { useEffect, useRef, useState } from 'react';
import { FaPaperPlane, FaEdit, FaTimes, FaReply, FaSmile, FaInfoCircle, FaComments, FaTrash, FaChevronDown, FaCopy } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import LoadMoreMessages from './LoadMoreMessages';
import WelcomeScreen from './WelcomeScreen';
import AudioPlayer from './AudioPlayer';
import VoiceRecorder from './VoiceRecorder';
import './ChatContent.css';

// Icono de emoji personalizado (estilo WhatsApp)
const EmojiIcon = ({ className, style }) => (
  <svg
    viewBox="0 0 24 24"
    height="24"
    width="24"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    style={style}
    fill="none"
  >
    <path d="M8.49893 10.2521C9.32736 10.2521 9.99893 9.5805 9.99893 8.75208C9.99893 7.92365 9.32736 7.25208 8.49893 7.25208C7.6705 7.25208 6.99893 7.92365 6.99893 8.75208C6.99893 9.5805 7.6705 10.2521 8.49893 10.2521Z" fill="currentColor" />
    <path d="M17.0011 8.75208C17.0011 9.5805 16.3295 10.2521 15.5011 10.2521C14.6726 10.2521 14.0011 9.5805 14.0011 8.75208C14.0011 7.92365 14.6726 7.25208 15.5011 7.25208C16.3295 7.25208 17.0011 7.92365 17.0011 8.75208Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16.8221 19.9799C15.5379 21.2537 13.8087 21.9781 12 22H9.27273C5.25611 22 2 18.7439 2 14.7273V9.27273C2 5.25611 5.25611 2 9.27273 2H14.7273C18.7439 2 22 5.25611 22 9.27273V11.8141C22 13.7532 21.2256 15.612 19.8489 16.9776L16.8221 19.9799ZM14.7273 4H9.27273C6.36068 4 4 6.36068 4 9.27273V14.7273C4 17.6393 6.36068 20 9.27273 20H11.3331C11.722 19.8971 12.0081 19.5417 12.0058 19.1204L11.9935 16.8564C11.9933 16.8201 11.9935 16.784 11.9941 16.7479C11.0454 16.7473 10.159 16.514 9.33502 16.0479C8.51002 15.5812 7.84752 14.9479 7.34752 14.1479C7.24752 13.9479 7.25585 13.7479 7.37252 13.5479C7.48919 13.3479 7.66419 13.2479 7.89752 13.2479L13.5939 13.2479C14.4494 12.481 15.5811 12.016 16.8216 12.0208L19.0806 12.0296C19.5817 12.0315 19.9889 11.6259 19.9889 11.1248V9.07648H19.9964C19.8932 6.25535 17.5736 4 14.7273 4ZM14.0057 19.1095C14.0066 19.2605 13.9959 19.4089 13.9744 19.5537C14.5044 19.3124 14.9926 18.9776 15.4136 18.5599L18.4405 15.5576C18.8989 15.1029 19.2653 14.5726 19.5274 13.996C19.3793 14.0187 19.2275 14.0301 19.0729 14.0295L16.8138 14.0208C15.252 14.0147 13.985 15.2837 13.9935 16.8455L14.0057 19.1095Z" fill="currentColor" />
  </svg>
);

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
  roomUsers,
  hasMoreMessages,
  isLoadingMore,
  isLoadingMessages, // 🔥 Estado de carga inicial de mensajes
  onLoadMoreMessages,
  currentUsername,
  onEditMessage,
  onDeleteMessage,
  socket,
  highlightMessageId,
  onMessageHighlighted,
  canSendMessages = true,
  replyingTo,
  onCancelReply,
  onOpenThread,
  onSendVoiceMessage,
  isAdmin = false,
  isOtherUserTyping,
  typingUser,
  roomTypingUsers,
  isUploadingFile // 🔥 Prop para estado de carga de archivos
}) => {
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editFile, setEditFile] = useState(null); // 🔥 Archivo para editar multimedia
  const [isEditingLoading, setIsEditingLoading] = useState(false); // 🔥 Loading para edición
  const typingTimeoutRef = useRef(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(null); // Mensaje seleccionado para ver info
  const [showReactionPicker, setShowReactionPicker] = useState(null); // ID del mensaje para mostrar selector de reacciones
  const [imagePreview, setImagePreview] = useState(null); // Estado para vista previa de imagen en pantalla completa
  const [showMessageMenu, setShowMessageMenu] = useState(null); // ID del mensaje para mostrar menú desplegable
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const messageMenuRef = useRef(null);

  // Estados para menciones (@)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const inputRef = useRef(null);

  // Función para formatear la fecha del separador
  const formatDateSeparator = (date) => {
    // 🔥 CORREGIDO: El backend ya envía fechas en hora de Perú, no aplicar offset adicional
    const messageDate = new Date(date);

    // Obtener la fecha actual
    const now = new Date();
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Resetear horas para comparación
    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return 'Hoy';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else {
      // Formato: "Sábado, 9 de noviembre"
      return messageDate.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  // Función para agrupar mensajes por fecha
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message, index) => {
      const messageDate = message.sentAt ? new Date(message.sentAt) : new Date();
      messageDate.setHours(0, 0, 0, 0);

      if (!currentDate || currentDate.getTime() !== messageDate.getTime()) {
        currentDate = new Date(messageDate);
        groups.push({
          type: 'date-separator',
          date: messageDate,
          label: formatDateSeparator(messageDate)
        });
      }

      groups.push({
        type: 'message',
        data: message,
        index
      });
    });

    return groups;
  };

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
    setEditFile(null); // Limpiar archivo anterior
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
    setEditFile(null);
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if ((editText.trim() || editFile) && editingMessageId) {
      setIsEditingLoading(true); // 🔥 Mostrar loading
      try {
        await onEditMessage(editingMessageId, editText, editFile);
      } finally {
        setIsEditingLoading(false); // 🔥 Ocultar loading
        setEditingMessageId(null);
        setEditText('');
        setEditFile(null);
      }
    }
  };

  // Manejar cambio de input
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(value);

    // Detectar menciones con @ solo en grupos
    if (isGroup && roomUsers && roomUsers.length > 0) {
      // Buscar el último @ antes del cursor
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Verificar que el @ esté al inicio o precedido por un espacio
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        if (charBeforeAt === ' ' || lastAtIndex === 0) {
          const searchText = textBeforeCursor.substring(lastAtIndex + 1);
          // Verificar que no haya espacios después del @
          if (!searchText.includes(' ')) {
            setMentionSearch(searchText.toLowerCase());
            setMentionCursorPosition(lastAtIndex);
            setShowMentionSuggestions(true);
          } else {
            setShowMentionSuggestions(false);
          }
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }

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

  // Manejar selección de mención
  const handleMentionSelect = (user) => {
    const username = typeof user === 'string' ? user : (user.username || user.nombre || user);
    const beforeMention = input.substring(0, mentionCursorPosition);
    const afterMention = input.substring(mentionCursorPosition + mentionSearch.length + 1);
    const newInput = `${beforeMention}@${username} ${afterMention}`;
    setInput(newInput);
    setShowMentionSuggestions(false);
    setMentionSearch('');

    // Enfocar el input después de seleccionar
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Manejar selección de emoji
  const handleEmojiClick = (emojiData) => {
    // Si hay un mensaje guardado para reaccionar, usar el emoji como reacción
    if (window.currentReactionMessage) {
      handleReaction(window.currentReactionMessage, emojiData.emoji);
      window.currentReactionMessage = null; // Limpiar el mensaje guardado
    } else {
      // Si no, agregar el emoji al input de texto
      setInput(prevInput => prevInput + emojiData.emoji);
    }
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

    // 🔥 Usar realSender para obtener el nombre real del usuario (no "Tú")
    const actualSender = message.realSender || message.sender;
    const actualReceiver = message.receiver;

    // console.log(`👍 handleReaction - MessageID: ${message.id}, Emoji: ${emoji}, Sender: ${actualSender}, Receiver: ${actualReceiver}, IsGroup: ${isGroup}`);

    socket.emit('toggleReaction', {
      messageId: message.id,
      username: currentUsername,
      emoji: emoji,
      roomCode: isGroup ? currentRoomCode : undefined,
      to: isGroup ? undefined : actualSender === currentUsername ? actualReceiver : actualSender
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

  // 🔥 Scroll automático cuando aparece/desaparece el indicador de "está escribiendo"
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 150;

    // Determinar si hay alguien escribiendo
    const someoneIsTyping = (!isGroup && isOtherUserTyping && typingUser) ||
      (isGroup && currentRoomCode && roomTypingUsers &&
        roomTypingUsers[currentRoomCode] &&
        roomTypingUsers[currentRoomCode].length > 0);

    // Si alguien está escribiendo y el usuario está cerca del final, hacer scroll suave
    if (someoneIsTyping && (isAtBottom || !isUserScrollingRef.current)) {
      setTimeout(() => {
        chatHistory.scrollTo({
          top: chatHistory.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [isOtherUserTyping, typingUser, roomTypingUsers, currentRoomCode, isGroup]);

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

  // 🔥 NUEVO: Marcar mensajes de conversaciones individuales como leídos
  useEffect(() => {
    if (!socket || !socket.connected || isGroup || !to || !currentUsername) return;

    // Filtrar mensajes no leídos que no son del usuario actual
    const unreadMessages = messages.filter(msg =>
      msg.id &&
      msg.sender !== currentUsername &&
      msg.sender !== 'Tú' &&
      !msg.isRead
    );

    if (unreadMessages.length === 0) return;

    // console.log(`📖 Marcando ${unreadMessages.length} mensajes como leídos en conversación con ${to}`);

    // Marcar toda la conversación como leída
    socket.emit('markConversationAsRead', {
      from: to,  // El remitente de los mensajes
      to: currentUsername  // El usuario actual que está leyendo
    });
  }, [messages, socket, isGroup, to, currentUsername]);

  // Detectar cuando el usuario está haciendo scroll manual
  // 🔥 Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setShowMessageMenu(null);
      }
    };

    if (showMessageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMessageMenu]);

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

  // 🔥 NUEVO: Función para obtener el ícono y color según el tipo de archivo
  const getFileIcon = (fileName) => {
    if (!fileName) return { icon: 'default', color: '#4A90E2', bgColor: '#E3F2FD' };

    const extension = fileName.split('.').pop().toLowerCase();

    const fileTypes = {
      // Excel
      'xlsx': { icon: 'excel', color: '#217346', bgColor: '#E7F4EC', name: 'Excel' },
      'xls': { icon: 'excel', color: '#217346', bgColor: '#E7F4EC', name: 'Excel' },
      'xlsm': { icon: 'excel', color: '#217346', bgColor: '#E7F4EC', name: 'Excel' },
      'csv': { icon: 'excel', color: '#217346', bgColor: '#E7F4EC', name: 'CSV' },

      // Word
      'docx': { icon: 'word', color: '#2B579A', bgColor: '#E7F0FF', name: 'Word' },
      'doc': { icon: 'word', color: '#2B579A', bgColor: '#E7F0FF', name: 'Word' },

      // PowerPoint
      'pptx': { icon: 'powerpoint', color: '#D24726', bgColor: '#FCE8E3', name: 'PowerPoint' },
      'ppt': { icon: 'powerpoint', color: '#D24726', bgColor: '#FCE8E3', name: 'PowerPoint' },

      // PDF
      'pdf': { icon: 'pdf', color: '#F40F02', bgColor: '#FFE7E5', name: 'PDF' },

      // Imágenes
      'jpg': { icon: 'image', color: '#FF6B6B', bgColor: '#FFE8E8', name: 'Imagen' },
      'jpeg': { icon: 'image', color: '#FF6B6B', bgColor: '#FFE8E8', name: 'Imagen' },
      'png': { icon: 'image', color: '#FF6B6B', bgColor: '#FFE8E8', name: 'Imagen' },
      'gif': { icon: 'image', color: '#FF6B6B', bgColor: '#FFE8E8', name: 'GIF' },
      'svg': { icon: 'image', color: '#FF6B6B', bgColor: '#FFE8E8', name: 'SVG' },

      // Comprimidos
      'zip': { icon: 'zip', color: '#FFA500', bgColor: '#FFF3E0', name: 'ZIP' },
      'rar': { icon: 'zip', color: '#FFA500', bgColor: '#FFF3E0', name: 'RAR' },
      '7z': { icon: 'zip', color: '#FFA500', bgColor: '#FFF3E0', name: '7Z' },

      // Texto
      'txt': { icon: 'text', color: '#607D8B', bgColor: '#ECEFF1', name: 'Texto' },

      // Código
      'js': { icon: 'code', color: '#F7DF1E', bgColor: '#FFFDE7', name: 'JavaScript' },
      'jsx': { icon: 'code', color: '#61DAFB', bgColor: '#E1F5FE', name: 'React' },
      'ts': { icon: 'code', color: '#3178C6', bgColor: '#E3F2FD', name: 'TypeScript' },
      'tsx': { icon: 'code', color: '#3178C6', bgColor: '#E3F2FD', name: 'TypeScript' },
      'html': { icon: 'code', color: '#E34F26', bgColor: '#FFE8E1', name: 'HTML' },
      'css': { icon: 'code', color: '#1572B6', bgColor: '#E1F5FE', name: 'CSS' },
      'json': { icon: 'code', color: '#000000', bgColor: '#F5F5F5', name: 'JSON' },
      'xml': { icon: 'code', color: '#FF6600', bgColor: '#FFF3E0', name: 'XML' },

      // Video
      'mp4': { icon: 'video', color: '#9C27B0', bgColor: '#F3E5F5', name: 'Video' },
      'avi': { icon: 'video', color: '#9C27B0', bgColor: '#F3E5F5', name: 'Video' },
      'mov': { icon: 'video', color: '#9C27B0', bgColor: '#F3E5F5', name: 'Video' },
      'wmv': { icon: 'video', color: '#9C27B0', bgColor: '#F3E5F5', name: 'Video' },

      // Audio
      'mp3': { icon: 'audio', color: '#00BCD4', bgColor: '#E0F7FA', name: 'Audio' },
      'wav': { icon: 'audio', color: '#00BCD4', bgColor: '#E0F7FA', name: 'Audio' },
      'ogg': { icon: 'audio', color: '#00BCD4', bgColor: '#E0F7FA', name: 'Audio' },
    };

    return fileTypes[extension] || { icon: 'default', color: '#4A90E2', bgColor: '#E3F2FD', name: 'Archivo' };
  };

  // 🔥 NUEVO: Función para renderizar el ícono SVG según el tipo de archivo
  const renderFileIcon = (fileName) => {
    const fileInfo = getFileIcon(fileName);

    const icons = {
      excel: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="2" width="16" height="20" rx="2" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M8 2V22" stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M4 8H20" stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M4 14H20" stroke={fileInfo.color} strokeWidth="1.5" />
          <text x="14" y="18" fontSize="8" fontWeight="bold" fill={fileInfo.color}>X</text>
        </svg>
      ),
      word: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M13 2V9H20" fill={fileInfo.color} stroke={fileInfo.color} strokeWidth="1.5" />
          <text x="8" y="18" fontSize="8" fontWeight="bold" fill={fileInfo.color}>W</text>
        </svg>
      ),
      powerpoint: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M13 2V9H20" fill={fileInfo.color} stroke={fileInfo.color} strokeWidth="1.5" />
          <text x="9" y="18" fontSize="8" fontWeight="bold" fill={fileInfo.color}>P</text>
        </svg>
      ),
      pdf: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M13 2V9H20" fill={fileInfo.color} stroke={fileInfo.color} strokeWidth="1.5" />
          <text x="6" y="17" fontSize="6" fontWeight="bold" fill={fileInfo.color}>PDF</text>
        </svg>
      ),
      zip: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M12 2V6M12 6V10M12 10V14M12 14V18" stroke={fileInfo.color} strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="10" y="16" width="4" height="3" rx="0.5" fill={fileInfo.color} />
        </svg>
      ),
      image: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="2" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <circle cx="9" cy="9" r="2" fill={fileInfo.color} />
          <path d="M4 16L8 12L12 16L16 12L20 16V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V16Z" fill={fileInfo.color} />
        </svg>
      ),
      video: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="14" height="14" rx="2" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M17 8.5L21 6V18L17 15.5V8.5Z" fill={fileInfo.color} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M9 10L12 12L9 14V10Z" fill={fileInfo.color} />
        </svg>
      ),
      audio: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M12 8V16M9 11V13M15 11V13M6 12H7M17 12H18" stroke={fileInfo.color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      text: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M8 12H16M8 16H16M8 8H12" stroke={fileInfo.color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      code: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M9 12L7 14L9 16M15 12L17 14L15 16M13 10L11 18" stroke={fileInfo.color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      default: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" fill={fileInfo.bgColor} stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M13 2V9H20" fill={fileInfo.color} stroke={fileInfo.color} strokeWidth="1.5" />
        </svg>
      )
    };

    return icons[fileInfo.icon] || icons.default;
  };

  // Función para renderizar texto con menciones resaltadas
  const renderTextWithMentions = (text) => {
    if (!text) return text;

    // Obtener lista de usuarios válidos para menciones
    const validUsers = roomUsers ? roomUsers.map(user => {
      if (typeof user === 'string') return user.toUpperCase();
      return (user.username || user.nombre || '').toUpperCase();
    }) : [];

    // Regex mejorado: @ seguido de 1-3 palabras (nombre y apellido)
    // Solo captura hasta 3 palabras para evitar capturar frases completas
    const mentionRegex = /@([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,2})(?=\s|$|[.,!?;:]|\n)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Verificar si es parte de un email
      const charBeforeMention = match.index > 0 ? text[match.index - 1] : '';
      const isPartOfEmail = /[a-zA-Z0-9._-]/.test(charBeforeMention);

      // Verificar si después del @ hay un dominio de email común
      const mentionedText = match[1].toLowerCase().trim();
      const emailDomains = ['gmail', 'outlook', 'hotmail', 'yahoo', 'icloud', 'live', 'msn', 'aol', 'protonmail', 'zoho'];
      const isEmailDomain = emailDomains.includes(mentionedText);

      // Agregar texto antes de la mención
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Si es parte de un email, agregar sin resaltar
      if (isPartOfEmail || isEmailDomain) {
        parts.push(match[0]);
        lastIndex = match.index + match[0].length;
        continue;
      }

      // Verificar si es un usuario válido en la sala
      const mentionedUser = match[1].trim();
      const isValidUser = validUsers.some(validUser =>
        validUser === mentionedUser.toUpperCase() ||
        validUser.includes(mentionedUser.toUpperCase())
      );

      // Solo resaltar si es un usuario válido
      if (isValidUser) {
        const isCurrentUser = mentionedUser.toUpperCase() === currentUsername?.toUpperCase();

        parts.push(
          <span
            key={match.index}
            style={{
              display: 'inline',
              backgroundColor: isCurrentUser ? '#d3e4fd' : '#e8def8',
              color: isCurrentUser ? '#0b57d0' : '#6750a4',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '500',
              fontSize: '0.95em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isCurrentUser ? '#c2d7f7' : '#d7c9f0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isCurrentUser ? '#d3e4fd' : '#e8def8';
            }}
            title={`Mención a ${mentionedUser}`}
          >
            @{mentionedUser}
          </span>
        );
      } else {
        // Si no es un usuario válido, agregar como texto normal
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Agregar texto restante
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderMessage = (message, index) => {
    // 🔥 Usar isSelf si está definido (mensajes históricos), sino usar la lógica anterior
    const isOwnMessage = message.isSelf !== undefined
      ? message.isSelf
      : (message.sender === 'Tú' || message.sender === currentUsername);

    const isInfoMessage = message.type === 'info';
    const isErrorMessage = message.type === 'error';

    // 🔥 NUEVO: Detectar si este mensaje debe agruparse con el anterior
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const isGroupedWithPrevious = previousMessage &&
      previousMessage.type !== 'info' &&
      previousMessage.type !== 'error' &&
      !previousMessage.isDeleted &&
      (previousMessage.isSelf !== undefined ? previousMessage.isSelf : (previousMessage.sender === 'Tú' || previousMessage.sender === currentUsername)) === isOwnMessage &&
      (previousMessage.sender === message.sender || (isOwnMessage && previousMessage.isSelf === message.isSelf));

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

    // ---------------------------------------------------------
    // 🔥 SOLUCIÓN DEFINITIVA: DETECCIÓN DE VIDEOLLAMADA
    // ---------------------------------------------------------
    // 1. Detectamos si es tipo video_call O si el texto contiene "📹 Videollamada"
    const isVideoCall = message.type === 'video_call' ||
                        (typeof message.text === 'string' && message.text.includes('📹 Videollamada'));

    if (isVideoCall) {
      // 2. Intentamos obtener la URL: o viene en la propiedad, o la sacamos del texto
      let videoUrl = message.videoCallUrl;

      // Si no hay URL directa, la buscamos en el texto (backup)
      if (!videoUrl && message.text) {
        const urlMatch = message.text.match(/http[s]?:\/\/[^\s]+/);
        if (urlMatch) videoUrl = urlMatch[0];
      }

      // Si después de todo no hay URL, no mostramos la tarjeta (fallback a texto normal)
      if (videoUrl) {
        const isOwn = message.sender === currentUsername || message.sender === 'Tú' || message.isSelf;

        return (
          <div
            key={index}
            className={`message ${isOwn ? 'own-message' : 'other-message'}`}
            style={{
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
              marginTop: '8px',
              marginBottom: '2px',
              padding: '0 8px'
            }}
          >
            {/* Avatar (lógica original) */}
            {!isOwn && (
              <div className="message-avatar" style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '12px', marginRight: '6px', flexShrink: 0
              }}>
                {message.sender?.charAt(0).toUpperCase() || '👤'}
              </div>
            )}

            <div className="message-content" style={{
              padding: '0',
              overflow: 'hidden',
              backgroundColor: isOwn ? '#E1F4D6' : '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '260px',
              maxWidth: '300px'
            }}>
              {/* 🎨 CABECERA VERDE */}
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #00a884 0%, #008f6f 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '8px', backdropFilter: 'blur(4px)'
                }}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                   </svg>
                </div>
                <span style={{ fontWeight: '600', fontSize: '16px' }}>Videollamada</span>
                <span style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                   {isOwn ? 'Iniciaste una llamada' : 'Te invitan a unirte'}
                </span>
              </div>

              {/* 🔘 BOTÓN DE ACCIÓN */}
              <div style={{ padding: '12px' }}>
                <button
                  onClick={() => window.open(videoUrl, '_blank', 'width=1280,height=720')}
                  style={{
                    backgroundColor: '#fff',
                    color: '#00a884',
                    border: '1px solid #00a884',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#00a884';
                    e.target.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.color = '#00a884';
                  }}
                >
                  UNIRSE AHORA
                </button>
              </div>

              {/* Hora */}
              <div style={{
                padding: '0 12px 8px 0', textAlign: 'right',
                fontSize: '11px', color: '#667781'
              }}>
                {formatTime(message.time)}
              </div>
            </div>
          </div>
        );
      }
    }
    // ---------------------------------------------------------
    // FIN DEL CÓDIGO NUEVO
    // ---------------------------------------------------------

    const isHighlighted = highlightedMessageId === message.id;

    return (
      <div
        key={index}
        id={`message-${message.id}`}
        className={`message ${isOwnMessage ? 'own-message' : 'other-message'} ${isHighlighted ? 'highlighted-message' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          marginTop: isGroupedWithPrevious ? '1px' : '8px',
          marginBottom: '2px',
          padding: '0 8px',
          gap: '6px',
          transition: 'all 0.3s ease',
          overflow: 'visible',
          position: 'relative',
          zIndex: showMessageMenu === message.id ? 10000 : 1
        }}
      >
        {/* Avatar para mensajes de otros - ocultar si está agrupado */}
        {!isOwnMessage && !isGroupedWithPrevious && (
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
        {/* Espaciador invisible cuando el avatar está oculto */}
        {!isOwnMessage && isGroupedWithPrevious && (
          <div style={{ width: '28px', flexShrink: 0 }} />
        )}

        <div
          className="message-content"
          style={{
            backgroundColor: isHighlighted
              ? (isOwnMessage ? '#c9e8ba' : '#d4d2e0')
              : (isOwnMessage ? '#E1F4D6' : '#E8E6F0'),
            color: '#1f2937',
            padding: '6px 19.25px',
            paddingRight: message.isDeleted ? '19.25px' : '32px',
            borderTopRightRadius: '17.11px',
            borderBottomRightRadius: '17.11px',
            borderBottomLeftRadius: '17.11px',
            borderTopLeftRadius: isOwnMessage ? '17.11px' : '4px',
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
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            transition: 'all 0.3s ease',
            border: isHighlighted ? '2px solid #00a884' : 'none',
            overflow: 'visible',
            // 🔥 El maxWidth se controla en el CSS de .own-message y .other-message (75%)
            // Solo aplicamos maxWidth para media (imágenes, videos, etc.)
            ...(message.mediaType && { maxWidth: '400px' })
          }}
        >
          {/* 🔥 Botón de menú en esquina superior derecha */}
          {!message.isDeleted && (
            <div
              style={{ position: 'absolute', top: '2px', right: '2px', zIndex: 9999 }}
              ref={showMessageMenu === message.id ? messageMenuRef : null}
            >
              <button
                onClick={(e) => {
                  if (showMessageMenu === message.id) {
                    setShowMessageMenu(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuHeight = 200; // Altura aproximada del menú
                    const windowHeight = window.innerHeight;
                    const spaceBelow = windowHeight - rect.bottom;
                    const spaceAbove = rect.top;

                    // Decidir si mostrar arriba o abajo
                    const showAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

                    setMenuPosition({
                      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
                      left: Math.min(rect.right - 180, window.innerWidth - 190) // Evitar que se salga por la derecha
                    });
                    setShowMessageMenu(message.id);
                  }
                }}
                style={{
                  backgroundColor: isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  color: '#54656f',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Más opciones"
              >
                <FaChevronDown />
              </button>

              {/* Menú desplegable */}
              {showMessageMenu === message.id && (
                <div
                  style={{
                    position: 'fixed',
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 99999,
                    minWidth: '180px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Responder */}
                  <button
                    onClick={() => {
                      if (window.handleReplyMessage) {
                        window.handleReplyMessage(message);
                      }
                      setShowMessageMenu(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#111',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FaReply style={{ color: '#8696a0' }} /> Responder
                  </button>

                  {/* Copiar */}
                  <button
                    onClick={async () => {
                      try {
                        let textToCopy = '';

                        // Si es mensaje de texto
                        if (message.text) {
                          textToCopy = message.text;
                        }
                        // Si es mensaje multimedia con caption
                        else if (message.caption) {
                          textToCopy = message.caption;
                        }
                        // Si es archivo, copiar el nombre
                        else if (message.fileName) {
                          textToCopy = message.fileName;
                        }

                        if (textToCopy) {
                          await navigator.clipboard.writeText(textToCopy);
                          // Opcional: mostrar notificación de éxito
                          console.log('Texto copiado:', textToCopy);
                        }
                      } catch (err) {
                        console.error('Error al copiar:', err);
                      }
                      setShowMessageMenu(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#111',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FaCopy style={{ color: '#8696a0' }} /> Copiar
                  </button>



                  {/* Info - para todos los mensajes */}
                  {message.id && (
                    <button
                      onClick={() => {
                        setShowMessageInfo(message);
                        setShowMessageMenu(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FaInfoCircle style={{ color: '#8696a0' }} /> Info
                    </button>
                  )}

                  {/* Reaccionar */}
                  {message.id && (
                    <button
                      onClick={() => {
                        setShowReactionPicker(showReactionPicker === message.id ? null : message.id);
                        setShowMessageMenu(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FaSmile style={{ color: '#8696a0' }} /> Reaccionar
                    </button>
                  )}

                  {/* Editar - solo para mensajes propios */}
                  {isOwnMessage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(message);
                        setShowMessageMenu(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FaEdit style={{ color: '#8696a0' }} /> Editar
                    </button>
                  )}

                  {/* Eliminar - solo para ADMIN */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMessage) {
                          onDeleteMessage(message.id, message.realSender || message.sender);
                        }
                        setShowMessageMenu(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#ff4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.2s',
                        borderTop: '1px solid #e0e0e0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FaTrash style={{ color: '#ff4444' }} /> Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!isOwnMessage && !isGroupedWithPrevious && (
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
              {message.senderNumeroAgente && (
                <span style={{ color: '#666', fontWeight: '400', marginLeft: '4px' }}>
                  • N° {message.senderNumeroAgente}
                </span>
              )}
              {!message.senderNumeroAgente && message.senderRole && (
                <span style={{ color: '#666', fontWeight: '400', marginLeft: '4px' }}>
                  • {message.senderRole}
                </span>
              )}
            </div>
          )}

          {/* Preview del mensaje al que se responde */}
          {message.replyToMessageId && (
            <div
              onClick={async () => {
                // Buscar el mensaje original y hacer scroll hacia él
                const originalMessage = document.getElementById(`message-${message.replyToMessageId}`);
                if (originalMessage) {
                  originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Resaltar temporalmente el mensaje
                  setHighlightedMessageId(message.replyToMessageId);
                  setTimeout(() => setHighlightedMessageId(null), 2000);
                } else {
                  // 🔥 Si no se encuentra el mensaje, intentar cargar más mensajes
                  console.log(`⚠️ Mensaje original ${message.replyToMessageId} no encontrado, cargando más mensajes...`);

                  // Cargar más mensajes hasta encontrar el original (máximo 5 intentos)
                  let attempts = 0;
                  const maxAttempts = 5;

                  while (attempts < maxAttempts) {
                    if (hasMoreMessages && onLoadMoreMessages) {
                      await onLoadMoreMessages();
                      attempts++;

                      // Esperar un poco para que se carguen los mensajes
                      await new Promise(resolve => setTimeout(resolve, 500));

                      // Verificar si ahora existe el mensaje
                      const foundMessage = document.getElementById(`message-${message.replyToMessageId}`);
                      if (foundMessage) {
                        foundMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setHighlightedMessageId(message.replyToMessageId);
                        setTimeout(() => setHighlightedMessageId(null), 2000);
                        break;
                      }
                    } else {
                      console.log('❌ No hay más mensajes para cargar');
                      break;
                    }
                  }

                  if (attempts >= maxAttempts) {
                    console.log('❌ No se pudo encontrar el mensaje original después de varios intentos');
                  }
                }
              }}
              style={{
                backgroundColor: 'transparent',
                borderLeft: '4px solid #00a884',
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ color: '#00a884', fontWeight: '600', marginBottom: '1px' }}>
                {message.replyToSender}
                {message.replyToSenderNumeroAgente && (
                  <span style={{ color: '#666', fontWeight: '400', marginLeft: '4px' }}>
                    • N° {message.replyToSenderNumeroAgente}
                  </span>
                )}
              </div>
              <div style={{ color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.replyToText || 'Archivo multimedia'}
              </div>
            </div>
          )}

          {editingMessageId === message.id ? (
            // Modo de edición (para texto y multimedia)
            <div style={{ marginBottom: '8px' }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '10px 12px',
                  borderRadius: '7.5px',
                  border: '1px solid #d1d7db',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Editar mensaje..."
                autoFocus
                onFocus={(e) => e.target.style.borderColor = '#00a884'}
                onBlur={(e) => e.target.style.borderColor = '#d1d7db'}
              />

              {/* Input para cambiar archivo multimedia - Estilo mejorado */}
              <div style={{ marginBottom: '12px' }}>
                <label
                  htmlFor={`file-input-${message.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#f0f2f5',
                    color: '#54656f',
                    borderRadius: '7.5px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    border: '1px solid #d1d7db',
                    transition: 'all 0.2s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e4e6eb';
                    e.target.style.borderColor = '#00a884';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f0f2f5';
                    e.target.style.borderColor = '#d1d7db';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#54656f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Seleccionar archivo
                </label>
                <input
                  id={`file-input-${message.id}`}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setEditFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                {editFile ? (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#d1f4dd',
                    borderRadius: '7.5px',
                    fontSize: '12px',
                    color: '#00a884',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17l-5-5" stroke="#00a884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontWeight: '500' }}>Nuevo archivo: {editFile.name}</span>
                  </div>
                ) : (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#8696a0'
                  }}>
                    Ningún archivo seleccionado
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={isEditingLoading}
                  style={{
                    backgroundColor: isEditingLoading ? '#8696a0' : '#00a884',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7.5px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    cursor: isEditingLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => !isEditingLoading && (e.target.style.backgroundColor = '#06cf9c')}
                  onMouseLeave={(e) => !isEditingLoading && (e.target.style.backgroundColor = '#00a884')}
                >
                  {isEditingLoading && (
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #fff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }}
                    />
                  )}
                  {isEditingLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    backgroundColor: '#f0f2f5',
                    color: '#54656f',
                    border: 'none',
                    borderRadius: '7.5px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e4e6eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f0f2f5'}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : message.mediaType && message.mediaData ? (
            <div>
              {/* 🔥 Mostrar mensaje eliminado para multimedia */}
              {message.isDeleted ? (
                <div>
                  <div
                    className="message-text"
                    style={{
                      color: '#8696a0',
                      fontSize: '14px',
                      fontStyle: 'italic',
                      lineHeight: '100%',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: '400',
                      marginBottom: '4px',
                      whiteSpace: 'pre-wrap',
                      display: 'block'
                    }}
                  >
                    {message.deletedBy ? `🚫 Mensaje eliminado por ${message.deletedBy}` : '🚫 Mensaje eliminado'}
                  </div>
                  {/* Hora del mensaje eliminado */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8696a0',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{formatTime(message.time)}</span>
                  </div>
                </div>
              ) : (
                <>
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
                          loading="lazy"
                          className="media-image"
                          style={{
                            maxWidth: '100%',
                            borderRadius: '7.5px',
                            display: 'block',
                            cursor: 'pointer'
                          }}
                          onClick={() => setImagePreview({ url: message.mediaData, fileName: message.fileName || 'imagen' })}
                        />
                        {/* 🔥 NUEVO: Hora y checks en la esquina inferior derecha de la imagen */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            pointerEvents: 'none'
                          }}
                        >
                          <span>{formatTime(message.time)}</span>
                          {message.isEdited && (
                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginLeft: '4px' }}>
                              (editado)
                            </span>
                          )}
                          {isOwnMessage && (
                            <span
                              style={{
                                color: (message.readBy && message.readBy.length > 0) ? '#53bdeb' : '#fff',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              {message.isSent ? (
                                <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                                  <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                                </svg>
                              ) : '⏳'}
                            </span>
                          )}
                        </div>
                        {/* Botón de descargar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(message.mediaData, message.fileName || 'imagen');
                          }}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            padding: '6px 10px',
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
                          ⬇️
                        </button>
                      </div>
                    ) : message.mediaType === 'video' ? (
                      <div style={{ position: 'relative' }}>
                        <video
                          src={message.mediaData}
                          controls
                          preload="metadata"
                          className="media-video"
                          style={{
                            maxWidth: '100%',
                            borderRadius: '7.5px',
                            display: 'block'
                          }}
                        />
                        {/* 🔥 NUEVO: Hora y checks debajo del video */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            gap: '8px'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#8696a0'
                            }}
                          >
                            <span>{formatTime(message.time)}</span>
                            {message.isEdited && (
                              <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '4px' }}>
                                (editado)
                              </span>
                            )}
                            {isOwnMessage && (
                              <span
                                style={{
                                  color: (message.readBy && message.readBy.length > 0) ? '#53bdeb' : '#8696a0',
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                {message.isSent ? (
                                  <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                                    <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                                  </svg>
                                ) : '⏳'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDownload(message.mediaData, message.fileName || 'video')}
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                          >
                            ⬇️ Descargar
                          </button>
                        </div>
                      </div>
                    ) : message.mediaType === 'audio' ? (
                      <AudioPlayer
                        src={message.mediaData}
                        fileName={message.fileName}
                        onDownload={handleDownload}
                        time={message.time}
                        isOwnMessage={isOwnMessage}
                        isRead={message.isRead}
                        isSent={message.isSent}
                        readBy={message.readBy}
                      />
                    ) : (
                      <div
                        className="file-message"
                        onClick={() => handleDownload(message.mediaData, message.fileName || 'archivo')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          maxWidth: '280px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {/* 🔥 NUEVO: Ícono SVG de archivo según tipo */}
                        <div className="file-icon" style={{ flexShrink: 0 }}>
                          {renderFileIcon(message.fileName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* 🔥 NUEVO: Badge con tipo de archivo */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span
                              style={{
                                backgroundColor: getFileIcon(message.fileName).color,
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                            >
                              {getFileIcon(message.fileName).name}
                            </span>
                          </div>
                          <div
                            className="file-name"
                            style={{
                              color: '#000000D9',
                              fontSize: '13px',
                              fontWeight: '600',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px'
                            }}
                          >
                            {message.fileName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            {message.fileSize && (
                              <span style={{ color: '#8696a0', fontSize: '11px', fontWeight: '400' }}>
                                {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                            {message.fileSize && <span style={{ color: '#8696a0', fontSize: '11px' }}>•</span>}
                            <span style={{ color: '#8696a0', fontSize: '11px' }}>
                              {formatTime(message.time)}
                            </span>
                            {message.isEdited && (
                              <>
                                <span style={{ color: '#8696a0', fontSize: '11px' }}>•</span>
                                <span style={{ fontSize: '10px', color: '#8696a0' }}>
                                  editado
                                </span>
                              </>
                            )}
                            {isOwnMessage && (
                              <>
                                <span style={{ color: '#8696a0', fontSize: '11px' }}>•</span>
                                <span
                                  style={{
                                    color: message.isRead ? '#53bdeb' : '#8696a0',
                                    fontSize: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  {message.isSent ? (
                                    <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                                      <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                                    </svg>
                                  ) : '⏳'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* 🔥 NUEVO: Ícono de descarga mejorado */}
                        <div style={{ flexShrink: 0 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#00a884" opacity="0.1" />
                            <path d="M12 7V13M12 13L9.5 10.5M12 13L14.5 10.5" stroke="#00a884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 16H16" stroke="#00a884" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector de reacciones (fuera del menú) */}
                  {message.id && showReactionPicker === message.id && (
                    <div style={{ position: 'relative', marginTop: '4px' }}>
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
                        {/* Botón + para más emojis */}
                        <button
                          onClick={() => {
                            setShowReactionPicker(null);
                            setShowEmojiPicker(true);
                            // Guardar el mensaje actual para reaccionar después
                            window.currentReactionMessage = message;
                          }}
                          style={{
                            backgroundColor: '#f0f2f5',
                            border: 'none',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            padding: '0',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.2)';
                            e.target.style.backgroundColor = '#e4e6eb';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.backgroundColor = '#f0f2f5';
                          }}
                          title="Más emojis"
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" preserveAspectRatio="xMidYMid meet">
                            <path fill="currentColor" d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mostrar reacciones del mensaje (para mensajes con archivos adjuntos) */}
                  {Array.isArray(message.reactions) && message.reactions.length > 0 && (
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
                          if (reaction && reaction.emoji) {
                            if (!acc[reaction.emoji]) {
                              acc[reaction.emoji] = [];
                            }
                            acc[reaction.emoji].push(reaction.username);
                          }
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

                  {/* Botón de Hilo visible debajo del mensaje (para archivos adjuntos) */}
                  {onOpenThread && !message.isDeleted && (
                    <div
                      onClick={() => onOpenThread(message)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#00a884',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 0',
                        marginTop: '4px',
                        fontWeight: '500',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <FaComments style={{ marginRight: '6px' }} />
                      {message.threadCount > 0
                        ? `${message.threadCount} ${message.threadCount === 1 ? 'respuesta' : 'respuestas'}`
                        : 'Responder en hilo'}
                      {message.lastReplyFrom && message.threadCount > 0 && (
                        <div style={{
                          fontSize: '11px',
                          color: '#8696a0',
                          marginLeft: '20px',
                          fontWeight: '400'
                        }}>
                          Última respuesta de {message.lastReplyFrom}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              {/* 🔥 Mostrar mensaje eliminado */}
              {message.isDeleted ? (
                <div>
                  <div
                    className="message-text"
                    style={{
                      color: '#8696a0',
                      fontSize: '14px',
                      fontStyle: 'italic',
                      lineHeight: '100%',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: '400',
                      marginBottom: '4px',
                      whiteSpace: 'pre-wrap',
                      display: 'block'
                    }}
                  >
                    {message.deletedBy ? `🚫 Mensaje eliminado por ${message.deletedBy}` : '🚫 Mensaje eliminado'}
                  </div>
                  {/* Hora del mensaje eliminado */}
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8696a0',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{formatTime(message.time)}</span>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const MAX_LENGTH = 300; // Máximo de caracteres antes de mostrar "Ver más"
                    const isExpanded = expandedMessages.has(message.id);
                    const shouldTruncate = message.text && message.text.length > MAX_LENGTH;
                    const displayText = shouldTruncate && !isExpanded
                      ? message.text.substring(0, MAX_LENGTH)
                      : message.text;

                    return (
                      <>
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
                            display: 'block',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {renderTextWithMentions(displayText)}
                          {shouldTruncate && !isExpanded && '...'}
                          {/* Hora y checks inline */}
                          {(!shouldTruncate || isExpanded) && (
                            <span
                              className="message-time-inline"
                              style={{
                                fontSize: '12.83px',
                                color: '#00000073',
                                marginLeft: '6px',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                verticalAlign: 'bottom',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                fontWeight: '300',
                                lineHeight: '17.11px',
                                letterSpacing: '0px'
                              }}
                            >
                              <span>{formatTime(message.time)}</span>
                              {message.isEdited && (
                                <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '4px' }}>
                                  (editado)
                                </span>
                              )}
                              {isOwnMessage && (
                                <>
                                  <span
                                    className="message-status"
                                    style={{
                                      color: (message.readBy && message.readBy.length > 0) ? '#27AE60' : '#8696a0',
                                      fontSize: '11px',
                                      cursor: isGroup ? 'pointer' : 'default',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                    onClick={() => {
                                      if (isGroup && message.id) {
                                        setShowMessageInfo(message);
                                      }
                                    }}
                                    title={isGroup ? 'Ver información de lectura' : ''}
                                  >
                                    {message.isSent ? (
                                      <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                                        <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                                      </svg>
                                    ) : '⏳'}
                                  </span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Botón "Ver más" / "Ver menos" */}
                        {shouldTruncate && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              onClick={() => {
                                setExpandedMessages(prev => {
                                  const newSet = new Set(prev);
                                  if (isExpanded) {
                                    newSet.delete(message.id);
                                  } else {
                                    newSet.add(message.id);
                                  }
                                  return newSet;
                                });
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#00a884',
                                cursor: 'pointer',
                                fontSize: '13px',
                                padding: '0',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                            >
                              {isExpanded ? 'Ver menos' : 'Ver más'}
                            </button>
                            {/* Hora y checks cuando el mensaje está truncado */}
                            {!isExpanded && (
                              <span
                                className="message-time-inline"
                                style={{
                                  fontSize: '12.83px',
                                  color: '#00000073',
                                  marginLeft: '0',
                                  marginTop: '4px',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  verticalAlign: 'bottom',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                  fontWeight: '300',
                                  lineHeight: '17.11px',
                                  letterSpacing: '0px'
                                }}
                              >
                                <span>{formatTime(message.time)}</span>
                                {message.isEdited && (
                                  <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '4px' }}>
                                    (editado)
                                  </span>
                                )}
                                {isOwnMessage && (
                                  <>
                                    <span
                                      className="message-status"
                                      style={{
                                        color: (message.readBy && message.readBy.length > 0) ? '#27AE60' : '#8696a0',
                                        fontSize: '11px',
                                        cursor: isGroup ? 'pointer' : 'default',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                      onClick={() => {
                                        if (isGroup && message.id) {
                                          setShowMessageInfo(message);
                                        }
                                      }}
                                      title={isGroup ? 'Ver información de lectura' : ''}
                                    >
                                      {message.isSent ? (
                                        <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                                          <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                                        </svg>
                                      ) : '⏳'}
                                    </span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* Selector de reacciones (fuera del menú) */}
              {message.id && showReactionPicker === message.id && (
                <div style={{ position: 'relative', marginTop: '4px' }}>
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
                    {/* Botón + para más emojis */}
                    <button
                      onClick={() => {
                        setShowReactionPicker(null);
                        setShowEmojiPicker(true);
                        // Guardar el mensaje actual para reaccionar después
                        window.currentReactionMessage = message;
                      }}
                      style={{
                        backgroundColor: '#f0f2f5',
                        border: 'none',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        padding: '0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.2)';
                        e.target.style.backgroundColor = '#e4e6eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.backgroundColor = '#f0f2f5';
                      }}
                      title="Más emojis"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" preserveAspectRatio="xMidYMid meet">
                        <path fill="currentColor" d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Mostrar reacciones del mensaje */}
              {Array.isArray(message.reactions) && message.reactions.length > 0 && (
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
                      if (reaction && reaction.emoji) {
                        if (!acc[reaction.emoji]) {
                          acc[reaction.emoji] = [];
                        }
                        acc[reaction.emoji].push(reaction.username);
                      }
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

              {/* Botón de Hilo visible debajo del mensaje */}
              {onOpenThread && !message.isDeleted && (
                <div
                  onClick={() => onOpenThread(message)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#00a884',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 0',
                    marginTop: '4px',
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaComments style={{ fontSize: '14px' }} />
                    <span>
                      {message.threadCount > 0
                        ? `${message.threadCount} ${message.threadCount === 1 ? 'respuesta' : 'respuestas'}`
                        : 'Responder en hilo'}
                    </span>
                  </div>
                  {message.lastReplyFrom && message.threadCount > 0 && (
                    <div style={{
                      fontSize: '11px',
                      color: '#8696a0',
                      marginLeft: '20px',
                      fontWeight: '400'
                    }}>
                      Última respuesta de {message.lastReplyFrom}
                    </div>
                  )}
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
        {/* 🔥 Mostrar spinner de carga inicial */}
        {isLoadingMessages ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(0, 168, 132, 0.2)',
              borderTop: '4px solid #00a884',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{
              color: '#8696a0',
              fontSize: '14px',
              fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif',
              margin: 0
            }}>
              Cargando mensajes...
            </p>
          </div>
        ) : (
          <>
            <LoadMoreMessages
              hasMoreMessages={hasMoreMessages}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMoreMessages}
            />

            {/* Mensajes agrupados por fecha */}
            {groupMessagesByDate(messages).map((item, idx) => {
              if (item.type === 'date-separator') {
                return (
                  <div key={`date-${idx}`} className="date-separator">
                    <div className="date-separator-content">{item.label}</div>
                  </div>
                );
              } else {
                return renderMessage(item.data, item.index);
              }
            })}

            {/* === 🔥 INDICADOR DE "ESTÁ ESCRIBIENDO" 🔥 === */}
            {(((!isGroup && isOtherUserTyping && typingUser) ||
              (isGroup && currentRoomCode && roomTypingUsers && roomTypingUsers[currentRoomCode] && roomTypingUsers[currentRoomCode].length > 0))) && (
                <div className="typing-indicator-container">
              {/* Para chats individuales */}
              {!isGroup && isOtherUserTyping && typingUser && (
                <div
                  className="message other-message"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-end',
                    margin: '2px 0',
                    padding: '0 8px',
                    gap: '6px',
                  }}
                >
                  {/* Avatar - Mostrar imagen si existe, sino iniciales o emoji */}
                  <div
                    className="message-avatar"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: typingUser?.picture
                        ? `url(${typingUser.picture}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0,
                      marginBottom: '2px',
                      color: 'white',
                      fontWeight: '600'
                    }}
                  >
                    {!typingUser?.picture && (
                      typingUser?.nombre
                        ? typingUser.nombre.charAt(0).toUpperCase()
                        : (to?.charAt(0).toUpperCase() || '👤')
                    )}
                  </div>

                  {/* Contenedor del SVG */}
                  <div
                    className="message-content"
                    style={{
                      backgroundColor: '#E8E6F0', // Mismo color que "other-message"
                      padding: '6px 12px',
                      borderTopRightRadius: '17.11px',
                      borderBottomRightRadius: '17.11px',
                      borderBottomLeftRadius: '17.11px',
                      borderTopLeftRadius: '4px',
                      boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      width: 'auto',
                      height: 'auto'
                    }}
                  >
                    {/* Nombre del usuario que está escribiendo */}
                    <div
                      style={{
                        color: '#00a884',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '2px'
                      }}
                    >
                      {typingUser.nombre && typingUser.apellido
                        ? `${typingUser.nombre} ${typingUser.apellido}`
                        : (typingUser.nombre || typingUser.username || to)}
                    </div>

                    <div className="typing-svg-container">
                      {/* SVG Convertido a JSX */}
                      <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 72 72" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', transform: 'translate3d(0px, 0px, 0px)', contentVisibility: 'visible' }}>
                        <defs>
                          <clipPath id="_lottie_element_352">
                            <rect width="72" height="72" x="0" y="0"></rect>
                          </clipPath>
                        </defs>
                        <g clipPath="url(#_lottie_element_352)">
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,37.752864837646484)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"></path>
                            </g>
                          </g>
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,34.76784896850586)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                            </g>
                          </g>
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,30.869281768798828)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                            </g>
                          </g>
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,37.752864837646484)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"></path>
                            </g>
                          </g>
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,34.76784896850586)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                            </g>
                          </g>
                          <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,30.869281768798828)" opacity="1">
                            <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                              <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                            </g>
                          </g>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Para grupos/salas - Mostrar todos los usuarios que están escribiendo */}
              {isGroup && currentRoomCode && roomTypingUsers && roomTypingUsers[currentRoomCode] && roomTypingUsers[currentRoomCode].length > 0 && (
                roomTypingUsers[currentRoomCode].map((typingUserInRoom, index) => (
                  <div
                    key={`typing-${typingUserInRoom.username}-${index}`}
                    className="message other-message"
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-end',
                      margin: '2px 0',
                      padding: '0 8px',
                      gap: '6px',
                    }}
                  >
                    {/* Avatar - Mostrar imagen si existe, sino iniciales o emoji */}
                    <div
                      className="message-avatar"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: typingUserInRoom?.picture
                          ? `url(${typingUserInRoom.picture}) center/cover no-repeat`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        flexShrink: 0,
                        marginBottom: '2px',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {!typingUserInRoom?.picture && (
                        typingUserInRoom?.nombre
                          ? typingUserInRoom.nombre.charAt(0).toUpperCase()
                          : (typingUserInRoom.username?.charAt(0).toUpperCase() || '👤')
                      )}
                    </div>

                    {/* Contenedor del SVG */}
                    <div
                      className="message-content"
                      style={{
                        backgroundColor: '#E8E6F0',
                        padding: '6px 12px',
                        borderTopRightRadius: '17.11px',
                        borderBottomRightRadius: '17.11px',
                        borderBottomLeftRadius: '17.11px',
                        borderTopLeftRadius: '4px',
                        boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        width: 'auto',
                        height: 'auto'
                      }}
                    >
                      {/* Nombre del usuario que está escribiendo */}
                      <div
                        style={{
                          color: '#00a884',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginBottom: '2px'
                        }}
                      >
                        {typingUserInRoom.nombre && typingUserInRoom.apellido
                          ? `${typingUserInRoom.nombre} ${typingUserInRoom.apellido}`
                          : (typingUserInRoom.nombre || typingUserInRoom.username)}
                      </div>

                      <div className="typing-svg-container">
                        {/* SVG Convertido a JSX */}
                        <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 72 72" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', transform: 'translate3d(0px, 0px, 0px)', contentVisibility: 'visible' }}>
                          <defs>
                            <clipPath id={`_lottie_element_${index}`}>
                              <rect width="72" height="72" x="0" y="0"></rect>
                            </clipPath>
                          </defs>
                          <g clipPath={`url(#_lottie_element_${index})`}>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,37.752864837646484)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"></path>
                              </g>
                            </g>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,34.76784896850586)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                              </g>
                            </g>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,30.869281768798828)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                              </g>
                            </g>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,37.752864837646484)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"></path>
                              </g>
                            </g>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,34.76784896850586)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                              </g>
                            </g>
                            <g style={{ display: 'block' }} transform="matrix(1,0,0,1,35.875,30.869281768798828)" opacity="1">
                              <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                                <path fill="rgb(196,82,44)" fillOpacity="1" d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"></path>
                              </g>
                            </g>
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          </>
        )}
      </div>

      <div className="chat-input-container">
        {mediaFiles.length > 0 && (
          <div className="media-preview">
            {mediaPreviews.map((preview, index) => {
              // Función para obtener el ícono según el tipo de archivo
              const getFileIcon = (type) => {
                switch (type) {
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
                      loading="lazy"
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
              backgroundColor: '#d1f4dd',
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
              <div style={{ color: '#1f2937', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyingTo.text || 'Archivo multimedia'}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#00a884',
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
            <svg className="attach-icon" width="24" height="24" viewBox="0 0 15 17" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.50407 7.51959C0.370931 7.38644 0.296136 7.20586 0.296136 7.01756C0.296136 6.82927 0.370931 6.64869 0.50407 6.51554L5.52325 1.49956C5.98225 1.02877 6.53016 0.653797 7.1352 0.396398C7.74024 0.138999 8.39037 0.00429558 9.04787 0.000101073C9.70538 -0.00409343 10.3572 0.122304 10.9654 0.371963C11.5737 0.621622 12.1264 0.989572 12.5913 1.45447C13.0563 1.91937 13.4243 2.47196 13.6741 3.0802C13.9238 3.68844 14.0503 4.34021 14.0463 4.99772C14.0422 5.65522 13.9076 6.30537 13.6502 6.91045C13.3929 7.51553 13.018 8.0635 12.5473 8.52257L6.02474 15.0452C5.35651 15.6967 4.45843 16.0588 3.52511 16.0528C2.5918 16.0468 1.69843 15.6733 1.03861 15.0132C0.378784 14.3531 0.00564932 13.4596 6.36217e-05 12.5262C-0.00552208 11.5929 0.356891 10.695 1.00877 10.027L6.5273 4.5085C6.92821 4.11717 7.46721 3.89963 8.02744 3.90306C8.58767 3.90649 9.12397 4.13061 9.52005 4.52683C9.91613 4.92306 10.1401 5.45943 10.1433 6.01966C10.1465 6.5799 9.9288 7.11882 9.53731 7.51959L5.52325 11.5326C5.39025 11.6656 5.20986 11.7403 5.02176 11.7403C4.83367 11.7403 4.65327 11.6656 4.52027 11.5326C4.38727 11.3996 4.31255 11.2192 4.31255 11.0311C4.31255 10.843 4.38727 10.6626 4.52027 10.5296L8.53326 6.51554C8.59912 6.44968 8.65136 6.3715 8.687 6.28545C8.72264 6.1994 8.74099 6.10718 8.74099 6.01405C8.74099 5.92091 8.72264 5.82869 8.687 5.74264C8.65136 5.65659 8.59912 5.57841 8.53326 5.51256C8.46741 5.4467 8.38922 5.39446 8.30318 5.35882C8.21713 5.32318 8.12491 5.30483 8.03177 5.30483C7.93864 5.30483 7.84641 5.32318 7.76037 5.35882C7.67432 5.39446 7.59614 5.4467 7.53028 5.51256L2.01175 11.0311C1.6126 11.4302 1.38836 11.9716 1.38836 12.5361C1.38836 12.8156 1.44341 13.0924 1.55037 13.3506C1.65733 13.6088 1.81411 13.8435 2.01175 14.0411C2.20939 14.2387 2.44402 14.3955 2.70225 14.5025C2.96048 14.6094 3.23725 14.6645 3.51676 14.6645C4.08124 14.6645 4.62261 14.4403 5.02176 14.0411L11.5443 7.51852C11.8868 7.19206 12.1604 6.80042 12.3493 6.36663C12.5381 5.93285 12.6382 5.46567 12.6438 4.99261C12.6494 4.51954 12.5603 4.05013 12.3818 3.612C12.2033 3.17386 11.939 2.77586 11.6044 2.4414C11.2698 2.10693 10.8717 1.84277 10.4335 1.66445C9.99526 1.48613 9.52581 1.39726 9.05274 1.40305C8.57968 1.40885 8.11255 1.5092 7.67884 1.69821C7.24514 1.88721 6.85361 2.16105 6.5273 2.50361L1.51026 7.51959C1.37715 7.6524 1.1968 7.72699 1.00877 7.72699C0.820736 7.72699 0.640383 7.6524 0.507278 7.51959" />
            </svg>
          </label>

          {/* Botón de emoji picker */}
          <div style={{ position: 'relative' }} ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn-attach ${!canSendMessages ? 'disabled' : ''}`}
              disabled={!canSendMessages}
              title="Emojis"
            >
              <EmojiIcon className="attach-icon" />
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

          <div style={{ position: 'relative', flex: 1 }}>
            {/* 🔥 Loading overlay cuando se sube un archivo */}
            {isUploadingFile && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: '12px',
                color: '#00a884',
                fontWeight: '500',
                fontSize: '14px',
                backdropFilter: 'blur(2px)'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #00a884',
                  borderRightColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.75s linear infinite',
                  marginRight: '8px'
                }}></div>
                Subiendo archivo...
              </div>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={isUploadingFile ? "Subiendo archivo..." : (canSendMessages ? "Escribe un mensaje" : "Solo puedes monitorear esta conversación")}
              className="message-input"
              disabled={isRecording || !canSendMessages || isUploadingFile}
            />

            {/* Sugerencias de menciones */}
            {showMentionSuggestions && isGroup && roomUsers && roomUsers.length > 0 && (
              <div
                className="mention-suggestions"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '0',
                  right: '0',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
                  marginBottom: '8px',
                  zIndex: 1000
                }}
              >
                {roomUsers
                  .filter(user => {
                    const username = typeof user === 'string' ? user : (user.username || user.nombre || user);
                    return username.toLowerCase().includes(mentionSearch) && username !== currentUsername;
                  })
                  .slice(0, 5)
                  .map((user, index) => {
                    const username = typeof user === 'string' ? user : (user.username || user.nombre || user);
                    const displayName = typeof user === 'object' && user.nombre && user.apellido
                      ? `${user.nombre} ${user.apellido}`
                      : username;

                    return (
                      <div
                        key={index}
                        onClick={() => handleMentionSelect(user)}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {displayName}
                          </div>
                          {displayName !== username && (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              @{username}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {roomUsers.filter(user => {
                  const username = typeof user === 'string' ? user : (user.username || user.nombre || user);
                  return username.toLowerCase().includes(mentionSearch) && username !== currentUsername;
                }).length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                      No se encontraron usuarios
                    </div>
                  )}
              </div>
            )}
          </div>

          <button
            onClick={onSendMessage}
            className="btn-send"
            disabled={!input && mediaFiles.length === 0 || !canSendMessages || isUploadingFile}
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
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#00a884', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                    <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                  </svg>
                  Leído por ({showMessageInfo.readBy?.length || 0})
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
                        <div style={{ fontSize: '16px', color: '#53bdeb', display: 'flex', alignItems: 'center' }}>
                          <svg viewBox="0 0 18 18" height="18" width="18" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 18 18">
                            <path fill="currentColor" d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"></path>
                          </svg>
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

      {/* Modal de vista previa de imagen en pantalla completa */}
      {imagePreview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setImagePreview(null)}
        >
          {/* Botón de cerrar */}
          <button
            onClick={() => setImagePreview(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            ✕
          </button>

          {/* Botón de descargar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(imagePreview.url, imagePreview.fileName);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '80px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            ⬇️ Descargar
          </button>

          {/* Imagen */}
          <img
            src={imagePreview.url}
            alt={imagePreview.fileName}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Nombre del archivo */}
          <p style={{
            position: 'absolute',
            bottom: '20px',
            color: '#fff',
            fontSize: '14px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '20px'
          }}>
            {imagePreview.fileName}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatContent;
