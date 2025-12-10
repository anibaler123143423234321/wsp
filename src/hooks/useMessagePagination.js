import { useState, useCallback, useRef, useEffect } from "react";
import apiService from "../apiService";

export const useMessagePagination = (roomCode, username, to = null, isGroup = false, socket = null, user = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [error, setError] = useState(null); // 🔥 Estado de error

  const currentOffset = useRef(0);
  const initialLoadComplete = useRef(false); // 🔥 Prevenir carga inmediata post-inicial
  const MESSAGES_PER_PAGE = 15; // 🚀 Sincronizado con backend

  // Cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    // Si es un grupo, necesitamos roomCode
    // Si es individual, necesitamos 'to'
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;

    setIsLoading(true);
    setError(null); // 🔥 Resetear error
    setHasMoreMessages(true); // 🔥 IMPORTANTE: Resetear estado de "más mensajes"
    currentOffset.current = 0;
    initialLoadComplete.current = false; // 🔥 Evitar carga inmediata de más mensajes

    try {
      let response;

      if (isGroup) {
        // 🔥 Cargar mensajes de sala/grupo ordenados por ID (para evitar problemas con sentAt corrupto)
        response = await apiService.getRoomMessagesOrderedById(
          roomCode,
          MESSAGES_PER_PAGE,
          0,
          isGroup // 🔥 Pasar isGroup
        );
      } else {
        // 🔥 Cargar mensajes entre usuarios ordenados por ID (para evitar problemas con sentAt corrupto)
        response = await apiService.getUserMessagesOrderedById(
          username,
          to,
          MESSAGES_PER_PAGE,
          0,
          isGroup, // 🔥 Pasar isGroup
          roomCode // 🔥 Pasar roomCode (aunque sea null/undefined)
        );

        // 🔥 NO marcar automáticamente como leída al cargar mensajes
        // La conversación se marcará como leída solo cuando el usuario vea los mensajes
        // (esto se hace en ChatPage.jsx cuando se cargan los mensajes iniciales)
      }

      // 🔥 NUEVO: Manejar respuesta paginada del backend
      // El backend ahora puede devolver { data, total, hasMore, page, totalPages } o un array directamente
      const historicalMessages = Array.isArray(response) ? response : (response?.data || []);
      const backendHasMore = response?.hasMore;

      // Verificar si hay error en la respuesta
      if (
        response.statusCode &&
        (response.statusCode === 500 ||
          response.statusCode === 503)
      ) {
        setMessages([]);
        setHasMoreMessages(false);
        setError("Error al cargar mensajes. Por favor intenta de nuevo."); // 🔥 Setear error
        return;
      }

      // Convertir mensajes de BD al formato del frontend
      const formattedMessages = historicalMessages.map((msg) => ({
        sender: msg.from === username ? "Tú" : msg.from,
        realSender: msg.from, // 🔥 Nombre real del remitente (sin convertir a "Tú")
        senderRole: msg.senderRole || null, // 🔥 Incluir role del remitente
        senderNumeroAgente: msg.senderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente
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
        readBy: msg.readBy || [], // Lista de usuarios que leyeron el mensaje
        mediaType: msg.mediaType,
        mediaData: msg.mediaData, // Ahora es URL en lugar de Base64
        fileName: msg.fileName,
        fileSize: msg.fileSize, // Tamaño del archivo en bytes
        id: msg.id,
        sentAt: msg.sentAt,
        // Campos de respuesta
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender, // 🔥 Mantener el valor original de la BD
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente original
        replyToText: msg.replyToText,
        // Campos de hilos
        threadCount: msg.threadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        // Campos de edición
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        // 🔥 Campos de eliminación
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        // 🔥 Campos de reacciones
        reactions: msg.reactions || [],
        // 🔥 NUEVO: Campos de videollamada
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        // 🔥 NUEVO: Campo de reenvío
        isForwarded: msg.isForwarded || false,
      }));

      // Los mensajes ya vienen en orden cronológico correcto del backend
      setMessages(formattedMessages);
      currentOffset.current = MESSAGES_PER_PAGE;

      // 🔥 MEJORADO: Usar hasMore del backend si está disponible, sino estimar
      if (backendHasMore !== undefined) {
        setHasMoreMessages(backendHasMore);
      } else if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar mensajes históricos:", error);
      setMessages([]);
      setHasMoreMessages(false);
      setError("No se pudieron cargar los mensajes. Verifica tu conexión."); // 🔥 Setear error
    } finally {
      setIsLoading(false);
      // 🚀 OPTIMIZADO: Reducido de 500ms a 200ms para carga más rápida
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 200);
    }
  }, [roomCode, username, to, isGroup]);

  // Cargar más mensajes antiguos (paginación estilo WhatsApp)
  const loadMoreMessages = useCallback(async () => {
    // Validar según el tipo de conversación
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;
    if (!hasMoreMessages || isLoadingMore) return;
    if (!initialLoadComplete.current) return; // 🔥 Esperar a que termine la carga inicial

    setIsLoadingMore(true);

    try {
      let response;

      if (isGroup) {
        // 🔥 Cargar más mensajes de sala/grupo ordenados por ID
        response = await apiService.getRoomMessagesOrderedById(
          roomCode,
          MESSAGES_PER_PAGE,
          currentOffset.current,
          isGroup // 🔥 Pasar isGroup
        );
      } else {
        // 🔥 Cargar más mensajes entre usuarios ordenados por ID
        response = await apiService.getUserMessagesOrderedById(
          username,
          to,
          MESSAGES_PER_PAGE,
          currentOffset.current,
          isGroup, // 🔥 Pasar isGroup
          roomCode // 🔥 Pasar roomCode (aunque sea null/undefined)
        );
      }

      // 🔥 NUEVO: Manejar respuesta paginada del backend
      const historicalMessages = Array.isArray(response) ? response : (response?.data || []);
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
        setHasMoreMessages(false);
        return;
      }

      // Convertir mensajes de BD al formato del frontend
      const formattedMessages = historicalMessages.map((msg) => ({
        sender: msg.from === username ? " Tú" : msg.from,
        realSender: msg.from, // 🔥 Nombre real del remitente (sin convertir a "Tú")
        senderRole: msg.senderRole || null, // 🔥 Incluir role del remitente
        senderNumeroAgente: msg.senderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente
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
        readBy: msg.readBy || [], // Lista de usuarios que leyeron el mensaje
        mediaType: msg.mediaType,
        mediaData: msg.mediaData, // Ahora es URL en lugar de Base64
        fileName: msg.fileName,
        fileSize: msg.fileSize, // Tamaño del archivo en bytes
        id: msg.id,
        sentAt: msg.sentAt,
        // Campos de respuesta
        replyToMessageId: msg.replyToMessageId,
        replyToSender: msg.replyToSender, // 🔥 Mantener el valor original de la BD
        replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente original
        replyToText: msg.replyToText,
        // Campos de hilos
        threadCount: msg.threadCount || 0,
        lastReplyFrom: msg.lastReplyFrom || null,
        // Campos de edición
        isEdited: msg.isEdited || false,
        editedAt: msg.editedAt,
        // 🔥 Campos de eliminación
        isDeleted: msg.isDeleted || false,
        deletedBy: msg.deletedBy || null,
        deletedAt: msg.deletedAt || null,
        // 🔥 Campos de reacciones
        reactions: msg.reactions || [],
        // 🔥 NUEVO: Campos de videollamada
        type: msg.type || null,
        videoCallUrl: msg.videoCallUrl || null,
        videoRoomID: msg.videoRoomID || null,
        metadata: msg.metadata || null,
        // 🔥 NUEVO: Campo de reenvío
        isForwarded: msg.isForwarded || false,
      }));

      // Agregar mensajes más antiguos al inicio (estilo WhatsApp)
      // 🔥 Filtrar duplicados por ID antes de agregar
      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map(m => m.id));
        const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));
        return [...newMessages, ...prevMessages];
      });
      currentOffset.current += MESSAGES_PER_PAGE;

      // 🔥 MEJORADO: Usar hasMore del backend si está disponible, sino estimar
      if (backendHasMore !== undefined) {
        setHasMoreMessages(backendHasMore);
      } else if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar más mensajes:", error);
      // setHasMoreMessages(false); // 🔥 No deshabilitar paginación por error, permitir reintentar
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomCode, username, to, isGroup, hasMoreMessages, isLoadingMore]);

  // Agregar nuevo mensaje (para mensajes en tiempo real)
  const addNewMessage = useCallback((message) => {
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
        return prevMessages;
      }

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
  // 🔥 NUEVO: Si messageId es null, buscar por videoRoomID en updates
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
          // 🔥 NUEVO: Buscar por videoRoomID
          // Caso normal: usar campo videoRoomID
          const searchRoomID = updates.videoRoomID;
          let msgRoomID = msg.videoRoomID;

          // 🔥 IMPORTANTE: Soportar mensajes antiguos sin videoRoomID
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

          // 🔥 NUEVO: Si se está actualizando metadata, fusionarlo con el existente
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
  }, []);

  // 🔥 NUEVO: Establecer mensajes iniciales de una vez (para admin view)
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
    addNewMessage,
    updateMessage,
    clearMessages,
    setInitialMessages,
    error, // 🔥 Retornar estado de error
  };
};
