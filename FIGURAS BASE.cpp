  #include <cmath>

#if defined(__has_include)
#  if __has_include("Engine.h")
#    include "Engine.h"
#  elif __has_include("../Engine.h")
#    include "../Engine.h"
#  elif __has_include("motor/Engine.h")
#    include "motor/Engine.h"
#  elif __has_include("../motor/Engine.h")
#    include "../motor/Engine.h"
#  else
#  endif
#else
#  include "Engine.h"
#endif

enum class BaseShape { SPHERE, CUBE, HELIX, SPIRAL };

template<typename ParticleSystemType>
void generateShape(ParticleSystemType& system, BaseShape shape, float radius = 1.0f) {
    auto& particles = system.getParticles(); // usa el overload no-const de Engine.h
    size_t total = particles.size();
    if (total == 0) return;

    for (size_t i = 0; i < total; ++i) {
        float t = static_cast<float>(i) / static_cast<float>(total);

        switch (shape) {
            case BaseShape::SPHERE: {
                // Distribución esférica de Fibonacci
                float phi = acos(1.0f - 2.0f * t);
                float theta = t * 2.399963f; // ángulo dorado en radianes
                particles[i].tx = radius * sin(phi) * cos(theta);
                particles[i].ty = radius * sin(phi) * sin(theta);
                particles[i].tz = radius * cos(phi);
                break;
            }
            case BaseShape::CUBE: {
                // Mapeo simple a coordenadas cúbicas
                float side = cbrtf((float)total);
                size_t sideCount = (size_t)ceilf(side);
                if (sideCount == 0) sideCount = 1;
                size_t ix = i % sideCount;
                size_t iy = (i / sideCount) % sideCount;
                size_t iz = i / (sideCount * sideCount);
                float denom = (sideCount > 1) ? (float)(sideCount - 1) : 1.0f;
                float x = ((float)ix / denom) * 2.0f - 1.0f;
                float y = ((float)iy / denom) * 2.0f - 1.0f;
                float z = ((float)iz / denom) * 2.0f - 1.0f;
                particles[i].tx = x * radius;
                particles[i].ty = y * radius;
                particles[i].tz = z * radius;
                break;
            }
            case BaseShape::HELIX: {
                // Doble hélice de ADN
                float height = (t - 0.5f) * 4.0f;
                float helixAngle = t * 10.0f * 3.14159f;
                float strand = (i % 2 == 0) ? 1.0f : -1.0f;
                particles[i].tx = strand * radius * cos(helixAngle);
                particles[i].ty = height;
                particles[i].tz = strand * radius * sin(helixAngle);
                break;
            }
            case BaseShape::SPIRAL: {
                float spiralRadius = t * radius;
                float spiralAngle = t * 8.0f * 3.14159f;
                particles[i].tx = spiralRadius * cos(spiralAngle);
                particles[i].ty = (t - 0.5f) * 2.0f;
                particles[i].tz = spiralRadius * sin(spiralAngle);
                break;
            }
        }
    }
}