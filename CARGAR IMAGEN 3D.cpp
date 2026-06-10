#include <cstdint>
#include <string>

#if __has_include("Engine.h")
#include "Engine.h"
#elif __has_include("../Engine.h")
#include "../Engine.h"
#else
#error Engine.h or ParticleSystem.h not found
#endif

#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>

void loadImageAsParticles(ParticleSystem& system, const std::string& imagePath) {
    cv::Mat img = cv::imread(imagePath, cv::IMREAD_GRAYSCALE);
    if (img.empty()) return;

    // Redimensionamos la imagen
    cv::resize(img, img, cv::Size(100, 80));
    
    auto& particles = system.getParticles();
    size_t maxParticles = particles.size();
    size_t idx = 0;

    float widthF = static_cast<float>(img.cols);
    float heightF = static_cast<float>(img.rows);

    for (int y = 0; y < img.rows; ++y) {
        for (int x = 0; x < img.cols; ++x) {
            if (idx >= maxParticles) break; // Evitamos desbordar el pool fijo

            uint8_t brightness = img.at<uint8_t>(y, x);

            // Solo mapear si el píxel supera el umbral de ruido negro
            if (brightness > 20) {
                particles[idx].tx = (static_cast<float>(x) / widthF - 0.5f) * 2.0f; 
                particles[idx].ty = -(static_cast<float>(y) / heightF - 0.5f) * 2.0f; 
                particles[idx].tz = (static_cast<float>(brightness) / 255.0f) * 1.5f; 
                
                // Color holográfico Cyan basado en brillo
                particles[idx].r = 0;
                particles[idx].g = brightness;
                particles[idx].b = brightness;
                particles[idx].a = 255; // Partícula activa
                
                idx++;
            }
        }
    }

    // CRUCIAL: Apagar/Ocultar el resto de partículas del pool que no se usaron en esta imagen
    for (size_t i = idx; i < maxParticles; ++i) {
        particles[i].a = 0;       // Opacidad cero (invisible/inactiva)
        particles[i].tx = 0.0f;   // Resetear objetivos para evitar tirones bruscos
        particles[i].ty = 0.0f;
        particles[i].tz = 0.0f;
    }
}