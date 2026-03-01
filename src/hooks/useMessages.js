import { useState, useRef, useCallback, useEffect } from "react";
import whatsappSoundUrl from '../assets/sonidos/whatsapp_pc.mp3';
import mentionSoundUrl from '../assets/sonidos/etiqueta.mp3';

// ============================================================
// 🔊 SISTEMA DE SONIDO CON WEB AUDIO API
// Usa AudioContext + AudioBuffer para evitar bloqueos de autoplay.
// Solo necesita audioContext.resume() en la primera interacción
// del usuario (NO reproduce ningún sonido).
// ============================================================
let _audioCtx = null;
let _whatsappBuffer = null;
let _mentionBuffer = null;
let _audioReady = false;

function getAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Pre-cargar sonidos en AudioBuffers
async function preloadSound(url) {
  const ctx = getAudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

// Iniciar pre-carga al importar el módulo
(async () => {
  try {
    const [wb, mb] = await Promise.all([
      preloadSound(whatsappSoundUrl),
      preloadSound(mentionSoundUrl)
    ]);
    _whatsappBuffer = wb;
    _mentionBuffer = mb;
    _audioReady = true;
    console.log('🔊 Sonidos pre-cargados en AudioBuffers ✅');
  } catch (err) {
    console.warn('🔊 Error pre-cargando sonidos:', err);
  }
})();

// Desbloquear AudioContext en la primera interacción (NO produce sonido)
function unlockAudioOnInteraction() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('🔊 AudioContext desbloqueado por interacción del usuario ✅');
    }).catch(() => { });
  }
  // Remover listeners después de desbloquear
  document.removeEventListener('click', unlockAudioOnInteraction);
  document.removeEventListener('keydown', unlockAudioOnInteraction);
  document.removeEventListener('touchstart', unlockAudioOnInteraction);
}
document.addEventListener('click', unlockAudioOnInteraction);
document.addEventListener('keydown', unlockAudioOnInteraction);
document.addEventListener('touchstart', unlockAudioOnInteraction);

// Reproducir un AudioBuffer via Web Audio API
function playBuffer(buffer) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume(); // Intentar resumir por si acaso
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  return source;
}
// ============================================================

export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // URLs de archivos subidos
  const [isRecording, setIsRecording] = useState(false);
  const messageSound = useRef(null);
  const mentionSound = useRef(null);
  const lastPlayTime = useRef(0);
  const ringtoneSound = useRef(null);

  const playMessageSound = useCallback((soundsEnabled = true, isMention = false) => {
    if (!soundsEnabled) return;

    // Debounce de 500ms
    const now = Date.now();
    if (now - lastPlayTime.current < 500) {
      console.log('🔊 playMessageSound IGNORADO (debounce 500ms)');
      return;
    }
    lastPlayTime.current = now;

    const label = isMention ? 'etiqueta.mp3' : 'whatsapp_pc.mp3';
    console.log('🔊 playMessageSound llamado:', { soundsEnabled, isMention });

    //  Intentar Web Audio API primero (más confiable)
    if (_audioReady) {
      const buffer = isMention ? _mentionBuffer : _whatsappBuffer;
      if (buffer) {
        try {
          playBuffer(buffer);
          console.log('🔊 ✅ Sonido reproducido via Web Audio API:', label);
          return; // Éxito, no necesitamos fallback
        } catch (err) {
          console.warn('🔊 Web Audio API falló, intentando fallback:', err);
        }
      }
    }

    // Fallback: new Audio()
    try {
      const audio = new Audio(isMention ? mentionSoundUrl : whatsappSoundUrl);
      audio.play().then(() => {
        console.log('🔊 ✅ Sonido reproducido via new Audio():', label);
      }).catch((error) => {
        console.warn('🔊 ❌ Audio bloqueado:', error.name);
        // Último fallback: <audio> ref
        const ref = isMention ? mentionSound : messageSound;
        if (ref.current) {
          ref.current.currentTime = 0;
          ref.current.play().catch(() => { });
        }
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, []);

  const playRingtone = useCallback((soundsEnabled = true) => {
    if (!soundsEnabled) return;
    try {
      if (ringtoneSound.current) {
        ringtoneSound.current.currentTime = 0;
        ringtoneSound.current.play().catch((error) => {
          console.warn("Ringtone play failed:", error);
        });
      }
    } catch (error) {
      console.error("Error playing ringtone:", error);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    try {
      if (ringtoneSound.current) {
        ringtoneSound.current.pause();
        ringtoneSound.current.currentTime = 0;
      }
    } catch (error) {
      console.error("Error stopping ringtone:", error);
    }
  }, []);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      //  Límite actualizado a 70MB
      const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

      if (file.size > MAX_FILE_SIZE) {
        reject(new Error("El archivo es demasiado grande. Máximo 70MB."));
        return;
      }

      // ✅ Permitir todos los tipos de archivos
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // ✅ Permitir todos los tipos de archivos (imágenes, PDFs, documentos, etc.)
    // Ya no hay restricción de tipo de archivo

    //  Validar tamaño de cada archivo (70MB máximo) - ACTUALIZADO
    const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`❌ Algunos archivos superan el límite de 70MB:\n${oversizedFiles.map(f => `- ${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join('\n')}`);
      e.target.value = ''; // Limpiar el input
      return;
    }

    if (files.length > 5) {
      alert("❌ Máximo 5 archivos a la vez");
      e.target.value = ''; // Limpiar el input
      return;
    }

    setMediaFiles(files);

    const previewPromises = files.map((file) => fileToBase64(file));
    Promise.all(previewPromises)
      .then((results) => {
        const previews = results.map((data, index) => {
          const file = files[index];
          const fileType = file.type;

          // Determinar el tipo de archivo para el preview
          let displayType = 'file'; // Por defecto
          if (fileType.startsWith('image/')) {
            displayType = 'image';
          } else if (fileType === 'application/pdf') {
            displayType = 'pdf';
          } else if (fileType.startsWith('video/')) {
            displayType = 'video';
          } else if (fileType.startsWith('audio/')) {
            displayType = 'audio';
          } else if (fileType.includes('word') || fileType.includes('document')) {
            displayType = 'document';
          } else if (fileType.includes('sheet') || fileType.includes('excel')) {
            displayType = 'spreadsheet';
          }

          return {
            name: file.name,
            type: displayType,
            mimeType: fileType,
            data: data,
            size: file.size,
          };
        });
        setMediaPreviews(previews);
      })
      .catch((error) => {
        console.error("Error al procesar archivos:", error);
        alert("Error al procesar archivos: " + error.message);
        e.target.value = ''; // Limpiar el input
      });
  };

  const handleRemoveMediaFile = (index) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const cancelMediaUpload = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setUploadedFiles([]);
  };

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearInput = () => {
    setInput("");
    cancelMediaUpload();
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    mediaFiles,
    mediaPreviews,
    uploadedFiles,
    setUploadedFiles,
    isRecording,
    setIsRecording,
    messageSound,
    mentionSound, //  NUEVO: Exportar ref del sonido de menciones
    playMessageSound,
    ringtoneSound, //  Exportar ref
    playRingtone,  //  Exportar función play
    stopRingtone,  //  Exportar función stop
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    addMessage,
    clearMessages,
    clearInput,
  };
};

