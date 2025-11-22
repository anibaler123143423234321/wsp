import { useState } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import './CreatePollModal.css';

const CreatePollModal = ({ isOpen, onClose, onCreatePoll }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    if (!isOpen) return null;

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        // Validar que la pregunta no esté vacía
        if (!question.trim()) {
            alert('Por favor ingresa una pregunta');
            return;
        }

        // Validar que todas las opciones tengan texto
        const validOptions = options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            alert('Debes tener al menos 2 opciones');
            return;
        }

        // Crear la encuesta
        onCreatePoll({
            question: question.trim(),
            options: validOptions
        });

        // Resetear y cerrar
        setQuestion('');
        setOptions(['', '']);
        onClose();
    };

    const handleClose = () => {
        setQuestion('');
        setOptions(['', '']);
        onClose();
    };

    return (
        <div className="poll-modal-overlay" onClick={handleClose}>
            <div className="poll-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="poll-modal-header">
                    <h2>Crear Encuesta</h2>
                    <button className="poll-modal-close-btn" onClick={handleClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="poll-modal-content">
                    <div className="poll-form-group">
                        <label>Pregunta</label>
                        <input
                            type="text"
                            className="poll-input"
                            placeholder="¿Cuál es tu opinión sobre...?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            maxLength={200}
                        />
                        <span className="poll-char-count">{question.length}/200</span>
                    </div>

                    <div className="poll-form-group">
                        <label>Opciones</label>
                        <div className="poll-options-list">
                            {options.map((option, index) => (
                                <div key={index} className="poll-option-item">
                                    <input
                                        type="text"
                                        className="poll-input"
                                        placeholder={`Opción ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        maxLength={100}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            className="poll-remove-option-btn"
                                            onClick={() => handleRemoveOption(index)}
                                            title="Eliminar opción"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {options.length < 10 && (
                            <button className="poll-add-option-btn" onClick={handleAddOption}>
                                <FaPlus /> Agregar opción
                            </button>
                        )}
                    </div>
                </div>

                <div className="poll-modal-footer">
                    <button className="poll-btn poll-btn-cancel" onClick={handleClose}>
                        Cancelar
                    </button>
                    <button className="poll-btn poll-btn-create" onClick={handleSubmit}>
                        Crear Encuesta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePollModal;
