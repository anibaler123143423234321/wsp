import { useState, useCallback, useRef, useEffect } from "react";
import apiService from "../apiService";

export const useMessagePagination = (roomCode, username) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentOffset = useRef(0);
  const MESSAGES_PER_PAGE = 20; // Cargar 20 mensajes por página

  // Cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    if (!roomCode) return;

    setIsLoading(true);
    currentOffset.current = 0;

    try {
      const historicalMessages = await apiService.getRoomMessages(
        roomCode,
        MESSAGES_PER_PAGE,
        0
      );

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
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time:
          msg.time ||
          new Date(msg.sentAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        mediaType: msg.mediaType,
        mediaData: msg.mediaData,
        fileName: msg.fileName,
        id: msg.id,
        sentAt: msg.sentAt,
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
  }, [roomCode, username]);

  // Cargar más mensajes antiguos (paginación estilo WhatsApp)
  const loadMoreMessages = useCallback(async () => {
    if (!roomCode || !hasMoreMessages || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const historicalMessages = await apiService.getRoomMessages(
        roomCode,
        MESSAGES_PER_PAGE,
        currentOffset.current
      );

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
        receiver: msg.groupName || msg.to || username,
        text: msg.message || "",
        isGroup: msg.isGroup,
        time:
          msg.time ||
          new Date(msg.sentAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        isSent: msg.from === username,
        isSelf: msg.from === username,
        mediaType: msg.mediaType,
        mediaData: msg.mediaData,
        fileName: msg.fileName,
        id: msg.id,
        sentAt: msg.sentAt,
      }));

      // Agregar mensajes más antiguos al inicio (estilo WhatsApp)
      setMessages((prevMessages) => [...formattedMessages, ...prevMessages]);
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
  }, [roomCode, username, hasMoreMessages, isLoadingMore]);

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

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMoreMessages(true);
    currentOffset.current = 0;
  }, []);

  // Limpiar mensajes cuando cambie el roomCode
  useEffect(() => {
    if (!roomCode) {
      clearMessages();
    }
  }, [roomCode, clearMessages]);

  return {
    messages,
    isLoading,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    clearMessages,
  };
};
