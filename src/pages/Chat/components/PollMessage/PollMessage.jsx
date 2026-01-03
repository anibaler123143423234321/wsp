import { useState } from 'react';
import './PollMessage.css';

const PollMessage = ({ poll, onVote, currentUsername, messageId }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [hasVoted, setHasVoted] = useState(
        poll.votes && poll.votes.some(v => v.username === currentUsername)
    );

    if (!poll || !poll.options) {
        return <div className="poll-message-error">Error al cargar la encuesta</div>;
    }

    const totalVotes = poll.votes ? poll.votes.length : 0;
    // ... rest of component

    const getVotesForOption = (optionIndex) => {
        if (!poll.votes) return 0;
        return poll.votes.filter(v => v.optionIndex === optionIndex).length;
    };

    const getPercentage = (optionIndex) => {
        if (totalVotes === 0) return 0;
        return Math.round((getVotesForOption(optionIndex) / totalVotes) * 100);
    };

    const handleVote = () => {
        if (selectedOption === null || hasVoted) return;

        onVote(messageId, selectedOption);
        setHasVoted(true);
    };

    const getUserVote = () => {
        if (!poll.votes) return null;
        const userVote = poll.votes.find(v => v.username === currentUsername);
        return userVote ? userVote.optionIndex : null;
    };

    const userVoteIndex = getUserVote();

    return (
        <div className="poll-message-container">
            <div className="poll-message-header">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M9 11h2V9H9v2zm4 0h2V9h-2v2zm-4 4h2v-2H9v2zm4 0h2v-2h-2v2zm-8 6h18V3H5v18zm16-16v14H7V5h12z" />
                </svg>
                <span>Encuesta</span>
            </div>

            <div className="poll-message-question">{poll.question}</div>

            <div className="poll-message-options">
                {poll.options.map((option, index) => {
                    const votes = getVotesForOption(index);
                    const percentage = getPercentage(index);
                    const isSelected = selectedOption === index;
                    const isUserVote = hasVoted && userVoteIndex === index;

                    return (
                        <div
                            key={index}
                            className={`poll-option ${hasVoted ? 'poll-option-result' : 'poll-option-selectable'
                                } ${isSelected ? 'poll-option-selected' : ''} ${isUserVote ? 'poll-option-user-vote' : ''
                                }`}
                            onClick={() => !hasVoted && setSelectedOption(index)}
                        >
                            {hasVoted && (
                                <div
                                    className="poll-option-bar"
                                    style={{ width: `${percentage}%` }}
                                />
                            )}

                            <div className="poll-option-content">
                                <span className="poll-option-text">{option}</span>
                                {hasVoted && (
                                    <span className="poll-option-stats">
                                        {votes} {votes === 1 ? 'voto' : 'votos'} ({percentage}%)
                                    </span>
                                )}
                            </div>

                            {!hasVoted && isSelected && (
                                <div className="poll-option-radio poll-option-radio-selected" />
                            )}
                            {!hasVoted && !isSelected && (
                                <div className="poll-option-radio" />
                            )}
                        </div>
                    );
                })}
            </div>

            {!hasVoted && (
                <button
                    className="poll-vote-btn"
                    onClick={handleVote}
                    disabled={selectedOption === null}
                >
                    Votar
                </button>
            )}

            <div className="poll-message-footer">
                {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
            </div>
        </div>
    );
};

export default PollMessage;
