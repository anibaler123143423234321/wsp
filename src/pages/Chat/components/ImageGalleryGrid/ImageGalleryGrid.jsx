import React from 'react';
import { FaReply, FaComments } from 'react-icons/fa';
import './ImageGalleryGrid.css';

const ImageGalleryGrid = ({ items, onImageClick, onReply, onOpenThread }) => {
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

                        {onReply && (
                            <button
                                className="grid-reply-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReply(item);
                                }}
                                title="Responder a esta imagen"
                            >
                                <FaReply size={16} />
                            </button>
                        )}

                        {onOpenThread && (
                            <button
                                className="grid-thread-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenThread(item);
                                }}
                                title="Responder en hilo"
                            >
                                <FaComments size={16} />
                            </button>
                        )}

                        {item.threadCount > 0 && (
                            <div
                                className="grid-thread-indicator"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenThread) {
                                        onOpenThread(item);
                                    } else if (onReply) {
                                        onReply(item);
                                    }
                                }}
                            >
                                <span className="thread-count">{item.threadCount}</span>
                                <span className="thread-text">respuestas</span>
                            </div>
                        )}

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
