import { useState, useRef, useCallback, useEffect } from 'react';
import Peer from 'simple-peer';

const ICE_SERVERS = {
  iceServers: [
    // Servidores STUN de Google (múltiples para redundancia)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // Servidores TURN públicos gratuitos - OpenRelay (más confiable)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },

    // Servidor TURN alternativo - Metered
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:80?transport=tcp',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp'
      ],
      username: 'e46a4c185d8e8bf88f484b1f',
      credential: 'Hx1C/LakqRPOsJRx'
    },

    // Servidor TURN alternativo - Numb
    {
      urls: [
        'turn:numb.viagenie.ca',
        'turn:numb.viagenie.ca?transport=tcp'
      ],
      username: 'webrtc@live.com',
      credential: 'muazkh'
    }
  ],
  // Configuración adicional para mejorar la conectividad
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Intentar todos los métodos (relay, srflx, host)
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

export const useWebRTC = (socket, username) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'
  const [isIncoming, setIsIncoming] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasCamera, setHasCamera] = useState(true);

  const peerConnection = useRef(null);
  const callTimerRef = useRef(null);
  const callerNameRef = useRef('');

  // Iniciar temporizador de llamada
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Detener temporizador de llamada
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Obtener stream local
  const getLocalStream = useCallback(async (video = false) => {
    try {
      const constraints = {
        audio: true,
        video: video ? { width: 1280, height: 720, facingMode: 'user' } : false
      };

      console.log('🎥 Solicitando permisos:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('❌ Error al obtener stream local:', error);

      // Si se solicitó video pero falló, intentar solo con audio
      if (video && error.name === 'NotFoundError') {
        console.log('⚠️ No se encontró cámara, intentando solo con audio...');
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(audioOnlyStream);
          alert('No se detectó cámara. La llamada continuará solo con audio.');
          return audioOnlyStream;
        } catch (audioError) {
          console.error('❌ Error al obtener audio:', audioError);
          alert('No se pudo acceder al micrófono. Verifica los permisos.');
          throw audioError;
        }
      }

      alert('No se pudo acceder a la cámara/micrófono. Verifica los permisos.');
      throw error;
    }
  }, []);

  // Iniciar llamada (caller - quien inicia)
  const startCall = useCallback(async (targetUser, type = 'audio') => {
    try {
      console.log(`📞 Iniciando llamada ${type} a:`, targetUser);
      setCallType(type);
      setCallerName(targetUser);
      callerNameRef.current = targetUser;
      setIsIncoming(false);
      setCallStatus('ringing');

      const stream = await getLocalStream(type === 'video');

      // Crear peer como iniciador
      const peer = new Peer({
        initiator: true,
        trickle: true, // ✅ Habilitar ICE trickling para mejor conectividad
        stream: stream,
        config: ICE_SERVERS,
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'video'
        }
      });

      // Cuando se genera la señal (offer)
      peer.on('signal', (signalData) => {
        console.log('📤 Enviando señal de llamada a:', targetUser);
        console.log('📤 Datos de la llamada:', {
          userToCall: targetUser,
          from: username,
          callType: type,
          socketConnected: socket?.connected
        });

        if (!socket || !socket.connected) {
          console.error('❌ Socket no conectado!');
          alert('Error: No hay conexión con el servidor');
          endCall();
          return;
        }

        socket.emit('callUser', {
          userToCall: targetUser,
          signalData: signalData,
          from: username,
          callType: type
        });
        console.log('✅ Evento callUser emitido');
      });

      // Cuando se recibe el stream remoto
      peer.on('stream', (remoteStream) => {
        console.log('📹 Stream remoto recibido');
        setRemoteStream(remoteStream);
        setCallStatus('connected');
        startCallTimer();
      });

      // Cuando se conecta
      peer.on('connect', () => {
        console.log('✅ Peer conectado');
      });

      // Cuando se cierra
      peer.on('close', () => {
        console.log('📴 Peer cerrado');
        endCall();
      });

      // Errores
      peer.on('error', (err) => {
        console.error('❌ Error en peer:', err);
        console.error('❌ Detalles del error:', {
          message: err.message,
          code: err.code,
          name: err.name
        });

        // Mensajes de error más descriptivos
        let errorMessage = 'Error en la conexión';
        if (err.message.includes('Connection failed')) {
          errorMessage = 'No se pudo establecer la conexión. Verifica tu conexión a internet o intenta de nuevo.';
        } else if (err.message.includes('Ice connection failed')) {
          errorMessage = 'Error de conectividad de red. Puede que tu firewall esté bloqueando la conexión.';
        }

        alert(errorMessage);
        endCall();
      });

      // 🔥 NUEVO: Monitorear estado de ICE para debugging
      peer._pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE Connection State:', peer._pc.iceConnectionState);
        if (peer._pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed - intentando reconectar...');
          // Intentar reiniciar ICE
          peer._pc.restartIce();
        }
      };

      peer._pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE Gathering State:', peer._pc.iceGatheringState);
      };

      peer._pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE Candidate:', event.candidate.type, event.candidate.protocol);
        } else {
          console.log('🧊 ICE Gathering completado');
        }
      };

      peerConnection.current = peer;

    } catch (error) {
      console.error('❌ Error al iniciar llamada:', error);
      endCall();
    }
  }, [socket, username, getLocalStream, startCallTimer]);

  // Aceptar llamada (receiver - quien recibe)
  const acceptCall = useCallback(async (signalData) => {
    try {
      console.log('✅ Aceptando llamada...');
      setCallStatus('connecting');

      const stream = await getLocalStream(callType === 'video');

      // Crear peer como receptor
      const peer = new Peer({
        initiator: false,
        trickle: true, // ✅ Habilitar ICE trickling para mejor conectividad
        stream: stream,
        config: ICE_SERVERS,
        answerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video'
        }
      });

      // Cuando se genera la señal (answer)
      peer.on('signal', (answerSignal) => {
        console.log('📤 Enviando respuesta de llamada a:', callerName);
        socket.emit('answerCall', {
          signal: answerSignal,
          to: callerName
        });
      });

      // Cuando se recibe el stream remoto
      peer.on('stream', (remoteStream) => {
        console.log('📹 Stream remoto recibido');
        setRemoteStream(remoteStream);
        setCallStatus('connected');
        startCallTimer();
      });

      // Cuando se conecta
      peer.on('connect', () => {
        console.log('✅ Peer conectado');
      });

      // Cuando se cierra
      peer.on('close', () => {
        console.log('📴 Peer cerrado');
        endCall();
      });

      // Errores
      peer.on('error', (err) => {
        console.error('❌ Error en peer:', err);
        console.error('❌ Detalles del error:', {
          message: err.message,
          code: err.code,
          name: err.name
        });

        // Mensajes de error más descriptivos
        let errorMessage = 'Error en la conexión';
        if (err.message.includes('Connection failed')) {
          errorMessage = 'No se pudo establecer la conexión. Verifica tu conexión a internet o intenta de nuevo.';
        } else if (err.message.includes('Ice connection failed')) {
          errorMessage = 'Error de conectividad de red. Puede que tu firewall esté bloqueando la conexión.';
        }

        alert(errorMessage);
        endCall();
      });

      // 🔥 NUEVO: Monitorear estado de ICE para debugging
      peer._pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE Connection State:', peer._pc.iceConnectionState);
        if (peer._pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed - intentando reconectar...');
          // Intentar reiniciar ICE
          peer._pc.restartIce();
        }
      };

      peer._pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE Gathering State:', peer._pc.iceGatheringState);
      };

      peer._pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE Candidate:', event.candidate.type, event.candidate.protocol);
        } else {
          console.log('🧊 ICE Gathering completado');
        }
      };

      // Señalar con la oferta recibida
      peer.signal(signalData);

      peerConnection.current = peer;

    } catch (error) {
      console.error('❌ Error al aceptar llamada:', error);
      endCall();
    }
  }, [socket, callerName, callType, getLocalStream, startCallTimer]);

  // Rechazar llamada
  const rejectCall = useCallback(() => {
    console.log('❌ Rechazando llamada...');
    socket.emit('callRejected', {
      to: callerName,
      from: username
    });
    endCall();
  }, [socket, username, callerName]);

  // Finalizar llamada
  const endCall = useCallback(() => {
    console.log('📴 Finalizando llamada...');

    // Notificar al otro usuario
    if (socket && socket.connected && callerName && callStatus !== 'idle') {
      socket.emit('callEnded', {
        to: callerName
      });
    }

    // Detener streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Destruir peer connection
    if (peerConnection.current) {
      peerConnection.current.destroy();
      peerConnection.current = null;
    }

    // Resetear estados
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setIsIncoming(false);
    setCallerName('');
    setIsMuted(false);
    setIsVideoOff(false);
    stopCallTimer();
  }, [socket, callerName, localStream, stopCallTimer, callStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Actualizar ref cuando cambia callerName
  useEffect(() => {
    callerNameRef.current = callerName;
  }, [callerName]);

  // Detectar si hay cámara disponible
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const cameraAvailable = videoDevices.length > 0;
        setHasCamera(cameraAvailable);
      } catch (error) {
        console.error('❌ Error al detectar cámara:', error);
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        peerConnection.current.destroy();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callStatus,
    isIncoming,
    callerName,
    callType,
    isMuted,
    isVideoOff,
    callDuration,
    hasCamera,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    peerConnection,
    setCallStatus,
    setIsIncoming,
    setCallerName,
    setCallType
  };
};

