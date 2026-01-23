import useEnterToSend from "../../hooks/useEnterToSend";
import './ChatInput.css';


import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaMicrophone, FaTimes, FaReply, FaEdit } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';

import AttachMenu from '../../pages/Chat/components/AttachMenu/AttachMenu';
import VoiceRecorder from '../../pages/Chat/components/VoiceRecorder/VoiceRecorder';
import MediaPreviewList from '../../pages/Chat/components/MediaPreviewList/MediaPreviewList';




// Emoji Icon SVG (WhatsApp style)
const EmojiIcon = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        height="24"
        width="24"
        preserveAspectRatio="xMidYMid meet"
        className={className}
        fill="none"
    >
        <path
            d="M8.49893 10.2521C9.32736 10.2521 9.99893 9.5805 9.99893 8.75208C9.99893 7.92365 9.32736 7.25208 8.49893 7.25208C7.6705 7.25208 6.99893 7.92365 6.99893 8.75208C6.99893 9.5805 7.6705 10.2521 8.49893 10.2521Z"
            fill="currentColor"
        />
        <path
            d="M17.0011 8.75208C17.0011 9.5805 16.3295 10.2521 15.5011 10.2521C14.6726 10.2521 14.0011 9.5805 14.0011 8.75208C14.0011 7.92365 14.6726 7.25208 15.5011 7.25208C16.3295 7.25208 17.0011 7.92365 17.0011 8.75208Z"
            fill="currentColor"
        />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.8221 19.9799C15.5379 21.2537 13.8087 21.9781 12 22H9.27273C5.25611 22 2 18.7439 2 14.7273V9.27273C2 5.25611 5.25611 2 9.27273 2H14.7273C18.7439 2 22 5.25611 22 9.27273V11.8141C22 13.7532 21.2256 15.612 19.8489 16.9776L16.8221 19.9799ZM14.7273 4H9.27273C6.36068 4 4 6.36068 4 9.27273V14.7273C4 17.6393 6.36068 20 9.27273 20H11.3331C11.722 19.8971 12.0081 19.5417 12.0058 19.1204L11.9935 16.8564C11.9933 16.8201 11.9935 16.784 11.9941 16.7479C11.0454 16.7473 10.159 16.514 9.33502 16.0479C8.51002 15.5812 7.84752 14.9479 7.34752 14.1479C7.24752 13.9479 7.25585 13.7479 7.37252 13.5479C7.48919 13.3479 7.66419 13.2479 7.89752 13.2479L13.5939 13.2479C14.4494 12.481 15.5811 12.016 16.8216 12.0208L19.0806 12.0296C19.5817 12.0315 19.9889 11.6259 19.9889 11.1248V9.07648H19.9964C19.8932 6.25535 17.5736 4 14.7273 4ZM14.0057 19.1095C14.0066 19.2605 13.9959 19.4089 13.9744 19.5537C14.5044 19.3124 14.9926 18.9776 15.4136 18.5599L18.4405 15.5576C18.8989 15.1029 19.2653 14.5726 19.5274 13.996C19.3793 14.0187 19.2275 14.0301 19.0729 14.0295L16.8138 14.0208C15.252 14.0147 13.985 15.2837 13.9935 16.8455L14.0057 19.1095Z"
            fill="currentColor"
        />
    </svg>
);

/**
 * ChatInput - Reusable chat input component
 * 
 * @param {Object} props
 * @param {string} props.value - Input text value
 * @param {Function} props.onChange - Handler for text changes
 * @param {Function} props.onSend - Handler for sending message
 * @param {Function} props.onKeyDown - Keyboard event handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {boolean} props.canSendMessages - Permission flag
 * @param {Function} props.onFileSelect - File selection handler
 * @param {Function} props.onEmojiClick - Emoji selection handler
 * @param {Function} props.onSendAudio - Voice message handler
 * @param {Array} props.mediaFiles - Array of attached files
 * @param {Array} props.mediaPreviews - Array of media previews
 * @param {Function} props.onRemoveMediaFile - Handler to remove a media file
 * @param {Function} props.onCancelMediaUpload - Handler to cancel media upload
 * @param {boolean} props.isUploading - Uploading state
 * @param {boolean} props.isSending - Sending state
 * @param {boolean} props.isRecording - Recording state
 * @param {Object} props.replyingTo - Message being replied to
 * @param {Function} props.onCancelReply - Handler to cancel reply
 * @param {Object} props.editingMessage - Message being edited
 * @param {string} props.editText - Text being edited
 * @param {Function} props.onEditTextChange - Handler for edit text changes
 * @param {Function} props.onCancelEdit - Handler to cancel edit
 * @param {Function} props.onSaveEdit - Handler to save edit
 * @param {boolean} props.isEditingLoading - Edit loading state
 * @param {React.Ref} props.inputRef - Ref for textarea
 * @param {Function} props.onRecordingStart - Handler when recording starts
 * @param {Function} props.onRecordingStop - Handler when recording stops
 * @param {Function} props.onPaste - Handler for paste events
 * @param {Function} props.onOpenPollModal - Handler to open poll modal
 * @param {boolean} props.showMentionSuggestions - Whether to show mention suggestions
 * @param {Array} props.mentionSuggestions - Array of mention suggestions
 * @param {Function} props.onMentionSelect - Handler for selecting a mention
 * @param {string} props.mentionSearch - Current mention search string
 * @param {boolean} props.isGroup - Whether this is a group chat
 */
const ChatInput = ({
    value = "",
    onChange,
    onSend,
    onKeyDown,
    placeholder = "Escribe un mensaje",
    disabled = false,
    canSendMessages = true,
    onFileSelect,
    onEmojiClick,
    onSendAudio,
    mediaFiles = [],
    mediaPreviews = [],
    onRemoveMediaFile,
    onCancelMediaUpload,
    isUploading = false,
    isSending = false,
    isRecording = false,
    replyingTo = null,
    onCancelReply,
    editingMessage = null,
    editText = "",
    onEditTextChange,
    onCancelEdit,
    onSaveEdit,
    isEditingLoading = false,
    inputRef: externalInputRef,
    onRecordingStart,
    onRecordingStop,
    onPaste,
    onOpenPollModal,
    showMentionSuggestions = false,
    mentionSuggestions = [],
    onMentionSelect,
    isGroup = false,
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecordingLocal, setIsRecordingLocal] = useState(false);

    const internalInputRef = useRef(null);
    const inputRef = externalInputRef || internalInputRef;
    const emojiPickerRef = useRef(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showEmojiPicker]);

    const handleEmojiClick = (emojiData) => {
        if (onEmojiClick) {
            onEmojiClick(emojiData);
        }
        setShowEmojiPicker(false);
    };

    const handleRecordingStart = () => {
        setIsRecordingLocal(true);
        if (onRecordingStart) onRecordingStart();
    };

    const handleRecordingStop = () => {
        setIsRecordingLocal(false);
        if (onRecordingStop) onRecordingStop();
    };

    const isEditing = !!editingMessage;
    const currentValue = isEditing ? editText : value;
    const hasContent = currentValue.trim() || mediaFiles.length > 0;
    const showSendButton = hasContent || isEditing;

    const getPlaceholder = () => {
        if (isUploading) return "Subiendo archivo...";
        if (!canSendMessages) return "Solo puedes monitorear esta conversación";
        if (isEditing) return "Edita tu mensaje...";
        return placeholder;
    };

    const handleTextChange = (e) => {
        if (isEditing && onEditTextChange) {
            onEditTextChange(e.target.value);
        } else if (onChange) {
            onChange(e);
        }
    };

    const handleSendClick = () => {
        if (isEditing && onSaveEdit) {
            onSaveEdit();
        } else if (onSend) {
            onSend();
        }
    };

    // Usar el hook para manejar Enter
    const handleEnterKeyDown = useEnterToSend(handleSendClick, onKeyDown);

    return (
        <div className="chat-input-container">


            {/* Media Previews */}
            {mediaFiles.length > 0 && (
                <MediaPreviewList
                    previews={mediaPreviews}
                    onRemove={onRemoveMediaFile}
                    onCancel={onCancelMediaUpload}
                />
            )}

            {/* Reply Preview */}
            {replyingTo && (
                <div className="chat-input-preview reply">
                    <div className="chat-input-preview-content">
                        <div className="chat-input-preview-header">
                            <FaReply size={12} />
                            Respondiendo a {replyingTo.sender || replyingTo.from}
                        </div>
                        <div className="chat-input-preview-text">
                            {replyingTo.text || replyingTo.message || "Archivo multimedia"}
                        </div>
                    </div>
                    <button className="chat-input-preview-close" onClick={onCancelReply} title="Cancelar respuesta">
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Edit Preview */}
            {isEditing && (
                <div className="chat-input-preview edit">
                    <div className="chat-input-preview-content">
                        <div className="chat-input-preview-header">
                            <FaEdit size={12} />
                            Editando mensaje
                        </div>
                        <div className="chat-input-preview-text">
                            {editText || editingMessage?.fileName || editingMessage?.message || editingMessage?.text || "Mensaje original"}
                        </div>
                    </div>
                    <button className="chat-input-preview-close" onClick={onCancelEdit} title="Cancelar edición">
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Input Wrapper */}
            <div className={`chat-input-wrapper ${isRecordingLocal || isRecording ? "recording-mode" : ""}`}>
                {/* Attach Menu */}
                <AttachMenu
                    onFileSelectEvent={onFileSelect}
                    disabled={!canSendMessages}
                    onCreatePoll={onOpenPollModal}
                />

                {/* Emoji Button */}
                <div style={{ position: "relative" }} ref={emojiPickerRef}>
                    <button
                        className="chat-input-emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={!canSendMessages}
                        title="Emojis"
                    >
                        <EmojiIcon className="chat-input-emoji-icon" />
                    </button>

                    {showEmojiPicker && (
                        <div className="chat-input-emoji-picker">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                width={320}
                                height={400}
                                theme="light"
                                searchPlaceholder="Buscar emoji..."
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}
                </div>

                {/* Text Input Container */}
                <div style={{ position: "relative", flex: 1 }}>
                    {/* Upload Overlay */}
                    {isUploading && (
                        <div className="chat-input-upload-overlay">
                            <div className="chat-input-spinner"></div>
                            Subiendo archivo...
                        </div>
                    )}

                    {/* Highlight Overlay */}
                    <div
                        className="chat-input-highlights"
                        ref={useRef(null)} // Inline ref callback pattern to assign to a variabke if needed, or use a new useRef
                        id="highlight-layer"
                    >
                        {currentValue.split(/(@[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9_]+(?: [a-zA-ZÁÉÍÓÚÑáéíóúñ0-9_]+)*)/g).map((part, index) => {
                            if (part.startsWith('@')) {
                                return <span key={index} className="highlight-mention">{part}</span>;
                            }
                            return <span key={index}>{part}</span>;
                        })}
                        {/* Carácter invisible al final para asegurar altura correcta con salto de línea final */}
                        {currentValue.endsWith('\n') && <br />}
                    </div>

                    <textarea
                        ref={inputRef}
                        value={currentValue}
                        onChange={handleTextChange}
                        onKeyDown={handleEnterKeyDown}
                        onPaste={onPaste}
                        onScroll={(e) => {
                            const highlighter = document.getElementById('highlight-layer');
                            if (highlighter) highlighter.scrollTop = e.target.scrollTop;
                        }}
                        placeholder={getPlaceholder()}
                        className="chat-input-textarea"
                        disabled={isRecording || isRecordingLocal || !canSendMessages || isUploading || disabled}
                    />

                    {/* Mention Suggestions */}
                    {showMentionSuggestions && isGroup && mentionSuggestions.length > 0 && (
                        <div
                            className="chat-input-mention-list-v2"
                            style={{
                                backgroundColor: '#ffffff',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {mentionSuggestions.map((user, index) => {
                                const displayName = typeof user === "string"
                                    ? user
                                    : user.displayName || (user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : user.username || user.nombre || "");

                                return (
                                    <div
                                        key={index}
                                        className="chat-input-mention-item"
                                        onClick={() => onMentionSelect && onMentionSelect(user)}
                                    >
                                        <div
                                            className="chat-input-mention-avatar"
                                            style={{ background: user.picture ? `url(${user.picture}) center/cover` : "#667eea" }}
                                        >
                                            {!user.picture && displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="chat-input-mention-name">{displayName}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Voice Recorder or Send Button */}
                {!showSendButton ? (
                    <VoiceRecorder
                        onSendAudio={onSendAudio}
                        canSendMessages={canSendMessages}
                        onRecordingStart={handleRecordingStart}
                        onRecordingStop={handleRecordingStop}
                    />
                ) : (
                    <button
                        className="chat-input-send-btn"
                        onClick={handleSendClick}
                        disabled={
                            isEditing
                                ? !editText.trim() || isEditingLoading
                                : (!hasContent || !canSendMessages || isUploading || isSending)
                        }
                        title={
                            isEditing
                                ? isEditingLoading ? "Guardando..." : "Guardar cambios"
                                : isSending ? "Enviando..." : isUploading ? "Subiendo archivo..." : !canSendMessages ? "Solo lectura" : "Enviar mensaje"
                        }
                    >
                        {isEditing ? (
                            <>
                                <span className="send-text">{isEditingLoading ? "Guardando..." : "Guardar"}</span>
                                <FaEdit className="send-icon" />
                            </>
                        ) : isUploading || isSending ? (
                            <>
                                <span className="send-text">{isUploading ? "Subiendo..." : "Enviando..."}</span>
                                <FaPaperPlane className="send-icon" style={{ animation: "pulse 1s infinite", opacity: 0.7 }} />
                            </>
                        ) : (
                            <>
                                <span className="send-text">Enviar</span>
                                <FaPaperPlane className="send-icon" />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatInput;
