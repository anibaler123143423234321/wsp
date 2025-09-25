// Clase para manejar la grabación de audio
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.startTime = null;
    this.timerInterval = null;
  }

  // Iniciar la grabación
  async startRecording(onTimerUpdate) {
    try {
      // Solicitar permisos para acceder al micrófono
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Crear el MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      // Limpiar chunks anteriores
      this.audioChunks = [];
      
      // Configurar evento para recopilar datos
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Iniciar grabación
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Iniciar temporizador
      this.startTime = Date.now();
      this.timerInterval = setInterval(() => {
        if (onTimerUpdate) {
          const elapsedTime = Date.now() - this.startTime;
          onTimerUpdate(this.formatTime(elapsedTime));
        }
      }, 1000);
      
      console.log('Grabación iniciada');
      return true;
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      return false;
    }
  }

  // Detener la grabación
  async stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }
    
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        // Detener el temporizador
        clearInterval(this.timerInterval);
        
        // Crear un blob con los chunks de audio
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Convertir a base64
        const base64Audio = await this.blobToBase64(audioBlob);
        
        // Detener todas las pistas del stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.isRecording = false;
        console.log('Grabación detenida');
        
        // Devolver el audio en formato base64
        resolve({
          blob: audioBlob,
          base64: base64Audio,
          duration: Date.now() - this.startTime
        });
      };
      
      this.mediaRecorder.stop();
    });
  }

  // Cancelar la grabación
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      
      // Detener el temporizador
      clearInterval(this.timerInterval);
      
      // Detener todas las pistas del stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      this.isRecording = false;
      console.log('Grabación cancelada');
    }
  }

  // Verificar si está grabando
  isCurrentlyRecording() {
    return this.isRecording;
  }

  // Convertir blob a base64
  blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  // Formatear tiempo en formato mm:ss
  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
