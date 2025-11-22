import React from 'react';
import { FaChevronUp } from 'react-icons/fa';
import './LoadMoreMessages.css';

const LoadMoreMessages = ({
  hasMoreMessages,
  isLoadingMore,
  onLoadMore
}) => {
  if (!hasMoreMessages) {
    return null;
  }

  return (
    <div className="load-more-container">
      <button
        className="load-more-btn"
        onClick={onLoadMore}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? (
          <>
            <span className="loading-spinner"></span>
            Cargando mensajes anteriores...
          </>
        ) : (
          <>
            <span className="load-icon"><FaChevronUp /></span>
            Cargar mensajes anteriores
          </>
        )}
      </button>
    </div>
  );
};

export default LoadMoreMessages;
