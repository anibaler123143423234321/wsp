import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatLayout from '../layouts/ChatLayout';
import Login from '../components/Login';
import LoadingScreen from '../components/LoadingScreen';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import JoinRoomModal from '../components/modals/JoinRoomModal';
import AdminRoomsModal from '../components/modals/AdminRoomsModal';
import RoomCreatedModal from '../components/modals/RoomCreatedModal';
import EditRoomModal from '../components/modals/EditRoomModal';
import CreateConversationModal from '../components/modals/CreateConversationModal';
import ManageAssignedConversationsModal from '../components/modals/ManageAssignedConversationsModal';
import AddUsersToRoomModal from '../components/modals/AddUsersToRoomModal';
import RemoveUsersFromRoomModal from '../components/modals/RemoveUsersFromRoomModal';
import ThreadPanel from '../components/ThreadPanel';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { useMessagePagination } from '../hooks/useMessagePagination';
import apiService from '../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../sweetalert2';

const ChatPage = () => {
  // Hooks personalizados
  const { isAuthenticated, user, username, isAdmin, isLoading, logout, refreshAuth } = useAuth();
  const socket = useSocket(isAuthenticated, username, user);

  // 🔥 Nombre completo del usuario actual (usado en múltiples lugares)
  const currentUserFullName = user?.nombre && user?.apellido
    ? `${user.nombre} ${user.apellido}`
    : username;
  const {
    input,
    setInput,
    mediaFiles,
    mediaPreviews,
    isRecording,
    setIsRecording,
    messageSound,
    playMessageSound,
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    clearInput
  } = useMessages();

  // 🔥 BLOQUEADO: Hook de WebRTC deshabilitado

  // Estados del chat (declarar antes de los hooks que los usan)
  const [to, setTo] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userListPage, setUserListPage] = useState(0);
  const [userListHasMore, setUserListHasMore] = useState(true);
  const [userListLoading, setUserListLoading] = useState(false);
  const [groupList] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [currentRoomCode, setCurrentRoomCode] = useState(null);
  const [assignedConversations, setAssignedConversations] = useState([]);

  // Hook para paginación de mensajes
  const {
    messages,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    updateMessage,
    clearMessages
  } = useMessagePagination(currentRoomCode, username, to, isGroup, socket, user);

  // Estados adicionales del chat
  const [unreadMessages] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // El otro usuario está escribiendo
  const [typingTimeout, setTypingTimeout] = useState(null); // Timeout para detectar cuando deja de escribir
  const [roomTypingUsers, setRoomTypingUsers] = useState({}); // Usuarios escribiendo en cada sala { roomCode: [username1, username2] }
  const [adminViewConversation, setAdminViewConversation] = useState(null); // Conversación que el admin está viendo
  const [replyingTo, setReplyingTo] = useState(null); // Mensaje al que se está respondiendo
  const [threadMessage, setThreadMessage] = useState(null); // Mensaje del hilo abierto

  // Estados de UI
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  // Sidebar cerrado por defecto en mobile, abierto en desktop
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [showAdminRoomsModal, setShowAdminRoomsModal] = useState(false);
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);
  const [showManageConversationsModal, setShowManageConversationsModal] = useState(false);
  const [showAddUsersToRoomModal, setShowAddUsersToRoomModal] = useState(false);
  const [showRemoveUsersFromRoomModal, setShowRemoveUsersFromRoomModal] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [adminRooms, setAdminRooms] = useState([]);
  const [loadingAdminRooms, setLoadingAdminRooms] = useState(false);
  const [myActiveRooms, setMyActiveRooms] = useState([]); // Salas activas para mostrar en el sidebar
  const [editingRoom, setEditingRoom] = useState(null);

  // Estados de formularios
  const [roomForm, setRoomForm] = useState({ name: '', maxCapacity: 50 });
  const [joinRoomForm, setJoinRoomForm] = useState({ roomCode: '' });
  const [editForm, setEditForm] = useState({ maxCapacity: 50 });

  // Referencias
  const currentRoomCodeRef = useRef(null);
  const hasRestoredRoom = useRef(false);

  // Efecto para escuchar eventos de conexión del socket
  useEffect(() => {
    const handleSocketConnected = () => {
      setSocketConnected(true);
    };

    const handleSocketDisconnected = () => {
      setSocketConnected(false);
    };

    // Escuchar eventos personalizados
    window.addEventListener('socketConnected', handleSocketConnected);
    window.addEventListener('socketDisconnected', handleSocketDisconnected);

    return () => {
      window.removeEventListener('socketConnected', handleSocketConnected);
      window.removeEventListener('socketDisconnected', handleSocketDisconnected);
    };
  }, []);

  // Efecto para establecer el estado inicial del socket
  useEffect(() => {
    if (socket) {
      setSocketConnected(socket.connected);
    } else {
      setSocketConnected(false);
    }
  }, [socket]);

  // Efectos
  // ❌ ELIMINADO: No reconectar automáticamente a salas al hacer login
  // Los usuarios solo deben unirse a salas cuando:
  // 1. Crean una sala nueva
  // 2. Ingresan manualmente el código de una sala
  // 3. Acceden mediante un enlace directo (URL con hash)
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Solo marcar que se ha verificado, pero NO reconectar automáticamente
    if (!hasRestoredRoom.current) {
      hasRestoredRoom.current = true;
    }

    // Cargar las salas activas para todos los usuarios
    loadMyActiveRooms();
  }, [isAuthenticated, username, user]);

  // Efecto para detectar código de sala en URL y abrir modal de unirse
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Verificar si hay un código de sala en la URL hash
    const hash = window.location.hash;
    const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/);

    if (roomMatch && roomMatch[1]) {
      const roomCode = roomMatch[1];


      // Pre-llenar el formulario con el código de la sala
      setJoinRoomForm({ roomCode: roomCode });

      // Abrir el modal de "Unirse a sala"
      setShowJoinRoomModal(true);

      // Limpiar el hash de la URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isAuthenticated, username]);

  // Función para cargar las salas activas del usuario (solo para ADMIN y JEFEPISO)
  const loadMyActiveRooms = async () => {
    try {
      // Si es ADMIN o JEFEPISO, cargar todas las salas activas
      if (user?.role === 'ADMIN' || user?.role === 'JEFEPISO' || user?.role === 'PROGRAMADOR') {
        const rooms = await apiService.getAdminRooms();
        // Filtrar solo las salas activas
        const activeRooms = rooms.filter(room => room.isActive);
        setMyActiveRooms(activeRooms);
      } else {
        // Para usuarios normales, cargar su sala activa
        const response = await apiService.getCurrentUserRoom();
        // console.log('📥 Respuesta getCurrentUserRoom:', response);
        if (response && response.inRoom && response.room) {
          // console.log('✅ Sala encontrada, agregando a myActiveRooms:', response.room);
          setMyActiveRooms([response.room]);
        } else {
          // console.log('❌ No se encontró sala activa para el usuario');
          setMyActiveRooms([]);
        }
      }
    } catch (error) {
      console.error('Error al cargar salas activas:', error);
      setMyActiveRooms([]);
    }
  };

  // Cargar mensajes cuando cambie currentRoomCode (para grupos/salas)
  useEffect(() => {
    if (currentRoomCode && username && isGroup) {
      loadInitialMessages();
    }
  }, [currentRoomCode, username, isGroup, loadInitialMessages]);

  // Cargar mensajes cuando cambie 'to' (para conversaciones individuales)
  useEffect(() => {
    if (to && username && !isGroup && !currentRoomCode && !adminViewConversation) {
      loadInitialMessages();
    }
  }, [to, username, isGroup, currentRoomCode, loadInitialMessages, adminViewConversation]);

  // Cargar mensajes cuando el admin ve una conversación de otros usuarios
  useEffect(() => {
    const loadAdminViewMessages = async () => {
      if (!adminViewConversation || !adminViewConversation.participants || adminViewConversation.participants.length < 2) {
        return;
      }

      // console.log('🔄 Cargando mensajes para conversación asignada:', adminViewConversation);

      try {
        const [participant1, participant2] = adminViewConversation.participants;

        // 🔥 PRIMERO: Cargar mensajes para ver cuáles NO están leídos
        const historicalMessages = await apiService.getUserMessages(
          participant1,
          participant2,
          20,
          0
        );

        // console.log('✅ Mensajes cargados:', historicalMessages.length);

        // 🔥 SEGUNDO: Marcar como leídos SOLO si el usuario es ADMIN, PROGRAMADOR o JEFEPISO
        // Los ASESORES NO deben marcar mensajes como leídos automáticamente
        const canMarkAsRead = user?.role === 'ADMIN' || user?.role === 'PROGRAMADOR' || user?.role === 'JEFEPISO';

        if (canMarkAsRead) {
          const unreadMessages = historicalMessages.filter(msg => !msg.isRead);

          if (unreadMessages.length > 0) {
            try {
              // Marcar mensajes de participant1 a participant2 como leídos por participant2
              const unreadFromP1 = unreadMessages.filter(msg => msg.from === participant1);
              if (unreadFromP1.length > 0) {
                await apiService.markConversationAsRead(participant1, participant2);

                if (socket && socket.connected) {
                  socket.emit('markConversationAsRead', {
                    from: participant1,
                    to: participant2
                  });
                }
              }

              // Marcar mensajes de participant2 a participant1 como leídos por participant1
              const unreadFromP2 = unreadMessages.filter(msg => msg.from === participant2);
              if (unreadFromP2.length > 0) {
                await apiService.markConversationAsRead(participant2, participant1);

                if (socket && socket.connected) {
                  socket.emit('markConversationAsRead', {
                    from: participant2,
                    to: participant1
                  });
                }
              }

              // 🔥 Resetear el contador de mensajes no leídos en la lista de conversaciones
              setAssignedConversations(prevConversations => {
                return prevConversations.map(conv => {
                  if (conv.id === selectedConversation.id) {
                    return {
                      ...conv,
                      unreadCount: 0
                    };
                  }
                  return conv;
                });
              });
            } catch (error) {
              console.error("Error al marcar conversación como leída:", error);
            }
          }
        }

        // 🔥 TERCERO: Convertir mensajes al formato del frontend
        const formattedMessages = historicalMessages.map((msg) => {
          // 🔥 El mensaje es propio si fue enviado por el usuario actual logueado
          const isOwnMessage = msg.from === currentUserFullName;

          return {
            sender: msg.from,
            realSender: msg.from, // 🔥 Nombre real del remitente
            receiver: msg.to,
            text: msg.message || "",
            isGroup: false,
            time: msg.time || new Date(msg.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isSent: true, // 🔥 Marcar como enviado para que muestre los checks
            isSelf: isOwnMessage, // 🔥 Mensajes del usuario actual a la derecha, otros a la izquierda
            mediaType: msg.mediaType,
            mediaData: msg.mediaData,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            id: msg.id,
            sentAt: msg.sentAt,
            isRead: msg.isRead, // 🔥 Estado de lectura desde la BD (ya actualizado)
            readAt: msg.readAt,
            readBy: msg.readBy,
            // Campos de respuesta
            replyToMessageId: msg.replyToMessageId,
            replyToSender: msg.replyToSender, // 🔥 Mantener el valor original de la BD
            replyToText: msg.replyToText,
            // Campos de hilos
            threadCount: msg.threadCount || 0,
            lastReplyFrom: msg.lastReplyFrom || null,
          };
        });

        // Actualizar los mensajes manualmente (no usar el hook)
        clearMessages();
        formattedMessages.forEach(msg => addNewMessage(msg));

        // console.log('✅ Mensajes actualizados en el estado');
      } catch (error) {
        console.error("❌ Error al cargar mensajes de admin view:", error);
      }
    };

    if (adminViewConversation) {
      loadAdminViewMessages();
    }
  }, [adminViewConversation, user?.role, username, socket]);

  // Función para cargar conversaciones asignadas
  const loadAssignedConversations = useCallback(async () => {
    if (!isAuthenticated || !username) {
      return;
    }

    try {
      // Si el usuario es admin, obtener TODAS las conversaciones
      // Si no es admin, obtener solo las conversaciones asignadas al usuario
      let conversations;
      if (user?.role === 'ADMIN') {
        conversations = await apiService.getAllAssignedConversations();
      } else {
        conversations = await apiService.getMyAssignedConversations();
      }

      // 🔍 DEBUG: Ver qué nombres tienen las conversaciones
      // console.log('📋 Conversaciones cargadas desde el backend:');
      // conversations?.forEach(conv => {
      //   console.log(`  - ID ${conv.id}: name="${conv.name}", participants=`, conv.participants);
      // });

      setAssignedConversations(conversations || []);

      // Actualizar el registro del socket con las conversaciones asignadas
      if (socket && conversations && conversations.length > 0) {
        const displayName = user?.nombre && user?.apellido
          ? `${user.nombre} ${user.apellido}`
          : user?.username || user?.email;

        socket.emit('updateAssignedConversations', {
          username: displayName,
          assignedConversations: conversations
        });
      }
    } catch (error) {
      console.error('❌ Error al cargar conversaciones asignadas:', error);
      setAssignedConversations([]);
    }
  }, [isAuthenticated, username, socket, user]);

  // Cargar conversaciones asignadas al usuario
  useEffect(() => {
    if (!isAuthenticated || !username) {
      return;
    }

    // Pequeño delay para asegurar que el usuario esté completamente autenticado
    const timeoutId = setTimeout(() => {
      loadAssignedConversations();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, username, loadAssignedConversations]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    const s = socket;

    s.on('userList', (data) => {
      // ✅ SIEMPRE actualizar userList para que los indicadores de estado online/offline funcionen en tiempo real
      // No importa si el usuario está en una sala o no
      setUserList(data.users);
      setUserListPage(data.page || 0);
      setUserListHasMore(data.hasMore || false);
      setUserListLoading(false);
    });

    // Nuevo evento para recibir páginas adicionales
    s.on('userListPage', (data) => {
      // ✅ SIEMPRE actualizar userList para que los indicadores de estado online/offline funcionen en tiempo real
      // Agregar usuarios a la lista existente
      setUserList(prev => [...prev, ...data.users]);
      setUserListPage(data.page);
      setUserListHasMore(data.hasMore || false);
      setUserListLoading(false);
    });

        s.on('roomUsers', (data) => {
          // Actualizar lista de usuarios si estamos en la sala
          if (data.roomCode === currentRoomCodeRef.current) {
            setRoomUsers(data.users);
          }

          // SIEMPRE actualizar el contador en "Mis Salas Activas"
          // Contar solo usuarios conectados (isOnline === true)
          const connectedCount = data.users.filter(u => u.isOnline).length;
          setMyActiveRooms(prevRooms =>
            prevRooms.map(room =>
              room.roomCode === data.roomCode
                ? { ...room, currentMembers: connectedCount }
                : room
            )
          );
        });

        s.on('roomJoined', (data) => {
          if (data.roomCode === currentRoomCodeRef.current) {
            setRoomUsers(data.users);
          }
        });

        // 🔥 NUEVO: Escuchar errores al unirse a sala
        s.on('joinRoomError', (data) => {
          console.error('❌ Error al unirse a sala:', data.message);
          showErrorAlert('Error', data.message || 'Error al unirse a la sala');
        });

        s.on('userJoinedRoom', (data) => {
          if (data.roomCode === currentRoomCodeRef.current) {
        // Actualizar la lista de usuarios agregando el nuevo usuario
        setRoomUsers(prevUsers => {
          const userExists = prevUsers.some(user =>
            (typeof user === 'string' ? user : user.username) === data.user.username
          );
          if (!userExists) {
            return [...prevUsers, data.user];
          }
          return prevUsers;
        });
      }
    });

    // Actualizar contador de usuarios en salas activas (solo para ADMIN y JEFEPISO)
    s.on('roomCountUpdate', (data) => {
      if (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') {
        setMyActiveRooms(prevRooms =>
          prevRooms.map(room =>
            room.roomCode === data.roomCode
              ? { ...room, currentMembers: data.currentMembers }
              : room
          )
        );
      }
    });

    // Escuchar evento de expulsión
    s.on('kicked', async (data) => {
      // Limpiar estado de la sala
      setTo('');
      setIsGroup(false);
      setRoomUsers([]);
      setCurrentRoomCode(null);
      currentRoomCodeRef.current = null;
      clearMessages();

      // Mostrar alerta
      await showErrorAlert('Expulsado', data.message || 'Has sido expulsado de la sala');
    });

    s.on('message', (data) => {
      const timeString = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.isGroup) {
        // Ignorar mensajes que vienen del servidor si son nuestros propios mensajes
        // (ya los tenemos localmente)
        if (data.from === username || data.from === currentUserFullName) {
          return;
        }
        const newMessage = {
          id: data.id,
          sender: data.from,
          realSender: data.from, // 🔥 Nombre real del remitente
          senderRole: data.senderRole || null, // 🔥 Incluir role del remitente
          senderNumeroAgente: data.senderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente
          receiver: data.group,
          text: data.message || '',
          isGroup: true,
          time: timeString,
          isSent: false
        };

        if (data.mediaType) {
          newMessage.mediaType = data.mediaType;
          newMessage.mediaData = data.mediaData; // URL del archivo
          newMessage.fileName = data.fileName;
          newMessage.fileSize = data.fileSize;
        }

        // Agregar información de respuesta si existe
        if (data.replyToMessageId) {
          newMessage.replyToMessageId = data.replyToMessageId;
          newMessage.replyToSender = data.replyToSender;
          newMessage.replyToText = data.replyToText;
        }

        // Agregar información de hilos
        newMessage.threadCount = data.threadCount || 0;
        newMessage.lastReplyFrom = data.lastReplyFrom || null;

        addNewMessage(newMessage);

        if (data.from !== username && data.from !== currentUserFullName) {
          // 🔥 NUEVO: Reproducir sonido siempre que llega un mensaje de otro usuario
          playMessageSound(true);
        }
      } else {
        // Ignorar mensajes individuales que vienen del servidor si son nuestros propios mensajes
        if (data.from === username || data.from === currentUserFullName) {
          return;
        }

        // console.log('📨 Mensaje individual recibido:', {
        //   from: data.from,
        //   to: data.to,
        //   currentTo: to,
        //   isGroup: isGroup,
        //   currentRoomCode: currentRoomCode,
        //   message: data.message?.substring(0, 50)
        // });

        // 🔥 IMPORTANTE: Solo agregar el mensaje si el usuario está viendo el chat correcto
        // Verificar si el usuario está viendo el chat con el remitente
        const isViewingCorrectChat =
          !isGroup && // No está en un grupo
          !currentRoomCode && // No está en una sala
          to && // Hay un destinatario seleccionado
          (to.toLowerCase().trim() === data.from.toLowerCase().trim()); // El destinatario es el remitente

        // console.log('🔍 ¿Está viendo el chat correcto?', isViewingCorrectChat);

        if (!isViewingCorrectChat) {
          // console.log('⚠️ Usuario no está viendo el chat correcto. No se agrega el mensaje a la vista actual.');

          // 🔥 Actualizar el preview del último mensaje en la lista de conversaciones asignadas
          setAssignedConversations(prevConversations => {
            return prevConversations.map(conv => {
              // Buscar la conversación que corresponde a este mensaje
              const otherUser = conv.participants?.find(p => p !== currentUserFullName);
              const isThisConversation = otherUser?.toLowerCase().trim() === data.from.toLowerCase().trim();

              if (isThisConversation) {
                // console.log('🔄 Actualizando preview de conversación:', conv.name);

                // 🔥 IMPORTANTE: Solo incrementar el contador si el usuario es participante
                // En monitoreo, el contador viene del backend y no debe ser modificado
                const isUserParticipant = conv.participants?.includes(currentUserFullName);
                const newUnreadCount = isUserParticipant
                  ? (conv.unreadCount || 0) + 1
                  : conv.unreadCount;

                return {
                  ...conv,
                  lastMessage: data.message || '',
                  lastMessageTime: timeString,
                  lastMessageFrom: data.from,
                  unreadCount: newUnreadCount
                };
              }

              return conv;
            });
          });

          // 🔥 NUEVO: Reproducir sonido siempre que llega un mensaje
          playMessageSound(true);
          return;
        }

        const newMessage = {
          id: data.id,
          sender: data.from,
          realSender: data.from, // 🔥 Nombre real del remitente
          senderRole: data.senderRole || null, // 🔥 Incluir role del remitente
          senderNumeroAgente: data.senderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente
          receiver: data.to || username,
          text: data.message || '',
          isGroup: false,
          time: timeString,
          isSent: false,
          isSelf: false, // 🔥 Mensaje recibido, siempre a la izquierda
          isRead: data.isRead || false,
          readAt: data.readAt,
          sentAt: data.sentAt
        };

        if (data.mediaType) {
          newMessage.mediaType = data.mediaType;
          newMessage.mediaData = data.mediaData; // URL del archivo
          newMessage.fileName = data.fileName;
          newMessage.fileSize = data.fileSize;
        }

        // Agregar información de respuesta si existe
        if (data.replyToMessageId) {
          newMessage.replyToMessageId = data.replyToMessageId;
          newMessage.replyToSender = data.replyToSender;
          newMessage.replyToText = data.replyToText;
        }

        // Agregar información de hilos
        newMessage.threadCount = data.threadCount || 0;
        newMessage.lastReplyFrom = data.lastReplyFrom || null;

        // console.log('✅ Agregando mensaje a la vista actual');
        addNewMessage(newMessage);

        if (data.from !== username && data.from !== currentUserFullName) {
          // 🔥 NUEVO: Reproducir sonido siempre que llega un mensaje de otro usuario
          playMessageSound(true);
        }
      }
    });

    // Evento para mensaje editado
    s.on('messageEdited', (data) => {
      const { messageId, newText, editedAt, isEdited } = data;

      // Actualizar el mensaje en la lista de mensajes
      updateMessage(messageId, { text: newText, isEdited, editedAt });
    });

    s.on('connect', () => {
      if (currentRoomCode) {
        socket.emit('joinRoom', {
          roomCode: currentRoomCode,
          roomName: to,
          from: username
        });
      }
    });

    // 🔥 BLOQUEADO: Listeners de WebRTC deshabilitados

    // Nueva conversación asignada
    s.on('newConversationAssigned', async (data) => {
      // Recargar conversaciones asignadas
      try {
        // Si el usuario es admin, obtener TODAS las conversaciones
        // Si no es admin, obtener solo las conversaciones asignadas al usuario
        let conversations;
        if (user?.role === 'ADMIN') {
          conversations = await apiService.getAllAssignedConversations();
        } else {
          conversations = await apiService.getMyAssignedConversations();
        }

        setAssignedConversations(conversations);

        // Actualizar el socket con las conversaciones asignadas para que se actualice la lista de usuarios
        if (s && s.connected && user) {
          const displayName = user?.nombre && user?.apellido
            ? `${user.nombre} ${user.apellido}`
            : user?.username || user?.email;

          s.emit('updateAssignedConversations', {
            username: displayName,
            assignedConversations: conversations
          });
        }

        // Mostrar notificación con SweetAlert2
        await showSuccessAlert(
          '💬 Conversación asignada',
          `Chat: ${data.otherUser}\n\nPuedes verla en tu lista de chats.`
        );
      } catch (error) {
        console.error('Error al recargar conversaciones:', error);
      }
    });

    // Evento: Conversación actualizada (nombre, descripción, etc.)
    s.on('conversationDataUpdated', async (data) => {
      try {
        // Recargar conversaciones asignadas
        await loadAssignedConversations();

        // 🔥 NO mostrar alerta aquí para evitar duplicados
        // La alerta ya se muestra en el modal de edición
        // console.log('✅ Conversación actualizada:', data.conversationName);
      } catch (error) {
        console.error('Error al recargar conversaciones:', error);
      }
    });

    // Evento: Conversación marcada como leída (actualizar checks)
    s.on('conversationRead', (data) => {
      const { readBy, messageIds, readAt, from, to: readTo } = data;

      // Actualizar todos los mensajes que fueron leídos
      if (messageIds && Array.isArray(messageIds)) {
        messageIds.forEach(messageId => {
          updateMessage(messageId, {
            isRead: true,
            readAt: readAt,
            readBy: [readBy] // Agregar el usuario que leyó el mensaje
          });
        });
      }

      // 🔥 Resetear el contador de mensajes no leídos en la lista de conversaciones
      if (from && readTo) {
        setAssignedConversations(prevConversations => {
          return prevConversations.map(conv => {
            const otherUser = conv.participants?.find(p => p !== currentUserFullName);
            const isThisConversation =
              otherUser?.toLowerCase().trim() === from?.toLowerCase().trim() ||
              otherUser?.toLowerCase().trim() === readTo?.toLowerCase().trim();

            if (isThisConversation) {
              return {
                ...conv,
                unreadCount: 0
              };
            }
            return conv;
          });
        });
      }
    });

    // Evento: El otro usuario está escribiendo
    s.on('userTyping', (data) => {
      const { from, isTyping: typing } = data;

      // Solo mostrar si el mensaje es del usuario con el que estamos chateando
      if (from === to) {
        setIsTyping(typing);

        // Si está escribiendo, limpiar el timeout anterior
        if (typing && typingTimeout) {
          clearTimeout(typingTimeout);
        }

        // Si dejó de escribir, ocultar el indicador después de 1 segundo
        if (!typing) {
          const timeout = setTimeout(() => {
            setIsTyping(false);
          }, 1000);
          setTypingTimeout(timeout);
        }
      }
    });

    // Evento: Alguien está escribiendo en una sala
    s.on('roomTyping', (data) => {
      const { from, roomCode, isTyping: typing } = data;

      setRoomTypingUsers(prev => {
        const currentTyping = prev[roomCode] || [];

        if (typing) {
          // Agregar usuario si no está ya en la lista
          if (!currentTyping.includes(from)) {
            return {
              ...prev,
              [roomCode]: [...currentTyping, from]
            };
          }
        } else {
          // Remover usuario de la lista
          const filtered = currentTyping.filter(user => user !== from);
          if (filtered.length === 0) {
            const { [roomCode]: _, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [roomCode]: filtered
          };
        }

        return prev;
      });
    });

    // Evento: Mensaje de sala marcado como leído
    s.on('roomMessageRead', (data) => {
      const { messageId, readBy, readAt } = data;

      // Actualizar el mensaje con el array completo de lectores
      updateMessage(messageId, {
        readBy: readBy, // readBy es el array completo desde el backend
        readAt: readAt
      });
    });

    // 🔥 Evento: Nueva sala creada (notificación global para ADMIN y JEFEPISO)
    s.on('roomCreated', (data) => {
      // console.log('✨ Nueva sala creada:', data);

      // Solo agregar si el usuario es ADMIN o JEFEPISO
      if (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') {
        // Agregar la nueva sala a la lista de salas activas
        setMyActiveRooms(prevRooms => {
          // Verificar que no exista ya en la lista
          const exists = prevRooms.some(room => room.id === data.id);
          if (!exists) {
            return [data, ...prevRooms];
          }
          return prevRooms;
        });
      }
    });

    // 🔥 Evento: Sala eliminada/desactivada (notificación global)
    s.on('roomDeleted', (data) => {
      const { roomCode, roomId } = data;

      // Actualizar la lista de salas activas eliminando la sala
      setMyActiveRooms(prevRooms =>
        prevRooms.filter(room => room.id !== roomId && room.roomCode !== roomCode)
      );

      // Si el usuario está actualmente en la sala eliminada, sacarlo
      if (currentRoomCode === roomCode) {
        setTo('');
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        clearMessages();

        // Mostrar notificación
        showErrorAlert(
          'Sala eliminada',
          'La sala en la que estabas ha sido eliminada por el administrador.'
        );
      }
    });

    // 🔥 Evento: Usuario agregado a una sala
    s.on('addedToRoom', async (data) => {
      const { message, roomCode } = data;

      // Recargar la lista de salas activas del usuario
      try {
        const response = await apiService.getCurrentUserRoom();
        if (response && response.inRoom && response.room) {
          setMyActiveRooms([response.room]);
        }
      } catch (error) {
        console.error('Error al recargar sala activa:', error);
      }

      // Solo mostrar notificación si NO estamos actualmente en esa sala
      // (para evitar mostrar la alerta cuando el usuario se une manualmente)
      if (currentRoomCodeRef.current !== roomCode) {
        showSuccessAlert('Agregado a sala', message);
      }
    });

    // 🔥 Evento: Usuario eliminado de una sala
    s.on('removedFromRoom', async (data) => {
      const { message, roomCode } = data;

      // Si estamos en la sala de la que fuimos eliminados, salir
      if (currentRoomCodeRef.current === roomCode) {
        setTo(null);
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        setMessages([]);
      }

      // Recargar la lista de salas activas del usuario
      try {
        const response = await apiService.getCurrentUserRoom();
        if (response && response.inRoom && response.room) {
          setMyActiveRooms([response.room]);
        } else {
          setMyActiveRooms([]);
        }
      } catch (error) {
        console.error('Error al recargar sala activa:', error);
      }

      // Mostrar notificación
      showErrorAlert('Eliminado de sala', message);
    });

    // 🔥 Evento: Sala desactivada por el administrador
    s.on('roomDeactivated', async (data) => {
      const { message, roomCode } = data;

      // console.log('🚫 Sala desactivada:', roomCode);

      // Si estamos en la sala desactivada, salir
      if (currentRoomCodeRef.current === roomCode) {
        setTo(null);
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        setMessages([]);
      }

      // Recargar la lista de salas activas del usuario
      try {
        const response = await apiService.getCurrentUserRoom();
        if (response && response.inRoom && response.room) {
          setMyActiveRooms([response.room]);
        } else {
          setMyActiveRooms([]);
        }
      } catch (error) {
        console.error('Error al recargar sala activa:', error);
      }

      // Mostrar notificación
      showErrorAlert('Sala desactivada', message);
    });

    // Evento: Reacción actualizada en un mensaje
    s.on('reactionUpdated', (data) => {
      const { messageId, reactions } = data;

      // Actualizar el mensaje con las nuevas reacciones
      updateMessage(messageId, {
        reactions: reactions
      });
    });

    // Evento: Contador de hilo actualizado
    s.on('threadCountUpdated', (data) => {
      const { messageId, lastReplyFrom } = data;
      // console.log('🔢 Evento threadCountUpdated recibido:', data);

      // Buscar el mensaje en la lista actual
      const messageToUpdate = messages.find(msg => msg.id === messageId);
      if (messageToUpdate) {
        // console.log('📝 Actualizando contador de hilo para mensaje:', messageId);
        updateMessage(messageId, {
          threadCount: (messageToUpdate.threadCount || 0) + 1,
          lastReplyFrom: lastReplyFrom
        });
      }
    });

        return () => {
          s.off('userList');
          s.off('roomUsers');
          s.off('roomJoined');
          s.off('joinRoomError');
          s.off('userJoinedRoom');
          s.off('message');
          s.off('connect');
          // 🔥 BLOQUEADO: Event listeners de WebRTC removidos
          s.off('newConversationAssigned');
          s.off('userTyping');
          s.off('roomTyping');
          s.off('roomMessageRead');
          s.off('reactionUpdated');
          s.off('threadCountUpdated');
          s.off('roomCreated');
          s.off('roomDeleted');
          s.off('removedFromRoom');
          s.off('roomDeactivated');
        };
      }, [socket, currentRoomCode, to, isGroup, username, isAdmin, soundsEnabled, typingTimeout]);

  // Estado para el mensaje a resaltar
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  // Función para cargar más usuarios (paginación)
  const loadMoreUsers = () => {
    if (!socket || !socket.connected || userListLoading || !userListHasMore) {
      return;
    }

    setUserListLoading(true);
    socket.emit('requestUserListPage', {
      page: userListPage + 1,
      pageSize: 10
    });
  };

  // Handlers
  const handleUserSelect = (userName, messageId = null, conversationData = null) => {
    // console.log('👤 Usuario seleccionado:', userName, 'conversationData:', conversationData);
    // console.log('🔄 Estado ANTES de cambiar:', {
    //   to,
    //   isGroup,
    //   currentRoomCode
    // });

    // Si es una conversación de admin (conversationData presente), guardarla
    if (conversationData) {
      setAdminViewConversation(conversationData);
      // 🔥 IMPORTANTE: Usar userName (que es el displayName del otro participante)
      // NO usar conversationData.name porque puede ser el nombre de cualquiera de los dos
      setTo(userName);
      // No limpiar mensajes aquí, el useEffect se encargará
    } else {
      setAdminViewConversation(null);
      setTo(userName);
      // Solo limpiar mensajes si NO es una conversación asignada
      clearMessages();
    }

    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);

    // console.log('✅ Estado DESPUÉS de cambiar (programado):', {
    //   to: userName,
    //   isGroup: false,
    //   currentRoomCode: null
    // });

    // Si se proporciona un messageId, guardarlo para resaltarlo después de cargar los mensajes
    if (messageId) {
      setHighlightMessageId(messageId);
    } else {
      setHighlightMessageId(null);
    }

    // 📱 Cerrar sidebar en mobile al seleccionar un chat
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handleGroupSelect = (group) => {
    // Limpiar la vista de admin al seleccionar un grupo
    setAdminViewConversation(null);

    setTo(group.name);
    setIsGroup(true);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers(group.members);
    clearMessages();

    // 📱 Cerrar sidebar en mobile al seleccionar un grupo
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handlePersonalNotes = () => {
    setTo(username);
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    clearMessages();
  };

  // Función para cerrar el chat (volver al sidebar)
  const handleCloseChat = () => {
    // En desktop, cerrar el chat significa limpiar la selección
    setTo('');
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    setAdminViewConversation(null);
    clearMessages();

    // En mobile, mostrar el sidebar
    if (window.innerWidth <= 768) {
      setShowSidebar(true);
    }
  };

  // Función para toggle del menú (ocultar/mostrar sidebar)
  const handleToggleMenu = () => {
    // En mobile, si hay un chat seleccionado y el sidebar está cerrado,
    // el botón de "regresar" debe cerrar el chat en lugar de abrir el sidebar
    if (window.innerWidth <= 768 && to && !showSidebar) {
      handleCloseChat();
    } else {
      setShowSidebar(!showSidebar);
    }
  };

  // Listener para la tecla ESC en desktop
  useEffect(() => {
    const handleEscKey = (event) => {
      // Solo en desktop (ancho > 600px)
      if (event.key === 'Escape' && window.innerWidth > 600 && to) {
        handleCloseChat();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [to]); // Dependencia: to (para saber si hay un chat abierto)

  const handleCreateRoom = async () => {
    try {
      // Incluir el nombre del creador en la petición de creación
      const createData = {
        name: roomForm.name,
        maxCapacity: roomForm.maxCapacity,
        creatorUsername: username
      };

      const result = await apiService.createTemporaryRoom(createData);
      setShowCreateRoomModal(false);
      setRoomForm({ name: '', maxCapacity: 50 });
      
      // Guardar los datos de la sala creada para mostrar en el modal
      setCreatedRoomData(result);
      setShowRoomCreatedModal(true);
      
      // Ya no necesitamos unirnos manualmente, el creador ya está en la sala
      setTo(result.name);
      setIsGroup(true);
      setCurrentRoomCode(result.roomCode);
      currentRoomCodeRef.current = result.roomCode;
      
      // La sala se maneja automáticamente por el backend
      
      // Emitir evento de unirse a la sala
      if (socket && socket.connected) {
        socket.emit('joinRoom', {
          roomCode: result.roomCode,
          roomName: result.name,
          from: username
        });
      }
      
      clearMessages();
      setRoomUsers([]);

      // Actualizar la lista de salas activas para que aparezca en el sidebar
      await loadMyActiveRooms();

    } catch (error) {
      console.error('Error al crear sala:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      await showErrorAlert('Error al crear sala', errorMessage);
    }
  };

  const handleJoinRoom = async () => {
    try {
      // Incluir el nombre del usuario en la petición
      const joinData = {
        roomCode: joinRoomForm.roomCode,
        username: username
      };

      const result = await apiService.joinRoom(joinData);
      setShowJoinRoomModal(false);
      setJoinRoomForm({ roomCode: '' });

      // Limpiar la vista de admin al unirse a una sala
      setAdminViewConversation(null);

      setTo(result.name);
      setIsGroup(true);
      setCurrentRoomCode(result.roomCode);
      currentRoomCodeRef.current = result.roomCode;
      
      // Cargar mensajes históricos de la sala usando paginación
      await loadInitialMessages();
      
      // Emitir evento de unirse a la sala
      if (socket && socket.connected) {
        socket.emit('joinRoom', {
          roomCode: result.roomCode,
          roomName: result.name,
          from: username
        });
      }

      setRoomUsers([]);

    } catch (error) {
      console.error('Error al unirse a sala:', error);
      await showErrorAlert('Error', 'Error al unirse a la sala: ' + error.message);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && socket.connected) {
      socket.emit('leaveRoom', {
        roomCode: currentRoomCode,
        from: username
      });
    }

    // Limpiar el chat y regresar al WelcomeScreen
    setTo('');
    setIsGroup(false);
    setRoomUsers([]);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setAdminViewConversation(null);
    clearMessages();

    // En mobile, mostrar el sidebar
    if (window.innerWidth <= 768) {
      setShowSidebar(true);
    }
  };

  // Función para seleccionar una sala del sidebar
  const handleRoomSelect = async (room) => {
    try {
      // Si ya estamos en esta sala, no hacer nada
      if (currentRoomCode === room.roomCode) {
        return;
      }

      // Si estamos en otra sala, salir primero
      if (currentRoomCode && socket && socket.connected) {
        socket.emit('leaveRoom', {
          roomCode: currentRoomCode,
          from: username
        });
      }

      // Limpiar la vista de admin al seleccionar una sala
      setAdminViewConversation(null);

      // Unirse a la sala seleccionada
      setTo(room.name);
      setIsGroup(true);
      setCurrentRoomCode(room.roomCode);
      currentRoomCodeRef.current = room.roomCode;

      // Emitir evento de unirse a la sala
      if (socket && socket.connected) {
        socket.emit('joinRoom', {
          roomCode: room.roomCode,
          roomName: room.name,
          from: username
        });
      }

      clearMessages();
      setRoomUsers([]);

      // 📱 Cerrar sidebar en mobile al seleccionar una sala
      if (window.innerWidth <= 768) {
        setShowSidebar(false);
      }

    } catch (error) {
      console.error('Error al seleccionar sala:', error);
      await showErrorAlert('Error', 'Error al unirse a la sala: ' + error.message);
    }
  };

  const handleSendMessage = async () => {
    if ((!input && mediaFiles.length === 0) || !to) return;

    // console.log('📤 handleSendMessage - Estado actual:', {
    //   to,
    //   isGroup,
    //   currentRoomCode,
    //   username,
    //   input: input?.substring(0, 50)
    // });

    // Buscar si esta conversación es asignada
    const assignedConv = assignedConversations?.find(conv => {
      const otherUser = conv.participants?.find(p => p !== currentUserFullName);
      // console.log('🔍 Buscando conversación asignada:', {
      //   to,
      //   currentUserFullName,
      //   convName: conv.name,
      //   participants: conv.participants,
      //   otherUser,
      //   match: otherUser === to || conv.name === to
      // });
      // 🔥 Comparación case-insensitive para nombres
      const toNormalized = to?.toLowerCase().trim();
      const otherUserNormalized = otherUser?.toLowerCase().trim();
      const convNameNormalized = conv.name?.toLowerCase().trim();

      return otherUserNormalized === toNormalized || convNameNormalized === toNormalized;
    });

    // console.log('📧 Conversación asignada encontrada:', assignedConv);

    // Si es una conversación asignada y el usuario NO está en ella, no permitir enviar
    if (assignedConv && !assignedConv.participants?.includes(currentUserFullName)) {
      await showErrorAlert(
        'No permitido',
        'No puedes enviar mensajes en conversaciones de otros usuarios. Solo puedes monitorearlas.'
      );
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Generar ID único para el mensaje
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    if (input || mediaFiles.length === 1) {
      // 🔥 Si es una conversación asignada, FORZAR isGroup a false
      const effectiveIsGroup = assignedConv ? false : isGroup;

      const messageObj = {
        id: messageId,
        to,
        isGroup: effectiveIsGroup, // 🔥 Usar el valor efectivo
        time: timeString,
        from: username,
        fromId: user.id
      };

      // console.log('📤 Creando messageObj:', {
      //   to,
      //   isGroup: effectiveIsGroup,
      //   isAssignedConv: !!assignedConv,
      //   originalIsGroup: isGroup
      // });

      // Si es una conversación asignada, agregar información adicional
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        // El destinatario real es el otro participante (comparación case-insensitive)
        const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
        const otherParticipant = assignedConv.participants?.find(
          p => p?.toLowerCase().trim() !== currentUserNormalized
        );
        if (otherParticipant) {
          messageObj.actualRecipient = otherParticipant;
          // console.log('📧 Mensaje a conversación asignada. Destinatario real:', otherParticipant);
        }
      }

      if (input) {
        messageObj.message = input;
      }

      // Agregar información de respuesta si existe
      if (replyingTo) {
        messageObj.replyToMessageId = replyingTo.id;
        messageObj.replyToSender = replyingTo.sender;
        messageObj.replyToText = replyingTo.text;
      }

      // 🔥 NUEVO: Subir archivo al servidor primero
      if (mediaFiles.length === 1) {
        try {
          const file = mediaFiles[0];

          // Subir archivo y obtener URL
          const uploadResult = await apiService.uploadFile(file, 'chat');

          messageObj.mediaType = file.type.split('/')[0];
          messageObj.mediaData = uploadResult.fileUrl; // ✅ Ahora es URL, no base64
          messageObj.fileName = uploadResult.fileName;
          messageObj.fileSize = uploadResult.fileSize;
        } catch (error) {
          console.error('❌ Error al subir archivo:', error);
          await showErrorAlert('Error', 'Error al subir el archivo. Inténtalo de nuevo.');
          return;
        }
      }

      if (to === username) {
        // Mensaje a ti mismo - guardar en BD y mostrar localmente
        const newMessage = {
          sender: 'Tú',
          realSender: currentUserFullName, // 🔥 Nombre real del remitente
          receiver: username,
          text: input || (messageObj.fileName ? `📎 ${messageObj.fileName}` : ''),
          time: timeString,
          isSent: true,
          isSelf: true,
          mediaType: messageObj.mediaType || null,
          mediaData: messageObj.mediaData || null, // Ahora es URL
          fileName: messageObj.fileName || null,
          fileSize: messageObj.fileSize || null
        };

        // Agregar información de respuesta si existe
        if (replyingTo) {
          newMessage.replyToMessageId = replyingTo.id;
          newMessage.replyToSender = replyingTo.sender;
          newMessage.replyToText = replyingTo.text;
        }

        // Agregar información de hilos
        newMessage.threadCount = 0;
        newMessage.lastReplyFrom = null;

        // Guardar en la base de datos
        try {
          await apiService.createMessage({
            from: username,
            fromId: user.id,
            to: username,
            message: input,
            isGroup: false,
            mediaType: newMessage.mediaType,
            mediaData: newMessage.mediaData, // URL del archivo
            fileName: newMessage.fileName,
            fileSize: newMessage.fileSize,
            time: timeString,
            sentAt: new Date().toISOString(),
            replyToMessageId: replyingTo?.id,
            replyToSender: replyingTo?.sender,
            replyToText: replyingTo?.text
          });
        } catch (error) {
          console.error('❌ Error al guardar mensaje personal en BD:', error);
        }

        addNewMessage(newMessage);
        clearInput();
        setReplyingTo(null); // Limpiar el estado de respuesta
        return;
      }


      // Verificar que el socket esté conectado antes de enviar
      if (!socket || !socket.connected) {
        console.error('❌ Socket no conectado, no se puede enviar mensaje');
        await showErrorAlert('Error de conexión', 'No hay conexión con el servidor. Inténtalo de nuevo.');
        return;
      }
      
        socket.emit('message', messageObj);

      const newMessage = {
        id: messageId,
        sender: 'Tú',
        realSender: currentUserFullName, // 🔥 Nombre real del remitente
        receiver: to,
        text: input || '',
        isGroup: isGroup,
        time: timeString,
        isSent: true
      };

      if (messageObj.mediaType) {
        newMessage.mediaType = messageObj.mediaType;
        newMessage.mediaData = messageObj.mediaData; // URL del archivo
        newMessage.fileName = messageObj.fileName;
        newMessage.fileSize = messageObj.fileSize;
      }

      // Agregar información de respuesta al mensaje local si existe
      if (replyingTo) {
        newMessage.replyToMessageId = replyingTo.id;
        newMessage.replyToSender = replyingTo.sender;
        newMessage.replyToText = replyingTo.text;
      }

      // Agregar información de hilos
      newMessage.threadCount = 0;
      newMessage.lastReplyFrom = null;

      addNewMessage(newMessage);
      // 🔥 NUEVO: Reproducir sonido siempre
      playMessageSound(true);

      // 🔥 Actualizar el preview del último mensaje en la lista de conversaciones asignadas
      if (assignedConv) {
        setAssignedConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv.id === assignedConv.id) {
              // console.log('🔄 Actualizando preview de conversación enviada:', conv.name);
              return {
                ...conv,
                lastMessage: input || (messageObj.fileName ? `📎 ${messageObj.fileName}` : ''),
                lastMessageTime: timeString,
                lastMessageFrom: currentUserFullName
              };
            }
            return conv;
          });
        });
      }
    }

    clearInput();
    setReplyingTo(null); // Limpiar el estado de respuesta
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim()) {
      await showErrorAlert('Error', 'El mensaje no puede estar vacío');
      return;
    }

    try {
      // Actualizar en la base de datos
      await apiService.editMessage(messageId, username, newText);

      // Emitir evento de socket para sincronizar en tiempo real
      if (socket && socket.connected) {
        socket.emit('editMessage', {
          messageId,
          username,
          newText,
          to,
          isGroup,
          roomCode: currentRoomCode
        });
      }

      // Actualizar localmente
      updateMessage(messageId, { text: newText, isEdited: true, editedAt: new Date() });
    } catch (error) {
      console.error('Error al editar mensaje:', error);
      await showErrorAlert('Error', 'Error al editar el mensaje. Inténtalo de nuevo.');
    }
  };

  // Función para manejar la respuesta a un mensaje
  const handleReplyMessage = (message) => {
    setReplyingTo({
      id: message.id,
      sender: message.realSender, // 🔥 SIEMPRE usar realSender (nunca "Tú")
      text: message.text || (message.fileName ? `📎 ${message.fileName}` : 'Archivo multimedia')
    });
  };

  // Función para cancelar la respuesta
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Función para enviar mensaje de voz
  const handleSendVoiceMessage = async (audioFile) => {
    if (!audioFile || !to) return;

    try {
      // Subir el archivo de audio al servidor
      const uploadResult = await apiService.uploadFile(audioFile, 'chat');

      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 🔥 Verificar si es una conversación asignada
      const assignedConv = assignedConversations?.find(conv => {
        const otherUser = conv.participants?.find(p => p !== currentUserFullName);
        const toNormalized = to?.toLowerCase().trim();
        const otherUserNormalized = otherUser?.toLowerCase().trim();
        const convNameNormalized = conv.name?.toLowerCase().trim();
        return otherUserNormalized === toNormalized || convNameNormalized === toNormalized;
      });

      // 🔥 Si es una conversación asignada, FORZAR isGroup a false
      const effectiveIsGroup = assignedConv ? false : isGroup;

      const messageObj = {
        id: messageId,
        to,
        isGroup: effectiveIsGroup, // 🔥 Usar el valor efectivo
        time: timeString,
        from: username,
        fromId: user.id,
        mediaType: 'audio',
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        message: '' // Mensaje vacío para audios
      };

      // 🔥 Si es una conversación asignada, agregar información adicional
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
        const otherParticipant = assignedConv.participants?.find(
          p => p?.toLowerCase().trim() !== currentUserNormalized
        );
        if (otherParticipant) {
          messageObj.actualRecipient = otherParticipant;
          // console.log('🎤 Audio a conversación asignada. Destinatario real:', otherParticipant);
        }
      }

      // Si hay un mensaje al que se está respondiendo
      if (replyingTo) {
        messageObj.replyToMessageId = replyingTo.id;
        messageObj.replyToSender = replyingTo.sender;
        messageObj.replyToText = replyingTo.text;
      }

      // Si es una sala activa
      if (isGroup && currentRoomCode) {
        messageObj.roomCode = currentRoomCode;
      }

      // 🔥 Emitir evento 'message' (igual que los mensajes de texto)
      socket.emit('message', messageObj);

      // Agregar mensaje localmente
      const newMessage = {
        id: messageId,
        sender: 'Tú',
        realSender: currentUserFullName, // 🔥 Nombre real del remitente
        receiver: to,
        text: '',
        isGroup: isGroup,
        time: timeString,
        isSent: true,
        mediaType: 'audio',
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize
      };

      if (replyingTo) {
        newMessage.replyToMessageId = replyingTo.id;
        newMessage.replyToSender = replyingTo.sender;
        newMessage.replyToText = replyingTo.text;
      }

      addNewMessage(newMessage);

      // 🔥 Actualizar el preview del último mensaje en la lista de conversaciones asignadas
      if (assignedConv) {
        setAssignedConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv.id === assignedConv.id) {
              // console.log('🔄 Actualizando preview de conversación enviada (audio):', conv.name);
              return {
                ...conv,
                lastMessage: '🎤 Audio',
                lastMessageTime: timeString,
                lastMessageFrom: currentUserFullName
              };
            }
            return conv;
          });
        });
      }

      // Limpiar respuesta si existe
      if (replyingTo) {
        setReplyingTo(null);
      }

      // 🔥 NUEVO: Reproducir sonido siempre
      playMessageSound(true);

    } catch (error) {
      console.error('❌ Error al enviar mensaje de voz:', error);
      await showErrorAlert('Error', 'Error al enviar el mensaje de voz. Inténtalo de nuevo.');
    }
  };

  // Función para abrir un hilo
  const handleOpenThread = (message) => {
    setThreadMessage({
      id: message.id,
      from: message.sender || message.from,
      to: message.receiver || message.to,
      text: message.text || message.message,
      sentAt: message.sentAt || message.time,
      threadCount: message.threadCount || 0,
      isGroup,
      roomCode: currentRoomCode,
      // 🔥 Incluir campos multimedia
      mediaType: message.mediaType,
      mediaData: message.mediaData,
      fileName: message.fileName,
      fileSize: message.fileSize,
      time: message.time,
      isRead: message.isRead,
      isSent: message.isSent,
      readBy: message.readBy
    });
  };

  // Función para cerrar el hilo
  const handleCloseThread = () => {
    setThreadMessage(null);
  };

  // Función para enviar mensaje en hilo
  const handleSendThreadMessage = async (messageData) => {
    try {
      const messageObj = {
        from: messageData.from,
        to: messageData.to,
        message: messageData.text,
        isGroup: messageData.isGroup,
        roomCode: messageData.roomCode,
        threadId: messageData.threadId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fromId: user.id
      };

      // Guardar en BD
      const savedMessage = await apiService.createMessage(messageObj);

      // Incrementar contador del hilo
      await apiService.incrementThreadCount(messageData.threadId);

      // Emitir por socket
      if (socket && socket.connected) {
        if (messageData.isGroup) {
          socket.emit('sendGroupMessage', {
            ...messageObj,
            roomCode: messageData.roomCode
          });
        } else {
          socket.emit('sendMessage', messageObj);
        }

        // Emitir evento específico de hilo
        socket.emit('threadMessage', {
          ...savedMessage,
          threadId: messageData.threadId
        });

        // Emitir evento para actualizar el contador en el mensaje original
        socket.emit('threadCountUpdated', {
          messageId: messageData.threadId,
          lastReplyFrom: messageData.from,
          from: messageData.from,
          to: messageData.to,
          roomCode: messageData.roomCode,
          isGroup: messageData.isGroup
        });
      }

      // Actualizar el contador en el mensaje principal del ThreadPanel
      setThreadMessage(prev => ({
        ...prev,
        threadCount: (prev.threadCount || 0) + 1,
        lastReplyFrom: messageData.from
      }));

      // Actualizar el contador en la lista de mensajes del chat principal
      // Buscar el mensaje en la lista actual y actualizarlo
      const messageToUpdate = messages.find(msg => msg.id === messageData.threadId);
      if (messageToUpdate) {
        updateMessage(messageData.threadId, {
          threadCount: (messageToUpdate.threadCount || 0) + 1,
          lastReplyFrom: messageData.from
        });
      }

    } catch (error) {
      console.error('Error al enviar mensaje en hilo:', error);
      await showErrorAlert('Error', 'Error al enviar el mensaje en el hilo.');
    }
  };

  // Exponer la función globalmente para que ChatContent pueda acceder a ella
  useEffect(() => {
    window.handleReplyMessage = handleReplyMessage;
    return () => {
      delete window.handleReplyMessage;
    };
  }, []);

  const handleShowAdminRooms = async () => {
    setLoadingAdminRooms(true);
    try {
      const rooms = await apiService.getAdminRooms();
      setAdminRooms(rooms);
      setShowAdminRoomsModal(true);
    } catch (error) {
      console.error('Error al cargar salas:', error);
      await showErrorAlert('Error', 'Error al cargar las salas: ' + error.message);
    } finally {
      setLoadingAdminRooms(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      '¿Eliminar sala?',
      `¿Estás seguro de que quieres eliminar la sala "${roomName}"?`
    );

    // ✅ Verificar correctamente si el usuario confirmó
    if (result.isConfirmed) {
      try {
        await apiService.deleteRoom(roomId);
        await showSuccessAlert('Éxito', 'Sala eliminada correctamente');

        // Actualizar la lista de salas en el modal de administración
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);

        // ✅ Actualizar también la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error('Error al eliminar sala:', error);
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          await showErrorAlert('Aviso', 'La sala ya fue eliminada');
          const rooms = await apiService.getAdminRooms();
          setAdminRooms(rooms);

          // ✅ Actualizar también la lista de salas activas en el sidebar
          await loadMyActiveRooms();
        } else {
          await showErrorAlert('Error', 'Error al eliminar la sala: ' + error.message);
        }
      }
    }
  };

  const handleKickUser = async (usernameToKick, roomCode) => {
    const result = await showConfirmAlert(
      '¿Expulsar usuario?',
      `¿Estás seguro de que quieres expulsar a ${usernameToKick} de la sala?`
    );

    if (result.isConfirmed) {
      if (socket && socket.connected) {
        socket.emit('kickUser', {
          roomCode: roomCode || currentRoomCode,
          username: usernameToKick,
          kickedBy: username
        });
        await showSuccessAlert('Éxito', `Usuario ${usernameToKick} expulsado de la sala`);
      }
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setEditForm({ maxCapacity: room.maxCapacity });
    setShowEditRoomModal(true);
  };

  const handleUpdateRoom = async () => {
    try {
      await apiService.updateRoom(editingRoom.id, {
        maxCapacity: editForm.maxCapacity
      });

      await showSuccessAlert('Éxito', 'Capacidad de sala actualizada correctamente');

      // Actualizar la lista de salas
      const rooms = await apiService.getAdminRooms();
      setAdminRooms(rooms);

      // Actualizar también la lista de salas activas en el sidebar
      await loadMyActiveRooms();

      // Cerrar modal
      setShowEditRoomModal(false);
      setEditingRoom(null);
    } catch (error) {
      console.error('Error al actualizar sala:', error);
      await showErrorAlert('Error', 'Error al actualizar la sala: ' + error.message);
    }
  };

  const handleDeactivateRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      '¿Desactivar sala?',
      `¿Estás seguro de que quieres desactivar la sala "${roomName}"?`
    );

    // ✅ Verificar correctamente si el usuario confirmó
    if (result.isConfirmed) {
      try {
        await apiService.deactivateRoom(roomId);
        await showSuccessAlert('Éxito', 'Sala desactivada correctamente');

        // Actualizar la lista de salas en el modal de administración
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);

        // ✅ Actualizar también la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error('Error al desactivar sala:', error);
        await showErrorAlert('Error', 'Error al desactivar la sala: ' + error.message);
      }
    }
  };

  const handleActivateRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      '¿Activar sala?',
      `¿Estás seguro de que quieres activar la sala "${roomName}"?`
    );

    if (result.isConfirmed) {
      try {
        await apiService.activateRoom(roomId);
        await showSuccessAlert('Éxito', 'Sala activada correctamente');

        // Actualizar la lista de salas en el modal de administración
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);

        // ✅ Actualizar también la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error('Error al activar sala:', error);
        await showErrorAlert('Error', 'Error al activar la sala: ' + error.message);
      }
    }
  };

  const handleAddUsersToRoom = () => {
    if (currentRoomCode) {
      setShowAddUsersToRoomModal(true);
    }
  };

  const handleUsersAdded = async (usernames) => {
    // Emitir evento de socket para que los usuarios agregados se unan a la sala
    if (socket && socket.connected && currentRoomCode) {
      usernames.forEach(username => {
        socket.emit('joinRoom', {
          roomCode: currentRoomCode,
          roomName: to,
          from: username
        });
      });

      // Esperar un momento para que el backend procese los eventos
      await new Promise(resolve => setTimeout(resolve, 500));

      // Recargar la lista de usuarios de la sala desde la API
      if (currentRoomCode) {
        const roomUsers = await apiService.getRoomUsers(currentRoomCode);
        // console.log('🔄 Usuarios recargados después de agregar:', roomUsers);
        // Si la sala está inactiva, roomUsers será un array vacío
        if (Array.isArray(roomUsers)) {
          setRoomUsers(roomUsers);
        }
      }
    }
  };

  const handleRemoveUsersFromRoom = () => {
    if (currentRoomCode) {
      setShowRemoveUsersFromRoomModal(true);
    }
  };

  const handleUsersRemoved = async (usernames) => {
    // Esperar un momento para que el backend procese los eventos
    await new Promise(resolve => setTimeout(resolve, 500));

    // Recargar la lista de usuarios de la sala desde la API
    if (currentRoomCode) {
      const roomUsers = await apiService.getRoomUsers(currentRoomCode);
      // console.log('🔄 Usuarios recargados después de eliminar:', roomUsers);
      // Si la sala está inactiva, roomUsers será un array vacío
      if (Array.isArray(roomUsers)) {
        setRoomUsers(roomUsers);
      }
    }
  };



  const handleCreateConversation = async (data) => {
    try {
      const result = await apiService.createAdminAssignedConversation(
        data.user1,
        data.user2,
        data.name
      );

      setShowCreateConversationModal(false);

      await showSuccessAlert(
        'Conversación creada',
        `Conversación creada exitosamente entre ${data.user1} y ${data.user2}`
      );

      // 🔥 Recargar las conversaciones asignadas para reflejar la nueva conversación
      await loadAssignedConversations();

      // Opcional: Notificar a los usuarios via Socket.io
      if (socket && socket.connected) {
        socket.emit('conversationAssigned', {
          user1: data.user1,
          user2: data.user2,
          conversationName: data.name,
          linkId: result.linkId
        });
      }
    } catch (error) {
      console.error('Error al crear conversación:', error);
      await showErrorAlert('Error', 'Error al crear la conversación: ' + error.message);
    }
  };

  // 🔥 BLOQUEADO: Funciones de llamadas deshabilitadas

  const handleViewRoomUsers = async (roomCode, roomName) => {
    try {
      const roomUsersData = await apiService.getRoomUsers(roomCode);

      // Si la sala está inactiva o no existe, mostrar mensaje informativo
      if (!roomUsersData || roomUsersData.length === 0) {
        await showErrorAlert('Sala inactiva', 'Esta sala ya no está activa o no existe.');
        return;
      }

      // Crear un modal personalizado en lugar de alert
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: #2a3942;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        color: white;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      `;

      const usersList = roomUsersData.users && roomUsersData.users.length > 0
        ? roomUsersData.users.map(user =>
            typeof user === 'string'
              ? `• ${user}`
              : `• ${user.displayName || user.username} ${user.isOnline ? '🟢' : '🔴'}`
          ).join('\n')
        : 'No hay usuarios conectados';

      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #00a884;">👥 Usuarios en "${roomName}"</h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; color: #8696a0; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <div style="margin-bottom: 16px;">
          <strong>Código:</strong> ${roomCode}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Usuarios conectados:</strong>
          <div style="margin-top: 8px; padding: 12px; background: #1e2a30; border-radius: 8px; white-space: pre-line; font-family: monospace;">
            ${usersList}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #374045;">
          <span style="color: #8696a0;">Total: ${roomUsersData.totalUsers || 0}/${roomUsersData.maxCapacity || 0}</span>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: #00a884; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>
        </div>
      `;

      modal.className = 'modal-overlay';
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Cerrar al hacer clic fuera del modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

    } catch (error) {
      console.error('Error al obtener usuarios de la sala:', error);
      // No mostrar error, ya que es esperado cuando la sala está inactiva
    }
  };

  const handleEnableSounds = async () => {
    try {
      // Intentar reproducir un sonido para habilitar la reproducción automática
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        await messageSound.current.play();
        setSoundsEnabled(true);
      }
    } catch {
      // Silenciar errores de sonido
    }
  };

  const handleLoginSuccess = (userData) => {
    // Guardar datos del usuario en localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token || 'mock-token');

    // Forzar actualización del estado de autenticación
    refreshAuth();
  };

  // Función mejorada de logout que primero sale de la sala si está en una
  const handleLogout = async () => {
    try {
      // Si el usuario está en una sala, salir primero
      if (currentRoomCode && socket && socket.connected) {
        socket.emit('leaveRoom', {
          roomCode: currentRoomCode,
          from: username
        });
      }

      // 🔥 Limpiar TODOS los estados del chat
      setTo('');
      setIsGroup(false);
      setRoomUsers([]);
      setCurrentRoomCode(null);
      currentRoomCodeRef.current = null;
      setMyActiveRooms([]);
      setAssignedConversations([]);
      setAdminViewConversation(null);
      clearMessages();
      clearInput();

      // Desconectar socket
      if (socket) {
        socket.disconnect();
      }

      // Ejecutar logout normal
      logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así ejecutar logout
      logout();
    }
  };

  // Verificar si el usuario puede enviar mensajes en la conversación actual
  const canSendMessages = React.useMemo(() => {
    if (!to) return false;

    const currentUserFullName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : user?.username;

    // Buscar si esta conversación es asignada
    const assignedConv = assignedConversations?.find(conv => {
      const otherUser = conv.participants?.find(p => p !== currentUserFullName);
      return otherUser === to || conv.name === to;
    });

    // Si es una conversación asignada y el usuario NO está en ella, no puede enviar
    if (assignedConv && !assignedConv.participants?.includes(currentUserFullName)) {
      return false;
    }

    return true;
  }, [to, user, assignedConversations]);

  // Mostrar loading mientras verifica autenticación
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

  return (
    <>
      {/* Elemento de audio para notificaciones */}
      <audio
        ref={messageSound}
        preload="auto"
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      />

      <ChatLayout
      // Props del sidebar
      user={user}
      userList={userList}
      groupList={groupList}
      assignedConversations={assignedConversations}
      isAdmin={isAdmin}
      showAdminMenu={showAdminMenu}
      setShowAdminMenu={setShowAdminMenu}
      showSidebar={showSidebar}
      onUserSelect={handleUserSelect}
      onGroupSelect={handleGroupSelect}
      onPersonalNotes={handlePersonalNotes}
      onLogout={handleLogout}
      onShowCreateRoom={() => setShowCreateRoomModal(true)}
      onShowJoinRoom={() => setShowJoinRoomModal(true)}
      onShowAdminRooms={handleShowAdminRooms}
      onShowCreateConversation={() => setShowCreateConversationModal(true)}
      onShowManageConversations={() => setShowManageConversationsModal(true)}
      onShowManageUsers={() => {}}
      onShowSystemConfig={() => {}}
      loadingAdminRooms={loadingAdminRooms}
      unreadMessages={unreadMessages}
      myActiveRooms={myActiveRooms}
      onRoomSelect={handleRoomSelect}
      onKickUser={handleKickUser}
      userListHasMore={userListHasMore}
      userListLoading={userListLoading}
      onLoadMoreUsers={loadMoreUsers}
      roomTypingUsers={roomTypingUsers}

      // Props del chat
          to={to}
          isGroup={isGroup}
          currentRoomCode={currentRoomCode}
          roomUsers={roomUsers}
      messages={messages}
      adminViewConversation={adminViewConversation}
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
      onLeaveRoom={handleLeaveRoom}
      hasMoreMessages={hasMoreMessages}
      isLoadingMore={isLoadingMore}
      onLoadMoreMessages={loadMoreMessages}
      onToggleMenu={handleToggleMenu}
      socket={socket}
      socketConnected={socketConnected}
      soundsEnabled={soundsEnabled}
      onEnableSounds={handleEnableSounds}
      currentUsername={username}
      onEditMessage={handleEditMessage}
      isTyping={isTyping}
      highlightMessageId={highlightMessageId}
      onMessageHighlighted={() => setHighlightMessageId(null)}
      replyingTo={replyingTo}
      onCancelReply={handleCancelReply}
      onAddUsersToRoom={handleAddUsersToRoom}
      onRemoveUsersFromRoom={handleRemoveUsersFromRoom}
      onOpenThread={handleOpenThread}
      onSendVoiceMessage={handleSendVoiceMessage}

      // Props de modales
      showCreateRoomModal={showCreateRoomModal}
      setShowCreateRoomModal={setShowCreateRoomModal}
      roomForm={roomForm}
      setRoomForm={setRoomForm}
      onCreateRoom={handleCreateRoom}
      showJoinRoomModal={showJoinRoomModal}
      setShowJoinRoomModal={setShowJoinRoomModal}
      joinRoomForm={joinRoomForm}
      setJoinRoomForm={setJoinRoomForm}
      onJoinRoom={handleJoinRoom}
      showAdminRoomsModal={showAdminRoomsModal}
      setShowAdminRoomsModal={setShowAdminRoomsModal}
      adminRooms={adminRooms}
      onDeleteRoom={handleDeleteRoom}
      onDeactivateRoom={handleDeactivateRoom}
      onActivateRoom={handleActivateRoom}
      onEditRoom={handleEditRoom}
      onViewRoomUsers={handleViewRoomUsers}
    />

    <EditRoomModal
      isOpen={showEditRoomModal}
      onClose={() => {
        setShowEditRoomModal(false);
        setEditingRoom(null);
      }}
      room={editingRoom}
      editForm={editForm}
      setEditForm={setEditForm}
      onUpdateRoom={handleUpdateRoom}
    />

    <RoomCreatedModal
      isOpen={showRoomCreatedModal}
      onClose={() => {
        setShowRoomCreatedModal(false);
        setCreatedRoomData(null);
      }}
      roomData={createdRoomData}
    />

    <CreateConversationModal
      isOpen={showCreateConversationModal}
      onClose={() => setShowCreateConversationModal(false)}
      onCreateConversation={handleCreateConversation}
      currentUser={user}
    />

    <ManageAssignedConversationsModal
      show={showManageConversationsModal}
      onClose={() => setShowManageConversationsModal(false)}
      onConversationUpdated={() => {
        // Recargar las conversaciones asignadas
        loadAssignedConversations();
      }}
      currentUser={user}
      socket={socket}
    />

    <AddUsersToRoomModal
      isOpen={showAddUsersToRoomModal}
      onClose={() => setShowAddUsersToRoomModal(false)}
      roomCode={currentRoomCode}
      roomName={to}
      currentMembers={roomUsers}
      onUserAdded={handleUsersAdded}
    />

    <RemoveUsersFromRoomModal
      isOpen={showRemoveUsersFromRoomModal}
      onClose={() => setShowRemoveUsersFromRoomModal(false)}
      roomCode={currentRoomCode}
      roomName={to}
      currentMembers={roomUsers}
      currentUser={username}
      onUsersRemoved={handleUsersRemoved}
    />

    {/* 🔥 BLOQUEADO: CallWindow deshabilitado */}

    {/* Panel de hilos */}
    {threadMessage && (
      <ThreadPanel
        message={threadMessage}
        onClose={handleCloseThread}
        onSendMessage={handleSendThreadMessage}
        currentUsername={username}
        socket={socket}
      />
    )}
    </>
  );
};

export default ChatPage;
