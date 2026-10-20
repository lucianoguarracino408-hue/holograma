bus.on('scene:explode', () => {
  // Le indica al renderizador WebGPU que cambie temporalmente el modo de físicas
  this.gpu.setTemporaryPhysicsMode('EXPLODE', 1200); // 1.2 segundos de explosión cinética
  console.log('💥 Explotando partículas en VRAM');
});