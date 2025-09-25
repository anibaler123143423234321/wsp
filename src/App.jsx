import React, { useState, useEffect, useRef } from 'react';
import { showConfirmAlert, showSuccessAlert, showProgressAlert, updateProgressAlert, closeAlert } from './sweetalert2';
import Swal from 'sweetalert2';
import { AudioRecorder } from './audioRecorder';
import Login from './components/Login';
import apiService from './apiService';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [to, setTo] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  // const [userProfiles, setUserProfiles] = useState(new Map()); // Para almacenar información completa de usuarios
  const [groupList, setGroupList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  // Estado para rastrear mensajes no leídos: { chatId: count }
  const [unreadMessages, setUnreadMessages] = useState({});
  // Estado para manejar archivos multimedia
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const fileInputRef = useRef(null);
  // Estados para la eliminación de chat
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  // Estados para la grabación de audio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const audioRecorderRef = useRef(null);
  const ws = useRef(null);
  const notificationSound = useRef(null);
  const isConnecting = useRef(false);

  // Función para limpiar mensajes de registro del chat
  const clearRegistrationMessages = () => {
    setMessages(prev => prev.filter(msg => 
      !(msg.type === 'info' && msg.text && msg.text.includes('Registrado como'))
    ));
  };

  // Función para obtener la imagen de perfil de un usuario
  const getUserProfileImage = (username) => {
    // Si es el usuario actual, usar su información
    if (username === (user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username || user?.email)) {
      return user?.picture || null;
    }
    
    // Por ahora, solo tenemos la imagen del usuario actual
    // En el futuro se puede expandir para incluir información de otros usuarios
    return null;
  };

  // Función para obtener las iniciales de un usuario
  const getUserInitials = (username) => {
    return username.charAt(0).toUpperCase();
  };

  // Función para manejar el login exitoso
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Usar el nombre completo como identificador en el chat
    const displayName = userData.nombre && userData.apellido ? 
      `${userData.nombre} ${userData.apellido}` : 
      userData.username || userData.email;
    setUsername(displayName);
    console.log('Username establecido como:', displayName);
    setIsAuthenticated(true);
    // Limpiar mensajes de registro anteriores
    clearRegistrationMessages();
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setUsername('');
    setIsAuthenticated(false);
    setMessages([]);
    setUserList([]);
    setGroupList([]);
    setTo('');
    setInput('');
    if (ws.current) {
      ws.current.close();
    }
  };

  // Función para mostrar alertas de error
  const showErrorAlert = async (title, text) => {
    await Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonText: 'OK'
    });
  };

  // Función para reproducir el sonido de notificación
  const playNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.play().catch(error => {
        // Manejar errores de reproducción (algunos navegadores requieren interacción del usuario)
        console.log('Error al reproducir sonido de notificación:', error);
      });
    }
  };

  // Efecto para verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = () => {
      if (apiService.isAuthenticated()) {
        const currentUser = apiService.getCurrentUser();
        setUser(currentUser);
        // Usar el nombre completo como identificador en el chat
        const displayName = currentUser.nombre && currentUser.apellido ? 
          `${currentUser.nombre} ${currentUser.apellido}` : 
          currentUser.username || currentUser.email;
        setUsername(displayName);
        console.log('Username establecido como:', displayName);
        setIsAuthenticated(true);
        // Limpiar mensajes de registro anteriores
        clearRegistrationMessages();
      }
    };
    
    // Solo ejecutar si no hay usuario autenticado
    if (!isAuthenticated && !user) {
      checkAuth();
    }
  }, [isAuthenticated, user]);

  // Efecto para inicializar el sonido de notificación
  useEffect(() => {
    // Crear elemento de audio para notificaciones
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    notificationSound.current = audio;

    return () => {
      // Limpiar recurso de audio al desmontar
      notificationSound.current = null;
    };
  }, []);

  // Efecto para inicializar el grabador de audio
  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder();

    return () => {
      // Limpiar grabador al desmontar
      if (audioRecorderRef.current && audioRecorderRef.current.isCurrentlyRecording()) {
        audioRecorderRef.current.cancelRecording();
      }
    };
  }, []);

  // Efecto para depurar cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Mensajes actualizados:', messages.length, 'mensajes');
    }
  }, [messages]);

  // Efecto para manejar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && to) {
        // Cerrar el chat actual pero mantener los mensajes
        setTo('');
        setIsGroup(false);
      }
    };

    // Agregar el event listener
    document.addEventListener('keydown', handleKeyDown);

    // Limpiar el event listener al desmontar
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [to]);

  useEffect(() => {
    // Solo crear conexión si el usuario está autenticado
    if (!isAuthenticated || !user || !username) {
      return;
    }

    // Evitar crear múltiples conexiones
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      console.log('Ya hay una conexión WebSocket activa, omitiendo...');
      return;
    }

    console.log('Iniciando conexión WebSocket...');
    isConnecting.current = true;

    // Crear una nueva conexión WebSocket
    const socket = new window.WebSocket('ws://localhost:8082');
    ws.current = socket;

    socket.onopen = () => {
      console.log('Conexión WebSocket establecida');
      console.log('Estado de la conexión:', socket.readyState);
      isConnecting.current = false;
      
      // Si el usuario está autenticado, registrarlo automáticamente
      if (isAuthenticated && user && username) {
        const displayName = user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : user.username || user.email;
        console.log('Registrando usuario autenticado:', displayName);
        socket.send(JSON.stringify({ type: 'register', username: displayName }));
      }
      
      // La lista de usuarios se envía automáticamente al registrarse
      // No necesitamos solicitarla manualmente
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Mensaje recibido:', data);

        if (data.type === 'message') {
          // Obtener la hora actual si no viene en el mensaje
          const timeString = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (data.isGroup) {
            // Mensaje de grupo con formato mejorado
            const newMessage = {
              sender: data.from,
              receiver: data.group,
              text: data.message || '',
              isGroup: true,
              time: timeString,
              isSent: false
            };

            // Añadir información multimedia si existe
            if (data.mediaType) {
              console.log('Mensaje de grupo recibido con multimedia:', {
                tipo: data.mediaType,
                nombre: data.fileName,
                datosPresentes: !!data.mediaData,
                longitudDatos: data.mediaData ? data.mediaData.length : 0
              });

              newMessage.mediaType = data.mediaType;
              newMessage.mediaData = data.mediaData;
              newMessage.fileName = data.fileName;
            }
            setMessages((prev) => [...prev, newMessage]);

            // Verificar si el usuario actual es miembro del grupo
            const isUserMember = groupList.some(group =>
              group.name === data.group && group.members.includes(username)
            );

            // Incrementar contador de mensajes no leídos solo si:
            // 1. El usuario es miembro del grupo
            // 2. No está viendo actualmente este grupo
            if (isUserMember && !(isGroup && to === data.group)) {
              setUnreadMessages(prev => {
                const chatId = `group-${data.group}`;
                return {
                  ...prev,
                  [chatId]: (prev[chatId] || 0) + 1
                };
              });

              // Reproducir sonido de notificación
              playNotificationSound();
            }
          } else {
            // Mensaje individual con formato mejorado
            const newMessage = {
              sender: data.from,
              receiver: data.to || username, // Usar el campo 'to' si está disponible
              text: data.message || '',
              isGroup: false,
              time: timeString,
              isSent: false
            };

            // Añadir información multimedia si existe
            if (data.mediaType) {
              console.log('Mensaje recibido con multimedia:', {
                tipo: data.mediaType,
                nombre: data.fileName,
                datosPresentes: !!data.mediaData,
                longitudDatos: data.mediaData ? data.mediaData.length : 0
              });

              newMessage.mediaType = data.mediaType;
              newMessage.mediaData = data.mediaData;
              newMessage.fileName = data.fileName;
            }

            console.log('Mensaje recibido de:', data.from, 'Contenido:', data.message);
            console.log('Creando objeto de mensaje:', newMessage);

            setMessages((prev) => {
              console.log('Estado actual de mensajes:', prev);
              return [...prev, newMessage];
            });

            // Incrementar contador de mensajes no leídos si no estamos viendo este chat
            if (to !== data.from) {
              setUnreadMessages(prev => {
                const chatId = `user-${data.from}`;
                return {
                  ...prev,
                  [chatId]: (prev[chatId] || 0) + 1
                };
              });

              // Reproducir sonido de notificación
              playNotificationSound();
            }
          }
        } else if (data.type === 'info') {
          // Mensaje de información del sistema
          console.log('Mensaje de info recibido:', data.message);
          
          // Si es un mensaje de registro exitoso, no mostrarlo en el chat
          if (data.message && data.message.includes('Registrado como')) {
            console.log('Usuario registrado exitosamente en el chat');
            // Limpiar mensajes de registro anteriores del chat
            clearRegistrationMessages();
            // No agregar este mensaje al chat, solo confirmar el registro
            return;
          }
          
          // Solo mostrar otros mensajes de info en el chat
          const infoMessage = {
            type: 'info',
            text: data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages((prev) => [...prev, infoMessage]);
        } else if (data.type === 'error') {
          // Mensaje de error del sistema
          const errorMessage = {
            type: 'error',
            text: data.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else if (data.type === 'userList') {
          console.log('Lista de usuarios recibida:', data.users);

          // Verificar que data.users es un array
          if (Array.isArray(data.users)) {
            console.log('Actualizando lista de usuarios con:', data.users);
            setUserList(data.users);
          } else {
            console.error('Error: data.users no es un array:', data.users);
          }
        } else if (data.type === 'groupList') {
          console.log('Lista de grupos recibida:', data.groups);
          // Verificar que data.groups es un array
          if (Array.isArray(data.groups)) {
            setGroupList(data.groups);
            console.log('groupList actualizado a:', data.groups);
          } else {
            console.error('Error: data.groups no es un array:', data.groups);
          }
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Error en la conexión WebSocket:', error);
    };

    socket.onclose = () => {
      console.log('Conexión WebSocket cerrada');
      console.log('Razón del cierre:', socket.readyState);
      isConnecting.current = false;
    };

    // Función de limpieza
    return () => {
      console.log('Limpiando conexión WebSocket...');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [isAuthenticated, user, username]); // eslint-disable-line react-hooks/exhaustive-deps


  // Función para manejar la selección de archivos
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limitar a un máximo de 5 archivos a la vez
    const selectedFiles = files.slice(0, 5);

    // Filtrar solo imágenes y videos y verificar tamaño
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 5MB
    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach(file => {
      // Determinar el tipo de archivo
      let fileType = 'unknown';
      if (file.type) {
        fileType = file.type.split('/')[0];
      } else {
        // Si no se puede determinar el tipo por MIME, intentar por extensión
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

      // Verificar tamaño
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (isValidSize) {
        // Añadir información del tipo de archivo
        validFiles.push({
          file,
          fileType
        });
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

    // Extraer solo los objetos de archivo
    const fileObjects = validFiles.map(item => item.file);

    // Guardar los archivos inmediatamente
    setMediaFiles(fileObjects);

    // Crear URLs para vistas previas
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

    // Esperar a que todas las lecturas de archivos terminen
    Promise.all(readFiles).then(results => {
      console.log('Vistas previas generadas:', results);
      setMediaPreviews(results);
    });
  };

  // Función para cancelar el envío de archivos multimedia
  const cancelMediaUpload = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Función para eliminar un archivo específico
  const removeMediaFile = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Función para iniciar la grabación de audio
  const startRecording = async () => {
    if (!to) {
      await showErrorAlert('Error', 'Debes seleccionar un destinatario antes de grabar un audio.');
      return;
    }

    if (!audioRecorderRef.current) {
      audioRecorderRef.current = new AudioRecorder();
    }

    const success = await audioRecorderRef.current.startRecording((time) => {
      setRecordingTime(time);
    });

    if (success) {
      setIsRecording(true);
    } else {
      await showErrorAlert('Error', 'No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  // Función para detener la grabación y enviar el audio
  const stopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording) return;

    try {
      const result = await audioRecorderRef.current.stopRecording();
      if (!result) return;

      setIsRecording(false);
      setRecordingTime('00:00');

      // Obtener la hora actual para el mensaje
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Crear objeto de mensaje de audio
      const audioMessageObj = {
        type: 'message',
        to,
        isGroup,
        time: timeString,
        mediaType: 'audio',
        mediaData: result.base64,
        fileName: `audio_${now.getTime()}.webm`,
        fileSize: Math.round(result.blob.size)
      };

      // Enviar mensaje al servidor
      ws.current.send(JSON.stringify(audioMessageObj));

      // Mostrar mensaje en la interfaz
      const audioMessage = {
        sender: 'Tú',
        receiver: to,
        text: '',
        isGroup: isGroup,
        time: timeString,
        isSent: true,
        mediaType: 'audio',
        mediaData: result.base64,
        fileName: `audio_${now.getTime()}.webm`,
        fileSize: Math.round(result.blob.size)
      };

      setMessages((prev) => [...prev, audioMessage]);
    } catch (error) {
      console.error('Error al detener la grabación:', error);
      await showErrorAlert('Error', 'Ocurrió un error al procesar el audio.');
      setIsRecording(false);
      setRecordingTime('00:00');
    }
  };

  // Función para cancelar la grabación
  const cancelRecording = () => {
    if (!audioRecorderRef.current || !isRecording) return;

    audioRecorderRef.current.cancelRecording();
    setIsRecording(false);
    setRecordingTime('00:00');
  };

  // Función para convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Verificar el tamaño del archivo
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 20MB

      // Para archivos pequeños, usar el método estándar
      if (file.size <= MAX_FILE_SIZE) {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
          // Devolver directamente el resultado para mantener compatibilidad
          resolve(reader.result);
        };

        reader.onerror = (error) => {
          console.error('Error al leer el archivo:', error);
          reject(error);
        };

        // Añadir un manejador de progreso para archivos grandes
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log(`Progreso de carga: ${progress}%`);
          }
        };
      }
      // Para archivos grandes, mostrar un mensaje de advertencia
      else {
        // Opción 1: Rechazar archivos demasiado grandes
        reject(new Error(`El archivo ${file.name} es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). El tamaño máximo es 20MB.`));

        // Opción 2: Comprimir el video (esto requeriría una biblioteca adicional)
        // En una implementación real, aquí se podría usar una biblioteca como ffmpeg.js para comprimir el video
      }
    });
  };

  const sendMessage = async () => {
    if ((!input && mediaFiles.length === 0) || !to) return;

    // Obtener la hora actual para el mensaje
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Si hay texto o un solo archivo multimedia, enviamos un mensaje normal
    if (input || mediaFiles.length === 1) {
      // Crear objeto base del mensaje
      const messageObj = {
        type: 'message',
        to,
        isGroup,
        time: timeString
      };

      // Añadir contenido del mensaje (texto)
      if (input) {
        messageObj.message = input;
      }

      // Si hay un archivo multimedia, convertirlo a base64 y añadirlo al mensaje
      if (mediaFiles.length === 1) {
        try {
          const file = mediaFiles[0];
          const base64Data = await fileToBase64(file);
          messageObj.mediaType = file.type.split('/')[0];
          messageObj.mediaData = base64Data;
          messageObj.fileName = file.name;

          console.log('Enviando archivo único:', {
            tipo: file.type.split('/')[0],
            tamaño: file.size,
            nombre: file.name
          });
        } catch (error) {
          console.error('Error al convertir archivo a base64:', error);
          alert('Error al procesar el archivo. Inténtalo de nuevo.');
          return;
        }
      }

      // Si es un mensaje a sí mismo, no enviarlo al servidor para evitar duplicación
      if (to === username) {
        console.log('Mensaje personal (no enviado al servidor):', messageObj);
        
        // Mostrar mensaje solo en la interfaz local
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

      // Enviar mensaje al servidor
      console.log('Enviando mensaje al servidor:', messageObj);
      ws.current.send(JSON.stringify(messageObj));

      // Mostrar mensaje en la interfaz con formato mejorado
      const newMessage = {
        sender: 'Tú',
        receiver: to,
        text: input || '',
        isGroup: isGroup,
        time: timeString,
        isSent: true
      };

      // Añadir información multimedia si existe
      if (mediaFiles.length === 1) {
        const preview = mediaPreviews[0];
        newMessage.mediaType = preview.type;
        newMessage.mediaData = preview.data;
        newMessage.fileName = preview.name;
      }

      setMessages((prev) => [...prev, newMessage]);
    }
    // Si hay múltiples archivos multimedia, enviamos un mensaje por cada uno
    else if (mediaFiles.length > 1) {
      // Primero enviamos el mensaje de texto si existe
      if (input) {
        const textMessageObj = {
          type: 'message',
          to,
          isGroup,
          time: timeString,
          message: input
        };

        ws.current.send(JSON.stringify(textMessageObj));

        const textMessage = {
          sender: 'Tú',
          receiver: to,
          text: input,
          isGroup: isGroup,
          time: timeString,
          isSent: true
        };

        setMessages((prev) => [...prev, textMessage]);
      }

      // Luego enviamos cada archivo como un mensaje separado
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const preview = mediaPreviews[i];

        try {
          // Mostrar mensaje de carga
          const loadingMessage = {
            sender: 'Tú',
            receiver: to,
            text: file.type.split('/')[0] === 'image' ? 'Enviando imagen...' : 'Enviando video...',
            isGroup: isGroup,
            time: timeString,
            isSent: true,
            isLoading: true
          };

          const loadingMessageIndex = messages.length;
          setMessages((prev) => [...prev, loadingMessage]);

          // Convertir archivo a base64
          const result = await fileToBase64(file);

          // Determinar el tipo de archivo
          let fileType = 'unknown';
          if (file.type) {
            fileType = file.type.split('/')[0];
          } else {
            // Si no se puede determinar el tipo por MIME, intentar por extensión
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

          // Crear objeto de mensaje
          const mediaMessageObj = {
            type: 'message',
            to,
            isGroup,
            time: timeString,
            mediaType: fileType,
            mediaData: result.data ? result.data : result, // Manejar ambos formatos
            fileName: file.name,
            fileExtension: file.name.split('.').pop().toLowerCase(),
            fileSize: file.size
          };

          console.log('Enviando mensaje multimedia:', {
            tipo: fileType,
            tamaño: file.size,
            nombre: file.name,
            extension: file.name.split('.').pop().toLowerCase()
          });

          // Enviar mensaje al servidor
          ws.current.send(JSON.stringify(mediaMessageObj));

          // Crear mensaje para mostrar en la interfaz
          const mediaMessage = {
            sender: 'Tú',
            receiver: to,
            text: '',
            isGroup: isGroup,
            time: timeString,
            isSent: true,
            mediaType: preview.type,
            mediaData: preview.data,
            fileName: preview.name
          };

          // Reemplazar el mensaje de carga con el mensaje real
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[loadingMessageIndex] = mediaMessage;
            return newMessages;
          });

          // Pequeña pausa entre mensajes para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error al procesar archivo ${i+1}:`, error);

          // Mostrar mensaje de error
          setMessages((prev) => [
            ...prev,
            {
              type: 'error',
              text: `Error al enviar archivo: ${error.message || 'Error desconocido'}`,
              time: timeString
            }
          ]);

          // Si el error es por tamaño, mostrar sugerencias
          if (error.message && error.message.includes('demasiado grande')) {
            setMessages((prev) => [
              ...prev,
              {
                type: 'info',
                text: 'Sugerencia: Puedes comprimir el video o recortarlo para reducir su tamaño antes de enviarlo.',
                time: timeString
              }
            ]);
          }
        }
      }
    }

    // Limpiar estados
    setInput('');
    cancelMediaUpload();
  };

  // Función para solicitar manualmente la lista de usuarios
  const requestUserList = () => {
    console.log('Solicitando lista de usuarios manualmente');
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'getUserList' }));
    } else {
      console.error('WebSocket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  // Función para eliminar el chat actual
  const deleteChat = async () => {
    if (!to) return;

    // Mostrar confirmación con SweetAlert2
    const result = await showConfirmAlert(
      '¿Eliminar chat?',
      `¿Estás seguro de que deseas eliminar el chat con ${to}?`
    );

    // Si el usuario cancela, no hacer nada
    if (!result.isConfirmed) {
      return;
    }

    // Mostrar alerta de progreso
    await showProgressAlert('Eliminando chat', 'Procesando...');

    // Iniciar animación de carga
    setIsDeletingChat(true);
    setDeleteProgress(0);

    // Simulamos un proceso de eliminación con progreso
    const totalSteps = 5;
    let currentStep = 0;

    const interval = setInterval(async () => {
      currentStep++;
      const newProgress = (currentStep / totalSteps) * 100;

      // Actualizar progreso en la UI
      setDeleteProgress(newProgress);

      // Actualizar progreso en SweetAlert2
      await updateProgressAlert(
        'Eliminando chat',
        'Procesando...',
        newProgress
      );

      // Si llegamos al 100%, completamos la eliminación
      if (currentStep >= totalSteps) {
        clearInterval(interval);

        // Filtrar los mensajes para eliminar solo los del chat actual
        setMessages(prev => prev.filter(msg => {
          // Mantener mensajes del sistema
          if (msg.type === 'info' || msg.type === 'error') {
            return true;
          }

          // Eliminar mensajes del chat actual
          if (isGroup) {
            return !(msg.isGroup && msg.receiver === to);
          } else {
            return !(
              (msg.sender === 'Tú' && msg.receiver === to) ||
              (msg.sender === to && (msg.receiver === username || msg.receiver === to))
            );
          }
        }));

        // Añadir mensaje de confirmación
        const infoMessage = {
          type: 'info',
          text: `Chat con ${to} eliminado`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, infoMessage]);

        // Limpiar el chat actual
        setTo('');
        setIsGroup(false);

        // Finalizar animación
        setIsDeletingChat(false);

        // Cerrar alerta de progreso
        await closeAlert();

        // Mostrar alerta de éxito
        await showSuccessAlert('¡Completado!', `El chat con ${to} ha sido eliminado.`);
      }
    }, 500); // Actualizar cada 500ms
  };


  // Función para crear un nuevo grupo
  const createGroup = () => {
    if (!newGroupName.trim()) {
      setMessages(prev => [...prev, '[ERROR] El nombre del grupo no puede estar vacío']);
      return;
    }

    if (selectedMembers.length === 0) {
      setMessages(prev => [...prev, '[ERROR] Debes seleccionar al menos un miembro para el grupo']);
      return;
    }

    console.log(`Creando grupo: ${newGroupName} con miembros: ${selectedMembers.join(', ')}`);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'createGroup',
        groupName: newGroupName,
        members: selectedMembers
      }));

      // Limpiar el formulario
      setNewGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
    } else {
      console.error('WebSocket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  // Función para unirse a un grupo
  const joinGroup = (groupName) => {
    console.log(`Uniéndose al grupo: ${groupName}`);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'joinGroup',
        groupName: groupName
      }));
    } else {
      console.error('WebSocket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  // Función para salir de un grupo
  const leaveGroup = (groupName) => {
    console.log(`Saliendo del grupo: ${groupName}`);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'leaveGroup',
        groupName: groupName
      }));

      // Si estábamos chateando con este grupo, limpiar el destinatario
      if (isGroup && to === groupName) {
        setTo('');
        setIsGroup(false);
      }
    } else {
      console.error('WebSocket no está conectado');
      setMessages(prev => [...prev, '[ERROR] No se pudo conectar al servidor. Intenta recargar la página.']);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }


  // Filtrar usuarios según el término de búsqueda
  const filteredUsers = userList.filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar grupos según el término de búsqueda
  const filteredGroups = groupList.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificar si el usuario actual es miembro de un grupo
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
          {/* Buscador de usuarios y grupos */}
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
                <span
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </span>
              ) : (
                <div className="action-buttons">
                  <span
                    className="refresh-users"
                    onClick={requestUserList}
                    title="Actualizar lista de usuarios"
                  >
                    🔄
                  </span>
                  <span
                    className="create-group"
                    onClick={() => setShowCreateGroup(true)}
                    title="Crear nuevo grupo"
                  >
                    👥+
                  </span>
                </div>
              )}
            </div>
            <div className="user-count">
              {userList.length} usuario{userList.length !== 1 ? 's' : ''} | {groupList.length} grupo{groupList.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Formulario para crear grupo (condicional) */}
          {showCreateGroup && (
            <div className="create-group-form">
              <h4>Crear nuevo grupo</h4>
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="group-name-input"
              />
              <div className="member-selection">
                <h5>Seleccionar miembros:</h5>
                <div className="member-list">
                  {userList
                    .filter(user => user !== username)
                    .map((user, idx) => (
                      <div key={idx} className="member-item">
                        <input
                          type="checkbox"
                          id={`member-${idx}`}
                          checked={selectedMembers.includes(user)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, user]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(m => m !== user));
                            }
                          }}
                        />
                        <label htmlFor={`member-${idx}`}>{user}</label>
                      </div>
                    ))}
                </div>
              </div>
              <div className="group-form-buttons">
                <button type="button" onClick={createGroup} className="create-button">
                  Crear grupo
                </button>
                <button type="button" onClick={() => setShowCreateGroup(false)} className="cancel-button">
                  Cancelar
                </button>
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
                        <span
                          className="leave-group"
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveGroup(group.name);
                          }}
                          title="Salir del grupo"
                        >
                          🚪
                        </span>
                      ) : (
                        <span
                          className="join-group"
                          onClick={(e) => {
                            e.stopPropagation();
                            joinGroup(group.name);
                          }}
                          title="Unirse al grupo"
                        >
                          ➕
                        </span>
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
        
        {/* Footer con botón de cerrar sesión */}
        <div className="users-list-footer">
          <button 
            onClick={handleLogout} 
            className="logout-button"
            title="Cerrar sesión"
          >
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
              <div className="chat-actions">
                <span className="chat-action">🔍</span>
                <div className="chat-action-menu">
                  <span className="chat-action" onClick={(e) => {
                    e.stopPropagation();
                    const menu = e.target.nextElementSibling;
                    if (menu) {
                      menu.classList.toggle('show');
                    }
                  }}>⋮</span>
                  <div className="chat-options-menu">
                    <div className="chat-option" onClick={(e) => {
                      e.stopPropagation();
                      e.target.parentNode.classList.remove('show');
                      deleteChat();
                    }}>
                      🗑️ Eliminar chat
                    </div>
                    <div className="chat-option" onClick={(e) => {
                      e.stopPropagation();
                      e.target.parentNode.classList.remove('show');
                      showSuccessAlert('Información', 'Esta función aún no está implementada');
                    }}>
                      🔇 Silenciar notificaciones
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="chat-history">
              {isDeletingChat && (
                <div className="delete-overlay">
                  <div className="delete-progress-container">
                    <div className="delete-progress-text">Eliminando chat...</div>
                    <div className="delete-progress-bar">
                      <div
                        className="delete-progress-fill"
                        style={{ width: `${deleteProgress}%` }}
                      ></div>
                    </div>
                    <div className="delete-progress-percentage">{Math.round(deleteProgress)}%</div>
                  </div>
                </div>
              )}
              <div className="debug-controls" style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 100 }}>
                <button
                  onClick={() => console.log('Todos los mensajes:', messages)}
                  style={{ fontSize: '10px', padding: '2px 5px' }}
                >
                  Debug
                </button>
              </div>
              {messages
                .filter(msg => {
                  // Log para depuración
                  console.log('Evaluando mensaje para mostrar:', msg);

                  if (msg.type === 'info' || msg.type === 'error') {
                    // Mostrar mensajes del sistema en todos los chats
                    console.log('Es un mensaje del sistema, se muestra');
                    return true;
                  } else if (isGroup) {
                    // Filtrar mensajes de grupo
                    const shouldShow = msg.isGroup && msg.receiver === to;
                    console.log('Es un mensaje de grupo, se muestra:', shouldShow);
                    return shouldShow;
                  } else {
                    // Filtrar mensajes individuales (conversación entre dos usuarios)
                    
                    // Si es un mensaje personal (a sí mismo)
                    if (to === username) {
                      const isPersonalMessage = msg.isSelf === true || (msg.sender === 'Tú' && msg.receiver === username && msg.isSent === true);
                      console.log('Mensaje personal:', {
                        isPersonalMessage,
                        sender: msg.sender,
                        isSent: msg.isSent,
                        to: to,
                        username: username
                      });
                      return isPersonalMessage;
                    }
                    
                    // Mensajes enviados por mí a este usuario
                    const isSentByMe = msg.sender === 'Tú' && msg.receiver === to;

                    // Mensajes recibidos de este usuario
                    const isReceivedFromThem = msg.sender === to && (msg.receiver === username || msg.receiver === to);

                    // Mostrar el mensaje si es parte de esta conversación
                    const shouldShow = !msg.isGroup && (isSentByMe || isReceivedFromThem);

                    console.log('Mensaje individual:', {
                      isSentByMe,
                      isReceivedFromThem,
                      shouldShow,
                      sender: msg.sender,
                      receiver: msg.receiver,
                      to,
                      username
                    });

                    return shouldShow;
                  }
                })
                .map((msg, idx) => {
                  if (msg.type === 'info') {
                    // Mensaje de información del sistema
                    return (
                      <div key={idx} className="message system info">
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-time">{msg.time}</div>
                        </div>
                      </div>
                    );
                  } else if (msg.type === 'error') {
                    // Mensaje de error del sistema
                    return (
                      <div key={idx} className="message system error">
                        <div className="message-content">
                          <div className="message-text">{msg.text}</div>
                          <div className="message-time">{msg.time}</div>
                        </div>
                      </div>
                    );
                  } else {
                    // Mensaje normal (enviado o recibido)
                    return (
                      <div key={idx} className={`message ${msg.isSent ? 'sent' : 'received'}`}>
                        <div className="message-content">
                          <div className="message-header">
                            {!msg.isSent && (
                              <div className="message-sender">
                                {msg.isGroup ? `${msg.sender} (en ${msg.receiver})` : msg.sender}
                              </div>
                            )}
                            <div className="message-options">
                              <div className="message-options-button" onClick={(e) => {
                                e.stopPropagation();
                                const optionsMenu = e.target.nextElementSibling;
                                if (optionsMenu) {
                                  optionsMenu.classList.toggle('show');
                                }
                              }}>
                                ⋮
                              </div>
                              <div className="message-options-menu">
                                {msg.mediaType && (
                                  <div className="message-option" onClick={(e) => {
                                    e.stopPropagation();
                                    // Crear un enlace temporal para descargar
                                    const link = document.createElement('a');
                                    link.href = msg.mediaData;
                                    link.download = msg.fileName || `${msg.mediaType === 'image' ? 'imagen' : 'video'}_${new Date().getTime()}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    e.target.parentNode.classList.remove('show');
                                  }}>
                                    📥 Descargar
                                  </div>
                                )}
                                <div className="message-option" onClick={(e) => {
                                  e.stopPropagation();
                                  showSuccessAlert(
                                    'Información del mensaje',
                                    `Enviado por: ${msg.sender}\nRecibido por: ${msg.receiver}\nHora: ${msg.time}\nEstado: ${msg.isSent ? 'Enviado ✓' : 'Recibido'}`
                                  );
                                  e.target.parentNode.classList.remove('show');
                                }}>
                                  ℹ️ Info
                                </div>
                                <div className="message-option" onClick={(e) => {
                                  e.stopPropagation();
                                  // Copiar al portapapeles
                                  const textToCopy = msg.text || (msg.mediaType === 'image' ? '[Imagen]' : '[Video]');
                                  navigator.clipboard.writeText(textToCopy).then(() => {
                                    showSuccessAlert('Éxito', 'Contenido copiado al portapapeles');
                                  });
                                  e.target.parentNode.classList.remove('show');
                                }}>
                                  📋 Copiar
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mostrar texto del mensaje si existe */}
                          {msg.text && (
                            <div className={`message-text ${msg.isLoading ? 'isLoading' : ''}`}>
                              {msg.text}
                              {msg.isLoading && <span className="loading-dots"></span>}
                            </div>
                          )}

                          {/* Mostrar contenido multimedia si existe */}
                          {msg.mediaType && (
                            <div className="message-media">
                              {msg.mediaType === 'image' ? (
                                <img
                                  src={msg.mediaData}
                                  alt="Imagen"
                                  className="message-image"
                                  onClick={() => {
                                    // Crear un elemento modal para mostrar la imagen en pantalla completa
                                    const modal = document.createElement('div');
                                    modal.className = 'image-modal';

                                    // Crear contenedor para la imagen
                                    const imageContainer = document.createElement('div');
                                    imageContainer.className = 'image-modal-content';

                                    // Crear la imagen
                                    const image = document.createElement('img');
                                    image.src = msg.mediaData;
                                    image.alt = 'Imagen ampliada';

                                    // Crear botón de cerrar
                                    const closeBtn = document.createElement('span');
                                    closeBtn.className = 'close-modal';
                                    closeBtn.innerHTML = '&times;';
                                    closeBtn.onclick = () => document.body.removeChild(modal);

                                    // Añadir elementos al DOM
                                    imageContainer.appendChild(image);
                                    modal.appendChild(closeBtn);
                                    modal.appendChild(imageContainer);
                                    document.body.appendChild(modal);

                                    // Cerrar modal al hacer clic fuera de la imagen
                                    modal.onclick = (e) => {
                                      if (e.target === modal) {
                                        document.body.removeChild(modal);
                                      }
                                    };
                                  }}
                                />
                              ) : msg.mediaType === 'video' ? (
                                <div className="video-container">
                                  {console.log('Renderizando video con datos:', {
                                    datosPresentes: !!msg.mediaData,
                                    longitudDatos: msg.mediaData ? msg.mediaData.length : 0,
                                    primeros100Chars: msg.mediaData ? msg.mediaData.substring(0, 100) : 'No hay datos'
                                  })}
                                  <video
                                    src={msg.mediaData}
                                    controls
                                    className="message-video"
                                    preload="metadata"
                                    controlsList="nodownload"
                                    onError={(e) => {
                                      console.error('Error al cargar el video:', e);
                                      e.target.parentNode.innerHTML = `
                                        <div class="video-error">
                                          <span>❌ Error al cargar el video</span>
                                          <button onclick="this.parentNode.parentNode.querySelector('video').load()">
                                            Reintentar
                                          </button>
                                        </div>
                                      `;
                                    }}
                                  />
                                  <div className="video-overlay">
                                    <span className="video-info">Video</span>
                                  </div>
                                  <div className="video-controls">
                                    <button
                                      className="video-download-button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Crear un enlace temporal para descargar
                                        const link = document.createElement('a');
                                        link.href = msg.mediaData;
                                        link.download = msg.fileName || `video_${new Date().getTime()}.mp4`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      title="Descargar video"
                                    >
                                      📥
                                    </button>
                                  </div>
                                </div>
                              ) : msg.mediaType === 'audio' ? (
                                <div className="audio-container">
                                  <audio
                                    src={msg.mediaData}
                                    controls
                                    className="message-audio"
                                    preload="metadata"
                                    controlsList="nodownload"
                                    onError={(e) => {
                                      console.error('Error al cargar el audio:', e);
                                      e.target.parentNode.innerHTML = `
                                        <div class="audio-error">
                                          <span>❌ Error al cargar el audio</span>
                                          <button onclick="this.parentNode.parentNode.querySelector('audio').load()">
                                            Reintentar
                                          </button>
                                        </div>
                                      `;
                                    }}
                                  />
                            
                                  <div className="audio-controls">
                                    <button
                                      className="audio-download-button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Crear un enlace temporal para descargar
                                        const link = document.createElement('a');
                                        link.href = msg.mediaData;
                                        link.download = msg.fileName || `audio_${new Date().getTime()}.mp3`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      title="Descargar audio"
                                    >
                                      📥
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="file-container">
                                  <div className="file-icon">
                                    {msg.fileExtension === 'pdf' ? '📄' :
                                     msg.fileExtension === 'doc' || msg.fileExtension === 'docx' ? '📝' :
                                     msg.fileExtension === 'xls' || msg.fileExtension === 'xlsx' ? '📊' :
                                     msg.fileExtension === 'ppt' || msg.fileExtension === 'pptx' ? '📑' :
                                     msg.fileExtension === 'txt' ? '📃' : '📁'}
                                  </div>
                                  <div className="file-info">
                                    <div className="file-name">{msg.fileName}</div>
                                    <div className="file-size">
                                      {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ''}
                                    </div>
                                  </div>
                                  <div className="file-controls">
                                    <button
                                      className="file-download-button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Crear un enlace temporal para descargar
                                        const link = document.createElement('a');
                                        link.href = msg.mediaData;
                                        link.download = msg.fileName || `archivo_${new Date().getTime()}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      title="Descargar archivo"
                                    >
                                      📥
                                    </button>
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
              {/* Vista previa de archivos multimedia */}
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
                              <div className="file-icon">
                                {preview.extension === 'pdf' ? '📄' :
                                 preview.extension === 'doc' || preview.extension === 'docx' ? '📝' :
                                 preview.extension === 'xls' || preview.extension === 'xlsx' ? '📊' :
                                 preview.extension === 'ppt' || preview.extension === 'pptx' ? '📑' :
                                 preview.extension === 'txt' ? '📃' : '📁'}
                              </div>
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

                {/* Botón para seleccionar archivos */}
                <label className="file-upload-button" title="Adjuntar archivos (máx. 5)">
                  <span>📎</span>
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    multiple
                  />
                </label>

                {isRecording ? (
                  <div className="recording-controls">
                    <div className="recording-indicator">
                      <span className="recording-dot"></span>
                      <span className="recording-time">{recordingTime}</span>
                    </div>
                    <button
                      className="recording-button stop"
                      onClick={stopRecording}
                      title="Enviar audio"
                    >
                      <span>✓</span>
                    </button>
                    <button
                      className="recording-button cancel"
                      onClick={cancelRecording}
                      title="Cancelar grabación"
                    >
                      <span>✕</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="mic-button"
                      onClick={startRecording}
                      title="Grabar audio"
                    >
                      <span>🎤</span>
                    </button>
                    <button className="send-button" onClick={sendMessage}>
                      <span>Enviar</span>
                    </button>
                  </>
                )}
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