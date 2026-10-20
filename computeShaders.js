// ═══════════════════════════════════════════════════
//  CELI AI — WEBGPU PARTICLE RENDER SHADER (WGSL)
// ═══════════════════════════════════════════════════

export const PARTICLE_RENDER_SHADER = /* wgsl */ `
struct Particle {
  position : vec3<f32>,
  _pad0    : f32, // Alineación de 16 bytes garantizada
  velocity : vec3<f32>,
  _pad1    : f32,
  life     : f32,
  size     : f32,
  color    : vec3<f32>,
  _pad2    : f32, // Forzar que cada elemento del array ocupe múltiplos de 16 bytes en la estructura de almacenamiento
};

struct ViewUniforms {
  viewProjection : mat4x4<f32>,
  viewMatrix     : mat4x4<f32>, // Inyectamos la matriz de vista pura para un billboarding preciso
  cameraPos      : vec3<f32>,
  time           : f32,
  pixelRatio     : f32,
  glowIntensity  : f32,
  _pad0          : vec2<f32>,  // Alineación estricta de 16 bytes del Uniform buffer
};

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) color          : vec3<f32>,
  @location(1) life           : f32,
  @location(2) pointCoord     : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> view: ViewUniforms;

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex : u32,
) -> VertexOutput {
  let p = particles[instanceIndex];
  var out: VertexOutput;

  // Si la partícula está muerta, colapsamos el vértice para que el rasterizador no gaste fillrate
  if (p.life <= 0.0) {
    out.position = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    return out;
  }

  // Billboard quad (2 triángulos = 6 vértices por partícula)
  var quadPos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0),
  );

  let offset = quadPos[vertexIndex];
  
  // EXTRAER VECTORES DE LA MATRIZ DE VISTA PURA (Inversa de la cámara, sin distorsión de proyección)
  // Las primeras tres filas/columnas de la matriz de vista contienen la orientación pura de la cámara en el espacio
  let right = normalize(vec3<f32>(view.viewMatrix[0][0], view.viewMatrix[1][0], view.viewMatrix[2][0]));
  let up    = normalize(vec3<f32>(view.viewMatrix[0][1], view.viewMatrix[1][1], view.viewMatrix[2][1]));

  // Efecto procedural de centelleo integrado directamente en el core de la GPU
  let pulse = 0.85 + 0.15 * sin(view.time * 4.5 + f32(instanceIndex) * 0.13);
  let size = p.size * pulse * view.pixelRatio;

  // Desplazamiento del billboard plano orientado a la cámara antes de la proyección de perspectiva
  let worldPos = p.position + (right * offset.x + up * offset.y) * size;

  out.position = view.viewProjection * vec4<f32>(worldPos, 1.0);
  out.color    = p.color;
  out.life     = p.life;
  
  // Coordenadas UV perfectas para el Fragment Shader [0.0 a 1.0]
  out.pointCoord = offset * 0.5 + 0.5;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let center = in.pointCoord - vec2<f32>(0.5, 0.5);
  let dist2  = dot(center, center); // Usar dot product es mucho más veloz que length() porque evita la raíz cuadrada

  // Descartar fragmentos fuera del radio circular metálico (0.5^2 = 0.25)
  if (dist2 > 0.25) { discard; }

  // Glow radial holográfico interpolado en caliente
  let dist = sqrt(dist2);
  let core = smoothstep(0.5, 0.0, dist);
  
  // Atenuación no lineal basada en el decaimiento de la partícula y la intensidad uniform
  let intensity = pow(core, 1.3) * view.glowIntensity;
  
  // Multiplicar el alfa por el ciclo de vida remanente
  let alpha = core * in.life * 0.95;
  let finalColor = in.color * intensity;

  return vec4<f32>(finalColor, alpha);
}
`;