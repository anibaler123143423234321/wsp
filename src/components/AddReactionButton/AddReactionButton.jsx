import React from 'react';

/**
 * AddReactionButton - Botón reutilizable para agregar reacciones desde la lista de reacciones
 * 
 * @param {function} onClick - Manejador del evento click
 */
const AddReactionButton = ({ onClick }) => {
    return (
        <div
            className="reaction-pill add-reaction-btn"
            style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px', // Ancho fijo círculo
                height: '22px', // Altura píldora
                fontSize: '14px',
                color: '#8696a0',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d7db',
                borderRadius: '12px',
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(e);
            }}
            title="Agregar reacción"
        >
            +
        </div>
    );
};

export default AddReactionButton;
