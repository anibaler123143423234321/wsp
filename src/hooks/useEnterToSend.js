import { useCallback } from 'react';

/**
 * Hook to handle Enter key to send messages.
 * Allows Shift+Enter for new lines.
 * 
 * @param {Function} onSend - Function to execute when Enter is pressed.
 * @param {Function} [existingKeyDown] - Optional existing onKeyDown handler to preserve other behaviors.
 * @returns {Function} - The event handler to pass to onKeyDown.
 */
const useEnterToSend = (onSend, existingKeyDown) => {
    const handleKeyDown = useCallback((e) => {
        // Ejecutar el handler existente primero (por si maneja navegación, etc.)
        if (existingKeyDown) {
            existingKeyDown(e);
        }

        // Si ya fue prevenido, no hacemos nada
        if (e.defaultPrevented) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (onSend) {
                // Pequeña validación para evitar enviar si está deshabilitado
                // (aunque la función onSend debería validarlo también)
                onSend(e);
            }
        }
    }, [onSend, existingKeyDown]);

    return handleKeyDown;
};

export default useEnterToSend;
