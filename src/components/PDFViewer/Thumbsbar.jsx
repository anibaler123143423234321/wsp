import React from 'react';
import clsx from "clsx";
import { PDFSlickThumbnails } from "@pdfslick/react";

const Thumbsbar = ({ usePDFSlickStore, thumbsRef }) => {
    const pdfSlick = usePDFSlickStore((s) => s.pdfSlick);
    const currentPage = usePDFSlickStore((s) => s.pageNumber);

    return (
        <div className="w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto hidden md:block">
            <div className="p-4">
                <PDFSlickThumbnails
                    {...{
                        thumbsRef,
                        usePDFSlickStore,
                        className: "grid grid-cols-1 gap-4 mx-auto pb-4",
                    }}
                >
                    {({ pageNumber, width, height, src, pageLabel, loaded }) => (
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => pdfSlick?.gotoPage(pageNumber)}
                                className={clsx(
                                    "p-1 rounded transition-all duration-200",
                                    {
                                        "bg-blue-100 ring-2 ring-blue-400": loaded && pageNumber === currentPage,
                                        "hover:bg-gray-200": pageNumber !== currentPage,
                                        "opacity-50": !loaded
                                    }
                                )}
                            >
                                <div
                                    className={clsx("relative bg-white shadow-sm border border-gray-300", {
                                        "border-blue-400": loaded && pageNumber === currentPage,
                                    })}
                                    style={{
                                        width: width ? `${width}px` : 'auto',
                                        height: height ? `${height}px` : 'auto',
                                        minHeight: '100px',
                                        minWidth: '80px'
                                    }}
                                >
                                    {src ? (
                                        <img src={src} width={width} height={height} alt={`Page ${pageNumber}`} className="block" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                                            Loading...
                                        </div>
                                    )}
                                </div>
                            </button>
                            <div className="text-center text-xs text-gray-500 mt-1 font-medium">
                                {pageLabel ?? pageNumber}
                            </div>
                        </div>
                    )}
                </PDFSlickThumbnails>
            </div>
        </div>
    );
};

export default Thumbsbar;
