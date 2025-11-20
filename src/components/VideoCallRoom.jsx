import * as React from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

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

  // Referencia al contenedor del DOM
  const meetingContainerRef = React.useRef(null);
  // Referencia para asegurar que Zego solo se inicie una vez
  const zegoInstanceRef = React.useRef(null);

  const [permissionError, setPermissionError] = React.useState(null);

  // -------------------------------
  // 👤 OBTENER USUARIO
  // -------------------------------
  const { displayName, userID } = React.useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          displayName: (user.nombre && user.apellido && `${user.nombre} ${user.apellido}`) || user.username || "Usuario",
          userID: String(user.id || user.username || randomID(8))
        };
      }
    } catch (e) {
      console.error("Error leyendo usuario:", e);
    }
    return { displayName: "Usuario", userID: randomID(8) };
  }, []);

  // --------------------------------------------------------
  // 🔥 EFECTO PRINCIPAL: INICIAR VIDEOLLAMADA
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
        const hasCamera = videoInput.length > 0; // En tu caso, esto es false (0)

        console.log(`🎤 Micros: ${audioInput.length}, 📷 Cámaras: ${videoInput.length}`);

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

          // 🔥 SI NO HAY CÁMARA, SALTATE LA VISTA PREVIA
          // Esto evita que Zego intente cargar el video antes de entrar
          showPreJoinView: hasCamera,

          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },

          // Configuración de medios
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: false, // Siempre apagado al iniciar
          showMyMicrophoneToggleButton: true,
          showMyCameraToggleButton: hasCamera, // Ocultar botón si no hay cámara
          showAudioVideoSettingsButton: true,

          showUserList: true,
          showTextChat: true,

          sharedLinks: [
            {
              name: "Copiar enlace",
              url: window.location.origin + window.location.pathname + "?roomID=" + roomID,
            },
          ],

          onJoinRoom: () => console.log("✅ Entraste a la sala."),
          onError: (error) => console.warn("⚠️ Error Zego:", error)
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
  }, [roomID, userID, displayName]);

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

      {/* Contenedor de la llamada */}
      <div ref={meetingContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}