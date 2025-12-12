import { useEffect, useRef, useState, useLayoutEffect } from "react";
import {
  FaPaperPlane,
  FaEdit,
  FaTimes,
  FaReply,
  FaSmile,
  FaInfoCircle,
  FaComments,
  FaTrash,
  FaChevronDown,
  FaCopy,
  FaThumbtack,
  FaDownload,
  FaChevronRight,
  FaShare, // 🔥 NUEVO: Ícono para reenviar
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import LoadMoreMessages from "../LoadMoreMessages/LoadMoreMessages";
import WelcomeScreen from "../WelcomeScreen/WelcomeScreen";
import AudioPlayer from "../AudioPlayer/AudioPlayer";
import ImageViewer from "./ImageViewer";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";
import PollMessage from "../PollMessage/PollMessage";
import CopyOptions from "./CopyOptions/CopyOptions";
import MessageSelectionManager from "./MessageSelectionManager/MessageSelectionManager";
import ForwardMessageModal from "./ForwardMessageModal"; // 🔥 NUEVO: Modal de reenvío
import PDFViewer from '../../../../components/PDFViewer/PDFViewer'; // Importar el visor de PDF
import apiService from '../../../../apiService'; // 🔥 NUEVO: Para cargar datos de paginación

import "./ChatContent.css";

// Función para formatear tiempo
const formatTime = (time) => {
  if (!time) return "";

  // Si ya es una cadena de tiempo formateada (HH:MM), devolverla tal como está
  if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  // Si es un objeto Date o timestamp, formatear
  try {
    const date = new Date(time);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return time.toString();
  }
};

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
);

// Función para determinar el sufijo (Número de Agente o Rol)
// Se asume que el objeto 'message' tiene las propiedades 'senderNumeroAgente' y 'senderRole'.
const getSenderSuffix = (message) => {
  // Buscar el número de agente en diferentes propiedades posibles
  const agentNumber = message.senderNumeroAgente || message.agentNumber;
  const role = message.senderRole;

  // Construir el sufijo con role y número de agente
  const parts = [];

  if (role && String(role).trim()) {
    parts.push(String(role).trim());
  }

  if (agentNumber && String(agentNumber).trim()) {
    parts.push(`N.º ${String(agentNumber).trim()}`);
  }

  // Si hay partes, unirlas con " • "
  if (parts.length > 0) {
    return ` • ${parts.join(" • ")}`;
  }

  // Predeterminado: Ninguno
  return "";
};
const ChatContent = ({
  // Props de mensajes
  messages,
  highlightMessageId,
  onMessageHighlighted,
  replyingTo,
  onCancelReply,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  pinnedMessageId,
  pinnedMessage,

  // Props de input/envío
  input,
  setInput,
  onSendMessage,
  onFileSelect,
  onSendVoiceMessage,
  mediaFiles,
  mediaPreviews,
  onCancelMediaUpload,
  onRemoveMediaFile,

  // Props de estado de carga/envío
  isRecording,
  isLoadingMessages,
  isLoadingMore,
  isUploadingFile,
  isSending,
  hasMoreMessages,
  onLoadMoreMessages,

  // Props de usuario/sala
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  currentUsername,
  user,
  socket,
  canSendMessages = true,
  isAdmin = false,

  // Props de typing
  isOtherUserTyping,
  typingUser,
  roomTypingUsers,

  // 🔥 NUEVO: Props para modal de reenvío
  myActiveRooms = [],
  assignedConversations = [],
}) => {
  // ============================================================
  // REFS
  // ============================================================
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const messageMenuRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================================
  // ESTADOS - Edición de mensajes
  // ============================================================
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // ============================================================
  // ESTADOS - UI/Interacción
  // ============================================================
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isRecordingLocal, setIsRecordingLocal] = useState(false);

  // ============================================================
  // ESTADOS - Pickers y menús
  // ============================================================
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showMessageInfo, setShowMessageInfo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [openReadReceiptsId, setOpenReadReceiptsId] = useState(null);

  // ============================================================
  // ESTADOS - Menciones (@)
  // ============================================================
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);

  // ============================================================
  // ESTADOS - Selección múltiple
  // ============================================================
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);

  // 🔥 NUEVOS ESTADOS - Modal de reenvío
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfData, setPdfData] = useState(null); // Cambiar a pdfData (ArrayBuffer)

  // 🔥 PAGINACIÓN - Modal de reenvío
  const [forwardRoomsPage, setForwardRoomsPage] = useState(1);
  const [forwardRoomsTotalPages, setForwardRoomsTotalPages] = useState(1);
  const [forwardRoomsLoading, setForwardRoomsLoading] = useState(false);
  const [forwardConvsPage, setForwardConvsPage] = useState(1);
  const [forwardConvsTotalPages, setForwardConvsTotalPages] = useState(1);
  const [forwardConvsLoading, setForwardConvsLoading] = useState(false);
  const [extendedRooms, setExtendedRooms] = useState([]);
  const [extendedConvs, setExtendedConvs] = useState([]);

  // ============================================================
  // HANDLERS - Selección múltiple de mensajes
  // ============================================================
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedMessages([]);
    setShowMessageMenu(null);
  };

  const handleToggleMessageSelection = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleCopyList = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  // 🔥 NUEVO HANDLER - Abrir modal de reenvío
  const handleOpenForwardModal = async (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowMessageMenu(null);

    // Inicializar listas extendidas con los datos actuales
    setExtendedRooms(myActiveRooms);
    setExtendedConvs(assignedConversations);
    setForwardRoomsPage(1);
    setForwardConvsPage(1);

    // 🔥 NUEVO: Obtener totales reales del backend
    try {
      const isPrivileged = user?.role === 'ADMIN' || user?.role === 'JEFEPISO' ||
        user?.role === 'PROGRAMADOR' || user?.role === 'SUPERADMIN';

      // Obtener total de grupos
      if (isPrivileged) {
        const roomsResult = await apiService.getAdminRooms(1, 50, '');
        setForwardRoomsTotalPages(roomsResult.totalPages || 1);
        console.log('📊 Total páginas de grupos:', roomsResult.totalPages);
      } else {
        const roomsResult = await apiService.getUserRoomsPaginated(1, 50);
        setForwardRoomsTotalPages(roomsResult.totalPages || 1);
        console.log('📊 Total páginas de grupos:', roomsResult.totalPages);
      }

      // Obtener total de conversaciones
      const convsResult = await apiService.getAssignedConversationsPaginated(1, 50);
      setForwardConvsTotalPages(convsResult.totalPages || 1);
      console.log('📊 Total páginas de conversaciones:', convsResult.totalPages);
    } catch (error) {
      console.error('Error al obtener totales de paginación:', error);
    }
  };

  // 🔥 NUEVO HANDLER - Cerrar modal de reenvío
  const handleCloseForwardModal = () => {
    setShowForwardModal(false);
    setMessageToForward(null);
    // Limpiar estados de paginación
    setExtendedRooms([]);
    setExtendedConvs([]);
    setForwardRoomsPage(1);
    setForwardConvsPage(1);
  };

  // 🔥 NUEVO - Cargar más grupos para modal de reenvío
  const handleLoadMoreForwardRooms = async () => {
    if (forwardRoomsLoading || forwardRoomsPage >= forwardRoomsTotalPages) return;

    setForwardRoomsLoading(true);
    try {
      const nextPage = forwardRoomsPage + 1;
      const isPrivileged = user?.role === 'ADMIN' || user?.role === 'JEFEPISO' ||
        user?.role === 'PROGRAMADOR' || user?.role === 'SUPERADMIN';

      let result;
      if (isPrivileged) {
        result = await apiService.getAdminRooms(nextPage, 10, '');
        const activeRooms = result.data ? result.data.filter(room => room.isActive) : [];

        // Agregar nuevos grupos evitando duplicados
        setExtendedRooms(prev => {
          const existingCodes = new Set(prev.map(r => r.roomCode));
          const newRooms = activeRooms.filter(r => !existingCodes.has(r.roomCode));
          return [...prev, ...newRooms];
        });

        setForwardRoomsTotalPages(result.totalPages || 1);
      } else {
        result = await apiService.getUserRoomsPaginated(nextPage, 10);

        setExtendedRooms(prev => {
          const existingCodes = new Set(prev.map(r => r.roomCode));
          const newRooms = (result.rooms || []).filter(r => !existingCodes.has(r.roomCode));
          return [...prev, ...newRooms];
        });

        setForwardRoomsTotalPages(result.totalPages || 1);
      }

      setForwardRoomsPage(nextPage);
    } catch (error) {
      console.error('Error al cargar más grupos:', error);
    } finally {
      setForwardRoomsLoading(false);
    }
  };

  // 🔥 NUEVO - Cargar más conversaciones asignadas para modal de reenvío  
  const handleLoadMoreForwardConvs = async () => {
    if (forwardConvsLoading || forwardConvsPage >= forwardConvsTotalPages) return;

    setForwardConvsLoading(true);
    try {
      const nextPage = forwardConvsPage + 1;
      const result = await apiService.getAssignedConversationsPaginated(nextPage, 10);

      setExtendedConvs(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newConvs = (result.conversations || []).filter(c => !existingIds.has(c.id));
        return [...prev, ...newConvs];
      });

      setForwardConvsTotalPages(result.totalPages || 1);
      setForwardConvsPage(nextPage);
    } catch (error) {
      console.error('Error al cargar más conversaciones:', error);
    } finally {
      setForwardConvsLoading(false);
    }
  };

  // ============================================================
  // EFFECT - Limpiar vista previa al cambiar de chat
  // ============================================================
  useEffect(() => {
    setImagePreview(null);
  }, [to, currentRoomCode, isGroup]);

  // ============================================================
  // EFFECT - Autofocus en el input al entrar a un chat
  // ============================================================
  useEffect(() => {
    // Si hay un chat abierto y el usuario puede enviar mensajes, hacer focus en el input
    if (to && canSendMessages && inputRef.current) {
      inputRef.current?.focus();
    }
  }, [to, currentRoomCode, canSendMessages]);

  // ============================================================
  // FUNCIONES AUXILIARES - Formateo de fechas
  // ============================================================
  const formatDateFromBackend = (messageOrDate) => {
    // Si es un objeto mensaje con displayDate, usarlo directamente
    if (typeof messageOrDate === 'object' && messageOrDate.displayDate) {
      return messageOrDate.displayDate;
    }

    // Si es solo una fecha (string), es para el separador de fechas
    const sentAt = typeof messageOrDate === 'string' ? messageOrDate : messageOrDate?.sentAt;

    if (!sentAt) return "Hoy";

    // El backend envía sentAt, extraer solo la fecha
    const messageDate = sentAt.split("T")[0]; // "2025-11-20"

    // Usar EXACTAMENTE la misma zona horaria que el backend: America/Lima
    const now = new Date();
    const todayInPeru = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayInPeru = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD

    if (messageDate === todayInPeru) {
      return "Hoy";
    } else if (messageDate === yesterdayInPeru) {
      return "Ayer";
    } else {
      // Para otras fechas, formatear usando zona horaria de Perú
      const date = new Date(sentAt);
      return date.toLocaleDateString("es-PE", {
        timeZone: "America/Lima",
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  };

  // Función simple para agrupar mensajes usando solo datos del backend
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDateString = null;

    // 🔥 FILTRAR DUPLICADOS POR ID
    const uniqueMessages = [];
    const seenIds = new Set();

    messages.forEach(msg => {
      // Si tiene ID y ya lo vimos, lo saltamos
      if (msg.id && seenIds.has(msg.id)) return;

      // Si tiene ID, lo agregamos al set
      if (msg.id) seenIds.add(msg.id);

      uniqueMessages.push(msg);
    });

    uniqueMessages.forEach((message, index) => {
      // Usar directamente el sentAt del backend
      const sentAt = message.sentAt;

      // Si no hay sentAt, usar fecha actual
      const dateToUse = sentAt || new Date().toISOString();

      // Extraer solo la fecha (YYYY-MM-DD) sin zona horaria
      const messageDateString = dateToUse.split("T")[0];

      if (currentDateString !== messageDateString) {
        currentDateString = messageDateString;
        groups.push({
          type: "date-separator",
          date: dateToUse,
          label: formatDateFromBackend(dateToUse),
        });
      }

      groups.push({
        type: "message",
        data: message,
        index,
      });
    });

    return groups;
  };

  // ============================================================
  // HANDLER - Descarga de archivos
  // ============================================================
  const handleDownload = async (url, fileName) => {
    if (!url) return;

    try {
      // 1. Intentamos descargar como Blob para forzar la descarga directa
      const response = await apiService.fetchWithAuth(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "archivo"; // Usa el nombre proporcionado
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
      link.target = "_blank"; // Solo como respaldo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ============================================================
  // HANDLERS - Drag & Drop de archivos
  // ============================================================
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
      const syntheticEvent = {
        target: { files, value: "" },
      };
      onFileSelect(syntheticEvent);
    }
  };

  // ============================================================
  // HANDLER - Paste de archivos/imágenes
  // ============================================================
  const handlePaste = (e) => {
    if (!canSendMessages) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const syntheticEvent = {
        target: { files, value: "" },
      };
      onFileSelect(syntheticEvent);
    }
  };

  // ============================================================
  // HANDLERS - Edición de mensajes
  // ============================================================
  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
    setEditFile(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
    setEditFile(null);
  };

  const handleSaveEdit = async () => {
    if ((editText.trim() || editFile) && editingMessageId) {
      setIsEditingLoading(true);
      try {
        await onEditMessage(editingMessageId, editText, editFile);
      } finally {
        setIsEditingLoading(false);
        setEditingMessageId(null);
        setEditText("");
        setEditFile(null);
      }
    }
  };

  // ============================================================
  // HANDLER - Input de texto y menciones
  // ============================================================
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(value);

    // Detectar menciones con @ solo en grupos
    if (isGroup && roomUsers && roomUsers.length > 0) {
      // Buscar el último @ antes del cursor
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Verificar que el @ esté al inicio o precedido por un espacio
        const charBeforeAt =
          lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
        if (charBeforeAt === " " || lastAtIndex === 0) {
          const searchText = textBeforeCursor.substring(lastAtIndex + 1);
          // Verificar que no haya espacios después del @
          if (!searchText.includes(" ")) {
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
      // Buscar conversationId si es un chat asignado
      let conversationId = null;
      if (!isGroup && assignedConversations) {
        const conv = assignedConversations.find(c =>
          c.participants?.some(p => p?.toLowerCase().trim() === to?.toLowerCase().trim())
        );
        if (conv) conversationId = conv.id;
      }

      // Si es una sala, incluir roomCode en el evento
      const typingData = {
        from: currentUsername,
        to: to,
        isTyping: true,
        conversationId: conversationId // 🔥 Enviar ID para filtrado preciso
      };

      if (isGroup && currentRoomCode) {
        typingData.roomCode = currentRoomCode;
      }

      // Emitir que está escribiendo
      socket.emit("typing", typingData);

      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Después de 2 segundos sin escribir, emitir que dejó de escribir
      typingTimeoutRef.current = setTimeout(() => {
        const stopTypingData = {
          from: currentUsername,
          to: to,
          isTyping: false,
        };

        if (isGroup && currentRoomCode) {
          stopTypingData.roomCode = currentRoomCode;
        }

        socket.emit("typing", stopTypingData);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSaveEdit();
      } else {
        onSendMessage();
      }
    }
  };

  const handleMentionSelect = (user) => {
    const username = typeof user === "string" ? user : user.username || user.nombre || user;
    const beforeMention = input.substring(0, mentionCursorPosition);
    const afterMention = input.substring(mentionCursorPosition + mentionSearch.length + 1);
    const newInput = `${beforeMention}@${username} ${afterMention}`;
    setInput(newInput);
    setShowMentionSuggestions(false);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  // ============================================================
  // HANDLER - Emojis y reacciones
  // ============================================================
  const handleEmojiClick = (emojiData) => {
    if (window.currentReactionMessage) {
      handleReaction(window.currentReactionMessage, emojiData.emoji);
      window.currentReactionMessage = null;
    } else {
      setInput((prevInput) => prevInput + emojiData.emoji);
    }
    setShowEmojiPicker(false);
  };

  // ============================================================
  // EFFECT - Cerrar pickers al hacer click fuera
  // ============================================================
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
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker, showReactionPicker]);

  // ============================================================
  // HANDLER - Reacciones a mensajes
  // ============================================================
  const handleReaction = (message, emoji) => {
    if (!socket || !socket.connected || !currentUsername) return;

    // 🔥 Usar realSender para obtener el nombre real del usuario (no "Tú")
    const actualSender = message.realSender || message.sender;
    const actualReceiver = message.receiver;

    // // console.log(`👍 handleReaction - MessageID: ${message.id}, Emoji: ${emoji}, Sender: ${actualSender}, Receiver: ${actualReceiver}, IsGroup: ${isGroup}`);

    socket.emit("toggleReaction", {
      messageId: message.id,
      username: currentUsername,
      emoji: emoji,
      roomCode: isGroup ? currentRoomCode : undefined,
      to: isGroup
        ? undefined
        : actualSender === currentUsername
          ? actualReceiver
          : actualSender,
    });

    setShowReactionPicker(null);
  };

  // ============================================================
  // EFFECTS - Scroll y navegación
  // ============================================================

  // Scroll al mensaje resaltado cuando se selecciona desde la búsqueda
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      const messageElement = document.getElementById(`message-${highlightMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "auto", block: "center" });
        setHighlightedMessageId(highlightMessageId);
        setHighlightedMessageId(null);
        onMessageHighlighted?.();
      }
    }
  }, [highlightMessageId, messages, onMessageHighlighted]);

  // Cerrar el popover de leídos al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.mx_ReadReceiptGroup_container')) {
        setOpenReadReceiptsId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll automático al final para mensajes nuevos
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 100;

    if (messages.length > lastMessageCountRef.current && (isAtBottom || !isUserScrollingRef.current)) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
      isUserScrollingRef.current = false;
    }

    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Scroll automático cuando aparece el indicador de "está escribiendo"
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 150;

    const someoneIsTyping =
      (!isGroup && isOtherUserTyping && typingUser) ||
      (isGroup && currentRoomCode && roomTypingUsers?.[currentRoomCode]?.length > 0);

    if (someoneIsTyping && (isAtBottom || !isUserScrollingRef.current)) {
      chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: "auto" });
    }
  }, [isOtherUserTyping, typingUser, roomTypingUsers, currentRoomCode, isGroup]);

  // ============================================================
  // EFFECTS - Marcar mensajes como leídos
  // ============================================================

  // 🔥 NOTA: La lógica de marcar mensajes como leídos se maneja en ChatPage.jsx
  // usando markRoomMessagesAsRead (bulk) para evitar múltiples emisiones de socket.
  // NO usar un forEach aquí porque causa bucles cuando hay múltiples clusters.

  // Marcar mensajes de conversaciones individuales como leídos
  useEffect(() => {
    if (!socket?.connected || isGroup || !to || !currentUsername) return;

    const unreadMessages = messages.filter(
      (msg) => msg.id && msg.sender !== currentUsername && msg.sender !== "Tú" && !msg.isRead
    );

    if (unreadMessages.length === 0) return;

    socket.emit("markConversationAsRead", {
      from: to,
      to: currentUsername,
    });
  }, [messages, socket, isGroup, to, currentUsername]);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        setShowMessageMenu(null);
      }
    };

    if (showMessageMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMessageMenu]);

  // ============================================================
  // HANDLER - Scroll y carga de mensajes antiguos
  // ============================================================
  const handleScroll = () => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 50;

    isUserScrollingRef.current = !isAtBottom;

    // Cargar más mensajes antiguos cuando el usuario llega al tope
    if (chatHistory.scrollTop < 10 && hasMoreMessages && !isLoadingMore && onLoadMoreMessages) {
      previousScrollHeightRef.current = chatHistory.scrollHeight;
      onLoadMoreMessages();
    }
  };

  // Preservar posición del scroll al cargar mensajes antiguos
  useLayoutEffect(() => {
    if (chatHistoryRef.current && previousScrollHeightRef.current > 0) {
      const chatHistory = chatHistoryRef.current;
      const scrollDiff = chatHistory.scrollHeight - previousScrollHeightRef.current;
      chatHistory.scrollTop = scrollDiff;
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  // ============================================================
  // FUNCIONES AUXILIARES - Íconos de archivos
  // ============================================================
  const getFileIcon = (fileName) => {
    if (!fileName) return { icon: "default", color: "#4A90E2", bgColor: "#E3F2FD" };

    const extension = fileName.split(".").pop().toLowerCase();

    const fileTypes = {
      // Excel
      xlsx: { icon: "excel", color: "#217346", bgColor: "#E7F4EC", name: "Excel" },
      xls: { icon: "excel", color: "#217346", bgColor: "#E7F4EC", name: "Excel" },
      xlsm: { icon: "excel", color: "#217346", bgColor: "#E7F4EC", name: "Excel" },
      csv: { icon: "excel", color: "#217346", bgColor: "#E7F4EC", name: "CSV" },
      // Word
      docx: { icon: "word", color: "#2B579A", bgColor: "#E7F0FF", name: "Word" },
      doc: { icon: "word", color: "#2B579A", bgColor: "#E7F0FF", name: "Word" },
      // PowerPoint
      pptx: { icon: "powerpoint", color: "#D24726", bgColor: "#FCE8E3", name: "PowerPoint" },
      ppt: { icon: "powerpoint", color: "#D24726", bgColor: "#FCE8E3", name: "PowerPoint" },
      // PDF
      pdf: { icon: "pdf", color: "#F40F02", bgColor: "#FFE7E5", name: "PDF" },
      // Imágenes
      jpg: { icon: "image", color: "#FF6B6B", bgColor: "#FFE8E8", name: "Imagen" },
      jpeg: { icon: "image", color: "#FF6B6B", bgColor: "#FFE8E8", name: "Imagen" },
      png: { icon: "image", color: "#FF6B6B", bgColor: "#FFE8E8", name: "Imagen" },
      gif: { icon: "image", color: "#FF6B6B", bgColor: "#FFE8E8", name: "GIF" },
      svg: { icon: "image", color: "#FF6B6B", bgColor: "#FFE8E8", name: "SVG" },
      // Comprimidos
      zip: { icon: "zip", color: "#FFA500", bgColor: "#FFF3E0", name: "ZIP" },
      rar: { icon: "zip", color: "#FFA500", bgColor: "#FFF3E0", name: "RAR" },
      "7z": { icon: "zip", color: "#FFA500", bgColor: "#FFF3E0", name: "7Z" },
      // Texto
      txt: { icon: "text", color: "#607D8B", bgColor: "#ECEFF1", name: "Texto" },
      // Código
      js: { icon: "code", color: "#F7DF1E", bgColor: "#FFFDE7", name: "JavaScript" },
      jsx: { icon: "code", color: "#61DAFB", bgColor: "#E1F5FE", name: "React" },
      ts: { icon: "code", color: "#3178C6", bgColor: "#E3F2FD", name: "TypeScript" },
      tsx: { icon: "code", color: "#3178C6", bgColor: "#E3F2FD", name: "TypeScript" },
      html: { icon: "code", color: "#E34F26", bgColor: "#FFE8E1", name: "HTML" },
      css: { icon: "code", color: "#1572B6", bgColor: "#E1F5FE", name: "CSS" },
      json: { icon: "code", color: "#000000", bgColor: "#F5F5F5", name: "JSON" },
      xml: { icon: "code", color: "#FF6600", bgColor: "#FFF3E0", name: "XML" },
      // Video
      mp4: { icon: "video", color: "#9C27B0", bgColor: "#F3E5F5", name: "Video" },
      avi: { icon: "video", color: "#9C27B0", bgColor: "#F3E5F5", name: "Video" },
      mov: { icon: "video", color: "#9C27B0", bgColor: "#F3E5F5", name: "Video" },
      wmv: { icon: "video", color: "#9C27B0", bgColor: "#F3E5F5", name: "Video" },
      // Audio
      mp3: { icon: "audio", color: "#00BCD4", bgColor: "#E0F7FA", name: "Audio" },
      wav: { icon: "audio", color: "#00BCD4", bgColor: "#E0F7FA", name: "Audio" },
      ogg: { icon: "audio", color: "#00BCD4", bgColor: "#E0F7FA", name: "Audio" },
    };

    return fileTypes[extension] || { icon: "default", color: "#4A90E2", bgColor: "#E3F2FD", name: "Archivo" };
  };

  // 🔥 NUEVO: Función para renderizar el ícono SVG según el tipo de archivo
  const renderFileIcon = (fileName) => {
    const fileInfo = getFileIcon(fileName);

    const icons = {
      excel: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="2"
            width="16"
            height="20"
            rx="2"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path d="M8 2V22" stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M4 8H20" stroke={fileInfo.color} strokeWidth="1.5" />
          <path d="M4 14H20" stroke={fileInfo.color} strokeWidth="1.5" />
          <text
            x="14"
            y="18"
            fontSize="8"
            fontWeight="bold"
            fill={fileInfo.color}
          >
            X
          </text>
        </svg>
      ),
      word: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M13 2V9H20"
            fill={fileInfo.color}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <text
            x="8"
            y="18"
            fontSize="8"
            fontWeight="bold"
            fill={fileInfo.color}
          >
            W
          </text>
        </svg>
      ),
      powerpoint: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M13 2V9H20"
            fill={fileInfo.color}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <text
            x="9"
            y="18"
            fontSize="8"
            fontWeight="bold"
            fill={fileInfo.color}
          >
            P
          </text>
        </svg>
      ),
      pdf: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M13 2V9H20"
            fill={fileInfo.color}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <text
            x="6"
            y="17"
            fontSize="6"
            fontWeight="bold"
            fill={fileInfo.color}
          >
            PDF
          </text>
        </svg>
      ),
      zip: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M12 2V6M12 6V10M12 10V14M12 14V18"
            stroke={fileInfo.color}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <rect
            x="10"
            y="16"
            width="4"
            height="3"
            rx="0.5"
            fill={fileInfo.color}
          />
        </svg>
      ),
      image: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <circle cx="9" cy="9" r="2" fill={fileInfo.color} />
          <path
            d="M4 16L8 12L12 16L16 12L20 16V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V16Z"
            fill={fileInfo.color}
          />
        </svg>
      ),
      video: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="3"
            y="5"
            width="14"
            height="14"
            rx="2"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M17 8.5L21 6V18L17 15.5V8.5Z"
            fill={fileInfo.color}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path d="M9 10L12 12L9 14V10Z" fill={fileInfo.color} />
        </svg>
      ),
      audio: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M12 8V16M9 11V13M15 11V13M6 12H7M17 12H18"
            stroke={fileInfo.color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      text: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M8 12H16M8 16H16M8 8H12"
            stroke={fileInfo.color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      code: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M9 12L7 14L9 16M15 12L17 14L15 16M13 10L11 18"
            stroke={fileInfo.color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      default: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
            fill={fileInfo.bgColor}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
          <path
            d="M13 2V9H20"
            fill={fileInfo.color}
            stroke={fileInfo.color}
            strokeWidth="1.5"
          />
        </svg>
      ),
    };

    return icons[fileInfo.icon] || icons.default;
  };

  // ============================================================
  // FUNCIÓN AUXILIAR - Renderizar texto con menciones resaltadas
  // ============================================================
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

    // Regex mejorado: @ seguido de cualquier caracter de palabra (incluye acentos si se usa \w en algunos motores, pero mejor explícito)
    // Permitimos mayúsculas y minúsculas al inicio
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
          normalizedMention.includes(validUser) // 🔥 Check bidireccional
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

  // ============================================================
  // FUNCIÓN DE RENDERIZADO - Mensaje individual
  // ============================================================
  const renderMessage = (message, index) => {
    // --- Preparación de datos ---
    const isOwnMessage = message.isSelf !== undefined
      ? message.isSelf
      : message.sender === "Tú" || message.sender === currentUsername;

    // Lógica de agrupación (Slack Style)
    const prevMsg = index > 0 ? messages[index - 1] : null;

    // Compara si el mensaje anterior es del mismo autor y si no es un mensaje de sistema
    const isSameGroup = (m1, m2) => {
      if (!m1 || !m2) return false;
      if (m1.type === "info" || m1.type === "error") return false;
      // Puedes agregar validación de fecha aquí si es necesario
      return m1.sender === m2.sender;
    };

    const isGroupStart = !isSameGroup(prevMsg, message);

    // Color consistente del usuario (Necesitas asegurarte que getUserColor exista o usar un default)
    // Si no tienes la función getUserColor definida fuera, usa esta línea temporal:
    const userColor = "#54656f ";

    const isMenuOpen = showMessageMenu === message.id;
    const isHighlighted = highlightedMessageId === message.id;

    // Si es mensaje de sistema, retornamos diseño simple centrado
    if (message.type === "info" || message.type === "error") {
      const color = message.type === "info" ? "ff453a" : "#ff453a";
      const bg = message.type === "info" ? "rgba(0, 168, 132, 0.1)" : "rgba(255, 69, 58, 0.1)";
      return (
        <div key={index} style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', width: '100%' }}>
          <div style={{ backgroundColor: bg, color: color, padding: '4px 12px', borderRadius: '8px', fontSize: '12px' }}>
            {message.text}
          </div>
        </div>
      );
    }

    // Ocultar videollamadas
    const messageText = message.text || message.message || "";
    if (message.type === "video_call" || (typeof messageText === "string" && messageText.includes("📹 Videollamada"))) {
      return null;
    }

    // ============================================================
    // 2. RENDERIZADO (ROW LAYOUT - TIPO SLACK)
    // ============================================================
    return (
      <div
        key={index}
        className={`message-row ${isGroupStart ? 'group-start' : ''} ${isOwnMessage ? 'is-own' : ''}`}
        id={`message-${message.id}`}
        style={{
          backgroundColor: isHighlighted ? 'rgba(0, 168, 132, 0.1)' : 'transparent',
          position: 'relative',
          zIndex: isMenuOpen ? 100 : 1
        }}
      >
        {/* Checkbox de selección */}
        {isSelectionMode && (
          <div
            className="message-checkbox-wrapper"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMessageSelection(message.id);
            }}
          >
            <input
              type="checkbox"
              className="message-checkbox"
              checked={selectedMessages.includes(message.id)}
              onChange={() => { }}
            />
          </div>
        )}

        {/* === COLUMNA IZQUIERDA (GUTTER): AVATAR O HORA === */}
        <div className="message-gutter">
          {isGroupStart ? (
            // INICIO DE GRUPO: Mostrar Avatar
            <div className="message-gutter">
              {isGroupStart ? (
                // INICIO DE GRUPO: Mostrar Avatar
                <div
                  className="slack-avatar"
                  style={{
                    // 🔥 CORRECCIÓN: Si es mensaje propio, usamos user.picture. Si no, message.senderPicture.
                    background: (isOwnMessage ? user?.picture : message.senderPicture)
                      ? `url(${isOwnMessage ? user.picture : message.senderPicture}) center/cover`
                      : "linear-gradient(135deg, #dc2626 0%, #dc2626 100%)",
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '14px'
                  }}
                >
                  {/* Lógica para mostrar inicial si no hay foto */}
                  {!(isOwnMessage ? user?.picture : message.senderPicture) && (
                    (isOwnMessage ? (currentUsername?.charAt(0)?.toUpperCase() || "T") : message.sender?.charAt(0)?.toUpperCase()) || "👤"
                  )}
                </div>
              ) : (
                // CONTINUACIÓN: Mostrar Hora (visible en hover por CSS)
                <span className="message-timestamp-left">
                  {formatTime(message.time)}
                </span>
              )}
            </div>
          ) : (
            // CONTINUACIÓN: Mostrar Hora (visible en hover por CSS)
            <span className="message-timestamp-left">
              {formatTime(message.time)}
            </span>
          )}
        </div>

        {/* === COLUMNA CENTRAL: CONTENIDO === */}
        <div className="message-main-content">

          {/* HEADER (Solo si es inicio de grupo) */}
          {isGroupStart && (
            <div className="message-header">
              <span className="sender-name" style={{ color: userColor }} onClick={() => handleMentionSelect(message.sender)}>
                {message.sender} {getSenderSuffix(message)}
              </span>
              <span className="header-timestamp">
                {formatTime(message.time)}
              </span>
            </div>
          )}

          {/* CUERPO DEL MENSAJE */}
          <div className="message-text-body">
            {message.isDeleted ? (
              <span className="mx_RedactedBody">Mensaje eliminado</span>
            ) : (
              <>
                {/* DEBUG: Verificar isForwarded */}
                {/* {console.log('🔍 Message:', message.id, 'isForwarded:', message.isForwarded, 'Type:', typeof message.isForwarded)} */}

                {/* INDICADOR DE MENSAJE REENVIADO */}
                {message.isForwarded && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '4px',
                      fontSize: '11px',
                      color: '#54656f',
                      fontStyle: 'italic',
                      fontWeight: '500',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    <span>Reenviado</span>
                  </div>
                )}

                {/* PREVIEW DE RESPUESTA */}
                {/* PREVIEW DE RESPUESTA ESTILO WHATSAPP */}
                {message.replyToMessageId && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      // Intentar encontrar el mensaje en el DOM
                      const el = document.getElementById(`message-${message.replyToMessageId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'auto', block: 'center' });
                      } else {
                        // Si no está en el DOM, intentar cargarlo (Lógica pendiente de conectar con hook de paginación)
                        console.log(`Mensaje ${message.replyToMessageId} no encontrado en vista actual. Se requiere búsqueda en historial.`);
                        if (onMessageHighlighted) {
                          // Usamos el prop existente para intentar navegar/cargar
                          // Esto asume que el padre manejará la lógica de buscar si no está cargado
                          onMessageHighlighted(message.replyToMessageId);
                        }
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      borderLeft: '4px solid #00a884', // Color verde WhatsApp
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{
                      color: '#00a884', // Mismo color del borde
                      fontSize: '12px',
                      fontWeight: 'bold',
                      lineHeight: '1.2'
                    }}>
                      {message.replyToSender || "Usuario"}
                    </span>
                    <span style={{
                      color: '#54656f',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.2'
                    }}>
                      {message.replyToText || "Mensaje original"}
                    </span>
                  </div>
                )}

                {/* CONTENIDO REAL (Texto, Imagen, Video, Archivo) */}
                {message.mediaType === 'image' ? (
                  <img
                    src={message.mediaData}
                    alt="imagen"
                    style={{
                      maxWidth: '450px',
                      maxHeight: '400px',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                    onClick={() => setImagePreview({ url: message.mediaData, fileName: message.fileName })}
                  />
                ) : message.mediaType === 'video' ? (
                  <video
                    src={message.mediaData}
                    controls
                    // 🔥 CAMBIO AQUÍ: Añadimos maxHeight y backgroundColor
                    style={{
                      maxWidth: '600px',     // Reduje un poco el ancho
                      maxHeight: '300px',    // 🔥 ESTO EVITA QUE SEA GIGANTE VERTICALMENTE
                      width: 'auto',         // Mantiene la proporción
                      height: 'auto',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#000' // Fondo negro para que se vea prolijo
                    }}
                  />
                ) : message.mediaType === 'audio' ? (
                  <AudioPlayer src={message.mediaData} fileName={message.fileName} />
                ) : message.mediaType && message.mediaData ? (
                  // ARCHIVOS GENÉRICOS
                  (() => {
                    const isPdf = message.fileName?.toLowerCase().endsWith('.pdf') || message.mediaData?.toLowerCase().includes('application/pdf');

                    return (
                      <div className="wa-file-card" onClick={() => {
                        if (isPdf) {
                          // Descargar PDF y convertir a ArrayBuffer
                          console.log("📥 Descargando PDF:", message.mediaData);
                          apiService.fetchWithAuth(message.mediaData)
                            .then(res => {
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              return res.arrayBuffer();
                            })
                            .then(arrayBuffer => {
                              console.log("✅ PDF descargado, tamaño:", arrayBuffer.byteLength);
                              setPdfData(arrayBuffer);
                              setShowPdfViewer(true);
                            })
                            .catch(err => {
                              console.error("❌ Error descargando PDF:", err);
                              alert("Error al cargar el PDF");
                            });
                        } else {
                          handleDownload(message.mediaData, message.fileName);
                        }
                      }}>
                        <div className="wa-file-icon">{renderFileIcon(message.fileName)}</div>
                        <div className="wa-file-info">
                          <div className="wa-file-name">{message.fileName}</div>
                          <div className="wa-file-meta">{isPdf ? 'Click para ver PDF' : 'Click para descargar'}</div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // TEXTO PLANO
                  renderTextWithMentions(message.text || message.message || "")
                )}

                {/* EDICIÓN (Indicador) */}
                {message.isEdited && <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>(editado)</span>}
              </>
            )}
          </div>

          {/* REACCIONES (Debajo del texto) */}
          {
            message.reactions && message.reactions.length > 0 && (
              <div className="reactions-row" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {Object.entries(message.reactions.reduce((acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = [];
                  acc[r.emoji].push(r.username); return acc;
                }, {})).map(([emoji, users]) => (
                  <div key={emoji} className="reaction-pill" onClick={() => handleReaction(message, emoji)} title={users.join(', ')}>
                    {emoji} <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>{users.length}</span>
                  </div>
                ))}
              </div>
            )
          }
          {/* 🔥 HILO CON AVATARES (VERSIÓN FINAL A PRUEBA DE FALLOS) 🔥 */}
          {
            message.threadCount > 0 && (
              <div className="thread-row-container">

                {/* --- DEBUG: ESTO TE AYUDARÁ A VER SI LLEGAN DATOS EN LA CONSOLA --- */}
                {/* console.log(`Mensaje ${message.id} Hilo:`, {
                  count: message.threadCount,
                  quien: message.lastReplyFrom,
                  tieneFoto: roomUsers?.find(u => u.username === message.lastReplyFrom)?.picture
                }) */}

                {/* 1. EL BOTÓN DEL HILO */}
                <div
                  className="mx_ThreadSummaryLine"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenThread) onOpenThread(message);
                  }}
                  title="Ver hilo"
                >
                  <div className="thread-icon-wrapper">
                    <FaComments size={13} color="#54656f" />
                  </div>

                  <span className="mx_ThreadCounter">
                    {message.threadCount} {message.threadCount === 1 ? 'respuesta' : 'respuestas'}
                  </span>

                  {/* 🔥 CAMBIO: Si hay nombre lo muestra, si no, muestra una flechita discreta */}
                  <div className="thread-vertical-line"></div>
                  <span className="mx_ThreadLastReply">
                    {message.lastReplyFrom ? message.lastReplyFrom : "Ver"}
                  </span>
                  {/* 🔥 NUEVO: Vista previa del último mensaje del hilo */}
                  {message.lastReplyText && (
                    <span className="mx_ThreadLastReplyText" title={message.lastReplyText}>
                      : {message.lastReplyText.length > 25
                        ? message.lastReplyText.substring(0, 25) + '...'
                        : message.lastReplyText}
                    </span>
                  )}
                  <FaChevronRight size={10} color="#8696a0" style={{ marginLeft: '4px' }} />
                </div>

                {/* 2. LOS AVATARES (Derecha) - VERSIÓN FORZADA */}
                <div className="thread-face-pile">
                  {(() => {
                    // 1. Obtener un nombre seguro (si viene null, usamos "Usuario")
                    const rawName = message.lastReplyFrom;
                    const displayName = rawName ? rawName.trim() : "?";

                    // 2. Intentar buscar la foto en roomUsers (si hay lista)
                    let foundUser = null;
                    if (roomUsers && Array.isArray(roomUsers) && rawName) {
                      const searchName = rawName.toLowerCase();
                      foundUser = roomUsers.find(u => {
                        const uName = (u.username || "").toLowerCase();
                        const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                        return uName === searchName || uFull === searchName;
                      });
                    }

                    // 3. Intentar buscar foto en historial de mensajes (Plan B)
                    let avatarUrl = foundUser?.picture;
                    if (!avatarUrl && messages && rawName) {
                      const msgMatch = messages.find(m =>
                        (m.sender === rawName || m.realSender === rawName) && m.senderPicture
                      );
                      if (msgMatch) avatarUrl = msgMatch.senderPicture;
                    }

                    // === RENDERIZADO (SIN EXCUSAS) ===

                    // CASO A: Tenemos foto -> La mostramos
                    if (avatarUrl) {
                      return (
                        <div
                          className="thread-mini-avatar"
                          style={{ backgroundImage: `url(${avatarUrl})` }}
                          title={`Última respuesta de: ${displayName}`}
                        />
                      );
                    }

                    // CASO B: No hay foto (picture = null) -> Mostramos la INICIAL
                    // Generamos un color consistente basado en el nombre
                    const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
                    const charCode = displayName.charCodeAt(0) || 0;
                    const colorIndex = charCode % colors.length;
                    const bgColor = colors[colorIndex];

                    return (
                      <div
                        className="thread-mini-avatar placeholder"
                        style={{ background: bgColor }}
                        title={`Última respuesta de: ${displayName}`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )
          }
        </div >

        {/* === TOOLBAR FLOTANTE (DERECHA ARRIBA) - VISIBLE ON HOVER === */}
        {
          !message.isDeleted && (
            <div className={`action-toolbar ${isMenuOpen || showReactionPicker === message.id ? 'active' : ''}`}>
              {/* 1. BOTÓN REACCIONAR (Smile) */}
              <div style={{ position: 'relative' }}> {/* Envolvemos en relative para posicionar el popup */}
                <button className="toolbar-btn" title="Reaccionar" onClick={() => setShowReactionPicker(message.id)}>
                  <FaSmile size={15} />
                </button>

                {/* 🔥🔥🔥 ESTO ES LO QUE FALTABA: EL POPUP DE EMOJIS 🔥🔥🔥 */}
                {showReactionPicker === message.id && (
                  <div
                    ref={reactionPickerRef}
                    className="reaction-picker-popup"
                  >
                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(message, emoji);
                        }}
                        className="reaction-emoji-btn"
                      >
                        {emoji}
                      </button>
                    ))}
                    {/* Botón Más (+) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionPicker(null);
                        setShowEmojiPicker(true);
                        window.currentReactionMessage = message;
                      }}
                      className="reaction-emoji-btn plus-btn"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Reply */}
              <button className="toolbar-btn" title="Responder" onClick={() => window.handleReplyMessage && window.handleReplyMessage(message)}>
                <FaReply size={15} />
              </button>

              {/* 3. Thread (Si aplica) */}
              {onOpenThread && (
                <button className="toolbar-btn" title="Responder en hilo" onClick={() => onOpenThread(message)}>
                  <FaComments size={15} />
                </button>
              )}

              {/* 4. MENÚ DESPLEGABLE (3 Puntos) */}
              <div style={{ position: 'relative' }}>
                <button
                  className="toolbar-btn"
                  title="Más opciones"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Cálculo para saber si abrir arriba o abajo
                    const rect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    setMenuPosition({ openUp: spaceBelow < 300 });
                    setShowMessageMenu(isMenuOpen ? null : message.id);
                  }}
                >
                  {/* Icono 3 puntos */}
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
                </button>

                {/* === CONTENIDO DEL DESPLEGADOR (COMPLETO CON TODOS LOS BOTONES) === */}
                {isMenuOpen && (
                  <div
                    ref={messageMenuRef}
                    className="slack-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: menuPosition.openUp ? 'auto' : '100%',
                      bottom: menuPosition.openUp ? '100%' : 'auto',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 99999,
                      minWidth: '200px',
                      padding: '6px 0',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >

                    {onOpenThread && (
                      <button className="menu-item" onClick={() => { onOpenThread(message); setShowMessageMenu(null); }}>
                        <FaComments className="menu-icon" /> Crear Hilo
                      </button>
                    )}

                    <CopyOptions
                      message={message}
                      onClose={() => setShowMessageMenu(null)}
                      onEnterSelectionMode={handleEnterSelectionMode}
                    />

                    {message.mediaData && (
                      <button className="menu-item" onClick={() => { handleDownload(message.mediaData, message.fileName); setShowMessageMenu(null); }}>
                        <FaDownload className="menu-icon" /> Descargar
                      </button>
                    )}

                    {<button className="menu-item" onClick={() => { setShowMessageInfo(message); setShowMessageMenu(null); }}>
                      <FaInfoCircle className="menu-icon" /> Info. Mensaje
                    </button>}

                    {/* 🔥 NUEVO: Botón de Reenviar */}
                    <button className="menu-item" onClick={() => handleOpenForwardModal(message)}>
                      <FaShare className="menu-icon" /> Reenviar
                    </button>

                    {/* FUNCIONES PRIVILEGIADAS */}
                    {isGroup && onPinMessage && (isAdmin || (user?.role && ['JEFEPISO', 'PROGRAMADOR', 'SUPERVISOR'].includes(user.role.toUpperCase()))) && (
                      <button className="menu-item" onClick={() => { onPinMessage(message); setShowMessageMenu(null); }}>
                        <FaThumbtack className="menu-icon" style={{ color: pinnedMessageId === message.id ? "#d97706" : "inherit" }} />
                        {pinnedMessageId === message.id ? "Desfijar mensaje" : "Fijar mensaje"}
                      </button>
                    )}

                    {isOwnMessage && (
                      <button className="menu-item" onClick={(e) => { e.stopPropagation(); handleStartEdit(message); setShowMessageMenu(null); }}>
                        <FaEdit className="menu-icon" /> Editar mensaje
                      </button>
                    )}

                    <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>

                    {(isAdmin || isOwnMessage) && (
                      <button
                        className="menu-item"
                        style={{ color: '#dc2626' }}
                        onClick={(e) => { e.stopPropagation(); if (onDeleteMessage) onDeleteMessage(message.id, message.realSender || message.sender); setShowMessageMenu(null); }}
                      >
                        <FaTrash className="menu-icon" /> Eliminar mensaje
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* === 🛡️ AVATARES DE LECTURA (LÓGICA MODIFICADA: MÁXIMO 3 + CONTADOR) 🛡️ === */}
        {
          message.readBy && message.readBy.length > 0 && (
            <div className="read-by-avatars-container">

              {/* 1. ZONA INTERACTIVA (BOLITAS) */}
              <div
                className="read-receipts-trigger"
                style={{
                  // Ajustamos el ancho dinámicamente:
                  // Si son más de 3, dejamos espacio fijo para 3 bolitas + el contador. 
                  // Si son menos, calculamos el espacio justo.
                  width: message.readBy.length > 3 ? '55px' : `${(message.readBy.length * 12) + 6}px`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenReadReceiptsId(openReadReceiptsId === message.id ? null : message.id);
                }}
                title="Ver quién lo ha leído"
              >
                {(() => {
                  // Configuración
                  const MAX_VISIBLE = 3;
                  const totalReaders = message.readBy.length;
                  const remainingCount = totalReaders - MAX_VISIBLE;
                  const showCounter = remainingCount > 0;

                  // Cortamos el array para mostrar solo los necesarios
                  // Si hay contador, mostramos MAX_VISIBLE. Si no, mostramos todos (que serán <= 3).
                  const visibleReaders = message.readBy.slice(0, MAX_VISIBLE);

                  return (
                    <>
                      {/* A. BOLITA DE CONTADOR (+N) - Se muestra primero (arriba de la pila visualmente) */}
                      {showCounter && (
                        <div
                          className="mini-read-avatar counter-bubble"
                          style={{
                            right: '0px',
                            zIndex: 1,
                            backgroundColor: '#e5e7eb',
                            color: '#54656f',
                            fontSize: '9px',
                            border: '1px solid #fff'
                          }}
                        >
                          +{remainingCount}
                        </div>
                      )}

                      {/* B. AVATARES DE USUARIOS */}
                      {visibleReaders.map((readerName, idx) => {
                        // Búsqueda de foto (igual que antes)
                        let userPic = null;
                        const searchName = typeof readerName === 'string' ? readerName.toLowerCase().trim() : "";
                        if (roomUsers && Array.isArray(roomUsers)) {
                          const u = roomUsers.find(u => {
                            const uName = (u.username || "").toLowerCase();
                            const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                            return uName === searchName || uFull === searchName;
                          });
                          if (u) userPic = u.picture;
                        }

                        // Cálculo de posición:
                        // Si hay contador, desplazamos los avatares a la izquierda (empiezan en 16px).
                        // Si no hay contador, empiezan en 0px (el idx invertido maneja el stack).
                        const shift = showCounter ? 16 : 0;
                        // Stackeamos de derecha a izquierda
                        const rightPos = shift + ((visibleReaders.length - 1 - idx) * 10);

                        return (
                          <div
                            key={idx}
                            className="mini-read-avatar"
                            style={{
                              right: `${rightPos}px`,
                              zIndex: 1,
                              ...(userPic && { backgroundImage: `url(${userPic})` }),
                              ...(!userPic && { background: `linear-gradient(135deg, #ff453a 0%, #ff453a 100%)` })
                            }}
                          >
                            {!userPic && typeof readerName === 'string' && readerName.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>

              {/* 2. VENTANA FLOTANTE (POPOVER DETALLADO) - SE MANTIENE IGUAL QUE ANTES */}
              {
                openReadReceiptsId === message.id && (
                  <div className="read-receipts-popover" onClick={(e) => e.stopPropagation()}>
                    {/* ... El contenido del popover se mantiene igual ... */}
                    <div className="popover-header">
                      {message.readBy.length} {message.readBy.length === 1 ? 'persona' : 'personas'}
                    </div>
                    <div className="popover-list">
                      {message.readBy.map((readerName, idx) => {
                        // ... Lógica de renderizado de lista (mantener la existente) ...
                        let userPic = null;
                        let fullName = readerName;
                        const searchName = typeof readerName === 'string' ? readerName.toLowerCase().trim() : "";
                        if (roomUsers && Array.isArray(roomUsers)) {
                          const u = roomUsers.find(u => {
                            const uName = (u.username || "").toLowerCase();
                            const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                            return uName === searchName || uFull === searchName;
                          });
                          if (u) {
                            userPic = u.picture;
                            fullName = u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.username;
                          }
                        }
                        return (
                          <div key={idx} className="popover-item">
                            <div className="popover-avatar">
                              {userPic ? <img src={userPic} alt={fullName} /> : <span className="popover-avatar-initial">{typeof readerName === 'string' ? readerName.charAt(0).toUpperCase() : "?"}</span>}
                            </div>
                            <div className="popover-info">
                              <div className="popover-name">{fullName}</div>
                              <div className="popover-status">Visto</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              }
            </div >
          )
        }
      </div >
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "4px solid rgba(0, 168, 132, 0.2)",
                borderTop: "4px solid ff453a",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p
              style={{
                color: "#8696a0",
                fontSize: "14px",
                fontFamily:
                  "Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif",
                margin: 0,
              }}
            >
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

            {/* Mensajes agrupados por fecha (CON FILTRO ANTI-DUPLICADOS) */}
            {groupMessagesByDate(
              messages.filter((msg, index, self) =>
                index === self.findIndex((t) => (
                  t.id === msg.id // Mantiene solo la primera ocurrencia de cada ID
                ))
              )
            ).map((item, idx) => {
              if (item.type === "date-separator") {
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
            {((!isGroup && isOtherUserTyping && typingUser) ||
              (isGroup &&
                currentRoomCode &&
                roomTypingUsers &&
                roomTypingUsers[currentRoomCode] &&
                roomTypingUsers[currentRoomCode].length > 0)) && (
                <div className="typing-indicator-container">
                  {/* Para chats individuales */}
                  {!isGroup && isOtherUserTyping && typingUser && (
                    <div
                      className="message other-message"
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-end",
                        margin: "2px 0",
                        padding: "0 8px",
                        gap: "6px",
                      }}
                    >
                      {/* Avatar - Mostrar imagen si existe, sino iniciales o emoji */}
                      <div
                        className="message-avatar"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: typingUser?.picture
                            ? `url(${typingUser.picture}) center/cover no-repeat`
                            : "#A50104",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          flexShrink: 0,
                          marginBottom: "2px",
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {!typingUser?.picture &&
                          (typingUser?.nombre
                            ? typingUser.nombre.charAt(0).toUpperCase()
                            : to?.charAt(0).toUpperCase() || "👤")}
                      </div>

                      {/* Contenedor del SVG */}
                      <div
                        className="message-content"
                        style={{
                          backgroundColor: "#E8E6F0", // Mismo color que "other-message"
                          padding: "6px 12px",
                          borderTopRightRadius: "17.11px",
                          borderBottomRightRadius: "17.11px",
                          borderBottomLeftRadius: "17.11px",
                          borderTopLeftRadius: "4px",
                          boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          width: "auto",
                          height: "auto",
                        }}
                      >
                        {/* Nombre del usuario que está escribiendo */}
                        <div
                          style={{
                            color: "ff453a",
                            fontSize: "11px",
                            fontWeight: "600",
                            marginBottom: "2px",
                          }}
                        >
                          {typingUser.nombre && typingUser.apellido
                            ? `${typingUser.nombre} ${typingUser.apellido}`
                            : typingUser.nombre || typingUser.username || to}
                        </div>

                        <div className="typing-svg-container">
                          {/* SVG Convertido a JSX */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 72 72"
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                              width: "100%",
                              height: "100%",
                              transform: "translate3d(0px, 0px, 0px)",
                              contentVisibility: "visible",
                            }}
                          >
                            <defs>
                              <clipPath id="_lottie_element_352">
                                <rect width="72" height="72" x="0" y="0"></rect>
                              </clipPath>
                            </defs>
                            <g clipPath="url(#_lottie_element_352)">
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,37.752864837646484)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"
                                  ></path>
                                </g>
                              </g>
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,34.76784896850586)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                  ></path>
                                </g>
                              </g>
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,30.869281768798828)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                  ></path>
                                </g>
                              </g>
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,37.752864837646484)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,-23,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"
                                  ></path>
                                </g>
                              </g>
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,34.76784896850586)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,0,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                  ></path>
                                </g>
                              </g>
                              <g
                                style={{ display: "block" }}
                                transform="matrix(1,0,0,1,35.875,30.869281768798828)"
                                opacity="1"
                              >
                                <g opacity="1" transform="matrix(1,0,0,1,23,0)">
                                  <path
                                    fill="rgb(196,82,44)"
                                    fillOpacity="1"
                                    d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                  ></path>
                                </g>
                              </g>
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Para grupos/salas - Mostrar todos los usuarios que están escribiendo */}
                  {isGroup &&
                    currentRoomCode &&
                    roomTypingUsers &&
                    roomTypingUsers[currentRoomCode] &&
                    roomTypingUsers[currentRoomCode].length > 0 &&
                    roomTypingUsers[currentRoomCode].map(
                      (typingUserInRoom, index) => (
                        <div
                          key={`typing-${typingUserInRoom.username}-${index}`}
                          className="message other-message"
                          style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            margin: "2px 0",
                            padding: "0 8px",
                            gap: "6px",
                          }}
                        >
                          {/* Avatar - Mostrar imagen si existe, sino iniciales o emoji */}
                          <div
                            className="message-avatar"
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: typingUserInRoom?.picture
                                ? `url(${typingUserInRoom.picture}) center/cover no-repeat`
                                : "#A50104",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              flexShrink: 0,
                              marginBottom: "2px",
                              color: "white",
                              fontWeight: "600",
                            }}
                          >
                            {!typingUserInRoom?.picture &&
                              (typingUserInRoom?.nombre
                                ? typingUserInRoom.nombre.charAt(0).toUpperCase()
                                : typingUserInRoom.username
                                  ?.charAt(0)
                                  .toUpperCase() || "👤")}
                          </div>

                          {/* Contenedor del SVG */}
                          <div
                            className="message-content"
                            style={{
                              backgroundColor: "#E8E6F0",
                              padding: "6px 12px",
                              borderTopRightRadius: "17.11px",
                              borderBottomRightRadius: "17.11px",
                              borderBottomLeftRadius: "17.11px",
                              borderTopLeftRadius: "4px",
                              boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              width: "auto",
                              height: "auto",
                            }}
                          >
                            {/* Nombre del usuario que está escribiendo */}
                            <div
                              style={{
                                color: "ff453a",
                                fontSize: "11px",
                                fontWeight: "600",
                                marginBottom: "2px",
                              }}
                            >
                              {typingUserInRoom.nombre &&
                                typingUserInRoom.apellido
                                ? `${typingUserInRoom.nombre} ${typingUserInRoom.apellido}`
                                : typingUserInRoom.nombre ||
                                typingUserInRoom.username}
                            </div>

                            <div className="typing-svg-container">
                              {/* SVG Convertido a JSX */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                xmlnsXlink="http://www.w3.org/1999/xlink"
                                viewBox="0 0 72 72"
                                preserveAspectRatio="xMidYMid meet"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  transform: "translate3d(0px, 0px, 0px)",
                                  contentVisibility: "visible",
                                }}
                              >
                                <defs>
                                  <clipPath id={`_lottie_element_${index}`}>
                                    <rect
                                      width="72"
                                      height="72"
                                      x="0"
                                      y="0"
                                    ></rect>
                                  </clipPath>
                                </defs>
                                <g clipPath={`url(#_lottie_element_${index})`}>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,37.752864837646484)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,-23,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"
                                      ></path>
                                    </g>
                                  </g>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,34.76784896850586)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,0,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                      ></path>
                                    </g>
                                  </g>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,30.869281768798828)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,23,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                      ></path>
                                    </g>
                                  </g>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,37.752864837646484)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,-23,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7.397884368896484 C4.082892417907715,-7.397884368896484 7.397884368896484,-4.082892417907715 7.397884368896484,0 C7.397884368896484,4.082892417907715 4.082892417907715,7.397884368896484 0,7.397884368896484 C-4.082892417907715,7.397884368896484 -7.397884368896484,4.082892417907715 -7.397884368896484,0 C-7.397884368896484,-4.082892417907715 -4.082892417907715,-7.397884368896484 0,-7.397884368896484z"
                                      ></path>
                                    </g>
                                  </g>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,34.76784896850586)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,0,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                      ></path>
                                    </g>
                                  </g>
                                  <g
                                    style={{ display: "block" }}
                                    transform="matrix(1,0,0,1,35.875,30.869281768798828)"
                                    opacity="1"
                                  >
                                    <g
                                      opacity="1"
                                      transform="matrix(1,0,0,1,23,0)"
                                    >
                                      <path
                                        fill="rgb(196,82,44)"
                                        fillOpacity="1"
                                        d=" M0,-7 C3.863300085067749,-7 7,-3.863300085067749 7,0 C7,3.863300085067749 3.863300085067749,7 0,7 C-3.863300085067749,7 -7,3.863300085067749 -7,0 C-7,-3.863300085067749 -3.863300085067749,-7 0,-7z"
                                      ></path>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>
                          </div>
                        </div>
                      )
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
                <div key={index} className="media-preview-item">
                  {preview.type === "image" ? (
                    <img
                      src={preview.data}
                      alt={preview.name}
                      loading="lazy"
                      className="preview-image"
                    />
                  ) : (
                    <div className="preview-file">
                      <div className="preview-icon">
                        {getFileIcon(preview.type)}
                      </div>
                      <div className="preview-name">{preview.name}</div>
                      <div className="preview-size">
                        {preview.size > 1024 * 1024
                          ? `${(preview.size / 1024 / 1024).toFixed(1)} MB`
                          : `${(preview.size / 1024).toFixed(1)} KB`}
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
            <button className="cancel-media-btn" onClick={onCancelMediaUpload}>
              Cancelar
            </button>
          </div>
        )}

        {/* Preview del mensaje al que se está respondiendo */}
        {replyingTo && (
          <div
            style={{
              backgroundColor: "#d1f4dd",
              borderLeft: "3px solid ff453a",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "ff453a",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "2px",
                }}
              >
                Respondiendo a {replyingTo.sender}
              </div>
              <div
                style={{
                  color: "#1f2937",
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {replyingTo.text || "Archivo multimedia"}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "ff453a",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
              }}
              title="Cancelar respuesta"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* 🔥 NUEVO: Banner de edición de mensaje */}
        {editingMessageId && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              borderLeft: "3px solid #ffc107",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#856404",
                  fontSize: "12px",
                  fontWeight: "600",
                  marginBottom: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaEdit size={12} />
                Editando mensaje
              </div>
              <div
                style={{
                  color: "#6c757d",
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {editText || "Mensaje original"}
              </div>
            </div>
            <button
              onClick={handleCancelEdit}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#856404",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
              }}
              title="Cancelar edición"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className={`input-group ${isRecordingLocal ? "recording-mode" : ""}`}>

          {/* 1. BOTÓN ADJUNTAR */}
          <label
            className={`btn-attach ${!canSendMessages ? "disabled" : ""}`}
            title={
              canSendMessages
                ? "Adjuntar archivos (imágenes, PDFs, documentos)"
                : "No puedes enviar mensajes"
            }
          >
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={onFileSelect}
              style={{ display: "none" }}
              disabled={!canSendMessages}
            />
            <svg
              className="attach-icon"
              width="24"
              height="24"
              viewBox="0 0 15 17"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0.50407 7.51959C0.370931 7.38644 0.296136 7.20586 0.296136 7.01756C0.296136 6.82927 0.370931 6.64869 0.50407 6.51554L5.52325 1.49956C5.98225 1.02877 6.53016 0.653797 7.1352 0.396398C7.74024 0.138999 8.39037 0.00429558 9.04787 0.000101073C9.70538 -0.00409343 10.3572 0.122304 10.9654 0.371963C11.5737 0.621622 12.1264 0.989572 12.5913 1.45447C13.0563 1.91937 13.4243 2.47196 13.6741 3.0802C13.9238 3.68844 14.0503 4.34021 14.0463 4.99772C14.0422 5.65522 13.9076 6.30537 13.6502 6.91045C13.3929 7.51553 13.018 8.0635 12.5473 8.52257L6.02474 15.0452C5.35651 15.6967 4.45843 16.0588 3.52511 16.0528C2.5918 16.0468 1.69843 15.6733 1.03861 15.0132C0.378784 14.3531 0.00564932 13.4596 6.36217e-05 12.5262C-0.00552208 11.5929 0.356891 10.695 1.00877 10.027L6.5273 4.5085C6.92821 4.11717 7.46721 3.89963 8.02744 3.90306C8.58767 3.90649 9.12397 4.13061 9.52005 4.52683C9.91613 4.92306 10.1401 5.45943 10.1433 6.01966C10.1465 6.5799 9.9288 7.11882 9.53731 7.51959L5.52325 11.5326C5.39025 11.6656 5.20986 11.7403 5.02176 11.7403C4.83367 11.7403 4.65327 11.6656 4.52027 11.5326C4.38727 11.3996 4.31255 11.2192 4.31255 11.0311C4.31255 10.843 4.38727 10.6626 4.52027 10.5296L8.53326 6.51554C8.59912 6.44968 8.65136 6.3715 8.687 6.28545C8.72264 6.1994 8.74099 6.10718 8.74099 6.01405C8.74099 5.92091 8.72264 5.82869 8.687 5.74264C8.65136 5.65659 8.59912 5.57841 8.53326 5.51256C8.46741 5.4467 8.38922 5.39446 8.30318 5.35882C8.21713 5.32318 8.12491 5.30483 8.03177 5.30483C7.93864 5.30483 7.84641 5.32318 7.76037 5.35882C7.67432 5.39446 7.59614 5.4467 7.53028 5.51256L2.01175 11.0311C1.6126 11.4302 1.38836 11.9716 1.38836 12.5361C1.38836 12.8156 1.44341 13.0924 1.55037 13.3506C1.65733 13.6088 1.81411 13.8435 2.01175 14.0411C2.20939 14.2387 2.44402 14.3955 2.70225 14.5025C2.96048 14.6094 3.23725 14.6645 3.51676 14.6645C4.08124 14.6645 4.62261 14.4403 5.02176 14.0411L11.5443 7.51852C11.8868 7.19206 12.1604 6.80042 12.3493 6.36663C12.5381 5.93285 12.6382 5.46567 12.6438 4.99261C12.6494 4.51954 12.5603 4.05013 12.3818 3.612C12.2033 3.17386 11.939 2.77586 11.6044 2.4414C11.2698 2.10693 10.8717 1.84277 10.4335 1.66445C9.99526 1.48613 9.52581 1.39726 9.05274 1.40305C8.57968 1.40885 8.11255 1.5092 7.67884 1.69821C7.24514 1.88721 6.85361 2.16105 6.5273 2.50361L1.51026 7.51959C1.37715 7.6524 1.1968 7.72699 1.00877 7.72699C0.820736 7.72699 0.640383 7.6524 0.507278 7.51959" />
            </svg>
          </label>

          {/* 2. BOTÓN EMOJI */}
          <div className="emoji-container" style={{ position: "relative" }} ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn-attach ${!canSendMessages ? "disabled" : ""}`}
              disabled={!canSendMessages}
              title="Emojis"
            >
              <EmojiIcon className="attach-icon" />
            </button>

            {showEmojiPicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: "50px",
                  left: "0",
                  zIndex: 1000,
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

          {/* 3. GRABADORA DE VOZ */}
          <VoiceRecorder
            onSendAudio={onSendVoiceMessage}
            canSendMessages={canSendMessages}
            onRecordingStart={() => setIsRecordingLocal(true)}
            onRecordingStop={() => setIsRecordingLocal(false)}
          />

          {/* 4. INPUT DE TEXTO */}
          <div className="text-input-container" style={{ position: "relative", flex: 1 }}>
            {/* Overlay de carga al subir archivo */}
            {isUploadingFile && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  borderRadius: "12px",
                  color: "ff453a",
                  fontWeight: "500",
                  fontSize: "14px",
                  backdropFilter: "blur(2px)",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid ff453a",
                    borderRightColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.75s linear infinite",
                    marginRight: "8px",
                  }}
                ></div>
                Subiendo archivo...
              </div>
            )}

            <textarea
              ref={inputRef}
              value={editingMessageId ? editText : input}
              onChange={(e) => {
                if (editingMessageId) {
                  setEditText(e.target.value);
                } else {
                  handleInputChange(e);
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder={
                isUploadingFile
                  ? "Subiendo archivo..."
                  : canSendMessages
                    ? editingMessageId
                      ? "Edita tu mensaje..."
                      : "Escribe un mensaje"
                    : "Solo puedes monitorear esta conversación"
              }
              className="message-input"
              disabled={isRecording || !canSendMessages || isUploadingFile}
            />

            {/* Sugerencias de menciones (solo si aplica) */}
            {showMentionSuggestions && isGroup && roomUsers && roomUsers.length > 0 && (
              <div
                className="mention-suggestions"
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "0",
                  right: "0",
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
                  marginBottom: "8px",
                  zIndex: 1000,
                }}
              >
                {/* Lógica de renderizado de menciones (resumida para el bloque) */}
                {roomUsers
                  .filter((user) => {
                    const username = typeof user === "string" ? user : user.username || user.nombre || user;
                    return username.toLowerCase().includes(mentionSearch) && username !== currentUsername;
                  })
                  .slice(0, 5)
                  .map((user, index) => (
                    <div
                      key={index}
                      onClick={() => handleMentionSelect(user)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#333", // 🔥 FIX: Color de texto explícito
                        backgroundColor: "#fff",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f7ff"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                    >
                      {/* Avatar simple para la sugerencia */}
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#1976d2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: "600"
                      }}>
                        {(typeof user === "object" ? (user.nombre || user.username || "@").charAt(0) : user.charAt(0)).toUpperCase()}
                      </div>
                      <div style={{ color: "#333", fontWeight: "500", fontSize: "14px" }}>
                        {typeof user === "object" ? (user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : user.nombre || user.username) : user}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 5. BOTÓN ENVIAR/GUARDAR (COMPLETO) */}
          <button
            onClick={editingMessageId ? handleSaveEdit : onSendMessage}
            className="btn-send"
            disabled={
              editingMessageId
                ? !editText.trim() || isEditingLoading
                : ((!input.trim() && mediaFiles.length === 0) ||
                  !canSendMessages ||
                  isUploadingFile ||
                  isSending)
            }
            title={
              editingMessageId
                ? isEditingLoading
                  ? "Guardando..."
                  : "Guardar cambios"
                : isSending
                  ? "Enviando..."
                  : isUploadingFile
                    ? "Subiendo archivo..."
                    : !canSendMessages
                      ? "Solo lectura"
                      : "Enviar mensaje"
            }
          >
            {editingMessageId ? (
              <>
                <span className="send-text">
                  {isEditingLoading ? "Guardando..." : "Guardar cambios"}
                </span>
                <FaEdit className="send-icon" />
              </>
            ) : isUploadingFile || isSending ? (
              <>
                <span className="send-text">{isUploadingFile ? "Subiendo..." : "Enviando..."}</span>
                <div className="send-icon" style={{ animation: "pulse 1s infinite", opacity: 0.7 }}>
                  <FaPaperPlane />
                </div>
              </>
            ) : (
              <>
                <span className="send-text">Enviar mensaje</span>
                <FaPaperPlane className="send-icon" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de información de lectura */}
      {showMessageInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setShowMessageInfo(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111",
                }}
              >
                Información del mensaje
              </h3>
              <button
                onClick={() => setShowMessageInfo(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#8696a0",
                  padding: "4px",
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  backgroundColor: "#E1F4D6",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#111",
                    wordBreak: "break-word",
                  }}
                >
                  {showMessageInfo.text || "📎 Archivo multimedia"}
                </p>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "11px",
                    color: "#8696a0",
                  }}
                >
                  {formatTime(showMessageInfo.time)}
                </p>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "ff453a",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg
                    viewBox="0 0 18 18"
                    height="18"
                    width="18"
                    preserveAspectRatio="xMidYMid meet"
                    version="1.1"
                    x="0px"
                    y="0px"
                    enableBackground="new 0 0 18 18"
                  >
                    <path
                      fill="currentColor"
                      d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"
                    ></path>
                  </svg>
                  Leído por ({showMessageInfo.readBy?.length || 0})
                </h4>
                {showMessageInfo.readBy && showMessageInfo.readBy.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {showMessageInfo.readBy.map((reader, index) => {
                      // 1. Normalizar el nombre del lector
                      const readerName = typeof reader === 'string' ? reader : reader.username || reader.nombre;

                      // 2. BUSCAR EL USUARIO EN LA SALA (Para obtener su foto)
                      let userWithPic = null;
                      if (roomUsers && Array.isArray(roomUsers)) {
                        const search = readerName.toLowerCase().trim();
                        userWithPic = roomUsers.find(u => {
                          const uUser = (u.username || "").toLowerCase();
                          const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                          return uUser === search || uFull === search;
                        });
                      }

                      // 3. Obtener la URL de la foto (si existe)
                      const avatarUrl = userWithPic?.picture;

                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "8px",
                            backgroundColor: "#f5f6f6",
                            borderRadius: "8px",
                          }}
                        >
                          {/* --- AVATAR CON FOTO --- */}
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              // 🔥 AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos la foto si existe
                              background: avatarUrl
                                ? `url(${avatarUrl}) center/cover no-repeat`
                                : "#A50104",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              color: "#fff",
                              fontWeight: "600",
                              flexShrink: 0,
                              border: "1px solid rgba(0,0,0,0.05)"
                            }}
                          >
                            {/* Solo mostramos la inicial si NO hay foto */}
                            {!avatarUrl && readerName.charAt(0).toUpperCase()}
                          </div>

                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#111",
                              }}
                            >
                              {readerName}
                            </p>
                          </div>

                          <div
                            style={{
                              fontSize: "16px",
                              color: "#53bdeb",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {/* Doble Check Azul */}
                            <svg
                              viewBox="0 0 18 18"
                              height="18"
                              width="18"
                              preserveAspectRatio="xMidYMid meet"
                              version="1.1"
                              x="0px"
                              y="0px"
                              enableBackground="new 0 0 18 18"
                            >
                              <path
                                fill="currentColor"
                                d="M17.394,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-0.427-0.388c-0.171-0.167-0.431-0.15-0.578,0.038L7.792,13.13 c-0.147,0.188-0.128,0.478,0.043,0.645l1.575,1.51c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C17.616,5.456,17.582,5.182,17.394,5.035z M12.502,5.035l-0.57-0.444c-0.188-0.147-0.462-0.113-0.609,0.076l-6.39,8.198 c-0.147,0.188-0.406,0.206-0.577,0.039l-2.614-2.556c-0.171-0.167-0.447-0.164-0.614,0.007l-0.505,0.516 c-0.167,0.171-0.164,0.447,0.007,0.614l3.887,3.8c0.171,0.167,0.43,0.149,0.577-0.039l7.483-9.602 C12.724,5.456,12.69,5.182,12.502,5.035z"
                              ></path>
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#8696a0",
                      fontStyle: "italic",
                    }}
                  >
                    Aún no ha sido leído por nadie
                  </p>
                )}
              </div>

              <div>
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#8696a0",
                    marginBottom: "8px",
                  }}
                >
                  ✓ Entregado
                </h4>
                <p style={{ fontSize: "13px", color: "#8696a0" }}>
                  Enviado a todos los miembros de la sala
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vista previa de imagen en pantalla completa */}
      <ImageViewer
        imagePreview={imagePreview}
        onClose={() => setImagePreview(null)}
        onDownload={handleDownload}
      />
      {
        isSelectionMode && (
          <MessageSelectionManager
            selectedMessages={selectedMessages}
            allMessages={messages}
            onCopyList={handleCopyList}
            onCancel={handleCancelSelection}
          />
        )
      }

      {/* 🔥 NUEVO: Modal de reenvío de mensajes */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={handleCloseForwardModal}
        message={messageToForward}
        myActiveRooms={extendedRooms.length > 0 ? extendedRooms : myActiveRooms}
        assignedConversations={extendedConvs.length > 0 ? extendedConvs : assignedConversations}
        user={user}
        socket={socket}
        // 🔥 Props de paginación para grupos
        roomsPage={forwardRoomsPage}
        roomsTotalPages={forwardRoomsTotalPages}
        roomsLoading={forwardRoomsLoading}
        onLoadMoreRooms={handleLoadMoreForwardRooms}
        // 🔥 Props de paginación para conversaciones
        convsPage={forwardConvsPage}
        convsTotalPages={forwardConvsTotalPages}
        convsLoading={forwardConvsLoading}
        onLoadMoreConvs={handleLoadMoreForwardConvs}
      />
      {/* VISOR DE PDF */}
      {showPdfViewer && pdfData && (
        <PDFViewer
          pdfData={pdfData}
          onClose={() => {
            setShowPdfViewer(false);
            setPdfData(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatContent;
