/**
 * Sistema de notificaciones del navegador (Browser Notifications API)
 * Similar a WhatsApp Desktop - muestra notificaciones cuando estás en otra app
 */

class SystemNotifications {
    constructor() {
        this.isWindowFocused = document.hasFocus();
        this.setupListeners();
        this.requestPermission();
    }

    // Configurar listeners para detectar si la ventana está enfocada
    setupListeners() {
        window.addEventListener('focus', () => {
            this.isWindowFocused = true;
        });

        window.addEventListener('blur', () => {
            this.isWindowFocused = false;
        });
    }

    // Solicitar permiso para notificaciones
    async requestPermission() {
        if (!("Notification" in window)) {
            console.warn("Este navegador no soporta notificaciones de escritorio");
            return false;
        }

        if (Notification.permission === "granted") {
            return true;
        }

        if (Notification.permission !== "denied") {
            const result = await Notification.requestPermission();
            return result === "granted";
        }

        return false;
    }

    /**
     * Mostrar notificación del sistema
     * @param {string} title - Título de la notificación
     * @param {string} body - Cuerpo de la notificación
     * @param {Object} options - Opciones adicionales
     * @param {Function} onClick - Callback cuando se hace clic
     */
    show(title, body, options = {}, onClick) {
        // Solo mostrar si:
        // 1. Tenemos permiso
        // 2. La ventana NO está enfocada (estás en otra app)
        if (Notification.permission !== "granted" || this.isWindowFocused) {
            return null;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/logo.png', // Cambia por tu logo si existe
            badge: '/logo.png',
            tag: options.tag || 'chat-notification',
            requireInteraction: false,
            silent: options.silent || false,
            ...options
        });

        // Al hacer clic en la notificación
        notification.onclick = () => {
            window.focus(); // Enfocar la ventana
            notification.close();
            if (onClick) onClick();
        };

        return notification;
    }

    /**
     * Verificar si se pueden mostrar notificaciones
     */
    canShow() {
        const hasPermission = Notification.permission === "granted";
        const isNotFocused = !this.isWindowFocused;
        console.log('🔔 canShow() - hasPermission:', hasPermission, 'isWindowFocused:', this.isWindowFocused, 'canShow:', hasPermission && isNotFocused);
        return hasPermission && isNotFocused;
    }
}

// Exportar instancia única
export const systemNotifications = new SystemNotifications();
