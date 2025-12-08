import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaTimes,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaSpinner,
  FaEllipsisV, // 🔥 NUEVO: Menú de opciones
  FaShare, // 🔥 NUEVO: Ícono de reenviar
  FaCopy, // 🔥 NUEVO: Ícono de copiar
  FaReply, // 🔥 NUEVO: Ícono de responder
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import apiService from "../../../../apiService";
import AudioPlayer from "../AudioPlayer/AudioPlayer";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";
import ForwardMessageModal from "../ChatContent/ForwardMessageModal"; // 🔥 NUEVO: Modal de reenvío

import "./ThreadPanel.css";

const ThreadPanel = ({
  isOpen,
  message,
  onClose,
  currentUsername,
  socket,
  onSendMessage,
  currentRoomCode, // 🔥 NUEVO: RoomCode actual de la sesión
  roomUsers = [], // 🔥 NUEVO: Lista de usuarios en la sala para menciones
  // 🔥 NUEVO: Props para modal de reenvío
  myActiveRooms = [],
  assignedConversations = [],
  user,
}) => {
  // if (!isOpen) return null; // 🔥 MOVIDO AL FINAL PARA RESPETAR REGLAS DE HOOKS
  const [threadMessages, setThreadMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentThreadCount, setCurrentThreadCount] = useState(
    message?.threadCount || 0
  );
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);
  // 🔥 NUEVO: Estado para menciones
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const messageMenuRef = useRef(null); // 🔥 NUEVO: Ref para menú de opciones
  const reactionPickerRef = useRef(null); // 🔥 NUEVO: Ref para picker de reacciones

  // 🔥 NUEVOS ESTADOS - Menú de opciones y reenvío
  const [showMessageMenu, setShowMessageMenu] = useState(null); // ID del mensaje con menú abierto
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null); // ID del mensaje con picker abierto
  const [replyingTo, setReplyingTo] = useState(null); // Mensaje al que se responde
  const [openReadReceiptsId, setOpenReadReceiptsId] = useState(null); // 🔥 NUEVO: ID del mensaje con popover de leídos abierto
  const [popoverPosition, setPopoverPosition] = useState('top'); // 'top' | 'bottom'
  const [popoverCoords, setPopoverCoords] = useState({ right: 0, top: 0 }); // 🔥 Coordenadas exactas para position: fixed



  // Cargar mensajes del hilo


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
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escuchar nuevos mensajes del hilo
  useEffect(() => {
    if (!socket) {
      console.warn("⚠️ ThreadPanel: Socket no disponible");
      return;
    }

    console.log("🔌 ThreadPanel: Escuchando eventos de socket para hilo", message?.id);

    const handleThreadMessage = (newMessage) => {
      console.log('🧵 ThreadPanel recibió threadMessage:', newMessage);
      console.log('  - threadId del mensaje:', newMessage.threadId);
      console.log('  - threadId esperado:', message?.id);

      // Asegurar comparación laxa por si uno es string y otro number
      if (String(newMessage.threadId) === String(message?.id)) {
        console.log('✅ ThreadId coincide, procesando mensaje...');

        setThreadMessages((prev) => {
          // Verificar duplicados solo por ID real
          const messageExists = prev.some((msg) => msg.id === newMessage.id);

          if (messageExists) {
            console.log('⏭️ Mensaje ya existe (mismo ID), ignorando');
            return prev;
          }

          console.log('✅ Agregando nuevo mensaje al hilo:', newMessage);
          return [...prev, newMessage];
        });
      } else {
        console.log('❌ ThreadId NO coincide');
      }
    };

    const handleThreadCountUpdated = (data) => {
      console.log('🔢 ThreadPanel evento threadCountUpdated:', data);
      // Solo actualizar si es para este hilo específico
      if (String(data.messageId) === String(message?.id)) {
        console.log(
          `🔢 ThreadPanel actualizando contador para hilo ${data.messageId}`
        );
        setCurrentThreadCount((prev) => prev + 1);
      }
    };

    socket.on("threadMessage", handleThreadMessage);
    socket.on("threadCountUpdated", handleThreadCountUpdated);

    return () => {
      socket.off("threadMessage", handleThreadMessage);
      socket.off("threadCountUpdated", handleThreadCountUpdated);
    };
  }, [socket, message?.id, currentUsername]);



  const loadThreadMessages = useCallback(async () => {
    if (!message?.id) return;
    setLoading(true);
    try {
      const data = await apiService.getThreadMessages(message.id);
      setThreadMessages(data);
      // Actualizar el contador con la cantidad real de mensajes cargados
      setCurrentThreadCount(data.length);
    } catch (error) {
      console.error("Error al cargar mensajes del hilo:", error);
    } finally {
      setLoading(false);
    }
  }, [message?.id]);

  // useEffect para cargar mensajes cuando se abre el hilo
  useEffect(() => {
    if (message?.id) {
      loadThreadMessages();
    }
  }, [loadThreadMessages, message?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 🔥 NUEVO: Marcar mensajes como leídos al cargar el hilo
  useEffect(() => {
    if (threadMessages.length > 0) {
      const unreadMessageIds = threadMessages
        .filter(msg => msg.from !== currentUsername && (!msg.readBy || !msg.readBy.includes(currentUsername)))
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        apiService.markMultipleMessagesAsRead(unreadMessageIds, currentUsername)
          .catch(error => console.error('Error marking thread messages as read:', error));
      }
    }
  }, [threadMessages, currentUsername]);

  // Función para convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // 🔥 Límite actualizado a 70MB
      const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

      if (file.size > MAX_FILE_SIZE) {
        // Actualizamos también el mensaje de error
        reject(new Error("El archivo es demasiado grande. Máximo 70MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Estado para Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files) => {
    if (files.length === 0) return;

    // Validar límite total de archivos (máximo 5)
    if (mediaFiles.length + files.length > 5) {
      alert(`❌ Máximo 5 archivos en total. Ya tienes ${mediaFiles.length} y estás intentando agregar ${files.length}.`);
      return;
    }

    // Validar tamaño de cada archivo (70MB máximo)
    const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      alert(`❌ Algunos archivos superan el límite de 70MB:\n${oversizedFiles.map(f => `- ${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join('\n')}`);
      return;
    }

    // Agregar nuevos archivos a los existentes
    const updatedFiles = [...mediaFiles, ...files];
    setMediaFiles(updatedFiles);

    // Generar previews para los nuevos archivos
    const previewPromises = files.map((file) => fileToBase64(file));
    Promise.all(previewPromises)
      .then((results) => {
        const newPreviews = results.map((data, index) => {
          const file = files[index];
          const fileType = file.type;

          // Determinar el tipo de archivo para el preview
          let displayType = 'file'; // Por defecto
          if (fileType.startsWith('image/')) {
            displayType = 'image';
          } else if (fileType === 'application/pdf') {
            displayType = 'pdf';
          } else if (fileType.startsWith('video/')) {
            displayType = 'video';
          } else if (fileType.startsWith('audio/')) {
            displayType = 'audio';
          } else if (fileType.includes('word') || fileType.includes('document')) {
            displayType = 'document';
          } else if (fileType.includes('sheet') || fileType.includes('excel')) {
            displayType = 'spreadsheet';
          }

          return {
            name: file.name,
            type: displayType,
            mimeType: fileType,
            data: data,
            size: file.size,
          };
        });

        // Concatenar previews nuevos a los existentes
        setMediaPreviews(prev => [...prev, ...newPreviews]);
      })
      .catch((error) => {
        console.error("Error al procesar archivos:", error);
        alert("Error al procesar archivos: " + error.message);
      });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Limpiar el input
  };

  // Manejadores de Drag & Drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Solo desactivar si realmente salimos del contenedor (no si entramos a un hijo)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };
  // Remover archivo de la lista
  const handleRemoveMediaFile = (index) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  // Cancelar subida de archivos
  const cancelMediaUpload = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
  };

  const handleSend = async () => {
    if ((!input.trim() && mediaFiles.length === 0) || isSending) return;

    setIsSending(true);
    try {
      // 🔥 DEBUG: Ver estado de replyingTo
      console.log('🔍 handleSend - replyingTo:', replyingTo);

      // Helper para determinar tipo de medio
      const getMediaType = (file) => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type === 'application/pdf') return 'pdf';
        return 'file'; // Fallback genérico para todo lo demás
      };

      // Construir datos de respuesta si existen
      const replyData = replyingTo ? {
        replyToMessageId: replyingTo.id,
        replyToSender: replyingTo.from || replyingTo.sender,
        replyToText: replyingTo.message || replyingTo.text || replyingTo.fileName || "Archivo adjunto",
      } : {};

      // 1. Si hay archivos, enviarlos uno por uno
      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];

          // Subir archivo
          const uploadResult = await apiService.uploadFile(file, "chat");

          const mediaType = getMediaType(file);

          // Construir mensaje
          const messageData = {
            // Solo adjuntar el texto al primer archivo
            text: i === 0 ? input : "",
            threadId: message.id,
            from: currentUsername,
            to: message.isGroup
              ? message.receiver
              : (message.realSender === currentUsername ? message.receiver : message.realSender),
            isGroup: message.isGroup,
            roomCode: message.isGroup ? currentRoomCode : undefined,
            mediaType: mediaType,
            mediaData: uploadResult.fileUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            ...replyData, // 🔥 Incluir datos de respuesta
          };

          await onSendMessage(messageData);
        }
      } else {
        // 2. Si solo es texto
        const messageData = {
          text: input,
          threadId: message.id,
          from: currentUsername,
          to: message.isGroup
            ? message.receiver
            : (message.realSender === currentUsername ? message.receiver : message.realSender),
          isGroup: message.isGroup,
          roomCode: message.isGroup ? currentRoomCode : undefined,
          ...replyData, // 🔥 Incluir datos de respuesta
        };

        await onSendMessage(messageData);
      }

      // Limpiar estado
      setInput("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setReplyingTo(null); // 🔥 NUEVO: Limpiar respuesta

      // Resetear input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error("Error al enviar respuesta en hilo:", error);
      alert("Error al enviar el mensaje. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  // Manejar envío de mensaje de voz
  const handleSendVoiceMessage = async (audioFile) => {
    if (!audioFile) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      const messageData = {
        text: "",
        threadId: message.id,
        from: currentUsername,
        // 🔥 CORREGIDO: Para mensajes de grupo, usar message.receiver (nombre de sala)
        to: message.isGroup
          ? message.receiver  // Para grupos, usar receiver (nombre de la sala)
          : (message.realSender === currentUsername ? message.receiver : message.realSender),
        isGroup: message.isGroup,
        // 🔥 CORREGIDO: Usar currentRoomCode de la sesión actual (prop)
        roomCode: message.isGroup ? currentRoomCode : undefined,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      };
      // 🔥 CONFIAR EN EL BACKEND - NO agregar nada localmente
      // El socket devolverá el mensaje con threadMessage

      await onSendMessage(messageData);
    } catch (error) {
      console.error("Error al enviar audio en hilo:", error);
      alert("Error al enviar el audio. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  // 🔥 NUEVO: Handler para detectar menciones en el input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    // Detectar @ en la posición del cursor
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch && roomUsers && roomUsers.length > 0) {
      const searchTerm = atMatch[1].toLowerCase();
      setMentionSearchTerm(searchTerm);

      // Filtrar miembros basado en el término de búsqueda
      const filtered = roomUsers.filter(user => {
        const username = user.username || user.nombre || '';
        return username.toLowerCase().includes(searchTerm) && username !== currentUsername;
      });

      setFilteredMembers(filtered);
      setShowMentionSuggestions(filtered.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // 🔥 NUEVO: Handler de paste para imágenes
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processFiles([file]);
        }
        break;
      }
    }
  };

  // 🔥 NUEVO: Insertar mención seleccionada
  const insertMention = (user) => {
    const username = user.username || user.nombre || '';
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBeforeCursor = input.substring(0, cursorPos);
    const textAfterCursor = input.substring(cursorPos);

    // Encontrar dónde comienza el @ actual
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const atPosition = textBeforeCursor.lastIndexOf('@');
      const newText = input.substring(0, atPosition) + `@${username} ` + textAfterCursor;
      setInput(newText);

      // Mover cursor después de la mención
      setTimeout(() => {
        const newCursorPos = atPosition + username.length + 2; // +2 para @ y espacio
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current?.focus();
      }, 0);
    }

    setShowMentionSuggestions(false);
  };


  // 🔥 NUEVO: Listener global para pegar imágenes (evitando duplicados en input)
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const target = e.target;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Si es el textarea del thread, permitimos que handlePaste decida si interceptar (imágenes) o dejar pasar (texto)
      // if (isInInput && target === inputRef.current) {
      //   return;
      // }

      // Manejar el pegado globalmente
      handlePaste(e);
    };

    const panel = document.querySelector('.thread-panel-container');
    if (panel) {
      panel.addEventListener('paste', handleGlobalPaste);
    }

    return () => {
      if (panel) {
        panel.removeEventListener('paste', handleGlobalPaste);
      }
    };
  }, []);

  const handleKeyDown = (e) => {
    // 🔥 NUEVO: Navegación en dropdown de menciones
    if (showMentionSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => prev > 0 ? prev - 1 : 0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMembers[selectedMentionIndex]) {
          insertMention(filteredMembers[selectedMentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
        return;
      }
    }

    // Comportamiento normal de Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // 🔥 NUEVOS HANDLERS - Forward Modal
  const handleOpenForwardModal = (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowMessageMenu(null);
  };

  const handleCloseForwardModal = () => {
    setShowForwardModal(false);
    setMessageToForward(null);
  };

  // 🔥 NUEVO: Copiar texto del mensaje
  const handleCopyText = async (message) => {
    const text = message.message || message.text || message.fileName || '';
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setShowMessageMenu(null);
      } catch (error) {
        console.error('Error al copiar:', error);
      }
    }
  };

  // 🔥 NUEVO: Abrir picker de reacciones
  const handleOpenReactionPicker = (messageId) => {
    setShowReactionPicker(messageId);
    setShowMessageMenu(null);
  };

  // 🔥 NUEVO: Reaccionar a mensaje
  const handleReaction = (msg, emoji) => {
    if (!socket || !socket.connected || !currentUsername) {
      console.warn('Socket no conectado o usuario no identificado');
      return;
    }

    // 🔥 FIX: Usar 'toggleReaction' como en ChatContent
    socket.emit("toggleReaction", {
      messageId: msg.id,
      username: currentUsername,
      emoji: emoji,
      roomCode: currentRoomCode, // 🔥 Incluir roomCode para hilos de grupo
    });

    setShowReactionPicker(null);
  };


  // 🔥 NUEVO: Responder a mensaje
  const handleReplyTo = (message) => {
    setReplyingTo(message);
    setShowMessageMenu(null);
    inputRef.current?.focus();
  };

  // 🔥 NUEVO: Cancelar respuesta
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const formatTime = (msg) => {
    if (!msg) return "";

    // 🔥 IMPORTANTE: Si el mensaje tiene 'time' ya formateado, usarlo directamente
    // El backend ya envía 'time' en formato de Perú (HH:mm)
    if (msg.time) {
      return msg.time;
    }

    // Si solo tiene sentAt, usar directamente (backend ya formatea)
    if (msg.sentAt) {
      return msg.sentAt;
    }

    return "";
  };

  // 🔥 NUEVO: Cerrar menú y picker de reacciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setShowMessageMenu(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
      // 🔥 Cerrar popover de leídos si se hace clic fuera
      if (!event.target.closest('.thread-read-receipts-popover') && !event.target.closest('.thread-read-receipts-trigger')) {
        setOpenReadReceiptsId(null);
      }
    };

    if (showMessageMenu || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMessageMenu, showReactionPicker]);

  // 🔥 NUEVO: Handler de paste para el contenedor (reemplaza al useEffect)
  const handleContainerPaste = (e) => {
    const target = e.target;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // Si estamos en un input/textarea, NO hacer nada aquí (ya tienen su propio comportamiento)
    if (isInInput) return;

    handlePaste(e);
  };

  // 🔥 Limpiar estado al cerrar el panel
  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setReplyingTo(null);
      setMessageToForward(null);
      setShowForwardModal(false);
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  return (
    <div
      className={`thread-panel-container ${isDragging ? 'thread-panel-dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handleContainerPaste} // 🔥 NUEVO: Paste handler en el div
    >
      {isDragging && (
        <div className="thread-drag-overlay">
          <div className="thread-drag-content">
            <FaPaperclip size={50} />
            <h3>Suelta los archivos aquí</h3>
          </div>
        </div>
      )}
      <div className="thread-panel-header">
        <div className="thread-panel-title">
          <span>Hilo</span>
        </div>
        <button className="thread-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="thread-main-message">
        <div className="thread-main-message-header">
          <strong>{message.from}</strong>
          <span className="thread-main-message-time">
            {formatTime(message)}
          </span>
        </div>

        {/* Mostrar contenido según el tipo de mensaje */}
        {message.mediaType === "audio" && message.mediaData ? (
          <div className="thread-main-message-media">
            <AudioPlayer
              src={message.mediaData}
              fileName={message.fileName}
              onDownload={(src, fileName) => {
                const link = document.createElement("a");
                link.href = src;
                link.download = fileName || "audio";
                link.click();
              }}
              time={message.time || message.sentAt}
              isOwnMessage={message.from === currentUsername}
              isRead={message.isRead}
              isSent={message.isSent}
              readBy={message.readBy}
            />
          </div>
        ) : message.mediaType === "image" && message.mediaData ? (
          <div className="thread-main-message-media">
            <img
              src={message.mediaData}
              alt={message.fileName || "Imagen"}
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => window.open(message.mediaData, "_blank")}
            />
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : message.mediaType === "video" && message.mediaData ? (
          <div className="thread-main-message-media">
            <video
              src={message.mediaData}
              controls
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
              }}
            />
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : message.mediaType && message.mediaData ? (
          <div className="thread-main-message-media">
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📎</span>
              <span style={{ fontSize: "13px" }}>
                {message.fileName || "Archivo"}
              </span>
            </div>
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : (
          <div className="thread-main-message-text">{message.text}</div>
        )}

        <div className="thread-replies-count">
          {currentThreadCount}{" "}
          {currentThreadCount === 1 ? "respuesta" : "respuestas"}
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
              className={`thread-message ${msg.from === currentUsername
                ? "thread-message-own"
                : "thread-message-other"
                }`}
            >
              <div className="thread-message-header">
                <strong>{msg.from}</strong>
                <span className="thread-message-time">{formatTime(msg)}</span>
              </div>

              {/* 🔥 NUEVO: Mostrar referencia de respuesta si existe */}
              {msg.replyToMessageId && msg.replyToSender && (
                <div className="thread-reply-reference">
                  <FaReply className="reply-ref-icon" />
                  <div className="reply-ref-content">
                    <span className="reply-ref-sender">{msg.replyToSender}</span>
                    <span className="reply-ref-text">{msg.replyToText || "Mensaje"}</span>
                  </div>
                </div>
              )}

              {/* Mostrar contenido multimedia si existe */}
              {msg.mediaType === "audio" && msg.mediaData ? (
                <div className="thread-message-media">
                  <AudioPlayer
                    src={msg.mediaData}
                    fileName={msg.fileName}
                    onDownload={(src, fileName) => {
                      const link = document.createElement("a");
                      link.href = src;
                      link.download = fileName || "audio";
                      link.click();
                    }}
                    time={msg.time || msg.sentAt}
                    isOwnMessage={msg.from === currentUsername}
                    isRead={msg.isRead}
                    isSent={msg.isSent}
                    readBy={msg.readBy}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : msg.mediaType === "image" && msg.mediaData ? (
                <div className="thread-message-media">
                  <img
                    src={msg.mediaData}
                    alt={msg.fileName || "Imagen"}
                    style={{
                      maxWidth: "180px",
                      maxHeight: "180px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(msg.mediaData, "_blank")}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : msg.mediaType === "video" && msg.mediaData ? (
                <div className="thread-message-media">
                  <video
                    src={msg.mediaData}
                    controls
                    style={{
                      maxWidth: "180px",
                      maxHeight: "180px",
                      borderRadius: "8px",
                    }}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : (msg.mediaType && msg.mediaData) || (msg.fileName && msg.mediaData) ? (
                // 🔥 FALLBACK GENÉRICO MEJORADO: Si tiene mediaData, mostrar como archivo
                <div className="thread-message-media">
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(msg.mediaData, "_blank")}
                  >
                    <span>📎</span>
                    <span style={{ fontSize: "13px" }}>
                      {msg.fileName || "Archivo adjunto"}
                    </span>
                  </div>
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="thread-message-text">
                  {msg.message || msg.text || (
                    <span style={{ fontStyle: 'italic', color: '#888' }}>
                      (Mensaje vacío o archivo no soportado)
                    </span>
                  )}
                </div>
              )}

              {/* 🔥 Read Receipts - Mostrar para TODOS los mensajes si hay lectores */}
              {msg.readBy && msg.readBy.length > 0 && (
                <div className="thread-read-receipts">
                  <div
                    className="thread-read-receipts-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 🔥 Cálculo de posición FIXED (coordenadas absolutas en pantalla)
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Preferimos ARRIBA (top) para no tapar los mensajes siguientes
                      const preferTop = rect.top > 180;
                      const newPosition = preferTop ? 'top' : 'bottom';
                      setPopoverPosition(newPosition);

                      // Calcular coordenadas exactas en la pantalla
                      const coords = {
                        right: window.innerWidth - rect.right,
                        top: preferTop ? rect.top - 12 : rect.bottom + 12
                      };
                      setPopoverCoords(coords);
                      setOpenReadReceiptsId(openReadReceiptsId === msg.id ? null : msg.id);
                    }}
                    title="Ver quién lo ha leído"
                  >
                    {(() => {
                      const MAX_VISIBLE = 3;
                      const totalReaders = msg.readBy.length;
                      const remainingCount = totalReaders - MAX_VISIBLE;
                      const showCounter = remainingCount > 0;
                      const visibleReaders = msg.readBy.slice(0, MAX_VISIBLE);

                      return (
                        <div className="thread-read-avatars">
                          {/* A. BOLITA DE CONTADOR (+N) */}
                          {showCounter && (
                            <div className="thread-read-avatar counter-bubble">
                              +{remainingCount}
                            </div>
                          )}

                          {/* B. AVATARES DE USUARIOS */}
                          {visibleReaders.map((reader, idx) => {
                            const readerUser = roomUsers.find(u =>
                              (u.username || u.nombre) === reader
                            );
                            const readerName = readerUser
                              ? (readerUser.nombre && readerUser.apellido
                                ? `${readerUser.nombre} ${readerUser.apellido}`
                                : readerUser.username || reader)
                              : reader;

                            return (
                              <div
                                key={idx}
                                className="thread-read-avatar"
                                title={`Leído por ${readerName}`}
                              >
                                {readerUser?.picture ? (
                                  <img src={readerUser.picture} alt={readerName} />
                                ) : (
                                  <div className="thread-read-avatar-placeholder">
                                    {readerName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 🔥 POPOVER DE DETALLES */}
                  {openReadReceiptsId === msg.id && (
                    <div
                      className={`thread-read-receipts-popover position-${popoverPosition}`}
                      style={{
                        right: `${popoverCoords.right}px`,
                        top: `${popoverCoords.top}px`,
                        transform: popoverPosition === 'top' ? 'translateY(-100%)' : 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="popover-header">
                        <span>{msg.readBy.length} {msg.readBy.length === 1 ? 'persona' : 'personas'}</span>
                        <button
                          className="popover-close-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenReadReceiptsId(null);
                          }}
                          aria-label="Cerrar"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="popover-list">
                        {msg.readBy.map((reader, idx) => {
                          const readerUser = roomUsers.find(u =>
                            (u.username || u.nombre) === reader
                          );
                          const readerName = readerUser
                            ? (readerUser.nombre && readerUser.apellido
                              ? `${readerUser.nombre} ${readerUser.apellido}`
                              : readerUser.username || reader)
                            : reader;

                          return (
                            <div key={idx} className="popover-item">
                              <div className="popover-avatar">
                                {readerUser?.picture ? (
                                  <img src={readerUser.picture} alt={readerName} />
                                ) : (
                                  <span className="popover-avatar-initial">
                                    {readerName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="popover-info">
                                <div className="popover-name">{readerName}</div>
                                <div className="popover-status">Visto</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🔥 NUEVO: Botón de menú de opciones */}
              <div className="thread-message-actions">
                <button
                  className="thread-message-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id);
                  }}
                  title="Opciones"
                >
                  <FaEllipsisV size={12} />
                </button>

                {/* Menú de opciones */}
                {showMessageMenu === msg.id && (
                  <div className="thread-message-menu" ref={messageMenuRef}>
                    <button
                      className="menu-item"
                      onClick={() => handleCopyText(msg)}
                    >
                      <FaCopy className="menu-icon" /> Copiar texto
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleReplyTo(msg)}
                    >
                      <FaReply className="menu-icon" /> Responder
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleOpenReactionPicker(msg.id)}
                    >
                      <FaSmile className="menu-icon" /> Reaccionar
                    </button>
                    <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
                    <button
                      className="menu-item"
                      onClick={() => handleOpenForwardModal(msg)}
                    >
                      <FaShare className="menu-icon" /> Reenviar
                    </button>
                  </div>
                )}

                {/* 🔥 NUEVO: Picker de reacciones */}
                {showReactionPicker === msg.id && (
                  <div className="thread-reaction-picker" ref={reactionPickerRef}>
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                      <button
                        key={emoji}
                        className="reaction-emoji-btn"
                        onClick={() => handleReaction(msg, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="thread-input-container">
        {/* 🔥 NUEVO: Vista previa de respuesta */}
        {replyingTo && (
          <div className="thread-reply-preview">
            <div className="reply-preview-content">
              <div className="reply-preview-header">
                <FaReply className="reply-icon" />
                <span>Respondiendo a {replyingTo.from || replyingTo.sender}</span>
              </div>
              <div className="reply-preview-text">
                {replyingTo.message || replyingTo.text || replyingTo.fileName || "Archivo adjunto"}
              </div>
            </div>
            <button className="reply-close-btn" onClick={handleCancelReply}>
              <FaTimes />
            </button>
          </div>
        )}
        {/* Vista previa de archivos */}
        {mediaFiles.length > 0 && (
          <div className="thread-media-preview">
            {mediaPreviews.map((preview, index) => {
              const getFileIcon = (type) => {
                switch (type) {
                  case "image":
                    return "🖼️";
                  case "pdf":
                    return "📄";
                  case "video":
                    return "🎥";
                  case "audio":
                    return "🎵";
                  case "document":
                    return "📝";
                  case "spreadsheet":
                    return "📊";
                  default:
                    return "📎";
                }
              };

              return (
                <div key={index} className="thread-media-preview-item">
                  {preview.type === "image" ? (
                    <img
                      src={preview.data}
                      alt={preview.name}
                      className="thread-preview-image"
                    />
                  ) : (
                    <div className="thread-preview-file">
                      <div className="thread-preview-icon">
                        {getFileIcon(preview.type)}
                      </div>
                      <div className="thread-preview-name">{preview.name}</div>
                      <div className="thread-preview-size">
                        {preview.size > 1024 * 1024
                          ? `${(preview.size / 1024 / 1024).toFixed(1)} MB`
                          : `${(preview.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  )}
                  <button
                    className="thread-remove-media-btn"
                    onClick={() => handleRemoveMediaFile(index)}
                    title="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              className="thread-cancel-media-btn"
              onClick={cancelMediaUpload}
            >
              Cancelar
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="thread-emoji-picker" ref={emojiPickerRef}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={280}
              height={350}
            />
          </div>
        )}

        {/* 🔥 NUEVO: Dropdown de sugerencias de menciones */}
        {showMentionSuggestions && filteredMembers.length > 0 && (
          <div className="thread-mention-dropdown" ref={mentionDropdownRef}>
            {filteredMembers.map((user, index) => {
              const username = user.username || user.nombre || '';
              const displayName = user.nombre && user.apellido
                ? `${user.nombre} ${user.apellido}`
                : username;

              return (
                <div
                  key={index}
                  className={`thread-mention-suggestion ${index === selectedMentionIndex ? 'selected' : ''}`}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                >
                  <div className="mention-avatar">
                    {user.picture ? (
                      <img src={user.picture} alt={displayName} />
                    ) : (
                      <div className="mention-avatar-placeholder">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="mention-info">
                    <div className="mention-name">{displayName}</div>
                    {user.role && (
                      <div className="mention-role">{user.role}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="thread-input-wrapper">
          {/* Botón de adjuntar archivos */}
          <label
            className={`thread-attach-btn ${isSending ? "disabled" : ""}`}
            title="Adjuntar archivos"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={isSending}
            />
            <FaPaperclip />
          </label>

          {/* Botón de emoji */}
          <button
            className="thread-emoji-btn"
            onClick={() => !isSending && setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
            disabled={isSending}
          >
            <FaSmile />
          </button>

          <textarea
            ref={inputRef}
            className="thread-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}

            placeholder="Escribe un mensaje"
            rows={1}
            disabled={isSending}
          />

          {/* Botón de grabación de voz */}
          <VoiceRecorder
            onSendAudio={handleSendVoiceMessage}
            canSendMessages={true}
          />

          <button
            className="thread-send-btn"
            onClick={handleSend}
            disabled={(!input.trim() && mediaFiles.length === 0) || isSending}
            title="Enviar"
          >
            {isSending ? (
              <FaSpinner className="thread-spinner" />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </div>

      {/* 🔥 NUEVO: Modal de reenvío */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={handleCloseForwardModal}
        message={messageToForward}
        myActiveRooms={myActiveRooms}
        assignedConversations={assignedConversations}
        user={user}
        socket={socket}
      />
    </div>
  );
};

export default ThreadPanel;
