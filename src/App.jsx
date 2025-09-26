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
    
    const isUserAdmin = userData.role && userData.role.toUpperCase() === 'ADMIN';
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

  // Efecto para verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = () => {
      if (apiService.isAuthenticated()) {
        const currentUser = apiService.getCurrentUser();
        setUser(currentUser);
        const displayName = currentUser.nombre && currentUser.apellido ? 
          `${currentUser.nombre} ${currentUser.apellido}` : 
          currentUser.username || currentUser.email;
        setUsername(displayName);
        console.log('Username establecido como:', displayName);
        setIsAuthenticated(true);
        
        const isUserAdmin = currentUser.role && currentUser.role.toUpperCase() === 'ADMIN';
        console.log('Rol del usuario:', currentUser.role, 'Es admin:', isUserAdmin);
        setIsAdmin(isUserAdmin);
        
        clearRegistrationMessages();
      }
    };
    
    if (!isAuthenticated && !user) {
      checkAuth();
    }
  }, [isAuthenticated, user]);

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
      if (event.key === 'Escape' && to) {
        setTo('');
        setIsGroup(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [to]);

  // Efecto para detectar enlaces de unión en la URL
  useEffect(() => {
    const handleHashChange = () => {
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
    });

    s.on('message', (data) => {
      try {
        console.log('Mensaje recibido:', data);
        const timeString = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data.isGroup) {
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
            playNotificationSound();
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

          if (to !== data.from) {
            setUnreadMessages(prev => {
              const chatId = `user-${data.from}`;
              return {
                ...prev,
                [chatId]: (prev[chatId] || 0) + 1
              };
            });
            playNotificationSound();
          }
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    });

    s.on('info', (data) => {
      console.log('Mensaje de info recibido:', data.message);
      
      if (data.message && data.message.includes('Registrado como')) {
        console.log('Usuario registrado exitosamente en el chat');
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
      console.log('Lista de usuarios recibida:', data.users);
      if (Array.isArray(data.users)) {
        setUserList(data.users);
      }
    });

    s.on('groupList', (data) => {
      console.log('Lista de grupos recibida:', data.groups);
      if (Array.isArray(data.groups)) {
        setGroupList(data.groups);
      }
    });

    s.on('temporaryLinkCreated', (data) => {
      console.log('Enlace temporal creado:', data);
      setCurrentTemporaryLink(data);
      setShowTemporaryLinkModal(true);
    });

    s.on('joinedTemporaryConversation', (data) => {
      console.log('Unido a conversación temporal:', data);
      setTo(data.groupName);
      setIsGroup(true);
      showSuccessAlert('Conversación', `Te has unido a la conversación temporal. Expira: ${new Date(data.expiresAt).toLocaleString()}`);
    });

    s.on('joinedTemporaryRoom', (data) => {
      console.log('Unido a sala temporal:', data);
      showSuccessAlert('Sala temporal', `Te has unido a la sala "${data.roomName}". Expira: ${new Date(data.expiresAt).toLocaleString()}`);
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
  }, [isAuthenticated, user, username]);

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

  const filteredUsers = userList.filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groupList.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isGroupMember = (group) => {
    return group.members.includes(username);
  };

  return (
    <div className="chat-app">
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
                  {isAdmin && (
                    <button
                      onClick={() => {
                        console.log('Abriendo menú de administrador');
                        setShowAdminMenu(!showAdminMenu);
                      }}
                      title="Menú de administrador"
                      className="btn-icon btn-primary"
                    >
                      ⚙️
                    </button>
                  )}
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
                    <h4>💬 Iniciar conversación</h4>
                    <p>Comparte este enlace con los participantes para comenzar la conversación:</p>
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

                  <div className="participants-section">
                    <h4>👥 Participantes</h4>
                    <div className="participants-list">
                      {currentTemporaryLink.participants.map((participant, idx) => (
                        <div key={idx} className="participant-item">
                          {participant}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="expiry-section">
                    <h4>⏰ Expira en</h4>
                    <p>{new Date(currentTemporaryLink.expiresAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección de grupos */}
          {!showCreateGroup && filteredGroups.length > 0 && (
            <div className="groups-section">
              <h4 className="section-title">Grupos</h4>
              {filteredGroups.map((group, idx) => {
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

          {/* Sección de usuarios */}
          {!showCreateGroup && (
            <div className="users-section">
              {filteredGroups.length > 0 && <h4 className="section-title">Usuarios</h4>}
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => (
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
                          return group
                            ? `${group.members.length} miembro${group.members.length !== 1 ? 's' : ''}`
                            : 'Grupo';
                        })()
                      : to === username 
                        ? 'Mensajes privados'
                        : 'En línea'
                    }
                  </div>
                </div>
              </div>
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