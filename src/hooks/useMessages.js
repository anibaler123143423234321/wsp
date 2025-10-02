import { useState, useRef, useCallback } from "react";

export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // URLs de archivos subidos
  const [isRecording, setIsRecording] = useState(false);
  const messageSound = useRef(null);

  const playMessageSound = useCallback((soundsEnabled = false) => {
    if (!soundsEnabled) {
      return;
    }

    try {
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        messageSound.current.play().catch(() => {
          // Silenciar errores de autoplay - es normal
        });
      }
    } catch {
      // Silenciar errores de sonido
    }
  }, []);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error("El archivo es demasiado grande. Máximo 50MB."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 5) {
      alert("Máximo 5 archivos a la vez");
      return;
    }

    setMediaFiles(files);

    const previewPromises = files.map((file) => fileToBase64(file));
    Promise.all(previewPromises)
      .then((results) => {
        const previews = results.map((data, index) => ({
          name: files[index].name,
          type: files[index].type.split("/")[0],
          data: data,
          size: files[index].size, // Guardar el tamaño del archivo
        }));
        setMediaPreviews(previews);
      })
      .catch((error) => {
        console.error("Error al procesar archivos:", error);
        alert("Error al procesar archivos: " + error.message);
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
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    addMessage,
    clearMessages,
    clearInput,
  };
};
