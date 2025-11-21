import { useRef, useEffect } from "react";
import io from "socket.io-client";
import apiService from "../apiService";

export const useSocket = (isAuthenticated, username, user) => {
  const socket = useRef(null);
  const isConnecting = useRef(false);
  const connectionTimeout = useRef(null);

  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }

    if (!isAuthenticated || !username || !user) {
      return;
    }

    if (socket.current?.connected) {
      return;
    }

    if (isConnecting.current) {
      return;
    }

    isConnecting.current = true;

    const connectSocket = () => {
      try {
        // Usar variable de entorno o fallback
        // const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://apisozarusac.com";
        const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:8747";

        socket.current = io(socketUrl, {
          transports: ["websocket", "polling"],
          timeout: 10000,
          path: "/socket.io/",
          // path: "/BackendChat/socket.io/",
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: Infinity, // Intentar reconectar indefinidamente
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          autoConnect: true,
        });

        // Timeout para la conexión
        connectionTimeout.current = setTimeout(() => {
          if (socket.current && !socket.current.connected) {
            isConnecting.current = false;
            socket.current.disconnect();
          }
        }, 15000);

        socket.current.on("connect", async () => {
          clearTimeout(connectionTimeout.current);
          isConnecting.current = false;
          const displayName =
            user.nombre && user.apellido
              ? `${user.nombre} ${user.apellido}`
              : user.username || user.email;

          // 🔥 Obtener conversaciones asignadas antes de registrar
          let assignedConversations = [];
          try {
            const result = await apiService.getAssignedConversationsPaginated(1, 100); // Obtener todas las conversaciones
            assignedConversations = result.conversations || [];
            // console.log(`✅ Conversaciones asignadas obtenidas: ${assignedConversations.length}`);
          } catch (error) {
            console.error("❌ Error al obtener conversaciones asignadas:", error);
          }

          socket.current.emit("register", {
            username: displayName,
            userData: {
              id: user.id,
              username: displayName,
              role: user.role || "USER",
              nombre: user.nombre,
              apellido: user.apellido,
              email: user.email,
              sede: user.sede,
              sede_id: user.sede_id,
              picture: user.picture || null,
              numeroAgente: user.numeroAgente || null,
            },
            assignedConversations, // 🔥 Enviar conversaciones asignadas
          });

          // Emitir evento personalizado para notificar la conexión
          window.dispatchEvent(
            new CustomEvent("socketConnected", {
              detail: { socket: socket.current },
            })
          );
        });

        socket.current.on("disconnect", () => {
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
        });

        socket.current.on("connect_error", (error) => {
          console.error("Error de conexión Socket.IO:", error);
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
        });

        socket.current.on("error", (error) => {
          console.error("Error en Socket.IO:", error);
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
        });

        socket.current.on("reconnect", async (attemptNumber) => {
          // console.log(`✅ Socket reconectado después de ${attemptNumber} intentos`);
          isConnecting.current = false;

          // Re-registrar usuario después de reconectar
          const displayName =
            user.nombre && user.apellido
              ? `${user.nombre} ${user.apellido}`
              : user.username || user.email;

          // 🔥 Obtener conversaciones asignadas antes de re-registrar
          let assignedConversations = [];
          try {
            const result = await apiService.getAssignedConversationsPaginated(1, 100); // Obtener todas las conversaciones
            assignedConversations = result.conversations || [];
            // console.log(`✅ Conversaciones asignadas obtenidas en reconexión: ${assignedConversations.length}`);
          } catch (error) {
            console.error("❌ Error al obtener conversaciones asignadas en reconexión:", error);
          }

          socket.current.emit("register", {
            username: displayName,
            userData: {
              id: user.id,
              username: displayName,
              role: user.role || "USER",
              nombre: user.nombre,
              apellido: user.apellido,
              email: user.email,
              sede: user.sede,
              sede_id: user.sede_id,
              picture: user.picture || null,
              numeroAgente: user.numeroAgente || null,
            },
            assignedConversations, // 🔥 Enviar conversaciones asignadas
          });
        });

        socket.current.on("reconnect_attempt", (attemptNumber) => {
          // console.log(`🔄 Intento de reconexión #${attemptNumber}`);
        });

        socket.current.on("reconnect_error", (error) => {
          console.error("Error de reconexión:", error);
        });

        socket.current.on("reconnect_failed", () => {
          console.error("Falló la reconexión del socket");
          isConnecting.current = false;
        });
      } catch (error) {
        console.error("Error al conectar Socket.IO:", error);
        isConnecting.current = false;
        clearTimeout(connectionTimeout.current);
      }
    };

    connectSocket();

    // Manejar cierre de ventana/pestaña
    const handleBeforeUnload = () => {
      if (socket.current && socket.current.connected) {
        // Desconectar el socket de forma síncrona
        socket.current.disconnect();
      }
    };

    // Manejar visibilidad de la página (importante para mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.current && !socket.current.connected) {
          socket.current.connect();
        }
      }
    };

    // Agregar listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(connectionTimeout.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      isConnecting.current = false;
    };
  }, [isAuthenticated, username, user]);

  return socket.current;
};