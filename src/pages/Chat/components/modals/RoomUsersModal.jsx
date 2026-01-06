import React from 'react';
import { FaUsers, FaCircle } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './Modal.css';

const RoomUsersModal = ({ isOpen, onClose, roomName, users = [], maxCapacity = 0 }) => {
    const onlineUsers = users.filter(u => u.isOnline);
    const offlineUsers = users.filter(u => !u.isOnline);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Usuarios de ${roomName}`}
            icon={<FaUsers />}
            headerBgColor="#A50104"
            bodyBgColor="#FFFFFF"
            titleColor="#FFFFFF"
            maxWidth="500px"
        >
            {/* Contador */}
            <div style={{
                padding: '12px 16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ color: '#333', fontWeight: 500 }}>
                    Total: {users.length} / {maxCapacity}
                </span>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>
                    🟢 En línea: {onlineUsers.length}
                </span>
            </div>

            {/* Lista de usuarios */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {/* Usuarios en línea */}
                {onlineUsers.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#16a34a',
                            marginBottom: '8px',
                            textTransform: 'uppercase'
                        }}>
                            En línea ({onlineUsers.length})
                        </div>
                        {onlineUsers.map((user, index) => (
                            <div
                                key={user.id || index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    border: '1px solid #e5e7eb'
                                }}
                            >
                                <FaCircle style={{ color: '#16a34a', fontSize: '8px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '14px' }}>
                                        {user.displayName || user.username}
                                    </div>
                                    {user.role && (
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                            {user.role} {user.numeroAgente ? `• #${user.numeroAgente}` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Usuarios desconectados */}
                {offlineUsers.length > 0 && (
                    <div>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#9ca3af',
                            marginBottom: '8px',
                            textTransform: 'uppercase'
                        }}>
                            Desconectados ({offlineUsers.length})
                        </div>
                        {offlineUsers.map((user, index) => (
                            <div
                                key={user.id || index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    backgroundColor: '#fafafa',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    border: '1px solid #e5e7eb',
                                    opacity: 0.7
                                }}
                            >
                                <FaCircle style={{ color: '#d1d5db', fontSize: '8px' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, color: '#6b7280', fontSize: '14px' }}>
                                        {user.displayName || user.username}
                                    </div>
                                    {user.role && (
                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                            {user.role} {user.numeroAgente ? `• #${user.numeroAgente}` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sin usuarios */}
                {users.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#9ca3af'
                    }}>
                        No hay usuarios en esta sala
                    </div>
                )}
            </div>

            {/* Botón cerrar */}
            <div className="modal-actions" style={{ borderTop: '1px solid #e0e0e0', marginTop: '16px' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        background: 'rgb(165, 1, 4)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Cerrar
                </button>
            </div>
        </BaseModal>
    );
};

export default RoomUsersModal;
