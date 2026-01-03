import { useState, useEffect, useRef } from 'react';
import './AttachMenu.css';

/**
 * Componente reutilizable de menú de adjuntar estilo WhatsApp
 * @param {Object} props
 * @param {Function} props.onFileSelect - Callback cuando se selecciona un archivo (recibe array de files)
 * @param {Function} props.onFileSelectEvent - Callback alternativo que recibe el evento directamente 
 * @param {Function} props.onCreatePoll - Callback cuando se quiere crear una encuesta
 * @param {boolean} props.disabled - Si el botón está deshabilitado
 */
const AttachMenu = ({ onFileSelect, onFileSelectEvent, onCreatePoll, disabled = false }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const photoInputRef = useRef(null);
    const documentInputRef = useRef(null);
    const audioInputRef = useRef(null);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleFileChange = (e) => {
        // Si hay un handler que espera el evento, usarlo
        if (onFileSelectEvent) {
            onFileSelectEvent(e);
        } else if (onFileSelect) {
            // Si hay un handler que espera array de archivos
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                onFileSelect(files);
            }
        }
        // Reset input para permitir seleccionar el mismo archivo
        e.target.value = '';
        setShowMenu(false);
    };

    return (
        <div className="attach-menu-container" ref={menuRef}>
            <button
                className={`attach-plus-btn ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setShowMenu(!showMenu)}
                title="Adjuntar"
                disabled={disabled}
                type="button"
            >
                <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    fill="none"
                    style={{ transform: showMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                >
                    <path d="M11 13H5.5C4.94772 13 4.5 12.5523 4.5 12C4.5 11.4477 4.94772 11 5.5 11H11V5.5C11 4.94772 11.4477 4.5 12 4.5C12.5523 4.5 13 4.94772 13 5.5V11H18.5C19.0523 11 19.5 11.4477 19.5 12C19.5 12.5523 19.0523 13 18.5 13H13V18.5C13 19.0523 12.5523 19.5 12 19.5C11.4477 19.5 11 19.0523 11 18.5V13Z" fill="currentColor" />
                </svg>
            </button>

            {/* Menú desplegable de adjuntar */}
            {showMenu && (
                <div className="attach-menu-dropdown">
                    <label className="attach-menu-item" onClick={() => photoInputRef.current?.click()}>
                        <input
                            ref={photoInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            disabled={disabled}
                        />
                        <span className="attach-menu-icon photos">
                            <svg viewBox="0 0 24 24" height="24" width="24" fill="none">
                                <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor" />
                            </svg>
                        </span>
                        <span>Fotos y videos</span>
                    </label>

                    <label className="attach-menu-item" onClick={() => documentInputRef.current?.click()}>
                        <input
                            ref={documentInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            disabled={disabled}
                        />
                        <span className="attach-menu-icon document">
                            <svg viewBox="0 0 24 24" height="24" width="24" fill="none">
                                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="currentColor" />
                            </svg>
                        </span>
                        <span>Documento</span>
                    </label>

                    <label className="attach-menu-item" onClick={() => audioInputRef.current?.click()}>
                        <input
                            ref={audioInputRef}
                            type="file"
                            multiple
                            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            disabled={disabled}
                        />
                        <span className="attach-menu-icon audio">
                            <svg viewBox="0 0 24 24" height="24" width="24" fill="none">
                                <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z" fill="currentColor" />
                            </svg>
                        </span>
                        <span>Audio</span>
                    </label>

                    {/* Opción de crear encuesta */}
                    {onCreatePoll && (
                        <div
                            className="attach-menu-item"
                            onClick={() => {
                                setShowMenu(false);
                                onCreatePoll();
                            }}
                        >
                            <span className="attach-menu-icon poll">
                                <svg viewBox="0 0 24 24" height="24" width="24" fill="none">
                                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z" fill="currentColor" />
                                </svg>
                            </span>
                            <span>Encuesta</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttachMenu;
