import React from 'react';
import RoomCreatedModal from './modals/RoomCreatedModal';
import CreateConversationModal from './modals/CreateConversationModal';
import ManageAssignedConversationsModal from './modals/ManageAssignedConversationsModal';
import AddUsersToRoomModal from './modals/AddUsersToRoomModal';
import RemoveUsersFromRoomModal from './modals/RemoveUsersFromRoomModal';

/**
 * Componente contenedor que agrupa todos los modales del chat
 * Reduce la complejidad de ChatPage.jsx centralizando la gestión de modales
 */
const ChatModalsContainer = ({
    // Room Created Modal
    showRoomCreatedModal,
    setShowRoomCreatedModal,
    createdRoomData,
    setCreatedRoomData,

    // Create Conversation Modal
    showCreateConversationModal,
    setShowCreateConversationModal,
    onCreateConversation,
    currentUser,

    // Manage Conversations Modal
    showManageConversationsModal,
    setShowManageConversationsModal,
    onConversationUpdated,
    socket,

    // Add Users To Room Modal
    showAddUsersToRoomModal,
    setShowAddUsersToRoomModal,
    currentRoomCode,
    to,
    roomUsers,
    onUsersAdded,

    // Remove Users From Room Modal
    showRemoveUsersFromRoomModal,
    setShowRemoveUsersFromRoomModal,
    username,
    onUsersRemoved,
    userList = [],
}) => {
    return (
        <>
            {/* Room Created Modal */}
            <RoomCreatedModal
                isOpen={showRoomCreatedModal}
                onClose={() => {
                    setShowRoomCreatedModal(false);
                    setCreatedRoomData(null);
                }}
                roomData={createdRoomData}
            />

            {/* Create Conversation Modal */}
            <CreateConversationModal
                isOpen={showCreateConversationModal}
                onClose={() => setShowCreateConversationModal(false)}
                onCreateConversation={onCreateConversation}
                currentUser={currentUser}
            />

            {/* Manage Assigned Conversations Modal */}
            <ManageAssignedConversationsModal
                show={showManageConversationsModal}
                onClose={() => setShowManageConversationsModal(false)}
                onConversationUpdated={onConversationUpdated}
                currentUser={currentUser}
                socket={socket}
            />

            {/* Add Users To Room Modal */}
            <AddUsersToRoomModal
                isOpen={showAddUsersToRoomModal}
                onClose={() => setShowAddUsersToRoomModal(false)}
                roomCode={currentRoomCode}
                roomName={to}
                currentMembers={roomUsers}
                onUserAdded={onUsersAdded}
            />

            {/* Remove Users From Room Modal */}
            <RemoveUsersFromRoomModal
                isOpen={showRemoveUsersFromRoomModal}
                onClose={() => setShowRemoveUsersFromRoomModal(false)}
                roomCode={currentRoomCode}
                roomName={to}
                currentMembers={roomUsers}
                userList={userList}
                currentUser={username}
                removerUser={currentUser}
                onUsersRemoved={onUsersRemoved}
            />
        </>
    );
};

export default ChatModalsContainer;
