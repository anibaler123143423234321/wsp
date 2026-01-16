import React, { useState, useEffect } from 'react';
import { FaUserCheck, FaUserTimes, FaSpinner } from 'react-icons/fa';
import apiService from '../../../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../../sweetalert2';

const PendingRequestsList = ({ roomCode, pendingMembers, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [processingUser, setProcessingUser] = useState(null);

    const handleApprove = async (username) => {
        try {
            setLoading(true);
            setProcessingUser(username);
            await apiService.approveJoinRequest(roomCode, username);
            await showSuccessAlert('Aprobado', `Usuario ${username} aprobado correctamente.`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error aprobando usuario:', error);
            await showErrorAlert('Error', 'No se pudo aprobar al usuario.');
        } finally {
            setLoading(false);
            setProcessingUser(null);
        }
    };

    const handleReject = async (username) => {
        const confirm = await showConfirmAlert(
            'Rechazar Solicitud',
            `¿Estás seguro de rechazar a ${username}?`
        );
        if (!confirm.isConfirmed) return;

        try {
            setLoading(true);
            setProcessingUser(username);
            await apiService.rejectJoinRequest(roomCode, username);
            await showSuccessAlert('Rechazado', `Solicitud de ${username} rechazada.`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error rechazando usuario:', error);
            await showErrorAlert('Error', 'No se pudo rechazar la solicitud.');
        } finally {
            setLoading(false);
            setProcessingUser(null);
        }
    };

    if (!pendingMembers || pendingMembers.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 bg-yellow-50/90 border border-yellow-200 rounded-xl shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-yellow-200/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                    <i className="fas fa-user-clock text-xs"></i>
                </div>
                <div className="flex-1">
                    <h6 className="m-0 text-yellow-900 font-semibold text-sm flex items-center gap-2">
                        Solicitudes Pendientes
                        <span className="px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
                            {pendingMembers.length}
                        </span>
                    </h6>
                </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                {pendingMembers.map((username) => (
                    <div
                        key={username}
                        className="flex items-center justify-between px-4 py-3 hover:bg-yellow-100/40 transition-colors border-b last:border-0 border-yellow-100"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-white border border-yellow-200 flex items-center justify-center text-yellow-600 shadow-sm shrink-0">
                                <span className="font-bold text-xs">{username.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="font-medium text-gray-700 text-sm truncate" title={username}>
                                {username}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 ml-3">
                            <button
                                className="w-8 h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
                                onClick={() => handleApprove(username)}
                                disabled={loading && processingUser === username}
                                title="Aprobar acceso"
                            >
                                {loading && processingUser === username ? (
                                    <FaSpinner className="animate-spin text-xs" />
                                ) : (
                                    <FaUserCheck className="text-xs" />
                                )}
                            </button>
                            <button
                                className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
                                onClick={() => handleReject(username)}
                                disabled={loading && processingUser === username}
                                title="Rechazar solicitud"
                            >
                                {loading && processingUser === username ? (
                                    <FaSpinner className="animate-spin text-xs" />
                                ) : (
                                    <FaUserTimes className="text-xs" />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendingRequestsList;
