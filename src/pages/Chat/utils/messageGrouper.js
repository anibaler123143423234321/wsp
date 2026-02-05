/**
 * Utilidad para agrupar mensajes de imagen consecutivos del mismo remitente.
 * Esto permite renderizarlos como una galería estilo WhatsApp.
 */

export const groupMessagesForGallery = (messages) => {
    if (!messages || messages.length === 0) return [];

    const processedMessages = [];
    let currentImageGroup = null;

    messages.forEach((msg, index) => {
        // Criterios para agrupar:
        // 1. El mensaje es una imagen.
        // 2. No es un mensaje de sistema/info.
        // 3. No ha sido eliminado.
        // 4. No es una encuesta ni otro tipo especial.
        const isImage = msg.mediaType === 'image' && !msg.isDeleted && !msg.type;

        if (isImage) {
            // Si ya hay un grupo activo, verificamos si este mensaje pertenece a él
            if (currentImageGroup) {
                const lastMsgInGroup = currentImageGroup.messages[currentImageGroup.messages.length - 1];

                // Debe ser del mismo remitente
                const sameSender = msg.sender === lastMsgInGroup.sender;

                // Debe ser en un lapso de tiempo razonable (ej. < 1 minuto)
                const time1 = new Date(msg.sentAt || msg.time).getTime();
                const time2 = new Date(lastMsgInGroup.sentAt || lastMsgInGroup.time).getTime();
                const sameWindow = Math.abs(time1 - time2) < 60000; // 60 segundos

                if (sameSender && sameWindow) {
                    currentImageGroup.messages.push(msg);
                    // Actualizamos el ID del grupo para que sea determinista (ej. el ID de la primera imagen)
                    return;
                } else {
                    // El grupo actual se cierra y empezamos uno nuevo (o mensaje normal)
                    processedMessages.push(currentImageGroup);
                    currentImageGroup = null;
                }
            }

            // Vemos si el siguiente mensaje también es una imagen para decidir si crear un grupo
            const nextMsg = messages[index + 1];
            const nextIsImage = nextMsg &&
                nextMsg.mediaType === 'image' &&
                !nextMsg.isDeleted &&
                !nextMsg.type &&
                nextMsg.sender === msg.sender;

            if (nextIsImage) {
                currentImageGroup = {
                    id: `gallery-${msg.id}`,
                    type: 'image-gallery',
                    sender: msg.sender,
                    time: msg.time,
                    sentAt: msg.sentAt,
                    isSelf: msg.isSelf,
                    messages: [msg]
                };
            } else {
                processedMessages.push(msg);
            }
        } else {
            // Si había un grupo de imágenes abierto, lo cerramos
            if (currentImageGroup) {
                processedMessages.push(currentImageGroup);
                currentImageGroup = null;
            }
            processedMessages.push(msg);
        }
    });

    // Asegurarnos de empujar el último grupo si quedó abierto
    if (currentImageGroup) {
        processedMessages.push(currentImageGroup);
    }

    return processedMessages;
};
