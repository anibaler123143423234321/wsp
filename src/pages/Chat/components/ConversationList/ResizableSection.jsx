import { useState, useRef, useCallback, useEffect } from 'react';
import { FaTimes, FaBars, FaSignInAlt, FaStar, FaRegStar, FaChevronDown, FaChevronRight, FaChevronLeft, FaArrowRight } from 'react-icons/fa';
import { MessageSquare, Home, Users } from 'lucide-react';
import clsx from 'clsx';
import apiService from '../../../../apiService';
import './ConversationList.css';

// Componente SVG personalizado para el ícono de comunidad (Asignados)
const CommunityIcon = ({ size = 16, className, style, strokeWidth, ...props }) => (
    <svg viewBox="0 0 30 30" height={size} width={size} preserveAspectRatio="xMidYMid meet" fill="none" className={className} style={{ minWidth: `${size}px`, flexShrink: 0, ...style }}>
        <path d="M7.85445 17.0075C7.73851 17.0026 7.62033 17 7.50003 17C6.60797 17 5.83268 17.1426 5.22106 17.3148C4.69554 17.4627 4.0988 17.7054 3.5974 18.0919C3.08634 18.4858 2.62143 19.0755 2.52966 19.8877C2.48679 20.2672 2.50003 21.0796 2.51038 21.5399C2.52882 22.3601 3.20095 23 4.00656 23H7.35217C7.15258 22.5784 7.03459 22.1084 7.01993 21.6087C7.01572 21.4651 7.00943 21.25 7.00505 21H4.50165C4.49773 20.6191 4.50034 20.2599 4.51702 20.1123C4.5308 19.9903 4.59776 19.846 4.81844 19.6759C5.04878 19.4983 5.38363 19.3468 5.7631 19.2399C6.12883 19.137 6.57191 19.0478 7.07407 19.0142C7.12499 18.6798 7.20695 18.3652 7.31207 18.0721C7.45559 17.6719 7.64219 17.3186 7.85445 17.0075Z" fill="currentColor" />
        <path d="M24.6478 23H27.9935C28.7991 23 29.4712 22.3601 29.4897 21.5399C29.5 21.0796 29.5133 20.2672 29.4704 19.8877C29.3786 19.0755 28.9137 18.4858 28.4027 18.0919C27.9013 17.7054 27.3045 17.4627 26.779 17.3148C26.1674 17.1426 25.3921 17 24.5 17C24.3797 17 24.2615 17.0026 24.1456 17.0075C24.3578 17.3186 24.5444 17.6719 24.6879 18.0721C24.793 18.3652 24.875 18.6798 24.9259 19.0142C25.4281 19.0478 25.8712 19.1369 26.237 19.2399C26.6164 19.3468 26.9513 19.4983 27.1816 19.6759C27.4023 19.846 27.4693 19.9903 27.483 20.1123C27.4997 20.2599 27.5023 20.6191 27.4984 21H24.9949C24.9906 21.25 24.9843 21.4651 24.9801 21.6087C24.9654 22.1084 24.8474 22.5784 24.6478 23Z" fill="currentColor" />
        <path fillRule="evenodd" clipRule="evenodd" d="M16 18C14.6099 18 13.4517 18.2363 12.6506 18.4683C12.2195 18.5931 11.8437 18.7329 11.5552 18.9105C11.275 19.0829 11.1382 19.2525 11.0772 19.4224C11.0547 19.4853 11.0366 19.5555 11.0259 19.6343C10.9955 19.8585 10.996 20.4459 11.0064 21H20.9936C21.004 20.4459 21.0045 19.8585 20.9741 19.6343C20.9634 19.5555 20.9453 19.4853 20.9228 19.4224C20.8618 19.2525 20.725 19.0829 20.4448 18.9105C20.1563 18.7329 19.7805 18.5931 19.3494 18.4683C18.5483 18.2363 17.3901 18 16 18ZM12.0944 16.5472C13.0378 16.274 14.3855 16 16 16C17.6145 16 18.9622 16.274 19.9056 16.5472C20.392 16.688 20.9732 16.8873 21.493 17.2071C22.0211 17.532 22.5438 18.0181 22.8053 18.7473C22.8735 18.9373 22.9259 19.1436 22.956 19.3657C23.0234 19.8633 22.9976 20.9826 22.9809 21.5501C22.957 22.3659 22.287 23 21.4851 23H10.5149C9.71301 23 9.043 22.3659 9.01907 21.5501C9.00243 20.9826 8.97657 19.8633 9.04404 19.3657C9.07414 19.1436 9.1265 18.9373 9.19466 18.7473C9.45616 18.0181 9.97894 17.532 10.507 17.2071C11.0268 16.8873 11.608 16.688 12.0944 16.5472Z" fill="currentColor" />
        <path fillRule="evenodd" clipRule="evenodd" d="M24.5 12C23.9477 12 23.5 12.4477 23.5 13C23.5 13.5523 23.9477 14 24.5 14C25.0523 14 25.5 13.5523 25.5 13C25.5 12.4477 25.0523 12 24.5 12ZM21.5 13C21.5 11.3431 22.8431 10 24.5 10C26.1569 10 27.5 11.3431 27.5 13C27.5 14.6569 26.1569 16 24.5 16C22.8431 16 21.5 14.6569 21.5 13Z" fill="currentColor" />
        <path fillRule="evenodd" clipRule="evenodd" d="M16 9C14.8954 9 14 9.89543 14 11C14 12.1046 14.8954 13 16 13C17.1046 13 18 12.1046 18 11C18 9.89543 17.1046 9 16 9ZM12 11C12 8.79086 13.7909 7 16 7C18.2091 7 20 8.79086 20 11C20 13.2091 18.2091 15 16 15C13.7909 15 12 13.2091 12 11Z" fill="currentColor" />
        <path fillRule="evenodd" clipRule="evenodd" d="M7.5 12C6.94772 12 6.5 12.4477 6.5 13C6.5 13.5523 6.94772 14 7.5 14C8.05228 14 8.5 13.5523 8.5 13C8.5 12.4477 8.05228 12 7.5 12ZM4.5 13C4.5 11.3431 5.84315 10 7.5 10C9.15685 10 10.5 11.3431 10.5 13C10.5 14.6569 9.15685 16 7.5 16C5.84315 16 4.5 14.6569 4.5 13Z" fill="currentColor" />
    </svg>
);

// Componente SVG personalizado para el ícono de pin (Fijado)
const PinIcon = ({ size = 14, className, style }) => (
    <svg viewBox="0 0 20 20" height={size} width={size} preserveAspectRatio="xMidYMid meet" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
        <path d="M13.5 4.5V11L15.2708 12.7708C15.3403 12.8403 15.3958 12.9201 15.4375 13.0104C15.4792 13.1007 15.5 13.2014 15.5 13.3125V13.746C15.5 13.9597 15.4281 14.1388 15.2844 14.2833C15.1406 14.4278 14.9625 14.5 14.75 14.5H10.75V19.125C10.75 19.3375 10.6785 19.5156 10.5356 19.6594C10.3927 19.8031 10.2156 19.875 10.0044 19.875C9.79313 19.875 9.61458 19.8031 9.46875 19.6594C9.32292 19.5156 9.25 19.3375 9.25 19.125V14.5H5.25C5.0375 14.5 4.85938 14.4278 4.71563 14.2833C4.57188 14.1388 4.5 13.9597 4.5 13.746V13.3125C4.5 13.2014 4.52083 13.1007 4.5625 13.0104C4.60417 12.9201 4.65972 12.8403 4.72917 12.7708L6.5 11V4.5H6.25C6.0375 4.5 5.85938 4.42854 5.71563 4.28563C5.57188 4.14271 5.5 3.96563 5.5 3.75438C5.5 3.54313 5.57188 3.36458 5.71563 3.21875C5.85938 3.07292 6.0375 3 6.25 3H13.75C13.9625 3 14.1406 3.07146 14.2844 3.21437C14.4281 3.35729 14.5 3.53437 14.5 3.74562C14.5 3.95687 14.4281 4.13542 14.2844 4.28125C14.1406 4.42708 13.9625 4.5 13.75 4.5H13.5ZM6.625 13H13.375L12 11.625V4.5H8V11.625L6.625 13Z" fill="currentColor" />
    </svg>
);

// Componente reutilizable para cada pestaña
const TabButton = ({ isActive, onClick, label, shortLabel, icon: Icon, notificationCount }) => {
    return (
        <button
            onClick={onClick}
            className={clsx(
                'relative flex items-center justify-center border-none cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0',
                {
                    'bg-red-600 text-white font-semibold shadow-lg': isActive,
                    'bg-white/90 text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:scale-[1.02] font-medium': !isActive,
                },
                'max-[768px]:flex-1 max-[1280px]:!w-10 max-[1280px]:!h-10 max-[1280px]:!p-2'
            )}
            style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                height: '40px',
                padding: '8px 12px',
                gap: '8px',
                minWidth: 'fit-content'
            }}
        >
            <Icon size={16} strokeWidth={2} className="flex-shrink-0" style={{ minWidth: '16px' }} />
            <span className="font-medium whitespace-nowrap max-[768px]:block min-[769px]:max-[1280px]:hidden" style={{ fontSize: '13px', lineHeight: '100%', fontWeight: 500 }}>
                {label}
            </span>
            {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
                    {notificationCount}
                </span>
            )}
        </button>
    );
};

// Componente de lista colapsable y redimensionable (INTEGRADO)
const CollapsibleList = ({ title, icon: Icon, children, isOpen, onToggle, onLoadMore, hasMore, isLoading, className, contentClassName, defaultHeight = 356 }) => {
    const [height, setHeight] = useState(defaultHeight);
    const listRef = useRef(null);
    const isResizing = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const startResizing = useCallback((e) => {
        e.preventDefault();
        isResizing.current = true;
        startY.current = e.clientY;
        startHeight.current = height;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    }, [height]);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current) return;
        const deltaY = e.clientY - startY.current;
        const newHeight = startHeight.current + deltaY;
        if (newHeight > 76 && newHeight < 800) {
            setHeight(newHeight);
        }
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }, [handleMouseMove]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading && onLoadMore) {
            onLoadMore();
        }
    };

    return (
        <div className={`mx_RoomSublist ${className || ''}`} style={{ height: isOpen ? `${height}px` : 'auto' }} ref={listRef}>
            <div className="mx_RoomSublist_header" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-gray-400" />}
                    <span>{title}</span>
                </div>
                {isOpen ? <FaChevronDown className="w-2.5 h-2.5 text-gray-400" /> : <FaChevronRight className="w-2.5 h-2.5 text-gray-400" />}
            </div>

            {isOpen && (
                <>
                    <div className={`mx_RoomSublist_content mx_AutoHideScrollbar ${contentClassName || ''}`} onScroll={handleScroll}>
                        {children}
                        {isLoading && <div className="text-center py-2 text-xs text-gray-500">Cargando...</div>}
                    </div>
                    <div className="mx_RoomSublist_resizerHandle" onMouseDown={startResizing}></div>
                </>
            )}
        </div>
    );
};