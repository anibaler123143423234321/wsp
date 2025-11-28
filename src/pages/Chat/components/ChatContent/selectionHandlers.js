// ==============================================
// HANDLERS PARA SELECCIÓN MÚLTIPLE DE MENSAJES
// Agregar estos handlers en ChatContent.jsx
// ==============================================

// Handler: Activar modo selección
const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedMessages([]);
    setShowMessageMenu(null); // Cerrar menú contextual
};

// Handler: Toggle selección de mensaje
const handleToggleMessageSelection = (messageId) => {
    setSelectedMessages(prev => {
        if (prev.includes(messageId)) {
            return prev.filter(id => id !== messageId);
        } else {
            return [...prev, messageId];
        }
    });
};

// Handler: Cancelar selección
const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
};

// Handler: Copiar mensajes en lista
const handleCopyList = () => {
    // El MessageSelectionManager ya maneja la funcionalidad de copiado
    // Solo necesitamos cerrar el modo selección después
    setIsSelectionMode(false);
    setSelectedMessages([]);
};

export {
    handleEnterSelectionMode,
    handleToggleMessageSelection,
    handleCancelSelection,
    handleCopyList
};
