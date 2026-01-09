import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar la selección múltiple de mensajes
 */
export const useMessageSelection = () => {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);

    const handleEnterSelectionMode = useCallback(() => {
        setIsSelectionMode(true);
        setSelectedMessages([]);
    }, []);

    const handleToggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const newSelection = prev.includes(messageId)
                ? prev.filter(id => id !== messageId)
                : [...prev, messageId];
            return newSelection;
        });
        // Asegurar que se active el modo al seleccionar (útil para Ctrl+Click)
        setIsSelectionMode(true);
    }, []);

    const handleCancelSelection = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedMessages([]);
    }, []);

    const handleSelectAll = useCallback((messages) => {
        const allIds = messages.map(m => m.id);
        setSelectedMessages(allIds);
    }, []);

    return {
        isSelectionMode,
        selectedMessages,
        handleEnterSelectionMode,
        handleToggleMessageSelection,
        handleCancelSelection,
        handleSelectAll,
        setIsSelectionMode,
        setSelectedMessages
    };
};
