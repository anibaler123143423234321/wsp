import './WelcomeScreen.css';
import logo from '../assets/Logotipo +34.svg';
import teleoperadora from '../assets/teleoperadora.png';

const WelcomeScreen = () => {
  return (
    <div className="welcome-screen-container">
      <div className="welcome-content">
        <div className="welcome-center">
          <div className="welcome-logo">
            <img src={logo} alt="+34 Logo" className="logo-image" />
          </div>

          <h1 className="welcome-title">Te damos la bienvenida</h1>

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
  );
};

export default WelcomeScreen;

