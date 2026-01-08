import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaTimes,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaSpinner,
  FaEllipsisV, //  NUEVO: Menú de opciones
  FaShare, //  NUEVO: Ícono de reenviar
  FaCopy, //  NUEVO: Ícono de copiar
  FaReply, //  NUEVO: Ícono de responder
  FaPen, //  NUEVO: Ícono de editar
  FaArrowLeft, //  NUEVO: Ícono de atrás
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import apiService from "../../../../apiService";
import AudioPlayer from "../AudioPlayer/AudioPlayer";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";
import ForwardMessageModal from "../ChatContent/ForwardMessageModal"; //  NUEVO: Modal de reenvío
import AttachMenu from "../AttachMenu/AttachMenu"; //  NUEVO: Menú de adjuntar reutilizable
import ImageViewer from "../ChatContent/ImageViewer"; // NUEVO: Visor de imágenes
import MediaPreviewList from '../MediaPreviewList/MediaPreviewList'; // Utilidad reutilizable
import ReactionPicker from '../../../../components/ReactionPicker'; // Componente reutilizable
import AddReactionButton from '../../../../components/AddReactionButton/AddReactionButton'; // Componente reutilizable botón +
import { handleSmartPaste } from "../utils/pasteHandler"; // Utilidad reutilizable

import "./ThreadPanel.css";

// Colores para nombres de usuarios (estilo Slack/Discord)
const USER_NAME_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#FF9800',
  '#FF5722', '#795548', '#607D8B', '#F44336', '#00ACC1',
];

const OWN_USER_COLOR = '#dc2626';

// Función para obtener color consistente basado en el nombre
const getUserNameColor = (name, isOwnMessage = false) => {
  if (isOwnMessage) return OWN_USER_COLOR;
  if (!name) return USER_NAME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_NAME_COLORS[Math.abs(hash) % USER_NAME_COLORS.length];
};

// Función para formatear fecha del separador
const formatDateLabel = (sentAt) => {
  if (!sentAt) return "Hoy";
  const messageDate = sentAt.split("T")[0];
  const now = new Date();
  const todayInPeru = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayInPeru = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  if (messageDate === todayInPeru) return "Hoy";
  if (messageDate === yesterdayInPeru) return "Ayer";

  const date = new Date(sentAt);
  const weekday = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "short" });
  const day = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric" });
  const month = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", month: "short" });
  const year = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", year: "numeric" });
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
  const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
  return `${weekdayCapitalized}, ${day} ${monthCapitalized} ${year}`;
};

// Función para agrupar mensajes por fecha
const groupThreadMessagesByDate = (messages) => {
  const groups = [];
  let currentDateString = null;

  messages.forEach((msg) => {
    const sentAt = msg.sentAt || new Date().toISOString();
    const messageDateString = sentAt.split("T")[0];

    if (currentDateString !== messageDateString) {
      currentDateString = messageDateString;
      groups.push({
        type: "date-separator",
        date: sentAt,
        label: formatDateLabel(sentAt),
      });
    }
    groups.push({ type: "message", ...msg });
  });

  return groups;
};

const ThreadPanel = ({
  isOpen,
  message,
  onClose,
  currentUsername,
  socket,
  onSendMessage,
  currentRoomCode, //  NUEVO: RoomCode actual de la sesión
  roomUsers = [], //  NUEVO: Lista de usuarios en la sala para menciones
  //  NUEVO: Props para modal de reenvío
  myActiveRooms = [],
  assignedConversations = [],
  user,
  onBackToThreadsList, //  NUEVO: Callback para volver a la lista de hilos
}) => {
  // if (!isOpen) return null; //  MOVIDO AL FINAL PARA RESPETAR REGLAS DE HOOKS
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
  //  NUEVO: Estado para menciones
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const messageMenuRef = useRef(null); //  NUEVO: Ref para menú de opciones
  const reactionPickerRef = useRef(null); //  NUEVO: Ref para picker de reacciones

  //  NUEVOS ESTADOS - Menú de opciones y reenvío
  const [showMessageMenu, setShowMessageMenu] = useState(null); // ID del mensaje con menú abierto
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null); // ID del mensaje con picker abierto
  const [replyingTo, setReplyingTo] = useState(null); // Mensaje al que se responde
  const [openReadReceiptsId, setOpenReadReceiptsId] = useState(null); //  NUEVO: ID del mensaje con popover de leídos abierto
  const [popoverPosition, setPopoverPosition] = useState('top'); // 'top' | 'bottom'
  const [popoverCoords, setPopoverCoords] = useState({ right: 0, top: 0 }); //  Coordenadas exactas para position: fixed

  //  NUEVO: Estados para edición de mensajes
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  // NUEVO: Estado para el visor de imágenes
  const [imagePreview, setImagePreview] = useState(null);

  //  NUEVO: Función para renderizar texto con menciones resaltadas (igual que ChatContent)
  const renderTextWithMentions = (text) => {
    if (!text) return text;

    // Obtener lista de usuarios válidos normalizada (sin acentos, mayúsculas)
    const normalizeText = (str) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    const validUsers = roomUsers
      ? roomUsers.map((user) => {
        if (typeof user === "string") return normalizeText(user);
        return normalizeText(user.username || user.nombre || "");
      })
      : [];

    // Regex mejorado: @ seguido de cualquier caracter de palabra (incluye acentos)
    const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Verificar si es parte de un email
      const charBeforeMention = match.index > 0 ? text[match.index - 1] : "";
      const isPartOfEmail = /[a-zA-Z0-9._-]/.test(charBeforeMention);

      // Verificar si después del @ hay un dominio de email común
      const mentionedText = match[1].toLowerCase().trim();
      const emailDomains = [
        "gmail", "outlook", "hotmail", "yahoo", "icloud",
        "live", "msn", "aol", "protonmail", "zoho",
      ];
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
      const normalizedMention = normalizeText(mentionedUser);

      const isValidUser = validUsers.some(
        (validUser) =>
          validUser === normalizedMention ||
          validUser.includes(normalizedMention) ||
          normalizedMention.includes(validUser)
      );

      // Solo resaltar si es un usuario válido
      if (isValidUser) {
        const isCurrentUser =
          normalizedMention === normalizeText(currentUsername || "");

        parts.push(
          <span
            key={match.index}
            className={`mention-span ${isCurrentUser ? 'mention-me' : 'mention-other'}`}
            style={{
              display: "inline",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: "500",
              fontSize: "0.95em",
              cursor: "pointer",
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

  // Cargar mensajes del hilo


  // Actualizar el contador cuando cambia el mensaje
  useEffect(() => {
    setCurrentThreadCount(message?.threadCount || 0);
  }, [message?.threadCount]);

  // Scroll automático al final
  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  //  NUEVO: Handler global de tecla Escape para cerrar ThreadPanel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        // Si hay algún menú o picker abierto, cerrar ese primero
        if (imagePreview) {
          setImagePreview(null);
          event.stopPropagation();
          return;
        }
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          event.stopPropagation();
          return;
        }
        if (showMessageMenu) {
          setShowMessageMenu(null);
          event.stopPropagation();
          return;
        }
        if (showReactionPicker) {
          setShowReactionPicker(null);
          event.stopPropagation();
          return;
        }
        if (editingMessageId) {
          handleCancelEdit();
          event.stopPropagation();
          return;
        }
        // Si no hay nada más abierto, cerrar el ThreadPanel
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey, true); // capture phase
    return () => document.removeEventListener('keydown', handleEscapeKey, true);
  }, [isOpen, onClose, showEmojiPicker, showMessageMenu, showReactionPicker, editingMessageId]);

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

      // Asegurar comparación laxa por si uno es string y otro number
      if (String(newMessage.threadId) === String(message?.id)) {
        setThreadMessages((prev) => {
          // Verificar si ya existe (por ID real)
          const messageExists = prev.some((msg) => msg.id === newMessage.id && !String(msg.id).startsWith('temp_'));

          if (messageExists) {
            console.log('⏭️ Mensaje ya existe, ignorando');
            return prev;
          }

          // 🚀 Buscar y reemplazar mensaje temporal del mismo usuario EN ESTE HILO
          // (el más reciente con ID temporal que coincida en threadId, texto/from)
          const tempIndex = prev.findIndex(msg =>
            String(msg.id).startsWith('temp_') &&
            msg.from === newMessage.from &&
            String(msg.threadId) === String(newMessage.threadId) && // 🔧 FIX: Verificar que sea del mismo hilo
            (msg.text === newMessage.text || msg.message === newMessage.message || msg.text === newMessage.message)
          );

          if (tempIndex !== -1) {
            // Reemplazar mensaje temporal con el real
            console.log('🔄 Reemplazando mensaje temporal con real:', newMessage.id);
            const updated = [...prev];
            updated[tempIndex] = newMessage;
            return updated;
          }

          // Si no hay temporal, agregar al final
          console.log('✅ Agregando nuevo mensaje al hilo:', newMessage.id);
          return [...prev, newMessage];
        });
      }
    };

    const handleThreadCountUpdated = (data) => {
      console.log('🔢 ThreadPanel evento threadCountUpdated:', data);
      //  FIX: NO incrementamos el contador aquí porque:
      // 1. El contador real se basa en threadMessages.length
      // 2. useSocketListeners ya maneja el contador del mensaje padre
      // Solo logueamos para debugging
      if (String(data.messageId) === String(message?.id)) {
        console.log(`🔢 ThreadPanel: recibido update para nuestro hilo ${data.messageId}, ignorando incremento duplicado`);
      }
    };

    //  NUEVO: Handler para actualizar reacciones en mensajes del hilo
    const handleReactionUpdated = (data) => {
      console.log('👍 ThreadPanel evento reactionUpdated:', data);
      setThreadMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    };

    // 🚀 NUEVO: Handler para actualizaciones de lectura
    const handleMessageRead = (data) => {
      // console.log('👀 ThreadPanel messageRead:', data);
      setThreadMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, isRead: true, readBy: data.readBy, readAt: data.readAt }
          : msg
      ));
    };

    socket.on("threadMessage", handleThreadMessage);
    socket.on("threadCountUpdated", handleThreadCountUpdated);
    socket.on("reactionUpdated", handleReactionUpdated);
    socket.on("messageRead", handleMessageRead);

    return () => {
      socket.off("threadMessage", handleThreadMessage);
      socket.off("threadCountUpdated", handleThreadCountUpdated);
      socket.off("reactionUpdated", handleReactionUpdated);
      socket.off("messageRead", handleMessageRead);
    };
  }, [socket, message?.id, currentUsername]);


  // 🔥 Estado para mensajes del hilo
  const [totalThreadMessages, setTotalThreadMessages] = useState(0);

  const loadThreadMessages = useCallback(async () => {
    // Validar que message.id sea un ID válido
    const threadId = message?.id;
    if (!threadId || isNaN(Number(threadId)) || String(threadId).startsWith('temp_')) {
      console.warn('⚠️ ThreadPanel: ID de hilo inválido:', threadId);
      return;
    }
    setLoading(true);
    try {
      // 🔥 Carga hasta 100 mensajes del hilo
      const response = await apiService.getThreadMessages(threadId, 100, 0, 'DESC');
      const messages = response.data || response;
      const total = response.total ?? messages.length;

      setThreadMessages(messages);
      setTotalThreadMessages(total);
      setCurrentThreadCount(total);
    } catch (error) {
      console.error("Error al cargar mensajes del hilo:", error);
    } finally {
      setLoading(false);
    }
  }, [message?.id]);

  // useEffect para cargar mensajes cuando se abre el hilo
  useEffect(() => {
    if (message?.id) {
      // Limpiar estado para el nuevo hilo
      setThreadMessages([]);
      setTotalThreadMessages(0);
      loadThreadMessages();
    }
  }, [message?.id]); // Solo depender de message.id, no de loadThreadMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  //  NUEVO: Marcar mensajes como leídos al cargar el hilo
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
      //  Límite actualizado a 70MB
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

    // Guardar valores antes de limpiar
    const currentInput = input;
    const currentMediaFiles = [...mediaFiles];
    const currentReplyingTo = replyingTo;

    // 🚀 Limpiar estado INMEDIATAMENTE para UX rápida
    setInput("");
    setMediaFiles([]);
    setMediaPreviews([]);
    setReplyingTo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsSending(true);
    try {
      // Helper para determinar tipo de medio
      const getMediaType = (file) => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type === 'application/pdf') return 'pdf';
        return 'file';
      };

      // Construir datos de respuesta si existen
      const replyData = currentReplyingTo ? {
        replyToMessageId: currentReplyingTo.id,
        replyToSender: currentReplyingTo.from || currentReplyingTo.sender,
        replyToText: currentReplyingTo.message || currentReplyingTo.text || currentReplyingTo.fileName || "Archivo adjunto",
      } : {};

      // Datos base del mensaje
      // Para grupos: usar receiver o to del mensaje, o el roomCode como fallback
      const toValue = message.isGroup
        ? (message.receiver || message.to || currentRoomCode)
        : (message.realSender === currentUsername ? message.receiver : message.realSender);

      // Usar roomCode del mensaje si existe, sino usar currentRoomCode
      const roomCodeValue = message.isGroup ? (message.roomCode || currentRoomCode) : undefined;

      const baseMessageData = {
        threadId: Number(message.id), // Asegurar que sea número
        from: currentUsername,
        to: toValue,
        isGroup: message.isGroup,
        roomCode: roomCodeValue,
        ...replyData,
      };

      console.log('📤 ThreadPanel enviando mensaje:', baseMessageData);

      // 1. Si hay archivos, enviarlos uno por uno
      if (currentMediaFiles.length > 0) {
        for (let i = 0; i < currentMediaFiles.length; i++) {
          const file = currentMediaFiles[i];
          const mediaType = getMediaType(file);

          // Subir archivo primero
          const uploadResult = await apiService.uploadFile(file, "chat");

          // Construir mensaje
          const messageData = {
            text: i === 0 ? currentInput : "",
            ...baseMessageData,
            mediaType: mediaType,
            mediaData: uploadResult.fileUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
          };

          // 🚀 OPTIMISTIC UPDATE: Agregar inmediatamente con ID temporal
          const tempId = `temp_${Date.now()}_${i}`;
          setThreadMessages(prev => [...prev, {
            ...messageData,
            id: tempId,
            message: messageData.text,
            sentAt: new Date().toISOString(),
          }]);

          // Enviar (no esperar - fire and forget)
          onSendMessage(messageData);
        }
      } else {
        // 2. Si solo es texto
        const messageData = {
          text: currentInput,
          ...baseMessageData,
        };

        // 🚀 OPTIMISTIC UPDATE: Agregar inmediatamente con ID temporal
        const tempId = `temp_${Date.now()}`;
        setThreadMessages(prev => [...prev, {
          ...messageData,
          id: tempId,
          message: currentInput,
          sentAt: new Date().toISOString(),
        }]);

        // Enviar (no esperar - fire and forget)
        onSendMessage(messageData);
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

      // Para grupos: usar receiver o to del mensaje, o el roomCode como fallback
      const toValue = message.isGroup
        ? (message.receiver || message.to || currentRoomCode)
        : (message.realSender === currentUsername ? message.receiver : message.realSender);

      const roomCodeValue = message.isGroup ? (message.roomCode || currentRoomCode) : undefined;

      const messageData = {
        text: "",
        threadId: Number(message.id), // Asegurar que sea número
        from: currentUsername,
        to: toValue,
        isGroup: message.isGroup,
        roomCode: roomCodeValue,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      };
      //  CONFIAR EN EL BACKEND - NO agregar nada localmente
      // El socket devolverá el mensaje con threadMessage

      await onSendMessage(messageData);
    } catch (error) {
      console.error("Error al enviar audio en hilo:", error);
      alert("Error al enviar el audio. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  //  NUEVO: Handler para detectar menciones en el input
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
        let searchName = '';
        if (typeof user === "string") {
          searchName = user;
        } else if (user && typeof user === 'object') {
          // Prioridad: displayName > nombre+apellido > username > nombre
          searchName = user.displayName
            || ((user.nombre && user.apellido) ? `${user.nombre} ${user.apellido}` : '')
            || user.username
            || user.nombre
            || '';
        }
        return searchName.toLowerCase().includes(searchTerm) && searchName !== currentUsername;
      });

      setFilteredMembers(filtered);
      setShowMentionSuggestions(filtered.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  //  NUEVO: Handler de paste para imágenes
  //  NUEVO: Handler de paste inteligente
  const handlePaste = async (e) => {
    // Usar la utilidad inteligente (fix Excel)
    // El 2do argumento debe simular el evento {target: {files}} para processFiles
    // processFiles espera un array directamente, así que adaptamos
    handleSmartPaste(e, (simulatedEvent) => {
      const files = simulatedEvent.target.files;
      if (files && files.length > 0) {
        processFiles(Array.isArray(files) ? files : Array.from(files));
      }
    }, null); // No necesitamos setInput
  };

  //  NUEVO: Insertar mención seleccionada
  const insertMention = (user) => {
    let username = '';
    if (typeof user === "string") {
      username = user;
    } else if (user && typeof user === 'object') {
      username = user.username
        || user.displayName
        || ((user.nombre && user.apellido) ? `${user.nombre} ${user.apellido}` : '')
        || user.nombre
        || '';
    }
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


  //  NUEVO: Listener global para pegar imágenes (evitando duplicados en input)
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
    //  NUEVO: Navegación en dropdown de menciones
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
    // Si hay un mensaje pendiente para reaccionar (viene del botón "+")
    if (window.currentReactionMessage) {
      handleReaction(window.currentReactionMessage, emojiData.emoji);
      window.currentReactionMessage = null;
      setShowEmojiPicker(false);
      return;
    }
    // Caso normal: agregar emoji al input
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  //  NUEVOS HANDLERS - Forward Modal
  const handleOpenForwardModal = (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowMessageMenu(null);
  };

  const handleCloseForwardModal = () => {
    setShowForwardModal(false);
    setMessageToForward(null);
  };

  //  NUEVO: Copiar texto del mensaje
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

  //  NUEVO: Abrir picker de reacciones
  const handleOpenReactionPicker = (messageId) => {
    setShowReactionPicker(messageId);
    setShowMessageMenu(null);
  };

  //  NUEVO: Reaccionar a mensaje
  const handleReaction = (msg, emoji) => {
    if (!socket || !socket.connected || !currentUsername) {
      console.warn('Socket no conectado o usuario no identificado');
      return;
    }

    //  FIX: Usar 'toggleReaction' como en ChatContent
    socket.emit("toggleReaction", {
      messageId: msg.id,
      username: currentUsername,
      emoji: emoji,
      roomCode: currentRoomCode, //  Incluir roomCode para hilos de grupo
    });

    setShowReactionPicker(null);
  };

  //  NUEVO: Handlers para edición de mensajes
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message || msg.text || "");
    setShowMessageMenu(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMessageId) return;

    try {
      const result = await apiService.editMessage(editingMessageId, currentUsername, editText);
      if (result && result.success) {
        // Actualizar el mensaje en el estado local
        setThreadMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId
              ? { ...msg, message: editText, text: editText, isEdited: true }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error al editar mensaje:", error);
    } finally {
      setEditingMessageId(null);
      setEditText("");
    }
  };

  //  NUEVO: Responder a mensaje
  const handleReplyTo = (message) => {
    setReplyingTo(message);
    setShowMessageMenu(null);
    inputRef.current?.focus();
  };

  //  NUEVO: Cancelar respuesta
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // NUEVO: Manejar clic en imagen
  const handleImageClick = (url, fileName) => {
    setImagePreview({ url, fileName });
  };

  // NUEVO: Cerrar visor de imágenes
  const handleCloseImageViewer = () => {
    setImagePreview(null);
  };

  // NUEVO: Función de descarga robusta (igual que ChatContent)
  const handleDownload = async (url, fileName) => {
    if (!url) return;

    try {
      // 1. Intentamos descargar como Blob para forzar la descarga directa
      const response = await apiService.fetchWithAuth(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "archivo";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar memoria
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error al descargar blob, intentando método alternativo:", error);

      // 2. Fallback: Método clásico (si fetch falla por CORS, por ejemplo)
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "archivo";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const formatTime = (msg) => {
    if (!msg) return "";

    //  IMPORTANTE: Si el mensaje tiene 'time' ya formateado, usarlo directamente
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

  //  NUEVO: Cerrar menú y picker de reacciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cerrar menú si se hace clic fuera
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setShowMessageMenu(null);
      }
      //  FIX: Cerrar picker solo si NO estamos clickeando en el menú NI en el picker
      // Esto evita que el picker se cierre inmediatamente al hacer clic en "Reaccionar"
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target) &&
        (!messageMenuRef.current || !messageMenuRef.current.contains(event.target))
      ) {
        setShowReactionPicker(null);
      }
      //  Cerrar popover de leídos si se hace clic fuera
      if (!event.target.closest('.thread-read-receipts-popover') && !event.target.closest('.thread-read-receipts-trigger')) {
        setOpenReadReceiptsId(null);
      }
    };

    if (showMessageMenu || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMessageMenu, showReactionPicker]);

  //  NUEVO: Handler de paste para el contenedor (reemplaza al useEffect)
  const handleContainerPaste = (e) => {
    const target = e.target;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // Si estamos en un input/textarea, NO hacer nada aquí (ya tienen su propio comportamiento)
    if (isInInput) return;

    handlePaste(e);
  };

  //  Limpiar estado al cerrar el panel
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
      onPaste={handleContainerPaste} //  NUEVO: Paste handler en el div
    >
      {/* Renderizar Image Viewer si hay una imagen seleccionada */}
      {imagePreview && (
        <ImageViewer
          imagePreview={imagePreview}
          onClose={handleCloseImageViewer}
          onDownload={handleDownload}
        />
      )}
      {isDragging && (
        <div className="thread-drag-overlay">
          <div className="thread-drag-content">
            <FaPaperclip size={50} />
            <h3>Suelta los archivos aquí</h3>
          </div>
        </div>
      )}
      <div className="thread-panel-header">
        {onBackToThreadsList && (
          <button className="thread-back-btn" onClick={onBackToThreadsList} title="Volver a lista de hilos">
            <FaArrowLeft />
          </button>
        )}
        <div className="thread-panel-title">
          <span>Hilo</span>
        </div>
        <button className="thread-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="thread-main-message">
        <div className="thread-main-message-header">
          <strong style={{ color: getUserNameColor(message.from, message.from === currentUsername) }}>
            {message.from}
          </strong>
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
              onClick={() => handleImageClick(message.mediaData, message.fileName || "Imagen")}
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
          <div className="thread-main-message-text">
            {message.text}
          </div>
        )}

        <div className="thread-replies-count">
          {threadMessages.length}{" "}
          {threadMessages.length === 1 ? "respuesta" : "respuestas"}
        </div>
      </div>

      <div className="thread-messages">
        {loading && threadMessages.length === 0 ? (
          <div className="thread-loading">Cargando mensajes...</div>
        ) : threadMessages.length === 0 ? (
          <div className="thread-empty">
            <p>Sé el primero en responder en este hilo</p>
          </div>
        ) : (
          <>
            {groupThreadMessagesByDate(threadMessages).map((item, index) => {
              // Separador de fecha
              if (item.type === "date-separator") {
                return (
                  <div key={`date-${index}`} className="thread-date-separator">
                    <div className="thread-date-separator-content">{item.label}</div>
                  </div>
                );
              }

              // Mensaje normal
              const msg = item;
              const isOwnMessage = msg.from === currentUsername;
              const userColor = getUserNameColor(msg.from, isOwnMessage);
              const senderPicture = roomUsers.find(u => u.username === msg.from || `${u.nombre} ${u.apellido}` === msg.from)?.picture;

              return (
                <div
                  key={msg.id || index}
                  className={`thread-message ${isOwnMessage ? "thread-message-own" : "thread-message-other"}`}
                >
                  {/* Avatar */}
                  <div
                    className="thread-message-avatar"
                    style={{
                      background: senderPicture
                        ? `url(${senderPicture}) center/cover no-repeat`
                        : userColor,
                    }}
                  >
                    {!senderPicture && (msg.from?.[0]?.toUpperCase() || '?')}
                  </div>

                  <div className="thread-message-content">
                    <div className="thread-message-header">
                      <strong style={{ color: userColor }}>{msg.from}</strong>
                      <span className="thread-message-time">{formatTime(msg)}</span>
                    </div>

                    {/*  NUEVO: Mostrar referencia de respuesta si existe */}
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
                          onDownload={handleDownload}
                          time={msg.time || msg.sentAt}
                          isOwnMessage={msg.from === currentUsername}
                          isRead={msg.isRead}
                          isSent={msg.isSent}
                          readBy={msg.readBy}
                        />
                        {msg.message && (
                          <div className="thread-message-text">
                            {renderTextWithMentions(msg.message || msg.text)}
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
                          onClick={() => handleImageClick(msg.mediaData, msg.fileName || "Imagen")}
                        />
                        {msg.message && (
                          <div className="thread-message-text">
                            {renderTextWithMentions(msg.message || msg.text)}
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
                            {renderTextWithMentions(msg.message || msg.text)}
                          </div>
                        )}
                      </div>
                    ) : (msg.mediaType && msg.mediaData) || (msg.fileName && msg.mediaData) ? (
                      //  FALLBACK GENÉRICO MEJORADO: Si tiene mediaData, mostrar como archivo
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
                            {renderTextWithMentions(msg.message || msg.text)}
                          </div>
                        )}
                      </div>
                    ) : (
                      //  EDIT MODE: Si estamos editando este mensaje, mostrar input
                      editingMessageId === msg.id ? (
                        <div className="thread-message-edit-mode">
                          <textarea
                            className="thread-edit-input"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                            rows={2}
                          />
                          <div className="thread-edit-actions">
                            <button className="thread-edit-cancel" onClick={handleCancelEdit}>
                              Cancelar
                            </button>
                            <button className="thread-edit-save" onClick={handleSaveEdit} disabled={!editText.trim()}>
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="thread-message-text">
                          {msg.message || msg.text ? (
                            <>
                              {renderTextWithMentions(msg.message || msg.text)}
                              {msg.isEdited && <span className="thread-edited-label">(editado)</span>}
                            </>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: '#888' }}>
                              (Mensaje vacío o archivo no soportado)
                            </span>
                          )}
                        </div>
                      )
                    )}

                    {/*  NUEVO: Mostrar reacciones (igual que en ChatContent) */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="thread-reactions-row" style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {Object.entries(msg.reactions.reduce((acc, r) => {
                          if (!acc[r.emoji]) acc[r.emoji] = [];
                          acc[r.emoji].push(r.username);
                          return acc;
                        }, {})).map(([emoji, users]) => (
                          <div
                            key={emoji}
                            className="reaction-pill"
                            onClick={() => handleReaction(msg, emoji)}
                            title={users.join(', ')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              backgroundColor: '#ffffff',
                              border: '1px solid #d1d7db',
                              boxShadow: '0 1px 1px rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            <span style={{ fontSize: '14px' }}>{emoji}</span>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '2px', color: '#54656f' }}>{users.length}</span>
                          </div>
                        ))}
                        {/* Botón "+" para agregar más reacciones (Abre directo el picker completo) */}
                        <AddReactionButton
                          onClick={() => {
                            // Abrir directamente el picker global
                            setShowEmojiPicker(true);
                            window.currentReactionMessage = msg;
                          }}
                        />
                      </div>
                    )}

                    {/*  Read Receipts - Mostrar para TODOS los mensajes si hay lectores */}
                    {msg.readBy && msg.readBy.length > 0 && (
                      <div className="thread-read-receipts">
                        <div
                          className="thread-read-receipts-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            //  Cálculo de posición FIXED (coordenadas absolutas en pantalla)
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

                        {/*  POPOVER DE DETALLES */}
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

                    {/* Toolbar de acciones del mensaje (estilo ChatContent) */}
                    <div className="thread-message-actions">
                      {/* 1. Botón de Reaccionar (Smile) - Acceso directo */}
                      <div style={{ position: 'relative' }}>
                        <button
                          className="thread-message-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id);
                            setShowMessageMenu(null);
                          }}
                          title="Reaccionar"
                        >
                          <FaSmile size={12} />
                        </button>

                        {/* Picker de reacciones rápidas (Componente Reutilizable) */}
                        <ReactionPicker
                          isOpen={showReactionPicker === msg.id}
                          onClose={() => setShowReactionPicker(null)}
                          onSelectEmoji={(emoji) => handleReaction(msg, emoji)}
                          onOpenFullPicker={() => {
                            setShowReactionPicker(null);
                            setShowEmojiPicker(true);
                            window.currentReactionMessage = msg;
                          }}
                          position="left"
                        />
                      </div>

                      {/* 2. Botón de Responder */}
                      <button
                        className="thread-message-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyTo(msg);
                        }}
                        title="Responder"
                      >
                        <FaReply size={12} />
                      </button>

                      {/* 3. Botón de menú (3 puntos) */}
                      <button
                        className="thread-message-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id);
                          setShowReactionPicker(null);
                        }}
                        title="Más opciones"
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
                          {/* Botón de editar - solo para mensajes propios */}
                          {msg.from === currentUsername && (
                            <button
                              className="menu-item"
                              onClick={() => handleStartEdit(msg)}
                            >
                              <FaPen className="menu-icon" /> Editar
                            </button>
                          )}
                          <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
                          <button
                            className="menu-item"
                            onClick={() => handleOpenForwardModal(msg)}
                          >
                            <FaShare className="menu-icon" /> Reenviar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="thread-input-container">
        {/*  NUEVO: Vista previa de respuesta */}
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
          <MediaPreviewList
            previews={mediaPreviews}
            onRemove={handleRemoveMediaFile}
            onCancel={cancelMediaUpload}
          />
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

        {/*  NUEVO: Dropdown de sugerencias de menciones */}
        {showMentionSuggestions && filteredMembers.length > 0 && (
          <div className="thread-mention-dropdown" ref={mentionDropdownRef}>
            {filteredMembers.map((user, index) => {
              let displayName = '';
              if (typeof user === "string") {
                displayName = user;
              } else if (user && typeof user === 'object') {
                displayName = user.displayName
                  || ((user.nombre && user.apellido) ? `${user.nombre} ${user.apellido}` : '')
                  || user.username
                  || user.nombre
                  || '';
              }

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
          {/* Menú de adjuntar reutilizable (estilo WhatsApp) */}
          <AttachMenu onFileSelect={processFiles} disabled={isSending} />

          {/* Botón de emoji - SVG igual que ChatContent */}
          <button
            className="thread-emoji-btn"
            onClick={() => !isSending && setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
            disabled={isSending}
          >
            <svg
              viewBox="0 0 24 24"
              height="24"
              width="24"
              preserveAspectRatio="xMidYMid meet"
              className="thread-emoji-icon"
              fill="none"
            >
              <path
                d="M8.49893 10.2521C9.32736 10.2521 9.99893 9.5805 9.99893 8.75208C9.99893 7.92365 9.32736 7.25208 8.49893 7.25208C7.6705 7.25208 6.99893 7.92365 6.99893 8.75208C6.99893 9.5805 7.6705 10.2521 8.49893 10.2521Z"
                fill="currentColor"
              />
              <path
                d="M17.0011 8.75208C17.0011 9.5805 16.3295 10.2521 15.5011 10.2521C14.6726 10.2521 14.0011 9.5805 14.0011 8.75208C14.0011 7.92365 14.6726 7.25208 15.5011 7.25208C16.3295 7.25208 17.0011 7.92365 17.0011 8.75208Z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.8221 19.9799C15.5379 21.2537 13.8087 21.9781 12 22H9.27273C5.25611 22 2 18.7439 2 14.7273V9.27273C2 5.25611 5.25611 2 9.27273 2H14.7273C18.7439 2 22 5.25611 22 9.27273V11.8141C22 13.7532 21.2256 15.612 19.8489 16.9776L16.8221 19.9799ZM14.7273 4H9.27273C6.36068 4 4 6.36068 4 9.27273V14.7273C4 17.6393 6.36068 20 9.27273 20H11.3331C11.722 19.8971 12.0081 19.5417 12.0058 19.1204L11.9935 16.8564C11.9933 16.8201 11.9935 16.784 11.9941 16.7479C11.0454 16.7473 10.159 16.514 9.33502 16.0479C8.51002 15.5812 7.84752 14.9479 7.34752 14.1479C7.24752 13.9479 7.25585 13.7479 7.37252 13.5479C7.48919 13.3479 7.66419 13.2479 7.89752 13.2479L13.5939 13.2479C14.4494 12.481 15.5811 12.016 16.8216 12.0208L19.0806 12.0296C19.5817 12.0315 19.9889 11.6259 19.9889 11.1248V9.07648H19.9964C19.8932 6.25535 17.5736 4 14.7273 4ZM14.0057 19.1095C14.0066 19.2605 13.9959 19.4089 13.9744 19.5537C14.5044 19.3124 14.9926 18.9776 15.4136 18.5599L18.4405 15.5576C18.8989 15.1029 19.2653 14.5726 19.5274 13.996C19.3793 14.0187 19.2275 14.0301 19.0729 14.0295L16.8138 14.0208C15.252 14.0147 13.985 15.2837 13.9935 16.8455L14.0057 19.1095Z"
                fill="currentColor"
              />
            </svg>
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

          {/* Botón de grabación de voz O enviar (estilo WhatsApp) */}
          {(!input.trim() && mediaFiles.length === 0) ? (
            /* MICRÓFONO - cuando no hay texto */
            <VoiceRecorder
              onSendAudio={handleSendVoiceMessage}
              canSendMessages={!isSending}
            />
          ) : (
            /* BOTÓN ENVIAR - cuando hay texto o archivos */
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
          )}
        </div>
      </div>

      {/*  NUEVO: Modal de reenvío */}
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
