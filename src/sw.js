
// Importar Workbox (necesario si quieres mantener precache, si no se puede hacer manual)
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// Precacheo estándar de VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// ---------------------------------------------------------------------------
// 🔥 INTERCEPTOR MÁGICO PARA IMÁGENES PROTEGIDAS DE BACKENDJAVA (CHICLAYO)
// ---------------------------------------------------------------------------
// El usuario requiere que CUALQUIER petición a "apisozarusac.../api/files" lleve token.
// Como las etiquetas <img> no envían headers, el Service Worker debe interceptarlo.

const API_DOMAIN_PATTERN = /apisozarusac\.com.*\/api\/files/;

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Solo interceptar si es una petición a la API de archivos protegidos
    if (API_DOMAIN_PATTERN.test(url)) {
        // console.log('🔥 [SW] Interceptando imagen protegida:', url);

        event.respondWith(
            (async () => {
                try {
                    // Intentar obtener el token de alguna manera. 
                    // ⚠️ Los SW NO tienen acceso a localStorage.
                    // Necesitamos que la app nos mande el token o usar IndexedDB (localForage).
                    // Por defecto, intentaremos leer de una Client query o de un cache de mensajes.

                    // MEJOR ESTRATEGIA: Recuperar el token desde los clientes (ventas abiertas)
                    // Esto es un poco lento, pero funciona.
                    const clients = await self.clients.matchAll({ type: 'window' });
                    let token = null;

                    for (const client of clients) {
                        // Pedirle el token a la ventana
                        // Esto requiere un canal de mensajes, que es complejo de implementar rapido.
                        // PERO, si el usuario ya visitó la app, podemos haber guardado el token en Cache Storage o IndexedDB.
                    }

                    // ESTRATEGIA SIMPLE: 
                    // Clonar la petición y agregarle el header.
                    // Pero... ¿De dónde sacamos el token?
                    // La app debe enviarlo al SW al iniciarse.

                    // Vamos a asumir que el token se guarda en un Cache especial o Variable global del SW
                    // alimentada por postMessage desde la app.

                    if (self.authToken) {
                        const modifiedHeaders = new Headers(event.request.headers);
                        modifiedHeaders.set('Authorization', `Bearer ${self.authToken}`);

                        // Crear nueva petición con el header
                        const modifiedRequest = new Request(event.request, {
                            headers: modifiedHeaders,
                            mode: 'cors', // Asegurar CORS
                            credentials: 'omit' // O 'include' si fuera cookie, pero es Bearer
                        });

                        return fetch(modifiedRequest);
                    }

                    // Si no tenemos token, hacer petición normal (fallará con 403 pero es lo que hay)
                    return fetch(event.request);
                } catch (error) {
                    console.error('[SW] Error fetching image:', error);
                    return fetch(event.request);
                }
            })()
        );
    }
});

// Escuchar mensajes desde la APP principal para recibir el token
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_TOKEN') {
        self.authToken = event.data.token;
        console.log('✅ [SW] Token recibido y guardado en memoria.');
    }
});
