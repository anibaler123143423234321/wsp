import React, { useState, useEffect, useRef } from 'react';
import { showSuccessAlert } from './sweetalert2';
import Swal from 'sweetalert2';
import { AudioRecorder } from './audioRecorder';
import Login from './components/Login';
import apiService from './apiService';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [to, setTo] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]); // Usuarios específicos de la sala actual
  const [currentRoomCode, setCurrentRoomCode] = useState(null); // Código de la sala actual
  const currentRoomCodeRef = useRef(null); // Referencia para el estado actual
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const fileInputRef = useRef(null);
  
  // Estados para funcionalidades de administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [showAdminRoomsModal, setShowAdminRoomsModal] = useState(false);
  const [adminRooms, setAdminRooms] = useState([]);
  const [loadingAdminRooms, setLoadingAdminRooms] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  
  // Audio para notificaciones de mensajes
  const messageSound = useRef(null);
  const [showSystemConfigModal, setShowSystemConfigModal] = useState(false);
  
  // Estados para formularios
  const [conversationForm, setConversationForm] = useState({ name: '', durationHours: 1, maxParticipants: 0 });
  const [roomForm, setRoomForm] = useState({ name: '', maxCapacity: 50 });
  const [joinRoomForm, setJoinRoomForm] = useState({ roomCode: '' });
  const [roomInfo, setRoomInfo] = useState(null);
  const [systemConfig, setSystemConfig] = useState({ messageExpirationDays: 30, maxFileSizeMB: 50, notifications: { sound: true, visual: true, email: false } });

  // Función para reproducir sonido de mensaje
  const playMessageSound = () => {
    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0; // Reiniciar el audio
        messageSound.current.play().catch(error => {
          console.log('No se pudo reproducir el sonido:', error);
        });
      }
    } catch (error) {
      console.log('Error al reproducir sonido:', error);
    }
  };

  const audioRecorderRef = useRef(null);
  const socket = useRef(null);
  const notificationSound = useRef(null);
  const isConnecting = useRef(false);

  // Estados para el modal de enlace temporal
  const [showTemporaryLinkModal, setShowTemporaryLinkModal] = useState(false);
  const [currentTemporaryLink, setCurrentTemporaryLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Función para limpiar mensajes de registro del chat
  const clearRegistrationMessages = () => {
    setMessages(prev => prev.filter(msg => 
      !(msg.type === 'info' && msg.text && msg.text.includes('Registrado como'))
    ));
  };

  // Función para obtener la imagen de perfil de un usuario
  const getUserProfileImage = (username) => {
    if (username === (user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username || user?.email)) {
      return user?.picture || null;
    }
    return null;
  };

  // Función para obtener las iniciales de un usuario
  const getUserInitials = (username) => {
    return username.charAt(0).toUpperCase();
  };

  // Función para manejar el login exitoso
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    const displayName = userData.nombre && userData.apellido ? 
      `${userData.nombre} ${userData.apellido}` : 
      userData.username || userData.email;
    setUsername(displayName);
    console.log('Username establecido como:', displayName);
    setIsAuthenticated(true);
    
    const isUserAdmin = userData.role && userData.role.toString().toUpperCase().trim() === 'ADMIN';
    console.log('Rol del usuario en login:', userData.role, 'Es admin:', isUserAdmin);
    setIsAdmin(isUserAdmin);
    
    clearRegistrationMessages();
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setUsername('');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setShowAdminMenu(false);
    setMessages([]);
    setUserList([]);
    setGroupList([]);
    setTo('');
    setInput('');
    if (socket.current) {
      socket.current.disconnect();
    }
  };



  // Función para reproducir el sonido de notificación
  const playNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.play().catch(error => {
        console.log('Error al reproducir sonido de notificación:', error);
      });
    }
  };


  // Función para copiar enlace en el modal
  const copyLinkInModal = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  // Funciones para administrador
  const handleCreateConversation = async () => {
    try {
      await apiService.createTemporaryConversation(conversationForm);
      showSuccessAlert('Éxito', 'Conversación temporal creada correctamente');
      setShowCreateConversationModal(false);
      setConversationForm({ name: '', durationHours: 1, maxParticipants: 0 });
    } catch (error) {
      console.error('Error al crear conversación:', error);
      alert('Error al crear la conversación temporal');
    }
  };

  const handleCreateRoom = async () => {
    try {
      console.log('Enviando datos de sala:', roomForm);
      const response = await apiService.createTemporaryRoom(roomForm);
      console.log('Respuesta completa del backend:', response);
      console.log('Tipo de respuesta:', typeof response);
      console.log('Propiedades de la respuesta:', Object.keys(response || {}));
      
      // Verificar si la respuesta tiene la estructura esperada
      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }
      
      // Mostrar modal con la URL de la sala
      setCurrentTemporaryLink({
        linkUrl: response.roomUrl || 'URL no disponible',
        roomName: response.name || roomForm.name || 'Sala temporal',
        roomCode: response.roomCode || 'Código no disponible',
        expiresAt: response.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxCapacity: response.maxCapacity || roomForm.maxCapacity || 50,
        participants: []
      });
      setShowTemporaryLinkModal(true);
      
      setShowCreateRoomModal(false);
      setRoomForm({ name: '', maxCapacity: 50 });
    } catch (error) {
      console.error('Error al crear sala:', error);
      console.error('Detalles del error:', error.message);
      alert('Error al crear la sala temporal: ' + error.message);
    }
  };

  const handleJoinRoom = async () => {
    try {
      const response = await apiService.joinRoom(joinRoomForm);
      console.log('Respuesta de unirse a sala:', response);
      
      showSuccessAlert('Éxito', 'Te has unido a la sala correctamente');
      setShowJoinRoomModal(false);
      setJoinRoomForm({ roomCode: '' });
      
      // Configurar el chat para mostrar la sala
      if (response && response.name) {
        console.log('🏠 Configurando chat para sala:', response.name);
        console.log('🏠 Código de sala:', response.roomCode);
        
        // Actualizar referencia ANTES de cualquier otra cosa
        currentRoomCodeRef.current = response.roomCode;
        
        setTo(response.name);
        setIsGroup(true);
        setRoomUsers([]); // Limpiar usuarios de sala anterior
        setCurrentRoomCode(response.roomCode); // Guardar código de sala
        
        // Guardar estado de la sala en localStorage
        const roomData = {
          roomCode: response.roomCode,
          roomName: response.name,
          joinedAt: new Date().toISOString()
        };
        console.log('💾 Guardando sala en localStorage:', roomData);
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        
        // Verificar que se guardó correctamente
        const saved = localStorage.getItem('currentRoom');
        console.log('✅ Verificando guardado:', saved);
        
        // Conectar al WebSocket de la sala específica
        if (socket.current && socket.current.connected) {
          console.log('Conectando al WebSocket de la sala:', response.roomCode);
          console.log('📤 EMITIENDO joinRoom:', {
            roomCode: response.roomCode,
            roomName: response.name,
            from: username
          });
          socket.current.emit('joinRoom', {
            roomCode: response.roomCode,
            roomName: response.name,
            from: username
          });
        }
      } else {
        console.log('❌ No se pudo configurar la sala - respuesta inválida:', response);
      }
    } catch (error) {
      console.error('Error al unirse a sala:', error);
      alert('Error al unirse a la sala');
    }
  };

  const handleShowAdminRooms = async () => {
    setLoadingAdminRooms(true);
    try {
      const rooms = await apiService.getAdminRooms();
      setAdminRooms(rooms);
      setShowAdminRoomsModal(true);
    } catch (error) {
      console.error('Error al obtener salas del admin:', error);
      alert('Error al obtener las salas');
    } finally {
      setLoadingAdminRooms(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la sala "${roomName}"?`)) {
      try {
        await apiService.deleteRoom(roomId);
        showSuccessAlert('Éxito', 'Sala eliminada correctamente');
        // Recargar la lista de salas
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);
      } catch (error) {
        console.error('Error al eliminar sala:', error);
        // Si es 404, significa que ya fue eliminada, solo actualizar la lista
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          showSuccessAlert('Info', 'La sala ya fue eliminada');
          // Recargar la lista para actualizar la UI
          try {
            const rooms = await apiService.getAdminRooms();
            setAdminRooms(rooms);
          } catch (reloadError) {
            console.error('Error al recargar lista:', reloadError);
          }
        } else {
          alert('Error al eliminar la sala: ' + error.message);
        }
      }
    }
  };

  const handleDeactivateRoom = async (roomId, roomName) => {
    if (confirm(`¿Estás seguro de que quieres desactivar la sala "${roomName}"?`)) {
      try {
        await apiService.deactivateRoom(roomId);
        showSuccessAlert('Éxito', 'Sala desactivada correctamente');
        // Recargar la lista de salas
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);
      } catch (error) {
        console.error('Error al desactivar sala:', error);
        alert('Error al desactivar la sala');
      }
    }
  };

  const handleSaveSystemConfig = async () => {
    try {
      await apiService.updateSystemConfig('message_expiration_days', { value: systemConfig.messageExpirationDays.toString() });
      await apiService.updateSystemConfig('max_file_size_mb', { value: systemConfig.maxFileSizeMB.toString() });
      await apiService.updateSystemConfig('notification_sound', { value: systemConfig.notifications.sound.toString() });
      await apiService.updateSystemConfig('notification_visual', { value: systemConfig.notifications.visual.toString() });
      await apiService.updateSystemConfig('notification_email', { value: systemConfig.notifications.email.toString() });
      
      showSuccessAlert('Éxito', 'Configuración del sistema guardada correctamente');
      setShowSystemConfigModal(false);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    }
  };

  // Efecto para verificar autenticación al cargar la aplicación
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;
    
    const checkAuth = () => {
      if (apiService.isAuthenticated()) {
        // Usar directamente los datos del localStorage
        const currentUser = apiService.getCurrentUser();
        setUser(currentUser);
        const displayName = currentUser.nombre && currentUser.apellido ?
          `${currentUser.nombre} ${currentUser.apellido}` :
          currentUser.username || currentUser.email;
        setUsername(displayName);
        setIsAuthenticated(true);

        const isUserAdmin = currentUser.role && currentUser.role.toString().toUpperCase().trim() === 'ADMIN';
        setIsAdmin(isUserAdmin);

        clearRegistrationMessages();
      }
    };

    if (!isAuthenticated && !user) {
      checkAuth();
    }
  }, []); // Solo ejecutar una vez al cargar

  // Efecto para restaurar sala al cargar la página
  const hasRestoredRoom = useRef(false);
  
  useEffect(() => {
    const restoreRoom = async () => {
      if (hasRestoredRoom.current) {
        return;
      }
      hasRestoredRoom.current = true;
      
      if (isAuthenticated && username) {
        const savedRoom = localStorage.getItem('currentRoom');
        
        if (savedRoom) {
          try {
            const roomData = JSON.parse(savedRoom);
            
            // Verificar si la sala aún existe
            const roomInfo = await apiService.getRoomByCode(roomData.roomCode);
            
            // Actualizar referencia ANTES de cualquier otra cosa
            currentRoomCodeRef.current = roomData.roomCode;
            
            // Restaurar estado de la sala
            setTo(roomData.roomName);
            setIsGroup(true);
            setCurrentRoomCode(roomData.roomCode);
            setRoomUsers([]);
            
            // Guardar datos de la sala para reconectar después
            const roomDataToRestore = {
              roomCode: roomData.roomCode,
              roomName: roomData.roomName,
              from: username
            };
            
            // Función para reconectar a la sala
            const reconnectToRoom = () => {
              if (socket.current && socket.current.connected) {
                socket.current.emit('joinRoom', roomDataToRestore);
              } else {
                setTimeout(reconnectToRoom, 500);
              }
            };
            
            // Intentar reconectar inmediatamente o después de un delay
            if (socket.current && socket.current.connected) {
              reconnectToRoom();
            } else {
              setTimeout(reconnectToRoom, 1000);
            }
          } catch (error) {
            localStorage.removeItem('currentRoom');
          }
        }
      }
    };

    if (isAuthenticated && username) {
      if (socket.current && socket.current.connected) {
        restoreRoom();
      } else {
        // Esperar a que se conecte el socket
        const checkSocket = setInterval(() => {
          if (socket.current && socket.current.connected && !hasRestoredRoom.current) {
            clearInterval(checkSocket);
            restoreRoom();
          }
        }, 1000);
        
        // Limpiar el interval después de 10 segundos
        setTimeout(() => {
          clearInterval(checkSocket);
          if (!hasRestoredRoom.current) {
            restoreRoom();
          }
        }, 10000);
      }
    }
  }, [isAuthenticated, username]);

  // Efecto para mantener la referencia actualizada
  useEffect(() => {
    currentRoomCodeRef.current = currentRoomCode;
  }, [currentRoomCode]);

  // Efecto para inicializar el sonido de notificación
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    notificationSound.current = audio;

    return () => {
      notificationSound.current = null;
    };
  }, []);

  // Efecto para inicializar el grabador de audio
  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder();

    return () => {
      if (audioRecorderRef.current && audioRecorderRef.current.isCurrentlyRecording()) {
        audioRecorderRef.current.cancelRecording();
      }
    };
  }, []);

  // Efecto para manejar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (to) {
          setTo('');
          setIsGroup(false);
        }
        if (showAdminMenu) {
          setShowAdminMenu(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [to, showAdminMenu]);

  // Efecto para cerrar el menú de administrador al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminMenu && !event.target.closest('.admin-menu') && !event.target.closest('button[title="Menú de administrador"]')) {
        setShowAdminMenu(false);
      }
    };

    if (showAdminMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminMenu]);


  // Efecto para detectar enlaces de unión en la URL
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/join/')) {
        const linkId = hash.replace('#/join/', '');
        console.log('Detectado enlace de unión:', linkId);
        
        if (socket.current && socket.current.connected) {
          socket.current.emit('joinTemporaryLink', {
            linkId: linkId,
            from: username
          });
        }
      } else if (hash.startsWith('#/room/')) {
        const roomCode = hash.replace('#/room/', '');
        console.log('Detectado enlace de sala temporal:', roomCode);
        
        try {
          // Obtener información de la sala
          const roomData = await apiService.getRoomByCode(roomCode);
          console.log('Información de la sala:', roomData);
          
          // Guardar información de la sala y mostrar modal
          setRoomInfo(roomData);
          setJoinRoomForm({ roomCode: roomCode });
          setShowJoinRoomModal(true);
          
          // Auto-unirse a la sala si el usuario confirma
          // Esto se manejará en el modal de unirse a sala
        } catch (error) {
          console.error('Error al obtener información de la sala:', error);
          alert('No se pudo encontrar la sala o ha expirado');
        }
      }
    };

    // Verificar hash al cargar
    handleHashChange();

    // Escuchar cambios en el hash
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [username]);

  // Efecto principal para la conexión Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !user || !username) return;
    if (isConnecting.current || (socket.current && socket.current.connected)) return;

    isConnecting.current = true;
    const s = io('http://localhost:8080', { transports: ['websocket'] });
    socket.current = s;

    s.on('connect', () => {
      isConnecting.current = false;
      const displayName = user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : user.username || user.email;
      s.emit('register', {
        username: displayName,
        userData: {
          username: displayName,
          role: user.role || 'USER',
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          sede: user.sede
        }
      });
      
      // Si estamos en una sala, reconectar automáticamente
      if (currentRoomCode) {
        console.log('🔄 Reconectando automáticamente a la sala:', currentRoomCode);
        setTimeout(() => {
          if (socket.current && socket.current.connected) {
            socket.current.emit('joinRoom', {
              roomCode: currentRoomCode,
              roomName: to,
              from: displayName
            });
            console.log('✅ Reconexión automática a sala completada');
          }
        }, 500);
      }
    });

    s.on('message', (data) => {
      try {
        console.log('Mensaje recibido:', data);
        const timeString = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data.isGroup) {
          // Solo ignorar mensajes propios si estamos en la misma sala/chat
          console.log('🔍 Verificando mensaje de grupo:', {
            from: data.from,
            username: username,
            isGroup: isGroup,
            to: to,
            dataGroup: data.group,
            shouldIgnore: data.from === username && isGroup && to === data.group
          });
          
          if (data.from === username && isGroup && to === data.group) {
            console.log('🚫 Ignorando mensaje propio duplicado en sala temporal');
            return;
          }

          const newMessage = {
            sender: data.from,
            receiver: data.group,
            text: data.message || '',
            isGroup: true,
            time: timeString,
            isSent: false
          };

          if (data.mediaType) {
            newMessage.mediaType = data.mediaType;
            newMessage.mediaData = data.mediaData;
            newMessage.fileName = data.fileName;
          }
          setMessages((prev) => [...prev, newMessage]);

          // Reproducir sonido al recibir mensaje de grupo
          if (data.from !== username) {
            playMessageSound();
          }

          const isUserMember = groupList.some(group =>
            group.name === data.group && group.members.includes(username)
          );

          if (isUserMember && !(isGroup && to === data.group)) {
            setUnreadMessages(prev => {
              const chatId = `group-${data.group}`;
              return {
                ...prev,
                [chatId]: (prev[chatId] || 0) + 1
              };
            });
          }
        } else {
          const newMessage = {
            sender: data.from,
            receiver: data.to || username,
            text: data.message || '',
            isGroup: false,
            time: timeString,
            isSent: false
          };

          if (data.mediaType) {
            newMessage.mediaType = data.mediaType;
            newMessage.mediaData = data.mediaData;
            newMessage.fileName = data.fileName;
          }

          setMessages((prev) => [...prev, newMessage]);

          // Reproducir sonido al recibir mensaje individual
          if (data.from !== username) {
            playMessageSound();
          }

          if (to !== data.from) {
            setUnreadMessages(prev => {
              const chatId = `user-${data.from}`;
              return {
                ...prev,
                [chatId]: (prev[chatId] || 0) + 1
              };
            });
          }
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    });

    s.on('info', (data) => {
      if (data.message && data.message.includes('Registrado como')) {
        clearRegistrationMessages();
        return;
      }
      
      const infoMessage = {
        type: 'info',
        text: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, infoMessage]);
    });

    s.on('error', (data) => {
      const errorMessage = {
        type: 'error',
        text: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    });

    s.on('userList', (data) => {
      // Solo actualizar lista general si NO estamos en una sala
      if (!currentRoomCode) {
        if (Array.isArray(data.users)) {
          setUserList(data.users);
        }
      }
    });

    s.on('groupList', (data) => {
      if (Array.isArray(data.groups)) {
        setGroupList(data.groups);
      }
    });

    s.on('temporaryLinkCreated', (data) => {
      setCurrentTemporaryLink(data);
      setShowTemporaryLinkModal(true);
    });

    s.on('joinedTemporaryConversation', (data) => {
      setTo(data.groupName);
      setIsGroup(true);
      showSuccessAlert('Conversación', `Te has unido a la conversación temporal. Expira: ${new Date(data.expiresAt).toLocaleString()}`);
    });

    s.on('joinedTemporaryRoom', (data) => {
      showSuccessAlert('Sala temporal', `Te has unido a la sala "${data.roomName}"`);
    });

    s.on('roomJoined', (data) => {
      setRoomUsers(data.users);
    });

    s.on('roomLeft', (data) => {
      // Usuario salió de la sala
    });

    s.on('roomUsers', (data) => {
      // Verificar si estamos en la sala correcta usando la referencia
      if (data.roomCode && currentRoomCodeRef.current === data.roomCode) {
        setRoomUsers(data.users);
      }
    });

    s.on('error', (error) => {
      console.error('Error en la conexión Socket.IO:', error);
    });

    s.on('disconnect', () => {
      console.log('Conexión Socket.IO cerrada');
      isConnecting.current = false;
    });

    return () => {
      console.log('Limpiando conexión Socket.IO...');
      if (s && s.connected) {
        s.disconnect();
      }
    };
  }, [isAuthenticated, user, username, groupList]);

  // Función para manejar la selección de archivos
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const selectedFiles = files.slice(0, 5);
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach(file => {
      let fileType = 'unknown';
      if (file.type) {
        fileType = file.type.split('/')[0];
      } else {
        const extension = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
          fileType = 'image';
        } else if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
          fileType = 'video';
        } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
          fileType = 'audio';
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
          fileType = 'document';
        }
      }

      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (isValidSize) {
        validFiles.push({ file, fileType });
      } else {
        invalidFiles.push(`${file.name} (tamaño excede ${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
      }
    });

    if (validFiles.length === 0) {
      alert(`No se seleccionaron archivos válidos. El tamaño máximo por archivo es ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }

    if (invalidFiles.length > 0) {
      alert(`Los siguientes archivos fueron ignorados:\n${invalidFiles.join('\n')}`);
    }

    const fileObjects = validFiles.map(item => item.file);
    setMediaFiles(fileObjects);

    const readFiles = validFiles.map(item => {
      const { file, fileType } = item;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            data: reader.result,
            type: fileType,
            name: file.name,
            size: file.size,
            extension: file.name.split('.').pop().toLowerCase()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readFiles).then(results => {
      setMediaPreviews(results);
    });
  };

  const cancelMediaUpload = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMediaFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!input && mediaFiles.length === 0) || !to) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (input || mediaFiles.length === 1) {
      const messageObj = {
        to,
        isGroup,
        time: timeString,
        from: username
      };

      if (input) {
        messageObj.message = input;
      }

      if (mediaFiles.length === 1) {
        try {
          const file = mediaFiles[0];
          const base64Data = await fileToBase64(file);
          messageObj.mediaType = file.type.split('/')[0];
          messageObj.mediaData = base64Data;
          messageObj.fileName = file.name;
        } catch (error) {
          console.error('Error al convertir archivo a base64:', error);
          alert('Error al procesar el archivo. Inténtalo de nuevo.');
          return;
        }
      }

      if (to === username) {
        const newMessage = {
          sender: 'Tú',
          receiver: username,
          text: input || (mediaFiles.length === 1 ? `📎 ${mediaFiles[0].name}` : ''),
          time: timeString,
          isSent: true,
          isSelf: true,
          mediaType: mediaFiles.length === 1 ? mediaFiles[0].type.split('/')[0] : null,
          mediaData: mediaFiles.length === 1 ? await fileToBase64(mediaFiles[0]) : null,
          fileName: mediaFiles.length === 1 ? mediaFiles[0].name : null
        };
        
        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setMediaFiles([]);
        return;
      }

      console.log('Enviando mensaje al servidor:', messageObj);
      socket.current.emit('message', messageObj);

      const newMessage = {
        sender: 'Tú',
        receiver: to,
        text: input || '',
        isGroup: isGroup,
        time: timeString,
        isSent: true
      };

      if (mediaFiles.length === 1) {
        const preview = mediaPreviews[0];
        newMessage.mediaType = preview.type;
        newMessage.mediaData = preview.data;
        newMessage.fileName = preview.name;
      }

      setMessages((prev) => [...prev, newMessage]);
      
      // Reproducir sonido al enviar mensaje
      playMessageSound();
    }

    setInput('');
    cancelMediaUpload();
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      if (file.size <= MAX_FILE_SIZE) {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
          resolve(reader.result);
        };

        reader.onerror = (error) => {
          console.error('Error al leer el archivo:', error);
          reject(error);
        };
      } else {
        reject(new Error(`El archivo ${file.name} es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). El tamaño máximo es 50MB.`));
      }
    });
  };


  const joinGroup = (groupName) => {
    console.log(`Uniéndose al grupo: ${groupName}`);

    if (socket.current && socket.current.connected) {
      socket.current.emit('joinGroup', {
        groupName: groupName,
        from: username
      });
    } else {
      console.error('Socket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  const leaveGroup = (groupName) => {
    console.log(`Saliendo del grupo: ${groupName}`);

    if (socket.current && socket.current.connected) {
      socket.current.emit('leaveGroup', {
        groupName: groupName,
        from: username
      });

      if (isGroup && to === groupName) {
        setTo('');
        setIsGroup(false);
      }
    } else {
      console.error('Socket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Calcular usuarios filtrados basado en la búsqueda
  const filteredUsersList = userList.filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroupsList = groupList.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isGroupMember = (group) => {
    return group.members.includes(username);
  };

  return (
    <div className="chat-app">
      {/* Elemento de audio para notificaciones */}
      <audio 
        ref={messageSound}
        preload="auto"
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      />
      
      <div className="users-list">
        <h3 data-count={userList.length + groupList.length}>
          Chats Midas Solutions Center
          {user?.sede && (
            <div className="sede-info">
              {user.sede}
            </div>
          )}
        </h3>
        <div className="users">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar o empezar un nuevo chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="btn-icon"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    title="Crear nuevo grupo"
                    className="btn-icon"
                  >
                    👥+
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Botón para unirse a sala - visible para todos */}
                    <button
                      onClick={() => setShowJoinRoomModal(true)}
                      title="Unirse a sala"
                      className="btn-icon btn-primary"
                    >
                      🚪
                    </button>
                    
                    {isAdmin && (
                      <div className="admin-menu-container">
                        <button
                          onClick={() => {
                            setShowAdminMenu(!showAdminMenu);
                          }}
                          title="Menú de administrador"
                          className="btn-icon btn-primary admin-menu-button"
                        >
                          ⚙️
                        </button>
                        {showAdminMenu && (
                          <div className="admin-menu">
                              <div className="admin-menu-header">
                                <h4>🔧 Panel de Administración</h4>
                                <span 
                                  className="close-admin-menu"
                                  onClick={() => setShowAdminMenu(false)}
                                >
                                  ✕
                                </span>
                              </div>
                            <div className="admin-options">
                              <div className="admin-option" onClick={() => {
                                setShowAdminMenu(false);
                                setShowCreateRoomModal(true);
                              }}>
                                <span className="admin-icon">🏠</span>
                                <span className="admin-text">Crear sala temporal</span>
                              </div>
                              <div className="admin-option" onClick={() => {
                                setShowAdminMenu(false);
                                handleShowAdminRooms();
                              }}>
                                <span className="admin-icon">📋</span>
                                <span className="admin-text">{loadingAdminRooms ? 'Cargando...' : 'Mis salas'}</span>
                              </div>
                              <div className="admin-option" onClick={() => {
                                setShowAdminMenu(false);
                                setShowCreateConversationModal(true);
                              }}>
                                <span className="admin-icon">💬</span>
                                <span className="admin-text">Crear conversación temporal</span>
                              </div>
                              <div className="admin-option" onClick={() => {
                                setShowAdminMenu(false);
                                setShowManageUsersModal(true);
                              }}>
                                <span className="admin-icon">👥</span>
                                <span className="admin-text">Gestionar usuarios</span>
                              </div>
                              <div className="admin-option" onClick={() => {
                                setShowAdminMenu(false);
                                setShowSystemConfigModal(true);
                              }}>
                                <span className="admin-icon">⚙️</span>
                                <span className="admin-text">Configuración del sistema</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="user-count">
              {userList.length} usuario{userList.length !== 1 ? 's' : ''} | {groupList.length} grupo{groupList.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Modal de enlace temporal */}
          {showTemporaryLinkModal && currentTemporaryLink && (
            <div 
              className="temporary-link-modal"
              onClick={(e) => {
                if (e.target.classList.contains('temporary-link-modal')) {
                  setShowTemporaryLinkModal(false);
                }
              }}
            >
              <div className="temporary-link-content">
                <div className="temporary-link-header">
                  <h3>🔗 Enlace Temporal Creado</h3>
                  <button 
                    onClick={() => setShowTemporaryLinkModal(false)}
                    className="modal-close"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="temporary-link-body">
                  <div className="link-section">
                    <h4>🏠 Sala Temporal Creada</h4>
                    <p><strong>Nombre:</strong> {currentTemporaryLink.roomName || 'Sala temporal'}</p>
                    <p><strong>Código:</strong> {currentTemporaryLink.roomCode}</p>
                    <p>Comparte este enlace con los participantes para unirse a la sala:</p>
                    <div className="link-container">
                      <input 
                        type="text" 
                        value={currentTemporaryLink.linkUrl} 
                        readOnly 
                        className="link-input"
                      />
                      <button 
                        onClick={() => copyLinkInModal(currentTemporaryLink.linkUrl)}
                        className={`copy-btn ${linkCopied ? 'copied' : ''}`}
                      >
                        {linkCopied ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="room-info-section">
                    <h4>📊 Información de la Sala</h4>
                    <div className="room-details">
                      <div className="room-detail">
                        <span className="detail-label">Capacidad máxima:</span>
                        <span className="detail-value">{currentTemporaryLink.maxCapacity || 50} personas</span>
                      </div>
                      <div className="room-detail">
                        <span className="detail-label">Participantes actuales:</span>
                        <span className="detail-value">{currentTemporaryLink.participants?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modales de Administrador */}
          {showCreateConversationModal && (
            <div className="admin-modal-overlay" onClick={() => setShowCreateConversationModal(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>💬 Crear Conversación Temporal</h3>
                  <button onClick={() => setShowCreateConversationModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  <p>Esta funcionalidad permitirá crear conversaciones temporales con enlaces de acceso.</p>
                  <div className="form-group">
                    <label>Nombre de la conversación:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Reunión de equipo" 
                      value={conversationForm.name}
                      onChange={(e) => setConversationForm({...conversationForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duración (horas):</label>
                    <select 
                      value={conversationForm.durationHours}
                      onChange={(e) => setConversationForm({...conversationForm, durationHours: parseInt(e.target.value)})}
                    >
                      <option value="1">1 hora</option>
                      <option value="4">4 horas</option>
                      <option value="24">24 horas</option>
                      <option value="168">1 semana</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Máximo de participantes (0 = ilimitado):</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      min="0"
                      value={conversationForm.maxParticipants}
                      onChange={(e) => setConversationForm({...conversationForm, maxParticipants: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-primary" onClick={handleCreateConversation}>Crear Conversación</button>
                    <button className="btn btn-secondary" onClick={() => setShowCreateConversationModal(false)}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCreateRoomModal && (
            <div className="admin-modal-overlay" onClick={() => setShowCreateRoomModal(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>🏠 Crear Sala Temporal</h3>
                  <button onClick={() => setShowCreateRoomModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  <p>Crear una sala temporal para reuniones o eventos específicos.</p>
                  <div className="form-group">
                    <label>Nombre de la sala:</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Sala de conferencias" 
                      value={roomForm.name}
                      onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Capacidad máxima:</label>
                    <input 
                      type="number" 
                      placeholder="50" 
                      min="2" 
                      max="1000" 
                      value={roomForm.maxCapacity}
                      onChange={(e) => setRoomForm({...roomForm, maxCapacity: parseInt(e.target.value) || 50})}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-primary" onClick={handleCreateRoom}>Crear Sala</button>
                    <button className="btn btn-secondary" onClick={() => setShowCreateRoomModal(false)}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showJoinRoomModal && (
            <div className="admin-modal-overlay" onClick={() => setShowJoinRoomModal(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>🚪 Unirse a Sala</h3>
                  <button onClick={() => setShowJoinRoomModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  {roomInfo ? (
                    <>
                      <div className="room-info-display">
                        <h4>🏠 {roomInfo.name}</h4>
                        <div className="room-details">
                          <div className="room-detail">
                            <span className="detail-label">Código:</span>
                            <span className="detail-value">{roomInfo.roomCode}</span>
                          </div>
                          <div className="room-detail">
                            <span className="detail-label">Capacidad:</span>
                            <span className="detail-value">{roomInfo.currentMembers}/{roomInfo.maxCapacity} personas</span>
                          </div>
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button className="btn btn-primary" onClick={handleJoinRoom}>Unirse a la Sala</button>
                        <button className="btn btn-secondary" onClick={() => setShowJoinRoomModal(false)}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Ingresa el código o enlace de la sala para unirte.</p>
                      <div className="form-group">
                        <label>Código de la sala:</label>
                        <input 
                          type="text" 
                          placeholder="Ej: ABC123" 
                          value={joinRoomForm.roomCode}
                          onChange={(e) => setJoinRoomForm({...joinRoomForm, roomCode: e.target.value})}
                        />
                      </div>
                      <div className="modal-actions">
                        <button className="btn btn-primary" onClick={handleJoinRoom}>Unirse</button>
                        <button className="btn btn-secondary" onClick={() => setShowJoinRoomModal(false)}>Cancelar</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAdminRoomsModal && (
            <div className="admin-modal-overlay" onClick={() => setShowAdminRoomsModal(false)}>
              <div className="admin-modal admin-rooms-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>📋 Mis Salas Temporales</h3>
                  <button onClick={() => setShowAdminRoomsModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  {loadingAdminRooms ? (
                    <div className="loading">Cargando salas...</div>
                  ) : adminRooms.length === 0 ? (
                    <div className="no-rooms">No tienes salas creadas</div>
                  ) : (
                    <div className="rooms-list">
                      {adminRooms.map((room) => (
                        <div key={room.id} className="room-item">
                          <div className="room-info">
                            <h4>🏠 {room.name}</h4>
                            <div className="room-details">
                              <div className="room-detail">
                                <span className="detail-label">Código:</span>
                                <span className="detail-value">{room.roomCode}</span>
                              </div>
                              <div className="room-detail">
                                <span className="detail-label">Capacidad:</span>
                                <span className="detail-value">{room.currentMembers}/{room.maxCapacity}</span>
                              </div>
                              <div className="room-detail">
                                <span className="detail-label">Estado:</span>
                                <span className={`status ${room.isActive ? 'active' : 'inactive'}`}>
                                  {room.isActive ? '✅ Activa' : '❌ Inactiva'}
                                </span>
                              </div>
                              <div className="room-detail">
                                <span className="detail-label">Creada:</span>
                                <span className="detail-value">{new Date(room.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="room-actions">
                            <button 
                              onClick={() => handleDeactivateRoom(room.id, room.name)}
                              className="btn btn-warning"
                              disabled={!room.isActive}
                            >
                              {room.isActive ? '⏸️ Desactivar' : '⏸️ Desactivada'}
                            </button>
                            <button 
                              onClick={() => handleDeleteRoom(room.id, room.name)}
                              className="btn btn-danger"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-modal-footer">
                  <button onClick={() => setShowAdminRoomsModal(false)} className="btn btn-secondary">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {showManageUsersModal && (
            <div className="admin-modal-overlay" onClick={() => setShowManageUsersModal(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>👥 Gestionar Usuarios</h3>
                  <button onClick={() => setShowManageUsersModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  <p>Administrar usuarios del sistema y sus permisos.</p>
                  <div className="users-list-admin">
                    {userList.map((user, idx) => (
                      <div key={idx} className="user-item-admin">
                        <div className="user-info">
                          <span className="user-name">{user}</span>
                          <span className="user-status">En línea</span>
                        </div>
                        <div className="user-actions">
                          <button className="btn-icon" title="Editar">✏️</button>
                          <button className="btn-icon btn-danger" title="Eliminar">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-primary">Agregar Usuario</button>
                    <button className="btn btn-secondary" onClick={() => setShowManageUsersModal(false)}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSystemConfigModal && (
            <div className="admin-modal-overlay" onClick={() => setShowSystemConfigModal(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>⚙️ Configuración del Sistema</h3>
                  <button onClick={() => setShowSystemConfigModal(false)} className="close-btn">✕</button>
                </div>
                <div className="admin-modal-body">
                  <p>Configurar parámetros del sistema de chat.</p>
                  <div className="form-group">
                    <label>Tiempo de expiración de mensajes (días):</label>
                    <input 
                      type="number" 
                      placeholder="30" 
                      min="1" 
                      max="365" 
                      value={systemConfig.messageExpirationDays}
                      onChange={(e) => setSystemConfig({...systemConfig, messageExpirationDays: parseInt(e.target.value) || 30})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tamaño máximo de archivos (MB):</label>
                    <input 
                      type="number" 
                      placeholder="50" 
                      min="1" 
                      max="1000" 
                      value={systemConfig.maxFileSizeMB}
                      onChange={(e) => setSystemConfig({...systemConfig, maxFileSizeMB: parseInt(e.target.value) || 50})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Notificaciones:</label>
                    <div className="checkbox-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={systemConfig.notifications.sound}
                          onChange={(e) => setSystemConfig({
                            ...systemConfig, 
                            notifications: {...systemConfig.notifications, sound: e.target.checked}
                          })}
                        /> Sonido
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={systemConfig.notifications.visual}
                          onChange={(e) => setSystemConfig({
                            ...systemConfig, 
                            notifications: {...systemConfig.notifications, visual: e.target.checked}
                          })}
                        /> Visual
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={systemConfig.notifications.email}
                          onChange={(e) => setSystemConfig({
                            ...systemConfig, 
                            notifications: {...systemConfig.notifications, email: e.target.checked}
                          })}
                        /> Email
                      </label>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-primary" onClick={handleSaveSystemConfig}>Guardar Configuración</button>
                    <button className="btn btn-secondary" onClick={() => setShowSystemConfigModal(false)}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección de grupos */}
          {!showCreateGroup && filteredGroupsList.length > 0 && (
            <div className="groups-section">
              <h4 className="section-title">Grupos</h4>
              {filteredGroupsList.map((group, idx) => {
                const isMember = isGroupMember(group);
                return (
                  <div
                    key={`group-${idx}`}
                    className={`user-item group-item ${isGroup && to === group.name ? 'selected' : ''} ${isMember ? 'member' : 'not-member'}`}
                    onClick={() => {
                      if (isMember) {
                        // Marcar mensajes como leídos
                        const chatId = `group-${group.name}`;
                        if (unreadMessages[chatId]) {
                          setUnreadMessages(prev => ({
                            ...prev,
                            [chatId]: 0
                          }));
                        }

                        setTo(group.name);
                        setIsGroup(true);
                      }
                    }}
                  >
                    <div className="user-avatar group-avatar">
                      👥
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {group.name} {isMember ? '' : '(no eres miembro)'}
                      </div>
                      <div className="user-status">
                        {group.members.length} miembro{group.members.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {/* Indicador de mensajes no leídos */}
                    {isMember && unreadMessages[`group-${group.name}`] > 0 && (
                      <div className="unread-badge">
                        {unreadMessages[`group-${group.name}`]}
                      </div>
                    )}
                    <div className="group-actions">
                      {isMember ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveGroup(group.name);
                          }}
                          title="Salir del grupo"
                          className="btn-icon btn-danger"
                          style={{ width: '28px', height: '28px', fontSize: '12px' }}
                        >
                          🚪
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            joinGroup(group.name);
                          }}
                          title="Unirse al grupo"
                          className="btn-icon btn-primary"
                          style={{ width: '28px', height: '28px', fontSize: '12px' }}
                        >
                          ➕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sección de usuarios - Lógica diferente según contexto */}
          {!showCreateGroup && (
            <div className="users-section">
              {/* Si estamos en una sala de grupo, mostrar usuarios de la sala */}
              {isGroup && to ? (
                <>
                  <h4 className="section-title">Usuarios en {to}</h4>
                  {roomUsers.length > 0 ? (
                    roomUsers.map((user, idx) => (
                      <div
                        key={`room-user-${idx}`}
                        className={`user-item ${user === username ? 'current-user' : ''}`}
                      >
                        <div className="user-avatar">
                          {getUserProfileImage(user) ? (
                            <img 
                              src={getUserProfileImage(user)} 
                              alt={user}
                              className="profile-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span style={{ display: getUserProfileImage(user) ? 'none' : 'block' }}>
                            {getUserInitials(user)}
                          </span>
                        </div>
                        <div className="user-info">
                          <div className="user-name">
                            {user === username ? 'Tú' : user}
                          </div>
                          <div className="user-status">
                            En la sala
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-users">
                      No hay usuarios en esta sala
                    </div>
                  )}
                </>
              ) : isAdmin ? (
                /* Para admins, mostrar lista general de usuarios */
                <>
                  {filteredGroupsList.length > 0 && <h4 className="section-title">Usuarios</h4>}
                  {filteredUsersList.length > 0 ? (
                    filteredUsersList.map((user, idx) => (
                      <div
                        key={`user-${idx}`}
                        className={`user-item ${user === username ? 'current-user' : ''} ${!isGroup && user === to ? 'selected' : ''}`}
                        onClick={() => {
                          console.log(`Cambiando a chat con: ${user}`);
                          
                          // Marcar mensajes como leídos
                          const chatId = `user-${user}`;
                          if (unreadMessages[chatId]) {
                            setUnreadMessages(prev => ({
                              ...prev,
                              [chatId]: 0
                            }));
                          }

                      setTo(user);
                      setIsGroup(false);
                      setRoomUsers([]); // Limpiar usuarios de sala al cambiar a chat individual
                      setCurrentRoomCode(null); // Limpiar código de sala
                      currentRoomCodeRef.current = null; // Limpiar referencia
                      localStorage.removeItem('currentRoom'); // Limpiar sala guardada
                        }}
                      >
                        <div className="user-avatar">
                          {getUserProfileImage(user) ? (
                            <img 
                              src={getUserProfileImage(user)} 
                              alt={user}
                              className="profile-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span style={{ display: getUserProfileImage(user) ? 'none' : 'block' }}>
                            {getUserInitials(user)}
                          </span>
                        </div>
                        <div className="user-info">
                            <div className="user-name">
                              {user === username ? 'Notas personales' : user} {user === username && ' (tú)'}
                            </div>
                            <div className="user-status">
                              {user === username ? 'Mensajes privados' : 'En línea'}
                            </div>
                        </div>
                        {/* Indicador de mensajes no leídos */}
                        {user !== username && unreadMessages[`user-${user}`] > 0 && (
                          <div className="unread-badge">
                            {unreadMessages[`user-${user}`]}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="no-users">
                      {searchTerm
                        ? `No se encontraron usuarios que coincidan con "${searchTerm}"`
                        : "No hay usuarios conectados"}
                    </div>
                  )}
                </>
              ) : (
                /* Para usuarios no admin, mostrar solo sus notas personales */
                <>
                  <h4 className="section-title">Notas Personales</h4>
                  <div
                    className={`user-item current-user ${!isGroup && to === username ? 'selected' : ''}`}
                    onClick={() => {
                      console.log(`Cambiando a notas personales`);
                      setTo(username);
                      setIsGroup(false);
                      setRoomUsers([]); // Limpiar usuarios de sala al cambiar a notas personales
                      setCurrentRoomCode(null); // Limpiar código de sala
                      currentRoomCodeRef.current = null; // Limpiar referencia
                      localStorage.removeItem('currentRoom'); // Limpiar sala guardada
                    }}
                  >
                    <div className="user-avatar">
                      {getUserProfileImage(username) ? (
                        <img 
                          src={getUserProfileImage(username)} 
                          alt={username}
                          className="profile-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <span style={{ display: getUserProfileImage(username) ? 'none' : 'block' }}>
                        {getUserInitials(username)}
                      </span>
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        Notas personales (tú)
                      </div>
                      <div className="user-status">
                        Mensajes privados
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
        
        <div className="users-list-footer">
          <button 
            onClick={handleLogout} 
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center' }}
            title="Cerrar sesión"
          >
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </div>
      
      <div className="chat-container">
        {to ? (
          <>
            <div className="chat-header">
              <div className="chat-contact">
                <div className={`user-avatar small ${isGroup ? 'group-avatar' : ''}`}>
                  {isGroup ? '👥' : (
                    getUserProfileImage(to) ? (
                      <img 
                        src={getUserProfileImage(to)} 
                        alt={to}
                        className="profile-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null
                  )}
                  {!isGroup && (
                    <span style={{ display: getUserProfileImage(to) ? 'none' : 'block' }}>
                      {getUserInitials(to)}
                    </span>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{to === username ? 'Notas personales' : to}</div>
                  <div className="user-status">
                    {isGroup
                      ? (() => {
                          const group = groupList.find(g => g.name === to);
                          const memberCount = group
                            ? `${group.members.length} miembro${group.members.length !== 1 ? 's' : ''}`
                            : 'Grupo';
                          return currentRoomCode 
                            ? `${memberCount} • Código: ${currentRoomCode}`
                            : memberCount;
                        })()
                      : to === username 
                        ? 'Mensajes privados'
                        : 'En línea'
                    }
                  </div>
                </div>
              </div>
              {isGroup && currentRoomCode && (
                <div className="chat-header-actions">
                  <button 
                    className="leave-room-btn" 
                    onClick={() => {
                      // Salir de la sala
                      if (socket.current && socket.current.connected) {
                        socket.current.emit('leaveRoom', {
                          roomCode: currentRoomCode,
                          from: username
                        });
                      }
                      setTo(username);
                      setIsGroup(false);
                      setRoomUsers([]);
                      setCurrentRoomCode(null);
                      currentRoomCodeRef.current = null;
                      localStorage.removeItem('currentRoom');
                      showSuccessAlert('Sala', 'Has salido de la sala');
                    }}
                    title="Salir de la sala"
                  >
                    <span className="leave-icon">↩️</span>
                    <span className="leave-text">Salir</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="chat-history">
              {messages
                .filter(msg => {
                  if (msg.type === 'info' || msg.type === 'error') {
                    return true;
                  } else if (isGroup) {
                    return msg.isGroup && msg.receiver === to;
                  } else {
                    if (to === username) {
                      // Para "Notas personales" - mostrar mensajes enviados por ti
                      return msg.isSelf === true || (msg.sender === 'Tú' && msg.receiver === username && msg.isSent === true);
                    }
                    
                    // Para chat con otro usuario
                    const isSentByMe = msg.sender === 'Tú' && msg.receiver === to;
                    const isReceivedFromThem = msg.sender === to && msg.receiver === username;
                    return !msg.isGroup && (isSentByMe || isReceivedFromThem);
                  }
                })
                .map((msg, idx) => {
                  if (msg.type === 'info') {
                    return (
                      <div key={idx} className="message system info">
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-time">{msg.time}</div>
                        </div>
                      </div>
                    );
                  } else if (msg.type === 'error') {
                    return (
                      <div key={idx} className="message system error">
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-time">{msg.time}</div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} className={`message ${msg.isSent ? 'sent' : 'received'}`}>
                        <div className="message-content">
                          <div className="message-header">
                            {!msg.isSent && (
                              <div className="message-sender">
                                {msg.isGroup ? `${msg.sender} (en ${msg.receiver})` : msg.sender}
                              </div>
                            )}
                          </div>

                          {msg.text && (
                            <div className="message-text">
                              {msg.text}
                            </div>
                          )}

                          {msg.mediaType && (
                            <div className="message-media">
                              {msg.mediaType === 'image' ? (
                                <img
                                  src={msg.mediaData}
                                  alt="Imagen"
                                  className="message-image"
                                />
                              ) : msg.mediaType === 'video' ? (
                                <video
                                  src={msg.mediaData}
                                  controls
                                  className="message-video"
                                />
                              ) : msg.mediaType === 'audio' ? (
                                <audio
                                  src={msg.mediaData}
                                  controls
                                  className="message-audio"
                                />
                              ) : (
                                <div className="file-container">
                                  <div className="file-icon">📁</div>
                                  <div className="file-info">
                                    <div className="file-name">{msg.fileName}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="message-footer">
                            <div className="message-time">{msg.time}</div>
                            {msg.isSent && (
                              <div className="message-status" title="Mensaje enviado">
                                ✓
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
            </div>
            
            <div className="message-form">
              {mediaPreviews.length > 0 && (
                <div className="media-preview">
                  <div className="media-preview-header">
                    <span className="media-type">
                      {mediaPreviews.length === 1
                        ? (mediaPreviews[0].type === 'image' ? '🖼️ Imagen' :
                           mediaPreviews[0].type === 'video' ? '🎬 Video' :
                           mediaPreviews[0].type === 'audio' ? '🎵 Audio' :
                           '📁 Archivo')
                        : `📁 ${mediaPreviews.length} archivos`}
                    </span>
                    <button className="cancel-media" onClick={cancelMediaUpload}>✕</button>
                  </div>

                  <div className="media-previews-grid">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="media-preview-item">
                        <div className="preview-item-content">
                          {preview.type === 'image' ? (
                            <img src={preview.data} alt={`Vista previa ${index + 1}`} />
                          ) : preview.type === 'video' ? (
                            <video src={preview.data} controls />
                          ) : preview.type === 'audio' ? (
                            <div className="audio-preview">
                              <span className="audio-icon">🎵</span>
                              <span className="audio-name">{preview.name}</span>
                              <audio src={preview.data} controls />
                            </div>
                          ) : (
                            <div className="file-preview">
                              <div className="file-icon">📁</div>
                              <div className="file-info">
                                <div className="file-name">{preview.name}</div>
                                <div className="file-size">
                                  {preview.size ? `${(preview.size / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            </div>
                          )}
                          <button
                            className="remove-media-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMediaFile(index);
                            }}
                            title="Eliminar archivo"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="message-input-container">
                <input
                  placeholder="Escribe tu mensaje..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />

                <label 
                  className="btn-icon" 
                  title="Adjuntar archivos (máx. 5)"
                  style={{ cursor: 'pointer' }}
                >
                  📎
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    multiple
                  />
                </label>

                <button 
                  onClick={sendMessage}
                  className="btn btn-primary"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="select-chat">
            <div className="whatsapp-logo">
              <div className="logo-icon">💬</div>
            </div>
            <h2>WhatsApp Web</h2>
            <p>Envía y recibe mensajes sin mantener tu teléfono conectado.</p>
            <p>Usa WhatsApp en hasta 4 dispositivos vinculados y 1 teléfono al mismo tiempo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;