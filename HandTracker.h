#pragma once
#include <opencv2/opencv.hpp>
#include <stdexcept>
// #include <onnxruntime_cxx_api.h> // Descomentar al integrar ONNX

class HandTracker {
private:
    cv::VideoCapture cap;
    // En un entorno real, aquí iría el Session de ONNX Runtime cargado con un modelo .onnx INT8
    
public:
    HandTracker() {
        cap.open(0); // Cámara por defecto
        if (!cap.isOpened()) {
            throw std::runtime_error("HandTracker: no se pudo abrir la cámara (índice 0). Verificá que esté conectada y no esté en uso.");
        }
        // Optimización: Reducir resolución de entrada para ahorrar CPU/RAM
        cap.set(cv::CAP_PROP_FRAME_WIDTH, 320);
        cap.set(cv::CAP_PROP_FRAME_HEIGHT, 240);
        cap.set(cv::CAP_PROP_FPS, 15);
    }

    // Devuelve coordenadas normalizadas (0.0 a 1.0) de la palma de la mano
    bool getHandPosition(float& outX, float& outY, float& outZ) {
        cv::Mat frame;
        cap >> frame;
        if (frame.empty()) return false;

        // AQUÍ: Inferencia del modelo ONNX cuantizado (ej. MediaPipe Hands INT8)
        // Por simplicidad en este esqueleto, simulamos una detección básica por color o mock
        // En producción: session.Run(...) con el frame convertido a tensor.
        
        outX = 0.5f; // Simulación: centro de la pantalla
        outY = 0.5f;
        outZ = 0.5f;
        return true; 
    }
};