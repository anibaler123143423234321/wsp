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
import { faviconBadge } from '../../utils/faviconBadge'; // 🔥 NUEVO: Badge en el favicon
import whatsappSound from '../../assets/sonidos/whatsapp_pc.mp3';
import ringtoneSoundFile from '../../assets/sonidos/llamada_wsp.mp3'; // 🔥 NUEVO: Tono de llamada

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

  // 1. 🔥 NUEVO ESTADO: Guardar el objeto del mensaje fijado
  const [pinnedMessageObject, setPinnedMessageObject] = useState(null);

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
    ringtoneSound, // 🔥 Ref del tono
    playRingtone,  // 🔥 Función play
    stopRingtone,  // 🔥 Función stop
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
    { clearMessages, loadInitialMessages }
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
        console.log("🔢 Unread counts response:", counts); // 🔥 DEBUG REQUESTED BY USER

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

    // Opcional: Polling cada 60 segundos para asegurar sincronización
    const interval = setInterval(fetchUnreadCounts, 60000);
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

  // 2. 🔥 NUEVO EFECTO: Resolver el mensaje (Local o API)
  useEffect(() => {
    const resolvePinnedMessage = async () => {
      const pinId = chatState.pinnedMessageId;

      // A. Si no hay ID, limpiamos
      if (!pinId) {
        setPinnedMessageObject(null);
        return;
      }

      // B. Intentamos buscarlo en los mensajes cargados (rápido)
      // 🔥 IMPORTANTE: Asegúrate de que 'messages' sea un array
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

          // 🔥 VALIDACIÓN DE SEGURIDAD: Verificar que el mensaje pertenezca a la sala actual
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

    // 🔥 NUEVO: Actualizar badge del favicon
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
    if (chatState.currentRoomCode && username && chatState.isGroup) {
      loadInitialMessages();
    }
  }, [chatState.currentRoomCode, username, chatState.isGroup, loadInitialMessages]);

  // Marcar mensajes como leídos
  const markedRoomsRef = useRef(new Set());

  useEffect(() => {
    // A. Lógica para GRUPOS
    if (chatState.isGroup && chatState.currentRoomCode && messages.length > 0) {
      if (!markedRoomsRef.current.has(chatState.currentRoomCode)) {
        markedRoomsRef.current.add(chatState.currentRoomCode);

        const timer = setTimeout(() => {
          markRoomMessagesAsRead(chatState.currentRoomCode);
        }, 500);

        return () => clearTimeout(timer);
      }
    }

    // B. 🔥 Lógica para CHATS INDIVIDUALES (Asignados)
    if (!chatState.isGroup && chatState.to && messages.length > 0 && !chatState.adminViewConversation) {
      const conversationKey = `user:${chatState.to}`;

      if (!markedRoomsRef.current.has(conversationKey)) {
        markedRoomsRef.current.add(conversationKey);

        const timer = setTimeout(async () => {
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

            // 3. 🔥 RESETEAR CONTADOR LOCAL (CRÍTICO)
            const conversation = chatState.assignedConversations.find(c =>
              c.participants && c.participants.some(p =>
                p?.toLowerCase().trim() === chatState.to?.toLowerCase().trim()
              )
            );

            if (conversation) {
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
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [
    chatState.isGroup,
    chatState.currentRoomCode,
    chatState.to,
    messages.length,
    markRoomMessagesAsRead,
    username,
    socket,
    chatState.assignedConversations, // Necesario para encontrar la conversación
    chatState.adminViewConversation
  ]);

  // Limpiar caché de marcados cuando cambiamos de chat
  useEffect(() => {
    markedRoomsRef.current.clear();
  }, [chatState.to, chatState.currentRoomCode]);

  // Cargar mensajes cuando cambie 'to'
  useEffect(() => {
    if (
      chatState.to &&
      username &&
      !chatState.isGroup &&
      !chatState.currentRoomCode &&
      !chatState.adminViewConversation
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
      playRingtone, // 🔥 Pasar función
      stopRingtone, // 🔥 Pasar función
      loadAssignedConversations: conversations.loadAssignedConversations,
      loadMyActiveRooms: roomManagement.loadMyActiveRooms,
      clearMessages
    },
    { user, username, isAdmin, soundsEnabled: chatState.soundsEnabled, favoriteRoomCodes: [] } // 🔥 Pasar soundsEnabled
  );

  const handleUserSelect = (
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

    // Limpiar mensajes visualmente antes de cargar los nuevos
    // (Asumiendo que 'clearMessages' viene de useMessagePagination o roomManagement)
    if (typeof clearMessages === 'function') clearMessages();

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

    // 4. Manejo de mensaje resaltado
    if (messageId) {
      setHighlightMessageId(messageId);
    } else {
      setHighlightMessageId(null);
    }

    // 5. UX Móvil
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(false);
    }
  };

  const handleGroupSelect = (group) => {
    // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    setAdminViewConversation(null); // Limpiar vista de admin
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setPinnedMessageId(group.pinnedMessageId || null);
    setPinnedMessageObject(null); // 🔥 Limpiar objeto mensaje fijado
    // Establecer nuevo estado
    setTo(group.name);
    setIsGroup(true);
    setRoomUsers(group.members);
    setCurrentRoomCode(group.roomCode); // ✅ CORREGIDO: Establecer el roomCode de la nueva sala
    currentRoomCodeRef.current = group.roomCode; // ✅ CORREGIDO: Actualizar la ref también

    // 📱 Cerrar sidebar en mobile al seleccionar un grupo
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handlePersonalNotes = () => {
    // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    setRoomUsers([]); // Limpiar usuarios de sala
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setAdminViewConversation(null); // Limpiar vista de admin
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setPinnedMessageId(null);
    setPinnedMessageObject(null);
    setTo(username);
  };

  const handleToggleMenu = useCallback(() => {
    if (window.innerWidth <= 768) {
      chatState.setShowSidebar(!chatState.showSidebar);
    }
  }, [chatState.showSidebar, chatState.setShowSidebar]);

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
        setPinnedMessageId(null);
        setPinnedMessageObject(null);
        // Limpiar mensajes visualmente
        clearMessages();

        // Si estaba en una sala, emitir salida (opcional)
        if (chatState.currentRoomCode && socket && socket.connected) {
          // socket.emit('leaveRoom', { roomCode: chatState.currentRoomCode, from: username });
        }
      }
    }
  }, [chatState, socket, clearMessages]); // 🔥 Agregamos dependencias correctas

  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  const handleNavigateToMention = async (event) => {
    const { roomCode, messageId } = event.detail;

    // Buscar la sala en myActiveRooms
    const room = myActiveRooms.find((r) => r.roomCode === roomCode);
    if (room) {
      await handleRoomSelect(room, messageId);
    } else {
      console.error("Sala no encontrada:", roomCode);
    }
  };

  const handleNavigateToGroup = async (event) => {
    const { roomCode, groupName } = event.detail;

    // Buscar la sala en myActiveRooms
    let room = null;

    if (roomCode) {
      room = myActiveRooms.find((r) => r.roomCode === roomCode);
    } else if (groupName) {
      room = myActiveRooms.find((r) => r.name === groupName || r.roomCode === groupName);
    }

    if (room) {
      await handleRoomSelect(room);
    } else {
      console.warn("Sala no encontrada en myActiveRooms:", { roomCode, groupName });
      // Intentar cargar las salas de nuevo
      await loadMyActiveRooms(1, false);
    }
  };

  const handleNavigateToChat = async (event) => {
    const { username: targetUsername } = event.detail;

    // Buscar en conversaciones asignadas
    const conversation = assignedConversations.find((conv) => {
      return conv.participants && conv.participants.includes(targetUsername);
    });

    if (conversation) {
      // Navegar a la conversación asignada
      setAdminViewConversation(conversation);
      setTo(null);
      setIsGroup(false);
      setCurrentRoomCode(null);
    } else {
      // Si no está en asignadas, abrir chat directo
      setTo(targetUsername);
      setIsGroup(false);
      setCurrentRoomCode(null);
      setAdminViewConversation(null);
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

  // Función para enviar mensaje principal
  const handleSendMessage = async () => {
    // 1. Prevenir envío si ya se está enviando o si está vacío
    if (chatState.isSending) return;
    if ((!input && mediaFiles.length === 0) || !chatState.to) return;

    chatState.setIsSending(true);

    try {
      // 2. Normalización (Ahora funcionará porque moviste la función arriba)
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
          // Asegúrate de importar apiService arriba
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
        id: `temp_${Date.now()}`,
        from: currentUserFullName,
        fromId: user.id,
        to: chatState.to,
        message: input,
        isGroup: effectiveIsGroup,
        roomCode: effectiveIsGroup ? chatState.currentRoomCode : undefined,
        ...attachmentData,
        // 🔥 DATOS DE RESPUESTA
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

      // 6. Guardar en BD
      const savedMessage = await apiService.createMessage({
        ...messageObj,
        to: messageObj.actualRecipient || messageObj.to
      });

      // 7. Emitir por Socket
      if (socket && socket.connected) {
        socket.emit("message", {
          ...messageObj,
          id: savedMessage.id,
          sentAt: savedMessage.sentAt
        });
      }

      // 8. UI Update
      if (!effectiveIsGroup) {
        addNewMessage({
          ...messageObj,
          id: savedMessage.id,
          sender: "Tú",
          realSender: currentUserFullName,
          isSent: true,
          isSelf: true,
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        });
      }

      clearInput();
      chatState.setReplyingTo(null);
      playMessageSound(chatState.soundsEnabled);

    } catch (error) {
      console.error("Error enviando mensaje:", error);
      // await showErrorAlert("Error", "No se pudo enviar el mensaje.");
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

      // 🔥 Si hay un nuevo archivo, subirlo primero
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
          to,
          isGroup,
          roomCode: currentRoomCode,
        });
      }

      // Actualizar localmente
      // 🔥 CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
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
          to,
          isGroup,
          roomCode: currentRoomCode,
          isAdmin,
          deletedBy: currentUserFullName,
        });
      }

      // 🔥 CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
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
  }, [chatState]);

  // 🔥 AGREGAR ESTO: Exponer la función globalmente para ChatContent
  useEffect(() => {
    window.handleReplyMessage = handleReplyMessage;
    return () => {
      delete window.handleReplyMessage;
    };
  }, [handleReplyMessage]);

  const handleCancelReply = useCallback(() => {
    chatState.setReplyingTo(null);
  }, [chatState]);

  const handleSendVoiceMessage = useCallback(async (audioFile) => {
    if (!audioFile || !chatState.to) return;

    // 1. URL LOCAL: Para mostrarlo en tu chat inmediatamente sin esperar subida
    const localAudioUrl = URL.createObjectURL(audioFile);

    try {
      // 🔥 CORREGIDO: Determinar correctamente si estamos en grupo o chat asignado
      const currentUserNormalized = normalizeUsername(currentUserFullName);

      // Buscar si el chat actual es una conversación asignada
      const assignedConv = chatState.assignedConversations?.find((conv) => {
        const participants = conv.participants || [];
        return participants.some(p => normalizeUsername(p) === normalizeUsername(chatState.to));
      });

      // 🔥 Si es grupo, SIEMPRE es grupo (no importa si hay conversación asignada)
      const effectiveIsGroup = chatState.isGroup;

      // 2. Objeto PRELIMINAR (UI inmediata)
      const tempMessageObj = {
        id: `msg_${Date.now()}`,
        to: chatState.to,
        isGroup: effectiveIsGroup,
        from: currentUserFullName,
        fromId: user.id,
        mediaType: "audio",
        mediaData: localAudioUrl,
        fileName: "audio-mensaje.webm",
        fileSize: audioFile.size,
        message: "",
        roomCode: effectiveIsGroup ? chatState.currentRoomCode : undefined,
        isSent: false // Marcado como "enviando..."
      };

      // Agregar visualmente al chat (feedback inmediato)
      addNewMessage({
        ...tempMessageObj,
        sender: "Tú",
        realSender: currentUserFullName,
        isSelf: true,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      });

      // 3. 🚀 SUBIR ARCHIVO AL SERVIDOR
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      // 4. Preparar objeto FINAL (con URL real del servidor)
      const finalMessageData = {
        ...tempMessageObj,
        mediaData: uploadResult.fileUrl, // <--- URL REAL QUE VIENE DEL BACKEND
        fileName: uploadResult.fileName,
        isSent: true
      };

      // Datos extra para asignados
      if (assignedConv) {
        finalMessageData.isAssignedConversation = true;
        finalMessageData.conversationId = assignedConv.id;
        finalMessageData.participants = assignedConv.participants;
        const other = assignedConv.participants.find(p => normalizeUsername(p) !== currentUserNormalized);
        if (other) finalMessageData.actualRecipient = other;
      }

      // 5. 🔥🔥🔥 GUARDAR EN BASE DE DATOS (ESTO FALTABA) 🔥🔥🔥
      // Sin esto, al dar F5 el mensaje desaparece.
      const savedMessage = await apiService.createMessage({
        ...finalMessageData,
        // Aseguramos que el 'to' sea correcto para el backend
        to: finalMessageData.actualRecipient || finalMessageData.to
      });

      // 6. Actualizar el ID temporal con el ID real de la base de datos
      finalMessageData.id = savedMessage.id;
      finalMessageData.sentAt = savedMessage.sentAt;

      // 7. Emitir al socket (para que el otro lo vea en tiempo real)
      if (socket && socket.connected) {
        socket.emit("message", finalMessageData);
      }

      playMessageSound(chatState.soundsEnabled);

      // Opcional: Actualizar el mensaje local con la URL real (para liberar memoria del blob local)
      // updateMessage(`msg_${Date.now()}`, { mediaData: uploadResult.fileUrl });

    } catch (error) {
      console.error("Error enviando audio:", error);
      showErrorAlert("Error", "No se pudo enviar el audio.");
    }
  }, [chatState, username, user, socket, addNewMessage, playMessageSound, currentUserFullName]);

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
        // 🔥 NUEVO: Incluir datos de respuesta
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

      // 2. Incrementar contador en BD
      await apiService.incrementThreadCount(messageData.threadId);

      // 3. Emitir por socket (Esto hará que 'useSocketListeners' reciba el evento y actualice la UI)
      if (socket && socket.connected) {
        console.log('📡 DEBUG - Emitiendo threadMessage con id:', savedMessage.id);
        socket.emit("threadMessage", {
          ...savedMessage,
          threadId: messageData.threadId,
        });

        // 🔥 ESTA LÍNEA ES LA CLAVE: Avisa al servidor que avise a todos (incluyéndome) que actualicen el contador
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
  // 🔥 FUNCIÓN RESTAURADA: Iniciar videollamada con Tarjeta UI
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

      // 🔥 Guardar participantes en localStorage para poder cerrar la sala después
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
        type: "video_call", // 🔥 Esto activa la tarjeta visual
        message: fallbackText,
        text: fallbackText,
        videoCallRoomID: videoRoomID,
        videoCallUrl: videoCallUrl,
        videoRoomID: videoRoomID,
        metadata: {
          videoCallUrl: videoCallUrl,
          videoRoomID: videoRoomID,
          isActive: true, // 🔥 Inicia activa
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

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token || 'mock-token');
    refreshAuth();
  };

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

      if (socket) {
        socket.disconnect();
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
      <audio ref={ringtoneSound} src={ringtoneSoundFile} loop /> {/* 🔥 Audio para llamadas (loop) */}

      {/* Layout principal */}
      <ChatLayout
        // Props del sidebar
        user={user}
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
        onRoomSelect={roomManagement.handleRoomSelect}
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
        socket={socket}
        socketConnected={chatState.socketConnected}
        soundsEnabled={chatState.soundsEnabled}
        onEnableSounds={handleEnableSounds}
        stopRingtone={stopRingtone} // 🔥 Pasar función para detener tono
        currentUsername={username}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        isTyping={chatState.typingUser !== null}
        typingUser={chatState.typingUser}
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
