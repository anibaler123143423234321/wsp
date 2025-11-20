import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaTimes,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaSpinner,
} from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import apiService from "../apiService";
import AudioPlayer from "./AudioPlayer";
import VoiceRecorder from "./VoiceRecorder";

import "./ThreadPanel.css";
import "./ThreadPanelWrapper.css";

const ThreadPanel = ({
  message,
  onClose,
  currentUsername,
  socket,
  onSendMessage,
}) => {
  const [threadMessages, setThreadMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentThreadCount, setCurrentThreadCount] = useState(
    message?.threadCount || 0
  );
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [panelWidth, setPanelWidth] = useState(450); // Ancho inicial del panel
  const [isResizing, setIsResizing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);

  // Agregar clase al body cuando el hilo está abierto y ajustar margen del chat
  useEffect(() => {
    document.body.classList.add("thread-open");

    // Ajustar el margen del chat content según el ancho del panel
    const chatContent = document.querySelector(
      ".flex-1.flex.flex-col.bg-white"
    );
    if (chatContent && window.innerWidth > 768) {
      chatContent.style.marginRight = `${panelWidth}px`;
    }

    return () => {
      document.body.classList.remove("thread-open");
      const chatContent = document.querySelector(
        ".flex-1.flex.flex-col.bg-white"
      );
      if (chatContent) {
        chatContent.style.marginRight = "0";
      }
    };
  }, [panelWidth]);

  // Cargar mensajes del hilo


  // Actualizar el contador cuando cambia el mensaje
  useEffect(() => {
    setCurrentThreadCount(message?.threadCount || 0);
  }, [message?.threadCount]);

  // Scroll automático al final
  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  // Cerrar emoji picker al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escuchar nuevos mensajes del hilo
  useEffect(() => {
    if (!socket) return;

    const handleThreadMessage = (newMessage) => {
      // // console.log('🧵 ThreadPanel recibió threadMessage:', newMessage);
      // // console.log('  - threadId del mensaje:', newMessage.threadId);
      // // console.log('  - threadId esperado:', message?.id);
      // // console.log('  - ¿Coinciden?:', newMessage.threadId === message?.id);

      if (newMessage.threadId === message?.id) {
        // // console.log('✅ ThreadId coincide, procesando mensaje...');
        // 🔥 CONFIAR EN EL BACKEND - Agregar el mensaje sin verificar duplicados
        setThreadMessages((prev) => {
          // // console.log('📋 Mensajes actuales en el hilo:', prev.length);

          // Verificar duplicados solo por ID real
          const messageExists = prev.some((msg) => msg.id === newMessage.id);

          if (messageExists) {
            // // console.log('⏭️ Mensaje ya existe (mismo ID), ignorando');
            return prev;
          }

          // // console.log('✅ Agregando nuevo mensaje al hilo:', newMessage);
          return [...prev, newMessage];
        });

        // 🔥 CONFIAR EN EL BACKEND - NO incrementar contador localmente
        // El contador se actualizará via threadCountUpdated desde el backend
      }
    };

    const handleThreadCountUpdated = (data) => {
      // Solo actualizar si es para este hilo específico
      if (data.messageId === message?.id) {
        console.log(
          `🔢 ThreadPanel actualizando contador para hilo ${data.messageId}`
        );
        setCurrentThreadCount((prev) => prev + 1);
      }
    };

    socket.on("threadMessage", handleThreadMessage);
    socket.on("threadCountUpdated", handleThreadCountUpdated);

    return () => {
      socket.off("threadMessage", handleThreadMessage);
      socket.off("threadCountUpdated", handleThreadCountUpdated);
    };
  }, [socket, message?.id, currentUsername]);

  // Manejo del redimensionamiento del panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 350;
      const maxWidth = window.innerWidth * 0.6; // Máximo 60% del ancho de la ventana

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const loadThreadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getThreadMessages(message.id);
      setThreadMessages(data);
      // Actualizar el contador con la cantidad real de mensajes cargados
      setCurrentThreadCount(data.length);
    } catch (error) {
      console.error("Error al cargar mensajes del hilo:", error);
    } finally {
      setLoading(false);
    }
  }, [message.id]);

  // useEffect para cargar mensajes cuando se abre el hilo
  useEffect(() => {
    if (message?.id) {
      loadThreadMessages();
    }
  }, [loadThreadMessages, message?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Función para convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error("El archivo es demasiado grande. Máximo 10MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Manejar selección de archivos
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(
        `❌ Algunos archivos superan el límite de 10MB:\n${oversizedFiles
          .map((f) => `- ${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`)
          .join("\n")}`
      );
      e.target.value = "";
      return;
    }

    if (files.length > 5) {
      alert("❌ Máximo 5 archivos a la vez");
      e.target.value = "";
      return;
    }

    setMediaFiles(files);

    const previewPromises = files.map((file) => fileToBase64(file));
    Promise.all(previewPromises)
      .then((results) => {
        const previews = results.map((data, index) => {
          const file = files[index];
          const fileType = file.type;
          let type = "file";
          if (fileType.startsWith("image/")) type = "image";
          else if (fileType.startsWith("video/")) type = "video";
          else if (fileType.startsWith("audio/")) type = "audio";
          else if (fileType === "application/pdf") type = "pdf";
          else if (fileType.includes("document") || fileType.includes("word"))
            type = "document";
          else if (fileType.includes("sheet") || fileType.includes("excel"))
            type = "spreadsheet";

          return {
            data,
            name: file.name,
            size: file.size,
            type,
          };
        });
        setMediaPreviews(previews);
      })
      .catch((error) => {
        console.error("Error al procesar archivos:", error);
        alert("Error al procesar archivos: " + error.message);
        e.target.value = "";
      });
  };

  // Remover archivo de la lista
  const handleRemoveMediaFile = (index) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  // Cancelar subida de archivos
  const cancelMediaUpload = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
  };

  const handleSend = async () => {
    if (!input.trim() && mediaFiles.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        text: input,
        threadId: message.id,
        from: currentUsername,
        to: message.from === currentUsername ? message.to : message.from,
        isGroup: message.isGroup,
        roomCode: message.roomCode,
      };

      // Si hay archivos, subirlos primero
      if (mediaFiles.length > 0) {
        const file = mediaFiles[0]; // Por ahora solo soportamos un archivo a la vez en hilos
        const uploadResult = await apiService.uploadFile(file, "chat");

        messageData.mediaType = file.type.split("/")[0];
        messageData.mediaData = uploadResult.fileUrl;
        messageData.fileName = uploadResult.fileName;
        messageData.fileSize = uploadResult.fileSize;
      }

      // 🔥 CONFIAR EN EL BACKEND - NO agregar nada localmente
      // El socket devolverá el mensaje con threadMessage

      await onSendMessage(messageData);
      setInput("");
      cancelMediaUpload();
    } catch (error) {
      console.error("Error al enviar mensaje en hilo:", error);
      alert("Error al enviar el mensaje. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  // Manejar envío de mensaje de voz
  const handleSendVoiceMessage = async (audioFile) => {
    if (!audioFile) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      const messageData = {
        text: "",
        threadId: message.id,
        from: currentUsername,
        to: message.from === currentUsername ? message.to : message.from,
        isGroup: message.isGroup,
        roomCode: message.roomCode,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      };

      // 🔥 CONFIAR EN EL BACKEND - NO agregar nada localmente
      // El socket devolverá el mensaje con threadMessage

      await onSendMessage(messageData);
    } catch (error) {
      console.error("Error al enviar audio en hilo:", error);
      alert("Error al enviar el audio. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (msg) => {
    if (!msg) return "";

    // 🔥 IMPORTANTE: Si el mensaje tiene 'time' ya formateado, usarlo directamente
    // El backend ya envía 'time' en formato de Perú (HH:mm)
    if (msg.time) {
      return msg.time;
    }

    // Si solo tiene sentAt, usar directamente (backend ya formatea)
    if (msg.sentAt) {
      return msg.sentAt;
    }

    return "";
  };

  if (!message) return null;

  return (
    <div
      ref={panelRef}
      className="thread-panel"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Handle de redimensionamiento */}
      <div className="thread-resize-handle" onMouseDown={handleResizeStart} />

      <div className="thread-panel-header">
        <div className="thread-panel-title">
          <span className="thread-icon">🧵</span>
          <span>Hilo</span>
        </div>
        <button className="thread-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="thread-main-message">
        <div className="thread-main-message-header">
          <strong>{message.from}</strong>
          <span className="thread-main-message-time">
            {formatTime(message)}
          </span>
        </div>

        {/* Mostrar contenido según el tipo de mensaje */}
        {message.mediaType === "audio" && message.mediaData ? (
          <div className="thread-main-message-media">
            <AudioPlayer
              src={message.mediaData}
              fileName={message.fileName}
              onDownload={(src, fileName) => {
                const link = document.createElement("a");
                link.href = src;
                link.download = fileName || "audio";
                link.click();
              }}
              time={message.time || message.sentAt}
              isOwnMessage={message.from === currentUsername}
              isRead={message.isRead}
              isSent={message.isSent}
              readBy={message.readBy}
            />
          </div>
        ) : message.mediaType === "image" && message.mediaData ? (
          <div className="thread-main-message-media">
            <img
              src={message.mediaData}
              alt={message.fileName || "Imagen"}
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => window.open(message.mediaData, "_blank")}
            />
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : message.mediaType === "video" && message.mediaData ? (
          <div className="thread-main-message-media">
            <video
              src={message.mediaData}
              controls
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
              }}
            />
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : message.mediaType && message.mediaData ? (
          <div className="thread-main-message-media">
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📎</span>
              <span style={{ fontSize: "13px" }}>
                {message.fileName || "Archivo"}
              </span>
            </div>
            {message.text && (
              <div className="thread-main-message-text">{message.text}</div>
            )}
          </div>
        ) : (
          <div className="thread-main-message-text">{message.text}</div>
        )}

        <div className="thread-replies-count">
          {currentThreadCount}{" "}
          {currentThreadCount === 1 ? "respuesta" : "respuestas"}
        </div>
      </div>

      <div className="thread-messages">
        {loading ? (
          <div className="thread-loading">Cargando mensajes...</div>
        ) : threadMessages.length === 0 ? (
          <div className="thread-empty">
            <p>Sé el primero en responder en este hilo</p>
          </div>
        ) : (
          threadMessages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`thread-message ${
                msg.from === currentUsername
                  ? "thread-message-own"
                  : "thread-message-other"
              }`}
            >
              <div className="thread-message-header">
                <strong>{msg.from}</strong>
                <span className="thread-message-time">{formatTime(msg)}</span>
              </div>

              {/* Mostrar contenido multimedia si existe */}
              {msg.mediaType === "audio" && msg.mediaData ? (
                <div className="thread-message-media">
                  <AudioPlayer
                    src={msg.mediaData}
                    fileName={msg.fileName}
                    onDownload={(src, fileName) => {
                      const link = document.createElement("a");
                      link.href = src;
                      link.download = fileName || "audio";
                      link.click();
                    }}
                    time={msg.time || msg.sentAt}
                    isOwnMessage={msg.from === currentUsername}
                    isRead={msg.isRead}
                    isSent={msg.isSent}
                    readBy={msg.readBy}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : msg.mediaType === "image" && msg.mediaData ? (
                <div className="thread-message-media">
                  <img
                    src={msg.mediaData}
                    alt={msg.fileName || "Imagen"}
                    style={{
                      maxWidth: "180px",
                      maxHeight: "180px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(msg.mediaData, "_blank")}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : msg.mediaType === "video" && msg.mediaData ? (
                <div className="thread-message-media">
                  <video
                    src={msg.mediaData}
                    controls
                    style={{
                      maxWidth: "180px",
                      maxHeight: "180px",
                      borderRadius: "8px",
                    }}
                  />
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : msg.mediaType && msg.mediaData ? (
                <div className="thread-message-media">
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(msg.mediaData, "_blank")}
                  >
                    <span>📎</span>
                    <span style={{ fontSize: "13px" }}>
                      {msg.fileName || "Archivo"}
                    </span>
                  </div>
                  {msg.message && (
                    <div className="thread-message-text">
                      {msg.message || msg.text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="thread-message-text">
                  {msg.message || msg.text}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="thread-input-container">
        {/* Vista previa de archivos */}
        {mediaFiles.length > 0 && (
          <div className="thread-media-preview">
            {mediaPreviews.map((preview, index) => {
              const getFileIcon = (type) => {
                switch (type) {
                  case "image":
                    return "🖼️";
                  case "pdf":
                    return "📄";
                  case "video":
                    return "🎥";
                  case "audio":
                    return "🎵";
                  case "document":
                    return "📝";
                  case "spreadsheet":
                    return "📊";
                  default:
                    return "📎";
                }
              };

              return (
                <div key={index} className="thread-media-preview-item">
                  {preview.type === "image" ? (
                    <img
                      src={preview.data}
                      alt={preview.name}
                      className="thread-preview-image"
                    />
                  ) : (
                    <div className="thread-preview-file">
                      <div className="thread-preview-icon">
                        {getFileIcon(preview.type)}
                      </div>
                      <div className="thread-preview-name">{preview.name}</div>
                      <div className="thread-preview-size">
                        {preview.size > 1024 * 1024
                          ? `${(preview.size / 1024 / 1024).toFixed(1)} MB`
                          : `${(preview.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  )}
                  <button
                    className="thread-remove-media-btn"
                    onClick={() => handleRemoveMediaFile(index)}
                    title="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              className="thread-cancel-media-btn"
              onClick={cancelMediaUpload}
            >
              Cancelar
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="thread-emoji-picker" ref={emojiPickerRef}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={280}
              height={350}
            />
          </div>
        )}

        <div className="thread-input-wrapper">
          {/* Botón de adjuntar archivos */}
          <label
            className={`thread-attach-btn ${isSending ? "disabled" : ""}`}
            title="Adjuntar archivos"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              disabled={isSending}
            />
            <FaPaperclip />
          </label>

          {/* Botón de emoji */}
          <button
            className="thread-emoji-btn"
            onClick={() => !isSending && setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
            disabled={isSending}
          >
            <FaSmile />
          </button>

          <textarea
            className="thread-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Responder en hilo..."
            rows={1}
            disabled={isSending}
          />

          {/* Botón de grabación de voz */}
          <VoiceRecorder
            onSendAudio={handleSendVoiceMessage}
            canSendMessages={true}
          />

          <button
            className="thread-send-btn"
            onClick={handleSend}
            disabled={(!input.trim() && mediaFiles.length === 0) || isSending}
            title="Enviar"
          >
            {isSending ? (
              <FaSpinner className="thread-spinner" />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadPanel;
