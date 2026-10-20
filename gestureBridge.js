import { bus } from './AI/eventBus.js';

// Convierte landmarks de MediaPipe en atractor 3D para el GPU_ENGINE
export class GestureBridge {
  constructor(gpuRenderer, { sensitivity = 1.5 } = {}) {
    this.gpu = gpuRenderer;
    this.sensitivity = sensitivity;
    this.smoothPos = { x: 0, y: 0, z: 0 };
    this.smoothing = 0.3;
    this._bind();
  }

  _bind() {
    // MediaPipe emite estos eventos (los añadirás en GESTURE_ENGINE)
    bus.on('gesture:hand', (data) => {
      const { landmarks, handedness } = data;
      if (!landmarks || landmarks.length === 0) {
        this.gpu.clearAttractor();
        return;
      }

      // Índice del dedo (landmark 8) como atractor principal
      const index = landmarks[0][8];
      const rawX = (index.x - 0.5) * 2 * this.sensitivity;
      const rawY = -(index.y - 0.5) * 2 * this.sensitivity;
      const rawZ = -index.z * this.sensitivity;

      // Suavizado exponencial
      this.smoothPos.x += (rawX - this.smoothPos.x) * this.smoothing;
      this.smoothPos.y += (rawY - this.smoothPos.y) * this.smoothing;
      this.smoothPos.z += (rawZ - this.smoothPos.z) * this.smoothing;

      this.gpu.setAttractor(this.smoothPos.x, this.smoothPos.y, this.smoothPos.z);
    });

    // Gestos especiales
    bus.on('gesture:pinch', () => {
      // Pinch = colapsar partículas al centro
      this.gpu.setAttractor(0, 0, 0);
      console.log('🤏 Pinch detectado');
    });

    bus.on('gesture:open-palm', () => {
      // Palma abierta = explosión
      bus.emit('scene:explode', {});
      console.log('🖐️ Palma abierta');
    });
  }
}