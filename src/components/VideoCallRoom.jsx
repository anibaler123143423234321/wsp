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
      // Si ya hay instancia o no hay contenedor, no hacer nada
      if (zegoInstanceRef.current || !meetingContainerRef.current) return;

      try {
        // 1️⃣ VERIFICACIÓN PREVIA DE MICROFONO (Tu lógica intacta)
        // Nota: Esto ayuda a mostrar el error antes de que Zego intente cargar
        try {
          const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          permissionStream.getTracks().forEach((t) => t.stop());
        } catch (err) {
          throw err; // Lanzamos el error para que lo capture el catch de abajo
        }

        // 2️⃣ GENERAR TOKEN
        const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID);
        const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET;

        if (!appID || !serverSecret) {
          setPermissionError("❌ Faltan credenciales en .env");
          return;
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomID,
          userID,
          displayName
        );

        // 3️⃣ CREAR INSTANCIA
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zegoInstanceRef.current = zp; // Guardamos referencia

        if (!mounted) return;

        // 4️⃣ UNIRSE A LA SALA
        zp.joinRoom({
          container: meetingContainerRef.current,
          scenario: { mode: ZegoUIKitPrebuilt.GroupCall },
          showScreenSharingButton: true,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: false,
          showMyMicrophoneToggleButton: true,
          showMyCameraToggleButton: true,
          showAudioVideoSettingsButton: true,
          showUserList: true,
          showTextChat: true, // A veces es útil activarlo

          sharedLinks: [
            {
              name: "Copiar enlace",
              url: window.location.origin + window.location.pathname + "?roomID=" + roomID,
            },
          ],

          onJoinRoom: () => console.log("✅ Entraste a la sala."),
          onLeaveRoom: () => console.log("👋 Saliste de la sala."),
        });

      } catch (error) {
        console.error("❌ Error:", error);
        if (!mounted) return;

        if (error.name === "NotAllowedError") {
          setPermissionError("🔒 Permiso denegado. Activa el micrófono en el navegador.");
        } else if (error.name === "NotReadableError") {
          setPermissionError("⚠️ Micrófono ocupado por otra app (Zoom/Meet).");
        } else if (error.name === "NotFoundError") {
          setPermissionError("❌ No se encontró micrófono.");
        } else {
          setPermissionError(`❌ Error: ${error.message}`);
        }
      }
    };

    initMeeting();

    // Cleanup (opcional, Zego maneja su propia limpieza al salir, 
    // pero reseteamos la ref por si el componente se desmonta)
    return () => {
      mounted = false;
      if (zegoInstanceRef.current) {
        try {
          // ZegoUIKitPrebuilt tiene un método destroy en versiones recientes, 
          // si no, basta con nullificar la ref y dejar que el DOM se limpie.
          if (typeof zegoInstanceRef.current.destroy === 'function') {
            zegoInstanceRef.current.destroy();
          }
        } catch (e) { console.log("Cleanup error", e) }
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