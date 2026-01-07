import React, { useRef, useEffect } from 'react';
import './ReactionPicker.css';

/**
 * ReactionPicker - Componente reutilizable para reacciones rápidas
 * 
 * @param {boolean} isOpen - Si el picker está visible
 * @param {function} onClose - Callback para cerrar el picker
 * @param {function} onSelectEmoji - Callback al seleccionar un emoji (recibe el emoji string)
 * @param {function} onOpenFullPicker - Callback para abrir el emoji picker completo (botón "+")
 * @param {string} position - Posición del popup: 'left', 'center', 'right' (default: 'left')
 */
const ReactionPicker = ({
    isOpen,
    onClose,
    onSelectEmoji,
    onOpenFullPicker,
    position = 'left'
}) => {
    const pickerRef = useRef(null);

    // Lista de emojis rápidos
    const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                onClose();
            }
        };

        // Pequeño delay para evitar que se cierre inmediatamente al abrir
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={pickerRef}
            className={`reaction-picker-popup position-${position}`}
        >
            {quickEmojis.map((emoji) => (
                <button
                    key={emoji}
                    className="reaction-emoji-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectEmoji(emoji);
                    }}
                >
                    {emoji}
                </button>
            ))}
            {/* Botón Más (+) para abrir picker completo */}
            {onOpenFullPicker && (
                <button
                    className="reaction-emoji-btn plus-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenFullPicker();
                    }}
                >
                    +
                </button>
            )}
        </div>
    );
};

export default ReactionPicker;
