import { useState, useCallback, useRef, useEffect } from "react";
import apiService from "../apiService";

export const useMessagePagination = (roomCode, username, to = null, isGroup = false, socket = null, user = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [error, setError] = useState(null); //  Estado de error

  // 🔥 NUEVO: Estados para paginación bidireccional (búsqueda)
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [oldestLoadedId, setOldestLoadedId] = useState(null);
  const [newestLoadedId, setNewestLoadedId] = useState(null);
  const [aroundMode, setAroundMode] = useState(false); // Indica si estamos en modo "around"

  const currentOffset = useRef(0);
  const initialLoadComplete = useRef(false);
  const MESSAGES_PER_PAGE = 20;

  // Cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    // Si es un grupo, necesitamos roomCode
    // Si es individual, necesitamos 'to'
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;

    setIsLoading(true);
    setError(null); // Resetear error
    setHasMoreMessages(true); // IMPORTANTE: Resetear estado de "más mensajes"
    currentOffset.current = 0;
    initialLoadComplete.current = false; // Evitar carga inmediata de más mensajes

    try {
      let response;

      if (isGroup) {
        //  Cargar mensajes de sala/grupo ordenados por ID (para evitar problemas con sentAt corrupto)
        response = await apiService.getRoomMessagesOrderedById(
          roomCode,
          MESSAGES_PER_PAGE,
          0,
          isGroup, //  Pasar isGroup
          username //  Pasar username para validación
        );
      } else {
        //  🔥 FIX: Normalizar orden alfabético de nombres para que ambos usuarios usen la misma URL
        const [user1, user2] = [username, to].sort((a, b) => a.localeCompare(b));

        //  Cargar mensajes entre usuarios ordenados por ID (para evitar problemas con sentAt corrupto)
        response = await apiService.getUserMessagesOrderedById(
          user1,
          user2,
          MESSAGES_PER_PAGE,
          0,
          isGroup, //  Pasar isGroup
          roomCode //  Pasar roomCode (aunque sea null/undefined)
        );

        //  NO marcar automáticamente como leída al cargar mensajes
        // La conversación se marcará como leída solo cuando el usuario vea los mensajes
        // (esto se hace en ChatPage.jsx cuando se cargan los mensajes iniciales)
      }

      //  NUEVO: Manejar respuesta paginada del backend
      // El backend ahora puede devolver { data, total, hasMore, page, totalPages } o un array directamente
      let historicalMessages = Array.isArray(response) ? response : (response?.data || []);

      //  FIX: Filtrar mensajes de hilo - no deben aparecer en el chat principal
      //  Robustez: Verificar también thread_id y parentMessageId por si el backend cambia el formato
      if (!isGroup && historicalMessages.length > 0) {
        console.log('🔍 [DEBUG] Estructura de mensaje (Assigned):', historicalMessages[0]);
      }
      historicalMessages = historicalMessages.filter(msg => !msg.threadId && !msg.thread_id && !msg.parentMessageId);

      const backendHasMore = response?.hasMore;

      // Verificar si hay error en la respuesta
      if (
        response.statusCode &&
        (response.statusCode === 500 ||
          response.statusCode === 503)
      ) {
        setMessages([]);
        setHasMoreMessages(false);
        setError("Error al cargar mensajes. Por favor intenta de nuevo."); //  Setear error
        return;
      }

      // Convertir mensajes de BD al formato del frontend
      const formattedMessages = historicalMessages.map((msg) => ({
        sender: msg.from === username ? "Tú" : msg.from,
        realSender: msg.from, //  Nombre real del remitente (sin convertir a "Tú")
        senderRole: msg.senderRole || null, //  Incluir role del remitente
        senderNumeroAgente: msg.senderNumeroAgente || null, //  Incluir numeroAgente del remitente
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time:
          msg.time ||
          new Date(msg.sentAt).toLocaleTimeString('es-ES', {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        isRead: msg.isRead || false, // Estado de lectura del mensaje
        readByCount: msg.readByCount || 0, // Cantidad de lectores (lazy loading)
        readBy: null, // Se carga bajo demanda con getMessageReadBy
        mediaType: msg.mediaType,
        mediaData: msg.mediaData, // Ahora es URL en lugar de Base64
        fileName: msg.fileName,
        fileSize: msg.fileSize, // Tamaño del archivo en bytes
        id: msg.id,
        sentAt: msg.sentAt,
        // Campos de respuesta
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender, //  Mantener el valor original de la BD
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null, //  Incluir numeroAgente del remitente original
        replyToText: msg.replyToText,
        // Campos de hilos
        threadCount: msg.threadCount || 0,
        unreadThreadCount: msg.unreadThreadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        lastReplyText: msg.lastReplyText || null, //  NUEVO: Texto del último mensaje del hilo
        // 🔥 NUEVO: Calcular si hay menciones pendientes en el hilo
        hasUnreadThreadMentions: (msg.unreadThreadCount > 0 && msg.lastReplyText)
          ? (() => {
            // Detectar menciones en lastReplyText
            const mentionRegex = /@([a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
            const mentions = [];
            let match;
            while ((match = mentionRegex.exec(msg.lastReplyText)) !== null) {
              mentions.push(match[1].trim().toUpperCase());
            }
            const userNameUpper = username.toUpperCase();
            return mentions.some(mention =>
              userNameUpper.includes(mention) || mention.includes(userNameUpper)
            );
          })()
          : false,
        // Campos de edición
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        //  Campos de eliminación
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        //  Campos de reacciones
        reactions: msg.reactions || [],
        //  NUEVO: Campos de videollamada
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        //  NUEVO: Campo de reenvío
        isForwarded: msg.isForwarded || false,
        attachments: msg.attachments || [],
      }));

      // Los mensajes ya vienen en orden cronológico correcto del backend
      setMessages(formattedMessages);
      currentOffset.current = MESSAGES_PER_PAGE;

      //  MEJORADO: Usar hasMore del backend si está disponible, sino estimar
      if (backendHasMore !== undefined) {
        setHasMoreMessages(backendHasMore);
      } else if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar mensajes históricos:", error);
      setMessages([]);
      setHasMoreMessages(false);
      setError("No se pudieron cargar los mensajes. Verifica tu conexión."); //  Setear error
    } finally {
      setIsLoading(false);
      initialLoadComplete.current = true;
    }
  }, [roomCode, username, to, isGroup]);

  // Cargar más mensajes antiguos (paginación estilo WhatsApp)
  const loadMoreMessages = useCallback(async () => {
    // Validar según el tipo de conversación
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;
    if (!hasMoreMessages || isLoadingMore) return;
    if (!initialLoadComplete.current) return;
    // Evitar cargar "más" si el offset es 0 (aún no se cargó inicial), salvo en modo around
    if (currentOffset.current === 0 && !aroundMode) return;

    setIsLoadingMore(true);

    try {
      let response;

      // 🔄 LÓGICA DIFERENCIADA: Paginación normal (Offset) vs Paginación "Around" (Cursor ID)
      if (aroundMode) {
        // --- MODO AROUND (Cargar ANTES de oldestLoadedId) ---
        if (!oldestLoadedId) {
          console.warn("⚠️ aroundMode activo pero sin oldestLoadedId");
          setIsLoadingMore(false);
          return;
        }

        console.log(`📜 Cargando mensajes ANTES del ID: ${oldestLoadedId}`);

        if (isGroup) {
          response = await apiService.getRoomMessagesBeforeId(roomCode, oldestLoadedId, MESSAGES_PER_PAGE);
        } else {
          response = await apiService.getUserMessagesBeforeId(username, to, oldestLoadedId, MESSAGES_PER_PAGE);
        }

      } else {
        // --- MODO NORMAL (Offset) ---
        if (isGroup) {
          response = await apiService.getRoomMessagesOrderedById(
            roomCode,
            MESSAGES_PER_PAGE,
            currentOffset.current,
            isGroup,
            username // Pasar username para validación
          );
        } else {
          //  🔥 FIX: Normalizar orden alfabético de nombres para que ambos usuarios usen la misma URL
          const [user1, user2] = [username, to].sort((a, b) => a.localeCompare(b));

          response = await apiService.getUserMessagesOrderedById(
            user1,
            user2,
            MESSAGES_PER_PAGE,
            currentOffset.current,
            isGroup,
            roomCode
          );
        }
      }

      //  Manejar respuesta paginada del backend
      let historicalMessages = Array.isArray(response) ? response : (response?.data || []);

      //  FIX: Filtrar mensajes de hilo
      historicalMessages = historicalMessages.filter(msg => !msg.threadId && !msg.thread_id && !msg.parentMessageId);

      const backendHasMore = response?.hasMore;

      // Verificar si hay error en la respuesta
      if (
        response.statusCode &&
        (response.statusCode === 500 ||
          response.statusCode === 503)
      ) {
        console.warn("⚠️ Error del servidor al cargar más mensajes");
        setHasMoreMessages(false);
        return;
      }

      if (historicalMessages.length === 0) {
        // Si no hay más mensajes, marcar hasMore como false
        setHasMoreMessages(false);
        if (aroundMode) setHasMoreBefore(false);
        return;
      }

      // Convertir mensajes de BD al formato del frontend
      const formattedMessages = historicalMessages.map((msg) => ({
        sender: msg.from === username ? "Tú" : msg.from,
        realSender: msg.from,
        senderRole: msg.senderRole || null,
        senderNumeroAgente: msg.senderNumeroAgente || null,
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time:
          msg.time ||
          new Date(msg.sentAt).toLocaleTimeString('es-ES', {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        isRead: msg.isRead || false,
        readByCount: msg.readByCount || 0,
        readBy: null,
        mediaType: msg.mediaType,
        mediaData: msg.mediaData,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        id: msg.id,
        sentAt: msg.sentAt,
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender,
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null,
        replyToText: msg.replyToText,
        threadCount: msg.threadCount || 0,
        unreadThreadCount: msg.unreadThreadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        lastReplyText: msg.lastReplyText || null,
        // 🔥 NUEVO: Calcular si hay menciones pendientes en el hilo
        hasUnreadThreadMentions: (msg.unreadThreadCount > 0 && msg.lastReplyText)
          ? (() => {
            const mentionRegex = /@([a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
            const mentions = [];
            let match;
            while ((match = mentionRegex.exec(msg.lastReplyText)) !== null) {
              mentions.push(match[1].trim().toUpperCase());
            }
            const userNameUpper = username.toUpperCase();
            return mentions.some(mention =>
              userNameUpper.includes(mention) || mention.includes(userNameUpper)
            );
          })()
          : false,
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        reactions: msg.reactions || [],
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        isForwarded: msg.isForwarded || false,
        attachments: msg.attachments || [],
      }));

      // Agregar mensajes más antiguos al inicio
      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map(m => m.id));
        const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));

        // 🔥 Actualizar oldestLoadedId con el ID más antiguo del nuevo lote
        if (aroundMode && newMessages.length > 0) {
          // Como vienen ordenados cronológicamente (más antiguo al inicio), 
          // el ID más pequeño debería ser el primero O el último dependiendo de cómo lo ordene el backend.
          // findByRoomBeforeId devuelve ordenado cronológicamente (ASC por fecha, o sea ID ascendente).
          // Entonces el mensaje [0] es el más antiguo.
          const firstMsg = newMessages[0];
          if (firstMsg && firstMsg.id) {
            setOldestLoadedId(firstMsg.id); // Actualizar cursor
          }
        }

        return [...newMessages, ...prevMessages];
      });

      if (!aroundMode) {
        currentOffset.current += MESSAGES_PER_PAGE;
      }

      // MEJORADO: Usar hasMore del backend si está disponible
      if (backendHasMore !== undefined) {
        setHasMoreMessages(backendHasMore);
        if (aroundMode) setHasMoreBefore(backendHasMore);
      } else if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
        if (aroundMode) setHasMoreBefore(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar más mensajes:", error);
    } finally {
      // 🔥 FIX: Delay para asegurar que React termine de renderizar antes de permitir scroll automático
      setTimeout(() => {
        setIsLoadingMore(false);
      }, 100);
    }
  }, [roomCode, username, to, isGroup, hasMoreMessages, isLoadingMore, aroundMode, oldestLoadedId]);

  // 🔥 CARGAR MENSAJES NUEVOS (hacia abajo, forward pagination)
  const loadMoreMessagesAfter = useCallback(async () => {
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;
    if (!aroundMode) return; // Solo tiene sentido en modo around
    if (!hasMoreAfter) return; // Ya no hay más mensajes nuevos
    if (isLoadingMore) return;
    if (!newestLoadedId) return;

    setIsLoadingMore(true);
    console.log(`📜 Cargando mensajes DESPUÉS del ID: ${newestLoadedId}`);

    try {
      let response;
      if (isGroup) {
        response = await apiService.getRoomMessagesAfterId(roomCode, newestLoadedId, MESSAGES_PER_PAGE);
      } else {
        response = await apiService.getUserMessagesAfterId(username, to, newestLoadedId, MESSAGES_PER_PAGE);
      }

      // Manejar respuesta
      let forwardMessages = Array.isArray(response) ? response : (response?.data || []);

      // Filtrar hilos
      forwardMessages = forwardMessages.filter(msg => !msg.threadId && !msg.thread_id && !msg.parentMessageId);

      const backendHasMore = response?.hasMore;

      if (forwardMessages.length === 0) {
        setHasMoreAfter(false);
        setIsLoadingMore(false);
        return;
      }

      // Convertir formato
      const formattedMessages = forwardMessages.map((msg) => ({
        sender: msg.from === username ? "Tú" : msg.from,
        realSender: msg.from,
        senderRole: msg.senderRole || null,
        senderNumeroAgente: msg.senderNumeroAgente || null,
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time: msg.time || new Date(msg.sentAt).toLocaleTimeString('es-ES', { hour: "2-digit", minute: "2-digit", hour12: false }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        isRead: msg.isRead || false,
        readByCount: msg.readByCount || 0,
        readBy: null,
        mediaType: msg.mediaType,
        mediaData: msg.mediaData,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        id: msg.id,
        sentAt: msg.sentAt,
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender,
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null,
        replyToText: msg.replyToText,
        threadCount: msg.threadCount || 0,
        unreadThreadCount: msg.unreadThreadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        lastReplyText: msg.lastReplyText || null,
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        reactions: msg.reactions || [],
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        isForwarded: msg.isForwarded || false,
        attachments: msg.attachments || [],
      }));

      // AGREGAR AL FINAL
      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map(m => m.id));
        const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));

        // Actualizar newestLoadedId con el último mensaje RECIBIDO del backend (independiente de si era duplicado)
        if (formattedMessages.length > 0) {
          const lastMsg = formattedMessages[formattedMessages.length - 1];
          // Solo actualizar si el ID es mayor al actual (por seguridad, aunque debería serlo por query ASC)
          if (lastMsg && lastMsg.id && (!newestLoadedId || lastMsg.id > newestLoadedId)) {
            console.log(`📍 Forward Pagination: Avanzando cursor newestLoadedId de ${newestLoadedId} a ${lastMsg.id}`);
            setNewestLoadedId(lastMsg.id);
          }
        }

        return [...prevMessages, ...newMessages];
      });

      if (backendHasMore !== undefined) {
        setHasMoreAfter(backendHasMore);
      } else if (forwardMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreAfter(false);
      }

    } catch (error) {
      console.error("❌ Error al cargar mensajes futuros:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomCode, username, to, isGroup, hasMoreAfter, isLoadingMore, aroundMode, newestLoadedId]);

  // Agregar nuevo mensaje (para mensajes en tiempo real)
  const addNewMessage = useCallback((message) => {
    console.log('📨 addNewMessage recibido:', { id: message.id, text: message.text || message.message });
    setMessages((prevMessages) => {
      // Verificar si el mensaje ya existe (evitar duplicados)
      const messageExists = prevMessages.some((msg) => {
        // Comparar por ID si ambos lo tienen (convertir a string para asegurar comparación correcta)
        if (msg.id && message.id) {
          return String(msg.id) === String(message.id);
        }

        // Para mensajes sin ID, permitir que pasen (el usuario prefiere ver duplicados a perder mensajes)
        // Esto soluciona problemas con hilos y mensajes rápidos
        return false;
      });

      if (messageExists) {
        console.log('⏭️ addNewMessage: Mensaje ID', message.id, 'YA EXISTE');
        console.log('📋 IDs en la lista actual:', prevMessages.map(m => m.id));
        const existingMsg = prevMessages.find(m => String(m.id) === String(message.id));
        console.log('📋 Mensaje existente:', existingMsg ? { id: existingMsg.id, text: existingMsg.text || existingMsg.message } : 'NO ENCONTRADO');
        return prevMessages;
      }

      console.log('✅ addNewMessage: Agregando mensaje ID', message.id, '- Total:', prevMessages.length + 1);
      return [...prevMessages, message];
    });
  }, []);

  // Función auxiliar para convertir tiempo HH:MM a minutos
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Actualizar un mensaje específico
  // Si updates es una función, se llama con el mensaje actual para calcular las actualizaciones
  //  NUEVO: Si messageId es null, buscar por videoRoomID en updates
  const updateMessage = useCallback((messageId, updates) => {
    // console.log('🔄 updateMessage llamado:', { messageId, updates });

    let messageFound = false;

    setMessages(prevMessages => {
      // console.log('📋 Total mensajes en estado:', prevMessages.length);

      const updatedMessages = prevMessages.map(msg => {
        let shouldUpdate = false;

        if (messageId !== null && messageId !== undefined) {
          // Buscar por ID
          shouldUpdate = String(msg.id) === String(messageId);
        } else if (updates.videoRoomID) {
          //  NUEVO: Buscar por videoRoomID
          // Caso normal: usar campo videoRoomID
          const searchRoomID = updates.videoRoomID;
          let msgRoomID = msg.videoRoomID;

          //  IMPORTANTE: Soportar mensajes antiguos sin videoRoomID
          // Intentar extraer el roomID desde la URL de la videollamada
          if (!msgRoomID) {
            let url = msg.videoCallUrl;
            const textToSearch = msg.text || msg.message;

            // Si no hay videoCallUrl, intentar buscar URL en el texto
            if (!url && typeof textToSearch === 'string') {
              const match = textToSearch.match(/http[s]?:\/\/[^\s]+/);
              if (match) url = match[0];
            }

            if (typeof url === 'string' && url.includes('roomID=')) {
              try {
                const query = url.split('?')[1];
                if (query) {
                  const params = new URLSearchParams(query);
                  const extractedRoomID = params.get('roomID');
                  if (extractedRoomID) {
                    msgRoomID = extractedRoomID;
                  }
                }
              } catch (e) {
                // console.warn('⚠️ No se pudo extraer roomID desde la URL del mensaje:', e);
              }
            }
          }

          shouldUpdate = msgRoomID === searchRoomID;

          if (msgRoomID) {
            // console.log('🔍 Comparando videoRoomID / URL:', {
            //   msgRoomID,
            //   searchRoomID,
            //   match: shouldUpdate
            // });
          }
        }

        if (shouldUpdate) {
          messageFound = true;

          // Si updates es una función, llamarla con el mensaje actual
          const newUpdates = typeof updates === 'function' ? updates(msg) : updates;

          //  FIX: Si la función retorna null o el mismo objeto, no actualizar (evita re-renders)
          if (newUpdates === null || newUpdates === msg) {
            return msg; // Sin cambios
          }

          //  NUEVO: Si se está actualizando metadata, fusionarlo con el existente
          if (newUpdates.metadata && msg.metadata) {
            newUpdates.metadata = { ...msg.metadata, ...newUpdates.metadata };
          }

          console.log('✅ Mensaje encontrado y actualizado:', {
            id: msg.id,
            videoRoomID: msg.videoRoomID,
            oldMetadata: msg.metadata,
            newMetadata: newUpdates.metadata
          });

          return { ...msg, ...newUpdates };
        }
        return msg;
      });

      if (!messageFound) {
        // console.log('❌ No se encontró ningún mensaje para actualizar');
      }

      return updatedMessages;
    });
  }, []);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMoreMessages(true);
    currentOffset.current = 0;
    // 🔥 Resetear modo "around" para permitir carga normal de mensajes
    setAroundMode(false);
    setHasMoreBefore(false);
    setHasMoreAfter(false);
    setOldestLoadedId(null);
    setNewestLoadedId(null);
  }, []);

  //  NUEVO: Establecer mensajes iniciales de una vez (para admin view)
  const setInitialMessages = useCallback((initialMessages) => {
    setMessages(initialMessages);
    currentOffset.current = initialMessages.length;

    // Si recibimos menos mensajes de los esperados, no hay más mensajes
    if (initialMessages.length < MESSAGES_PER_PAGE) {
      setHasMoreMessages(false);
    } else {
      setHasMoreMessages(true);
    }
  }, []);

  // 🔥 NUEVO: Cargar mensajes alrededor de un messageId específico (para búsqueda WhatsApp)
  const loadMessagesAroundId = useCallback(async (messageId) => {
    if (!messageId) return null;

    setIsLoading(true);
    setError(null);
    setAroundMode(true); // Activar modo "around"

    try {
      console.log('🔍 loadMessagesAroundId: Cargando mensajes alrededor de ID:', messageId);
      const response = await apiService.getMessagesAroundById(messageId, 25, 25);

      if (!response || response.statusCode === 404) {
        console.error('❌ Mensaje no encontrado:', messageId);
        setError('Mensaje no encontrado');
        return null;
      }

      let historicalMessages = response.messages || [];

      // Filtrar mensajes de hilo - no deben aparecer en el chat principal
      historicalMessages = historicalMessages.filter(msg => !msg.threadId && !msg.thread_id && !msg.parentMessageId);

      // Convertir mensajes de BD al formato del frontend
      const formattedMessages = historicalMessages.map((msg) => ({
        sender: msg.from === username ? "Tú" : msg.from,
        realSender: msg.from,
        senderRole: msg.senderRole || null,
        senderNumeroAgente: msg.senderNumeroAgente || null,
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time: msg.time || new Date(msg.sentAt).toLocaleTimeString('es-ES', {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        isRead: msg.isRead || false,
        readByCount: msg.readByCount || 0,
        readBy: null,
        mediaType: msg.mediaType,
        mediaData: msg.mediaData,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        id: msg.id,
        sentAt: msg.sentAt,
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender,
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null,
        replyToText: msg.replyToText,
        threadCount: msg.threadCount || 0,
        unreadThreadCount: msg.unreadThreadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        lastReplyText: msg.lastReplyText || null,
        // 🔥 NUEVO: Calcular si hay menciones pendientes en el hilo
        hasUnreadThreadMentions: (msg.unreadThreadCount > 0 && msg.lastReplyText)
          ? (() => {
            const mentionRegex = /@([a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+){0,3})(?=\s|$|[.,!?;:]|\n)/g;
            const mentions = [];
            let match;
            while ((match = mentionRegex.exec(msg.lastReplyText)) !== null) {
              mentions.push(match[1].trim().toUpperCase());
            }
            const userNameUpper = username.toUpperCase();
            return mentions.some(mention =>
              userNameUpper.includes(mention) || mention.includes(userNameUpper)
            );
          })()
          : false,
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        reactions: msg.reactions || [],
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        isForwarded: msg.isForwarded || false,
        attachments: msg.attachments || [],
      }));

      setMessages(formattedMessages);

      // Guardar info de paginación bidireccional
      setHasMoreBefore(response.hasMoreBefore || false);
      setHasMoreAfter(response.hasMoreAfter || false);
      setOldestLoadedId(response.oldestLoadedId || null);
      setNewestLoadedId(response.newestLoadedId || null);

      // También actualizar hasMoreMessages para compatibilidad
      setHasMoreMessages(response.hasMoreBefore || false);

      console.log('✅ loadMessagesAroundId: Cargados', formattedMessages.length, 'mensajes');
      console.log('📊 Paginación:', { hasMoreBefore: response.hasMoreBefore, hasMoreAfter: response.hasMoreAfter });

      return {
        targetMessageId: response.targetMessageId || messageId,
        conversationType: response.conversationType,
        conversationId: response.conversationId,
        roomCode: response.roomCode,
        isGroup: response.conversationType === 'group'
      };
    } catch (error) {
      console.error("❌ Error al cargar mensajes alrededor del ID:", error);
      setMessages([]);
      setHasMoreMessages(false);
      setError("No se pudieron cargar los mensajes.");
      return null;
    } finally {
      setIsLoading(false);
      initialLoadComplete.current = true;
    }
  }, [username]);

  // Limpiar mensajes cuando cambie el roomCode o el destinatario
  useEffect(() => {
    // Solo limpiar si realmente no hay contexto válido
    const shouldClear = (isGroup && !roomCode) || (!isGroup && !to);
    if (shouldClear) {
      clearMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, to, isGroup]);

  return {
    messages,
    isLoading,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    loadMoreMessagesAfter,
    addNewMessage,
    updateMessage,
    clearMessages,
    setInitialMessages,
    setMessages, //  NUEVO: Exponer para manipulación directa
    error, //  Retornar estado de error
    //  NUEVO: Para búsqueda WhatsApp
    loadMessagesAroundId,
    hasMoreBefore,
    hasMoreAfter,
    oldestLoadedId,
    newestLoadedId,
    aroundMode,
  };
};
