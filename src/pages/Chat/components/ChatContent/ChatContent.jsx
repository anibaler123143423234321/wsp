import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
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
  FaShare, //  NUEVO: Ícono para reenviar
  FaChevronUp, // NUEVO: Para botón Load Newer Messages
  FaPoll,
  FaArrowDown,
  FaArrowLeft, // NUEVO: Para botón de volver en info de mensaje
  FaFileExcel,
  FaFileWord,
  FaFilePdf,
  FaFileAlt,
  FaFileImage,
  FaFileVideo,
  FaFileAudio
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
import ForwardMessageModal from "./ForwardMessageModal"; //  NUEVO: Modal de reenvío
import PDFViewer from '../../../../components/PDFViewer/PDFViewer'; // Importar el visor de PDF
import apiService from '../../../../apiService';
import { useUserNameColor } from "../../../../components/userColors";
import AttachMenu from '../AttachMenu/AttachMenu';
import MediaPreviewList from '../MediaPreviewList/MediaPreviewList'; // Utilidad reutilizable
import { handleSmartPaste } from '../utils/pasteHandler'; // Utilidad reutilizable
import ReactionPicker from '../../../../components/ReactionPicker'; // Componente reutilizable
import ChatInput from '../../../../components/ChatInput/ChatInput'; //  NUEVO: Componente reutilizable de input
import AddReactionButton from '../../../../components/AddReactionButton/AddReactionButton'; // Componente reutilizable botón +
import { useMessageSelection } from '../../../../hooks/useMessageSelection'; // Hook personalizado
import { resolveDisplayName } from '../../../../hooks/useSocketListeners'; // Utilidad para resolución de nombres
import { groupMessagesForGallery } from "../../utils/messageGrouper";
import ImageGalleryGrid from "../../../../components/ImageGalleryGrid/ImageGalleryGrid";
import "./ChatContent.css";

// Función para formatear tiempo
const formatTime = (time) => {
  if (!time) return "";

  // Si ya es una cadena de tiempo formateada (HH:MM o HH:MM AM/PM), devolverla tal como está
  if (typeof time === "string" && /^(\d{1,2}:\d{2})(\s?[AaPp][Mm])?$/.test(time)) {
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

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

// 🖼️ Componente LazyImage con Intersection Observer
const LazyImage = ({ src, alt, style, onClick }) => {
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Cargar 100px antes de que sea visible
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} style={{ minHeight: isLoaded ? 'auto' : '100px', minWidth: isLoaded ? 'auto' : '100px', lineHeight: 0, display: 'block' }}>
      {isVisible ? (
        <>
          {!isLoaded && (
            <div style={{
              width: '200px',
              height: '150px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}>
              Cargando imagen...
            </div>
          )}
          <img
            src={src}
            alt={alt}
            style={{ ...style, display: isLoaded ? 'block' : 'none' }}
            onClick={onClick}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      ) : (
        <div style={{
          width: '200px',
          height: '150px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#aaa',
          fontSize: '12px'
        }}>
          📷
        </div>
      )}
    </div>
  );
};

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
  userList = [], //  NUEVO: Para resolución de nombres profesionales
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
  hasMoreAfter, // NUEVO
  onLoadMoreMessagesAfter, // NUEVO

  // Props de usuario/sala
  to,
  isGroup,
  currentRoomCode,
  roomUsers,
  roomUsersNameCache,
  currentUsername,
  user,
  socket,
  canSendMessages = true,
  isAdmin = false,

  // Props de typing
  isOtherUserTyping,
  typingUser,
  roomTypingUsers,
  onClearUnreadOnTyping,

  //  NUEVO: Props para modal de reenvío
  myActiveRooms = [],
  assignedConversations = [],

  //  NUEVO: Props para crear encuesta
  onOpenPollModal,
  onPollVote, //  FIX: Pasar prop de votación
  onGoToLatest, //  NUEVO: Ir al final
  chatInfo, //  FIX: Info del chat (picture, name, isOnline)
}) => {
  const { getUserColor } = useUserNameColor();
  // ============================================================
  // REFS
  // ============================================================
  const chatHistoryRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef(null); //  NUEVO: Para rastrear el último mensaje
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0); //  Guardar scrollTop para preservar posición
  const isLoadingMoreRef = useRef(false); //  Bandera de carga en progreso
  const hasScrolledToUnreadRef = useRef(false); // Rastrear si ya hicimos scroll al primer mensaje no leído
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const messageMenuRef = useRef(null);
  const inputRef = useRef(null);
  const reactionUsersTimeoutRef = useRef(null); // Para delay del popover de reacciones

  // ============================================================
  // FUNCIÓN AUXILIAR - Detectar menciones al usuario en texto
  // ============================================================
  const hasMentionToUser = useCallback((text) => {
    if (!text || !currentUsername) return false;

    const normalizeText = (str) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].trim().toUpperCase());
    }

    const userNameUpper = normalizeText(currentUsername);
    //  FIX: También comparar contra el nombre completo del usuario (nombre + apellido)
    const userFullNameUpper = (user?.nombre && user?.apellido)
      ? normalizeText(`${user.nombre} ${user.apellido}`)
      : null;

    return mentions.some(mention =>
      userNameUpper.includes(mention) || mention.includes(userNameUpper) ||
      (userFullNameUpper && (userFullNameUpper.includes(mention) || mention.includes(userFullNameUpper)))
    );
  }, [currentUsername, user]);

  // ============================================================
  // FUNCIÓN AUXILIAR - Detectar menciones en hilos
  // ============================================================
  const hasThreadMention = useCallback((message) => {
    // Si no hay respuestas en el hilo, no hay menciones
    if (!message.threadCount || message.threadCount === 0) {
      return false;
    }

    //  NUEVO: Si el mensaje tiene la marca de menciones pendientes, mostrar punto rojo
    if (message.hasUnreadThreadMentions) {
      return true;
    }

    //  CRÍTICO: Solo mostrar punto rojo si hay mensajes NO LEÍDOS en el hilo
    if (!message.unreadThreadCount || message.unreadThreadCount === 0) {
      return false; // No hay mensajes sin leer en el hilo, no mostrar punto rojo
    }

    // Verificar si el último mensaje del hilo contiene una mención
    if (message.lastReplyText) {
      return hasMentionToUser(message.lastReplyText);
    }

    return false;
  }, [hasMentionToUser]);

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
  const [hideUnreadSeparator, setHideUnreadSeparator] = useState(false);

  // ============================================================
  // ESTADOS - Pickers y menús
  // ============================================================
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showReactionUsers, setShowReactionUsers] = useState(null); // Para mostrar quién reaccionó
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showMessageInfo, setShowMessageInfo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [openReadReceiptsId, setOpenReadReceiptsId] = useState(null);
  const [loadedReadBy, setLoadedReadBy] = useState({}); // Cache de readBy cargados por messageId
  const [loadingReadBy, setLoadingReadBy] = useState(null); // ID del mensaje que está cargando readBy

  // ============================================================
  // ESTADOS - Menciones (@)
  // ============================================================
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);

  // ============================================================
  // ESTADOS - Selección múltiple (Usando Hook Personalizado)
  // ============================================================
  const {
    isSelectionMode,
    selectedMessages,
    handleEnterSelectionMode: handleEnterSelectionModeHook,
    handleToggleMessageSelection,
    handleCancelSelection,
    setIsSelectionMode,
    setSelectedMessages
  } = useMessageSelection();

  //  NUEVOS ESTADOS - Modal de reenvío
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfData, setPdfData] = useState(null); // Cambiar a pdfData (ArrayBuffer)
  const [pdfFileName, setPdfFileName] = useState(""); // NUEVO: Nombre del archivo PDF

  //  PAGINACIÓN - Modal de reenvío
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
    handleEnterSelectionModeHook();
    setShowMessageMenu(null);
  };

  //  NUEVO: Manejar Ctrl+Click (o Click en modo selección)
  const handleMessageClick = (e, message) => {
    // Si estamos en modo selección O se presiona Ctrl/Cmd
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      handleToggleMessageSelection(message.id);
      setShowMessageMenu(null); // Asegurar que se cierre el menú
    }
  };

  // const handleToggleMessageSelection = (messageId) => { ... } // Reemplazado por el hook

  // const handleCancelSelection = () => { ... } // Reemplazado por el hook

  const handleCopyList = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  //  NUEVO HANDLER - Abrir modal de reenvío
  const handleOpenForwardModal = async (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowMessageMenu(null);

    // Inicializar listas extendidas con los datos actuales
    setExtendedRooms(myActiveRooms);
    setExtendedConvs(assignedConversations);
    setForwardRoomsPage(1);
    setForwardConvsPage(1);

    //  NUEVO: Obtener totales reales del backend
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

  //  NUEVO HANDLER - Cerrar modal de reenvío
  const handleCloseForwardModal = () => {
    setShowForwardModal(false);
    setMessageToForward(null);
    // Limpiar estados de paginación
    setExtendedRooms([]);
    setExtendedConvs([]);
    setForwardRoomsPage(1);
    setForwardConvsPage(1);
  };

  //  NUEVO - Cargar más grupos para modal de reenvío
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

  //  NUEVO - Cargar más conversaciones asignadas para modal de reenvío  
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
  // EFFECT - Resetear estado al cambiar de chat
  // ============================================================
  const initialScrollDoneRef = useRef(false);

  useEffect(() => {
    setImagePreview(null);
    setShowReactionUsers(null); // Limpiar popover de reacciones al cambiar de chat
    hasScrolledToUnreadRef.current = false;
    lastMessageCountRef.current = 0;
    lastMessageIdRef.current = null; //  NUEVO: Resetear ID del último mensaje
    isLoadingMoreRef.current = false;
    firstMessageIdRef.current = null;
    initialScrollDoneRef.current = false;
    setHideUnreadSeparator(false); // Resetear al cambiar de chat
  }, [to, currentRoomCode, isGroup]);

  // ============================================================
  // EFFECT - Scroll al final cuando terminan de cargar los mensajes
  // ============================================================
  useEffect(() => {
    if (hasScrolledToUnreadRef.current) return;
    if (messages.length === 0) return;
    if (isLoadingMessages) return; // Esperar a que termine la carga
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;

    // Pequeño delay para asegurar que el DOM esté completamente renderizado
    const timeoutId = setTimeout(() => {
      if (!chatHistoryRef.current) return;
      if (hasScrolledToUnreadRef.current) return; // Verificar de nuevo

      chatHistory.scrollTop = chatHistory.scrollHeight;
      hasScrolledToUnreadRef.current = true;
      initialScrollDoneRef.current = true;
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [messages.length, isLoadingMessages]);

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
      // Para otras fechas, formatear como "Lun, 22 Dic 2025"
      const date = new Date(sentAt);
      const weekday = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "short" });
      const day = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric" });
      const month = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", month: "short" });
      const year = date.toLocaleDateString("es-PE", { timeZone: "America/Lima", year: "numeric" });
      // Capitalizar primera letra del día
      const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
      const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
      return `${weekdayCapitalized}, ${day} ${monthCapitalized} ${year}`;
    }
  };

  // Función simple para agrupar mensajes usando solo datos del backend
  //  NUEVO: También inserta separador de "X mensajes no leídos"
  const groupMessagesByDate = (messages, currentUser) => {
    //  NUEVO: Agrupar imágenes antes de procesar fechas
    const galleryGroupedMessages = groupMessagesForGallery(messages);

    const groups = [];
    let currentDateString = null;
    let unreadSeparatorInserted = false;

    //  FILTRAR DUPLICADOS POR ID (Mantenemos por si acaso, aunque gallery ya filtra algo)
    const uniqueMessages = [];
    const seenIds = new Set();

    galleryGroupedMessages.forEach(msg => {
      // Si el mensaje es una galería, lo tratamos como un bloque único
      if (msg.type === 'image-gallery') {
        uniqueMessages.push(msg);
        return;
      }

      // Si tiene ID y ya lo vimos, lo saltamos
      if (msg.id && seenIds.has(msg.id)) return;

      // Si tiene ID, lo agregamos al set
      if (msg.id) seenIds.add(msg.id);

      uniqueMessages.push(msg);
    });

    //  Contar mensajes no leídos (que no sean del usuario actual)
    //  FIX: Para grupos, verificar si el usuario está en readBy array, no solo isRead
    const isMessageReadByUser = (msg, username) => {
      //  FIX: Manejar tanto boolean true como string "true"
      if (msg.isRead === true || msg.isRead === 'true') return true;
      //  FIX: Si readByCount > 0, significa que alguien lo leyó (el mensaje fue marcado como leído)
      if (msg.readByCount && msg.readByCount > 0) return true;

      if (msg.readBy && Array.isArray(msg.readBy)) {
        return msg.readBy.some(reader =>
          (typeof reader === 'string' ? reader : reader?.username || reader?.name || '')
            .toLowerCase().trim() === username?.toLowerCase().trim()
        );
      }
      return false;
    };

    const unreadCount = uniqueMessages.filter(
      msg => msg.id && msg.sender !== currentUser && msg.sender !== "Tú" && !isMessageReadByUser(msg, currentUser)
    ).length;

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

      //  NUEVO: Insertar separador de no leídos ANTES del primer mensaje no leído
      if (
        !unreadSeparatorInserted &&
        unreadCount > 0 &&
        message.id &&
        message.sender !== currentUser &&
        message.sender !== "Tú" &&
        !isMessageReadByUser(message, currentUser)
      ) {
        groups.push({
          type: "unread-separator",
          count: unreadCount,
        });
        unreadSeparatorInserted = true;
      }

      //  FIX: Calcular isGroupStart AQUÍ usando el array filtrado correcto (uniqueMessages)
      // Esto soluciona el bug visual donde un mensaje se agrupaba incorrectamente con el anterior
      // debido a mismatch de índices con el array original 'messages'
      const prevMsg = index > 0 ? uniqueMessages[index - 1] : null;

      //  FIX: También verificar si el elemento anterior en groups es un separador de fecha
      // Si es así, el mensaje actual debe ser inicio de grupo
      const prevGroupItem = groups.length > 0 ? groups[groups.length - 1] : null;
      const isPrevItemDateSeparator = prevGroupItem && prevGroupItem.type === 'date-separator';
      const isPrevItemUnreadSeparator = prevGroupItem && prevGroupItem.type === 'unread-separator';

      const isGroupStart = !prevMsg
        || prevMsg.sender !== message.sender
        || prevMsg.type === 'info'
        || prevMsg.type === 'error'
        || isPrevItemDateSeparator  //  NUEVO: Después de separador de fecha, siempre es inicio
        || isPrevItemUnreadSeparator; //  NUEVO: Después de separador de no leídos, siempre es inicio

      groups.push({
        type: "message",
        data: message,
        index,
        isGroupStart, //  Pasamos el booleano calculado correctamente
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

    // Usar smart paste (fix Excel)
    // El 2do argumento simula el evento {target: {files}} que espera onFileSelect
    handleSmartPaste(e, (simulatedEvent) => {
      onFileSelect(simulatedEvent);
    }, null); // No necesitamos setInput aquí porque el navegador maneja el texto por defecto
  };

  // ============================================================
  // HANDLERS - Edición de mensajes
  // ============================================================
  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    // Usar message.message como fallback si message.text no existe (común en mensajes de audio/archivos)
    setEditText(message.text || message.message || "");
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
  // EFFECT - Limpiar estado de edición al cambiar de chat
  // ============================================================
  useEffect(() => {
    // Limpiar estado de edición cuando cambia el chat actual
    if (editingMessageId) {
      handleCancelEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, currentRoomCode]); // Se ejecuta cuando cambia el destinatario o la sala

  // ============================================================
  // HANDLER - Input de texto y menciones
  // ============================================================
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(value);

    // Limpiar contador de mensajes no leídos y ocultar separador cuando el usuario empieza a escribir
    if (value.length === 1) {
      if (onClearUnreadOnTyping) onClearUnreadOnTyping();
      setHideUnreadSeparator(true);
    }

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
        conversationId: conversationId //  Enviar ID para filtrado preciso
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
    const getBestName = (u) => {
      if (!u || typeof u !== 'object') return null;
      const dn = (u.displayName || '').trim();
      const nombreApellido = ((u.nombre || u.apellido) ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : '');
      if (dn && !/^\d+$/.test(dn)) return dn;
      if (nombreApellido && !/^\d+$/.test(nombreApellido)) return nombreApellido;
      const alt = (u.fullName || u.fullname || u.name || '').trim();
      if (alt && !/^\d+$/.test(alt)) return alt;
      return dn || nombreApellido || alt || '';
    };

    // El user ya viene enriquecido desde mentionSuggestions
    let resolvedName = getBestName(user);

    // Fallback: si el nombre es numérico (DNI), intentar nombre+apellido directo
    if ((!resolvedName || /^\d+$/.test(resolvedName)) && user && typeof user === 'object') {
      if (user.nombre || user.apellido) {
        resolvedName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      }
    }

    // Fallback: buscar en userList si el nombre sigue siendo numérico (DNI)
    if ((!resolvedName || /^\d+$/.test(resolvedName))) {
      const idLower = (typeof user === "string" ? user : user.username || user.id || "").toLowerCase().trim();
      // Buscar en cache persistente
      if (roomUsersNameCache) {
        const cached = roomUsersNameCache.get(idLower);
        if (cached && cached.displayName && !/^\d+$/.test(cached.displayName)) {
          resolvedName = cached.displayName;
        }
      }
      // Buscar en userList global
      if (!resolvedName || /^\d+$/.test(resolvedName)) {
        const foundGlobal = userList.find(u => (u.username || "").toLowerCase().trim() === idLower);
        if (foundGlobal) {
          const betterName = getBestName(foundGlobal);
          if (betterName && !/^\d+$/.test(betterName)) {
            resolvedName = betterName;
          }
          if ((!resolvedName || /^\d+$/.test(resolvedName)) && (foundGlobal.nombre || foundGlobal.apellido)) {
            resolvedName = `${foundGlobal.nombre || ''} ${foundGlobal.apellido || ''}`.trim();
          }
        }
      }
    }

    // Fallback final
    if (!resolvedName) {
      resolvedName = (typeof user === "string" ? user : user.username || "").trim();
    }

    const beforeMention = input.substring(0, mentionCursorPosition);
    const afterMention = input.substring(mentionCursorPosition + mentionSearch.length + 1);
    const newInput = `${beforeMention}@${resolvedName} ${afterMention}`;
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
      // Nota: ReactionPicker maneja su propio cierre con delay interno de 100ms
      // No interferir aquí ya que el ref nunca se pasa al componente hijo
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // ============================================================
  // HANDLER - Reacciones a mensajes
  // ============================================================
  const handleReaction = (message, emoji) => {
    if (!socket || !socket.connected || !currentUsername) return;

    //  Usar realSender para obtener el nombre real del usuario (no "Tú")
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
      // Pequeño delay para asegurar que el DOM esté renderizado
      const timeoutId = setTimeout(() => {
        const messageElement = document.getElementById(`message-${highlightMessageId}`);
        const chatContainer = chatHistoryRef.current;

        if (messageElement && chatContainer) {
          console.log('🔍 Scroll al mensaje:', highlightMessageId);

          //  MEJORADO: Calcular scroll manual para manejar mensajes al final
          // Posición actual del mensaje relativa al contenedor
          const messageOffsetTop = messageElement.offsetTop;
          const messageHeight = messageElement.offsetHeight;
          const containerHeight = chatContainer.clientHeight;
          const scrollHeight = chatContainer.scrollHeight;

          // Calcular posición ideal (centrado)
          const idealScrollTop = messageOffsetTop - (containerHeight / 2) + (messageHeight / 2);

          // Límites de scroll
          const maxScrollTop = scrollHeight - containerHeight;
          const minScrollTop = 0;

          //  Si el mensaje está cerca del final, el scroll ideal podría exceder el máximo
          // En ese caso, hacemos scroll al máximo para asegurar visibilidad
          let targetScrollTop = Math.max(minScrollTop, Math.min(idealScrollTop, maxScrollTop));

          //  Verificar si el mensaje quedará visible después del scroll
          const messageTopAfterScroll = messageOffsetTop - targetScrollTop;
          const messageBottomAfterScroll = messageTopAfterScroll + messageHeight;

          // Si el mensaje no queda completamente visible, ajustar
          if (messageBottomAfterScroll > containerHeight) {
            // El mensaje queda cortado abajo - ajustar para que sea visible con margen
            targetScrollTop = messageOffsetTop - containerHeight + messageHeight + 50; // 50px de margen
          } else if (messageTopAfterScroll < 0) {
            // El mensaje queda cortado arriba - ajustar
            targetScrollTop = messageOffsetTop - 50; // 50px de margen superior
          }

          // Asegurar que no exceda los límites
          targetScrollTop = Math.max(minScrollTop, Math.min(targetScrollTop, maxScrollTop));

          console.log('🔍 Scroll calculado:', {
            messageOffsetTop,
            idealScrollTop,
            targetScrollTop,
            maxScrollTop,
            containerHeight,
            scrollHeight
          });

          // Aplicar scroll suave
          chatContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });

          setHighlightedMessageId(highlightMessageId);

          // Quitar el highlight después de 5 segundos
          setTimeout(() => {
            setHighlightedMessageId(null);
            onMessageHighlighted?.();
          }, 5000);
        }
      }, 150); //  Aumentar delay ligeramente para asegurar renderizado completo

      return () => clearTimeout(timeoutId);
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

  // Función para cargar readBy bajo demanda (lazy loading)
  const loadReadByForMessage = async (messageId) => {
    //  FIX: Manejar IDs de galería sintéticos (ej. "gallery-123")
    // El backend espera un ID numérico, así que extraemos el ID real del mensaje original
    let realMessageId = messageId;
    if (typeof messageId === 'string' && messageId.startsWith('gallery-')) {
      realMessageId = messageId.replace('gallery-', '');
    }

    if (loadedReadBy[messageId]) return; // Ya está cargado (usamos la key original para cache)
    if (loadingReadBy === messageId) return; // Ya está cargando

    setLoadingReadBy(messageId);
    try {
      const result = await apiService.getMessageReadBy(realMessageId);
      setLoadedReadBy(prev => ({
        ...prev,
        [messageId]: result.readBy || [] // Guardamos con la key original para que la UI lo encuentre
      }));
    } catch (error) {
      console.error('Error al cargar readBy:', error);
    } finally {
      setLoadingReadBy(null);
    }
  };

  // Scroll automático al final para mensajes nuevos
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    //  NUEVO: No hacer scroll automático hasta que hayamos completado el scroll inicial a no leídos
    if (!hasScrolledToUnreadRef.current) return;

    //  FIX: No hacer scroll automático si estamos cargando mensajes antiguos
    if (isLoadingMore) {
      console.log('🚫 Scroll automático bloqueado: isLoadingMore = true');
      return;
    }

    const chatHistory = chatHistoryRef.current;

    //  Solo verificar si estamos cerca del final (100px de margen)
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 100;

    //  CORREGIDO: Solo hacer scroll automático si:
    // 1. Hay mensajes nuevos (no solo re-renders)
    // 2. El usuario está en la parte inferior del chat
    // 3. O si el ÚLTIMO MENSAJE (el más reciente) es NUEVO y es propio
    const lastMessage = messages[messages.length - 1];
    const isLastMessageNew = lastMessage && lastMessage.id !== lastMessageIdRef.current;
    const isLastMessageSelf = lastMessage && (lastMessage.isSelf || lastMessage.sender === 'Tú' || lastMessage.sender === currentUsername);

    //  CRÍTICO: Solo hacer scroll si es un mensaje NUEVO y propio, no si ya existía
    const shouldScroll = messages.length > lastMessageCountRef.current && (isAtBottom || (isLastMessageNew && isLastMessageSelf));

    if (shouldScroll) {
      console.log('📜 Haciendo scroll automático:', {
        prevCount: lastMessageCountRef.current,
        newCount: messages.length,
        isAtBottom,
        isLastMessageNew,
        isLastMessageSelf,
        lastMessageId: lastMessage?.id,
        prevLastMessageId: lastMessageIdRef.current,
        isLoadingMore
      });
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    lastMessageCountRef.current = messages.length;
    if (lastMessage) {
      lastMessageIdRef.current = lastMessage.id;
    }
  }, [messages, isLoadingMore, currentUsername]);

  // Scroll automático cuando aparece el indicador de "está escribiendo"
  useEffect(() => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 150;

    const someoneIsTyping =
      (!isGroup && isOtherUserTyping && typingUser) ||
      (isGroup && currentRoomCode && roomTypingUsers?.[currentRoomCode]?.length > 0);

    //  CORREGIDO: Solo hacer scroll si el usuario está cerca del final
    // Esto preserva la posición cuando lee mensajes antiguos
    if (someoneIsTyping && isAtBottom) {
      chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: "auto" });
    }
  }, [isOtherUserTyping, typingUser, roomTypingUsers, currentRoomCode, isGroup]);

  // ============================================================
  // EFFECTS - Marcar mensajes como leídos
  // ============================================================

  //  NOTA: La lógica de marcar mensajes como leídos se maneja en ChatPage.jsx
  // usando markRoomMessagesAsRead (bulk) para evitar múltiples emisiones de socket.
  // NO usar un forEach aquí porque causa bucles cuando hay múltiples clusters.

  //  REMOVIDO: El marcado automático de chats individuales
  // Los chats 1 a 1 NO deben marcarse como leídos automáticamente al abrir
  // Solo se marcan cuando el usuario escribe (onClearUnreadOnTyping)
  // Esto es consistente con el comportamiento de WhatsApp y otros chats

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
  const firstMessageIdRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);

  const handleScroll = () => {
    if (!chatHistoryRef.current) return;

    const chatHistory = chatHistoryRef.current;
    const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 50;

    isUserScrollingRef.current = !isAtBottom;
  };

  // Usar IntersectionObserver para detectar cuando llegamos al tope
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;
    if (!chatHistoryRef.current) return;
    if (messages.length === 0) return;
    if (isLoadingMessages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Solo cargar si ya se hizo el scroll inicial (evita carga automática al entrar)
        if (entry.isIntersecting && initialScrollDoneRef.current && hasMoreMessages && !isLoadingMore && !isLoadingMoreRef.current && onLoadMoreMessages && messages.length > 0) {
          firstMessageIdRef.current = messages[0].id;
          isLoadingMoreRef.current = true;
          onLoadMoreMessages();
        }
      },
      { root: chatHistoryRef.current, threshold: 0.1 }
    );

    observer.observe(loadMoreTriggerRef.current);

    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingMore, onLoadMoreMessages, messages, isLoadingMessages]);

  // Preservar posición: Usar el mensaje ancla para restaurar posición
  useLayoutEffect(() => {
    if (!isLoadingMoreRef.current) return;
    if (isLoadingMore) return;
    if (!chatHistoryRef.current) return;
    if (!firstMessageIdRef.current) return;

    const anchorElement = document.getElementById(`message-${firstMessageIdRef.current}`);

    if (anchorElement) {
      anchorElement.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    firstMessageIdRef.current = null;
    isLoadingMoreRef.current = false;
  }, [messages, isLoadingMore]);

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

  //  NUEVO: Función para renderizar el ícono SVG según el tipo de archivo
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

    //  FIX: Trim whitespace to prevent extra newlines/spacing
    text = String(text).trim();

    // Obtener lista de usuarios válidos normalizada (sin acentos, mayúsculas, sin espacios extra)
    const normalizeText = (str) => {
      if (!str) return "";
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    };

    const validUsersSet = new Set();

    // 1. OBTENER DE roomUsers (Prop disponible)
    if (roomUsers && Array.isArray(roomUsers)) {
      roomUsers.forEach(u => {
        if (typeof u === 'string') {
          validUsersSet.add(normalizeText(u));
        } else if (typeof u === 'object') {
          if (u.displayName) validUsersSet.add(normalizeText(u.displayName));
          if (u.username) validUsersSet.add(normalizeText(u.username));
          if (u.name) validUsersSet.add(normalizeText(u.name));
          //  FIX: Agregar nombre + apellido para que menciones por nombre completo funcionen
          if (u.nombre) validUsersSet.add(normalizeText(u.nombre));
          if (u.apellido) validUsersSet.add(normalizeText(u.apellido));
          if (u.nombre && u.apellido) validUsersSet.add(normalizeText(`${u.nombre} ${u.apellido}`));
          // Fallback para nombres compuestos
          if (u.firstName && u.lastName) validUsersSet.add(normalizeText(`${u.firstName} ${u.lastName}`));
        }
      });
    }

    // 2. OBTENER DE assignedConversations (Buscando el chat actual)
    // Esto es un fallback por si roomUsers no tiene la info completa (ej: solo IDs)
    const currentChatObj = assignedConversations?.find(c => c.roomCode === currentRoomCode || c.id === currentRoomCode);

    // Prioridad: groupMetadata (si es grupo) o participants
    const participantsSource = currentChatObj?.groupMetadata?.participants || currentChatObj?.participants || [];

    participantsSource.forEach(p => {
      const possibleNames = [
        p.id?.user,
        p.notify,
        p.name,
        p.vname
      ];
      possibleNames.forEach(name => {
        if (name && typeof name === 'string') validUsersSet.add(normalizeText(name));
      });
    });

    // DEBUG: Ver qué usuarios tenemos ahora
    // console.log('🕵️‍♂️ DEBUG DATA SOURCE FINAL:', {
    //   roomUsersCount: roomUsers?.length,
    //   derivedParticipantsCount: participantsSource.length,
    //   validUsersSize: validUsersSet.size,
    //   currentRoomCode,
    //   foundChat: !!currentChatObj
    // });

    const validUsers = Array.from(validUsersSet);

    // Función para procesar menciones en un texto
    const processMentions = (inputText, keyPrefix = '') => {
      // DEBUG CRÍTICO: Ver qué tenemos
      // DEBUG CRÍTICO: Ver qué tenemos
      // console.log('🔍 processMentions INPUT:', inputText);
      // console.log('👥 validUsers:', validUsers);

      // Regex original (hasta 3 palabras)
      const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;

      const parts = [];
      let lastIndex = 0;
      let match;



      while ((match = mentionRegex.exec(inputText)) !== null) {
        const fullMatch = match[0];
        const candidateText = match[1];

        // 1. Texto previo
        if (match.index > lastIndex) {
          parts.push(inputText.substring(lastIndex, match.index));
        }

        // (ELIMINADO FILTRO EMAIL PARA SIMPLIFICAR)

        const mentionedUser = match[1].trim();
        const normalizedMention = normalizeText(mentionedUser);

        // 3. Validación: Buscamos coincidencia
        // Buscamos si hay un usuario que coincida exactamente o sea prefijo del texto capturado
        const validMatch = validUsers
          .filter(u => normalizedMention.startsWith(u))
          .sort((a, b) => b.length - a.length)[0];

        if (validMatch) {
          // Recortar texto al nombre del usuario real
          const userWordsCount = validMatch.split(/\s+/).length;
          const capturedWords = mentionedUser.split(/\s+/);

          //  FIX: Calcular el índice final exacto en el string original para preservar espacios
          // y evitar desajustes que causan caracteres repetidos.
          let endIndex = 0;
          let searchPos = 0;

          for (let i = 0; i < userWordsCount; i++) {
            const word = capturedWords[i];
            // Buscamos la palabra a partir de la última posición
            const wordIndex = mentionedUser.indexOf(word, searchPos);
            if (wordIndex !== -1) {
              searchPos = wordIndex + word.length;
              endIndex = searchPos;
            }
          }

          const finalMatchName = mentionedUser.substring(0, endIndex);
          const remainingText = mentionedUser.substring(endIndex);

          const currentUserFull = (user?.nombre && user?.apellido) ? normalizeText(`${user.nombre} ${user.apellido}`) : "";
          const isCurrentUser = normalizeText(finalMatchName) === normalizeText(currentUsername || "") ||
            (currentUserFull && normalizeText(finalMatchName) === currentUserFull);

          parts.push(
            <span
              key={`${keyPrefix}-${match.index}`}
              className={`mention-span ${isCurrentUser ? 'mention-me' : 'mention-other'}`}
              style={{
                display: "inline",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: isCurrentUser ? "700" : "500",
                fontSize: "0.95em",
                cursor: "pointer",
              }}
              title={`Mención a ${finalMatchName}`}
            >
              @{finalMatchName}
            </span>
          );

          if (remainingText) {
            parts.push(remainingText);
          }

        } else {
          parts.push(fullMatch);
        }

        lastIndex = match.index + fullMatch.length;
      }

      if (lastIndex < inputText.length) {
        parts.push(inputText.substring(lastIndex));
      }

      return parts.length > 0 ? parts : inputText;
    };



    // Dividir el texto por líneas para procesar líneas con guion
    const lines = text.split('\n');
    const result = [];

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      const startsWithDash = /^[-–—]/.test(trimmedLine);

      if (startsWithDash) {
        // Línea que empieza con guion: espaciado arriba, sangría, guion en negrita, texto justificado
        const dashMatch = trimmedLine.match(/^([-–—])\s*(.*)/);
        if (dashMatch) {
          const dash = dashMatch[1];
          const restOfLine = dashMatch[2];
          result.push(
            <div
              key={`line-${lineIndex}`}
              style={{
                marginTop: '12px',
                paddingLeft: '20px',
                textAlign: 'justify',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{dash}</span>{' '}
              {processMentions(restOfLine, `line-${lineIndex}`)}
            </div>
          );
        }
      } else {
        // Línea normal - envolver en div para alineación consistente
        const trimmedContent = line.trim();
        if (trimmedContent) {
          result.push(
            <div key={`line-${lineIndex}`}>
              {processMentions(trimmedContent, `line-${lineIndex}`)}
            </div>
          );
        } else if (lineIndex > 0) {
          // Línea vacía - agregar salto de línea
          result.push(<br key={`br-${lineIndex}`} />);
        }
      }
    });

    return result.length > 0 ? result : text;
  };

  // ============================================================
  // FUNCIÓN DE RENDERIZADO - Vista previa de mensaje (para info)
  // ============================================================
  const renderMessagePreview = (message) => {
    if (!message) return null;

    const messageText = message.text || message.message || "";

    // Si tiene attachments (imágenes, videos, archivos)
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];

      if (attachment.type === 'image') {
        return (
          <div>
            <img
              src={attachment.url}
              alt="Preview"
              style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
            />
            {messageText && <p style={{ marginTop: '8px', fontSize: '14px' }}>{messageText}</p>}
          </div>
        );
      }

      if (attachment.type === 'video') {
        return (
          <div>
            <video
              src={attachment.url}
              style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
              controls
            />
            {messageText && <p style={{ marginTop: '8px', fontSize: '14px' }}>{messageText}</p>}
          </div>
        );
      }

      if (attachment.type === 'audio') {
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFileAudio size={24} color="#00a884" />
              <span style={{ fontSize: '14px' }}>Audio</span>
            </div>
            {messageText && <p style={{ marginTop: '8px', fontSize: '14px' }}>{messageText}</p>}
          </div>
        );
      }

      // Otros archivos
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaFileAlt size={24} color="#00a884" />
            <span style={{ fontSize: '14px' }}>{attachment.name || 'Archivo'}</span>
          </div>
          {messageText && <p style={{ marginTop: '8px', fontSize: '14px' }}>{messageText}</p>}
        </div>
      );
    }

    // Si es una encuesta
    if (message.type === 'poll' || message.poll) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPoll size={20} color="#00a884" />
          <span style={{ fontSize: '14px' }}>📊 Encuesta</span>
        </div>
      );
    }

    // Mensaje de texto normal
    return (
      <p style={{ margin: 0, fontSize: '14px', wordBreak: 'break-word' }}>
        {messageText}
      </p>
    );
  };

  // ============================================================
  // FUNCIÓN DE RENDERIZADO - Mensaje individual
  // ============================================================
  const renderMessage = (message, index, isGroupStartProp) => {
    // --- Preparación de datos ---
    const isOwnMessage = message.isSelf !== undefined
      ? message.isSelf
      : message.sender === "Tú" || message.sender === currentUsername;

    //  FIX: Resolver el nombre de display del sender (DNI → nombre completo)
    const senderDisplayName = (() => {
      const raw = message.sender || message.from;
      if (!raw || raw === "Tú") return raw;
      // Si ya es un nombre (contiene espacios), usarlo directamente
      if (raw.includes(" ")) return raw;
      // Buscar en roomUsers por username (DNI)
      if (roomUsers && Array.isArray(roomUsers)) {
        const found = roomUsers.find(u => u && typeof u === 'object' && u.username === raw);
        if (found && found.nombre && found.apellido) {
          return `${found.nombre} ${found.apellido}`.trim();
        }
        if (found && found.displayName) return found.displayName;
      }
      // Fallback a realSender si existe
      if (message.realSender) return message.realSender;
      return raw;
    })();

    // Lógica de agrupación (Slack Style)
    //  FIX: Si isGroupStartProp viene definido (desde groupMessagesByDate), USARLO.
    // Si no, fallback a la lógica antigua (prop messages)
    const prevMsg = index > 0 ? messages[index - 1] : null;

    // Compara si el mensaje anterior es del mismo autor y si no es un mensaje de sistema
    const isSameGroup = (m1, m2) => {
      if (!m1 || !m2) return false;
      if (m1.type === "info" || m1.type === "error") return false;
      // Puedes agregar validación de fecha aquí si es necesario
      return m1.sender === m2.sender;
    };

    const isGroupStart = isGroupStartProp !== undefined
      ? isGroupStartProp
      : !isSameGroup(prevMsg, message);

    // Color consistente del usuario basado en su nombre
    const userColor = getUserColor(message.sender, isOwnMessage);

    //  FALLBACK ROBUSTO: Buscar foto en roomUsers si no viene en el mensaje
    let finalPicture = message.picture || message.senderPicture;
    if (!finalPicture && !isOwnMessage) {
      // 1. Buscar en roomUsers
      if (roomUsers && roomUsers.length > 0) {
        // Normalizar nombres para buscar sin problemas de mayúsculas/minúsculas
        const senderNorm = message.sender?.toLowerCase().trim();
        const foundUser = roomUsers.find(u => {
          const uName = (u.displayName || u.username || '').toLowerCase().trim();
          return uName === senderNorm || uName.includes(senderNorm) || senderNorm.includes(uName);
        });
        if (foundUser?.picture) {
          finalPicture = foundUser.picture;
        }
      }

      // 2.  Buscar en assignedConversations (si aún no tenemos foto)
      if (!finalPicture && assignedConversations) {
        const senderNorm = message.sender?.toLowerCase().trim();
        const conv = assignedConversations.find(c =>
          c.participants?.some(p => p?.toLowerCase().trim() === senderNorm)
        );
        if (conv?.picture) {
          finalPicture = conv.picture;
        }
      }

      // 3.  FIX: Fallback a chatInfo.picture (para favoritos privados que no están en assignedConversations)
      if (!finalPicture && !isGroup && chatInfo?.picture) {
        finalPicture = chatInfo.picture;
      }
    }
    // Si es propio, usar siempre user.picture si está disponible
    if (isOwnMessage && user?.picture) {
      finalPicture = user.picture;
    }

    // DEBUG: Verificar por qué falla la foto
    // if (message.picture) console.log('🖼️ Render message picture:', { id: message.id, sender: message.sender, pic: message.picture, isOwn: isOwnMessage });

    //  FIX: Generar indicador de estado (Vistos) para mensajes propios - REUTILIZABLE
    const renderStatusCheck = () => {
      if (!isOwnMessage) return null;

      const isRead = message.isRead || (message.readBy && message.readBy.length > 0);
      const color = isRead ? '#53bdeb' : '#8696a0';
      const title = isRead ? "Leído" : "Enviado";

      return (
        <span style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center', color: color, verticalAlign: 'middle' }} title={title}>
          {message.isSent === false ? (
            <span style={{ fontSize: '10px' }}>⏳</span>
          ) : (
            <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet" fill="currentColor">
              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18L11.071 1.27a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28zm3.486 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.682 8.365l-.376-.377-.19.192 1.07 1.07a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18l6.19-7.636a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28z"></path>
            </svg>
          )}
        </span>
      );
    };

    const isMenuOpen = showMessageMenu === message.id;
    const isHighlighted = String(highlightedMessageId) === String(message.id);

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

    // Videollamada (Restaurado y mejorado)
    const messageText = message.text || message.message || "";
    if (message.type === "video_call" || (typeof messageText === "string" && messageText.includes("📹 Videollamada"))) {
      // Intentar obtener el ID de la sala del mensaje o parsearlo del texto si es necesario
      // El log muestra que message.videoRoomID existe y se actualiza correctamente
      const videoRoomID = message.videoRoomID ||
        (message.metadata && message.metadata.videoRoomID) ||
        (messageText.includes("roomID=") ? messageText.split("roomID=")[1].split("&")[0] : null);

      // Si no tenemos ID, no mostramos el botón pero sí el mensaje
      return (
        <div
          key={index}
          className={`message-row ${isGroupStart ? 'group-start' : ''} ${isOwnMessage ? 'is-own' : ''} ${isHighlighted ? 'highlighted-message' : ''}`}
          id={`message-${message.id}`}
        >
          <div className="message-content video-call-message" style={{
            backgroundColor: '#222e35',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '250px',
            maxWidth: '320px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', width: '100%', justifyContent: 'center' }}>
              <div style={{
                backgroundColor: '#00a884',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M14 6v12H6V6h8zM4 4v16h12V4H4zm14 3.5l4-2.5v14l-4-2.5V7.5z"></path></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Videollamada Grupal</div>
                <div style={{ fontSize: '12px', color: '#cfd8dc' }}>{isOwnMessage ? 'Iniciaste una llamada' : 'Llamada entrante'}</div>
              </div>
            </div>

            {videoRoomID && (
              <button
                style={{
                  backgroundColor: '#00a884',
                  color: 'white',
                  border: 'none',
                  padding: '8px 0',
                  borderRadius: '24px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => window.open(`/video-call?roomID=${videoRoomID}&username=${currentUsername}`, '_blank')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#008f6f'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#00a884'}
              >
                UNIRSE A LA LLAMADA
              </button>
            )}

            <div style={{ fontSize: '10px', marginTop: '8px', color: 'rgba(255,255,255,0.6)', alignSelf: 'flex-end' }}>
              {formatTime(message.createdAt || message.time)}
            </div>
          </div>
        </div>
      );
    }

    // ============================================================
    // 2. RENDERIZADO (ROW LAYOUT - TIPO SLACK)
    // ============================================================

    // Detectar si el mensaje contiene una mención al usuario actual
    const normalizeText = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const currentUserFullNameForMention = (user?.nombre && user?.apellido)
      ? `${user.nombre} ${user.apellido}` : null;
    const messageContainsMention = currentUsername && messageText &&
      messageText.includes("@") && (
        normalizeText(messageText).includes(normalizeText(`@${currentUsername}`)) ||
        (currentUserFullNameForMention && normalizeText(messageText).includes(normalizeText(`@${currentUserFullNameForMention}`)))
      );

    // if (isHighlighted) console.log('🎨 Rendering highlight for message:', message.id);

    return (
      <div
        key={message.id || index}
        className={`message-row ${isGroupStart ? 'group-start' : ''} ${isOwnMessage ? 'is-own' : ''} ${isHighlighted ? 'highlighted-message' : ''} ${messageContainsMention ? 'message-mentioned' : ''}`}

        id={`message-${message.id}`}
        style={{
          backgroundColor: isHighlighted ? 'rgba(255, 235, 59, 0.4)' : 'transparent',
          boxShadow: isHighlighted ? '0 0 10px rgba(255, 235, 59, 0.8)' : 'none', // Refuerzo visual
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
          zIndex: isMenuOpen || isHighlighted ? 100 : 1, // Elevar z-index si está resaltado
          // marginBottom: '0px', // REMOVED: Dejar que CSS controle esto
          // paddingBottom: '0px', // REMOVED: Dejar que CSS controle esto
          cursor: (isSelectionMode || 'pointer') // Mostrar puntero si se puede seleccionar (?) - Mejor dejar default
        }}
        onClick={(e) => handleMessageClick(e, message)} //  NUEVO: Click handler para selección
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
                    //  CORRECCIÓN ROBUSTA: Usar finalPicture calculado
                    background: finalPicture
                      ? `url('${finalPicture}') center/cover`
                      : "linear-gradient(135deg, #dc2626 0%, #dc2626 100%)",
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '14px'
                  }}
                >
                  {/* Lógica para mostrar inicial si no hay foto */}
                  {!finalPicture && (
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
                {senderDisplayName} {getSenderSuffix(message)}
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
                {/* PREVIEW DE RESPUESTA ESTILO WHATSAPP CON SOPORTE VISUAL */}
                {message.replyToMessageId && (() => {
                  // Buscar el mensaje original para obtener mediaData
                  const originalMsg = messages.find(m => m.id === message.replyToMessageId);
                  const hasMedia = originalMsg?.mediaData || originalMsg?.mediaType;

                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();

                        // Siempre delegar al padre para manejar resaltado y scroll consistente
                        if (onMessageHighlighted) {
                          onMessageHighlighted(message.replyToMessageId);
                        } else {
                          // Fallback por si la prop no existe
                          const el = document.getElementById(`message-${message.replyToMessageId}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'auto', block: 'center' });
                          }
                        }
                      }}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        borderLeft: '4px solid #00a884', // Color verde WhatsApp
                        display: 'flex',
                        flexDirection: hasMedia ? 'row' : 'column',
                        gap: hasMedia ? '6px' : '2px',
                        position: 'relative',
                        overflow: 'hidden',
                        alignItems: hasMedia ? 'center' : 'flex-start',
                        maxHeight: '60px'
                      }}
                    >
                      {/* Contenido de texto */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          color: '#00a884', // Mismo color del borde
                          fontSize: '12px',
                          fontWeight: 'bold',
                          lineHeight: '1.2'
                        }}>
                          {(() => {
                            const senderName = originalMsg ? originalMsg.realSender : message.replyToSender;

                            const normalize = (txt) => txt ? String(txt).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

                            // Si el sender es "Tú" o coincide con mi usuario, mostrar "Tú"
                            const isMe = normalize(senderName) === normalize(currentUsername) || senderName === 'Tú';

                            return isMe ? 'Tú' : senderName || 'Usuario';
                          })()}
                        </span>
                        <span style={{
                          color: '#54656f',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.2'
                        }}>
                          {message.replyToText || originalMsg?.text || originalMsg?.message || originalMsg?.fileName || "Mensaje original"}
                        </span>
                      </div>

                      {/* Vista previa de media (si existe) */}
                      {hasMedia && originalMsg && (
                        <div style={{ flexShrink: 0 }}>
                          {originalMsg.mediaType === 'image' ? (
                            // Miniatura de imagen
                            <img
                              src={originalMsg.mediaData}
                              alt="preview"
                              style={{
                                width: '32px',
                                height: '32px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid rgba(0, 0, 0, 0.1)'
                              }}
                            />
                          ) : originalMsg.mediaType === 'video' && !/\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(originalMsg.fileName || "") ? (
                            // Miniatura de video con ícono de play
                            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                              <video
                                src={originalMsg.mediaData}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '16px',
                                height: '16px',
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <div style={{
                                  width: 0,
                                  height: 0,
                                  borderLeft: '4px solid white',
                                  borderTop: '3px solid transparent',
                                  borderBottom: '3px solid transparent',
                                  marginLeft: '1px'
                                }} />
                              </div>
                            </div>
                          ) : (originalMsg.mediaType === 'audio' || (originalMsg.mediaType === 'video' && /\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(originalMsg.fileName || ""))) ? (
                            // Ícono de audio
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#e1f4d6',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                                <path d="M9 18V5l12-2v13M9 13l12-2" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                              </svg>
                            </div>
                          ) : (
                            // Ícono de archivo genérico
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#f0f0f0',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(0, 0, 0, 0.1)'
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                <polyline points="13 2 13 9 20 9" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* CONTENIDO REAL (Texto, Imagen, Video, Archivo) */}
                {/* RENDERIZADO DE ADJUNTOS (NUEVO FORMATO PERSISTENTE) */}
                {(message.attachments && message.attachments.length > 0) ? (
                  <>
                    {/* Mostrar texto si lo hay */}
                    {(message.text || message.message) && (
                      <div style={{ marginBottom: '4px' }}>
                        {renderTextWithMentions(message.text || message.message)}
                      </div>
                    )}

                    {/* SEPARAR IMÁGENES DE ARCHIVOS */}
                    {(() => {
                      const imageAttachments = message.attachments.filter(att =>
                        att.mediaType === 'image' ||
                        (!att.mediaType && (att.url || att.mediaData)?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                      );
                      const fileAttachments = message.attachments.filter(att => !imageAttachments.includes(att));

                      return (
                        <>
                          {/* 1. Renderizar Imágenes en Grid */}
                          {imageAttachments.length > 0 && (
                            <ImageGalleryGrid
                              items={imageAttachments}
                              onImageClick={(item) => {
                                const index = imageAttachments.indexOf(item);
                                openImagePreview(imageAttachments, index);
                              }}
                              onReply={(attachment) => {
                                if (window.handleReplyMessage) {
                                  window.handleReplyMessage(message, attachment);
                                }
                              }}
                              onOpenThread={(attachment) => {
                                if (onOpenThread) onOpenThread(message, attachment);
                              }}
                            />
                          )}

                          {/* 2. Renderizar Archivos como Lista */}
                          {fileAttachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: imageAttachments.length > 0 ? '8px' : '0' }}>
                              {fileAttachments.map((file, fIdx) => {
                                const isPdf = file.fileName?.toLowerCase().endsWith('.pdf') || (file.mediaType === 'application/pdf');
                                const fileUrl = file.url || file.mediaData;

                                return (
                                  <div
                                    key={fIdx}
                                    className="wa-file-card"
                                    onClick={() => {
                                      if (isPdf) {
                                        // console.log("📥 Visualizando PDF:", fileUrl);
                                        // Si es una URL remota, intentar descargarla
                                        if (fileUrl && fileUrl.startsWith('http')) {
                                          apiService.fetchWithAuth(fileUrl)
                                            .then(res => {
                                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                              return res.arrayBuffer();
                                            })
                                            .then(arrayBuffer => {
                                              setPdfData(arrayBuffer);
                                              setPdfFileName(file.fileName || "documento.pdf"); // Guardar nombre
                                              setShowPdfViewer(true);
                                            })
                                            .catch(err => {
                                              // console.error("❌ Error loading PDF:", err);
                                              handleDownload(fileUrl, file.fileName);
                                            });
                                        } else {
                                          // Si es base64 o local
                                          handleDownload(fileUrl, file.fileName);
                                        }
                                      } else {
                                        handleDownload(fileUrl, file.fileName);
                                      }
                                    }}
                                  >
                                    <div className="wa-file-icon">{renderFileIcon(file.fileName)}</div>
                                    <div className="wa-file-info">
                                      <div className="wa-file-name">{file.fileName || 'Archivo adjunto'}</div>
                                      <div className="wa-file-meta">
                                        {formatFileSize(file.fileSize)} • {isPdf ? 'Click para ver' : 'Click para descargar'}
                                      </div>
                                    </div>

                                    {/* Footer para Archivos - SIN READER */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'flex-end',
                                      alignItems: 'center',
                                      marginTop: '2px',
                                      paddingRight: '6px',
                                      paddingBottom: '2px',
                                      fontSize: '11px',
                                      color: '#8696a0'
                                    }}>
                                      {formatTime(message.time)}
                                    </div>

                                    <div className="wa-download-icon" onClick={(e) => {
                                      e.stopPropagation(); // Evitar abrir el visor
                                      handleDownload(fileUrl, file.fileName);
                                    }}>
                                      <FaDownload />
                                    </div>
                                    <div className="wa-reply-icon-small" title="Responder a este archivo" onClick={(e) => {
                                      e.stopPropagation(); // Evitar abrir el visor
                                      if (window.handleReplyMessage) {
                                        window.handleReplyMessage(message, file);
                                      }
                                    }}>
                                      <FaReply size={14} />
                                    </div>
                                    {file.threadCount > 0 && (
                                      <div className="wa-thread-icon-small" title="Ver hilo" onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenThread) onOpenThread(message, file);
                                      }}>
                                        <span className="wa-thread-count">{file.threadCount}</span>
                                        <FaComments size={14} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}

                  </>
                ) : message.type === 'image-gallery' ? (
                  <ImageGalleryGrid
                    items={message.messages}
                    onImageClick={(img) => {
                      const index = message.messages.indexOf(img);
                      openImagePreview(message.messages, index);
                    }}
                    onReply={(attachment) => {
                      if (window.handleReplyMessage) {
                        window.handleReplyMessage(message, attachment);
                      }
                    }}
                    onOpenThread={(attachment) => {
                      if (onOpenThread) onOpenThread(message, attachment);
                    }}
                  />

                ) : message.type === 'poll' ? (
                  <PollMessage
                    poll={(() => {
                      // Intentar recuperar poll data desde mediaData (persistencia) o usar message directamente (socket en vivo)
                      let pollData = message.poll || message;
                      if (message.mediaData && typeof message.mediaData === 'string' && message.mediaData.startsWith('{')) {
                        try {
                          pollData = JSON.parse(message.mediaData);
                        } catch (e) {
                          // console.error('Error parsing poll mediaData:', e);
                        }
                      }
                      return pollData;
                    })()}
                    onVote={onPollVote}
                    currentUsername={currentUsername || user?.username}
                    messageId={message.id}
                  />
                ) : message.mediaType === 'image' ? (
                  <>
                    {/*  FIX: Mostrar texto del mensaje ADEMÁS de la imagen */}
                    {(message.text || message.message) && (
                      <div style={{ marginBottom: '8px' }}>
                        {renderTextWithMentions(message.text || message.message)}
                      </div>
                    )}
                    <ImageGalleryGrid
                      items={[{
                        id: message.id,
                        mediaData: message.mediaData,
                        url: message.mediaData,
                        fileName: message.fileName,
                        threadCount: message.threadCount, // Asegurar que pase threadCount
                        // ... propaga otras props si es necesario
                      }]}
                      onImageClick={() => openImagePreview([message], 0)}
                      onReply={() => {
                        if (window.handleReplyMessage) {
                          window.handleReplyMessage(message, {
                            id: message.id, // Mock attachment object for single image
                            url: message.mediaData,
                            mediaType: 'image',
                            fileName: message.fileName
                          });
                        }
                      }}
                      onOpenThread={() => {
                        if (onOpenThread) onOpenThread(message);
                      }}
                    />
                  </>
                ) : message.mediaType === 'video' && !/\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(message.fileName || "") ? (
                  <>
                    {/*  FIX: Mostrar texto del mensaje ADEMÁS del video */}
                    {(message.text || message.message) && (
                      <div style={{ marginBottom: '8px' }}>
                        {renderTextWithMentions(message.text || message.message)}
                      </div>
                    )}
                    <video
                      src={message.mediaData}
                      controls
                      style={{
                        maxWidth: '600px',
                        maxHeight: '300px',
                        width: 'auto',
                        height: 'auto',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#000'
                      }}
                    />
                  </>
                ) : (message.mediaType === 'audio' || (message.mediaType === 'video' && /\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(message.fileName || ""))) ? (
                  <>
                    {/*  FIX: Mostrar texto del mensaje ADEMÁS del audio */}
                    {(message.text || message.message) && (
                      <div style={{ marginBottom: '8px' }}>
                        {renderTextWithMentions(message.text || message.message)}
                      </div>
                    )}
                    <div style={{
                      backgroundColor: isOwnMessage ? '#e1f4d6' : '#e1f4d6',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      display: 'inline-block',
                      maxWidth: 'fit-content',
                      ...(isOwnMessage ? { borderBottomRightRadius: '4px' } : { borderBottomLeftRadius: '4px' })
                    }}>
                      <AudioPlayer
                        src={message.mediaData}
                        time={message.sentAt || message.time}
                        isOwnMessage={isOwnMessage}
                        userPicture={isOwnMessage ? user?.picture : message.senderPicture}
                        isSent={true}
                        isRead={message.isRead}
                        readBy={message.readBy}
                        senderName={message.sender}
                      />
                    </div>
                  </>
                ) : message.mediaType && message.mediaData ? (
                  // ARCHIVOS GENÉRICOS (PDF, Word, Excel, etc.)
                  <>
                    {/*  FIX: Mostrar texto del mensaje ADEMÁS del archivo */}
                    {(message.text || message.message) && (
                      <div style={{ marginBottom: '8px' }}>
                        {renderTextWithMentions(message.text || message.message)}
                      </div>
                    )}
                    {(() => {
                      const isPdf = message.fileName?.toLowerCase().endsWith('.pdf') || message.mediaData?.toLowerCase().includes('application/pdf');

                      return (
                        <div className="wa-file-card" onClick={() => {
                          if (isPdf) {
                            // console.log("📥 Descargando PDF:", message.mediaData);
                            apiService.fetchWithAuth(message.mediaData)
                              .then(res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                return res.arrayBuffer();
                              })
                              .then(arrayBuffer => {
                                // console.log("✅ PDF descargado, tamaño:", arrayBuffer.byteLength);
                                setPdfData(arrayBuffer);
                                setShowPdfViewer(true);
                              })
                              .catch(err => {
                                // console.error("❌ Error descargando PDF:", err);
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
                    })()}
                  </>
                ) : (
                  // TEXTO PLANO CON Detección de "Jumbomojis"
                  (() => {
                    const txt = message.text || message.message || "";
                    // Regex para detectar si SOLO hay emojis y espacios
                    const isJumbo = txt && txt.length < 12 && /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u.test(txt);

                    return (
                      <div style={{
                        fontSize: isJumbo ? '2.5rem' : 'inherit',
                        lineHeight: isJumbo ? '1.1' : 'inherit',
                        padding: isJumbo ? '3px 0' : '0'
                      }}>
                        {renderTextWithMentions(txt)}


                      </div>
                    );
                  })()
                )}

                {/* EDICIÓN (Indicador) */}
                {message.isEdited && <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>(editado)</span>}
              </>
            )}
          </div>

          {/* REACCIONES (Debajo del texto) */}
          {
            message.reactions && message.reactions.length > 0 && (
              <div className="reactions-row" style={{ display: 'flex', gap: '4px', marginTop: '1px', flexWrap: 'wrap', alignItems: 'center' }}>
                {Object.entries(message.reactions.reduce((acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = [];
                  acc[r.emoji].push(r.fullName || r.username); return acc;
                }, {})).map(([emoji, users]) => (
                  <div
                    key={emoji}
                    className="reaction-pill"
                    title={users.join(', ')}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(message, emoji);
                    }}
                  >
                    {emoji} <span style={{ fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>{users.length}</span>
                  </div>
                ))}
                {/* Botón "+" para agregar más reacciones (Abre directo el picker completo) */}
                <AddReactionButton
                  onClick={() => {
                    // Abrir directamente el picker global
                    setShowEmojiPicker(true);
                    window.currentReactionMessage = message;
                  }}
                />
              </div>
            )
          }
          {/*  HILO CON AVATARES (VERSIÓN FINAL A PRUEBA DE FALLOS)  */}
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
                    if (onOpenThread) {
                      // Pasar mensaje ORIGINAL a ChatLayout (él hará la actualización de unreadThreadCount Y llamará markThreadAsRead)
                      onOpenThread(message);
                    }
                  }}
                  title="Ver hilo"
                  style={{ position: 'relative', overflow: 'visible' }}
                >
                  <div className="thread-icon-wrapper">
                    <div style={{
                      color: message.unreadThreadCount > 0 ? '#10b981' : '#54656f',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative' //  NUEVO: Para posicionar el punto rojo
                    }}>
                      <div className="_indicator-icon_133tf_26" style={{ width: '100%', height: '100%' }} data-indicator={message.unreadThreadCount > 0 ? "success" : "default"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 24 24"><path d="M4 3h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6l-2.293 2.293c-.63.63-1.707.184-1.707-.707V5a2 2 0 0 1 2-2Zm3 7h10a.97.97 0 0 0 .712-.287A.967.967 0 0 0 18 9a.967.967 0 0 0-.288-.713A.968.968 0 0 0 17 8H7a.968.968 0 0 0-.713.287A.968.968 0 0 0 6 9c0 .283.096.52.287.713.192.191.43.287.713.287Zm0 4h6c.283 0 .52-.096.713-.287A.968.968 0 0 0 14 13a.968.968 0 0 0-.287-.713A.968.968 0 0 0 13 12H7a.967.967 0 0 0-.713.287A.968.968 0 0 0 6 13c0 .283.096.52.287.713.192.191.43.287.713.287Z"></path></svg>
                      </div>
                      {/*  PUNTO ROJO: Solo para menciones */}
                      {hasThreadMention(message) && (
                        <div
                          className="absolute top-0 right-0 rounded-full bg-red-600 border-2 border-white"
                          style={{
                            width: '8px',
                            height: '8px',
                            transform: 'translate(25%, -25%)' // Posicionar en esquina superior derecha
                          }}
                          title="Tienes menciones en este hilo"
                        />
                      )}
                      {/*  NUEVO: PUNTO VERDE para mensajes nuevos (sin menciones) */}
                      {!hasThreadMention(message) && message.unreadThreadCount > 0 && (
                        <div
                          className="absolute top-0 right-0 rounded-full border-2 border-white"
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#10b981', // Verde
                            transform: 'translate(25%, -25%)' // Posicionar en esquina superior derecha
                          }}
                          title="Mensajes nuevos en este hilo"
                        />
                      )}
                    </div>
                  </div>

                  <span className="mx_ThreadCounter">
                    {message.threadCount} {message.threadCount === 1 ? 'respuesta' : 'respuestas'}
                  </span>

                  {/*  CAMBIO: Si hay nombre lo muestra, si no, muestra una flechita discreta */}
                  <div className="thread-vertical-line"></div>
                  {/* AVATAR MOVIDO AL LADO DEL NOMBRE */}
                  <div style={{ marginLeft: '3px', marginRight: '4px', display: 'flex', alignItems: 'center' }}>
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
                  <span className="mx_ThreadLastReply" style={{ color: getUserColor(message.lastReplyFrom, message.lastReplyFrom === currentUsername) }}>
                    {message.lastReplyFrom ? message.lastReplyFrom : "Ver"}
                  </span>
                  {/*  NUEVO: Vista previa del último mensaje del hilo - RESPONSIVO */}
                  {message.lastReplyText && (
                    <span
                      className="mx_ThreadLastReplyText"
                      title={message.lastReplyText}
                      style={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        maxWidth: '250px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      : {message.lastReplyText}
                    </span>
                  )}
                  <FaChevronRight size={10} color="#8696a0" style={{ marginLeft: '4px', flexShrink: 0 }} />
                  <span className="thread-last-reply-time" style={{ marginLeft: '8px', fontSize: '11px', color: '#8696a0' }}>
                    Última respuesta {formatTime(message.lastReplyAt || message.time)}
                  </span>
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

                {/* Picker de reacciones rápidas (Componente Reutilizable) */}
                <ReactionPicker
                  isOpen={showReactionPicker === message.id}
                  onClose={() => setShowReactionPicker(null)}
                  onSelectEmoji={(emoji) => handleReaction(message, emoji)}
                  onOpenFullPicker={() => {
                    setShowReactionPicker(null);
                    setShowEmojiPicker(true);
                    window.currentReactionMessage = message;
                  }}
                  position="left"
                />
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

                    {<button className="menu-item" onClick={() => {
                      setShowMessageInfo(message);
                      setShowMessageMenu(null);
                      // Cargar readBy bajo demanda para el modal de info
                      if (message.readByCount > 0 && !loadedReadBy[message.id]) {
                        loadReadByForMessage(message.id);
                      }
                    }}>
                      <FaInfoCircle className="menu-icon" /> Info. Mensaje
                    </button>}

                    {/*  NUEVO: Botón de Reenviar */}
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

        {/* === 🛡️ AVATARES DE LECTURA (SIDE STYLE - SIEMPRE VISIBLE SI HAY LECTURA O ES MÍO) 🛡️ === */}
        {
          (message.readByCount > 0 || (isOwnMessage && (message.isRead || (message.readBy && message.readBy.length > 0)))) && (
            <div className="read-by-avatars-container">

              {/* 1. ZONA INTERACTIVA - Muestra check + contador */}
              <div
                className="read-receipts-trigger"
                style={{
                  width: 'auto',
                  padding: '2px 6px',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const newId = openReadReceiptsId === message.id ? null : message.id;
                  setOpenReadReceiptsId(newId);
                  // Cargar readBy bajo demanda cuando se abre el popover
                  if (newId && !loadedReadBy[message.id]) {
                    loadReadByForMessage(message.id);
                  }
                }}
              >
                {/* Indicador de lectura compacto */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  color: '#53bdeb',
                  fontSize: '11px'
                }}>
                  {/* Doble check azul */}
                  <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet">
                    <path fill="currentColor" d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18L11.071 1.27a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28zm3.486 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.682 8.365l-.376-.377-.19.192 1.07 1.07a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18l6.19-7.636a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28z"></path>
                  </svg>
                  {/* Contador: Mostrar solo si hay más de 0 lectores (en grupos) O si es individual al menos mostrar algo si se quiere */}
                  {(message.readByCount > 0) && <span style={{ fontWeight: '500' }}>{message.readByCount}</span>}

                  {/* Si es chat individual y está leído pero readByCount es 0 (legacy), mostrar 1 */}
                  {(!message.readByCount && message.isRead) ? <span style={{ fontWeight: '500' }}>1</span> : null}
                </div>
              </div>

              {/* 2. VENTANA FLOTANTE (POPOVER) - Carga readBy bajo demanda */}
              {openReadReceiptsId === message.id && (
                <div className="read-receipts-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="popover-header">
                    <span>{message.readByCount} {message.readByCount === 1 ? 'persona' : 'personas'}</span>
                    <button
                      className="popover-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReadReceiptsId(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="popover-list">
                    {loadingReadBy === message.id ? (
                      <div className="popover-item" style={{ justifyContent: 'center' }}>
                        <span style={{ color: '#666', fontSize: '12px' }}>Cargando...</span>
                      </div>
                    ) : (() => {
                      //  FIX: Construcción inteligente de la lista
                      let readerList = message.readByData || loadedReadBy[message.id] || message.readBy || [];

                      // Si es mensaje entrante (no mío) y está leído, YO debería estar en la lista
                      if (!isOwnMessage && (message.isRead || (message.readBy && message.readBy.length > 0))) {
                        const amIInList = readerList.some(r => {
                          const rName = (typeof r === 'object' ? (r.username || r.nombre || r.displayName || r.name) : r);
                          if (!rName) return false;
                          const rNameLower = String(rName).toLowerCase().trim();

                          // Probar con username
                          if (currentUsername && rNameLower === String(currentUsername).toLowerCase().trim()) return true;

                          // Probar con nombre completo si está disponible en 'user'
                          if (user) {
                            const userFullName = `${user.nombre || ''} ${user.apellido || ''}`.trim().toLowerCase();
                            const userDisplayName = (user.displayName || '').toLowerCase().trim();

                            if (userFullName && rNameLower === userFullName) return true;
                            if (userDisplayName && rNameLower === userDisplayName) return true;
                          }
                          return false;
                        });

                        if (!amIInList && currentUsername) {
                          // Agregarme a mí mismo visualmente
                          readerList = [...readerList, {
                            username: currentUsername,
                            nombre: user?.nombre || currentUsername,
                            apellido: user?.apellido || "",
                            picture: user?.picture
                          }];
                        }
                      }

                      //  FIX: Deduplicar la lista para evitar nombres repetidos
                      const uniqueReadersMap = new Map();

                      const getUnifiedKey = (r) => {
                        let extracted = "";
                        if (typeof r === 'object' && r !== null) {
                          extracted = r.username || r.dni || r.email || r.id || r.displayName || (r.nombre && r.apellido ? `${r.nombre} ${r.apellido}` : r.nombre) || r.name;
                        } else {
                          extracted = r;
                        }

                        if (!extracted) return "";
                        const extractedLower = String(extracted).toLowerCase().trim();

                        // Si roomUsers está disponible, buscar el usuario para obtener su identificador único maestro (username/DNI)
                        if (roomUsers && Array.isArray(roomUsers)) {
                          const u = roomUsers.find(u => {
                            const uName = (u.username || "").toLowerCase();
                            const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                            const uDisplayName = (u.displayName || "").toLowerCase();
                            return uName === extractedLower || uFull === extractedLower || uDisplayName === extractedLower || (u.email && u.email.toLowerCase() === extractedLower);
                          });
                          if (u && u.username) {
                            return u.username.toLowerCase(); // Usar siempre el username (DNI) como clave unificada
                          }
                        }

                        return extractedLower;
                      };

                      readerList.forEach(r => {
                        const keyLower = getUnifiedKey(r);

                        // Fix: si no tenemos un keyLower claro, usamos el nombre en sí (si es texto) 
                        // o stringificamos si es obj y de ahí mapeamos para no duplicar un string con otro obj
                        const mapKey = keyLower || (typeof r === 'object' && r !== null ? (r.displayName || (r.nombre && r.apellido ? `${r.nombre} ${r.apellido}` : false) || JSON.stringify(r)) : String(r)).toLowerCase().trim();

                        if (!uniqueReadersMap.has(mapKey)) {
                          uniqueReadersMap.set(mapKey, r);
                        } else {
                          // Si ya existe, nos quedamos con el objeto más rico
                          const existing = uniqueReadersMap.get(mapKey);
                          if (typeof r === 'object' && typeof existing !== 'object') {
                            uniqueReadersMap.set(mapKey, r);
                          } else if (typeof r === 'object' && typeof existing === 'object') {
                            // Merge opcional, por ahora nos quedamos con el existente
                            // si r tiene más keys podríamos pisarlo, pero con preferir object>string basta.
                          }
                        }
                      });

                      const deduplicatedReaderList = Array.from(uniqueReadersMap.values());

                      // LOG PARA DEBUG
                      // console.log("--- READ RECEIPTS DEDUPLICATOR ---");
                      // console.log("Raw readerList:", readerList);
                      // console.log("Unique Readers Map:", uniqueReadersMap);
                      // console.log("Final deduplicatedReaderList:", deduplicatedReaderList);

                      return deduplicatedReaderList.length > 0 ? (
                        deduplicatedReaderList.map((readerItem, idx) => {
                          let userPic = null;
                          let fullName = "";
                          let username = "";

                          // Manejar si es objeto (readByData) o string (readBy/loadedReadBy antiguo)
                          if (typeof readerItem === 'object' && readerItem !== null) {
                            username = readerItem.username || readerItem.dni || readerItem.email || readerItem.id || "";

                            // Construir el nombre completo más adecuado
                            if (readerItem.displayName) {
                              fullName = readerItem.displayName;
                            } else if (readerItem.nombre && readerItem.apellido) {
                              fullName = `${readerItem.nombre} ${readerItem.apellido}`;
                            } else if (readerItem.name) {
                              fullName = readerItem.name;
                            } else {
                              fullName = readerItem.nombre || username;
                            }

                            userPic = readerItem.picture;
                          } else {
                            username = readerItem;
                            fullName = readerItem;
                          }

                          // Intentar enriquecer con roomUsers si falta info (fallback)
                          if (!userPic || !fullName || fullName === username) {
                            const searchName = username?.toLowerCase().trim();
                            if (roomUsers && Array.isArray(roomUsers)) {
                              const u = roomUsers.find(u => {
                                const uName = (u.username || "").toLowerCase();
                                const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                                const uDisplayName = (u.displayName || "").toLowerCase();
                                return uName === searchName || uFull === searchName || uDisplayName === searchName || (u.email && u.email.toLowerCase() === searchName) || (u.id && String(u.id) === searchName);
                              });
                              if (u) {
                                userPic = u.picture || userPic;
                                fullName = u.displayName || (u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : (u.username || fullName));
                              }
                            }
                          }

                          // Si después de todo sigue siendo el DNI (números), intentar resolverlo a nivel de aplicación (para chats individuales/asignados)
                          if (resolveDisplayName && (/^\d+$/.test(fullName) || fullName === username)) {
                            const resolvedName = resolveDisplayName(String(username).trim(), roomUsers, userList);
                            if (resolvedName && resolvedName !== username) {
                              fullName = resolvedName;
                            }
                          }

                          return (
                            <div key={idx} className="popover-item">
                              <div className="popover-avatar">
                                {userPic ? <img src={userPic} alt={fullName} /> : <span className="popover-avatar-initial">{fullName ? fullName.charAt(0).toUpperCase() : "?"}</span>}
                              </div>
                              <div className="popover-info">
                                <div className="popover-name">{fullName}</div>
                                <div className="popover-status">Visto</div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="popover-item" style={{ justifyContent: 'center' }}>
                          <span style={{ color: '#999', fontSize: '12px' }}>Sin información</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div >
    );
  };

  //  NUEVO: Función centralizada para abrir vista previa de imagen con soporte para galerías
  const openImagePreview = useCallback((items, index) => {
    if (!items || index < 0 || index >= items.length) return;

    const item = items[index];
    const url = item.url || item.mediaData;

    setImagePreview({
      url,
      fileName: item.fileName,
      items,
      currentIndex: index,
      totalCount: items.length
    });
  }, []);

  // Modal de vista previa de imagen en pantalla completa
  const imageViewProps = {
    imagePreview,
    onClose: () => setImagePreview(null),
    onDownload: handleDownload,
    onNext: (imagePreview?.items && imagePreview.currentIndex < imagePreview.items.length - 1)
      ? () => openImagePreview(imagePreview.items, imagePreview.currentIndex + 1)
      : null,
    onPrev: (imagePreview?.items && imagePreview.currentIndex > 0)
      ? () => openImagePreview(imagePreview.items, imagePreview.currentIndex - 1)
      : null,
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
        onWheel={(e) => {
          //  FIX: Permitir cargar mensajes anteriores con rueda del mouse
          // incluso si no hay suficiente contenido para scroll (overflow)
          if (e.deltaY < 0 && chatHistoryRef.current && chatHistoryRef.current.scrollTop === 0) {
            if (hasMoreMessages && !isLoadingMore) {
              onLoadMoreMessages();
            }
          }
        }}
      >
        {/*  Mostrar spinner de carga inicial */}
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
            {/* Elemento invisible para detectar scroll al tope */}
            <div ref={loadMoreTriggerRef} style={{ height: '1px' }} />

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
              ),
              currentUsername //  NUEVO: Pasar usuario actual para detectar mensajes no leídos
            ).map((item, idx) => {
              if (item.type === "date-separator") {
                return (
                  <div key={`date-${idx}`} className="date-separator">
                    <div className="date-separator-content">{item.label}</div>
                  </div>
                );
              } else if (item.type === "unread-separator" && !hideUnreadSeparator) {
                //  NUEVO: Separador de mensajes no leídos estilo WhatsApp
                // Se oculta cuando el usuario empieza a escribir
                return (
                  <div key={`unread-${idx}`} className="unread-separator" id="unread-separator">
                    <div className="unread-separator-content">
                      {item.count === 1
                        ? "1 mensaje no leído"
                        : `${item.count} mensajes no leídos`}
                    </div>
                  </div>
                );
              } else if (item.type === "unread-separator" && hideUnreadSeparator) {
                // No renderizar nada si está oculto
                return null;
              } else {
                return renderMessage(item.data, item.index, item.isGroupStart);
              }
            })}

            {/*  BOTÓN PARA CARGAR MENSAJES MÁS RECIENTES (FORWARD PAGINATION) */}
            {hasMoreAfter && (
              <div
                className="load-more-container" // Reutilizamos clase
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '10px 0',
                  gap: '10px',
                  zIndex: 5
                }}
              >
                <button
                  className="load-more-btn" // Reutilizamos clase
                  onClick={onLoadMoreMessagesAfter}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <span className="loading-spinner"></span>
                      Cargando recientes...
                    </>
                  ) : (
                    <>
                      <span className="load-icon" style={{ transform: 'rotate(180deg)' }}>
                        <FaChevronUp />
                      </span>
                      Cargar mensajes recientes
                    </>
                  )}
                </button>

                {/* BOTÓN IR AL FINAL */}
                <button
                  className="load-more-btn"
                  onClick={onGoToLatest}
                  title="Ir a los últimos mensajes"
                >
                  <FaArrowDown />
                  Ir al final
                </button>
              </div>
            )}

            {/* ===  INDICADOR DE "ESTÁ ESCRIBIENDO"  === */}
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

      {/* Emoji Picker Global para Reacciones completas */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            borderRadius: '12px'
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            width={320}
            height={400}
            searchPlaceholder="Buscar emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <ChatInput
        value={editingMessageId ? editText : input}
        onChange={editingMessageId ? (e) => setEditText(e.target.value) : handleInputChange}
        onSend={editingMessageId ? handleSaveEdit : onSendMessage}
        onKeyDown={handleKeyPress}
        placeholder="Escribe un mensaje"
        disabled={isRecordingLocal || isRecording || isUploadingFile}
        canSendMessages={canSendMessages}

        /* Handlers de Archivos y Medios */
        onFileSelect={onFileSelect}
        onEmojiClick={handleEmojiClick}
        onSendAudio={onSendVoiceMessage}
        mediaFiles={mediaFiles}
        mediaPreviews={mediaPreviews}
        onRemoveMediaFile={onRemoveMediaFile}
        onCancelMediaUpload={onCancelMediaUpload}

        /* Estados de Carga */
        isUploading={isUploadingFile}
        isSending={isSending}
        isRecording={isRecording || isRecordingLocal}

        /* Respuesta y Edición */
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessageId ? messages.find(m => m.id === editingMessageId) : null}
        editText={editText}
        onEditTextChange={setEditText}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        isEditingLoading={isEditingLoading}

        /* Refs */
        inputRef={inputRef}

        /* Grabación (Sync de estado local) */
        onRecordingStart={() => setIsRecordingLocal(true)}
        onRecordingStop={() => setIsRecordingLocal(false)}

        /* Paste */
        onPaste={handlePaste}

        /* Polls */
        onOpenPollModal={onOpenPollModal}

        /* Menciones */
        isGroup={isGroup}
        showMentionSuggestions={showMentionSuggestions}
        mentionSearch={mentionSearch}
        mentionSuggestions={
          /* Enriquecer roomUsers con cache + userList y filtrar por búsqueda */
          isGroup && roomUsers
            ? roomUsers.map((user) => {
              if (typeof user === 'string' || !user) return user;
              // Si ya tiene displayName no-numérico, no tocar
              const dn = (user.displayName || '').trim();
              if (dn && !/^\d+$/.test(dn)) return user;
              // Intentar nombre+apellido del propio objeto
              const nombreApellido = ((user.nombre || user.apellido) ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : '');
              if (nombreApellido && !/^\d+$/.test(nombreApellido)) {
                return { ...user, displayName: nombreApellido };
              }
              const idLower = (user.username || '').toLowerCase().trim();
              // Buscar en cache persistente de displayNames
              if (roomUsersNameCache) {
                const cached = roomUsersNameCache.get(idLower);
                if (cached && cached.displayName && !/^\d+$/.test(cached.displayName)) {
                  return { ...user, displayName: cached.displayName, nombre: cached.nombre || user.nombre, apellido: cached.apellido || user.apellido, picture: user.picture || cached.picture };
                }
              }
              // Buscar en userList global
              const found = userList.find(gl => (gl.username || '').toLowerCase().trim() === idLower);
              if (found) {
                const foundDn = (found.displayName || '').trim();
                const foundNa = ((found.nombre || found.apellido) ? `${found.nombre || ''} ${found.apellido || ''}`.trim() : '');
                const bestName = (foundDn && !/^\d+$/.test(foundDn)) ? foundDn : (foundNa && !/^\d+$/.test(foundNa)) ? foundNa : null;
                if (bestName) {
                  return { ...user, displayName: bestName, picture: user.picture || found.picture };
                }
              }
              return user;
            }).filter((user) => {
              const getBestName = (u) => {
                if (!u || typeof u !== 'object') return null;
                const dn2 = (u.displayName || '').trim();
                const na2 = ((u.nombre || u.apellido) ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : '');
                if (dn2 && !/^\d+$/.test(dn2)) return dn2;
                if (na2 && !/^\d+$/.test(na2)) return na2;
                return dn2 || na2 || '';
              };

              let searchName = '';
              if (typeof user === "string") {
                searchName = user;
              } else {
                searchName = getBestName(user) || user.username || '';
              }

              if (!searchName) return false;
              return searchName.toLowerCase().includes(mentionSearch.toLowerCase())
                && searchName !== currentUsername;
            })
            : []
        }
        onMentionSelect={handleMentionSelect}
      />

      {/* Modal de Info del Mensaje (Check Azul) */}
      {showMessageInfo && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowMessageInfo(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="bg-[#00a884] p-4 flex items-center gap-3 text-white shadow-sm">
              <button
                onClick={() => setShowMessageInfo(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}
              >
                <FaArrowLeft />
              </button>
              <h3 className="font-semibold text-lg" style={{ margin: 0 }}>Info. del mensaje</h3>
            </div>

            {/* Content */}
            <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#f0f2f5]" style={{ padding: '0', background: '#f0f2f5', overflowY: 'auto' }}>
              {/* Message Preview */}
              <div className="p-4 bg-white mb-2 shadow-sm" style={{ padding: '16px', background: 'white', marginBottom: '8px' }}>
                <div className={`p-3 rounded-lg ${showMessageInfo.isSelf ? 'bg-[#d9fdd3]' : 'bg-white'} border border-gray-100 inline-block max-w-[100%]`}
                  style={{ padding: '12px', borderRadius: '8px', background: showMessageInfo.isSelf ? '#d9fdd3' : '#fff', border: '1px solid #e5e7eb', display: 'inline-block' }}>
                  {renderMessagePreview(showMessageInfo)}
                </div>
              </div>

              {/* Read By List */}
              <div className="bg-white p-4 shadow-sm min-h-[200px]" style={{ background: 'white', padding: '16px', minHeight: '200px' }}>
                <h4 className="text-xs font-bold text-[#00a884] uppercase tracking-wider mb-4 flex items-center gap-2"
                  style={{ fontSize: '12px', fontWeight: 'bold', color: '#00a884', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="text-lg" style={{ fontSize: '18px' }}>✓✓</span> Leído por
                </h4>

                <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {loadingReadBy === showMessageInfo.id ? (
                    <div className="flex justify-center p-4" style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                      <p style={{ color: '#8696a0' }}>Cargando lectores...</p>
                    </div>
                  ) : (loadedReadBy[showMessageInfo.id] && loadedReadBy[showMessageInfo.id].length > 0) ? (
                    loadedReadBy[showMessageInfo.id].map((reader, idx) => {
                      // Resolver nombre y foto
                      const readerName = typeof reader === 'string' ? reader : reader.username || reader.nombre || reader.name;
                      let userWithPic = null;
                      const readerPic = typeof reader === 'object' ? reader.picture : null;

                      // Intentar buscar foto extra en roomUsers si no viene en el objeto reader
                      if (!readerPic && roomUsers && Array.isArray(roomUsers)) {
                        const search = readerName.toLowerCase().trim();
                        userWithPic = roomUsers.find(u => {
                          const uUser = (u.username || "").toLowerCase();
                          const uFull = (u.nombre && u.apellido) ? `${u.nombre} ${u.apellido}`.toLowerCase() : "";
                          return uUser === search || uFull === search;
                        });
                      }
                      const avatarUrl = readerPic || userWithPic?.picture;

                      return (
                        <div key={idx} className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="relative" style={{ position: 'relative' }}>
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={readerName}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                onError={(e) => e.target.src = "https://ui-avatars.com/api/?name=" + readerName}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm`}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backgroundColor: getUserColor(readerName) }}>
                                {getInitials(readerName)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0" style={{ flex: 1 }}>
                            <p className="font-medium text-gray-900 truncate text-[15px] leading-tight" style={{ fontWeight: 500, color: '#111', margin: 0 }}>
                              {readerName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5" style={{ fontSize: '12px', color: '#667781', margin: '2px 0 0 0' }}>
                              {reader.readAt ? formatDate(reader.readAt) : 'Leído'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400" style={{ textAlign: 'center', padding: '32px 0', color: '#8696a0' }}>
                      <p className="text-sm">Aún nadie ha leído este mensaje</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivered Info */}
              <div className="p-4 bg-white mt-1 shadow-sm" style={{ padding: '16px', background: 'white', marginTop: '1px' }}>
                <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#8696a0", marginBottom: "8px" }}>
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





      <ImageViewer {...imageViewProps} />
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

      {/*  NUEVO: Modal de reenvío de mensajes */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={handleCloseForwardModal}
        message={messageToForward}
        myActiveRooms={extendedRooms.length > 0 ? extendedRooms : myActiveRooms}
        assignedConversations={extendedConvs.length > 0 ? extendedConvs : assignedConversations}
        user={user}
        socket={socket}
        //  Props de paginación para grupos
        roomsPage={forwardRoomsPage}
        roomsTotalPages={forwardRoomsTotalPages}
        roomsLoading={forwardRoomsLoading}
        onLoadMoreRooms={handleLoadMoreForwardRooms}
        //  Props de paginación para conversaciones
        convsPage={forwardConvsPage}
        convsTotalPages={forwardConvsTotalPages}
        convsLoading={forwardConvsLoading}
        onLoadMoreConvs={handleLoadMoreForwardConvs}
      />
      {/* VISOR DE PDF */}
      {
        showPdfViewer && pdfData && (
          <PDFViewer
            pdfData={pdfData}
            fileName={pdfFileName}
            onClose={() => {
              setShowPdfViewer(false);
              setPdfData(null);
            }}
          />
        )
      }
    </div >
  );
};

export default ChatContent;
