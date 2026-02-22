import * as React from "react";
import { useVideoCall, getUrlParams } from "../../../../hooks/useVideoCall";

const EndCallButton = ({ onClick }) => (
  <button
    onClick={onClick}
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
);

export default function VideoCallRoom() {
  const roomID = getUrlParams().get("roomID") || "defaultRoom";
  const isCreator = getUrlParams().get("creator") === "true";
  const meetingContainerRef = React.useRef(null);

  const { permissionError, showEndCallButton, handleEndCall } = useVideoCall(roomID, meetingContainerRef);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#f0f0f0" }}>
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

      {showEndCallButton && isCreator && <EndCallButton onClick={handleEndCall} />}

      <div ref={meetingContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
