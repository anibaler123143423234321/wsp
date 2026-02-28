import { useState, useRef, useEffect, useMemo } from 'react';
import { useSocket } from "./useSocket";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

function randomID(len = 5) {
    let chars = "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP";
    let result = "";
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function getUrlParams(url = window.location.href) {
    let urlStr = url.split("?")[1];
    return new URLSearchParams(urlStr);
}

export const useVideoCall = (roomID, meetingContainerRef) => {
    const zegoInstanceRef = useRef(null);
    const socketRef = useRef(null);
    const [permissionError, setPermissionError] = useState(null);
    const [showEndCallButton, setShowEndCallButton] = useState(false);
    const [roomCode, setRoomCode] = useState(null);
    const [isGroup, setIsGroup] = useState(false);

    const { displayName, userID, userRole } = useMemo(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                return {
                    displayName: (user.nombre && user.apellido && `${user.nombre} ${user.apellido}`) || user.username || "Usuario",
                    userID: String((user.username || user.id) + '_' + randomID(5)),
                    userRole: user.role || null
                };
            }
        } catch (e) {
            console.error("Error leyendo usuario:", e);
        }
        return { displayName: "Usuario", userID: randomID(8), userRole: null };
    }, []);

    useEffect(() => {
        if (roomID.startsWith('group_')) {
            setIsGroup(true);
            setRoomCode(roomID.replace('group_', ''));
        } else {
            setIsGroup(false);
            setRoomCode(null);
        }
    }, [roomID]);

    //  USAR EL HOOK DE SOCKET PRINCIPAL
    const userFull = useMemo(() => {
        try {
            const userStr = localStorage.getItem("user");
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) { return null; }
    }, []);

    const socket = useSocket(!!userFull, displayName, userFull);

    useEffect(() => {
        if (!socket) return;
        socketRef.current = socket;

        const handleConnect = () => {
            socket.emit("joinVideoRoom", { roomID, username: displayName });
        };

        if (socket.connected) {
            handleConnect();
        } else {
            socket.on("connect", handleConnect);
        }

        const handleVideoCallEnded = (data) => {
            alert(data.message || "La videollamada ha finalizado");
            window.close();
            setTimeout(() => { window.location.href = "about:blank"; }, 1000);
        };

        socket.on("videoCallEnded", handleVideoCallEnded);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("videoCallEnded", handleVideoCallEnded);
        };
    }, [socket, displayName, roomID]);


    useEffect(() => {
        let mounted = true;
        const initMeeting = async () => {
            if (zegoInstanceRef.current || !meetingContainerRef.current) return;
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasMicrophone = devices.some(d => d.kind === "audioinput");
                const hasCamera = devices.some(d => d.kind === "videoinput");

                if (!hasMicrophone) {
                    setPermissionError("❌ No se detectó ningún micrófono.");
                    return;
                }

                const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID);
                const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET;
                const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, displayName);
                const zp = ZegoUIKitPrebuilt.create(kitToken);
                zegoInstanceRef.current = zp;

                if (!mounted) return;

                zp.joinRoom({
                    container: meetingContainerRef.current,
                    showPreJoinView: hasCamera,
                    scenario: { mode: ZegoUIKitPrebuilt.GroupCall },
                    turnOnMicrophoneWhenJoining: true,
                    turnOnCameraWhenJoining: false,
                    showMyMicrophoneToggleButton: true,
                    showMyCameraToggleButton: hasCamera,
                    showAudioVideoSettingsButton: true,
                    showUserList: true,
                    showTextChat: true,
                    sharedLinks: [{ name: "Copiar enlace", url: window.location.origin + window.location.pathname + "?roomID=" + roomID }],
                    onJoinRoom: () => {
                        const privilegedRoles = ['ADMIN', 'PROGRAMADOR', 'COORDINADOR', 'JEFEPISO'];
                        if (userRole && privilegedRoles.includes(userRole.toUpperCase())) {
                            setShowEndCallButton(true);
                        }
                    },
                    onLeaveRoom: () => {
                        console.log("👋 onLeaveRoom disparado by Zego.");
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
    }, [roomID, userID, displayName, userRole]);

    const handleEndCall = () => {
        const privilegedRoles = ['ADMIN', 'PROGRAMADOR', 'COORDINADOR', 'JEFEPISO'];
        if (!userRole || !privilegedRoles.includes(userRole.toUpperCase())) {
            alert("Solo los administradores, programadores, coordinadores y jefes de piso pueden cerrar la videollamada para todos");
            return;
        }
        if (window.confirm("¿Estás seguro de que quieres cerrar la videollamada para todos?") && socketRef.current) {
            socketRef.current.emit("endVideoCall", { roomID, roomCode, closedBy: displayName, isGroup });
            setTimeout(() => { window.close(); }, 500);
        }
    };

    return { permissionError, showEndCallButton, handleEndCall };
};
