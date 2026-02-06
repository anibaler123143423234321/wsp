import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FaTimes, FaChevronLeft, FaChevronRight, FaSearchMinus, FaSearchPlus, FaDownload } from 'react-icons/fa';

// Configurar worker desde CDN (versión automática)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ pdfData, fileName, onClose }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    // Convertir ArrayBuffer a Blob URL
    const pdfUrl = React.useMemo(() => {
        if (pdfData) {
            const blob = new Blob([pdfData], { type: 'application/pdf' });
            return URL.createObjectURL(blob);
        }
        return null;
    }, [pdfData]);

    // Cleanup
    React.useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        console.log('✅ PDF cargado:', numPages, 'páginas');
    };

    const onDocumentLoadError = (error) => {
        console.error('❌ Error cargando PDF:', error);
    };

    // Navegación
    const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(numPages || 1, prev + 1));
    const zoomIn = () => setScale(prev => Math.min(3, prev + 0.2));
    const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));

    // Descargar PDF
    const handleDownload = () => {
        if (pdfUrl) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = fileName || 'documento.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // ESC para cerrar
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full h-full max-w-6xl bg-white rounded-lg shadow-2xl flex flex-col">
                {/* Header con controles */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-gray-700">Visor de PDF</h3>

                        {/* Navegación */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-2 py-1">
                            <button
                                onClick={goToPrevPage}
                                disabled={pageNumber <= 1}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Página anterior"
                            >
                                <FaChevronLeft size={14} />
                            </button>
                            <span className="text-sm font-medium min-w-[60px] text-center">
                                {pageNumber} / {numPages || '?'}
                            </span>
                            <button
                                onClick={goToNextPage}
                                disabled={!numPages || pageNumber >= numPages}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Página siguiente"
                            >
                                <FaChevronRight size={14} />
                            </button>
                        </div>

                        {/* Zoom */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-2 py-1">
                            <button
                                onClick={zoomOut}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Reducir zoom"
                            >
                                <FaSearchMinus size={14} />
                            </button>
                            <span className="text-sm font-medium min-w-[40px] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={zoomIn}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Aumentar zoom"
                            >
                                <FaSearchPlus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        {/* Download */}
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-gray-200 text-gray-500 hover:text-blue-600 rounded-full transition-colors mr-2"
                            title="Descargar"
                        >
                            <FaDownload size={18} />
                        </button>

                        {/* Cerrar */}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full transition-colors"
                            title="Cerrar (Esc)"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                {/* Visor de PDF */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    <div className="flex justify-center">
                        {pdfUrl && (
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={
                                    <div className="flex flex-col items-center justify-center p-8">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                                        <p className="text-gray-600">Cargando PDF...</p>
                                    </div>
                                }
                                error={
                                    <div className="text-center p-8 text-red-600">
                                        <p className="font-semibold mb-2">Error al cargar el PDF</p>
                                        <p className="text-sm">Por favor, intenta de nuevo</p>
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Document>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFViewer;
