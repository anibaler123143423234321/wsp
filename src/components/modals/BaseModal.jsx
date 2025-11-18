import React from 'react';
import { FaTimes } from 'react-icons/fa';
import './Modal.css';

/**
 * Modal Base Genérico Reutilizable
 * 
 * @param {boolean} isOpen - Controla si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} title - Título del modal
 * @param {React.ReactNode} children - Contenido del modal
 * @param {string} headerBgColor - Color de fondo del header (default: #A50104)
 * @param {string} bodyBgColor - Color de fondo del body (default: #FFFFFF)
 * @param {string} titleColor - Color del texto del título (default: #FFFFFF)
 * @param {string} maxWidth - Ancho máximo del modal (default: 900px)
 * @param {React.ReactNode} icon - Ícono opcional para el título
 * @param {function} onSubmit - Función opcional para manejar submit del formulario
 */
const BaseModal = ({
  isOpen,
  onClose,
  title,
  children,
  headerBgColor = '#A50104',
  bodyBgColor = '#FFFFFF',
  titleColor = '#FFFFFF',
  maxWidth = '900px',
  icon = null,
  onSubmit = null,
  closeOnOverlayClick = true
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (onSubmit) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const ContentWrapper = onSubmit ? 'form' : 'div';

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bodyBgColor,
          maxWidth: maxWidth
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{ backgroundColor: headerBgColor }}
        >
          <h2 style={{
            color: titleColor,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {icon && <span>{icon}</span>}
            {title}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ color: titleColor }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <ContentWrapper
          onSubmit={onSubmit ? handleSubmit : undefined}
          className="modal-body"
          style={{ backgroundColor: bodyBgColor }}
        >
          {children}
        </ContentWrapper>
      </div>
    </div>
  );
};

export default BaseModal;

