/**
 * Maneja el evento de pegado inteligentemente.
 * Prioriza texto plano sobre imágenes para casos como Excel,
 * donde se copian ambos formatos al portapapeles.
 * 
 * @param {ClipboardEvent} e - El evento de pegado
 * @param {Function} handleFilesSelect - Función para procesar archivos seleccionados (input type file change handler format)
 * @param {Function} setInput - Setter para el input de texto
 * @returns {boolean} true si se manejó como texto, false si se manejó como archivo o nada
 */
export const handleSmartPaste = (e, handleFilesSelect, setInput) => {
    const items = e.clipboardData?.items;
    if (!items) return false;

    const types = e.clipboardData.types;
    // Excel pone "text/plain", "text/html" y "image/png" (o similar).
    // Si hay text/plain, priorizarlo sobre la imagen generada automáticamente.
    const hasText = types.includes('text/plain');
    const hasFiles = types.includes('Files');

    // Caso específico: Texto (como celdas de Excel) que trae imagen fantasma
    if (hasText) {
        // Dejar que el comportamiento por defecto pegue el texto en el input
        // O si el input es controlado, obtener el texto y agregarlo.
        // Retornamos false para indicar que NO procesamos archivos,
        // y no prevenimos el default para que el texto se pegue.
        return true;
    }

    // Si no hay texto, buscamos archivos (imágenes reales, screenshots)
    const files = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) files.push(file);
        }
    }

    if (files.length > 0) {
        e.preventDefault(); // Prevenir pegado doble
        // Simular evento de input type file
        handleFilesSelect({ target: { files: files } });
        return true;
    }

    return false;
};
