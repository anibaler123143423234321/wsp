import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  FaFileExcel,
  FaFileWord,
  FaFilePdf,
  FaFileAlt,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaDownload,
  FaTrash,
  FaBan,
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
import { useMessageSelection } from "../../../../hooks/useMessageSelection"; //  NUEVO: Hook de selección
import useEnterToSend from "../../../../hooks/useEnterToSend"; // NUEVO: Hook para enviar con Enter
import MessageSelectionManager from "../ChatContent/MessageSelectionManager/MessageSelectionManager"; //  NUEVO: Barra de selección
import ImageGalleryGrid from "../../../../components/ImageGalleryGrid/ImageGalleryGrid"; // Para multi-attachments

import PDFViewer from "../../../../components/PDFViewer/PDFViewer"; // Importar PDFViewer

import "./ThreadPanel.css";
import { useUserNameColor } from "../../../../components/userColors";


const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const renderFileIcon = (fileName) => {
  if (!fileName) return <FaFileAlt size={24} color="#666" />;
  const ext = fileName.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf': return <FaFilePdf size={24} color="#e74c3c" />;
    case 'doc': case 'docx': return <FaFileWord size={24} color="#3498db" />;
    case 'xls': case 'xlsx': case 'csv': return <FaFileExcel size={24} color="#2ecc71" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <FaFileImage size={24} color="#9b59b6" />;
    case 'mp4': case 'mov': case 'avi': return <FaFileVideo size={24} color="#e67e22" />;
    case 'mp3': case 'wav': case 'ogg': return <FaFileAudio size={24} color="#f1c40f" />;
    default: return <FaFileAlt size={24} color="#666" />;
  }
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

// Compara si el mensaje anterior es del mismo autor
const isSameGroup = (prevMsg, currentMsg) => {
  if (!prevMsg || !currentMsg) return false;
  // Si el mensaje previo es un separador de fecha, no es el mismo grupo
  if (prevMsg.type === "date-separator") return false;
  // Comparar el autor
  return prevMsg.from === currentMsg.from;
};

// Función para agrupar mensajes por fecha
const groupThreadMessagesByDate = (messages) => {
  const groups = [];
  let currentDateString = null;

  messages.forEach((msg, idx) => {
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

    // Obtener el elemento previo en groups
    const prevItem = groups.length > 0 ? groups[groups.length - 1] : null;

    // Verificar si es el mismo grupo que el mensaje anterior
    const sameGroup = isSameGroup(prevItem, msg);

    groups.push({
      type: "message",
      ...msg,
      isGroupStart: !sameGroup // true = mostrar avatar/nombre, false = ocultar
    });
  });

  return groups;
};

// Función para determinar el sufijo (Número de Agente o Rol)
const getSenderSuffix = (message, roomUsers) => {
  // 1. Intentar obtener datos del mensaje directo
  let agentNumber = message.senderNumeroAgente || message.agentNumber;
  let role = message.senderRole;

  // 2. Si faltan datos, buscar en roomUsers
  if ((!agentNumber || !role) && roomUsers) {
    const user = roomUsers.find(u =>
      u.username === message.from ||
      `${u.nombre} ${u.apellido}` === message.from ||
      u.username === message.sender
    );
    if (user) {
      if (!agentNumber) agentNumber = user.numeroAgente || user.agentNumber;
      if (!role) role = user.role;
    }
  }

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

  return "";
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
  userList = [], //  NUEVO: Lista global de usuarios para resolver nombres en menciones
  //  NUEVO: Props para modal de reenvío
  myActiveRooms = [],
  assignedConversations = [],
  user,
  onBackToThreadsList, //  NUEVO: Callback para volver a la lista de hilos
  onUpdateParentMessage, // 🔥 NUEVO: Callback para actualizar contador del mensaje padre
  selectedAttachment = null, // 🔥 NUEVO: Adjunto seleccionado para filtrar el hilo
  onSelectAttachment = null, // 🔥 NUEVO: Callback para cambiar a hilo de adjunto específico
}) => {
  const { getUserColor } = useUserNameColor();

  // 🔥 NUEVO: Identidad estandarizada (nombre completo) para ser consistente con ChatPage.jsx
  const currentUserFullName = useMemo(() => {
    if (!user) return currentUsername;
    const full = `${user.nombre || ""} ${user.apellido || ""}`.trim();
    return full || currentUsername;
  }, [user, currentUsername]);
  //  NUEVO: Detectar si el mensaje padre tiene un ID temporal
  const isTemporaryId = message?.id && String(message.id).startsWith('temp_');
  // if (!isOpen) return null; //  MOVIDO AL FINAL PARA RESPETAR REGLAS DE HOOKS
  const [threadMessages, setThreadMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentThreadCount, setCurrentThreadCount] = useState(
    selectedAttachment ? (selectedAttachment.threadCount || 0) : (message?.threadCount || 0)
  );
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);
  //  NUEVO: Estado para menciones
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [activeMentionRange, setActiveMentionRange] = useState(null);
  const [mentionLookupCache, setMentionLookupCache] = useState({});
  const [roomUsersFromApi, setRoomUsersFromApi] = useState([]);
  const [peopleDirectoryCache, setPeopleDirectoryCache] = useState([]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null); //  REF para el contenedor de mensajes
  const isInitialLoadRef = useRef(true); //  Bandera para primera carga
  const isUserScrollingRef = useRef(false); //  Detectar si usuario está scrolleando
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const inputHighlightRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const messageMenuRef = useRef(null); //  NUEVO: Ref para menú de opciones
  const reactionUsersTimeoutRef = useRef(null); // Para delay del popover de reacciones
  const searchedIdentifiersRef = useRef(new Set()); // 🔥 FIX API LOOP
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

  //  NUEVO: Estado para botón flotante de mensajes nuevos
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const prevThreadMessagesLengthRef = useRef(0);

  // ESTADOS para PDF Viewer
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfFileName, setPdfFileName] = useState("");

  const normalizeMentionValue = useCallback((str) => {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }, []);

  const isLikelyIdentifier = useCallback((value) => {
    if (!value) return false;
    const v = String(value).trim();
    return /^\d{6,}$/.test(v) || v.includes("@");
  }, []);

  const normalizeMentionText = useCallback((str) => {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }, []);

  const myAliasesNormalized = useMemo(() => {
    const aliases = new Set();
    const nombre = (user?.nombre || user?.firstName || "").trim();
    const apellido = (user?.apellido || user?.lastName || "").trim();

    if (currentUsername) aliases.add(normalizeMentionText(currentUsername));
    if (user?.username) aliases.add(normalizeMentionText(user.username));
    if (user?.email) aliases.add(normalizeMentionText(user.email));
    if (nombre) aliases.add(normalizeMentionText(nombre));
    if (apellido) aliases.add(normalizeMentionText(apellido));
    if (nombre && apellido) {
      aliases.add(normalizeMentionText(`${nombre} ${apellido}`));
      const firstName = nombre.split(/\s+/)[0];
      const firstLastName = apellido.split(/\s+/)[0];
      if (firstName && firstLastName) {
        aliases.add(normalizeMentionText(`${firstName} ${firstLastName}`));
      }
    }

    return Array.from(aliases).filter(Boolean);
  }, [currentUsername, user, normalizeMentionText]);

  const [persistentAliases, setPersistentAliases] = useState([]);
  useEffect(() => {
    if (myAliasesNormalized.length > 0) {
      setPersistentAliases(myAliasesNormalized);
    }
  }, [myAliasesNormalized]);

  useEffect(() => {
    if (!isOpen || !currentRoomCode) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await apiService.getRoomUsers(currentRoomCode);
        const users = Array.isArray(result)
          ? result
          : (result?.users || result?.data || []);
        if (!cancelled && Array.isArray(users)) {
          setRoomUsersFromApi(users.filter((u) => u && typeof u === "object"));
        }
      } catch {
        if (!cancelled) setRoomUsersFromApi([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentRoomCode]);

  const mentionBaseUsers = useMemo(() => {
    const base = [
      ...(Array.isArray(roomUsers) ? roomUsers : []),
      ...(Array.isArray(roomUsersFromApi) ? roomUsersFromApi : []),
    ];

    const map = new Map();
    base.forEach((u) => {
      if (!u) return;
      if (typeof u === "string") {
        const key = normalizeMentionValue(u);
        if (key && !map.has(key)) map.set(key, u);
        return;
      }
      const key = normalizeMentionValue(
        u.username ||
        u.userName ||
        u?.id?.user ||
        u.email ||
        u.correo ||
        `${u.nombre || u.firstName || ""} ${u.apellido || u.lastName || ""}`.trim()
      );
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, u);
      } else if (!map.get(key)?.nombre && u.nombre) {
        // Preferir la variante enriquecida con nombre/apellido.
        map.set(key, u);
      }
    });

    return Array.from(map.values());
  }, [roomUsers, roomUsersFromApi, normalizeMentionValue]);

  const resolveFromListByAnyKey = useCallback((list, raw) => {
    if (!Array.isArray(list) || list.length === 0 || !raw) return null;
    const rawNorm = normalizeMentionValue(raw);
    return list.find((u) => {
      if (!u || typeof u !== "object") return false;
      const firstName = (u.nombre || u.firstName || u.first_name || "").trim();
      const lastName = (u.apellido || u.lastName || u.last_name || u.apellidos || u.surname || "").trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const emailLocal = u.email ? String(u.email).split("@")[0] : "";
      const candidates = [
        u.username,
        u.userName,
        u.name,
        u.displayName,
        u.notify,
        u.vname,
        u.firstName,
        u.lastName,
        u.first_name,
        u.last_name,
        u.apellidos,
        u.surname,
        u.fullName,
        u.full_name,
        u.numeroAgente,
        u.email,
        u.correo,
        emailLocal,
        u?.id?.user,
        fullName,
      ]
        .filter(Boolean)
        .map(normalizeMentionValue);
      return candidates.includes(rawNorm);
    }) || null;
  }, [normalizeMentionValue]);

  useEffect(() => {
    if (!isOpen || !Array.isArray(mentionBaseUsers) || mentionBaseUsers.length === 0) return;

    const merged = [
      ...mentionBaseUsers.filter((u) => typeof u === "object"),
      ...(Array.isArray(userList) ? userList : []),
      ...(Array.isArray(peopleDirectoryCache) ? peopleDirectoryCache : []),
      ...Object.values(mentionLookupCache || {}),
    ];

    const identifiers = mentionBaseUsers
      .map((u) => {
        if (typeof u === "string") return u;
        if (!u || typeof u !== "object") return "";
        return u.username || u.userName || u?.id?.user || u.numeroAgente || u.email || u.correo || "";
      })
      .filter(Boolean);

    const unresolved = identifiers.filter((id) => {
      if (!isLikelyIdentifier(id)) return false;
      return !resolveFromListByAnyKey(merged, id);
    });

    if (unresolved.length === 0 || peopleDirectoryCache.length > 0) return;
    let cancelled = false;

    (async () => {
      try {
        const directory = await apiService.getUsersFromBackend(0, 500);
        if (!cancelled && Array.isArray(directory)) {
          setPeopleDirectoryCache(directory.filter((u) => u && typeof u === "object"));
        }
      } catch {
        if (!cancelled) setPeopleDirectoryCache([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    mentionBaseUsers,
    userList,
    peopleDirectoryCache,
    mentionLookupCache,
    isLikelyIdentifier,
    resolveFromListByAnyKey,
  ]);

  const getMentionDisplayName = useCallback((rawUser) => {
    if (!rawUser) return "";
    const merged = [
      ...mentionBaseUsers.filter((u) => typeof u === "object"),
      ...(Array.isArray(userList) ? userList : []),
      ...(Array.isArray(peopleDirectoryCache) ? peopleDirectoryCache : []),
      ...Object.values(mentionLookupCache || {}),
    ];

    const rawKey = typeof rawUser === "string"
      ? rawUser
      : (
        `${rawUser.nombre || rawUser.firstName || rawUser.first_name || ""} ${rawUser.apellido || rawUser.lastName || rawUser.last_name || rawUser.apellidos || ""}`.trim() ||
        rawUser.fullName ||
        rawUser.full_name ||
        rawUser.username ||
        rawUser.userName ||
        rawUser?.id?.user ||
        rawUser.email ||
        rawUser.correo ||
        rawUser.displayName ||
        rawUser.name ||
        rawUser.notify ||
        rawUser.vname ||
        rawUser.numeroAgente ||
        ""
      );

    const resolved = resolveFromListByAnyKey(merged, rawKey) || (typeof rawUser === "object" ? rawUser : null);
    const firstName = (resolved?.nombre || resolved?.firstName || resolved?.first_name || "").trim();
    const lastName = (resolved?.apellido || resolved?.lastName || resolved?.last_name || resolved?.apellidos || resolved?.surname || "").trim();
    if (firstName && lastName) return `${firstName} ${lastName}`.trim();
    if (firstName) return firstName;
    if (resolved?.fullName) return resolved.fullName;
    if (resolved?.full_name) return resolved.full_name;
    if (resolved?.displayName) return resolved.displayName;
    if (resolved?.name) return resolved.name;
    if (resolved?.notify) return resolved.notify;
    if (resolved?.vname) return resolved.vname;
    if (resolved?.username && !isLikelyIdentifier(resolved.username)) return resolved.username;
    return String(rawKey || "");
  }, [mentionBaseUsers, userList, peopleDirectoryCache, mentionLookupCache, resolveFromListByAnyKey, isLikelyIdentifier]);

  const mainMessageSenderDisplayName = useMemo(() => {
    const senderRaw = message?.fullName || message?.displayName || message?.from || message?.sender || '';
    return getMentionDisplayName(senderRaw) || senderRaw || 'Usuario';
  }, [message?.fullName, message?.displayName, message?.from, message?.sender, getMentionDisplayName]);

  const hasMentionToUser = useCallback((text) => {
    if (!text || persistentAliases.length === 0) return false;
    const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const normalizedMention = normalizeMentionText(match[1]);
      if (persistentAliases.includes(normalizedMention)) {
        return true;
      }
    }
    return false;
  }, [persistentAliases, normalizeMentionText]);

  const buildMentionOption = useCallback((rawUser) => {
    const getBestDisplayName = (candidate, rawFallback) => {
      const firstName = (candidate?.nombre || candidate?.firstName || candidate?.first_name || "").trim();
      const lastName = (candidate?.apellido || candidate?.lastName || candidate?.last_name || candidate?.apellidos || candidate?.surname || "").trim();
      if (firstName && lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      if (firstName) return firstName;
      if (candidate?.fullName) return candidate.fullName;
      if (candidate?.full_name) return candidate.full_name;

      const rawName = typeof rawFallback === "object"
        ? (
          rawFallback.displayName ||
          rawFallback.name ||
          rawFallback.notify ||
          rawFallback.vname ||
          rawFallback.fullName ||
          rawFallback.full_name ||
          rawFallback.username ||
          rawFallback?.id?.user ||
          ""
        )
        : String(rawFallback || "");

      if (rawName && !isLikelyIdentifier(rawName)) return rawName;

      return (
        candidate?.displayName ||
        candidate?.name ||
        candidate?.notify ||
        candidate?.vname ||
        candidate?.username ||
        candidate?.id?.user ||
        rawName ||
        ""
      );
    };

    const resolveFromMerged = (raw) => {
      const merged = [
        ...mentionBaseUsers.filter((u) => typeof u === "object"),
        ...(Array.isArray(userList) ? userList : []),
        ...(Array.isArray(peopleDirectoryCache) ? peopleDirectoryCache : []),
        ...Object.values(mentionLookupCache || {}),
      ];
      return resolveFromListByAnyKey(merged, raw);
    };

    if (typeof rawUser === "string") {
      const resolved = resolveFromMerged(rawUser);
      const displayName = getBestDisplayName(resolved, rawUser);
      if (!displayName) return null;
      return {
        ...(resolved || {}),
        raw: rawUser,
        username: resolved?.username || rawUser,
        displayName,
        mentionText: displayName || rawUser,
      };
    }

    if (rawUser && typeof rawUser === "object") {
      const lookupKey =
        `${rawUser.nombre || rawUser.firstName || rawUser.first_name || ""} ${rawUser.apellido || rawUser.lastName || rawUser.last_name || rawUser.apellidos || ""}`.trim() ||
        rawUser.username ||
        rawUser?.id?.user ||
        rawUser.email ||
        rawUser.correo ||
        rawUser.displayName ||
        rawUser.name ||
        rawUser.notify ||
        rawUser.vname ||
        rawUser.numeroAgente;
      const resolved = resolveFromMerged(lookupKey);
      const displayName = getBestDisplayName(resolved || rawUser, rawUser);
      if (!displayName) return null;

      return {
        ...(resolved || {}),
        ...rawUser,
        raw: rawUser,
        username: rawUser.username ?? resolved?.username,
        userName: rawUser.userName ?? resolved?.userName,
        id: rawUser.id ?? resolved?.id,
        numeroAgente: rawUser.numeroAgente ?? resolved?.numeroAgente,
        email: rawUser.email ?? resolved?.email,
        correo: rawUser.correo ?? resolved?.correo,
        nombre: rawUser.nombre ?? rawUser.firstName ?? rawUser.first_name ?? resolved?.nombre ?? resolved?.firstName ?? resolved?.first_name,
        apellido: rawUser.apellido ?? rawUser.lastName ?? rawUser.last_name ?? rawUser.apellidos ?? resolved?.apellido ?? resolved?.lastName ?? resolved?.last_name ?? resolved?.apellidos,
        displayName,
        mentionText:
          displayName ||
          rawUser.username ||
          resolved?.username ||
          rawUser?.id?.user ||
          resolved?.id?.user ||
          rawUser.email ||
          resolved?.email ||
          "",
      };
    }

    return null;
  }, [isLikelyIdentifier, mentionBaseUsers, userList, peopleDirectoryCache, mentionLookupCache, resolveFromListByAnyKey]);

  const matchesMentionSearch = useCallback((rawUser, option, term) => {
    const normalizedTerm = normalizeMentionValue(term);
    if (!normalizedTerm) return true;

    const source = typeof rawUser === "object" && rawUser ? rawUser : {};
    const firstName = (source.nombre || source.firstName || source.first_name || "").trim();
    const lastName = (source.apellido || source.lastName || source.last_name || source.apellidos || source.surname || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const emailLocal = source.email ? String(source.email).split("@")[0] : "";

    const searchables = [
      option?.displayName,
      option?.mentionText,
      option?.username,
      source.username,
      source.userName,
      source.displayName,
      source.name,
      source.notify,
      source.vname,
      source.numeroAgente,
      source.email,
      source.correo,
      source?.id?.user,
      source.firstName,
      source.lastName,
      source.first_name,
      source.last_name,
      source.apellidos,
      source.surname,
      source.fullName,
      source.full_name,
      fullName,
      emailLocal,
    ]
      .filter(Boolean)
      .map((v) => normalizeMentionValue(v));

    return searchables.some((v) => v.includes(normalizedTerm));
  }, [normalizeMentionValue]);

  useEffect(() => {
    if (!Array.isArray(mentionBaseUsers) || mentionBaseUsers.length === 0) return;

    const merged = [
      ...mentionBaseUsers.filter((u) => typeof u === "object"),
      ...(Array.isArray(userList) ? userList : []),
      ...(Array.isArray(peopleDirectoryCache) ? peopleDirectoryCache : []),
      ...Object.values(mentionLookupCache || {}),
    ];

    const identifiers = mentionBaseUsers
      .map((u) => {
        if (typeof u === "string") return u;
        if (!u || typeof u !== "object") return "";
        return u.username || u.userName || u?.id?.user || u.numeroAgente || u.email || u.correo || "";
      })
      .filter(Boolean)
      .map((v) => String(v).trim());

    const toResolve = Array.from(new Set(identifiers))
      .filter((id) => isLikelyIdentifier(id))
      .filter((id) => {
        const normId = normalizeMentionValue(id);
        if (searchedIdentifiersRef.current.has(normId)) return false;
        if (mentionLookupCache[normId]) return false;
        return !resolveFromListByAnyKey(merged, id);
      })
      .slice(0, 50);

    if (toResolve.length === 0) return;

    // 🔥 FIX: Marcar como buscado SINCRÓNICAMENTE
    toResolve.forEach(id => {
      const normId = normalizeMentionValue(id);
      searchedIdentifiersRef.current.add(normId);
    });

    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        toResolve.map(async (id) => {
          const normId = normalizeMentionValue(id);
          try {
            const list = await apiService.searchUsersFromBackend(id, 0, 10);
            if (!Array.isArray(list) || list.length === 0) return null;
            const match = resolveFromListByAnyKey(list, id) || list[0];
            return match ? [normId, match] : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const patch = {};
      resolved.forEach((r) => {
        if (r && r[0] && r[1]) patch[r[0]] = r[1];
      });
      if (Object.keys(patch).length > 0) {
        setMentionLookupCache((prev) => ({ ...prev, ...patch }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mentionBaseUsers, userList, peopleDirectoryCache, mentionLookupCache, isLikelyIdentifier, normalizeMentionValue, resolveFromListByAnyKey]);

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

  //  NUEVO: Manejar Ctrl+Click (o Click en modo selección)
  const handleMessageClick = (e, msg) => {
    // Si estamos en modo selección O se presiona Ctrl/Cmd
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      handleToggleMessageSelection(msg.id);
      setShowMessageMenu(null); // Asegurar que se cierre el menú
    }
  };

  const handleCopyList = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  // NUEVO: Estado para el visor de imágenes
  const [imagePreview, setImagePreview] = useState(null);

  const renderTextWithMentionsRobust = (text) => {
    if (!text) return text;
    const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const charBeforeMention = match.index > 0 ? text[match.index - 1] : "";
      const isPartOfEmail = /[a-zA-Z0-9._-]/.test(charBeforeMention);
      const mentionedText = match[1].toLowerCase().trim();
      const emailDomains = ["gmail", "outlook", "hotmail", "yahoo", "icloud", "live", "msn", "aol", "protonmail", "zoho"];
      const isEmailDomain = emailDomains.includes(mentionedText);

      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (isPartOfEmail || isEmailDomain) {
        parts.push(match[0]);
        lastIndex = match.index + match[0].length;
        continue;
      }

      const mentionedUser = match[1].trim();
      const normalizedMention = normalizeMentionText(mentionedUser);
      const isCurrentUser = persistentAliases.includes(normalizedMention);

      parts.push(
        <span
          key={`mention-${match.index}`}
          className={`mention-span ${isCurrentUser ? "mention-me" : "mention-other"}`}
          style={{
            display: "inline",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "500",
            fontSize: "0.95em",
            cursor: "pointer",
          }}
          title={`Menci\u00f3n a ${mentionedUser}`}
        >
          @{mentionedUser}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  //  NUEVO: Función para renderizar texto con menciones resaltadas (igual que ChatContent)
  const renderTextWithMentions = (text) => {
    if (!text) return text;
    return renderTextWithMentionsRobust(text);

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
            title={`Menci\u00f3n a ${mentionedUser}`}
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


  // Actualizar el contador cuando cambia el mensaje (SOLO si es hilo general)
  useEffect(() => {
    if (!selectedAttachment) {
      setCurrentThreadCount(message?.threadCount || 0);
    }
  }, [message?.threadCount, selectedAttachment]);

  // Scroll automático al final - SOLO si el usuario está cerca del fondo o es carga inicial
  useEffect(() => {
    if (threadMessages.length === 0) {
      prevThreadMessagesLengthRef.current = 0;
      return;
    }

    const container = messagesContainerRef.current;

    // Calcular cuántos mensajes nuevos llegaron
    const newMessagesArrived = threadMessages.length - prevThreadMessagesLengthRef.current;

    if (!container) {
      // Fallback si no hay ref del contenedor
      if (isInitialLoadRef.current) {
        scrollToBottom();
        isInitialLoadRef.current = false;
        setNewMessagesCount(0);
      }
      prevThreadMessagesLengthRef.current = threadMessages.length;
      return;
    }

    // Calcular si el usuario está cerca del fondo (dentro de 150px del final)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    // Solo hacer scroll al final si:
    // 1. Es la carga inicial, O
    // 2. El usuario ya estaba cerca del fondo
    if (isInitialLoadRef.current || isNearBottom) {
      scrollToBottom();
      isInitialLoadRef.current = false;
      setNewMessagesCount(0); // Resetear contador porque estamos abajo
    } else if (newMessagesArrived > 0 && prevThreadMessagesLengthRef.current > 0) {
      // Si llegaron mensajes nuevos y el usuario NO está abajo, incrementar contador
      setNewMessagesCount(prev => prev + newMessagesArrived);
    }

    prevThreadMessagesLengthRef.current = threadMessages.length;
  }, [threadMessages]);

  // 🔥 NUEVO: Sincronizar contador local cuando estamos en vista de adjunto
  useEffect(() => {
    if (selectedAttachment) {
      setCurrentThreadCount(threadMessages.length);
    }
  }, [threadMessages.length, selectedAttachment]);

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
        // 🔥 FILTRO: Si estamos viendo un adjunto específico, IGNORAR mensajes que no sean para este adjunto
        if (selectedAttachment && String(newMessage.replyToAttachmentId) !== String(selectedAttachment.id)) {
          console.log('🔇 ThreadPanel: Ignorando mensaje de otro contexto de adjunto', {
            msgAttachmentId: newMessage.replyToAttachmentId,
            viewAttachmentId: selectedAttachment.id
          });
          return;
        }

        // 🔥 FILTRO INVERSO: Si estamos en hilo GENERAL, ¿queremos ver respuestas a adjuntos?
        // Si el usuario dijo "se mezcló", probablemente NO quiere ver respuestas a adjuntos en el general.
        // DESCOMENTAR SI SE REQUIERE:
        /*
        if (!selectedAttachment && newMessage.replyToAttachmentId) {
           return; 
        }
        */
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

      // 🔥 FIX: Ignorar eventos sin threadCount (backend emite 2 veces)
      if (typeof data.threadCount !== 'number') {
        console.log('🚫 ThreadPanel: ignorando evento sin threadCount');
        return;
      }

      if (String(data.messageId) === String(message?.id)) {
        console.log(`🔢 ThreadPanel: procesando actualización para hilo ${data.messageId}, threadCount=${data.threadCount}`);

        // 🔥 FIX: Si estamos viendo un adjunto específico, NO actualizar el contador con el global
        // El contador local se actualizará basado en los mensajes filtrados recibidos via socket
        if (!selectedAttachment) {
          setCurrentThreadCount(data.threadCount);
        }

        // Llamar al callback para actualizar el mensaje padre
        if (onUpdateParentMessage) {
          onUpdateParentMessage(data.messageId, (prevMsg) => {
            const prevCount = prevMsg.threadCount || 0;
            const newCount = data.threadCount;
            const isIncrease = newCount > prevCount;

            console.log(`🔢 ThreadPanel UPDATE: prev=${prevCount} → new=${newCount}, isIncrease=${isIncrease}`);

            // Si no es un incremento, solo sincronizar sin incrementar unread
            if (!isIncrease) {
              return {
                ...prevMsg,
                threadCount: newCount,
                lastReplyFrom: data.lastReplyFrom,
                lastReplyText: data.lastReplyText
              };
            }

            return {
              ...prevMsg,
              threadCount: newCount,
              unreadThreadCount: (data.from !== currentUsername)
                ? (prevMsg.unreadThreadCount || 0) + 1
                : prevMsg.unreadThreadCount,
              lastReplyFrom: data.lastReplyFrom,
              lastReplyText: data.lastReplyText
            };
          });
        }
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
      // 🔥 Carga hasta 100 mensajes del hilo, opcionalmente filtrado por adjunto
      const response = await apiService.getThreadMessages(
        threadId,
        100,
        0,
        'DESC',
        selectedAttachment?.id // 🔥 Pasar ID de adjunto
      );
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
  }, [message?.id, selectedAttachment?.id]); // 🔥 FIX: Incluir selectedAttachment en dependencias

  // useEffect para cargar mensajes cuando se abre el hilo
  useEffect(() => {
    if (message?.id) {
      console.log('🔄 ThreadPanel: Recargando mensajes', { messageId: message.id, attachmentId: selectedAttachment?.id });
      // Limpiar estado para el nuevo hilo
      setThreadMessages([]);
      setTotalThreadMessages(0);
      isInitialLoadRef.current = true; //  Resetear bandera para nuevo hilo
      setNewMessagesCount(0); //  Resetear contador de mensajes nuevos
      prevThreadMessagesLengthRef.current = 0; //  Resetear ref de longitud
      loadThreadMessages();
    }
  }, [message?.id, selectedAttachment?.id, loadThreadMessages]); // 🔥 FIX: Incluir loadThreadMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  //  NUEVO: Handler para botón flotante de mensajes nuevos
  const handleNewMessagesClick = () => {
    scrollToBottom();
    setNewMessagesCount(0);
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

  const handleAttachmentReply = (attachment) => {
    // Establecer contexto de respuesta para citar el adjunto
    setReplyingTo({
      ...message,
      attachment: attachment
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
    // Resetear altura del textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
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
      const replyData = currentReplyingTo ? (() => {
        let replyToId = currentReplyingTo.id;
        if (typeof replyToId === 'string' && replyToId.startsWith('gallery-')) {
          replyToId = replyToId.replace('gallery-', '');
        }
        return {
          replyToMessageId: replyToId,
          replyToSender: currentReplyingTo.from || currentReplyingTo.sender,
          replyToText: (() => {
            const specificAttachment = currentReplyingTo.attachment;
            if (specificAttachment) {
              return specificAttachment.fileName || (specificAttachment.mediaType === 'image' ? '📷 Foto' : '📎 Archivo');
            }
            // Priorizar: texto del mensaje > nombre de archivo > emoji según tipo de medio
            if (currentReplyingTo.message || currentReplyingTo.text) {
              return currentReplyingTo.message || currentReplyingTo.text;
            } else if (currentReplyingTo.fileName) {
              return currentReplyingTo.fileName;
            } else if (currentReplyingTo.mediaType) {
              const mediaTypeMap = {
                'image': '📷 Foto',
                'video': '🎥 Video',
                'audio': '🎵 Audio',
                'file': '📎 Archivo',
                'pdf': '📄 PDF'
              };
              return mediaTypeMap[currentReplyingTo.mediaType] || "📎 Archivo adjunto";
            }
            return "Archivo adjunto";
          })(),
          replyToAttachmentId: currentReplyingTo.attachment?.id || (selectedAttachment?.id || null) // 🔥 NUEVO
        };
      })() : (selectedAttachment ? {
        // Si no hay replyingTo explícito pero estamos en un hilo de adjunto,
        // al enviar un mensaje sin citar a nadie, ¿debería asociarse al adjunto?
        // El backend usualmente espera replyToMessageId para hilos.
        replyToAttachmentId: selectedAttachment.id
      } : {});

      // Datos base del mensaje
      // DETERMINACIÓN ROBUSTA DE HILO Y GRUPO
      const resolvedThreadId = Number(message.id);
      const isGroupActual = !!(message.isGroup || currentRoomCode);

      // Para grupos: usar receiver o to del mensaje, o el roomCode como fallback
      const toValue = isGroupActual
        ? (message.receiver || message.to || currentRoomCode)
        : (message.realSender === currentUsername ? message.receiver : message.realSender);

      // Usar roomCode del mensaje si existe, sino usar currentRoomCode
      const roomCodeValue = isGroupActual ? (message.roomCode || currentRoomCode) : undefined;

      const baseMessageData = {
        threadId: resolvedThreadId,
        from: currentUsername, // 🔥 FIX: Usar username (DNI) para que la BD guarde el identificador correcto
        to: toValue,
        isGroup: isGroupActual,
        roomCode: roomCodeValue,
        ...replyData,
      };

      console.log('📤 ThreadPanel preparando mensaje:', {
        resolvedThreadId,
        isGroupActual,
        toValue,
        roomCodeValue,
        originalMessageId: message.id,
        replyToAttachmentId: baseMessageData.replyToAttachmentId // 🔥 LOG CRÍTICO
      });

      if (!resolvedThreadId || isNaN(resolvedThreadId)) {
        console.error('❌ ERROR CRÍTICO: threadId inválido al enviar respuesta!', {
          messageId: message.id,
          resolvedThreadId
        });
        // Si el ID es inválido, no podemos enviar el mensaje correctamente
        alert("Error: El ID del hilo es inválido. Por favor intenta cerrar y abrir el hilo de nuevo.");
        return;
      }

      // 🔥 REFACTORED: Subir TODOS los archivos primero, luego enviar UN solo mensaje con attachments
      if (currentMediaFiles.length > 0) {
        // 1. Subir todos los archivos en paralelo
        const uploadPromises = currentMediaFiles.map(file => apiService.uploadFile(file, "chat"));
        const uploadResults = await Promise.all(uploadPromises);

        // 2. Construir array de attachments
        const attachments = uploadResults.map((uploadResult, i) => {
          const file = currentMediaFiles[i];
          const fileType = getMediaType(file);
          return {
            type: fileType,           // Backend expects 'type'
            mediaType: fileType,      // Frontend uses 'mediaType' for rendering
            url: uploadResult.fileUrl,
            mediaData: uploadResult.fileUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
          };
        });

        // 3. Crear UN solo mensaje con todos los adjuntos
        const messageData = {
          text: currentInput,
          ...baseMessageData,
          attachments: attachments,
          // Para compatibilidad con mensajes simples (1 archivo):
          ...(attachments.length === 1 ? {
            mediaType: attachments[0].mediaType,
            mediaData: attachments[0].mediaData,
            fileName: attachments[0].fileName,
            fileSize: attachments[0].fileSize,
          } : {}),
        };

        // Enviar UN solo mensaje (esperar data final del backend/socket)
        onSendMessage(messageData);

      } else {
        // 2. Si solo es texto
        const messageData = {
          text: currentInput,
          ...baseMessageData,
        };

        // Enviar (esperar data final del backend/socket)
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

      const resolvedThreadId = Number(message.id);
      const isGroupActual = !!(message.isGroup || currentRoomCode);

      // Para grupos: usar receiver o to del mensaje, o el roomCode como fallback
      const toValue = isGroupActual
        ? (message.receiver || message.to || currentRoomCode)
        : (message.realSender === currentUsername ? message.receiver : message.realSender);

      const roomCodeValue = isGroupActual ? (message.roomCode || currentRoomCode) : undefined;

      const messageData = {
        text: "",
        threadId: resolvedThreadId,
        from: currentUsername,
        to: toValue,
        isGroup: isGroupActual,
        roomCode: roomCodeValue,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        replyToAttachmentId: selectedAttachment?.id || null // 🔥 NUEVO
      };

      console.log('🎙️ ThreadPanel preparando mensaje de voz:', {
        resolvedThreadId,
        isGroupActual,
        toValue,
        roomCodeValue
      });

      if (!resolvedThreadId || isNaN(resolvedThreadId)) {
        console.error('❌ ERROR CRÍTICO: threadId inválido al enviar audio!', {
          messageId: message.id,
          resolvedThreadId
        });
        alert("Error: El ID del hilo es inválido. Por favor intenta cerrar y abrir el hilo de nuevo.");
        return;
      }
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

    // Auto-resize del textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 300) + 'px';
    }

    // Detectar @ en la posición del cursor
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const searchTerm = atMatch[1].toLowerCase();
      setMentionSearchTerm(searchTerm);
      setActiveMentionRange({
        start: cursorPos - atMatch[0].length,
        end: cursorPos,
      });

      const primarySource = Array.isArray(mentionBaseUsers) ? mentionBaseUsers : [];
      const fallbackSource = [
        ...primarySource,
        ...(Array.isArray(roomUsers) ? roomUsers : []),
        ...(Array.isArray(roomUsersFromApi) ? roomUsersFromApi : []),
        ...(Array.isArray(userList) ? userList : []),
        ...Object.values(mentionLookupCache || {}),
      ];

      const buildFiltered = (sourceList) => sourceList
        .map((member) => ({ raw: member, option: buildMentionOption(member) }))
        .filter((x) => x.option)
        .filter((x) => matchesMentionSearch(x.raw, x.option, searchTerm))
        .map((x) => x.option)
        .sort((a, b) => {
          const aId = isLikelyIdentifier(a.displayName);
          const bId = isLikelyIdentifier(b.displayName);
          if (aId !== bId) return aId ? 1 : -1;
          return a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" });
        });

      let filtered = buildFiltered(primarySource);
      if (searchTerm.length > 0 && filtered.length === 0) {
        filtered = buildFiltered(fallbackSource);
      }

      const dedupe = new Map();
      filtered.forEach((opt) => {
        const key = normalizeMentionValue(
          opt.username || opt.mentionText || opt.displayName
        );
        if (!key || !dedupe.has(key)) dedupe.set(key, opt);
      });
      filtered = Array.from(dedupe.values()).slice(0, 30);

      setFilteredMembers(filtered);
      setShowMentionSuggestions(filtered.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setActiveMentionRange(null);
    }
  };

  const handleInputScroll = (e) => {
    if (inputHighlightRef.current) {
      inputHighlightRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const renderThreadInputWithMentions = useCallback((text) => {
    if (!text) return null;
    const mentionRegex = /@([a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+(?:\s+[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const mentionValue = match[1];
      parts.push(
        <span key={`input-mention-${match.index}`} className="thread-input-mention-highlight">
          @{mentionValue}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  }, []);

  const renderActiveMentionInInput = useCallback((text) => {
    if (!text) return null;
    if (!activeMentionRange) return text;

    const start = Math.max(0, activeMentionRange.start ?? 0);
    const end = Math.min(text.length, activeMentionRange.end ?? 0);
    if (end <= start) return text;

    return (
      <>
        {text.slice(0, start)}
        <span className="thread-input-mention-highlight">{text.slice(start, end)}</span>
        {text.slice(end)}
      </>
    );
  }, [activeMentionRange]);

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
    const username = typeof user === "object" && user?.mentionText
      ? user.mentionText
      : getMentionDisplayName(user);
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
    setActiveMentionRange(null);
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

  const handleMentionKeyDown = (e) => {
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
        setActiveMentionRange(null);
        return;
      }
    }
  };

  // Usar el hook para manejar Enter (enviar) y Shift+Enter (nueva línea)
  // Pasamos handleMentionKeyDown como lógica existente para preservar navegación de menciones
  const handleKeyDown = useEnterToSend(handleSend, handleMentionKeyDown);

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

        // 🔥 NUEVO: Emitir evento de socket para sincronizar en tiempo real
        if (socket && socket.connected) {
          socket.emit("editMessage", {
            messageId: editingMessageId,
            username: currentUsername,
            newText: editText,
            to: message.to || message.receiver,
            isGroup: !!(message.isGroup || currentRoomCode),
            roomCode: currentRoomCode || message.roomCode,
          });
        }
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

  // NUEVO: Eliminar mensaje
  const handleDeleteMessage = async (msg) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar este mensaje de ${msg.from}?`)) {
      try {
        const userRole = (user?.role || "").toUpperCase();
        const isAdminUser = ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(userRole);
        const deletedByFullName = user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : currentUsername;

        await apiService.deleteMessage(msg.id, currentUsername, isAdminUser, deletedByFullName);

        if (socket && socket.connected) {
          socket.emit("deleteMessage", {
            messageId: msg.id,
            username: currentUsername,
            to: message.to || message.receiver || msg.to,
            isGroup: !!(message.isGroup || currentRoomCode),
            roomCode: currentRoomCode || message.roomCode,
            isAdmin: isAdminUser,
            deletedBy: deletedByFullName,
          });
        }

        // Actualizar localmente
        setThreadMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, isDeleted: true, message: `Mensaje eliminado por ${deletedByFullName}`, text: `Mensaje eliminado por ${deletedByFullName}` }
              : m
          )
        );
      } catch (error) {
        console.error("Error al eliminar mensaje:", error);
        alert("Error al eliminar el mensaje. Inténtalo de nuevo.");
      }
    }
    setShowMessageMenu(null);
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
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

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

    const timeSource = msg.time || msg.sentAt;
    if (!timeSource) return "";

    // Si ya parece estar formateado (HH:mm), devolverlo
    if (typeof timeSource === 'string' && timeSource.includes(':') && !timeSource.includes('T')) {
      return timeSource;
    }

    try {
      const date = new Date(timeSource);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch (e) {
      console.error("Error formatting time:", e);
    }

    return timeSource;
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
      {/*  NUEVO: Barra de selección de mensajes - MOVIDO AL TOPE PERO DEBAJO DEL HEADER */}
      {isSelectionMode && (
        <div style={{ position: 'absolute', top: '50px', left: 0, width: '100%', zIndex: 2000 }}>
          <MessageSelectionManager
            selectedMessages={selectedMessages}
            allMessages={threadMessages}
            onCopyList={handleCopyList}
            onCancel={handleCancelSelection}
          />
        </div>
      )}

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
          <button
            className="thread-back-btn _icon-button_bh2qc_17 _subtle-bg_bh2qc_38"
            onClick={onBackToThreadsList}
            title="Volver a lista de hilos"
            role="button"
            tabIndex={0}
            style={{ '--cpd-icon-button-size': '28px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="_indicator-icon_133tf_26" style={{ '--cpd-icon-button-size': '100%', display: 'flex' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="m13.3 17.3-4.6-4.6a.877.877 0 0 1-.213-.325A1.106 1.106 0 0 1 8.425 12c0-.133.02-.258.062-.375A.878.878 0 0 1 8.7 11.3l4.6-4.6a.948.948 0 0 1 .7-.275.95.95 0 0 1 .7.275.948.948 0 0 1 .275.7.948.948 0 0 1-.275.7L10.8 12l3.9 3.9a.949.949 0 0 1 .275.7.948.948 0 0 1-.275.7.948.948 0 0 1-.7.275.948.948 0 0 1-.7-.275Z"></path>
              </svg>
            </div>
          </button>
        )}
        <div className="thread-panel-title">
          <span>Hilo</span>
        </div>
        <button className="thread-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div
        className="thread-main-message"
        style={{ marginTop: isSelectionMode ? '54px' : '4px' }}
      >
        <div className="thread-main-message-header">
          <strong style={{ color: getUserColor(mainMessageSenderDisplayName, (message.from === currentUsername) || (message.from === currentUserFullName)) }}>
            {mainMessageSenderDisplayName}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="thread-replies-count">
              {threadMessages.length}{" "}
              {threadMessages.length === 1 ? "respuesta" : "respuestas"}
            </span>
            <span className="thread-main-message-time">
              {formatDateLabel(message.sentAt)}, {formatTime(message)}
            </span>
          </div>
        </div>

        {/* Mostrar contenido según el tipo de mensaje */}
        {message.attachments && message.attachments.length > 0 ? (
          <div className="thread-main-message-media">
            {/* Mostrar texto si lo hay */}
            {(message.text || message.message) && (
              <div className="thread-main-message-text" style={{ marginBottom: '12px' }}>
                {renderTextWithMentions(message.text || message.message)}
              </div>
            )}

            {/* SEPARAR IMÁGENES DE ARCHIVOS */}
            {(() => {
              // Filtrar adjuntos si hay uno seleccionado
              console.log('🖼️ ThreadPanel Render:', {
                selectedAttachment,
                msgAttachments: message.attachments
              });

              let attachmentsToShow = message.attachments;
              if (selectedAttachment) {
                // Comparar por ID (convertir a string para evitar problemas de tipo)
                // Comparar por ID (convertir a string para evitar problemas de tipo)
                attachmentsToShow = message.attachments.filter(att => {
                  // 1. Si ambos tienen ID, la comparación debe ser EXCLUSIVA por ID
                  if (att.id && selectedAttachment.id) {
                    return String(att.id) === String(selectedAttachment.id);
                  }

                  // 2. Solo si NO hay IDs, usamos fallback de URL o MediaData
                  return (att.url === selectedAttachment.url) ||
                    (att.mediaData === selectedAttachment.mediaData);
                });
              }

              const imageAttachments = attachmentsToShow.filter(att =>
                att.mediaType === 'image' ||
                (!att.mediaType && (att.url || att.mediaData)?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
              );
              const fileAttachments = attachmentsToShow.filter(att => !imageAttachments.includes(att));

              return (
                <>
                  {/* 1. Renderizar Imágenes en Grid */}
                  {imageAttachments.length > 0 && (
                    <ImageGalleryGrid
                      items={imageAttachments}
                      onImageClick={(item) => {
                        const url = item.url || item.mediaData;
                        handleImageClick(url, item.fileName || 'Imagen');
                      }}
                      onReply={handleAttachmentReply} // Primer botón: citar (siempre visible)
                      onOpenThread={!selectedAttachment ? onSelectAttachment : undefined} // Segundo botón: solo en hilo general
                    />
                  )}

                  {/* 2. Renderizar Archivos como Lista */}
                  {fileAttachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: imageAttachments.length > 0 ? '12px' : '0' }}>
                      {fileAttachments.map((file, fIdx) => {
                        const fileUrl = file.url || file.mediaData;
                        const isPdf = file.fileName?.toLowerCase().endsWith('.pdf') || file.mediaType === 'application/pdf' || file.type === 'application/pdf';

                        return (
                          <div
                            key={fIdx}
                            className="wa-file-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (isPdf) {
                                if (fileUrl && fileUrl.startsWith('http')) {
                                  apiService.fetchWithAuth(fileUrl)
                                    .then(res => {
                                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                      return res.arrayBuffer();
                                    })
                                    .then(arrayBuffer => {
                                      setPdfData(arrayBuffer);
                                      setPdfFileName(file.fileName || "documento.pdf");
                                      setShowPdfViewer(true);
                                    })
                                    .catch(err => {
                                      console.error("❌ Error loading PDF:", err);
                                      handleDownload(fileUrl, file.fileName);
                                    });
                                } else {
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
                            <div className="wa-download-icon" onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(fileUrl, file.fileName);
                            }}>
                              <FaDownload />
                            </div>
                            <div className="wa-reply-icon-small" title="Responder a este archivo" onClick={(e) => {
                              e.stopPropagation();
                              handleAttachmentReply(file);
                            }}>
                              <FaReply size={14} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : message.mediaType === "audio" && message.mediaData ? (
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
              className="wa-file-card"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const isPdf = message.fileName?.toLowerCase().endsWith('.pdf') || message.mediaType === 'application/pdf';
                if (isPdf) {
                  const fileUrl = message.mediaData;
                  if (fileUrl && fileUrl.startsWith('http')) {
                    apiService.fetchWithAuth(fileUrl)
                      .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.arrayBuffer();
                      })
                      .then(arrayBuffer => {
                        setPdfData(arrayBuffer);
                        setPdfFileName(message.fileName || "documento.pdf");
                        setShowPdfViewer(true);
                      })
                      .catch(err => {
                        console.error("❌ Error loading PDF:", err);
                        handleDownload(message.mediaData, message.fileName);
                      });
                  } else {
                    handleDownload(message.mediaData, message.fileName);
                  }
                } else {
                  handleDownload(message.mediaData, message.fileName);
                }
              }}
            >
              <div className="wa-file-icon">{renderFileIcon(message.fileName)}</div>
              <div className="wa-file-info">
                <div className="wa-file-name">{message.fileName || "Archivo"}</div>
                <div className="wa-file-meta">
                  {formatFileSize(message.fileSize)} • {(message.fileName?.toLowerCase().endsWith('.pdf') || message.mediaType === 'application/pdf') ? 'Click para ver' : 'Click para descargar'}
                </div>
              </div>
              <div className="wa-download-icon" onClick={(e) => {
                e.stopPropagation();
                handleDownload(message.mediaData, message.fileName);
              }}>
                <FaDownload />
              </div>
            </div>
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : (
          <div className={`thread-main-message-text${message.from === currentUsername ? ' own' : ''}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="thread-messages" ref={messagesContainerRef}>
        {loading && threadMessages.length === 0 ? (
          <div className="thread-loading">Cargando mensajes...</div>
        ) : threadMessages.length === 0 ? (
          <div className="thread-empty">
            <p>Sé el primero en responder en este hilo</p>
          </div>
        ) : (
          <>
            {groupThreadMessagesByDate(
              // 🔥 FILTRO DE DISCUSIÓN:
              // Si NO hay adjunto seleccionado (Hilo General), ocultar mensajes que pertenecen a un adjunto específico.
              // Si SÍ hay adjunto, threadMessages ya viene filtrado por el backend/socket.
              !selectedAttachment
                ? threadMessages.filter(msg => !msg.replyToAttachmentId)
                : threadMessages
            ).map((item, index) => {
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
              const isOwnMessage = msg.isSelf !== undefined
                ? msg.isSelf
                : msg.from === "Tú" ||
                msg.from === currentUsername ||
                (currentUserFullName && msg.from === currentUserFullName) ||
                msg.sender === currentUsername ||
                (currentUserFullName && msg.sender === currentUserFullName);
              const userColor = getUserColor(msg.from, isOwnMessage);

              const isMentioned = hasMentionToUser(msg.text || msg.message || "");

              const senderUser = roomUsers.find(u => u.username === msg.from || `${u.nombre} ${u.apellido}` === msg.from);
              const senderPicture = senderUser?.picture;
              const isGroupStart = msg.isGroupStart !== false; // Si no está definido, es inicio de grupo

              // Definir JSX de Read Receipts para reutilizar dentro de las burbujas
              const readReceiptsJSX = (msg.readBy && msg.readBy.length > 0) || (isOwnMessage && msg.isRead) ? (
                <div
                  className="thread-read-receipts"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  <div
                    className="thread-read-receipts-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const preferTop = rect.top > 180;
                      const newPosition = preferTop ? 'top' : 'bottom';
                      setPopoverPosition(newPosition);
                      const coords = {
                        right: window.innerWidth - rect.right,
                        top: preferTop ? rect.top - 12 : rect.bottom + 12
                      };
                      setPopoverCoords(coords);
                      setOpenReadReceiptsId(openReadReceiptsId === msg.id ? null : msg.id);
                    }}
                    title="Ver quién lo ha leído"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: '#53bdeb',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '1px 5px',
                      borderRadius: '10px'
                    }}
                  >
                    <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet">
                      <path fill="currentColor" d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18L11.071 1.27a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28zm3.486 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.682 8.365l-.376-.377-.19.192 1.07 1.07a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18l6.19-7.636a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28z"></path>
                    </svg>
                    {(msg.readBy && msg.readBy.length > 0) && <span style={{ fontWeight: '500' }}>{msg.readBy.length}</span>}
                    {(!msg.readBy || msg.readBy.length === 0) && msg.isRead && <span style={{ fontWeight: '500' }}>1</span>}
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
                        >
                          ×
                        </button>
                      </div>
                      <div className="popover-content">
                        {msg.readBy.map((reader, i) => {
                          // reader puede ser string (username) u objeto {username, picture, readAt}
                          const readerUsername = typeof reader === 'string' ? reader : reader.username;
                          const readerUser = roomUsers.find(u =>
                            (u.username || u.nombre) === readerUsername
                          );
                          // Solo primer nombre y primer apellido
                          let readerName = readerUsername;
                          if (readerUser) {
                            const firstName = (readerUser.nombre || '').split(' ')[0];
                            const lastName = (readerUser.apellido || '').split(' ')[0];
                            readerName = firstName && lastName
                              ? `${firstName} ${lastName}`
                              : readerUser.username || readerUsername;
                          }
                          const readerPicture = readerUser?.picture || (typeof reader === 'object' ? reader.picture : null);

                          return (
                            <div key={i} className="popover-item">
                              <div className="popover-avatar">
                                {readerPicture ? (
                                  <img src={readerPicture} alt={readerName} />
                                ) : (
                                  <div className="popover-avatar-placeholder">
                                    {readerName?.[0]?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="popover-info">
                                <span className="popover-name">{readerName}</span>
                                <span className="popover-time">
                                  {typeof reader === 'object' && reader.readAt
                                    ? new Date(reader.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Leído'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null;

              return (
                <div
                  key={msg.id || index}
                  id={`thread-message-${msg.id}`} // Agregado ID para scroll
                  className={`thread-message ${isOwnMessage ? "thread-message-own" : "thread-message-other"} ${!isGroupStart ? "thread-message-grouped" : ""} ${isMentioned ? "thread-message-mentioned" : ""}`}
                  onClick={(e) => handleMessageClick(e, msg)}
                  style={{
                    cursor: (isSelectionMode || 'pointer'),
                    marginTop: isGroupStart ? '8px' : '2px',
                  }}
                >
                  {/* Visual checkbox indicator if needed, similar to ChatContent */}
                  {isSelectionMode && (
                    <div className="message-checkbox-wrapper" onClick={(e) => { e.stopPropagation(); handleToggleMessageSelection(msg.id); }} style={{ margin: '0 8px' }}>
                      <input type="checkbox" checked={selectedMessages.includes(msg.id)} onChange={() => { }} />
                    </div>
                  )}
                  {/* Gutter: Avatar (si es inicio de grupo) o Timestamp (si es mensaje continuo) */}
                  <div className="thread-message-gutter">
                    {isGroupStart ? (
                      <div
                        className="thread-message-avatar"
                        style={{
                          background: senderPicture
                            ? `url(${senderPicture}) center/cover no-repeat`
                            : userColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 'bold', fontSize: '14px'
                        }}
                      >
                        {!senderPicture && (msg.from?.[0]?.toUpperCase() || '?')}
                      </div>
                    ) : (
                      <span className="thread-message-timestamp-left">
                        {formatTime(msg)}
                      </span>
                    )}
                  </div>

                  <div className="thread-message-content">
                    {/* Header - Solo visible si es inicio de grupo */}
                    {isGroupStart && (
                      <div className="thread-message-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: userColor }}>
                            {(senderUser && senderUser.nombre && senderUser.apellido)
                              ? `${senderUser.nombre} ${senderUser.apellido}`.trim()
                              : (senderUser?.displayName || msg.from)} {getSenderSuffix(msg, roomUsers)}
                          </strong>
                        </div>
                        <span className="thread-message-time">{formatTime(msg)}</span>
                      </div>
                    )}


                    {/*  Vista previa de respuesta mejorada con soporte visual */}
                    {msg.replyToMessageId && msg.replyToSender && (() => {
                      // Buscar el mensaje original para obtener mediaData
                      const originalMsg = threadMessages.find(m => m.id === msg.replyToMessageId);
                      const hasMedia = originalMsg?.mediaData || originalMsg?.mediaType;

                      return (
                        <div
                          className="thread-reply-reference"
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = document.getElementById(`thread-message-${msg.replyToMessageId}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Highlight amarillo como en ChatContent
                              el.style.backgroundColor = 'rgba(255, 235, 59, 0.4)';
                              el.style.transition = 'background-color 0.5s';
                              setTimeout(() => {
                                el.style.backgroundColor = '';
                              }, 2000);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: hasMedia ? 'row' : 'column',
                            gap: hasMedia ? '8px' : '4px',
                            alignItems: hasMedia ? 'center' : 'flex-start',
                            padding: '6px 8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderLeft: '3px solid #00a884',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            maxWidth: '100%',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Icono y texto */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '4px', maxWidth: '100%' }}>
                            <FaReply className="reply-ref-icon" style={{ flexShrink: 0 }} />
                            <div className="reply-ref-content" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <span className="reply-ref-sender">{msg.replyToSender}</span>
                              <span className="reply-ref-text" style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block'
                              }}>
                                {msg.replyToText || originalMsg?.text || originalMsg?.message || originalMsg?.fileName || "Mensaje"}
                              </span>
                            </div>
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
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                              ) : originalMsg.mediaType === 'video' && !/\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(originalMsg.fileName || "") ? (
                                // Miniatura de video con ícono
                                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
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
                                      borderLeft: '5px solid white',
                                      borderTop: '3px solid transparent',
                                      borderBottom: '3px solid transparent',
                                      marginLeft: '2px'
                                    }} />
                                  </div>
                                </div>
                              ) : (originalMsg.mediaType === 'audio' || (originalMsg.mediaType === 'video' && /\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(originalMsg.fileName || ""))) ? (
                                // Ícono de audio
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  backgroundColor: '#e1f4d6',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(0, 0, 0, 0.1)'
                                }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                                    <path d="M9 18V5l12-2v13M9 13l12-2" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                  </svg>
                                </div>
                              ) : (
                                // Ícono de archivo genérico
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(0, 0, 0, 0.1)'
                                }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
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

                    {/* RENDERIZADO DE ADJUNTOS (multi-attachments) */}
                    {msg.attachments && msg.attachments.length > 0 ? (
                      <>
                        {/* Mostrar texto si lo hay */}
                        {(msg.text || msg.message) && (
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`} style={{ marginBottom: '8px' }}>
                            {renderTextWithMentions(msg.text || msg.message)}
                          </div>
                        )}

                        {/* SEPARAR IMÁGENES DE ARCHIVOS */}
                        {(() => {
                          const imageAttachments = msg.attachments.filter(att =>
                            att.mediaType === 'image' ||
                            (!att.mediaType && (att.url || att.mediaData)?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                          );
                          const fileAttachments = msg.attachments.filter(att => !imageAttachments.includes(att));

                          return (
                            <>
                              {/* 1. Renderizar Imágenes en Grid */}
                              {imageAttachments.length > 0 && (
                                <ImageGalleryGrid
                                  items={imageAttachments}
                                  onImageClick={(item) => {
                                    const url = item.url || item.mediaData;
                                    handleImageClick(url, item.fileName || 'Imagen');
                                  }}
                                />
                              )}

                              {/* 2. Renderizar Archivos como Lista */}
                              {fileAttachments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: imageAttachments.length > 0 ? '8px' : '0' }}>
                                  {fileAttachments.map((file, fIdx) => {
                                    const fileUrl = file.url || file.mediaData;

                                    return (
                                      <div
                                        key={fIdx}
                                        className="wa-file-card"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          const isPdf = file.fileName?.toLowerCase().endsWith('.pdf') || file.mediaType === 'application/pdf' || file.type === 'application/pdf';
                                          if (isPdf) {
                                            const fileUrl = file.url || file.mediaData;
                                            if (fileUrl && fileUrl.startsWith('http')) {
                                              apiService.fetchWithAuth(fileUrl)
                                                .then(res => {
                                                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                                  return res.arrayBuffer();
                                                })
                                                .then(arrayBuffer => {
                                                  setPdfData(arrayBuffer);
                                                  setPdfFileName(file.fileName || "documento.pdf");
                                                  setShowPdfViewer(true);
                                                })
                                                .catch(err => {
                                                  console.error("❌ Error loading PDF:", err);
                                                  handleDownload(fileUrl, file.fileName);
                                                });
                                            } else {
                                              handleDownload(fileUrl, file.fileName);
                                            }
                                          } else {
                                            const fileUrl = file.url || file.mediaData;
                                            handleDownload(fileUrl, file.fileName);
                                          }
                                        }}
                                      >
                                        <div className="wa-file-icon">{renderFileIcon(file.fileName)}</div>
                                        <div className="wa-file-info">
                                          <div className="wa-file-name">{file.fileName || 'Archivo adjunto'}</div>
                                          <div className="wa-file-meta">
                                            {formatFileSize(file.fileSize)} • {(file.fileName?.toLowerCase().endsWith('.pdf') || file.mediaType === 'application/pdf') ? 'Click para ver' : 'Click para descargar'}
                                          </div>
                                        </div>
                                        <div className="wa-download-icon" onClick={(e) => {
                                          e.stopPropagation();
                                          const fileUrl = file.url || file.mediaData;
                                          handleDownload(fileUrl, file.fileName);
                                        }}>
                                          <FaDownload />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    ) : msg.mediaType === "audio" && msg.mediaData ? (
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
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`}>
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
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`}>
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
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`}>
                            {renderTextWithMentions(msg.message || msg.text)}
                          </div>
                        )}
                      </div>
                    ) : (msg.mediaType && msg.mediaData) || (msg.fileName && msg.mediaData) ? (
                      //  FALLBACK GENÉRICO MEJORADO: Si tiene mediaData, mostrar como archivo
                      <div className="thread-message-media">
                        <div
                          className="wa-file-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const isPdf = msg.fileName?.toLowerCase().endsWith('.pdf') || msg.mediaType === 'application/pdf';
                            if (isPdf) {
                              if (msg.mediaData && msg.mediaData.startsWith('http')) {
                                apiService.fetchWithAuth(msg.mediaData)
                                  .then(res => {
                                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                    return res.arrayBuffer();
                                  })
                                  .then(arrayBuffer => {
                                    setPdfData(arrayBuffer);
                                    setPdfFileName(msg.fileName || "documento.pdf");
                                    setShowPdfViewer(true);
                                  })
                                  .catch(err => {
                                    console.error("❌ Error loading PDF:", err);
                                    handleDownload(msg.mediaData, msg.fileName);
                                  });
                              } else {
                                handleDownload(msg.mediaData, msg.fileName);
                              }
                            } else {
                              handleDownload(msg.mediaData, msg.fileName);
                            }
                          }}
                        >
                          <div className="wa-file-icon">{renderFileIcon(msg.fileName)}</div>
                          <div className="wa-file-info">
                            <div className="wa-file-name">{msg.fileName || "Archivo adjunto"}</div>
                            <div className="wa-file-meta">
                              {formatFileSize(msg.fileSize)} • {(msg.fileName?.toLowerCase().endsWith('.pdf') || msg.mediaType === 'application/pdf') ? 'Click para ver' : 'Click para descargar'}
                            </div>
                          </div>
                          <div className="wa-download-icon" onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(msg.mediaData, msg.fileName);
                          }}>
                            <FaDownload />
                          </div>
                        </div>
                        {msg.message && (
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`}>
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
                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                          <div className={`thread-message-text${isMentioned ? ' mentioned' : ''}`}
                          >
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
                          {/* Tick: izquierda para propios, derecha para otros */}
                          {readReceiptsJSX && (
                            <div style={{
                              position: 'absolute',
                              bottom: '3px',
                              ...(isOwnMessage ? { left: '4px' } : { right: '6px' }),
                              lineHeight: 1,
                            }}>
                              {readReceiptsJSX}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/*  NUEVO: Mostrar reacciones (igual que en ChatContent) */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="thread-reactions-row" style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {Object.entries(msg.reactions.reduce((acc, r) => {
                          if (!acc[r.emoji]) acc[r.emoji] = [];
                          acc[r.emoji].push(r.fullName || r.username);
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

                    {/*  Read Receipts - Estilo Check Azul + Contador (igual que ChatContent) */}
                    {false && (
                      <div className="thread-read-receipts" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div
                          className="thread-read-receipts-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const preferTop = rect.top > 180;
                            const newPosition = preferTop ? 'top' : 'bottom';
                            setPopoverPosition(newPosition);
                            const coords = {
                              right: window.innerWidth - rect.right,
                              top: preferTop ? rect.top - 12 : rect.bottom + 12
                            };
                            setPopoverCoords(coords);
                            setOpenReadReceiptsId(openReadReceiptsId === msg.id ? null : msg.id);
                          }}
                          title="Ver quién lo ha leído"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#53bdeb',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                          }}
                        >
                          {/* Doble check azul */}
                          <svg viewBox="0 0 16 11" height="11" width="16" preserveAspectRatio="xMidYMid meet">
                            <path fill="currentColor" d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18L11.071 1.27a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28zm3.486 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.682 8.365l-.376-.377-.19.192 1.07 1.07a.724.724 0 0 0 .27.18.652.652 0 0 0 .3.07.596.596 0 0 0 .274-.07.716.716 0 0 0 .253-.18l6.19-7.636a.445.445 0 0 0 .14-.337.453.453 0 0 0-.14-.28z"></path>
                          </svg>
                          {/* Contador */}
                          <span style={{ fontWeight: '500' }}>{msg.readBy.length}</span>
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
                          {(msg.from === currentUsername || msg.from === currentUserFullName) && (
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
                          {(() => {
                            const userRole = (user?.role || "").toUpperCase();
                            const canDelete = msg.from === currentUsername || ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(userRole);
                            if (canDelete) {
                              return (
                                <>
                                  <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
                                  <button
                                    className="menu-item"
                                    style={{ color: '#dc2626' }}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }}
                                  >
                                    <FaTrash className="menu-icon" /> Eliminar mensaje
                                  </button>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )
        }
        {/* VISOR DE PDF */}
        {showPdfViewer && pdfData && (
          <PDFViewer
            pdfData={pdfData}
            fileName={pdfFileName}
            onClose={() => {
              setShowPdfViewer(false);
              setPdfData(null);
            }}
          />
        )}

        {/*  BOTÓN FLOTANTE DE MENSAJES NUEVOS */}
        {newMessagesCount > 0 && (
          <button
            className="thread-new-messages-btn"
            onClick={handleNewMessagesClick}
            title={`${newMessagesCount} mensaje${newMessagesCount === 1 ? '' : 's'} nuevo${newMessagesCount === 1 ? '' : 's'}`}
          >
            <svg viewBox="0 0 19 20" height="18" width="18" preserveAspectRatio="xMidYMid meet" fill="currentColor">
              <path d="M3.8 6.7l5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path>
            </svg>
            <span className="new-messages-count">{newMessagesCount}</span>
            <span className="new-messages-text">
              {newMessagesCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
            </span>
          </button>
        )}
      </div>

      <div className="thread-input-container">
        {/* 🔥 NUEVO: Bloqueo de entrada si el ID es temporal */}
        {isTemporaryId ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#f0f2f5',
            borderRadius: '12px',
            textAlign: 'center',
            margin: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            border: '1px dashed #d1d7db'
          }}>
            <div className="wa-loading-spinner" style={{ width: '24px', height: '24px' }}></div>
            <div style={{ color: '#667781', fontSize: '14px', fontWeight: '500' }}>
              Enviando mensaje principal...
            </div>
            <div style={{ color: '#8696a0', fontSize: '12px' }}>
              Podrás responder en cuanto se complete la subida.
            </div>
          </div>
        ) : (
          <>
            {/*  NUEVO: Vista previa de respuesta */}
            {replyingTo && (
              <div className="thread-reply-preview">
                <div className="reply-preview-content">
                  <div className="reply-preview-header">
                    <FaReply className="reply-icon" />
                    <span>Respondiendo a {replyingTo.from || replyingTo.sender}</span>
                  </div>
                  <div className="reply-preview-body" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {replyingTo.attachment && (
                      <div className="reply-preview-thumbnail" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        background: '#f0f2f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {replyingTo.attachment.mediaType === 'image' ? (
                          <img
                            src={replyingTo.attachment.mediaData || replyingTo.attachment.url}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <FaFileAlt size={16} color="#8696a0" />
                        )}
                      </div>
                    )}
                    <div className="reply-preview-text" style={{
                      fontSize: '13px',
                      color: '#6c757d',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {replyingTo.message || replyingTo.text || replyingTo.fileName || "Archivo adjunto"}
                    </div>
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
                  const displayName = user.displayName || getMentionDisplayName(user);

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

              <div className="thread-input-overlay-wrap">
                <div
                  ref={inputHighlightRef}
                  className={`thread-input-highlight ${input ? "" : "is-placeholder"}`}
                  aria-hidden="true"
                >
                  {input ? renderActiveMentionInInput(input) : "Escribe un mensaje"}
                </div>
                <textarea
                  ref={inputRef}
                  className="thread-input thread-input-overlay-textarea"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onScroll={handleInputScroll}
                  placeholder=""
                  rows={1}
                  disabled={isSending}
                />
              </div>

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
                    'Enviar'
                  )}
                </button>
              )}
            </div>
          </>
        )
        }
      </div >

      {/*  NUEVO: Modal de reenvío */}
      < ForwardMessageModal
        isOpen={showForwardModal}
        onClose={handleCloseForwardModal}
        message={messageToForward}
        myActiveRooms={myActiveRooms}
        assignedConversations={assignedConversations}
        user={user}
        socket={socket}
        userList={userList}
      />
    </div >
  );
};


export default ThreadPanel;
