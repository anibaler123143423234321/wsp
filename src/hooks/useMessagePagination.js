import { useState, useCallback, useRef, useEffect } from "react";
import apiService from "../apiService";

export const useMessagePagination = (roomCode, username, to = null, isGroup = false, socket = null, user = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentOffset = useRef(0);
  const MESSAGES_PER_PAGE = 20; // Cargar 20 mensajes por página

  // Cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    // Si es un grupo, necesitamos roomCode
    // Si es individual, necesitamos 'to'
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;

    setIsLoading(true);
    currentOffset.current = 0;

    try {
      let historicalMessages;

      if (isGroup) {
        // Cargar mensajes de sala/grupo
        historicalMessages = await apiService.getRoomMessages(
          roomCode,
          MESSAGES_PER_PAGE,
          0
        );
      } else {
        // 🔥 Cargar mensajes entre usuarios ordenados por ID (para evitar problemas con sentAt corrupto)
        historicalMessages = await apiService.getUserMessagesOrderedById(
          username,
          to,
          MESSAGES_PER_PAGE,
          0
        );

        // 🔥 NO marcar automáticamente como leída al cargar mensajes
        // La conversación se marcará como leída solo cuando el usuario vea los mensajes
        // (esto se hace en ChatPage.jsx cuando se cargan los mensajes iniciales)
      }

      // Verificar si hay error en la respuesta
      if (
        historicalMessages.statusCode &&
        (historicalMessages.statusCode === 500 ||
          historicalMessages.statusCode === 503)
      ) {
        setMessages([]);
        setHasMoreMessages(false);
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
      }));

      // Los mensajes ya vienen en orden cronológico correcto del backend
      setMessages(formattedMessages);
      currentOffset.current = MESSAGES_PER_PAGE;

      // Si recibimos menos mensajes de los esperados, no hay más mensajes
      if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar mensajes históricos:", error);
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, username, to, isGroup]);

  // Cargar más mensajes antiguos (paginación estilo WhatsApp)
  const loadMoreMessages = useCallback(async () => {
    // Validar según el tipo de conversación
    if (isGroup && !roomCode) return;
    if (!isGroup && !to) return;
    if (!hasMoreMessages || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      let historicalMessages;

      if (isGroup) {
        // Cargar más mensajes de sala/grupo
        historicalMessages = await apiService.getRoomMessages(
          roomCode,
          MESSAGES_PER_PAGE,
          currentOffset.current
        );
      } else {
        // 🔥 Cargar más mensajes entre usuarios ordenados por ID
        historicalMessages = await apiService.getUserMessagesOrderedById(
          username,
          to,
          MESSAGES_PER_PAGE,
          currentOffset.current
        );
      }

      // Verificar si hay error en la respuesta
      if (
        historicalMessages.statusCode &&
        (historicalMessages.statusCode === 500 ||
          historicalMessages.statusCode === 503)
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
      }));

      // Agregar mensajes más antiguos al inicio (estilo WhatsApp)
      // 🔥 Filtrar duplicados por ID antes de agregar
      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map(m => m.id));
        const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));
        return [...newMessages, ...prevMessages];
      });
      currentOffset.current += MESSAGES_PER_PAGE;

      // Si recibimos menos mensajes de los esperados, no hay más mensajes
      if (historicalMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ Error al cargar más mensajes:", error);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomCode, username, to, isGroup, hasMoreMessages, isLoadingMore]);

  // Agregar nuevo mensaje (para mensajes en tiempo real)
  const addNewMessage = useCallback((message) => {
    setMessages((prevMessages) => {
      // Verificar si el mensaje ya existe (evitar duplicados)
      const messageExists = prevMessages.some((msg) => {
        // Comparar por ID si ambos lo tienen
        if (msg.id && message.id && msg.id === message.id) {
          return true;
        }

        // Para mensajes sin ID, comparar contenido y contexto
        const sameText = msg.text === message.text;
        const sameSender = msg.sender === message.sender;
        const sameReceiver = msg.receiver === message.receiver;
        const sameGroup = msg.isGroup === message.isGroup;

        // Si es el mismo texto, sender, receiver y tipo (grupo/individual)
        // considerarlo duplicado solo si el tiempo es muy cercano (dentro de 5 segundos)
        if (sameText && sameSender && sameReceiver && sameGroup) {
          // Si no hay tiempo, asumir que es duplicado
          if (!msg.time || !message.time) {
            return true;
          }

          // Comparar tiempos (formato HH:MM)
          const timeDiff = Math.abs(
            timeToMinutes(msg.time) - timeToMinutes(message.time)
          );

          // Si la diferencia es menor a 1 minuto, es duplicado
          return timeDiff < 1;
        }

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
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          // Si updates es una función, llamarla con el mensaje actual
          const newUpdates = typeof updates === 'function' ? updates(msg) : updates;
          return { ...msg, ...newUpdates };
        }
        return msg;
      })
    );
  }, []);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMoreMessages(true);
    currentOffset.current = 0;
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
  };
};
