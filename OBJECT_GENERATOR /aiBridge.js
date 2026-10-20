// ═══════════════════════════════════════════════════
//  CELI AI — GPU_ENGINE: UNIFIED PHYSICS UNIFORMS (WebGPU)
// ═══════════════════════════════════════════════════

export class GPUPhysics {
  constructor() {
    // Definimos el tamaño del bloque en bytes (Alineado estrictamente a múltiplos de 16 bytes)
    // 4 bytes por float. 16 floats/ints = 64 bytes totales.
    this.uniformBufferSize = 64; 
    this.uniformBuffer = null;
    this.stagingArray = new Float32Array(16); // Buffer espejo en CPU
    
    // Mapeo interno de modos físicos para el Compute Shader
    this.modes = {
      'NONE': 0, 'ATTRACT': 1, 'GRAB': 2, 'DRAG': 3, 
      'COMPRESS': 4, 'THROW': 5, 'MAGNETIC': 6, 
      'MOLD': 7, 'SPIN': 8, 'SCALE': 9, 'WRIST_ROT': 10,
      'EXPLODE': 11 // Identificador para la física expansiva de explosión
    };
  }

  /**
   * Inicializa el buffer físico persistente en la GPU
   */
  init(device) {
    this.uniformBuffer = device.createBuffer({
      label: '⚡️ CELI Physics Uniform Buffer',
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  /**
   * Serializa y sube los datos a la tarjeta gráfica en un único paso binario plano
   * @param {GPUDevice} device 
   * @param {Object} input - Datos del frontend (MediaPipe/UI) y del AIBridge
   */
  update(device, input) {
    if (!this.uniformBuffer) return;

    // Extraer variables con fallbacks seguros
    const hx = input.hx ?? 0;
    const hy = input.hy ?? 0;
    const hz = input.hz ?? 0;
    const handOn = input.handOn ? 1.0 : 0.0;
    
    const hVelX = input.handVelX ?? 0;
    const hVelY = input.handVelY ?? 0;
    const hVelZ = input.handVelZ ?? 0;
    const spring = input.spring ?? 0.05;

    const size = input.size ?? 0.04;
    const glow = input.glowIntensity ?? 1.0;
    const time = input.time ?? performance.now() * 0.001;
    const pMode = this.modes[input.physicsMode] ?? 0;

    // ── EMPAQUETADO BINARIO ESTRICTO (Mapeo WGSL exacto de 16 bytes por bloque) ──
    // Bloque 0: Vector de posición de la mano + flag de presencia
    this.stagingArray[0] = hx;
    this.stagingArray[1] = hy;
    this.stagingArray[2] = hz;
    this.stagingArray[3] = handOn;

    // Bloque 1: Vector de velocidad de la mano + coeficiente de elasticidad (Spring)
    this.stagingArray[4] = hVelX;
    this.stagingArray[5] = hy; // Usamos la velocidad calculada
    this.stagingArray[6] = hVelZ;
    this.stagingArray[7] = spring;

    // Bloque 2: Atributos visuales y tiempo global
    this.stagingArray[8] = size;
    this.stagingArray[9] = glow;
    this.stagingArray[10] = time;
    this.stagingArray[11] = parseFloat(pMode); // Modo físico activo (Cast a float para el shader)

    // Bloques 3: Parámetros de transformación del holograma (Escala, offset y rotación)
    this.stagingArray[12] = input.holoScale ?? 1.0;
    this.stagingArray[13] = input.holoOffsetX ?? 0;
    this.stagingArray[14] = input.holoOffsetY ?? 0;
    this.stagingArray[15] = input.holoRotY ?? 0;

    // Transferencia atómica directa a la VRAM (Cero overhead, no genera basura en RAM)
    device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      this.stagingArray.buffer,
      this.stagingArray.byteOffset,
      this.stagingArray.byteLength
    );
  }

  dispose() {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
      this.uniformBuffer = null;
    }
  }
}
