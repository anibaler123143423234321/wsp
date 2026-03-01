/**
 * Utilidad para actualizar el favicon con un badge de contador
 * Muestra el número de mensajes no leídos sobre el ícono de la pestaña
 */

import chatIcon from '../assets/CHATICON0.svg';

class FaviconBadge {
    constructor() {
        this.faviconLink = null;
        this.originalFavicon = null;
        this.canvas = null;
        this.ctx = null;
        this.img = null;
        this.imgReady = false;
        this.init();
    }

    init() {
        //  FIX: Manejar múltiples links de favicon y asegurar tipo correcto
        const links = document.querySelectorAll("link[rel*='icon']");
        this.originalLinks = [];

        links.forEach(link => {
            this.originalLinks.push({
                rel: link.rel,
                type: link.type,
                href: link.href
            });
            // Remover links existentes para evitar conflictos
            link.parentNode.removeChild(link);
        });

        // Crear nuestro link dinámico
        this.faviconLink = document.createElement('link');
        this.faviconLink.rel = 'icon';
        // Asumimos SVG por defecto si no hay originales o el primero era SVG
        this.faviconLink.type = 'image/svg+xml';
        this.faviconLink.href = this.originalLinks[0]?.href || chatIcon;
        document.head.appendChild(this.faviconLink);

        //  Crear canvas MÁS GRANDE para mejor visibilidad
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;  // Aumentado de 32 a 64
        this.canvas.height = 64; // Aumentado de 32 a 64
        this.ctx = this.canvas.getContext('2d');

        //  FIX: Para SVGs, renderizar primero en un canvas temporal para convertir a PNG
        this._loadSvgAsPng();
    }

    /**
     *  Convierte el SVG del favicon a PNG para que funcione con canvas.drawImage
     */
    _loadSvgAsPng() {
        const tempImg = new Image();
        tempImg.crossOrigin = 'Anonymous'; // Importante para evitar taint canvas
        tempImg.onload = () => {
            try {
                // Dibujar SVG en un canvas temporal para rasterizarlo
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 64;
                tempCanvas.height = 64;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(tempImg, 0, 0, 64, 64);

                // Crear una imagen PNG a partir del canvas rasterizado
                const pngDataUrl = tempCanvas.toDataURL('image/png');
                this.img = new Image();
                this.img.onload = () => {
                    this.imgReady = true;
                    console.log('✅ Favicon SVG convertido a PNG correctamente');
                    // Intentar redibujar si ya se llamó a update
                    if (this.lastCount !== undefined) {
                        this.update(this.lastCount);
                    }
                };
                this.img.src = pngDataUrl;
            } catch (err) {
                console.warn('⚠️ Error al convertir SVG a PNG:', err);
                this.imgReady = false;
            }
        };
        tempImg.onerror = () => {
            console.warn('⚠️ No se pudo cargar el favicon SVG');
            this.imgReady = false;
        };
        // Usar el import del SVG (Vite lo resuelve como URL)
        tempImg.src = chatIcon;
    }

    /**
     * Actualiza el favicon con el contador de mensajes
     * @param {number} count - Número de mensajes no leídos
     */
    update(count) {
        this.lastCount = count; // Guardar último conteo por si la imagen carga después
        console.log('🎨 faviconBadge.update called with:', count, 'imgReady:', this.imgReady);

        if (!this.ctx || !this.canvas) return;

        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar el ícono original si está disponible (escalado a 64x64)
        if (this.imgReady && this.img && this.img.complete && this.img.naturalHeight !== 0) {
            this.ctx.drawImage(this.img, 0, 0, 64, 64);
        } else {
            console.warn('⚠️ faviconBadge: Image not ready, drawing fallback circle');
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
            const dataUrl = this.canvas.toDataURL('image/png');
            this.faviconLink.type = 'image/png'; //  IMPORTANTE: Cambiar tipo a PNG
            this.faviconLink.href = dataUrl;
        } catch (error) {
            console.error('Error al actualizar favicon:', error);
        }
    }

    /**
     * Restaura el favicon original
     */
    reset() {
        if (this.originalLinks && this.originalLinks.length > 0) {
            // Restaurar el primero (que es el que usamos como base)
            const original = this.originalLinks[0];
            this.faviconLink.type = original.type || 'image/svg+xml';
            this.faviconLink.href = original.href;
        } else {
            this.faviconLink.type = 'image/svg+xml';
            this.faviconLink.href = chatIcon;
        }
    }
}

// Crear instancia global
export const faviconBadge = new FaviconBadge();

// También exportar la clase por si se necesita crear múltiples instancias
export default FaviconBadge;

