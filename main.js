// ═══════════════════════════════════════════════════
//  CELI AI — GPU_ENGINE: WEBGPU RENDERER COORDINATOR
// ═══════════════════════════════════════════════════

import { GPUPhysics } from './gpuPhysics.js';
import { ParticleCompute } from './particleCompute.js';
import { Instancing } from './instancing.js';

export class WebGPURenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.maxParticles = options.maxParticles || 50000;
    this.activeParticles = 0;

    // Instanciar submódulos del motor
    this.physics = new GPUPhysics();
    this.compute = new ParticleCompute(this.maxParticles);
    this.instancing = new Instancing();

    // Estado global de renderizado e inputs
    this.device = null;
    this.context = null;
    this.format = 'bgra8unorm';
    this.isRendering = false;

    // Input state unificado (alimentado por GestureBridge o Mouse)
    this.inputState = {
      hx: 0, hy: 0, hz: 0,
      handOn: false,
      handVelX: 0, handVelY: 0, handVelZ: 0,
      spring: 0.05,
      size: 0.04,
      glowIntensity: 1.2,
      physicsMode: 'NONE',
      time: 0,
      holoScale: 1.0,
      holoOffsetX: 0,
      holoOffsetY: 0,
      holoRotY: 0
    };

    // Estado temporal para forzar modos físicos desde AIBridge (ej: Explosiones)
    this.tempModeTimer = null;
  }

  /**
   * Inicializa la interfaz nativa WebGPU y vincula los pipelines gráficos
   */
  async init() {
    if (!navigator.gpu) {
      throw new Error('❌ WebGPU no está soportado en este navegador/sistema.');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) {
      throw new Error('❌ No se encontró un adaptador gráfico compatible.');
    }

    this.device = await adapter.requestDevice({
      label: '🎮 CELI Core Device Engine'
    });

    this.context = this.canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied'
    });

    // Redimensionar el canvas internamente de forma limpia
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    // Inicializar submódulos pasándoles el Device común
    this.physics.init(this.device);
    this.compute.init(this.device);
    this.instancing.init(this.device, this.format, this.compute.getParticleStorageBuffer());

    console.log(`⚡️ WebGPU inicializado con éxito. Techo: ${this.maxParticles} puntos.`);
  }

  /**
   * Modifica los targets de destino en caliente (Invocado por el AIBridge)
   */
  spawn(shape, count) {
    this.activeParticles = Math.min(count, this.maxParticles);
    if (this.activeParticles === 0) {
      this.inputState.physicsMode = 'NONE';
      return;
    }
    
    // Despacha un comando inmediato a la GPU para reordenar las posiciones deseadas (tgt)
    this.compute.writeShapeTargets(this.device, shape, this.activeParticles);
  }

  /**
   * Fuerza temporalmente un comportamiento físico (Útil para simular impactos o explosiones)
   */
  setTemporaryPhysicsMode(mode, durationMs) {
    if (this.tempModeTimer) clearTimeout(this.tempModeTimer);
    
    const previousMode = this.inputState.physicsMode;
    this.inputState.physicsMode = mode;

    this.tempModeTimer = setTimeout(() => {
      if (this.inputState.physicsMode === mode) {
        this.inputState.physicsMode = previousMode;
      }
    }, durationMs);
  }

  /**
   * Inicia el bucle cíclico asíncrono a 60fps constantes
   */
  start() {
    if (this.isRendering) return;
    this.isRendering = true;
    
    const frame = () => {
      if (!this.isRendering) return;
      this._renderFrame();
      requestAnimationFrame(frame);
    };
    
    requestAnimationFrame(frame);
  }

  stop() {
    this.isRendering = false;
  }

  /**
   * Ejecuta la simulación física (Compute Pass) y el dibujo (Render Pass) sin salir de la GPU
   */
  _renderFrame() {
    this.inputState.time = performance.now() * 0.001;

    // 1. Sincronizar buffers de control físico en CPU y enviarlos a la VRAM
    this.physics.update(this.device, this.inputState);

    // 2. Crear el decodificador de comandos general para este Frame
    const commandEncoder = this.device.createCommandEncoder({
      label: '🎬 CELI Encoder Queue'
    });

    // 3. Ejecutar simulación matemática de partículas (Compute Pipeline)
    this.compute.dispatch(commandEncoder, this.device, this.physics.uniformBuffer, this.activeParticles);

    // 4. Configurar textura del canvas y ejecutar pase de renderizado por instanciación
    const view = this.context.getCurrentTexture().createView();
    this.instancing.draw(commandEncoder, view, this.canvas.width, this.canvas.height, this.activeParticles);

    // 5. Enviar la cola final de comandos atómicos a la GPU
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Expone las estadísticas leídas por tu UI mínima en el script principal
   */
  getStats() {
    return {
      mode: this.inputState.physicsMode,
      particles: this.activeParticles
    };
  }

  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1.0, 1.2); // Forzado a 1.2 para mitigar caídas de tensión gráfica
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
  }
}