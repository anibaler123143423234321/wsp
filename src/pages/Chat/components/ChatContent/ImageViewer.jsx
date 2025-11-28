import React, { useState } from 'react';

const ImageViewer = ({ imagePreview, onClose, onDownload }) => {
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const handleClose = () => {
        setImageZoom(1);
        setImagePan({ x: 0, y: 0 });
        onClose();
    };

    const handleReset = () => {
        setImageZoom(1);
        setImagePan({ x: 0, y: 0 });
    };

    const handleZoomIn = () => {
        setImageZoom((prev) => Math.min(5, prev + 0.25));
    };

    const handleZoomOut = () => {
        setImageZoom((prev) => Math.max(0.5, prev - 0.25));
    };

    const handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setImageZoom((prev) => Math.max(0.5, Math.min(5, prev + delta)));
    };

    const handleMouseDown = (e) => {
        if (imageZoom > 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning && imageZoom > 1) {
            e.preventDefault();
            setImagePan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    if (!imagePreview) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                overflow: "hidden",
            }}
            onClick={handleClose}
        >
            {/* Botón de cerrar */}
            <button
                onClick={handleClose}
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#fff",
                    fontSize: "24px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s",
                    zIndex: 10001,
                }}
                onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
                }
                onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
                }
            >
                ✕
            </button>

            {/* Botón de descargar */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDownload(imagePreview.url, imagePreview.fileName);
                }}
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "80px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#fff",
                    fontSize: "16px",
                    padding: "10px 20px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.2s",
                    zIndex: 10001,
                }}
                onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
                }
                onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
                }
            >
                ⬇️ Descargar
            </button>

            {/* Controles de zoom */}
            <div
                style={{
                    position: "absolute",
                    bottom: "80px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "10px",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    padding: "10px 15px",
                    borderRadius: "30px",
                    zIndex: 10001,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón Zoom Out */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomOut();
                    }}
                    disabled={imageZoom <= 0.5}
                    style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "#fff",
                        fontSize: "20px",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        cursor: imageZoom <= 0.5 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.2s",
                        opacity: imageZoom <= 0.5 ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) =>
                        imageZoom > 0.5 && (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
                    }
                >
                    −
                </button>

                {/* Indicador de zoom */}
                <div
                    style={{
                        color: "#fff",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        minWidth: "60px",
                        justifyContent: "center",
                        fontWeight: "500",
                    }}
                >
                    {Math.round(imageZoom * 100)}%
                </div>

                {/* Botón Zoom In */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn();
                    }}
                    disabled={imageZoom >= 5}
                    style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "#fff",
                        fontSize: "20px",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        cursor: imageZoom >= 5 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.2s",
                        opacity: imageZoom >= 5 ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) =>
                        imageZoom < 5 && (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
                    }
                >
                    +
                </button>

                {/* Botón Reset */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                    }}
                    style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                        padding: "0 15px",
                        height: "36px",
                        borderRadius: "18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.2s",
                        marginLeft: "5px",
                    }}
                    onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
                    }
                >
                    Restablecer
                </button>
            </div>

            {/* Contenedor de la imagen con zoom y pan */}
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    cursor: imageZoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
                }}
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Imagen */}
                <img
                    src={imagePreview.url}
                    alt={imagePreview.fileName}
                    style={{
                        maxWidth: imageZoom === 1 ? "90%" : "none",
                        maxHeight: imageZoom === 1 ? "90%" : "none",
                        width: imageZoom > 1 ? `${imageZoom * 100}%` : "auto",
                        objectFit: "contain",
                        borderRadius: "8px",
                        transform: `translate(${imagePan.x}px, ${imagePan.y}px)`,
                        transition: isPanning ? "none" : "transform 0.1s ease-out",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                    draggable={false}
                />
            </div>

            {/* Nombre del archivo */}
            <p
                style={{
                    position: "absolute",
                    bottom: "20px",
                    color: "#fff",
                    fontSize: "14px",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    zIndex: 10001,
                }}
            >
                {imagePreview.fileName}
            </p>
        </div>
    );
};

export default ImageViewer;
