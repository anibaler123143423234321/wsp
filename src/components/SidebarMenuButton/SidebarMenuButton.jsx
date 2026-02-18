import React from 'react';
import './SidebarMenuButton.css';

const SidebarMenuButton = ({ onClick, icon: Icon, label, title, className = '', style = {} }) => {
    return (
        <button
            className={`sidebar-menu-btn group ${className}`}
            onClick={onClick}
            title={title || label}
            style={style}
        >
            {Icon && (
                <Icon className="sidebar-menu-btn-icon" />
            )}
            <span className="sidebar-menu-btn-text">
                {label}
            </span>
        </button>
    );
};

export default SidebarMenuButton;
