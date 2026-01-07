import React, { useState } from 'react';
import { FaTimes, FaFilePdf, FaFileWord, FaFileExcel, FaFile, FaPlay, FaImage } from 'react-icons/fa';
import ImageViewer from '../ChatContent/ImageViewer'; // Reutilizamos el visor existente
import './MediaPreviewList.css';

const MediaPreviewList = ({ previews, onRemove, onCancel }) => {
    const [selectedImage, setSelectedImage] = useState(null);

    if (!previews || previews.length === 0) return null;

    const handleImageClick = (preview) => {
        if (preview.type === 'image') {
            setSelectedImage(preview);
        } else {
            // Para otros archivos, intentar abrir en nueva pestaña si es posible (blob url)
            window.open(preview.data, '_blank');
        }
    };

    const closeImageViewer = () => {
        setSelectedImage(null);
    };

    return (
        <>
            <div className="media-preview-container">
                <div className="media-preview-header">
                    <span>Archivos adjuntos ({previews.length})</span>
                    <button className="cancel-upload-btn" onClick={onCancel}>
                        <FaTimes /> Cancelar todo
                    </button>
                </div>

                <div className="media-preview-list">
                    {previews.map((preview, index) => (
                        <div key={index} className="media-preview-item">
                            <div
                                className={`media-preview-thumbnail ${preview.type === 'image' ? 'clickable' : ''}`}
                                onClick={() => handleImageClick(preview)}
                                title="Clic para ver"
                            >
                                {preview.type === 'image' ? (
                                    <img src={preview.data} alt={preview.name} />
                                ) : preview.type === 'video' ? (
                                    <div className="file-icon-placeholder video">
                                        <video src={preview.data} />
                                        <div className="play-overlay"><FaPlay /></div>
                                    </div>
                                ) : (
                                    <div className="file-icon-placeholder">
                                        {preview.type === 'pdf' && <FaFilePdf className="file-type-icon pdf" />}
                                        {preview.type === 'document' && <FaFileWord className="file-type-icon word" />}
                                        {preview.type === 'spreadsheet' && <FaFileExcel className="file-type-icon excel" />}
                                        {preview.type === 'file' && <FaFile className="file-type-icon generic" />}
                                    </div>
                                )}
                            </div>

                            <div className="media-preview-info">
                                <span className="media-filename" title={preview.name}>{preview.name}</span>
                                <span className="media-filesize">{(preview.size / 1024).toFixed(1)} KB</span>
                            </div>

                            <button
                                className="remove-preview-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(index);
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visor de imágenes modal */}
            {selectedImage && (
                <ImageViewer
                    imagePreview={{ url: selectedImage.data, fileName: selectedImage.name }}
                    onClose={closeImageViewer}
                />
            )}
        </>
    );
};

export default MediaPreviewList;
