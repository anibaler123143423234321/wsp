import { useState, useEffect } from 'react';

export const USER_NAME_COLORS_LIGHT = [
    '#E91E63', // Rosa
    '#9C27B0', // Púrpura
    '#673AB7', // Violeta
    '#3F51B5', // Índigo
    '#2196F3', // Azul
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Verde
    '#8BC34A', // Verde claro
    '#FF9800', // Naranja
    '#FF5722', // Naranja oscuro
    '#795548', // Marrón
    '#607D8B', // Gris azulado
    '#F44336', // Rojo
    '#00ACC1', // Cyan oscuro
];

export const USER_NAME_COLORS_DARK = [
    '#F48FB1', // Rosa claro
    '#CE93D8', // Púrpura claro
    '#B39DDB', // Violeta claro
    '#9FA8DA', // Índigo claro
    '#90CAF9', // Azul claro
    '#80DEEA', // Cyan claro
    '#80CBC4', // Teal claro
    '#A5D6A7', // Verde claro
    '#C5E1A5', // Verde muy claro
    '#FFCC80', // Naranja claro
    '#FFAB91', // Naranja oscuro claro
    '#BCAAA4', // Marrón claro
    '#B0BEC5', // Gris azulado claro
    '#EF9A9A', // Rojo claro
    '#4DD0E1', // Cyan oscuro claro
];

// Color especial para el usuario logueado
export const OWN_USER_COLOR_LIGHT = '#dc2626'; // Rojo corporativo
export const OWN_USER_COLOR_DARK = '#ef4444'; // Rojo corporativo más claro para dark mode

// Función tradicional dinámica (para llamadas puntuales o donde no importa que sea reactivo in-place)
export const getUserNameColor = (name, isOwnMessage = false) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const palette = isDark ? USER_NAME_COLORS_DARK : USER_NAME_COLORS_LIGHT;
    const ownColor = isDark ? OWN_USER_COLOR_DARK : OWN_USER_COLOR_LIGHT;

    if (isOwnMessage) return ownColor;
    if (!name) return palette[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
};

// Hook React para componentes que necesitan re-renderizarse cuando cambia el tema
export const useUserNameColor = () => {
    const [isDark, setIsDark] = useState(() => {
        return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    });

    useEffect(() => {
        // Escuchar cambios de clase en el HTML generados por ThemeToggleButton
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });

        if (typeof document !== 'undefined') {
            observer.observe(document.documentElement, { attributes: true });
        }

        return () => observer.disconnect();
    }, []);

    const getUserColor = (name, isOwnMessage = false) => {
        const palette = isDark ? USER_NAME_COLORS_DARK : USER_NAME_COLORS_LIGHT;
        const ownColor = isDark ? OWN_USER_COLOR_DARK : OWN_USER_COLOR_LIGHT;

        if (isOwnMessage) return ownColor;
        if (!name) return palette[0];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return palette[Math.abs(hash) % palette.length];
    };

    return { getUserColor, isDark };
};
