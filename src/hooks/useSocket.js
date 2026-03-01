import { useRef, useEffect } from "react";
import io from "socket.io-client";
import apiService from "../apiService"; // Asegúrate de que la ruta sea correcta

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

    // Validaciones básicas antes de conectar
    if (!isAuthenticated || !username || !user) {
      return;
    }

    // Si ya está conectado, no hacer nada
    if (socket.current?.connected) {
      return;
    }

    // Evitar múltiples intentos simultáneos
    if (isConnecting.current) {
      return;
    }

    isConnecting.current = true;

    const connectSocket = () => {
      try {
        // Usar variable de entorno o fallback a producción
        const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://apisozarusac.com";
        //const socketUrl = "http://localhost:8747"; // Solo para desarrollo local

        socket.current = io(socketUrl, {
          transports: ["websocket", "polling"],
          timeout: 30000, // OPTIMIZADO: 45s - sincronizado con backend connectTimeout
          path: import.meta.env.VITE_SOCKET_PATH || "/BackendChat/socket.io/", // Ruta específica de tu backend
          //path: "/socket.io/", // Solo para desarrollo local
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          autoConnect: true,
          pingInterval: 10000, // 10s - sincronizado con backend (Bug 8)
          pingTimeout: 60000,  // 60s - mayor tolerancia para pestañas en segundo plano
        });

        // Timeout de seguridad por si la conexión se queda colgada
        connectionTimeout.current = setTimeout(() => {
          if (socket.current && !socket.current.connected) {
            console.warn("⚠️ Timeout de conexión socket agotado, desconectando...");
            isConnecting.current = false;
            socket.current.disconnect();
          }
        }, 35000); //  OPTIMIZADO: 50s - ligeramente mayor que backend connectTimeout (45s)

        // =================================================
        // EVENTO: CONNECT
        // =================================================
        socket.current.on("connect", () => {
          clearTimeout(connectionTimeout.current);
          isConnecting.current = false;
          console.log("✅ Socket conectado:", socket.current.id);

          // 🔍 DEBUG: Interceptar TODAS las emisiones de socket para diagnosticar
          const originalEmit = socket.current.emit.bind(socket.current);
          socket.current.emit = function (...args) {
            const eventName = args[0];
            if (eventName !== 'ping' && eventName !== 'pong') {
              console.log(`🔍 [SOCKET-EMIT] ${eventName}`, args.length > 1 ? args[1] : '');
              if (eventName.toLowerCase().includes('read') || eventName.toLowerCase().includes('mark')) {
                console.trace(`🚨 [SOCKET-EMIT-TRACE] ${eventName} emitido desde:`);
              }
            }
            return originalEmit(...args);
          };

          //  OPTIMIZADO: Solo enviamos datos del usuario.
          // Ya NO enviamos la lista gigante de conversaciones.
          //  FIX: Enviar user.username (DNI) como identificador principal
          socket.current.emit("register", {
            username: user.username,
            userData: {
              // id: user.id, //  REMOVIDO: Evitar usar ID de CRM irrelevante
              username: user.username,
              role: user.role || "USER",
              nombre: user.nombre,
              apellido: user.apellido,
              email: user.email,
              sede: user.sede,
              sede_id: user.sede_id,
              picture: user.picture || null,
              numeroAgente: user.numeroAgente || null,
            },
          });

          // Notificar a la app que el socket está listo
          window.dispatchEvent(
            new CustomEvent("socketConnected", {
              detail: { socket: socket.current },
            })
          );
        });

        // =================================================
        // EVENTO: RECONNECT
        // =================================================
        socket.current.on("reconnect", (attemptNumber) => {
          console.log(`🔄 Socket reconectado (intento ${attemptNumber})`);
          isConnecting.current = false;

          // Re-registrar usuario de forma ligera
          //  FIX: Enviar user.username (DNI) como identificador principal
          socket.current.emit("register", {
            username: user.username,
            userData: {
              // id: user.id, //  REMOVIDO: Evitar usar ID de CRM irrelevante
              username: user.username,
              role: user.role || "USER",
              nombre: user.nombre,
              apellido: user.apellido,
              email: user.email,
              sede: user.sede,
              sede_id: user.sede_id,
              picture: user.picture || null,
              numeroAgente: user.numeroAgente || null,
            },
          });
        });

        // =================================================
        // OTROS EVENTOS DE ESTADO
        // =================================================
        socket.current.on("disconnect", (reason) => {
          console.log("🔌 Socket desconectado:", reason);
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
        });

        socket.current.on("connect_error", (error) => {
          console.error("❌ Error de conexión Socket.IO:", error.message);
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
        });

        socket.current.on("error", (error) => {
          console.error("❌ Error genérico en Socket.IO:", error);
          isConnecting.current = false;
        });

      } catch (error) {
        console.error("❌ Error crítico al inicializar Socket.IO:", error);
        isConnecting.current = false;
        clearTimeout(connectionTimeout.current);
      }
    };

    connectSocket();

    // Manejar cierre de ventana/pestaña
    const handleBeforeUnload = () => {
      if (socket.current && socket.current.connected) {
        socket.current.disconnect();
      }
    };

    // Manejar visibilidad (re-conectar al volver a la pestaña)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.current && !socket.current.connected) {
          console.log("👀 Pestaña visible, intentando reconectar socket...");
          socket.current.connect();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup al desmontar el hook
    return () => {
      clearTimeout(connectionTimeout.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (socket.current) {
        console.log("🛑 Desmontando useSocket, desconectando...");
        socket.current.disconnect();
        socket.current = null;
      }
      isConnecting.current = false;
    };
  }, [isAuthenticated, username, user]); // Re-ejecutar solo si cambia el usuario

  return socket.current;
};
