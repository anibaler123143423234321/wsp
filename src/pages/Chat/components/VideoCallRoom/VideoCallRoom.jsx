import * as React from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import io from "socket.io-client";

// Función auxiliar para ID aleatorio
function randomID(len = 5) {
  let chars = "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Función para obtener params de URL
export function getUrlParams(url = window.location.href) {
  let urlStr = url.split("?")[1];
  return new URLSearchParams(urlStr);
}

export default function VideoCallRoom() {
  const roomID = getUrlParams().get("roomID") || randomID(5);
  const isCreator = getUrlParams().get("creator") === "true"; // Detectar si es el creador

  // Referencia al contenedor del DOM
  const meetingContainerRef = React.useRef(null);
  // Referencia para asegurar que Zego solo se inicie una vez
  const zegoInstanceRef = React.useRef(null);
  // Referencia al socket
  const socketRef = React.useRef(null);

  const [permissionError, setPermissionError] = React.useState(null);
  const [showEndCallButton, setShowEndCallButton] = React.useState(false);

  //  NUEVO: Obtener información del grupo/chat desde localStorage
  const [roomCode, setRoomCode] = React.useState(null);
  const [isGroup, setIsGroup] = React.useState(false);

  // -------------------------------
  // 👤 OBTENER USUARIO
  // -------------------------------
  const { displayName, userID, userRole } = React.useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          displayName: (user.nombre && user.apellido && `${user.nombre} ${user.apellido}`) || user.username || "Usuario",
          // 🔥 FIX: Generar ID único por sesión para evitar conflictos en Zego
          // Si usamos el mismo ID que en el chat, Zego puede patearnos si detecta "duplicado"
          userID: String((user.id || user.username) + '_' + randomID(5)),
          userRole: user.role || null //  NUEVO: Obtener rol del usuario
        };
      }
    } catch (e) {
      console.error("Error leyendo usuario:", e);
    }
    return { displayName: "Usuario", userID: randomID(8), userRole: null };
  }, []);

  //  NUEVO: Extraer roomCode del roomID
  React.useEffect(() => {
    // El roomID tiene formato: "group_AD59B1D8" o "individual_username1_username2"
    if (roomID.startsWith('group_')) {
      setIsGroup(true);
      const extractedRoomCode = roomID.replace('group_', '');
      setRoomCode(extractedRoomCode);
      // console.log('🏠 Videollamada grupal detectada - roomCode:', extractedRoomCode);
    } else {
      setIsGroup(false);
      setRoomCode(null);
      // console.log('👤 Videollamada individual detectada');
    }
  }, [roomID]);

  // --------------------------------------------------------
  //  CONECTAR SOCKET PARA ESCUCHAR EVENTOS
  // --------------------------------------------------------
  React.useEffect(() => {
    // console.log("🔌 Iniciando conexión de socket en VideoCallRoom...");
    // console.log("   - roomID:", roomID);
    // console.log("   - displayName:", displayName);

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://apisozarusac.com";;


    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      timeout: 10000,
      path: "/socket.io/", //  FIX: Ya no repetimos /BackendChat porque vendrá en la URL o se manejará por proxy
      // path: "/BackendChat/socket.io/", // ANTES
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Intentar reconectar indefinidamente
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // console.log("✅ Socket conectado en VideoCallRoom - Socket ID:", socket.id);

      //  CRÍTICO: Unirse a la sala de video usando socket.join() del lado del servidor
      // Esto permite que el servidor emita eventos a todos los que estén en esta sala
      // console.log(`🏠 Uniéndose a sala de video: ${roomID}`);

      // Emitir evento personalizado para unirse a la sala de video
      socket.emit("joinVideoRoom", {
        roomID: roomID,
        username: displayName,
      });

      // console.log(`✅ Evento joinVideoRoom emitido para ${displayName} en sala ${roomID}`);
    });

    // Escuchar cuando el creador cierra la sala
    socket.on("videoCallEnded", (data) => {
      // console.log("📴 ¡EVENTO RECIBIDO! Videollamada cerrada:", data);
      // console.log("🔴 Cerrando ventana de videollamada...");

      // Mostrar alerta antes de cerrar
      alert(data.message || "La videollamada ha finalizado");

      // Cerrar la ventana
      window.close();

      // Si window.close() no funciona (algunas ventanas no se pueden cerrar), redirigir
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 1000);
    });

    return () => {
      socket.disconnect();
    };
  }, [displayName, roomID]);

  // --------------------------------------------------------
  //  FUNCIÓN PARA CERRAR LA SALA (SOLO CREADOR)
  // --------------------------------------------------------
  // --------------------------------------------------------
  //  FUNCIÓN PARA CERRAR LA SALA (SOLO ROLES PRIVILEGIADOS)
  // --------------------------------------------------------
  const handleEndCall = () => {
    //  Verificar si el usuario tiene un rol privilegiado
    const privilegedRoles = ['ADMIN', 'PROGRAMADOR', 'COORDINADOR', 'JEFEPISO'];
    const hasPrivilegedRole = userRole && privilegedRoles.includes(userRole.toUpperCase());
    if (!hasPrivilegedRole) {
      alert("Solo los administradores, programadores, coordinadores y jefes de piso pueden cerrar la videollamada para todos");
      return;
    }
    const confirmEnd = window.confirm(
      "¿Estás seguro de que quieres cerrar la videollamada para todos?"
    );
    if (confirmEnd && socketRef.current) {
      // console.log('🔴 Cerrando videollamada desde VideoCallRoom:', {
      //    roomID,
      //    roomCode,
      //      closedBy: displayName,
      //     isGroup,
      //     userRole
      //     });
      //  NUEVO: Usar los mismos parámetros que el banner
      socketRef.current.emit("endVideoCall", {
        roomID: roomID,
        roomCode: roomCode,
        closedBy: displayName,
        isGroup: isGroup
      });
      // console.log('✅ Evento endVideoCall emitido');
      // Cerrar la ventana después de notificar
      setTimeout(() => {
        window.close();
      }, 500);
    }
  };

  // --------------------------------------------------------
  //  EFECTO PRINCIPAL: INICIAR VIDEOLLAMADA
  // --------------------------------------------------------
  React.useEffect(() => {
    let mounted = true;

    const initMeeting = async () => {
      if (zegoInstanceRef.current || !meetingContainerRef.current) return;

      try {
        // 1️⃣ DETECTAR HARDWARE
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInput = devices.filter((d) => d.kind === "audioinput");
        const videoInput = devices.filter((d) => d.kind === "videoinput");

        const hasMicrophone = audioInput.length > 0;
        const hasCamera = videoInput.length > 0;

        // console.log(`🎤 Micros: ${audioInput.length}, 📷 Cámaras: ${videoInput.length}`);

        if (!hasMicrophone) {
          setPermissionError("❌ No se detectó ningún micrófono.");
          return;
        }

        // 2️⃣ GENERAR TOKEN
        const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID);
        const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomID,
          userID,
          displayName
        );

        // 3️⃣ CREAR INSTANCIA
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zegoInstanceRef.current = zp;

        if (!mounted) return;

        // 4️⃣ UNIRSE A LA SALA
        zp.joinRoom({
          container: meetingContainerRef.current,

          showPreJoinView: hasCamera,

          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },

          // Configuración de medios
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: false,
          showMyMicrophoneToggleButton: true,
          showMyCameraToggleButton: hasCamera,
          showAudioVideoSettingsButton: true,

          showUserList: true,
          showTextChat: true,

          sharedLinks: [
            {
              name: "Copiar enlace",
              url: window.location.origin + window.location.pathname + "?roomID=" + roomID,
            },
          ],

          onJoinRoom: () => {
            // console.log("✅ Entraste a la sala.");
            //  Mostrar botón de cerrar sala si tiene rol privilegiado
            const privilegedRoles = ['ADMIN', 'PROGRAMADOR', 'COORDINADOR', 'JEFEPISO'];
            const hasPrivilegedRole = userRole && privilegedRoles.includes(userRole.toUpperCase());
            if (hasPrivilegedRole) {
              setShowEndCallButton(true);
              // console.log('✅ Botón de cerrar sala habilitado para rol:', userRole);
            }
          },
          onLeaveRoom: () => {
            console.log("👋 onLeaveRoom disparado by Zego.");
            // DEBUG: No cerrar automáticamente para ver qué pasa
            // window.close();
            alert("Has salido de la sala (o Zego te sacó). Revisa la consola.");
          },
          onError: (error) => {
            console.warn("⚠️ Error Zego:", error);
            alert("Error Zego: " + JSON.stringify(error));
          }
        });

      } catch (error) {
        console.error("❌ Error fatal:", error);
      }
    };

    initMeeting();

    return () => {
      mounted = false;
      if (zegoInstanceRef.current) {
        if (typeof zegoInstanceRef.current.destroy === 'function') {
          zegoInstanceRef.current.destroy();
        }
        zegoInstanceRef.current = null;
      }
    };
  }, [roomID, userID, displayName, isCreator]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#f0f0f0" }}>
      {/* ❗ ALERTAS DE ERROR */}
      {permissionError && (
        <div style={{
          position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
          padding: "15px 25px", background: "#ffebee", color: "#c62828",
          borderRadius: "8px", zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          fontWeight: "600", display: "flex", gap: "10px", alignItems: "center"
        }}>
          <span>{permissionError}</span>
        </div>
      )}

      {/*  BOTÓN PARA CERRAR SALA (SOLO CREADOR) */}
      {showEndCallButton && isCreator && (
        <button
          onClick={handleEndCall}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "12px 24px",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            <path d="M21 8l-5-5v3h-6v4h6v3l5-5z" transform="rotate(135 15 10)" fill="white" />
          </svg>
          Cerrar Sala para Todos
        </button>
      )}

      {/* Contenedor de la llamada */}
      <div ref={meetingContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}