/**
 * Utilidad para actualizar el favicon con un badge de contador
 * Muestra el número de mensajes no leídos sobre el ícono de la pestaña
 */

class FaviconBadge {
    constructor() {
        this.faviconLink = null;
        this.originalFavicon = null;
        this.canvas = null;
        this.ctx = null;
        this.img = null;
        this.init();
    }

    init() {
        // Obtener el link del favicon
        this.faviconLink = document.querySelector("link[rel*='icon']");

        if (!this.faviconLink) {
            // Si no existe, crearlo
            this.faviconLink = document.createElement('link');
            this.faviconLink.rel = 'icon';
            document.head.appendChild(this.faviconLink);
        }

        // Guardar el favicon original
        this.originalFavicon = this.faviconLink.href;

        //  Crear canvas MÁS GRANDE para mejor visibilidad
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;  // Aumentado de 32 a 64
        this.canvas.height = 64; // Aumentado de 32 a 64
        this.ctx = this.canvas.getContext('2d');

        // Crear imagen para el favicon original
        this.img = new Image();
        // this.img.crossOrigin = 'anonymous'; // Causaba error con SVG local
        this.img.onload = () => {
            console.log('✅ Favicon original cargado');
        };
        this.img.onerror = () => {
            console.warn('⚠️ No se pudo cargar el favicon original');
        };

        // Intentar cargar el favicon original
        if (this.originalFavicon) {
            this.img.src = this.originalFavicon;
        }
    }

    /**
     * Actualiza el favicon con el contador de mensajes
     * @param {number} count - Número de mensajes no leídos
     */
    update(count) {
        if (!this.ctx || !this.canvas) return;

        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar el ícono original si está disponible (escalado a 64x64)
        if (this.img && this.img.complete && this.img.naturalHeight !== 0) {
            this.ctx.drawImage(this.img, 0, 0, 64, 64);
        } else {
            // Si no hay imagen, dibujar un fondo azul simple
            this.ctx.fillStyle = '#0084ff';
            this.ctx.beginPath();
            this.ctx.arc(32, 32, 30, 0, 2 * Math.PI);
            this.ctx.fill();

            // Dibujar símbolo de chat
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💬', 32, 32);
        }

        // Si hay mensajes, dibujar el badge (EXTRA GRANDE)
        if (count > 0) {
            const displayCount = count > 99 ? '99+' : count.toString();

            //  Badge ajustado: Número GRANDE en círculo pequeño
            const badgeRadius = displayCount.length === 1 ? 20 : (displayCount.length === 2 ? 22 : 22);
            const x = 64 - badgeRadius - 2; // Posición X (esquina derecha)
            const y = 64 - badgeRadius - 2; // Posición Y (esquina INFERIOR derecha)

            // Dibujar círculo rojo para el badge
            this.ctx.fillStyle = '#ff3b30';
            this.ctx.beginPath();
            this.ctx.arc(x, y, badgeRadius, 0, 2 * Math.PI);
            this.ctx.fill();

            // Dibujar borde blanco más grueso
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Dibujar número con fuente MUY GRANDE
            this.ctx.fillStyle = '#ffffff';
            // Aumentamos significativamente el tamaño de fuente para que llene el círculo
            const fontSize = displayCount.length === 1 ? 34 : (displayCount.length === 2 ? 28 : 24);
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // Ajuste vertical para centrar visualmente la fuente grande
            this.ctx.fillText(displayCount, x, y + 3);
        }

        // Actualizar el favicon
        try {
            this.faviconLink.href = this.canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Error al actualizar favicon:', error);
        }
    }

    /**
     * Restaura el favicon original
     */
    reset() {
        if (this.originalFavicon && this.faviconLink) {
            this.faviconLink.href = this.originalFavicon;
        }
    }
}

// Crear instancia global
export const faviconBadge = new FaviconBadge();

// También exportar la clase por si se necesita crear múltiples instancias
export default FaviconBadge;
