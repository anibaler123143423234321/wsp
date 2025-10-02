import React, { useState, useEffect, useRef } from 'react';
import ChatLayout from '../layouts/ChatLayout';
import Login from '../components/Login';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import JoinRoomModal from '../components/modals/JoinRoomModal';
import AdminRoomsModal from '../components/modals/AdminRoomsModal';
import EditRoomModal from '../components/modals/EditRoomModal';
import RoomCreatedModal from '../components/modals/RoomCreatedModal';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { useMessagePagination } from '../hooks/useMessagePagination';
import apiService from '../apiService';

const ChatPage = () => {
  // Hooks personalizados
  const { isAuthenticated, user, username, isAdmin, logout, refreshAuth } = useAuth();
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

  // Estados del chat (declarar antes de los hooks que los usan)
  const [to, setTo] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [userList, setUserList] = useState([]);
  const [groupList] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [currentRoomCode, setCurrentRoomCode] = useState(null);

  // Hook para paginación de mensajes
  const {
    messages,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    clearMessages
  } = useMessagePagination(currentRoomCode, username, to, isGroup);

  // Estados adicionales del chat
  const [roomDuration, setRoomDuration] = useState(null);
  const [roomExpiresAt, setRoomExpiresAt] = useState(null);
  const [unreadMessages] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(false);

  // Estados de UI
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [showAdminRoomsModal, setShowAdminRoomsModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [adminRooms, setAdminRooms] = useState([]);
  const [loadingAdminRooms, setLoadingAdminRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Estados de formularios
  const [roomForm, setRoomForm] = useState({ name: '', maxCapacity: 50, durationHours: 24, durationMinutes: 0 });
  const [joinRoomForm, setJoinRoomForm] = useState({ roomCode: '' });
  const [editForm, setEditForm] = useState({ durationHours: 0, durationMinutes: 0 });

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
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    const checkCurrentRoom = async () => {
      if (hasRestoredRoom.current) return;
      hasRestoredRoom.current = true;

      try {
        const roomData = await apiService.getCurrentUserRoom();
        
        // Verificar si hay error en la respuesta
        if (roomData.statusCode && (roomData.statusCode === 500 || roomData.statusCode === 503)) {
          console.warn('⚠️ Error del servidor al obtener sala actual, continuando sin cargar mensajes históricos');
          return;
        }
        
        if (roomData.inRoom && roomData.room) {
          
          setTo(roomData.room.name);
          setIsGroup(true);
          setCurrentRoomCode(roomData.room.roomCode);
          setRoomDuration(roomData.room.durationMinutes);
          setRoomExpiresAt(roomData.room.expiresAt);
          currentRoomCodeRef.current = roomData.room.roomCode;
          
          if (socket && socket.connected) {
            socket.emit('joinRoom', {
              roomCode: roomData.room.roomCode,
              roomName: roomData.room.name,
              from: username
            });
          }
            }
      } catch (error) {
        console.error('❌ Error al verificar sala actual:', error);
      }
    };

    if (socket && socket.connected) {
      checkCurrentRoom();
    }
      }, [isAuthenticated, username, socket]);

  // Cargar mensajes cuando cambie currentRoomCode (para grupos/salas)
  useEffect(() => {
    if (currentRoomCode && username && isGroup) {
      loadInitialMessages();
    }
  }, [currentRoomCode, username, isGroup, loadInitialMessages]);

  // Cargar mensajes cuando cambie 'to' (para conversaciones individuales)
  useEffect(() => {
    if (to && username && !isGroup && !currentRoomCode) {
      loadInitialMessages();
    }
  }, [to, username, isGroup, currentRoomCode, loadInitialMessages]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    const s = socket;

    s.on('userList', (data) => {
      if (currentRoomCode) return;
      
      if (isAdmin) {
        setUserList(data.users);
      } else {
        setUserList([username]);
      }
    });

        s.on('roomUsers', (data) => {
          if (data.roomCode === currentRoomCodeRef.current) {
            setRoomUsers(data.users);
          }
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
          newMessage.mediaData = data.mediaData;
          newMessage.fileName = data.fileName;
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
          newMessage.mediaData = data.mediaData;
          newMessage.fileName = data.fileName;
        }

        addNewMessage(newMessage);

        if (data.from !== username) {
          playMessageSound(soundsEnabled);
        }
      }
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

        return () => {
          s.off('userList');
          s.off('roomUsers');
          s.off('roomJoined');
          s.off('userJoinedRoom');
          s.off('message');
          s.off('connect');
        };
      }, [socket, currentRoomCode, to, isGroup, username, isAdmin, addNewMessage, playMessageSound, soundsEnabled]);

  // Handlers
  const handleUserSelect = (userName) => {
    setTo(userName);
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    clearMessages();
  };

  const handleGroupSelect = (group) => {
    setTo(group.name);
    setIsGroup(true);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers(group.members);
    clearMessages();
  };

  const handlePersonalNotes = () => {
    setTo(username);
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    clearMessages();
  };

  // Función para toggle del menú (ocultar/mostrar sidebar)
  const handleToggleMenu = () => {
    setShowSidebar(!showSidebar);
  };

  const handleCreateRoom = async () => {
    try {
      // Validar que se haya especificado al menos algún tiempo
      if (roomForm.durationHours === 0 && roomForm.durationMinutes === 0) {
        alert('Por favor especifica al menos 1 minuto de duración para la sala');
        return;
      }
      
      // Convertir horas y minutos a duración total en minutos
      const totalMinutes = (roomForm.durationHours * 60) + roomForm.durationMinutes;
      
      // Incluir el nombre del creador en la petición de creación
      const createData = {
        name: roomForm.name,
        maxCapacity: roomForm.maxCapacity,
        duration: totalMinutes, // Enviar duración en minutos
        creatorUsername: username
      };
      
      const result = await apiService.createTemporaryRoom(createData);
      setShowCreateRoomModal(false);
      setRoomForm({ name: '', maxCapacity: 50, durationHours: 24, durationMinutes: 0 });
      
      // Guardar los datos de la sala creada para mostrar en el modal
      setCreatedRoomData(result);
      setShowRoomCreatedModal(true);
      
      // Ya no necesitamos unirnos manualmente, el creador ya está en la sala
      setTo(result.name);
      setIsGroup(true);
      setCurrentRoomCode(result.roomCode);
      setRoomDuration(totalMinutes);
      setRoomExpiresAt(result.expiresAt);
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
      
    } catch (error) {
      console.error('Error al crear sala:', error);
      alert('Error al crear la sala: ' + error.message);
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
          setRoomDuration(result.durationMinutes);
          setRoomExpiresAt(result.expiresAt);
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
      alert('Error al unirse a la sala: ' + error.message);
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
    setRoomDuration(null);
    currentRoomCodeRef.current = null;
    clearMessages();
  };

  const handleSendMessage = async () => {
    if ((!input && mediaFiles.length === 0) || !to) return;

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

      if (input) {
        messageObj.message = input;
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
          alert('Error al subir el archivo. Inténtalo de nuevo.');
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
            sentAt: new Date().toISOString()
          });
          console.log('✅ Mensaje personal guardado en BD');
        } catch (error) {
          console.error('❌ Error al guardar mensaje personal en BD:', error);
        }

        addNewMessage(newMessage);
        clearInput();
        return;
      }

      
      // Verificar que el socket esté conectado antes de enviar
      if (!socket || !socket.connected) {
        console.error('❌ Socket no conectado, no se puede enviar mensaje');
        alert('Error: No hay conexión con el servidor. Inténtalo de nuevo.');
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

      addNewMessage(newMessage);
      playMessageSound(soundsEnabled);
    }

    clearInput();
  };

  const handleShowAdminRooms = async () => {
    setLoadingAdminRooms(true);
    try {
      const rooms = await apiService.getAdminRooms();
      setAdminRooms(rooms);
      setShowAdminRoomsModal(true);
    } catch (error) {
      console.error('Error al cargar salas:', error);
      alert('Error al cargar las salas: ' + error.message);
    } finally {
      setLoadingAdminRooms(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la sala "${roomName}"?`)) {
      try {
        await apiService.deleteRoom(roomId);
        alert('Sala eliminada correctamente');
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);
      } catch (error) {
        console.error('Error al eliminar sala:', error);
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          alert('La sala ya fue eliminada');
          const rooms = await apiService.getAdminRooms();
          setAdminRooms(rooms);
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
        alert('Sala desactivada correctamente');
        const rooms = await apiService.getAdminRooms();
        setAdminRooms(rooms);
      } catch (error) {
        console.error('Error al desactivar sala:', error);
        alert('Error al desactivar la sala: ' + error.message);
      }
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    // Convertir la duración actual de minutos a horas y minutos
    const currentMinutes = room.durationMinutes || 0;
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    setEditForm({ durationHours: hours, durationMinutes: minutes });
    setShowEditRoomModal(true);
  };

  const handleUpdateRoom = async () => {
    try {
      // Validar que se haya especificado al menos algún tiempo
      if (editForm.durationHours === 0 && editForm.durationMinutes === 0) {
        alert('Por favor especifica al menos 1 minuto de duración para la sala');
        return;
      }
      
      // Convertir horas y minutos a duración total en minutos
      const totalMinutes = (editForm.durationHours * 60) + editForm.durationMinutes;
      
      // Actualizar la duración de la sala
      await apiService.updateRoomDuration(editingRoom.id, totalMinutes);
      
      setShowEditRoomModal(false);
      setEditingRoom(null);
      setEditForm({ durationHours: 0, durationMinutes: 0 });
      
      // Recargar la lista de salas
      handleShowAdminRooms();
      
      alert('Duración de la sala actualizada correctamente');
    } catch (error) {
      console.error('Error al actualizar duración de la sala:', error);
      alert('Error al actualizar la duración: ' + error.message);
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
      alert('Error al obtener usuarios de la sala: ' + error.message);
    }
  };

  // Función auxiliar para convertir archivos a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('El archivo es demasiado grande. Máximo 50MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
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
      isAdmin={isAdmin}
      showAdminMenu={showAdminMenu}
      setShowAdminMenu={setShowAdminMenu}
      showSidebar={showSidebar}
      onUserSelect={handleUserSelect}
      onGroupSelect={handleGroupSelect}
      onPersonalNotes={handlePersonalNotes}
      onLogout={logout}
      onShowCreateRoom={() => setShowCreateRoomModal(true)}
      onShowJoinRoom={() => setShowJoinRoomModal(true)}
      onShowAdminRooms={handleShowAdminRooms}
      onShowCreateConversation={() => {}}
      onShowManageUsers={() => {}}
      onShowSystemConfig={() => {}}
      loadingAdminRooms={loadingAdminRooms}
      unreadMessages={unreadMessages}
      
      // Props del chat
          to={to}
          isGroup={isGroup}
          currentRoomCode={currentRoomCode}
          roomUsers={roomUsers}
          roomDuration={roomDuration}
          roomExpiresAt={roomExpiresAt}
      messages={messages}
      input={input}
      setInput={setInput}
      onSendMessage={handleSendMessage}
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
      onViewRoomUsers={handleViewRoomUsers}
      onEditRoom={handleEditRoom}
    />

    <EditRoomModal
      isOpen={showEditRoomModal}
      onClose={() => {
        setShowEditRoomModal(false);
        setEditingRoom(null);
        setEditForm({ durationHours: 0, durationMinutes: 0 });
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
    </>
  );
};

export default ChatPage;
