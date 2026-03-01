/**
 * ChatPage.jsx - Versión Refactorizada
 * 
 * Componente principal del chat que utiliza hooks personalizados para
 * mejorar la organización y mantenibilidad del código.
 * 
 * Backup del archivo original guardado en: src/recorded/ChatPage.ORIGINAL.jsx
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import ChatLayout from '../../layouts/ChatLayout';
import Login from '../Login/Login';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import LoginLoadingScreen from '../../components/LoginLoadingScreen/LoginLoadingScreen';
import ChatModalsContainer from './components/ChatModalsContainer';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import apiService from "../../apiService"; // <--- AGREGA ESTA LÍNEA
// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useMessages } from '../../hooks/useMessages';
import { useMessagePagination } from '../../hooks/useMessagePagination';
import { useChatState } from '../../hooks/useChatState';
import { useRoomManagement } from '../../hooks/useRoomManagement';
import { useConversations } from '../../hooks/useConversations';
import { useSocketListeners } from '../../hooks/useSocketListeners';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../sweetalert2';
import { faviconBadge } from '../../utils/faviconBadge'; //  NUEVO: Badge en el favicon
import whatsappSound from '../../assets/sonidos/whatsapp_pc.mp3';
import mentionSoundFile from '../../assets/sonidos/etiqueta.mp3'; //  NUEVO: Sonido para menciones
import ringtoneSoundFile from '../../assets/sonidos/llamada_wsp.mp3'; //  NUEVO: Tono de llamada

const ChatPage = () => {
  // ===== HOOKS DE AUTENTICACIÓN Y SOCKET =====
  const {
    isAuthenticated,
    user,
    username,
    isAdmin,
    isLoading,
    logout,
    refreshAuth,
  } = useAuth();

  //  NUEVO: Inicializar tema desde localStorage (Persistencia de Modo Oscuro)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    // Aplicar clase 'dark' al elemento raíz html
    document.documentElement.classList.toggle('dark', isDark);
    console.log('🎨 Tema inicializado:', isDark ? 'Modo Oscuro' : 'Modo Claro');
  }, []); // Se ejecuta solo al montar

  const socket = useSocket(isAuthenticated, username, user);

  // 1.  NUEVO ESTADO: Guardar el objeto del mensaje fijado
  const [pinnedMessageObject, setPinnedMessageObject] = useState(null);

  // Estado para la pantalla de carga post-login
  const [isPostLoginLoading, setIsPostLoginLoading] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginLoadingMessage, setLoginLoadingMessage] = useState('Iniciando sesión...');
  const [selectedRoomData, setSelectedRoomData] = useState(null); //  NUEVO: Datos de la sala seleccionada (para favoritos)

  // ===== HOOK DE ESTADOS CENTRALIZADOS =====
  const chatState = useChatState();

  // ===== HOOKS DE MENSAJERÍA =====
  const {
    input,
    setInput,
    mediaFiles,
    mediaPreviews,
    isRecording,
    setIsRecording,
    messageSound,
    mentionSound, //  NUEVO: Ref del sonido de menciones
    playMessageSound,
    ringtoneSound, //  Ref del tono
    playRingtone,  //  Función play
    stopRingtone,  //  Función stop
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    clearInput,
  } = useMessages();

  const currentUserFullName = user?.displayName || (
    user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : username
  );

  const {
    messages,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    updateMessage,
    clearMessages,
    setInitialMessages,
    setMessages, //  NUEVO: Exponer para prepend
    isLoading: isLoadingMessages,
    //  NUEVO: Para búsqueda WhatsApp
    loadMessagesAroundId,
    aroundMode, // Indica si estamos en modo "around" (búsqueda)
    hasMoreAfter, // Vienen del hook
    loadMoreMessagesAfter, // Vienen del hook
  } = useMessagePagination(
    chatState.currentRoomCode,
    username,
    chatState.to,
    chatState.isGroup,
    socket,
    user
  );

  // Estados locales que permanecen aquí por necesidad
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [pollVotes, setPollVotes] = useState({});

  // ===== HOOK DE GESTIÓN DE SALAS =====
  const roomManagement = useRoomManagement(
    socket,
    username,
    chatState,
    { clearMessages, loadInitialMessages, loadMessagesAroundId, setHighlightMessageId }
  );

  // ===== HOOK DE CONVERSACIONES =====
  const conversations = useConversations(
    isAuthenticated,
    username,
    socket,
    user,
    {
      ...chatState,
      setInitialMessages,
      setMessages, //  NUEVO: Necesario para prepend en loadMoreAdminViewMessages
    }
  );

  //  FIX: Restaurar contadores desde localStorage al iniciar (antes de que el backend los corrompa)
  const hasRestoredFromLocalStorage = useRef(false);
  useEffect(() => {
    if (!username || hasRestoredFromLocalStorage.current) return;
    hasRestoredFromLocalStorage.current = true;
    try {
      const saved = localStorage.getItem(`unreadCounts_${username}`);
      if (saved) {
        const savedCounts = JSON.parse(saved);
        console.log('💾 [RESTORE] Contadores restaurados desde localStorage:', savedCounts);
        chatState.setUnreadMessages(prev => {
          const merged = { ...prev };
          for (const key of Object.keys(savedCounts)) {
            if ((savedCounts[key] || 0) > (merged[key] || 0)) {
              merged[key] = savedCounts[key];
            }
          }
          return merged;
        });
      }
    } catch (e) {
      console.error('Error restaurando contadores desde localStorage:', e);
    }
  }, [username]);

  //  FIX: Persistir contadores en localStorage cada vez que cambien
  useEffect(() => {
    if (!username) return;
    // Solo guardar si hay datos (evitar guardar {} vacío al inicio)
    const keys = Object.keys(chatState.unreadMessages);
    if (keys.length > 0) {
      try {
        localStorage.setItem(`unreadCounts_${username}`, JSON.stringify(chatState.unreadMessages));
      } catch (e) {
        // Silenciar errores de localStorage
      }
    }
  }, [chatState.unreadMessages, username]);

  //  FIX: Refs para evitar dependencias circulares en el polling de unreads
  const myActiveRoomsRef = useRef(chatState.myActiveRooms);
  const favoriteRoomsRef = useRef(chatState.favoriteRooms);
  const assignedConversationsRef = useRef(chatState.assignedConversations);
  const currentRoomCodeRef = useRef(chatState.currentRoomCode);
  const toRef = useRef(chatState.to);

  useEffect(() => {
    myActiveRoomsRef.current = chatState.myActiveRooms;
    favoriteRoomsRef.current = chatState.favoriteRooms;
    assignedConversationsRef.current = chatState.assignedConversations;
    currentRoomCodeRef.current = chatState.currentRoomCode;
    toRef.current = chatState.to;
  }, [
    chatState.myActiveRooms,
    chatState.favoriteRooms,
    chatState.assignedConversations,
    chatState.currentRoomCode,
    chatState.to
  ]);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!username) return;
      try {
        // 1. Obtener conteos de mensajes no leídos globales
        const counts = await apiService.getUnreadCounts();

        // 2. Sincronizar contadores:
        // - El endpoint GET /unread-counts solo devuelve keys con valor > 0
        // - Para elementos visibles (salas/conversaciones cargadas), si no viene key => es 0
        // - Evitar preservar valores locales viejos (ej: 99+) cuando backend ya está en 0
        if (counts) {
          const knownRoomCodes = new Set([
            ...(myActiveRoomsRef.current || []).map(r => String(r.roomCode)).filter(Boolean),
            ...(favoriteRoomsRef.current || [])
              .filter(f => f?.type === 'room')
              .map(f => String(f.roomCode))
              .filter(Boolean),
          ]);

          const knownConversationIds = new Set([
            ...(assignedConversationsRef.current || []).map(c => String(c.id)).filter(Boolean),
            ...(favoriteRoomsRef.current || [])
              .filter(f => f?.type === 'conv')
              .map(f => String(f.id))
              .filter(Boolean),
          ]);

          chatState.setUnreadMessages(prev => {
            const merged = {};

            // 2.1 Valores explícitos que sí devolvió backend (>0)
            for (const [key, value] of Object.entries(counts || {})) {
              merged[String(key)] = Number(value) || 0;
            }

            // 2.2 Para salas/conversaciones visibles, falta de key en backend = 0
            for (const roomCode of knownRoomCodes) {
              if (merged[roomCode] === undefined) {
                merged[roomCode] = 0;
              }
            }

            for (const conversationId of knownConversationIds) {
              if (merged[conversationId] === undefined) {
                merged[conversationId] = 0;
              }
            }

            // 2.3 Mantener contador del chat activo durante una actualización race-condition
            // para evitar parpadeos cuando un mensaje llega exactamente durante el poll.
            for (const key of Object.keys(prev || {})) {
              if (merged[key] === undefined && (key === String(currentRoomCodeRef.current) || key === String(toRef.current))) {
                merged[key] = prev[key];
              }
            }

            return merged;
          });
        }
      } catch (error) {
        console.error("Error cargando mensajes no leídos:", error);
      }
    };

    fetchUnreadCounts();

    // 🚀 OPTIMIZADO: Polling cada 5 minutos como respaldo (WebSocket maneja tiempo real)
    const interval = setInterval(fetchUnreadCounts, 300000);
    return () => clearInterval(interval);
  }, [username]);

  // ===== FUNCIONES QUE PERMANECEN AQUÍ =====
  // (Estas tienen dependencias muy específicas con el estado local)

  // Efecto para actualizar refs
  useEffect(() => {
    chatState.toRef.current = chatState.to;
    chatState.isGroupRef.current = chatState.isGroup;
    chatState.adminViewConversationRef.current = chatState.adminViewConversation;
    chatState.currentUserFullNameRef.current = currentUserFullName;
    chatState.userListRef.current = chatState.userList;
  }, [
    chatState.to,
    chatState.isGroup,
    chatState.adminViewConversation,
    currentUserFullName,
    chatState.userList,
  ]);

  // 2.  NUEVO EFECTO: Resolver el mensaje (Local o API)
  useEffect(() => {
    const resolvePinnedMessage = async () => {
      const pinId = chatState.pinnedMessageId;

      // A. Si no hay ID, limpiamos
      if (!pinId) {
        setPinnedMessageObject(null);
        return;
      }

      // B. Intentamos buscarlo en los mensajes cargados (rápido)
      //  IMPORTANTE: Asegúrate de que 'messages' sea un array
      const msgArray = Array.isArray(messages) ? messages : [];
      const foundInList = msgArray.find(m => m.id === pinId);

      if (foundInList) {
        console.log("📌 Mensaje fijado encontrado en memoria local");
        setPinnedMessageObject(foundInList);
      } else {
        // C. Si no está en la lista (es antiguo), lo pedimos a la API
        console.log(`📌 Mensaje fijado ${pinId} no está en lista. Buscando en API...`);
        try {
          const fetchedMsg = await apiService.getMessageById(pinId);

          //  VALIDACIÓN DE SEGURIDAD: Verificar que el mensaje pertenezca a la sala actual
          if (fetchedMsg && fetchedMsg.roomCode === chatState.currentRoomCodeRef.current) {
            setPinnedMessageObject(fetchedMsg);
          } else {
            console.warn(`⚠️ Mensaje fijado ${pinId} pertenece a otra sala (${fetchedMsg?.roomCode}). Ignorando.`);
            setPinnedMessageObject(null);
          }
        } catch (err) {
          console.error("Error cargando mensaje fijado:", err);
          setPinnedMessageObject(null);
        }
      }
    };

    resolvePinnedMessage();
  }, [chatState.pinnedMessageId, messages]);

  // Efecto para título de pestaña y favicon badge
  useEffect(() => {
    const myAssignedConversations = chatState.assignedConversations.filter((conv) => {
      const displayName =
        user?.nombre && user?.apellido
          ? `${user.nombre} ${user.apellido}`
          : user?.username;
      //  FIX: Verificar pertenencia tanto por DNI (username) como por nombre completo
      return conv.participants?.some(p => {
        const pLower = p?.toLowerCase().trim();
        return pLower === user?.username?.toLowerCase().trim()
          || pLower === displayName?.toLowerCase().trim();
      });
    });

    // 1. Unread count from Assigned Conversations
    const unreadAssignedCount = myAssignedConversations.filter((conv) => {
      const realtimeCount = chatState.unreadMessages?.[conv.id];
      const count = (realtimeCount !== undefined) ? realtimeCount : (conv.unreadCount || 0);
      return count > 0;
    }).length;

    // 2. Unread count from Rooms (Active + Favorites)
    //  FIX: Combinar myActiveRooms y favoriteRooms para asegurar que tenemos todos los datos
    // y usar un Map por roomCode para evitar duplicados y tomar el objeto con datos más frescos
    const allUniqueRooms = new Map();

    // Primero agregar activeRooms
    chatState.myActiveRooms?.forEach(room => {
      allUniqueRooms.set(room.roomCode, { ...room, source: 'active' });
    });

    // Luego agregar/sobreescribir con favoriteRooms (que suelen tener datos más frescos de unreadCount si vienen de reload)
    chatState.favoriteRooms?.forEach(room => {
      const existing = allUniqueRooms.get(room.roomCode);
      // Si ya existe, preferir el que tenga unreadCount > 0, o priorizar favorito si active no tiene
      if (existing) {
        if ((room.unreadCount || 0) > (existing.unreadCount || 0)) {
          allUniqueRooms.set(room.roomCode, { ...room, source: 'favorite' });
        }
      } else {
        allUniqueRooms.set(room.roomCode, { ...room, source: 'favorite' });
      }
    });

    let unreadRoomsCount = 0;
    allUniqueRooms.forEach((room) => {
      const realtimeCount = chatState.unreadMessages?.[room.roomCode];
      // Prioridad: 1. Socket (realtime), 2. API (room.unreadCount)
      const count = (realtimeCount !== undefined) ? realtimeCount : (room.unreadCount || 0);

      //  DEBUG: Log para diagnosticar el problema del contador
      if (room.roomCode === '2E104789') {
        console.log('🔍 DEBUG contador para 2E104789:', {
          realtimeCount,
          roomUnreadCount: room.unreadCount,
          finalCount: count,
          willIncrement: count > 0
        });
      }

      if (count > 0) {
        unreadRoomsCount++;
      }
    });

    const totalUnread = unreadAssignedCount + unreadRoomsCount;

    console.log('📊 [TITLE/FAVICON] totalUnread:', totalUnread, {
      unreadAssignedCount,
      unreadRoomsCount,
      uniqueRoomsCount: allUniqueRooms.size,
      unreadMessages: chatState.unreadMessages
    });

    // Actualizar título de la pestaña
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Chat +34`;
    } else {
      document.title = 'Chat +34';
    }

    //  NUEVO: Actualizar badge del favicon
    try {
      faviconBadge.update(totalUnread);
    } catch (err) {
      console.error('❌ Error en faviconBadge.update:', err);
    }
  }, [chatState.assignedConversations, chatState.myActiveRooms, chatState.favoriteRooms, chatState.unreadMessages, user]);

  // Efecto para estado del socket
  useEffect(() => {
    const handleSocketConnected = () => {
      chatState.setSocketConnected(true);
    };

    const handleSocketDisconnected = () => {
      chatState.setSocketConnected(false);
    };

    window.addEventListener('socketConnected', handleSocketConnected);
    window.addEventListener('socketDisconnected', handleSocketDisconnected);

    return () => {
      window.removeEventListener('socketConnected', handleSocketConnected);
      window.removeEventListener('socketDisconnected', handleSocketDisconnected);
    };
  }, [chatState]);

  // Efecto para verificar conexión del socket
  useEffect(() => {
    if (socket) {
      chatState.setSocketConnected(socket.connected);
    } else {
      chatState.setSocketConnected(false);
    }
  }, [socket, chatState]);

  // Función para marcar mensajes como leídos
  const markRoomMessagesAsRead = useCallback(
    async (roomCode) => {
      if (!socket || !socket.connected || !roomCode) {
        return;
      }

      socket.emit('markRoomMessagesAsRead', {
        roomCode,
        username,
      });
    },
    [socket, username]
  );

  //  NOTA: Los favoritos se cargan en ConversationList.jsx y se sincronizan
  // a chatState via setExternalFavoriteRoomCodes. No duplicar la llamada aquí.

  useEffect(() => {
    if (!isAuthenticated || !username) return;

    if (!chatState.hasRestoredRoom.current) {
      chatState.hasRestoredRoom.current = true;
    }

    roomManagement.loadMyActiveRooms(1, false, null, user);
  }, [isAuthenticated, username, user, roomManagement.loadMyActiveRooms]);

  // Efecto para detectar código de sala en URL
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    const hash = window.location.hash;
    const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/);

    if (roomMatch && roomMatch[1]) {
      const roomCode = roomMatch[1];
      chatState.setJoinRoomForm({ roomCode: roomCode });
      chatState.setShowJoinRoomModal(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isAuthenticated, username, chatState]);

  // Cargar mensajes cuando cambie currentRoomCode
  useEffect(() => {
    //  No cargar si estamos en modo "around" (búsqueda)
    if (chatState.currentRoomCode && username && chatState.isGroup && !aroundMode) {
      loadInitialMessages();
    }
  }, [chatState.currentRoomCode, username, chatState.isGroup, loadInitialMessages, aroundMode]);

  // Marcar mensajes como leídos
  const markedRoomsRef = useRef(new Set());
  const lastMarkedChatRef = useRef(null); // Para trackear el último chat marcado

  useEffect(() => {
    // A. Lógica para GRUPOS
    if (chatState.isGroup && chatState.currentRoomCode && messages.length > 0) {
      //  Usar key que incluye messages.length para re-marcar cuando llegan nuevos mensajes
      const roomKey = `room:${chatState.currentRoomCode}:${messages.length}`;
      if (lastMarkedChatRef.current !== roomKey) {
        lastMarkedChatRef.current = roomKey;

        console.log(`📝 Marcando grupo como leído: ${chatState.currentRoomCode}`);
        markRoomMessagesAsRead(chatState.currentRoomCode);

        //  FIX: Resetear contador local inmediatamente (no esperar al backend)
        chatState.setUnreadMessages(prev => ({ ...prev, [chatState.currentRoomCode]: 0 }));

        // También resetear en myActiveRooms y favoriteRooms
        chatState.setMyActiveRooms(prev => prev.map(room =>
          room.roomCode === chatState.currentRoomCode
            ? { ...room, unreadCount: 0 }
            : room
        ));
        chatState.setFavoriteRooms(prev => prev.map(f =>
          (f.type === 'room' && f.roomCode === chatState.currentRoomCode)
            ? { ...f, unreadCount: 0 }
            : f
        ));

        // Limpiar pendingMentions para este grupo
        if (chatState.pendingMentions[chatState.currentRoomCode]) {
          chatState.setPendingMentions(prev => {
            const updated = { ...prev };
            delete updated[chatState.currentRoomCode];
            return updated;
          });
        }
      }
    }

    // B.  RESTAURADO: Marcar como leído al abrir chats asignados
    if (!chatState.isGroup && chatState.to && messages.length > 0) {
      const chatKey = `chat:${chatState.to}:${messages.length}`;
      if (lastMarkedChatRef.current !== chatKey) {
        lastMarkedChatRef.current = chatKey;

        // Buscar conversación asignada o en favoritos
        const normalizedTo = chatState.to.toLowerCase().trim();

        //  FIX: Función robusta para encontrar la conversación considerando DNIs y Nombres Completos
        const findConversation = (conversations) => {
          return conversations?.find(c => {
            // 1. Coincidencia directa con DNI o nombre en participants
            if (c.participants?.some(p => p?.toLowerCase().trim() === normalizedTo)) return true;
            // 2. Coincidencia con nombre de la conversación (si existe)
            if (c.name?.toLowerCase().trim() === normalizedTo) return true;
            // 3. Resolución de DNI a Nombre Completo usando userList
            return c.participants?.some(p => {
              const resolvedUser = chatState.userList?.find(u => u.username === p);
              if (resolvedUser) {
                const fullName = resolvedUser.nombre && resolvedUser.apellido
                  ? `${resolvedUser.nombre} ${resolvedUser.apellido}`.toLowerCase().trim()
                  : null;
                return fullName === normalizedTo;
              }
              return false;
            });
          });
        };

        // 1. Buscar en asignados
        const assignedConv = findConversation(chatState.assignedConversations);

        // 2. Buscar en favoritos (donde type === 'conv')
        const favoriteConv = findConversation(chatState.favoriteRooms?.filter(f => f.type === 'conv'));

        const conv = assignedConv || favoriteConv;

        if (conv) {
          console.log(`📝 Marcando chat asignado/favorito como leído. Conv: ${conv.id}`);

          // 1. Marcar en Backend (API)
          //  FIX: El primer parámetro es QUIEN lee (Karen/DNI), el segundo de QUIÉN lee (Jesus)
          apiService.markConversationAsRead(username, chatState.to).catch(err =>
            console.error('Error al marcar conversación como leída:', err)
          );

          // 2. Emitir Socket
          if (socket?.connected) {
            socket.emit('markConversationAsRead', {
              from: username,
              to: chatState.to,
              conversationId: conv.id
            });
          }

          // 3. Resetear contador local global
          chatState.setUnreadMessages(prev => ({ ...prev, [conv.id]: 0 }));

          // 4. Actualizar estado de Asignados
          if (assignedConv) {
            chatState.setAssignedConversations(prev =>
              prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
            );
          }

          // 5. Actualizar estado de Favoritos ( CLAVE)
          if (favoriteConv) {
            chatState.setFavoriteRooms(prev =>
              prev.map(f => f.id === conv.id ? { ...f, unreadCount: 0 } : f)
            );
          }
        }
      }
    }
  }, [
    chatState.isGroup,
    chatState.currentRoomCode,
    chatState.to,
    chatState.assignedConversations,
    messages.length,
    markRoomMessagesAsRead,
    username,
    currentUserFullName,
    socket,
    chatState.unreadCountsLoaded,
    chatState.unreadMessages
  ]);

  // Limpiar referencia cuando cambiamos de chat (para permitir re-marcar)
  useEffect(() => {
    // Resetear lastMarkedChatRef cuando cambia el chat para permitir marcar como leído nuevamente
    lastMarkedChatRef.current = null;
  }, [chatState.to, chatState.currentRoomCode]);

  // Cargar mensajes cuando cambie 'to'
  useEffect(() => {
    //  No cargar si estamos en modo "around" (búsqueda)
    if (
      chatState.to &&
      username &&
      !chatState.isGroup &&
      !chatState.currentRoomCode &&
      !chatState.adminViewConversation &&
      !aroundMode
    ) {
      loadInitialMessages();
    }
  }, [
    chatState.to,
    username,
    chatState.isGroup,
    chatState.currentRoomCode,
    loadInitialMessages,
    chatState.adminViewConversation,
    aroundMode,
  ]);

  // Efecto para cargar mensajes en vista admin
  useEffect(() => {
    if (chatState.adminViewConversation) {
      conversations.loadAdminViewMessages(chatState.adminViewConversation, currentUserFullName);
    }
  }, [chatState.adminViewConversation, conversations.loadAdminViewMessages, currentUserFullName]);

  // Función para cargar más usuarios (paginación)
  const loadMoreUsers = () => {
    if (!socket || !socket.connected || chatState.userListLoading || !chatState.userListHasMore) {
      return;
    }

    chatState.setUserListLoading(true);
    socket.emit("requestUserListPage", {
      page: chatState.userListPage + 1,
      pageSize: 10,
    });
  };

  // ===== ACTIVAR LISTENERS DE SOCKET (¡FALTABA ESTO!) =====
  useSocketListeners(
    socket,
    chatState, // Pasamos todo el estado centralizado
    {
      addNewMessage,
      updateMessage,
      playMessageSound,
      playRingtone, //  Pasar función
      stopRingtone, //  Pasar función
      loadAssignedConversations: conversations.loadAssignedConversations,
      loadMyActiveRooms: roomManagement.loadMyActiveRooms,
      loadFavoriteRoomCodes: chatState.loadFavoriteRoomCodes, //  NUEVO: Para refrescar favoritos en tiempo real
      clearMessages
    },
    {
      user,
      userList: chatState.userList, //  NUEVO: Para resolución de nombres amigables
      username,
      isAdmin,
      soundsEnabled: chatState.soundsEnabled,
      favoriteRoomCodes: chatState.favoriteRoomCodes,
      areAlertsEnabled: chatState.areAlertsEnabled,
      areThreadAlertsEnabled: chatState.areThreadAlertsEnabled, //  NUEVO
      areMessageAlertsEnabled: chatState.areMessageAlertsEnabled //  NUEVO
    }
  );

  const handleUserSelect = async (
    userName,
    messageId = null,
    conversationData = null
  ) => {
    //  DEBUG: Ver qué está pasando
    console.log('🔍 handleUserSelect llamado:', {
      userName,
      messageId,
      conversationData,
      currentState: {
        isGroup: chatState.isGroup,
        currentRoomCode: chatState.currentRoomCode,
        to: chatState.to,
        messagesLength: messages.length
      }
    });

    //  NUEVO: Si conversationData tiene roomCode Y es tipo 'room', redirigir a handleGroupSelect
    // Evitamos redirigir si es un favorito tipo 'conv' (que también trae roomCode por compatibilidad)
    if (conversationData && conversationData.roomCode && (conversationData.type === 'room' || !conversationData.participants)) {
      console.log('🔄 Grupo detectado, redirigiendo a handleGroupSelect');
      return handleGroupSelect(conversationData);
    }

    //  NUEVO: Evitar limpiar chat si ya estamos en el mismo chat asignado
    // (previene que doble clic accidental limpie el contenido)
    const normalizedUserName = userName?.toLowerCase().trim();
    const currentTo = chatState.to?.toLowerCase().trim();
    const convName = conversationData?.name?.toLowerCase().trim();

    // Si ya estamos en este chat Y hay mensajes cargados, y no hay messageId específico, no hacer nada
    // Comparamos contra el DNI (userName) o el Nombre (convName) para robustez
    const isSameChat = !chatState.isGroup && !chatState.currentRoomCode &&
      (currentTo === normalizedUserName || (convName && currentTo === convName));

    if (isSameChat && !messageId && messages.length > 0) {
      console.log('⏭️ Ya estás en este chat, ignorando clic duplicado');
      return;
    }

    // 1. Limpieza usando las funciones de tus hooks
    chatState.setCurrentRoomCode(null);
    chatState.setIsGroup(false);
    chatState.setRoomUsers([]);
    chatState.currentRoomCodeRef.current = null;
    chatState.setReplyingTo(null);
    chatState.setTypingUser(null); //  FIX: Limpiar typing al cambiar de chat

    // Limpiar mensajes visualmente antes de cargar los nuevos
    // (Asumiendo que 'clearMessages' viene de useMessagePagination o roomManagement)
    if (typeof clearMessages === 'function') clearMessages();

    setSelectedRoomData(conversationData?.picture ? { picture: conversationData.picture } : null); //  FIX: Preservar picture de favoritos

    //  NUEVO: Limpiar pendingMentions para este chat
    // Puede ser conversationId (asignado) o userName (chat directo)
    const conversationId = conversationData?.id || userName;
    if (conversationId && chatState.pendingMentions[conversationId]) {
      chatState.setPendingMentions(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
    }

    // También limpiar por userName normalizado (por si acaso)
    if (normalizedUserName && chatState.pendingMentions[normalizedUserName]) {
      chatState.setPendingMentions(prev => {
        const updated = { ...prev };
        delete updated[normalizedUserName];
        return updated;
      });
    }

    // 2. Definir quién soy yo (normalizado)
    const myNameNormalized = normalizeUsername(currentUserFullName);
    //  FIX: También normalizar DNI para comparación
    const myDniNormalized = normalizeUsername(user?.username || '');

    // 3. Lógica Inteligente: ¿Soy Participante o Soy Admin?
    if (conversationData && conversationData.participants) {

      // Verificamos si YO estoy en la lista de participantes (por DNI o por nombre)
      const isParticipant = conversationData.participants.some(
        p => normalizeUsername(p) === myNameNormalized || normalizeUsername(p) === myDniNormalized
      );

      if (isParticipant) {
        // === MODO PARTICIPANTE (Chat Asignado - Trabajar) ===
        // Null en AdminView permite que useMessagePagination cargue el chat normal
        chatState.setAdminViewConversation(null);

        // Encontrar al OTRO participante para ponerlo en el título 'to'
        const otherPerson = conversationData.participants.find(
          p => normalizeUsername(p) !== myNameNormalized && normalizeUsername(p) !== myDniNormalized
        );

        // Establecer el destinatario (esto dispara la carga de mensajes)
        //  FIX: Usar conversationData.name (que viene de la API) si existe
        chatState.setTo(conversationData.name || otherPerson || userName);

      } else {
        // === MODO OBSERVADOR (Monitoreo Admin) ===
        // Esto activa la carga especial en 'loadAdminViewMessages'
        chatState.setAdminViewConversation(conversationData);
        chatState.setTo(conversationData.name || userName); // Título visual con el nombre de la API
      }

    } else {
      // === MODO CHAT DIRECTO NORMAL ===
      chatState.setAdminViewConversation(null);
      chatState.setTo(conversationData?.name || userName);
    }

    // 4.  NUEVO: Si hay messageId, cargar mensajes alrededor de ese ID
    if (messageId && loadMessagesAroundId) {
      console.log('🔍 handleUserSelect: Cargando mensajes alrededor de ID:', messageId);
      await loadMessagesAroundId(messageId);
      setHighlightMessageId(messageId);
    } else {
      setHighlightMessageId(null);
    }

    // 5. UX Móvil
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(false);
    }
  };

  const handleGroupSelect = async (group) => {
    //  CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    chatState.setAdminViewConversation(null); // Limpiar vista de admin
    chatState.setReplyingTo(null); //  Limpiar estado de respuesta
    chatState.setPinnedMessageId(group.pinnedMessageId || null);
    setPinnedMessageObject(null); //  Limpiar objeto mensaje fijado
    // Establecer nuevo estado
    chatState.setTo(group.name);
    chatState.setIsGroup(true);
    chatState.setCurrentRoomCode(group.roomCode);
    chatState.currentRoomCodeRef.current = group.roomCode;
    setSelectedRoomData(group);

    //  FIX: Resetear contador inmediatamente al entrar al grupo
    chatState.setUnreadMessages(prev => ({ ...prev, [group.roomCode]: 0 }));
    chatState.setMyActiveRooms(prev => prev.map(room =>
      room.roomCode === group.roomCode ? { ...room, unreadCount: 0 } : room
    ));
    chatState.setFavoriteRooms(prev => prev.map(f =>
      (f.type === 'room' && f.roomCode === group.roomCode) ? { ...f, unreadCount: 0 } : f
    ));
    // Limpiar pendingMentions
    if (chatState.pendingMentions[group.roomCode]) {
      chatState.setPendingMentions(prev => {
        const updated = { ...prev };
        delete updated[group.roomCode];
        return updated;
      });
    }

    //  NUEVO: Cargar usuarios de la sala desde la API (con displayName, role, email, etc.)
    try {
      const response = await apiService.getRoomUsers(group.roomCode);
      let apiUsers = [];

      if (Array.isArray(response)) {
        apiUsers = response;
      } else if (response && typeof response === 'object') {
        apiUsers = response.users || response.data || [];
        if (response.maxCapacity) {
          setSelectedRoomData(prev => ({ ...prev, maxCapacity: response.maxCapacity }));
        }
      }

      //  ENRIQUECIMIENTO Y DEDUPLICACIÓN: Priorizar objetos sobre strings
      const userMap = new Map();

      apiUsers.forEach(u => {
        let username = typeof u === 'string' ? u : u.username;
        if (!username) return;

        const idLower = username.toLowerCase().trim();
        const existing = userMap.get(idLower);

        if (typeof u === 'string') {
          if (existing) return; // Ya hay algo, no sobreescribir con string
          const found = chatState.userList.find(gl => (gl.username || '').toLowerCase().trim() === idLower);
          if (found) {
            userMap.set(idLower, {
              ...found,
              username: u,
              displayName: found.displayName || `${found.nombre || ''} ${found.apellido || ''}`.trim() || u
            });
          } else {
            userMap.set(idLower, { username: u, displayName: u });
          }
        } else {
          // Es un objeto, asegurar mejores campos y sobreescribir
          if (!u.displayName && (u.nombre || u.apellido)) {
            u.displayName = `${u.nombre || ''} ${u.apellido || ''}`.trim();
          }
          if (!u.picture) {
            const found = chatState.userList.find(gl => (gl.username || '').toLowerCase().trim() === idLower);
            if (found?.picture) u.picture = found.picture;
          }
          userMap.set(idLower, u);
        }
      });

      const enrichedUsers = Array.from(userMap.values());
      // Alimentar cache de displayNames
      enrichedUsers.forEach(u => {
        if (u && u.username && u.displayName && !/^\d+$/.test(u.displayName)) {
          chatState.roomUsersNameCacheRef.current.set(u.username.toLowerCase().trim(), {
            displayName: u.displayName, nombre: u.nombre, apellido: u.apellido, picture: u.picture
          });
        }
      });
      chatState.setRoomUsers(enrichedUsers);
    } catch (error) {
      console.error('Error al cargar usuarios de la sala:', error);
      chatState.setRoomUsers(group.members || []); // Fallback a group.members si falla
    }

    // 📱 Cerrar sidebar en mobile al seleccionar un grupo
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(false);
    }
  };

  const handlePersonalNotes = () => {
    //  CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    chatState.setRoomUsers([]); // Limpiar usuarios de sala
    chatState.setIsGroup(false);
    chatState.setCurrentRoomCode(null);
    chatState.currentRoomCodeRef.current = null;
    chatState.setAdminViewConversation(null); // Limpiar vista de admin
    chatState.setReplyingTo(null); //  Limpiar estado de respuesta
    chatState.setPinnedMessageId(null);
    setPinnedMessageObject(null);
    setSelectedRoomData(null); //  Limpiar datos de sala
    chatState.setTo(username);
  };

  const handleToggleMenu = useCallback(() => {
    if (window.innerWidth <= 768) {
      // Comprobar si hay un chat abierto activamente
      const isChatOpen = chatState.to || chatState.currentRoomCode || chatState.adminViewConversation;

      if (isChatOpen) {
        // ESCENARIO 1: Hay un chat abierto -> "Volver atrás" a la lista
        chatState.setTo('');
        chatState.setIsGroup(false);
        chatState.setCurrentRoomCode(null);
        chatState.currentRoomCodeRef.current = null;
        chatState.setAdminViewConversation(null);
        clearMessages();
        // Asegurar que el sidebar de navegación (LeftSidebar) esté cerrado al volver a la lista
        chatState.setShowSidebar(false);
      } else {
        // ESCENARIO 2: Estamos en la lista -> "Toggle Menú" (Abrir/Cerrar LeftSidebar)
        chatState.setShowSidebar(!chatState.showSidebar);
      }
    }
  }, [chatState, clearMessages]);

  // Reemplaza tu handleEscKey actual con este:
  const handleEscKey = useCallback((event) => {
    if (event.key === 'Escape') {
      // 1. Prioridad Alta: Cerrar Modales
      if (chatState.showCreateRoomModal) { chatState.setShowCreateRoomModal(false); return; }
      if (chatState.showJoinRoomModal) { chatState.setShowJoinRoomModal(false); return; }
      if (chatState.showAdminRoomsModal) { chatState.setShowAdminRoomsModal(false); return; }
      if (chatState.showAdminMenu) { chatState.setShowAdminMenu(false); return; }

      // 2. Prioridad Media: Cerrar Sidebar en Móvil
      if (window.innerWidth <= 768 && chatState.showSidebar) {
        chatState.setShowSidebar(false);
        return;
      }

      // 3. Prioridad Baja: Cerrar el Chat Actual
      if (chatState.to || chatState.currentRoomCode || chatState.adminViewConversation) {
        console.log("🛑 ESC presionado: Cerrando chat...");

        // Limpiar estados
        chatState.setTo('');
        chatState.setIsGroup(false);
        chatState.setCurrentRoomCode(null);
        chatState.currentRoomCodeRef.current = null;
        chatState.setRoomUsers([]);
        chatState.setAdminViewConversation(null);
        chatState.setReplyingTo(null);
        chatState.setPinnedMessageId(null);
        setPinnedMessageObject(null);
        // Limpiar mensajes visualmente
        clearMessages();

        // Si estaba en una sala, emitir salida (opcional)
        if (chatState.currentRoomCode && socket && socket.connected) {
          // socket.emit('leaveRoom', { roomCode: chatState.currentRoomCode, from: username });
        }
      }
    }
  }, [chatState, socket, clearMessages]); //  Agregamos dependencias correctas

  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  const handleNavigateToMention = async (event) => {
    const { roomCode, messageId } = event.detail;

    // Buscar la sala en myActiveRooms
    const room = chatState.myActiveRooms.find((r) => r.roomCode === roomCode);
    if (room) {
      await roomManagement.handleRoomSelect(room, messageId);
    } else {
      console.error("Sala no encontrada:", roomCode);
    }
  };

  const handleGoToMessage = async (mention) => {
    console.log('🚀 handleGoToMessage:', mention);

    // 1. Cerrar paneles laterales si estamos en mobile
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(false);
    }

    try {
      if (mention.isGroup && mention.roomCode) {
        // === ES GRUPO ===
        // Buscar sala en mis salas activas
        let room = chatState.myActiveRooms.find(r => r.roomCode === mention.roomCode);

        // Si no está, buscar en API
        if (!room) {
          try {
            room = await apiService.getRoomByCode(mention.roomCode);
          } catch (e) { console.error('Error buscando sala:', e); }
        }

        if (room) {
          // Usar roomManagement para cambiar de sala y saltar al mensaje
          // handleRoomSelect maneja la lógica de cargar mensajes y hacer scroll (via loadMessagesAroundId)
          await roomManagement.handleRoomSelect(room, mention.id);
        } else {
          showErrorAlert('No se pudo encontrar la sala de esta mención');
        }
      } else {
        // === ES PRIVADO ===
        // Navegar al chat con el usuario que me mencionó
        // 'mention.from' es el remitente.
        await handleUserSelect(mention.from, mention.id);
      }
    } catch (error) {
      console.error('Error al navegar a la mención:', error);
    }
  };

  const handleNavigateToGroup = async (event) => {
    const { roomCode, groupName, messageId } = event.detail;

    console.log('🔍 handleNavigateToGroup:', { roomCode, groupName, messageId });

    // Buscar la sala en myActiveRooms
    let room = null;

    if (roomCode) {
      room = chatState.myActiveRooms.find((r) => r.roomCode === roomCode);
    } else if (groupName) {
      room = chatState.myActiveRooms.find((r) => r.name === groupName || r.roomCode === groupName);
    }

    if (room) {
      console.log('✅ Sala encontrada en myActiveRooms:', room.roomCode);
      await roomManagement.handleRoomSelect(room, messageId);
    } else if (roomCode) {
      // Si no está en myActiveRooms, buscar directamente por código
      console.log('🔍 Sala no en myActiveRooms, buscando por código:', roomCode);
      try {
        const roomData = await apiService.getRoomByCode(roomCode);
        if (roomData) {
          console.log('✅ Sala obtenida por código:', roomData);
          await roomManagement.handleRoomSelect(roomData, messageId);
        } else {
          console.error("Sala no encontrada por código:", roomCode);
        }
      } catch (error) {
        console.error("Error al buscar sala por código:", error);
      }
    } else {
      console.error("No se proporcionó roomCode ni se encontró la sala");
    }
  };

  const handleNavigateToChat = async (event) => {
    const { to: targetUsername, messageId } = event.detail;

    // Buscar en conversaciones asignadas
    const conversation = chatState.assignedConversations.find((conv) => {
      return conv.participants && conv.participants.some(
        p => p?.toLowerCase().trim() === targetUsername?.toLowerCase().trim()
      );
    });

    // Limpiar estado previo
    clearMessages();
    chatState.setIsGroup(false);
    chatState.setCurrentRoomCode(null);
    chatState.currentRoomCodeRef.current = null;
    chatState.setRoomUsers([]);
    chatState.setReplyingTo(null);

    if (conversation) {
      // Usar misma lógica que handleUserSelect para chats asignados
      const myNameNormalized = normalizeUsername(currentUserFullName);
      const myDniNormalized = normalizeUsername(user?.username || '');

      const isParticipant = conversation.participants?.some(
        p => normalizeUsername(p) === myNameNormalized || normalizeUsername(p) === myDniNormalized
      );

      if (isParticipant) {
        // MODO PARTICIPANTE - trabajar en el chat
        chatState.setAdminViewConversation(null);
        const otherPerson = conversation.participants.find(
          p => normalizeUsername(p) !== myNameNormalized && normalizeUsername(p) !== myDniNormalized
        );
        chatState.setTo(otherPerson || targetUsername);
      } else {
        // MODO OBSERVADOR - monitoreo admin
        chatState.setAdminViewConversation(conversation);
        chatState.setTo(targetUsername);
      }
    } else {
      // Chat directo normal (no asignado)
      chatState.setAdminViewConversation(null);
      chatState.setTo(targetUsername);
    }

    // Si hay messageId, establecer para scroll después de cargar mensajes
    if (messageId) {
      setHighlightMessageId(messageId);
    }

    // UX Móvil: cerrar sidebar
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(false);
    }
  };


  const normalizeUsername = (username) => {
    return (
      username
        ?.toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || ""
    );
  };

  //  NUEVO: Registrar event listeners para navegación desde toasts
  useEffect(() => {
    window.addEventListener('navigateToRoom', handleNavigateToGroup);
    window.addEventListener('navigateToChat', handleNavigateToChat);
    window.addEventListener('navigateToGroup', handleNavigateToGroup);
    window.addEventListener('navigateToMention', handleNavigateToMention);

    return () => {
      window.removeEventListener('navigateToRoom', handleNavigateToGroup);
      window.removeEventListener('navigateToChat', handleNavigateToChat);
      window.removeEventListener('navigateToGroup', handleNavigateToGroup);
      window.removeEventListener('navigateToMention', handleNavigateToMention);
    };
  }, [chatState.myActiveRooms, chatState.assignedConversations]);


  const handleSendMessage = async (messageData = null) => {
    // 🛡️ SANITIZACIÓN CRÍTICA
    if (messageData && (messageData.nativeEvent || messageData.preventDefault || messageData.target || messageData.bubbles !== undefined)) {
      messageData = null;
    }

    // 1. Prevenir envío si ya se está enviando o si está vacío
    if (chatState.isSending) return;

    // Si viene messageData (ej: encuesta), permitimos enviar aunque input esté vacío
    const isDirectMessage = messageData && (messageData.isPoll || messageData.text);

    if (!isDirectMessage && ((!input && mediaFiles.length === 0) || !chatState.to)) return;

    chatState.setIsSending(true);

    try {
      // 2. Normalización y verificación de chat asignado
      const myNameNormalized = normalizeUsername(currentUserFullName);
      const myDniNormalized = normalizeUsername(user?.username || '');

      let assignedConv = chatState.adminViewConversation;
      if (!assignedConv) {
        assignedConv = chatState.assignedConversations?.find((conv) => {
          if (conv.name && normalizeUsername(conv.name) === normalizeUsername(chatState.to)) return true;
          const participants = conv.participants || [];
          return participants.some(p => normalizeUsername(p) === normalizeUsername(chatState.to));
        });
      }

      console.log('🔍 [handleSendMessage] DEBUG assignedConv:', {
        fromState: !!chatState.adminViewConversation,
        foundId: assignedConv?.id,
        participants: assignedConv?.participants,
        to: chatState.to
      });

      const effectiveIsGroup = assignedConv ? false : chatState.isGroup;

      // 🛡️ FRONTEND CROSS-TALK FIX
      let finalRoomCode = effectiveIsGroup ? chatState.currentRoomCode : undefined;
      if (effectiveIsGroup && chatState.to && chatState.myActiveRooms) {
        const matchingRoom = chatState.myActiveRooms.find(
          r => r.name?.trim().toLowerCase() === chatState.to.trim().toLowerCase()
        );
        if (matchingRoom && matchingRoom.roomCode !== finalRoomCode) {
          console.log(`🔒 Corrección de Sala: Usando ${matchingRoom.roomCode} para "${chatState.to}"`);
          finalRoomCode = matchingRoom.roomCode;
        }
      }

      // 3. Preparar lista de trabajos
      const hasFiles = !isDirectMessage && mediaFiles.length > 0;

      // Activar flag de subida si hay archivos
      if (hasFiles) chatState.setIsUploadingFile(true);

      let attachments = [];
      let firstAttachmentData = {};

      if (hasFiles) {
        try {
          // A. SUBIDA DE ARCHIVOS EN PARALELO
          const uploadPromises = mediaFiles.map(file => apiService.uploadFile(file, "chat"));
          const uploadResults = await Promise.all(uploadPromises);

          attachments = uploadResults.map((result, index) => {
            const file = mediaFiles[index];
            return {
              url: result.fileUrl,
              mediaType: file.type.split("/")[0] || 'file',
              fileName: result.fileName,
              fileSize: result.fileSize
            };
          });

          // Mantener compatibilidad con campos antiguos (usando el primer archivo)
          if (attachments.length > 0) {
            firstAttachmentData = {
              mediaType: attachments[0].mediaType,
              mediaData: attachments[0].url,
              fileName: attachments[0].fileName,
              fileSize: attachments[0].fileSize
            };
          }
        } catch (err) {
          console.error(`Error subiendo archivos:`, err);
          showErrorAlert("Error subida", "Falló al subir uno o más archivos.");
          chatState.setIsUploadingFile(false);
          chatState.setIsSending(false);
          return;
        }
      }

      // B. DATOS DE RESPUESTA
      let replyData = {};
      if (chatState.replyingTo) {
        let replyToTextClean = "";
        const specificAttachment = chatState.replyingTo.attachment;

        if (specificAttachment) {
          // Si es respuesta a un ADJUNTO específico
          replyToTextClean = specificAttachment.fileName || (specificAttachment.mediaType === 'image' ? '📷 Foto' : '📎 Archivo');
        } else if (chatState.replyingTo.text && typeof chatState.replyingTo.text === 'string') {
          replyToTextClean = chatState.replyingTo.text;
        } else if (chatState.replyingTo.fileName) {
          replyToTextClean = chatState.replyingTo.fileName;
        } else if (chatState.replyingTo.mediaType) {
          const mediaTypeMap = { 'image': '📷 Foto', 'video': '🎥 Video', 'audio': '🎵 Audio', 'file': '📎 Archivo', 'pdf': '📄 PDF' };
          replyToTextClean = mediaTypeMap[chatState.replyingTo.mediaType] || "📎 Archivo adjunto";
        } else {
          replyToTextClean = "Mensaje original";
        }

        let replyToId = chatState.replyingTo.id;
        if (typeof replyToId === 'string' && replyToId.startsWith('gallery-')) {
          replyToId = replyToId.replace('gallery-', '');
        }

        replyData = {
          replyToMessageId: replyToId,
          replyToSender: chatState.replyingTo.sender,
          replyToText: replyToTextClean,
          replyToSenderNumeroAgente: chatState.replyingTo.senderNumeroAgente,
          replyToAttachmentId: specificAttachment?.id || null //  NUEVO: ID del adjunto específico
        };
      }

      // C. CONSTRUCCIÓN DEL MENSAJE ÚNICO
      let messageObj = {
        from: username,
        // fromId: user.id, //  REMOVIDO: El backend lo resuelve vía DNI (username)
        to: chatState.to,
        groupName: effectiveIsGroup ? chatState.to : undefined,
        message: String(input || ""),
        isGroup: effectiveIsGroup,
        roomCode: finalRoomCode,
        ...replyData
      };

      // Solo agregar adjuntos si existen
      if (hasFiles && attachments.length > 0) {
        messageObj.attachments = attachments;
        Object.assign(messageObj, firstAttachmentData); // Retrocompatibilidad
      }

      // Merge con messageData si es mensaje directo
      if (!hasFiles && messageData) {
        messageObj = { ...messageObj, ...messageData };
        // Asegurar string en message si viene de data
        if (!messageObj.message && messageData.text) messageObj.message = messageData.text;

        if (messageData.isPoll) {
          messageObj.type = 'poll';
          messageObj.message = messageData.poll.question;
          messageObj.mediaData = JSON.stringify(messageData.poll);
          messageObj.mediaType = 'poll_data';
        }
      }

      // Datos extra si es asignado
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        const other = assignedConv.participants.find(p => {
          const pNorm = normalizeUsername(p);
          return pNorm !== myNameNormalized && pNorm !== myDniNormalized;
        });
        if (other) messageObj.actualRecipient = other;
      }

      // 4. GUARDAR Y EMITIR
      // DIFERENCIA CLAVE: Para GRUPOS, el backend guarda. Para INDIVIDUALES, el frontend guarda.
      if (effectiveIsGroup) {
        // GRUPO: Solo emitir por socket, el backend guarda y emite de vuelta
        console.log('📡 [handleSendMessage] Emitiendo a GRUPO:', {
          to: messageObj.to,
          roomCode: messageObj.roomCode,
          isGroup: messageObj.isGroup
        });
        if (socket && socket.connected) {
          socket.emit("message", messageObj);
        }
        // Para grupos, no tenemos un savedMessage inmediato para actualizar la UI
        // La UI se actualizará cuando el backend re-emita el mensaje.
        // Por ahora, podemos limpiar el input y el replyingTo.
        // La bandera isSending se limpiará en finally.
      } else {
        // INDIVIDUAL: Frontend guarda en BD, luego emite por socket
        const savedMessage = await apiService.createMessage({
          ...messageObj,
          to: messageObj.to
        });

        console.log('✅ Mensaje guardado:', savedMessage.id);

        // 2. Emitir por Socket
        if (socket && socket.connected) {
          socket.emit("message", {
            ...messageObj,
            id: savedMessage.id,
            sentAt: savedMessage.sentAt,
          });
        }

        // 3. UI update
        addNewMessage({
          ...savedMessage,
          isSent: true,
          isSelf: true,
          sender: "Tú",
          realSender: currentUserFullName
        });

      } // Fin del bucle

      //  NUEVO: Función de ordenamiento unificada (para ser consistente con useSocketListeners)
      const sortUnified = (rooms, codes) => {
        if (!rooms || !Array.isArray(rooms)) return rooms;
        const favCodes = Array.isArray(codes) ? codes.map(c => String(c).toLowerCase().trim()) : [];
        const parseDate = (r) => {
          const dateStr = r.lastActivity || r.lastMessage?.sentAt || r.lastMessageTime || r.createdAt;
          if (!dateStr) return 0;
          const d = new Date(dateStr).getTime();
          return isNaN(d) ? 0 : d;
        };
        const favorites = rooms.filter(r => {
          const rc = r.roomCode ? String(r.roomCode).toLowerCase().trim() : '';
          const ri = r.id ? String(r.id).toLowerCase().trim() : '';
          return favCodes.includes(rc) || favCodes.includes(ri);
        });
        const others = rooms.filter(r => {
          const rc = r.roomCode ? String(r.roomCode).toLowerCase().trim() : '';
          const ri = r.id ? String(r.id).toLowerCase().trim() : '';
          return !favCodes.includes(rc) && !favCodes.includes(ri);
        });
        const sorter = (g) => [...g].sort((a, b) => parseDate(b) - parseDate(a));
        return [...sorter(favorites), ...sorter(others)];
      };

      const now = new Date().toISOString();
      const timeNow = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

      const updateList = (prev) => {
        const isTarget = (r) => (messageObj.roomCode && String(r.roomCode) === String(messageObj.roomCode)) ||
          (messageObj.conversationId && String(r.id) === String(messageObj.conversationId));

        if (!prev.some(isTarget)) return prev;

        const updated = prev.map(r => {
          if (isTarget(r)) {
            return {
              ...r,
              lastActivity: now, //  CRÍTICO: Para el sort
              lastMessage: {
                text: messageObj.message,
                from: currentUserFullName,
                time: timeNow,
                sentAt: now,
                mediaType: messageObj.mediaType,
                fileName: messageObj.fileName
              }
            };
          }
          return r;
        });
        return sortUnified(updated, chatState.favoriteRoomCodes);
      };

      // Actualizar todas las listas relevantes inmediatamente
      chatState.setFavoriteRooms(updateList);
      chatState.setMyActiveRooms(updateList);
      chatState.setAssignedConversations(updateList);

      // Limpieza final exitosa
      clearInput();
      chatState.setReplyingTo(null);

    } catch (error) {
      console.error("Error enviando mensaje(s):", error);
      showErrorAlert("Error al enviar", error.message || "No se pudo enviar el mensaje por problemas de conexión.");
    } finally {
      chatState.setIsSending(false);
      chatState.setIsUploadingFile(false);
    }
  };

  const handleEditMessage = async (messageId, newText, newFile = null) => {
    if (!newText.trim() && !newFile) {
      await showErrorAlert("Error", "El mensaje no puede estar vacío");
      return;
    }

    try {
      let mediaType = null;
      let mediaData = null;
      let fileName = null;
      let fileSize = null;

      //  Si hay un nuevo archivo, subirlo primero
      if (newFile) {
        try {
          const uploadResult = await apiService.uploadFile(newFile, "chat");
          mediaType = newFile.type.split("/")[0];
          mediaData = uploadResult.fileUrl;
          fileName = uploadResult.fileName;
          fileSize = uploadResult.fileSize;
        } catch (error) {
          console.error("❌ Error al subir archivo:", error);
          await showErrorAlert(
            "Error",
            "Error al subir el archivo. Inténtalo de nuevo."
          );
          return;
        }
      }

      // Actualizar en la base de datos
      await apiService.editMessage(
        messageId,
        username,
        newText,
        mediaType,
        mediaData,
        fileName,
        fileSize
      );

      // Emitir evento de socket para sincronizar en tiempo real
      if (socket && socket.connected) {
        socket.emit("editMessage", {
          messageId,
          username,
          newText,
          mediaType,
          mediaData,
          fileName,
          fileSize,
          to: chatState.to,
          isGroup: chatState.isGroup,
          roomCode: chatState.currentRoomCode,
        });
      }

      // Actualizar localmente
      //  CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
      const updateData = {
        text: newText,
        isEdited: true,
        editedAt: new Date(),
      };

      // Si hay nuevo archivo, actualizar también los campos multimedia
      if (newFile) {
        updateData.mediaType = mediaType;
        updateData.mediaData = mediaData;
        updateData.fileName = fileName;
        updateData.fileSize = fileSize;
      }

      updateMessage(messageId, updateData);
    } catch (error) {
      console.error("Error al editar mensaje:", error);
      await showErrorAlert(
        "Error",
        "Error al editar el mensaje. Inténtalo de nuevo."
      );
    }
  };

  const handleDeleteMessage = async (messageId, messageSender) => {
    const result = await showConfirmAlert(
      "¿Eliminar mensaje?",
      `¿Estás seguro de que quieres eliminar este mensaje de ${messageSender}?`
    );

    if (!result.isConfirmed) return;

    try {
      // Eliminar en la base de datos
      await apiService.deleteMessage(
        messageId,
        username,
        isAdmin,
        currentUserFullName
      );

      // Emitir evento de socket para sincronizar en tiempo real
      if (socket && socket.connected) {
        socket.emit("deleteMessage", {
          messageId,
          username,
          to: chatState.to,
          isGroup: chatState.isGroup,
          roomCode: chatState.currentRoomCode,
          isAdmin,
          deletedBy: currentUserFullName,
        });
      }

      //  CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
      // Actualizar localmente
      updateMessage(messageId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUserFullName,
        text: `Mensaje eliminado por ${currentUserFullName}`,
      });

      await showSuccessAlert("Éxito", "Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      await showErrorAlert(
        "Error",
        "Error al eliminar el mensaje. Inténtalo de nuevo."
      );
    }
  };

  // Definición de la función (ya la tienes)
  const handleReplyMessage = useCallback((message, attachment = null) => {
    chatState.setReplyingTo({
      ...message,
      attachment: attachment // Guardar el adjunto específico si existe
    });
    //  Hacer focus en el textarea inmediatamente
    const textarea = document.querySelector('.message-input');
    if (textarea) {
      textarea.focus();
    }
  }, [chatState]);

  //  AGREGAR ESTO: Exponer la función globalmente para ChatContent
  useEffect(() => {
    window.handleReplyMessage = handleReplyMessage;
    return () => {
      delete window.handleReplyMessage;
    };
  }, [handleReplyMessage]);

  const handleCancelReply = useCallback(() => {
    chatState.setReplyingTo(null);
  }, [chatState]);

  // Limpiar mensajes no leídos cuando el usuario empieza a escribir
  const handleClearUnreadOnTyping = useCallback(async () => {
    if (chatState.isGroup && chatState.currentRoomCode) {
      // Para grupos, limpiar por roomCode
      const hasUnread = (chatState.unreadMessages?.[chatState.currentRoomCode] || 0) > 0;

      if (hasUnread) {
        //  FIX: Sincronizar lectura de grupo con el backend
        markRoomMessagesAsRead(chatState.currentRoomCode);

        chatState.setUnreadMessages(prev => {
          if (prev[chatState.currentRoomCode] === 0) return prev;
          return { ...prev, [chatState.currentRoomCode]: 0 };
        });
      }
    } else if (!chatState.isGroup && chatState.to) {
      //  FIX: Para chats individuales, marcar como leído cuando el usuario escribe
      const conv = chatState.assignedConversations?.find(c =>
        c.participants?.some(p => normalizeUsername(p) === normalizeUsername(chatState.to))
      );

      if (conv) {
        // Verificar si hay mensajes no leídos
        const hasUnread = (chatState.unreadMessages?.[conv.id] || 0) > 0;

        if (hasUnread) {
          try {
            // 1. Marcar en Backend
            //  FIX: Corregir orden (Lector primero: username/DNI, Emisor segundo: chatState.to)
            await apiService.markConversationAsRead(username, chatState.to);

            // 2. Emitir Socket
            if (socket && socket.connected) {
              socket.emit('markConversationAsRead', {
                from: username,
                to: chatState.to
              });
            }

            // 3. Limpiar contador local
            chatState.setUnreadMessages(prev => ({
              ...prev,
              [conv.id]: 0
            }));

            // 4. Actualizar conversación
            chatState.setAssignedConversations(prev => prev.map(c =>
              c.id === conv.id ? { ...c, unreadCount: 0 } : c
            ));
          } catch (error) {
            console.error("Error marking chat as read on typing:", error);
          }
        }
      }
    }
  }, [chatState, currentUserFullName, socket]);

  const handleSendVoiceMessage = useCallback(async (audioFile) => {
    if (!audioFile || !chatState.to) return;

    try {
      // Determinar correctamente si estamos en grupo o chat asignado
      const myNameNormalized = normalizeUsername(currentUserFullName);
      const myDniNormalized = normalizeUsername(user?.username || '');

      let assignedConv = chatState.adminViewConversation;
      if (!assignedConv) {
        assignedConv = chatState.assignedConversations?.find((conv) => {
          const participants = conv.participants || [];
          return participants.some(p => normalizeUsername(p) === normalizeUsername(chatState.to));
        });
      }

      // Si es grupo, SIEMPRE es grupo
      const effectiveIsGroup = chatState.isGroup;

      // 🛡️ FRONTEND CROSS-TALK FIX: Determinar roomCode basado en el NOMBRE visible
      let finalRoomCode = effectiveIsGroup ? chatState.currentRoomCode : undefined;

      if (effectiveIsGroup && chatState.to && chatState.myActiveRooms) {
        const matchingRoom = chatState.myActiveRooms.find(
          r => r.name?.trim().toLowerCase() === chatState.to.trim().toLowerCase()
        );

        if (matchingRoom && matchingRoom.roomCode !== finalRoomCode) {
          console.log(`🔒 VoiceAudio Corrección: Usando ${matchingRoom.roomCode} para "${chatState.to}"`);
          finalRoomCode = matchingRoom.roomCode;
        }
      }

      // 1. Subir archivo al servidor
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      // 2. Preparar objeto del mensaje
      const messageData = {
        to: chatState.to,
        isGroup: effectiveIsGroup,
        groupName: effectiveIsGroup ? chatState.to : undefined,
        from: username,
        // fromId: user.id, //  REMOVIDO: El backend lo resuelve vía DNI (username)
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        message: "",
        roomCode: finalRoomCode
      };

      // Datos extra para asignados
      if (assignedConv) {
        messageData.isAssignedConversation = true;
        messageData.conversationId = assignedConv.id;
        messageData.participants = assignedConv.participants;
        const other = assignedConv.participants.find(p => {
          const pNorm = normalizeUsername(p);
          return pNorm !== myNameNormalized && pNorm !== myDniNormalized;
        });
        if (other) messageData.actualRecipient = other;
      }

      //  DIFERENCIA CLAVE: Para GRUPOS, el backend guarda. Para INDIVIDUALES, el frontend guarda.
      if (effectiveIsGroup) {
        // GRUPO: Solo emitir por socket, el backend guarda y emite de vuelta
        if (socket && socket.connected) {
          socket.emit("message", messageData);
        }
      } else {
        // INDIVIDUAL: Frontend guarda en BD, luego emite por socket
        const savedMessage = await apiService.createMessage({
          ...messageData,
          to: messageData.to
        });

        if (socket && socket.connected) {
          socket.emit("message", {
            ...messageData,
            id: savedMessage.id,
            sentAt: savedMessage.sentAt
          });
        }
      }

      //  CONFIAR EN EL BACKEND - No agregar mensaje localmente

    } catch (error) {
      console.error("Error enviando audio:", error);
      showErrorAlert("Error", "No se pudo enviar el audio.");
    }
  }, [chatState, user, socket, currentUserFullName]);

  // Función para enviar mensaje en hilo
  const handleSendThreadMessage = useCallback(async (messageData) => {
    if (!user || (!user.id && !user.username)) return;

    try {
      const messageObj = {
        from: messageData.from || username,
        to: messageData.to,
        message: messageData.text || "",
        isGroup: !!messageData.isGroup,
        roomCode: messageData.roomCode || null,
        threadId: messageData.threadId,
        fromId: user.id, // TODO: Eliminar si el backend de hilos también resuelve el ID solo
        //  NUEVO: Incluir datos de respuesta
        replyToMessageId: messageData.replyToMessageId || null,
        replyToSender: messageData.replyToSender || null,
        replyToText: messageData.replyToText || null,
      };

      if (messageData.mediaType) {
        messageObj.mediaType = messageData.mediaType;
        messageObj.mediaData = messageData.mediaData;
        messageObj.fileName = messageData.fileName;
        messageObj.fileSize = messageData.fileSize;
      }

      //  NUEVO: Incluir attachments para mensajes con múltiples archivos
      if (messageData.attachments && Array.isArray(messageData.attachments)) {
        messageObj.attachments = messageData.attachments;
      }

      //  NUEVO: Incluir replyToAttachmentId si existe
      if (messageData.replyToAttachmentId) {
        messageObj.replyToAttachmentId = messageData.replyToAttachmentId;
      }

      // 1. Guardar en BD
      console.log('🔍 DEBUG - Guardando mensaje en BD:', messageObj);
      const savedMessage = await apiService.createMessage(messageObj);
      console.log('✅ DEBUG - Mensaje guardado:', {
        id: savedMessage.id,
        from: savedMessage.from,
        mediaType: savedMessage.mediaType,
        fileName: savedMessage.fileName,
      });

      // 2. NO incrementar contador aquí - el backend lo hace al recibir threadCountUpdated
      // await apiService.incrementThreadCount(messageData.threadId); // REMOVIDO - causaba doble incremento

      // 3. Emitir por socket (Esto hará que 'useSocketListeners' reciba el evento y actualice la UI)
      if (socket && socket.connected) {
        console.log('📡 DEBUG - Emitiendo threadMessage:', {
          id: savedMessage.id,
          threadId: messageData.threadId,
          isGroup: !!messageData.isGroup,
          roomCode: messageData.roomCode,
          to: messageObj.to
        });
        socket.emit("threadMessage", {
          ...savedMessage,
          //  ASEGURAR RUTAS PARA CLUSTER:
          // Explicitamente pasar datos de routing por si savedMessage no los tiene
          threadId: messageData.threadId,
          isGroup: !!messageData.isGroup,
          roomCode: messageData.roomCode,
          from: messageObj.from,
          to: messageObj.to,
          replyToAttachmentId: messageData.replyToAttachmentId || null, //  NUEVO: Para hilos de adjuntos
        });

        //  ESTA LÍNEA ES LA CLAVE: Avisa al servidor que avise a todos (incluyéndome) que actualicen el contador
        socket.emit("threadCountUpdated", {
          messageId: messageData.threadId,
          lastReplyFrom: username,
          from: messageData.from,
          to: messageData.to,
          roomCode: messageData.roomCode,
          isGroup: messageData.isGroup,
        });
      }

    } catch (error) {
      console.error("Error enviando hilo:", error);
      await showErrorAlert("Error", "No se pudo enviar la respuesta.");
    }
  }, [socket, user, username]);
  //  HANDLER PARA VOTAR EN ENCUESTA
  const handlePollVote = useCallback((messageId, optionIndex) => {
    if (socket && socket.connected) {
      // 🛡️ Safe Room Code Logic
      let voteRoomCode = chatState.currentRoomCode;
      if (chatState.isGroup && chatState.to && chatState.myActiveRooms) {
        const room = chatState.myActiveRooms.find(r => r.name?.trim().toLowerCase() === chatState.to.trim().toLowerCase());
        if (room) voteRoomCode = room.roomCode;
      }

      console.log('🗳️ Emitiendo voto:', { messageId, optionIndex, username });
      socket.emit('pollVote', { // CORREGIDO: Backend espera 'pollVote'
        messageId,
        optionIndex,
        username,
        roomCode: voteRoomCode,
        to: !chatState.isGroup ? chatState.to : null, // Necesario para chats privados
        isGroup: chatState.isGroup
      });
    } else {
      showErrorAlert("Sin conexión", "No se puede votar en este momento.");
    }
  }, [socket, username, chatState]);

  //  LISTENER PARA ACTUALIZACIONES DE ENCUESTA
  useEffect(() => {
    if (!socket) return;

    const onPollUpdated = (updatedPollMessage) => {
      console.log('🔄 Poll Updated recibido:', updatedPollMessage);

      // Actualizar el mensaje en la lista 'messages'
      // Usamos el callback de setState para asegurar que tenemos la lista más reciente
      // Pero 'updateMessage' del hook useMessagePagination ya lo maneja

      updateMessage(updatedPollMessage.id, (prevMsg) => ({
        ...prevMsg,
        poll: updatedPollMessage.poll || updatedPollMessage, // Ajustar según lo que envíe el backend
        // Actualizar mediaData para persistencia visual inmediata
        mediaData: JSON.stringify(updatedPollMessage.poll || updatedPollMessage)
      }));
    };

    socket.on('pollUpdated', onPollUpdated);
    return () => {
      socket.off('pollUpdated', onPollUpdated);
    };
  }, [socket, updateMessage]);

  //  FUNCIÓN RESTAURADA: Iniciar videollamada con Tarjeta UI
  const handleStartVideoCall = useCallback(async () => {
    try {
      // 1️⃣ VALIDACIONES
      if (!chatState.to) {
        await showErrorAlert(
          "Atención",
          "Selecciona un chat para iniciar la llamada."
        );
        return;
      }

      // Validar permisos estrictos para grupos (Coordinador/Admin/etc)
      const userRole = (user?.role || "").toUpperCase();
      const allowedRoles = ["COORDINADOR", "ADMIN", "JEFEPISO", "PROGRAMADOR"];

      if (chatState.isGroup && !allowedRoles.includes(userRole)) {
        await showErrorAlert(
          "Sin permisos",
          "Solo los coordinadores y administradores pueden iniciar videollamadas grupales."
        );
        return;
      }

      // 2️⃣ GENERACIÓN DE SALA Y URL
      const videoRoomID = chatState.isGroup
        ? `group_${chatState.currentRoomCode || Date.now()}`
        : `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const baseUrl = window.location.origin;
      const videoCallUrl = `${baseUrl}/video-call?roomID=${videoRoomID}&creator=true`;

      console.log("📹 Iniciando llamada en:", videoCallUrl);

      //  Guardar participantes en localStorage para poder cerrar la sala después
      const participants = chatState.isGroup
        ? chatState.roomUsers.map((u) =>
          typeof u === "string" ? u : u.username || u.nombre
        )
        : [chatState.to];

      localStorage.setItem(
        `videoCall_${videoRoomID}_participants`,
        JSON.stringify(participants)
      );

      // 3️⃣ PREPARAR DATOS DEL MENSAJE
      const fallbackText = chatState.isGroup
        ? `📹 Videollamada grupal iniciada por ${currentUserFullName}`
        : `📹 Videollamada iniciada`;

      // Objeto base para enviar
      const messagePayload = {
        to: chatState.to,
        isGroup: chatState.isGroup,
        from: username,
        fromId: user?.id,
        roomCode: chatState.currentRoomCode,
        type: "video_call", //  Esto activa la tarjeta visual
        message: fallbackText,
        text: fallbackText,
        videoCallRoomID: videoRoomID,
        videoCallUrl: videoCallUrl,
        videoRoomID: videoRoomID,
        metadata: {
          videoCallUrl: videoCallUrl,
          videoRoomID: videoRoomID,
          isActive: true, //  Inicia activa
        },
        sender: currentUserFullName,
        senderRole: userRole,
        time: new Date().toISOString(),
      };

      // 4️⃣ GUARDAR EN BASE DE DATOS
      let savedMessageId = `temp_${Date.now()}`;

      try {
        const savedMessage = await apiService.createMessage({
          from: username,
          fromId: user?.id,
          to: chatState.to,
          roomCode: chatState.isGroup ? chatState.currentRoomCode : undefined,
          message: fallbackText,
          type: "video_call",
          isGroup: chatState.isGroup,
          videoCallUrl: videoCallUrl,
          videoRoomID: videoRoomID,
          metadata: {
            videoCallUrl: videoCallUrl,
            videoRoomID: videoRoomID,
            isActive: true,
          },
        });

        if (savedMessage && savedMessage.id) {
          savedMessageId = savedMessage.id;
        }
      } catch (dbError) {
        console.error("⚠️ Advertencia: No se pudo guardar en BD (pero seguimos)", dbError);
      }

      // 5️⃣ EMITIR EVENTOS SOCKET
      const finalSocketPayload = { ...messagePayload, id: savedMessageId };

      if (socket && socket.connected) {
        // Evento para notificaciones (timbres, modales)
        socket.emit("startVideoCall", {
          roomID: videoRoomID,
          callType: chatState.isGroup ? "group" : "individual",
          chatId: chatState.isGroup ? chatState.currentRoomCode : chatState.to,
          initiator: currentUserFullName,
          callUrl: videoCallUrl,
          participants: chatState.isGroup ? chatState.roomUsers : [chatState.to],
        });

        // Evento para el chat (mensaje tarjeta)
        socket.emit("message", finalSocketPayload);
      }

      // 6️⃣ ACTUALIZAR UI LOCAL (Mostrar mensaje inmediatamente)
      addNewMessage({
        ...finalSocketPayload,
        isSelf: true,
        isSent: true,
        isRead: false,
      });

      // 7️⃣ ABRIR VENTANA POP-UP
      const windowFeatures = "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
      const videoWindow = window.open(videoCallUrl, "_blank", windowFeatures);

      if (!videoWindow) {
        await showErrorAlert(
          "Pop-up Bloqueado",
          "Por favor permite las ventanas emergentes para entrar a la llamada."
        );
      }
    } catch (error) {
      console.error("❌ Error crítico iniciando llamada:", error);
      await showErrorAlert("Error", "No se pudo conectar la llamada.");
    }
  }, [chatState, user, currentUserFullName, socket, addNewMessage]);

  const handlePinMessage = useCallback(async (message) => {
    try {
      const newPinnedId = chatState.pinnedMessageId === message.id ? null : message.id;
      chatState.setPinnedMessageId(newPinnedId);

      if (socket && socket.connected) {
        socket.emit('pinMessage', {
          roomCode: chatState.currentRoomCode,
          to: !chatState.isGroup ? chatState.to : null,
          messageId: newPinnedId,
          isGroup: chatState.isGroup,
          pinnedBy: username,
        });
      }

      if (newPinnedId) {
        await showSuccessAlert('Mensaje fijado', 'El mensaje se ha fijado en la parte superior.');
      }
    } catch (error) {
      console.error('Error al fijar mensaje:', error);
      await showErrorAlert('Error', 'No se pudo fijar el mensaje.');
    }
  }, [chatState, socket, username]);



  const handleEnableSounds = useCallback(() => {
    chatState.setSoundsEnabled(true);
    localStorage.setItem('soundsEnabled', 'true');
  }, [chatState]);

  const handleSoundToggle = useCallback(() => {
    const newValue = !chatState.soundsEnabled;
    chatState.setSoundsEnabled(newValue);
    localStorage.setItem('soundsEnabled', String(newValue));
  }, [chatState.soundsEnabled, chatState]);

  //  NUEVO: Toggle para silenciar TODAS las alertas
  const handleAlertsToggle = useCallback(() => {
    // Si areAlertsEnabled es true, el usuario quiere DESACTIVARLAS (silenciar)
    // Si areAlertsEnabled es false (silenciado), quiere ACTIVARLAS
    const newValue = !chatState.areAlertsEnabled;
    chatState.setAreAlertsEnabled(newValue);
    localStorage.setItem('areAlertsEnabled', String(newValue));
    console.log('🔔 Alertas globales cambiadas a:', newValue ? 'ACTIVADAS' : 'DESACTIVADAS');
  }, [chatState.areAlertsEnabled, chatState]);

  //  NUEVO: Toggle para alertas de hilos
  const handleThreadAlertsToggle = useCallback(() => {
    const newValue = !chatState.areThreadAlertsEnabled;
    chatState.setAreThreadAlertsEnabled(newValue);
    localStorage.setItem('areThreadAlertsEnabled', String(newValue));
    console.log('🧵 Alertas de hilos:', newValue ? 'ACTIVADAS' : 'DESACTIVADAS');
  }, [chatState.areThreadAlertsEnabled, chatState]);

  //  NUEVO: Toggle para alertas de mensajes
  const handleMessageAlertsToggle = useCallback(() => {
    const newValue = !chatState.areMessageAlertsEnabled;
    chatState.setAreMessageAlertsEnabled(newValue);
    localStorage.setItem('areMessageAlertsEnabled', String(newValue));
    console.log('💬 Alertas de mensajes:', newValue ? 'ACTIVADAS' : 'DESACTIVADAS');
  }, [chatState.areMessageAlertsEnabled, chatState]);

  //  NUEVO: Función para probar sonido desde ajustes
  const handleTestSound = useCallback(() => {
    console.log('🔊 Probando sonido de mención...');
    playMessageSound(true, true); // Forzar sonido de mención
  }, [playMessageSound]);

  //  NUEVO: Función para probar sonido normal
  const handleTestNormalSound = useCallback(() => {
    console.log('🔊 Probando sonido normal...');
    playMessageSound(true, false); // Forzar sonido normal
  }, [playMessageSound]);

  const handleLoginSuccess = async (userData) => {
    // Mostrar pantalla de carga
    setIsPostLoginLoading(true);
    setLoginProgress(0);
    setLoginLoadingMessage('Iniciando sesión...');

    // Guardar datos de usuario
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token || 'mock-token');

    // Pequeño delay para mostrar el inicio
    await new Promise(resolve => setTimeout(resolve, 200));
    setLoginProgress(20);
    setLoginLoadingMessage('Conectando...');

    // Trigger auth que activará los hooks de carga
    refreshAuth();
  };

  //  NUEVO: Detectar restauración de sesión (F5) para mostrar LoadingScreen
  const hasRestoredSession = useRef(false);

  useEffect(() => {
    // Si ya terminó de verificar auth (isLoading false) y está autenticado
    if (!isLoading && isAuthenticated && !hasRestoredSession.current) {
      hasRestoredSession.current = true;

      // Activar manualmente la pantalla de carga para simular el proceso de login
      console.log('🔄 Sesión restaurada, activando pantalla de carga...');
      setIsPostLoginLoading(true);
      setLoginProgress(10);
      setLoginLoadingMessage('Restaurando sesión...');
    }
  }, [isLoading, isAuthenticated]);

  // Efecto para observar cuando terminan de cargar los datos después del login
  useEffect(() => {
    if (!isPostLoginLoading) return;

    // Verificar si ya hay datos cargados
    const hasConversations = chatState.assignedConversations.length > 0;
    const hasRooms = chatState.myActiveRooms.length > 0;
    const isLoading = chatState.assignedLoading || chatState.roomsLoading;

    // Actualizar progreso basado en el estado de carga
    if (isLoading) {
      if (chatState.assignedLoading && !chatState.roomsLoading) {
        setLoginProgress(40);
        setLoginLoadingMessage('Cargando conversaciones...');
      } else if (!chatState.assignedLoading && chatState.roomsLoading) {
        setLoginProgress(60);
        setLoginLoadingMessage('Cargando salas...');
      } else {
        setLoginProgress(30);
        setLoginLoadingMessage('Sincronizando datos...');
      }
    }

    // Cuando ya no está cargando y tenemos datos (o intentó cargar)
    if (!isLoading && isAuthenticated) {
      const finishLoading = async () => {
        setLoginProgress(90);
        setLoginLoadingMessage('Preparando chat...');
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoginProgress(100);
        setLoginLoadingMessage('¡Listo!');
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsPostLoginLoading(false);
      };
      finishLoading();
    }
  }, [
    isPostLoginLoading,
    isAuthenticated,
    chatState.assignedConversations.length,
    chatState.myActiveRooms.length,
    chatState.assignedLoading,
    chatState.roomsLoading
  ]);

  const handleLogout = async () => {
    try {
      if (chatState.currentRoomCode && socket && socket.connected) {
        socket.emit('leaveRoom', {
          roomCode: chatState.currentRoomCode,
          from: username,
        });
      }

      chatState.setTo('');
      chatState.setIsGroup(false);
      chatState.setRoomUsers([]);
      chatState.setCurrentRoomCode(null);
      chatState.currentRoomCodeRef.current = null;
      chatState.setMyActiveRooms([]);
      chatState.setAssignedConversations([]);
      chatState.setAdminViewConversation(null);
      clearMessages();
      clearInput();
      chatState.setReplyingTo(null);

      //  DEBUG: Confirmar desconexión del socket
      if (socket) {
        console.log(' handleLogout: Desconectando socket...', socket.connected);
        socket.disconnect();
        console.log(' handleLogout: Socket desconectado:', socket.connected);
      } else {
        console.log('⚠️ handleLogout: Socket no existe');
      }

      logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      logout();
    }
  };

  const canSendMessages = useMemo(() => {
    if (!chatState.to) return false;

    //  FIX: Considerar tanto Nombre Completo como DNI para permisos
    const myNameNormalized = normalizeUsername(
      user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username
    );
    const myDniNormalized = normalizeUsername(user?.username || '');

    const toNormalized = normalizeUsername(chatState.to);

    const assignedConv = chatState.assignedConversations?.find((conv) => {
      // Intentar encontrar al OTRO participante
      const otherUser = conv.participants?.find(
        (p) => {
          const pNorm = normalizeUsername(p);
          return pNorm !== myNameNormalized && pNorm !== myDniNormalized;
        }
      );

      return (
        normalizeUsername(otherUser) === toNormalized ||
        normalizeUsername(conv.name) === toNormalized
      );
    });

    if (assignedConv && assignedConv.participants) {
      const isUserParticipant = assignedConv.participants.some(
        (p) => {
          const pNorm = normalizeUsername(p);
          return pNorm === myNameNormalized || pNorm === myDniNormalized;
        }
      );
      if (!isUserParticipant) {
        return false;
      }
    }

    return true;
  }, [chatState.to, user, chatState.assignedConversations]);

  // Callbacks para paginación
  const handleLoadUserRooms = useCallback(
    async (page, append = true) => {
      await roomManagement.loadMyActiveRooms(page, append, null, user);
    },
    [roomManagement, user]
  );

  const handleRoomsLimitChange = useCallback(
    async (newLimit) => {
      const normalized = Math.max(5, Math.min(50, Number(newLimit) || 10));
      chatState.setRoomsLimit(normalized);
      await roomManagement.loadMyActiveRooms(1, false, normalized, user);
    },
    [roomManagement, chatState, user]
  );

  const handleGoToRoomsPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, Number(page) || 1);
      await roomManagement.loadMyActiveRooms(safePage, false, null, user);
    },
    [roomManagement, user]
  );

  // Handle message highlight requests (Reply click or Search result)
  const handleProcessMessageHighlight = useCallback(async (messageId) => {
    // If no ID is provided, it means we just want to clear the highlight (e.g. timeout)
    if (!messageId) {
      setHighlightMessageId(null);
      return;
    }

    console.log("📍 Processing message highlight request:", messageId);

    // 1. Check if message is already loaded in the current list
    const isLoaded = messages.some(m => m.id === messageId);

    if (isLoaded) {
      console.log("✅ Message already loaded locally. Highlighting...");
      setHighlightMessageId(messageId);
    } else {
      console.log("⚠️ Message NOT loaded. Fetching context around ID...");
      if (loadMessagesAroundId) {
        try {
          await loadMessagesAroundId(messageId);
          // After loading, set highlight.
          setHighlightMessageId(messageId);
        } catch (error) {
          console.error("❌ Error loading message context:", error);
        }
      } else {
        console.warn("❌ loadMessagesAroundId function not available");
      }
    }
  }, [messages, loadMessagesAroundId]);

  // === RENDERIZADO ===


  if (isLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // Pantalla de carga post-login con progreso
  // También mostramos esto si estamos autenticados pero aún no hemos "restaurado" la sesión (F5 gap)
  if (isPostLoginLoading || (!isLoading && isAuthenticated && !hasRestoredSession.current)) {
    return (
      <LoginLoadingScreen
        progress={loginProgress}
        message={loginLoadingMessage}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const effectiveIsLoadingMessages = isLoadingMessages || chatState.isAdminViewLoading;

  return (
    <>
      {/* Elementos de audio */}
      <audio
        ref={messageSound}
        preload="auto"
        src={whatsappSound}
      />
      <audio
        ref={mentionSound}
        preload="auto"
        src={mentionSoundFile}
      />
      <audio ref={ringtoneSound} src={ringtoneSoundFile} loop /> {/*  Audio para llamadas (loop) */}

      {/* Layout principal */}
      <ChatLayout
        // Props del sidebar
        user={user}
        socket={socket} //  NUEVO: Para actualizaciones de estado online en tiempo real
        userList={chatState.userList}
        groupList={chatState.groupList}
        assignedConversations={chatState.assignedConversations}
        monitoringConversations={chatState.monitoringConversations}
        monitoringPage={chatState.monitoringPage}
        monitoringTotal={chatState.monitoringTotal}
        monitoringTotalPages={chatState.monitoringTotalPages}
        monitoringLoading={chatState.monitoringLoading}
        onLoadMonitoringConversations={conversations.loadMonitoringConversations}
        assignedPage={chatState.assignedPage}
        assignedTotal={chatState.assignedTotal}
        assignedTotalPages={chatState.assignedTotalPages}
        assignedLoading={chatState.assignedLoading}
        onLoadAssignedConversations={conversations.handleLoadAssignedConversations}
        roomsPage={chatState.roomsPage}
        roomsTotal={chatState.roomsTotal}
        roomsTotalPages={chatState.roomsTotalPages}
        roomsLoading={chatState.roomsLoading}
        onLoadUserRooms={handleLoadUserRooms}
        roomsLimit={chatState.roomsLimit}
        onRoomsLimitChange={handleRoomsLimitChange}
        onGoToRoomsPage={handleGoToRoomsPage}
        isAdmin={isAdmin}
        showAdminMenu={chatState.showAdminMenu}
        setShowAdminMenu={chatState.setShowAdminMenu}
        showSidebar={chatState.showSidebar}
        sidebarCollapsed={chatState.sidebarCollapsed}
        onToggleCollapse={() => chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)}
        onUserSelect={handleUserSelect}
        onGroupSelect={handleGroupSelect}
        onPersonalNotes={handlePersonalNotes}
        onLogout={handleLogout}
        onShowCreateRoom={() => chatState.setShowCreateRoomModal(true)}
        onShowJoinRoom={() => chatState.setShowJoinRoomModal(true)}
        onShowAdminRooms={roomManagement.handleShowAdminRooms}
        onShowCreateConversation={() => chatState.setShowCreateConversationModal(true)}
        onShowManageConversations={() => chatState.setShowManageConversationsModal(true)}
        onShowManageUsers={() => { }}
        onShowSystemConfig={() => { }}
        unreadMessages={chatState.unreadMessages}
        myActiveRooms={chatState.myActiveRooms}
        favoriteRoomCodes={chatState.favoriteRoomCodes}
        favoriteRooms={chatState.favoriteRooms}
        setFavoriteRoomCodes={chatState.setFavoriteRoomCodes}
        setFavoriteRooms={chatState.setFavoriteRooms}
        lastFavoriteUpdate={chatState.lastFavoriteUpdate}
        pendingMentions={chatState.pendingMentions} //  NUEVO: Pasar menciones pendientes
        pendingThreads={chatState.pendingThreads} //  NUEVO: Pasar hilos pendientes
        setPendingThreads={chatState.setPendingThreads} //  NUEVO: Para limpiar hilos pendientes
        onRoomSelect={async (room, messageId) => {
          setSelectedRoomData(room); //  Guardar datos de sala para favoritos/imágenes
          const result = await roomManagement.handleRoomSelect(room, messageId);
          //  NUEVO: Actualizar selectedRoomData con maxCapacity de la API
          if (result?.maxCapacity) {
            setSelectedRoomData(prev => ({ ...prev, maxCapacity: result.maxCapacity }));
          }
        }}
        onKickUser={roomManagement.handleKickUser}
        userListHasMore={chatState.userListHasMore}
        userListLoading={chatState.userListLoading}
        onLoadMoreUsers={loadMoreUsers}
        roomTypingUsers={chatState.roomTypingUsers}
        onGoToMessage={handleGoToMessage} //  NUEVO: Manejar navegación a menciones

        //  NUEVO: Ir al final del chat (últimos mensajes)
        onGoToLatest={async () => {
          console.log('⏩ Ir al final del chat');
          try {
            // Limpiar filtros de búsqueda y paginación
            clearMessages();
            // Cargar mensajes iniciales (los más recientes)
            await loadInitialMessages();
          } catch (e) { console.error('Error going to latest:', e); }
        }}

        // Props del chat
        to={chatState.to}
        isGroup={chatState.isGroup}
        currentRoomCode={chatState.currentRoomCode}
        roomUsers={chatState.roomUsers}
        roomUsersNameCache={chatState.roomUsersNameCacheRef.current}
        messages={messages}
        adminViewConversation={chatState.adminViewConversation}
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        canSendMessages={canSendMessages}
        onFileSelect={handleFileSelect}
        onRecordAudio={() => setIsRecording(true)}
        onStopRecording={() => setIsRecording(false)}
        isRecording={isRecording}
        mediaFiles={mediaFiles}
        mediaPreviews={mediaPreviews}
        onCancelMediaUpload={cancelMediaUpload}
        onRemoveMediaFile={handleRemoveMediaFile}
        onLeaveRoom={roomManagement.handleLeaveRoom}
        hasMoreMessages={chatState.adminViewConversation ? chatState.adminViewHasMore : hasMoreMessages}
        isLoadingMore={chatState.adminViewConversation ? chatState.isAdminViewLoadingMore : isLoadingMore}
        isLoadingMessages={effectiveIsLoadingMessages}
        onLoadMoreMessages={chatState.adminViewConversation
          ? () => conversations.loadMoreAdminViewMessages(chatState.adminViewConversation, chatState.adminViewOffset, currentUserFullName)
          : loadMoreMessages}
        hasMoreAfter={hasMoreAfter} // NUEVO
        onLoadMoreMessagesAfter={loadMoreMessagesAfter} // NUEVO
        onToggleMenu={handleToggleMenu}
        socketConnected={chatState.socketConnected}
        soundsEnabled={chatState.soundsEnabled}
        onEnableSounds={handleEnableSounds}
        stopRingtone={stopRingtone} //  Pasar función para detener tono
        currentUsername={username}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        isTyping={chatState.typingUser !== null}
        typingUser={chatState.typingUser}
        onClearUnreadOnTyping={handleClearUnreadOnTyping}
        highlightMessageId={highlightMessageId}
        onMessageHighlighted={handleProcessMessageHighlight}
        replyingTo={chatState.replyingTo}
        onCancelReply={handleCancelReply}
        onAddUsersToRoom={roomManagement.handleAddUsersToRoom}
        onRemoveUsersFromRoom={roomManagement.handleRemoveUsersFromRoom}
        onSendThreadMessage={handleSendThreadMessage}
        onSendVoiceMessage={handleSendVoiceMessage}
        onStartVideoCall={handleStartVideoCall}
        isUploadingFile={chatState.isUploadingFile}
        isSending={chatState.isSending}
        onPinMessage={handlePinMessage}
        onPollVote={handlePollVote}
        onRoomUpdated={() => roomManagement.loadMyActiveRooms(1, false, null, user)}
        setRoomUsers={chatState.setRoomUsers} //  NUEVO: Para actualizar globalmente desde paneles
        // Props de modales
        showCreateRoomModal={chatState.showCreateRoomModal}
        setShowCreateRoomModal={chatState.setShowCreateRoomModal}
        roomForm={chatState.roomForm}
        setRoomForm={chatState.setRoomForm}
        onCreateRoom={roomManagement.handleCreateRoom}
        pinnedMessage={pinnedMessageObject}
        pinnedMessageId={chatState.pinnedMessageId}
        showJoinRoomModal={chatState.showJoinRoomModal}
        setShowJoinRoomModal={chatState.setShowJoinRoomModal}
        joinRoomForm={chatState.joinRoomForm}
        setJoinRoomForm={chatState.setJoinRoomForm}
        onJoinRoom={roomManagement.handleJoinRoom}
        showAdminRoomsModal={chatState.showAdminRoomsModal}
        setShowAdminRoomsModal={chatState.setShowAdminRoomsModal}
        onDeleteRoom={(roomId, roomName) => roomManagement.handleDeleteRoom(roomId, roomName, user)}
        onDeactivateRoom={(roomId, roomName) =>
          roomManagement.handleDeactivateRoom(roomId, roomName, user)
        }
        onActivateRoom={(roomId, roomName) =>
          roomManagement.handleActivateRoom(roomId, roomName, user)
        }
        onViewRoomUsers={roomManagement.handleViewRoomUsers}
        showRoomUsersModal={chatState.showRoomUsersModal}
        setShowRoomUsersModal={chatState.setShowRoomUsersModal}
        roomUsersModalData={chatState.roomUsersModalData}
        selectedRoomData={selectedRoomData} //  Pasar datos seleccionados
        updateMessage={updateMessage} //  NUEVO: Para actualizar contador de hilos desde ThreadPanel
      />

      {/* Contenedor de modales */}
      < ChatModalsContainer
        // Room Created Modal
        showRoomCreatedModal={chatState.showRoomCreatedModal}
        setShowRoomCreatedModal={chatState.setShowRoomCreatedModal}
        createdRoomData={chatState.createdRoomData}
        setCreatedRoomData={chatState.setCreatedRoomData}
        // Create Conversation Modal
        showCreateConversationModal={chatState.showCreateConversationModal}
        setShowCreateConversationModal={chatState.setShowCreateConversationModal}
        onCreateConversation={conversations.handleCreateConversation}
        currentUser={user}
        // Manage Conversations Modal
        showManageConversationsModal={chatState.showManageConversationsModal}
        setShowManageConversationsModal={chatState.setShowManageConversationsModal}
        onConversationUpdated={() => conversations.loadAssignedConversations()}
        socket={socket}
        // Add Users To Room Modal
        showAddUsersToRoomModal={chatState.showAddUsersToRoomModal}
        setShowAddUsersToRoomModal={chatState.setShowAddUsersToRoomModal}
        currentRoomCode={chatState.currentRoomCode}
        to={chatState.to}
        roomUsers={chatState.roomUsers}
        onUsersAdded={roomManagement.handleUsersAdded}
        // Remove Users From Room Modal
        showRemoveUsersFromRoomModal={chatState.showRemoveUsersFromRoomModal}
        setShowRemoveUsersFromRoomModal={chatState.setShowRemoveUsersFromRoomModal}
        username={username}
        onUsersRemoved={roomManagement.handleUsersRemoved}
        userList={chatState.userList}
      />

      {/* Panel de configuración */}
      < SettingsPanel
        isOpen={chatState.showAdminMenu}
        onClose={() => chatState.setShowAdminMenu(false)}
        user={user}
        isSoundEnabled={chatState.soundsEnabled}
        onSoundToggle={handleSoundToggle}
        onTestSound={handleTestSound} //  Pasamos la función de prueba
        onTestNormalSound={handleTestNormalSound} //  Pasamos la función de prueba de sonido normal
        areAlertsEnabled={chatState.areAlertsEnabled}
        onAlertsToggle={handleAlertsToggle}
        areThreadAlertsEnabled={chatState.areThreadAlertsEnabled}
        onThreadAlertsToggle={handleThreadAlertsToggle}
        areMessageAlertsEnabled={chatState.areMessageAlertsEnabled}
        onMessageAlertsToggle={handleMessageAlertsToggle}
      />
    </>
  );
};

export default ChatPage;

