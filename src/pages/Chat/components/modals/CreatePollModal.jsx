import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import './CreatePollModal.css';

const CreatePollModal = ({ isOpen, onClose, onCreatePoll }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    // State para controlar qué emoji picker mostrar: { type: 'question' | 'option' | null, index: number | null }
    const [activeEmojiPicker, setActiveEmojiPicker] = useState({ type: null, index: null });

    const emojiPickerRef = useRef(null);

    // Cerrar picker al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.poll-emoji-btn')) {
                setActiveEmojiPicker({ type: null, index: null });
            }
        };

        if (activeEmojiPicker.type) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeEmojiPicker]);

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

    const onEmojiClick = (emojiData) => {
        const emoji = emojiData.emoji;

        if (activeEmojiPicker.type === 'question') {
            setQuestion(prev => prev + emoji);
        } else if (activeEmojiPicker.type === 'option' && activeEmojiPicker.index !== null) {
            const newOptions = [...options];
            newOptions[activeEmojiPicker.index] = (newOptions[activeEmojiPicker.index] || '') + emoji;
            setOptions(newOptions);
        }

        // Opcional: Cerrar picker después de seleccionar o mantener abierto
        // setActiveEmojiPicker({ type: null, index: null }); 
    };

    const toggleEmojiPicker = (type, index = null) => {
        if (activeEmojiPicker.type === type && activeEmojiPicker.index === index) {
            setActiveEmojiPicker({ type: null, index: null });
        } else {
            setActiveEmojiPicker({ type, index });
        }
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

        handleClose();
    };

    const handleClose = () => {
        setQuestion('');
        setOptions(['', '']);
        setActiveEmojiPicker({ type: null, index: null });
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
                        <div className="poll-input-wrapper">
                            <input
                                type="text"
                                className="poll-input"
                                placeholder="¿Cuál es tu opinión sobre...?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                maxLength={200}
                            />
                            <button
                                className={`poll-emoji-btn ${activeEmojiPicker.type === 'question' ? 'active' : ''}`}
                                onClick={() => toggleEmojiPicker('question')}
                            >
                                <FaSmile />
                            </button>

                            {activeEmojiPicker.type === 'question' && (
                                <div className="poll-emoji-picker-container" ref={emojiPickerRef}>
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        width={300}
                                        height={350}
                                        theme="dark" // O "light" dependiendo del tema
                                        previewConfig={{ showPreview: false }}
                                    />
                                </div>
                            )}
                        </div>
                        <span className="poll-char-count">{question.length}/200</span>
                    </div>

                    <div className="poll-form-group">
                        <label>Opciones</label>
                        <div className="poll-options-list">
                            {options.map((option, index) => (
                                <div key={index} className="poll-option-item">
                                    <div className="poll-input-wrapper">
                                        <input
                                            type="text"
                                            className="poll-input"
                                            placeholder={`Opción ${index + 1}`}
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            maxLength={100}
                                        />
                                        <button
                                            className={`poll-emoji-btn ${activeEmojiPicker.type === 'option' && activeEmojiPicker.index === index ? 'active' : ''}`}
                                            onClick={() => toggleEmojiPicker('option', index)}
                                        >
                                            <FaSmile />
                                        </button>

                                        {activeEmojiPicker.type === 'option' && activeEmojiPicker.index === index && (
                                            <div className="poll-emoji-picker-container" ref={emojiPickerRef} style={{ top: '40px', right: '0' }}>
                                                <EmojiPicker
                                                    onEmojiClick={onEmojiClick}
                                                    width={300}
                                                    height={350}
                                                    theme="dark"
                                                    previewConfig={{ showPreview: false }}
                                                />
                                            </div>
                                        )}
                                    </div>

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
