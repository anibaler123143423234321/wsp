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
    playMessageSound,
    ringtoneSound, //  Ref del tono
    playRingtone,  //  Función play
    stopRingtone,  //  Función stop
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    clearInput,
  } = useMessages();

  const currentUserFullName =
    user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : username;

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
    isLoading: isLoadingMessages,
    // 🔥 NUEVO: Para búsqueda WhatsApp
    loadMessagesAroundId,
    aroundMode, // Indica si estamos en modo "around" (búsqueda)
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
    }
  );

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!username) return;
      try {
        // 1. Obtener conteos de mensajes no leídos globales
        const counts = await apiService.getUnreadCounts();
        //console.log("🔢 Unread counts response:", counts); //  DEBUG REQUESTED BY USER

        // 2. Si tienes una estructura específica, adáptala aquí.
        // Suponiendo que 'counts' es un objeto { "roomCode": 5, "userId": 2 }
        if (counts) {
          chatState.setUnreadMessages(counts);
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
      return conv.participants?.includes(displayName);
    });

    const unreadAssignedCount = myAssignedConversations.filter(
      (conv) => conv.unreadCount > 0
    ).length;

    const unreadRoomsCount =
      chatState.myActiveRooms?.filter((room) => {
        const roomUnread = chatState.unreadMessages?.[room.roomCode] || 0;
        return roomUnread > 0;
      }).length || 0;

    const totalUnread = unreadAssignedCount + unreadRoomsCount;

    // Actualizar título de la pestaña
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Chat +34`;
    } else {
      document.title = 'Chat +34';
    }

    //  NUEVO: Actualizar badge del favicon
    faviconBadge.update(totalUnread);
  }, [chatState.assignedConversations, chatState.myActiveRooms, chatState.unreadMessages, user]);

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

  //  Cargar favoritos ANTES de las salas
  useEffect(() => {
    if (!user) return;
    const displayName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : user?.username;
    if (displayName) {
      chatState.loadFavoriteRoomCodes(displayName);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efecto para restaurar sala
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
    // 🔥 No cargar si estamos en modo "around" (búsqueda)
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
      const roomKey = `room:${chatState.currentRoomCode}`;
      if (lastMarkedChatRef.current !== roomKey) {
        lastMarkedChatRef.current = roomKey;
        markRoomMessagesAsRead(chatState.currentRoomCode);
      }
    }

    // B. Lógica para CHATS INDIVIDUALES (Asignados)
    // Quité la condición !chatState.adminViewConversation para que funcione en ambos modos
    if (!chatState.isGroup && chatState.to && messages.length > 0) {
      const conversationKey = `user:${chatState.to}`;

      if (lastMarkedChatRef.current !== conversationKey) {
        lastMarkedChatRef.current = conversationKey;

        (async () => {
          try {
            // 1. Marcar en Backend
            await apiService.markConversationAsRead(username, chatState.to);

            // 2. Emitir Socket
            if (socket && socket.connected) {
              socket.emit('markConversationAsRead', {
                from: username,
                to: chatState.to
              });
            }

            // 3. RESETEAR CONTADOR LOCAL (CRÍTICO)
            const conversation = chatState.assignedConversations.find(c =>
              c.participants && c.participants.some(p =>
                p?.toLowerCase().trim() === chatState.to?.toLowerCase().trim()
              )
            );

            if (conversation) {
              console.log('🔄 Reseteando unreadCount para conversación:', conversation.id);
              // Resetear estado de tiempo real
              chatState.setUnreadMessages(prev => ({
                ...prev,
                [conversation.id]: 0
              }));

              // Resetear lista estática
              chatState.setAssignedConversations(prev => prev.map(c =>
                c.id === conversation.id ? { ...c, unreadCount: 0 } : c
              ));
            }

          } catch (error) {
            console.error("Error marking chat as read:", error);
          }
        })();
      }
    }
  }, [
    chatState.isGroup,
    chatState.currentRoomCode,
    chatState.to,
    messages.length,
    markRoomMessagesAsRead,
    username,
    socket
    // NOTA: NO incluir chatState.assignedConversations aquí
    // porque causa que el efecto se re-ejecute cuando llega un mensaje
    // y resetea el contador que acabamos de incrementar
  ]);

  // Limpiar referencia cuando cambiamos de chat (para permitir re-marcar)
  useEffect(() => {
    // Resetear lastMarkedChatRef cuando cambia el chat para permitir marcar como leído nuevamente
    lastMarkedChatRef.current = null;
  }, [chatState.to, chatState.currentRoomCode]);

  // Cargar mensajes cuando cambie 'to'
  useEffect(() => {
    // 🔥 No cargar si estamos en modo "around" (búsqueda)
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
    if (!socket || !socket.connected || userListLoading || !userListHasMore) {
      return;
    }

    setUserListLoading(true);
    socket.emit("requestUserListPage", {
      page: userListPage + 1,
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
      clearMessages
    },
    { user, username, isAdmin, soundsEnabled: chatState.soundsEnabled, favoriteRoomCodes: chatState.favoriteRoomCodes } //  Pasar soundsEnabled y favoritos
  );

  const handleUserSelect = async (
    userName,
    messageId = null,
    conversationData = null
  ) => {
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

    setSelectedRoomData(null); //  Limpiar datos de sala seleccionada

    // 2. Definir quién soy yo (normalizado)
    const myNameNormalized = normalizeUsername(currentUserFullName);

    // 3. Lógica Inteligente: ¿Soy Participante o Soy Admin?
    if (conversationData && conversationData.participants) {

      // Verificamos si YO estoy en la lista de participantes
      const isParticipant = conversationData.participants.some(
        p => normalizeUsername(p) === myNameNormalized
      );

      if (isParticipant) {
        // === MODO PARTICIPANTE (Chat Asignado - Trabajar) ===
        // Null en AdminView permite que useMessagePagination cargue el chat normal
        chatState.setAdminViewConversation(null);

        // Encontrar al OTRO participante para ponerlo en el título 'to'
        const otherPerson = conversationData.participants.find(
          p => normalizeUsername(p) !== myNameNormalized
        );

        // Establecer el destinatario (esto dispara la carga de mensajes)
        chatState.setTo(otherPerson || userName);

      } else {
        // === MODO OBSERVADOR (Monitoreo Admin) ===
        // Esto activa la carga especial en 'loadAdminViewMessages'
        chatState.setAdminViewConversation(conversationData);
        chatState.setTo(userName); // Título visual "Usuario A ↔️ Usuario B"
      }

    } else {
      // === MODO CHAT DIRECTO NORMAL ===
      chatState.setAdminViewConversation(null);
      chatState.setTo(userName);
    }

    // 4. 🔥 NUEVO: Si hay messageId, cargar mensajes alrededor de ese ID
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
    chatState.setCurrentRoomCode(group.roomCode); // ✅ CORREGIDO: Establecer el roomCode de la nueva sala
    chatState.currentRoomCodeRef.current = group.roomCode; // ✅ CORREGIDO: Actualizar la ref también
    setSelectedRoomData(group); //  Guardar datos completos de la sala (incluyendo imagen de favoritos)

    //  NUEVO: Cargar usuarios de la sala desde la API (con displayName, role, email, etc.)
    try {
      const response = await apiService.getRoomUsers(group.roomCode);
      if (Array.isArray(response)) {
        chatState.setRoomUsers(response);
      } else if (response && typeof response === 'object') {
        chatState.setRoomUsers(response.users || response.data || []);
      }
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
      const isParticipant = conversation.participants?.some(
        p => normalizeUsername(p) === myNameNormalized
      );

      if (isParticipant) {
        // MODO PARTICIPANTE - trabajar en el chat
        chatState.setAdminViewConversation(null);
        const otherPerson = conversation.participants.find(
          p => normalizeUsername(p) !== myNameNormalized
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


  const handleSendMessage = async () => {
    // 1. Prevenir envío si ya se está enviando o si está vacío
    if (chatState.isSending) return;
    if ((!input && mediaFiles.length === 0) || !chatState.to) return;

    chatState.setIsSending(true);

    try {
      // 2. Normalización
      const currentUserNormalized = normalizeUsername(currentUserFullName);

      // 3. Verificar si es chat asignado
      const assignedConv = chatState.assignedConversations?.find((conv) => {
        const participants = conv.participants || [];
        return participants.some(p => normalizeUsername(p) === normalizeUsername(chatState.to));
      });

      // Determinar si es grupo
      const effectiveIsGroup = assignedConv ? false : chatState.isGroup;

      // 4. Subir archivo si existe
      let attachmentData = {};
      if (mediaFiles.length > 0) {
        try {
          chatState.setIsUploadingFile(true);
          const file = mediaFiles[0];
          const uploadResult = await apiService.uploadFile(file, "chat");
          attachmentData = {
            mediaType: file.type.split("/")[0],
            mediaData: uploadResult.fileUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize
          };
        } catch (err) {
          console.error("Error subiendo archivo:", err);
          chatState.setIsUploadingFile(false);
          chatState.setIsSending(false);
          return;
        }
      }

      // 5. Construir mensaje
      const messageObj = {
        from: currentUserFullName,
        fromId: user.id,
        to: chatState.to,
        message: input,
        isGroup: effectiveIsGroup,
        roomCode: effectiveIsGroup ? chatState.currentRoomCode : undefined,
        ...attachmentData,
        //  DATOS DE RESPUESTA
        replyToMessageId: chatState.replyingTo?.id || null,
        replyToSender: chatState.replyingTo?.sender || null,
        replyToText: chatState.replyingTo?.text || chatState.replyingTo?.fileName || "Archivo adjunto",
        replyToSenderNumeroAgente: chatState.replyingTo?.senderNumeroAgente || null
      };

      // Datos extra si es asignado
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        const other = assignedConv.participants.find(p => normalizeUsername(p) !== currentUserNormalized);
        if (other) messageObj.actualRecipient = other;
      }

      //  DIFERENCIA CLAVE: Para GRUPOS, el backend guarda. Para INDIVIDUALES, el frontend guarda.
      if (effectiveIsGroup) {
        // GRUPO: Solo emitir por socket, el backend guarda y emite de vuelta
        if (socket && socket.connected) {
          socket.emit("message", messageObj);
        }
      } else {
        // INDIVIDUAL: Frontend guarda en BD, luego emite por socket
        const savedMessage = await apiService.createMessage({
          ...messageObj,
          to: messageObj.actualRecipient || messageObj.to
        });

        if (socket && socket.connected) {
          socket.emit("message", {
            ...messageObj,
            id: savedMessage.id,
            sentAt: savedMessage.sentAt
          });
        }
      }

      //  CONFIAR EN EL BACKEND - No agregar mensaje localmente
      // El socket devolverá el mensaje con el evento 'message' (useSocketListeners lo manejará)

      clearInput();
      chatState.setReplyingTo(null);

    } catch (error) {
      console.error("Error enviando mensaje:", error);
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
  const handleReplyMessage = useCallback((message) => {
    chatState.setReplyingTo(message);
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
  const handleClearUnreadOnTyping = useCallback(() => {
    if (chatState.isGroup && chatState.currentRoomCode) {
      // Para grupos, limpiar por roomCode
      chatState.setUnreadMessages(prev => {
        if (prev[chatState.currentRoomCode] === 0) return prev;
        return { ...prev, [chatState.currentRoomCode]: 0 };
      });
    } else if (!chatState.isGroup && chatState.to) {
      // Para chats individuales, buscar conversación
      const conv = chatState.assignedConversations?.find(c =>
        c.participants?.some(p => normalizeUsername(p) === normalizeUsername(chatState.to))
      );
      if (conv) {
        chatState.setUnreadMessages(prev => {
          if (prev[conv.id] === 0) return prev;
          return { ...prev, [conv.id]: 0 };
        });
      }
    }
  }, [chatState]);

  const handleSendVoiceMessage = useCallback(async (audioFile) => {
    if (!audioFile || !chatState.to) return;

    try {
      // Determinar correctamente si estamos en grupo o chat asignado
      const currentUserNormalized = normalizeUsername(currentUserFullName);

      const assignedConv = chatState.assignedConversations?.find((conv) => {
        const participants = conv.participants || [];
        return participants.some(p => normalizeUsername(p) === normalizeUsername(chatState.to));
      });

      // Si es grupo, SIEMPRE es grupo
      const effectiveIsGroup = chatState.isGroup;

      // 1. Subir archivo al servidor
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      // 2. Preparar objeto del mensaje
      const messageData = {
        to: chatState.to,
        isGroup: effectiveIsGroup,
        from: currentUserFullName,
        fromId: user.id,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        message: "",
        roomCode: effectiveIsGroup ? chatState.currentRoomCode : undefined
      };

      // Datos extra para asignados
      if (assignedConv) {
        messageData.isAssignedConversation = true;
        messageData.conversationId = assignedConv.id;
        messageData.participants = assignedConv.participants;
        const other = assignedConv.participants.find(p => normalizeUsername(p) !== currentUserNormalized);
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
          to: messageData.actualRecipient || messageData.to
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
    if (!user || !user.id) return;

    try {
      const messageObj = {
        from: messageData.from || username,
        to: messageData.to,
        message: messageData.text || "",
        isGroup: !!messageData.isGroup,
        roomCode: messageData.roomCode || null,
        threadId: messageData.threadId,
        fromId: user.id,
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
        console.log('📡 DEBUG - Emitiendo threadMessage con id:', savedMessage.id);
        socket.emit("threadMessage", {
          ...savedMessage,
          //  ASEGURAR RUTAS PARA CLUSTER:
          // Explicitamente pasar datos de routing por si savedMessage no los tiene
          threadId: messageData.threadId,
          isGroup: !!messageData.isGroup,
          roomCode: messageData.roomCode,
          from: messageObj.from,
          to: messageObj.to,
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
        from: currentUserFullName,
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
          from: currentUserFullName,
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

  const handlePollVote = useCallback((messageId, optionIndex) => {
    if (!socket || !socket.connected) return;

    socket.emit('pollVote', {
      messageId,
      optionIndex,
      username: currentUserFullName,
      roomCode: chatState.isGroup ? chatState.currentRoomCode : null,
      to: !chatState.isGroup ? chatState.to : null,
    });
  }, [socket, currentUserFullName, chatState]);

  const handleEnableSounds = useCallback(() => {
    chatState.setSoundsEnabled(true);
    localStorage.setItem('soundsEnabled', 'true');
  }, [chatState]);

  const handleSoundToggle = useCallback(() => {
    const newValue = !chatState.soundsEnabled;
    chatState.setSoundsEnabled(newValue);
    localStorage.setItem('soundsEnabled', String(newValue));
  }, [chatState.soundsEnabled, chatState]);

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

    const currentUserFullName =
      user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;

    const currentUserNormalized = normalizeUsername(currentUserFullName);
    const toNormalized = normalizeUsername(chatState.to);

    const assignedConv = chatState.assignedConversations?.find((conv) => {
      const otherUser = conv.participants?.find(
        (p) => normalizeUsername(p) !== currentUserNormalized
      );
      return (
        normalizeUsername(otherUser) === toNormalized ||
        normalizeUsername(conv.name) === toNormalized
      );
    });

    if (assignedConv && assignedConv.participants) {
      const isUserParticipant = assignedConv.participants.some(
        (p) => normalizeUsername(p) === currentUserNormalized
      );
      if (!isUserParticipant) {
        return false;
      }
    }

    return true;
  }, [chatState.to, user, chatState.assignedConversations]);

  // Callbacks para paginación
  const handleLoadUserRooms = useCallback(
    async (page) => {
      await roomManagement.loadMyActiveRooms(page, true, null, user);
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

  // === RENDERIZADO ===
  if (isLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // Pantalla de carga post-login con progreso
  if (isPostLoginLoading) {
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
      {/* Elemento de audio */}
      <audio
        ref={messageSound}
        preload="auto"
        src={whatsappSound}
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
        setFavoriteRoomCodes={chatState.setFavoriteRoomCodes}
        lastFavoriteUpdate={chatState.lastFavoriteUpdate}
        onRoomSelect={(room, messageId) => {
          setSelectedRoomData(room); //  Guardar datos de sala para favoritos/imágenes
          roomManagement.handleRoomSelect(room, messageId);
        }}
        onKickUser={roomManagement.handleKickUser}
        userListHasMore={chatState.userListHasMore}
        userListLoading={chatState.userListLoading}
        onLoadMoreUsers={loadMoreUsers}
        roomTypingUsers={chatState.roomTypingUsers}
        // Props del chat
        to={chatState.to}
        isGroup={chatState.isGroup}
        currentRoomCode={chatState.currentRoomCode}
        roomUsers={chatState.roomUsers}
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
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        isLoadingMessages={effectiveIsLoadingMessages}
        onLoadMoreMessages={loadMoreMessages}
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
        onMessageHighlighted={() => setHighlightMessageId(null)}
        replyingTo={chatState.replyingTo}
        onCancelReply={handleCancelReply}
        onAddUsersToRoom={roomManagement.handleAddUsersToRoom}
        onRemoveUsersFromRoom={roomManagement.handleRemoveUsersFromRoom}
        onOpenThread={(message) => { }}
        onSendThreadMessage={handleSendThreadMessage}
        onSendVoiceMessage={handleSendVoiceMessage}
        onStartVideoCall={handleStartVideoCall}
        isUploadingFile={chatState.isUploadingFile}
        isSending={chatState.isSending}
        onPinMessage={handlePinMessage}
        onPollVote={handlePollVote}
        onRoomUpdated={() => roomManagement.loadMyActiveRooms(1, false, null, user)}
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
        onEditRoom={roomManagement.handleEditRoom}
        onViewRoomUsers={roomManagement.handleViewRoomUsers}
        selectedRoomData={selectedRoomData} //  Pasar datos seleccionados
      />

      {/* Contenedor de modales */}
      < ChatModalsContainer
        // Edit Room Modal
        showEditRoomModal={chatState.showEditRoomModal}
        setShowEditRoomModal={chatState.setShowEditRoomModal}
        editingRoom={chatState.editingRoom}
        setEditingRoom={chatState.setEditingRoom}
        editForm={chatState.editForm}
        setEditForm={chatState.setEditForm}
        onUpdateRoom={() => roomManagement.handleUpdateRoom(user)}
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
      />

      {/* Panel de configuración */}
      < SettingsPanel
        isOpen={chatState.showAdminMenu}
        onClose={() => chatState.setShowAdminMenu(false)}
        user={user}
        isSoundEnabled={chatState.soundsEnabled}
        onSoundToggle={handleSoundToggle}
      />
    </>
  );
};

export default ChatPage;
