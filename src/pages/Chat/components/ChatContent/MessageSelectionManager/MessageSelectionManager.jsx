import React from 'react';
import { FaTimes, FaCopy } from 'react-icons/fa';
import './MessageSelectionManager.css';

/**
 * MessageSelectionManager Component - WhatsApp Style
 * Barra superior para selección de mensajes
 */
const MessageSelectionManager = ({
    selectedMessages,
    allMessages,
    onCopyList,
    onCancel
}) => {
    const selectedCount = selectedMessages.length;

    const handleCopy = () => {
        // Obtener los mensajes seleccionados en orden cronológico
        const messagesToCopy = allMessages
            .filter(msg => selectedMessages.includes(msg.id))
            .map(msg => msg.text || msg.fileName || '')
            .filter(text => text.trim());

        // Copiar en formato lista
        const listText = messagesToCopy.join('\n');

        navigator.clipboard.writeText(listText).then(() => {
            if (onCopyList) onCopyList();
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    };

    return (
        <div className="selection-toolbar">
            <div className="selection-toolbar-content">
                <span className="selection-count">
                    {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                </span>

                <div className="selection-toolbar-actions">
                    <button
                        className="selection-btn"
                        onClick={handleCopy}
                        title="Copiar en lista"
                        disabled={selectedCount === 0}
                        style={{ opacity: selectedCount === 0 ? 0.5 : 1 }}
                    >
                        <FaCopy />
                    </button>

                    <button
                        className="selection-btn"
                        onClick={onCancel}
                        title="Cancelar"
                    >
                        <FaTimes />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageSelectionManager;
