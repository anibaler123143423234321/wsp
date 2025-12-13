import React, { useState } from 'react';
import { FaCopy, FaChevronRight, FaCheckSquare } from 'react-icons/fa';
import './CopyOptions.css';

/**
 * CopyOptions Component - SIMPLIFICADO
 * Solo: Copiar texto directo y Copiar en lista
 */
const CopyOptions = ({ message, onClose, onEnterSelectionMode }) => {
    const [showSubmenu, setShowSubmenu] = useState(false);

    // Copiar texto directo
    const handleCopyText = async () => {
        const text = message.text || message.fileName || '';
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
                if (onClose) onClose();
            } catch (error) {
                console.error('Error al copiar:', error);
            }
        }
    };

    // Activar modo selección para copiar en lista
    const handleCopyInList = () => {
        console.log(' handleCopyInList llamado', { onEnterSelectionMode });
        if (onEnterSelectionMode) {
            onEnterSelectionMode();
        }
        setShowSubmenu(false);
        if (onClose) onClose();
    };

    // Toggle del submenú
    const toggleSubmenu = (e) => {
        e.stopPropagation();
        setShowSubmenu(!showSubmenu);
    };

    return (
        <div className="copy-options-container">
            <div className="menu-item copy-main-item">
                <FaCopy className="menu-icon" onClick={handleCopyText} style={{ cursor: 'pointer' }} />
                <span onClick={handleCopyText} style={{ cursor: 'pointer' }}>Copiar texto</span>

                <button
                    className="submenu-toggle-btn"
                    onClick={toggleSubmenu}
                    title="Más opciones"
                >
                    <FaChevronRight className="submenu-arrow" />
                </button>
            </div>

            {showSubmenu && (
                <div className="copy-submenu">
                    <button
                        className="menu-item submenu-item"
                        onClick={handleCopyInList}
                    >
                        <FaCheckSquare className="menu-icon" />
                        <span>Copiar en lista</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CopyOptions;
