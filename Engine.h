#pragma once
#include <vector>
#include <memory>
#include <cstdint>

// Optimización: Estructuras de datos contiguas para la caché del CPU
struct Particle {
    float x, y, z;       // Posición
    float vx, vy, vz;    // Velocidad
    float tx, ty, tz;    // Posición objetivo (para formar la imagen)
    uint8_t r, g, b, a;  // Color (1 byte por canal para ahorrar RAM)
};

class ParticleSystem {
private:
    std::vector<Particle> particles; // Memory Pool pre-asignado
    size_t maxParticles;

public:
    ParticleSystem(size_t count) : maxParticles(count) {
        // Reservamos memoria una sola vez (Crítico para 4GB RAM)
        particles.reserve(count);
        particles.resize(count);
    }

    // Acciones basadas en tu interfaz HTML: ARMAR, ATRAER, REPELER, GIRO, MOLDEAR
    void applyForce(float handX, float handY, float handZ, float force, int action) {
        for (size_t i = 0; i < maxParticles; ++i) {
            Particle& p = particles[i];
            
            // Cálculo de distancia simplificado (sin sqrt para ahorrar CPU)
            float dx = handX - p.x;
            float dy = handY - p.y;
            float dz = handZ - p.z;
            float distSq = dx*dx + dy*dy + dz*dz + 0.001f; // Evitar división por cero

            if (action == 1) { // ATRAER
                p.vx += (dx / distSq) * force;
                p.vy += (dy / distSq) * force;
                p.vz += (dz / distSq) * force;
            } else if (action == 2) { // REPELER
                p.vx -= (dx / distSq) * force;
                p.vy -= (dy / distSq) * force;
                p.vz -= (dz / distSq) * force;
            }
            // ... (Aquí se agregarían GIRO y MOLDEAR)

            // Mover hacia el objetivo (ARMAR imagen) con densidad/rotación
            p.vx += (p.tx - p.x) * 0.05f; 
            p.vy += (p.ty - p.y) * 0.05f;
            p.vz += (p.tz - p.z) * 0.05f;

            // Actualizar posición con amortiguación
            p.x += p.vx * 0.9f; // 0.9 es la fricción
            p.y += p.vy * 0.9f;
            p.z += p.vz * 0.9f;
        }
    }

    const std::vector<Particle>& getParticles() const { return particles; }
    std::vector<Particle>& getParticles() { return particles; } // overload mutable para modificación directa
};