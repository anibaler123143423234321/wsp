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
import CallWindow from '../components/CallWindow';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { useWebRTC } from '../hooks/useWebRTC';
import apiService from '../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../sweetalert2';

const ChatPage = () => {
  // Hooks personalizados
  const { isAuthenticated, user, username, isAdmin, isLoading, logout, refreshAuth } = useAuth();
  const socket = useSocket(isAuthenticated, username, user);
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

  // Hook de WebRTC
  const {
    localStream,
    remoteStream,
    callStatus,
    isIncoming,
    callerName,
    callType,
    isMuted,
    isVideoOff,
    callDuration,
    hasCamera,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    peerConnection,
    setCallStatus,
    setIsIncoming,
    setCallerName,
    setCallType
  } = useWebRTC(socket, username);

  // Estados del chat (declarar antes de los hooks que los usan)
  const [to, setTo] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [userList, setUserList] = useState([]);
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
  } = useMessagePagination(currentRoomCode, username, to, isGroup);

  // Estados adicionales del chat
  const [unreadMessages] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // El otro usuario está escribiendo
  const [typingTimeout, setTypingTimeout] = useState(null); // Timeout para detectar cuando deja de escribir
  const [adminViewConversation, setAdminViewConversation] = useState(null); // Conversación que el admin está viendo
  const [replyingTo, setReplyingTo] = useState(null); // Mensaje al que se está respondiendo

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

    // Cargar las salas activas solo para ADMIN y JEFEPISO
    if (user?.role === 'ADMIN' || user?.role === 'JEFEPISO') {
      loadMyActiveRooms();
    }
  }, [isAuthenticated, username, user]);

  // Efecto para detectar código de sala en URL y abrir modal de unirse
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Verificar si hay un código de sala en la URL hash
    const hash = window.location.hash;
    const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/);

    if (roomMatch && roomMatch[1]) {
      const roomCode = roomMatch[1];
      console.log(`🔗 Detectado código de sala en URL: ${roomCode}`);

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
    // Verificar que el usuario tenga permisos
    if (user?.role !== 'ADMIN' && user?.role !== 'JEFEPISO') {
      setMyActiveRooms([]);
      return;
    }

    try {
      const rooms = await apiService.getAdminRooms();
      // Filtrar solo las salas activas
      const activeRooms = rooms.filter(room => room.isActive);
      setMyActiveRooms(activeRooms);
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

      try {
        const [participant1, participant2] = adminViewConversation.participants;
        console.log(`👁️ Admin viendo conversación entre: ${participant1} y ${participant2}`);

        // Cargar mensajes entre los dos participantes
        const historicalMessages = await apiService.getUserMessages(
          participant1,
          participant2,
          20,
          0
        );

        // Convertir mensajes al formato del frontend
        const formattedMessages = historicalMessages.map((msg) => ({
          sender: msg.from,
          receiver: msg.to,
          text: msg.message || "",
          isGroup: false,
          time: msg.time || new Date(msg.sentAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isSent: false, // El admin no es el remitente
          isSelf: false, // El admin no es el remitente
          mediaType: msg.mediaType,
          mediaData: msg.mediaData,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          id: msg.id,
          sentAt: msg.sentAt,
          // Campos de respuesta
          replyToMessageId: msg.replyToMessageId,
          replyToSender: msg.replyToSender,
          replyToText: msg.replyToText,
        }));

        // Actualizar los mensajes manualmente (no usar el hook)
        clearMessages();
        formattedMessages.forEach(msg => addNewMessage(msg));
      } catch (error) {
        console.error("❌ Error al cargar mensajes de admin view:", error);
      }
    };

    if (adminViewConversation) {
      loadAdminViewMessages();
    }
  }, [adminViewConversation, clearMessages, addNewMessage]);

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
      if (currentRoomCode) return;

      // El backend ya envía la lista correcta según el rol del usuario
      // Para admin: lista completa de usuarios
      // Para no-admin: solo su propio nombre
      setUserList(data.users);
    });

        s.on('roomUsers', (data) => {
          console.log('📨 Recibido roomUsers:', data);
          console.log('🔍 currentRoomCodeRef.current:', currentRoomCodeRef.current);
          console.log('🔍 data.roomCode:', data.roomCode);

          // Actualizar lista de usuarios si estamos en la sala
          if (data.roomCode === currentRoomCodeRef.current) {
            console.log('✅ Actualizando roomUsers con:', data.users);
            setRoomUsers(data.users);
          } else {
            console.log('❌ No actualizando roomUsers porque no coincide el roomCode');
          }

          // SIEMPRE actualizar el contador en "Mis Salas Activas"
          // Contar solo usuarios conectados (isOnline === true)
          const connectedCount = data.users.filter(u => u.isOnline).length;
          console.log('📊 Contador de conectados:', connectedCount);
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
      console.log('👢 Has sido expulsado de la sala:', data);

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
        if (data.from === username) {
          return;
        }
        const newMessage = {
          id: data.id,
          sender: data.from,
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

        addNewMessage(newMessage);

        if (data.from !== username) {
          playMessageSound(soundsEnabled);
        }
      } else {
        // Ignorar mensajes individuales que vienen del servidor si son nuestros propios mensajes
        if (data.from === username) {
          return;
        }

        const newMessage = {
          id: data.id,
          sender: data.from,
          receiver: data.to || username,
          text: data.message || '',
          isGroup: false,
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

        addNewMessage(newMessage);

        if (data.from !== username) {
          playMessageSound(soundsEnabled);
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

    // ==================== LISTENERS WEBRTC (SIMPLE-PEER) ====================

    // Recibir llamada entrante
    s.on('callUser', (data) => {
      console.log('📞 ¡LLAMADA ENTRANTE RECIBIDA!');
      console.log('📞 Datos de la llamada:', data);
      console.log('📞 De:', data.from);
      console.log('📞 Tipo:', data.callType);

      setCallerName(data.from);
      setCallType(data.callType);
      setIsIncoming(true);
      setCallStatus('ringing');

      // Guardar la señal para cuando se acepte la llamada
      window.incomingCallSignal = data.signal;

      console.log('✅ Estado actualizado - debería mostrar CallWindow');
    });

    // Llamada aceptada (el caller recibe la respuesta)
    s.on('callAccepted', (data) => {
      console.log('✅ Llamada aceptada - señal recibida');
      setCallStatus('connecting');

      // Señalar al peer con la respuesta
      if (peerConnection.current) {
        peerConnection.current.signal(data.signal);
      }
    });

    // Llamada rechazada
    s.on('callRejected', async (data) => {
      console.log('❌ Llamada rechazada por:', data.from);
      await showErrorAlert('Llamada rechazada', `${data.from} rechazó la llamada`);
      endCall();
    });

    // Llamada finalizada
    s.on('callEnded', () => {
      console.log('📴 Llamada finalizada por el otro usuario');
      endCall();
    });

    // Llamada fallida
    s.on('callFailed', async (data) => {
      console.log('❌ Llamada fallida:', data.reason);
      await showErrorAlert('Llamada fallida', `No se pudo realizar la llamada: ${data.reason}`);
      endCall();
    });

    // Nueva conversación asignada
    s.on('newConversationAssigned', async (data) => {
      console.log('💬 Nueva conversación asignada:', data);

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

    // 🔥 Evento: Sala eliminada/desactivada (notificación global)
    s.on('roomDeleted', (data) => {
      console.log('🗑️ Sala eliminada/desactivada:', data);
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

        return () => {
          s.off('userList');
          s.off('roomUsers');
          s.off('roomJoined');
          s.off('userJoinedRoom');
          s.off('message');
          s.off('connect');
          s.off('callUser');
          s.off('callAccepted');
          s.off('callRejected');
          s.off('callEnded');
          s.off('callFailed');
          s.off('newConversationAssigned');
          s.off('userTyping');
          s.off('roomDeleted');
        };
      }, [socket, currentRoomCode, to, isGroup, username, isAdmin, soundsEnabled, typingTimeout]);

  // Estado para el mensaje a resaltar
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  // Handlers
  const handleUserSelect = (userName, messageId = null, conversationData = null) => {
    // Si es una conversación de admin (conversationData presente), guardarla
    if (conversationData) {
      setAdminViewConversation(conversationData);
      // Para conversaciones de admin, usar el nombre de la conversación como "to"
      setTo(conversationData.name || userName);
    } else {
      setAdminViewConversation(null);
      setTo(userName);
    }

    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    clearMessages();

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
      await showErrorAlert('Error', 'Error al crear la sala: ' + error.message);
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

    setTo(username);
    setIsGroup(false);
    setRoomUsers([]);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    clearMessages();
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

    // Verificar si el usuario actual está en la conversación asignada
    const currentUserFullName = user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : user?.username;

    // Buscar si esta conversación es asignada
    const assignedConv = assignedConversations?.find(conv => {
      const otherUser = conv.participants?.find(p => p !== currentUserFullName);
      return otherUser === to || conv.name === to;
    });

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
      const messageObj = {
        id: messageId,
        to,
        isGroup,
        time: timeString,
        from: username,
        fromId: user.id
      };

      // Si es una conversación asignada, agregar información adicional
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        // El destinatario real es el otro participante
        const otherParticipant = assignedConv.participants?.find(p => p !== currentUserFullName);
        if (otherParticipant) {
          messageObj.actualRecipient = otherParticipant;
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
          console.log('📤 Subiendo archivo al servidor:', file.name);

          // Subir archivo y obtener URL
          const uploadResult = await apiService.uploadFile(file, 'chat');

          messageObj.mediaType = file.type.split('/')[0];
          messageObj.mediaData = uploadResult.fileUrl; // ✅ Ahora es URL, no base64
          messageObj.fileName = uploadResult.fileName;
          messageObj.fileSize = uploadResult.fileSize;

          console.log('✅ Archivo subido exitosamente:', uploadResult.fileUrl);
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
          console.log('✅ Mensaje personal guardado en BD');
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

      addNewMessage(newMessage);
      playMessageSound(soundsEnabled);
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
      sender: message.sender,
      text: message.text || (message.fileName ? `📎 ${message.fileName}` : 'Archivo multimedia')
    });
  };

  // Función para cancelar la respuesta
  const handleCancelReply = () => {
    setReplyingTo(null);
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

  const handleUsersAdded = (usernames) => {
    console.log('Usuarios agregados:', usernames);
    // Aquí puedes agregar lógica adicional si es necesario
    // Por ejemplo, emitir un evento de socket para notificar a los usuarios
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

  // Funciones de llamadas
  const handleStartCall = async (targetUser) => {
    if (!targetUser || isGroup) {
      await showErrorAlert('Error', 'Solo puedes hacer llamadas a usuarios individuales');
      return;
    }
    startCall(targetUser, 'audio');
  };

  const handleStartVideoCall = async (targetUser) => {
    if (!targetUser || isGroup) {
      await showErrorAlert('Error', 'Solo puedes hacer videollamadas a usuarios individuales');
      return;
    }
    startCall(targetUser, 'video');
  };

  // Wrapper para aceptar llamada con la señal guardada
  const handleAcceptCall = () => {
    if (window.incomingCallSignal) {
      acceptCall(window.incomingCallSignal);
      window.incomingCallSignal = null;
    } else {
      console.error('❌ No hay señal de llamada guardada');
    }
  };

  const handleViewRoomUsers = async (roomCode, roomName) => {
    try {
      const roomUsersData = await apiService.getRoomUsers(roomCode);
      
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
      
      const usersList = roomUsersData.users.length > 0 
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
          <span style="color: #8696a0;">Total: ${roomUsersData.totalUsers}/${roomUsersData.maxCapacity}</span>
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
      await showErrorAlert('Error', 'Error al obtener usuarios de la sala: ' + error.message);
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
      onStartCall={handleStartCall}
      onStartVideoCall={handleStartVideoCall}
      hasCamera={hasCamera}
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
      userList={userList}
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
    />

    <AddUsersToRoomModal
      isOpen={showAddUsersToRoomModal}
      onClose={() => setShowAddUsersToRoomModal(false)}
      roomCode={currentRoomCode}
      roomName={to}
      currentMembers={roomUsers}
      onUserAdded={handleUsersAdded}
    />

    <CallWindow
      isOpen={callStatus !== 'idle'}
      callType={callType}
      isIncoming={isIncoming}
      callerName={callerName}
      localStream={localStream}
      remoteStream={remoteStream}
      onAccept={handleAcceptCall}
      onReject={rejectCall}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      callStatus={callStatus}
      callDuration={callDuration}
    />
    </>
  );
};

export default ChatPage;
