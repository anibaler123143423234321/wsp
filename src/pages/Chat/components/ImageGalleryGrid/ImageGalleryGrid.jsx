import React from 'react';
import './ImageGalleryGrid.css';

const ImageGalleryGrid = ({ items, onImageClick }) => {
    if (!items || items.length === 0) return null;

    const count = items.length;
    // Limitamos las imágenes visibles a un máximo de 4
    const visibleItems = items.slice(0, 4);
    const remainingCount = count - 4;

    const getGridClass = () => {
        if (count === 1) return 'grid-1';
        if (count === 2) return 'grid-2';
        if (count === 3) return 'grid-3';
        return 'grid-4'; // Para 4 o más
    };

    return (
        <div className={`image-gallery-grid ${getGridClass()}`}>
            {visibleItems.map((item, index) => {
                const isLastOne = index === 3 && remainingCount > 0;

                // Extraer URL y nombre del archivo (soporta ambos formatos)
                const imageUrl = item.mediaData || item.url;
                const fileName = item.fileName || 'imagen';

                return (
                    <div
                        key={item.id || index}
                        className="grid-item"
                        onClick={() => onImageClick(item)}
                    >
                        <img
                            src={imageUrl}
                            alt={fileName}
                            loading="lazy"
                        />

                        {isLastOne && (
                            <div className="grid-overlay">
                                <span>+{remainingCount}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ImageGalleryGrid;
