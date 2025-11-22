import { FaVideo } from 'react-icons/fa';
import './VideoCallNotification.css';

const VideoCallNotification = ({ message, formatTime }) => {
    const handleJoinCall = () => {
        window.open(message.videoCallUrl, '_blank', 'width=1280,height=720');
    };

    return (
        <div className="video-call-notification">
            <div className="video-call-header">
                <div className="video-call-icon">
                    📹
                </div>
                <div className="video-call-info">
                    <div className="video-call-title">
                        Videollamada iniciada
                    </div>
                    <div className="video-call-sender">
                        {message.sender} te invita a unirte
                    </div>
                </div>
            </div>
            <button className="video-call-join-btn" onClick={handleJoinCall}>
                <FaVideo size={18} />
                UNIRSE A LA LLAMADA
            </button>
            <div className="video-call-time">
                {formatTime(message.time)}
            </div>
        </div>
    );
};

export default VideoCallNotification;
