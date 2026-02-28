/**
 * Sistema de notificaciones del navegador (Browser Notifications API)
 * Similar a WhatsApp Desktop - muestra notificaciones cuando estás en otra app
 */

import chatIcon from '../assets/CHATICON0.svg';

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
            console.log('🔔 systemNotifications.show blocked:', { permission: Notification.permission, isWindowFocused: this.isWindowFocused });
            return null;
        }

        console.log('🔔 systemNotifications.show executing:', { title, body, options });

        const notification = new Notification(title, {
            body: body,
            icon: '/pwa-512x512.png',
            badge: '/pwa-192x192.png',
            tag: options.tag || 'chat-notification',
            renotify: true,
            requireInteraction: false,
            silent: options.silent || false,
            ...options
        });

        console.log('🔔 systemNotifications.show created:', notification);

        // Al hacer clic en la notificación
        notification.onclick = () => {
            window.focus(); // Enfocar la ventana
            notification.close();
            if (onClick) onClick();
        };

        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    }

    /**
     * Verificar si se pueden mostrar notificaciones
     */
    canShow() {
        const hasPermission = Notification.permission === "granted";
        // Mostrar solo si la pestaña está oculta (minimizada o en otra pestaña)
        // Esto evita que salga la notificación nativa si el usuario tiene la ventana visible pero desenfocada (ej. DevTools)
        const isHidden = document.visibilityState === 'hidden';

        console.log('🔔 canShow() - hasPermission:', hasPermission, 'isHidden:', isHidden, 'canShow:', hasPermission && isHidden);
        return hasPermission && isHidden;
    }
}

// Exportar instancia única
export const systemNotifications = new SystemNotifications();
