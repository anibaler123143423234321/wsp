import { useRef, useEffect } from "react";
import io from "socket.io-client";
import apiService from "../apiService"; // Asegúrate de que la ruta sea correcta

// 🔥 CONFIGURACIÓN DE INACTIVIDAD
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos sin actividad = desconexión
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // Heartbeat cada 5 minutos

export const useSocket = (isAuthenticated, username, user) => {
  const socket = useRef(null);
  const isConnecting = useRef(false);
  const connectionTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const idleTimeout = useRef(null);
  const lastActivityTime = useRef(Date.now());

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

    // 🔥 FUNCIÓN: Resetear timer de inactividad
    const resetIdleTimer = () => {
      lastActivityTime.current = Date.now();

      // Limpiar timeout anterior
      if (idleTimeout.current) {
        clearTimeout(idleTimeout.current);
      }

      // Solo configurar timeout si la pestaña está visible
      if (document.visibilityState === 'visible') {
        idleTimeout.current = setTimeout(() => {
          if (socket.current?.connected) {
            console.log("⏰ Desconectando por inactividad (30 min)...");

            // Notificar a la app antes de desconectar
            window.dispatchEvent(
              new CustomEvent("socketIdleDisconnect", {
                detail: { reason: "Desconectado por inactividad (30 min)" },
              })
            );

            socket.current.disconnect();
          }
        }, IDLE_TIMEOUT_MS);
      }
    };

    // 🔥 FUNCIÓN: Manejar actividad del usuario
    const handleUserActivity = () => {
      if (socket.current?.connected) {
        resetIdleTimer();
      }
    };

    const connectSocket = () => {
      try {
        // Usar variable de entorno o fallback a producción
        const socketUrl = import.meta.env.VITE_SOCKET_URL || "https://apisozarusac.com";
        //const socketUrl = "http://localhost:8747"; // Solo para desarrollo local

        socket.current = io(socketUrl, {
          transports: ["websocket", "polling"],
          timeout: 30000, // 🔥 REDUCIDO: 30s (antes 45s)
          path: "/BackendChat/socket.io/", // Ruta específica de tu backend
          //path: "/socket.io/", // Solo para desarrollo local
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          autoConnect: true,
          pingInterval: 15000, // 15s
          pingTimeout: 7000,   // 7s
        });

        // Timeout de seguridad por si la conexión se queda colgada
        connectionTimeout.current = setTimeout(() => {
          if (socket.current && !socket.current.connected) {
            console.warn("⚠️ Timeout de conexión socket agotado, desconectando...");
            isConnecting.current = false;
            socket.current.disconnect();
          }
        }, 35000); // 🔥 REDUCIDO: 35s (antes 50s)

        // =================================================
        // EVENTO: CONNECT
        // =================================================
        socket.current.on("connect", () => {
          clearTimeout(connectionTimeout.current);
          isConnecting.current = false;
          console.log("✅ Socket conectado:", socket.current.id);

          const displayName =
            user.nombre && user.apellido
              ? `${user.nombre} ${user.apellido}`
              : user.username || user.email;

          //  OPTIMIZADO: Solo enviamos datos del usuario.
          // Ya NO enviamos la lista gigante de conversaciones.
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
            // assignedConversations: [] // Eliminado para evitar sobrecarga
          });

          // 🔥 NUEVO: Iniciar heartbeat cada 5 minutos
          if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
          }
          heartbeatInterval.current = setInterval(() => {
            if (socket.current?.connected && document.visibilityState === 'visible') {
              socket.current.emit('heartbeat');
              console.log("💓 Heartbeat enviado");
            }
          }, HEARTBEAT_INTERVAL_MS);

          // 🔥 NUEVO: Iniciar timer de inactividad
          resetIdleTimer();

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

          const displayName =
            user.nombre && user.apellido
              ? `${user.nombre} ${user.apellido}`
              : user.username || user.email;

          // Re-registrar usuario de forma ligera
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
          });

          // 🔥 Reiniciar timer de inactividad en reconexión
          resetIdleTimer();
        });

        // =================================================
        // OTROS EVENTOS DE ESTADO
        // =================================================
        socket.current.on("disconnect", (reason) => {
          console.log("🔌 Socket desconectado:", reason);
          isConnecting.current = false;
          clearTimeout(connectionTimeout.current);
          clearInterval(heartbeatInterval.current);
          clearTimeout(idleTimeout.current);
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

        // 🔥 NUEVO: Listener para desconexión por inactividad desde el backend
        socket.current.on("idleDisconnect", (data) => {
          console.log("⏰ Servidor forzó desconexión por inactividad:", data.message);
          clearInterval(heartbeatInterval.current);
          clearTimeout(idleTimeout.current);

          window.dispatchEvent(
            new CustomEvent("socketIdleDisconnect", {
              detail: { reason: data.message },
            })
          );
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
        } else if (socket.current?.connected) {
          // 🔥 NUEVO: Reiniciar timer de inactividad al volver a la pestaña
          resetIdleTimer();
        }
      } else {
        // 🔥 NUEVO: Pausar timer de inactividad cuando la pestaña está oculta
        // Pero el socket permanece conectado para recibir notificaciones
        if (idleTimeout.current) {
          clearTimeout(idleTimeout.current);
        }
      }
    };

    // 🔥 NUEVO: Listeners para detectar actividad del usuario
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup al desmontar el hook
    return () => {
      clearTimeout(connectionTimeout.current);
      clearInterval(heartbeatInterval.current);
      clearTimeout(idleTimeout.current);

      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // 🔥 Remover listeners de actividad
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });

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