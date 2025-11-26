import { useState, useRef, useCallback, useEffect } from "react";

export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // URLs de archivos subidos
  const [isRecording, setIsRecording] = useState(false);
  const messageSound = useRef(null);
  const ringtoneSound = useRef(null); // 🔥 Referencia para el tono de llamada

  const playMessageSound = useCallback((soundsEnabled = true) => {
    // 🔥 Reproducir sonido solo si está habilitado
    if (!soundsEnabled) return;

    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        messageSound.current.play().catch((error) => {
          // Silenciar errores de autoplay - es normal si no hay interacción previa
          console.warn("Audio play failed:", error);
        });
      }
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
      // 🔥 Límite actualizado a 70MB
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

    // 🔥 Validar tamaño de cada archivo (70MB máximo) - ACTUALIZADO
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
    playMessageSound,
    ringtoneSound, // 🔥 Exportar ref
    playRingtone,  // 🔥 Exportar función play
    stopRingtone,  // 🔥 Exportar función stop
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    addMessage,
    clearMessages,
    clearInput,
  };
};
