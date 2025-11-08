import './WelcomeScreen.css';
import teleoperadora from '../assets/teleoperadora.png';

const WelcomeScreen = () => {
  return (
    <div className="welcome-screen-container">
      <div className="welcome-content">
        <div className="welcome-center">
          <div className="welcome-main-container">
            <h1 className="welcome-title">Te damos la bienvenida al Chat Corporativo</h1>
            <h2 className="welcome-subtitle">¡Únete a la comunidad de Chats y conversaciones!</h2>
            <div className="welcome-bottom">
              <div className="welcome-options">
                <div className="welcome-option">
                  <div className="option-icon">💬</div>
                  <div className="option-text">Envía un mensaje directo</div>
                </div>

                <div className="welcome-option">
                  <div className="option-icon">🔍</div>
                  <div className="option-text">Explora las salas públicas</div>
                </div>

                <div className="welcome-option">
                  <div className="option-icon">👥</div>
                  <div className="option-text">Crea un grupo</div>
                </div>
              </div>

              <div className="welcome-image">
                <img src={teleoperadora} alt="Teleoperadora" className="teleoperadora-image" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;

