#include "Engine.h"
#include "HandTracker.h"
#include "httplib.h"
#include <iostream>
#include <memory>
#include <thread>
#include <mutex>
#include <atomic>
#include <string>

// Enumeración idéntica a la de FIGURAS BASE para poder mapear el JSON
enum class BaseShape { SPHERE, CUBE, HELIX, SPIRAL };

// Declaración forward de la función de formas (asumiendo que vinculas FIGURAS BASE.cpp)
template<typename ParticleSystemType>
void generateShape(ParticleSystemType& system, BaseShape shape, float radius = 1.0f);

struct Config {
    float force  = 2.0f;
    int   action = 0; // 0:Armar/Ninguno, 1:Atraer, 2:Repeler, 3:Giro, 4:Moldear
    std::string shapeStr = "NONE";
};

Config g_config;
std::mutex g_mutex;
std::atomic<bool> g_running(true);

Config parseConfig(const std::string& body) {
    Config c;
    
    // Parsear force
    auto fpos = body.find("\"force\"");
    if (fpos != std::string::npos) {
        auto colon = body.find(':', fpos);
        if (colon != std::string::npos) {
            try {
                c.force = std::stof(body.substr(colon + 1, 10));
            } catch (...) {
                c.force = 2.0f;
            }
        }
    }
    
    // Parsear action
    if (body.find("\"ATRAER\"")  != std::string::npos) c.action = 1;
    else if (body.find("\"REPELER\"") != std::string::npos) c.action = 2;
    else if (body.find("\"GIRO\"")    != std::string::npos) c.action = 3;
    else if (body.find("\"MOLDEAR\"") != std::string::npos) c.action = 4;
    else if (body.find("\"ARMAR\"")   != std::string::npos) c.action = 0;

    // Parsear shape
    if (body.find("\"SPHERE\"") != std::string::npos) c.shapeStr = "SPHERE";
    else if (body.find("\"CUBE\"") != std::string::npos) c.shapeStr = "CUBE";
    else if (body.find("\"HELIX\"") != std::string::npos) c.shapeStr = "HELIX";
    else if (body.find("\"SPIRAL\"") != std::string::npos) c.shapeStr = "SPIRAL";

    return c;
}

int main() {
    std::cout << "=== CELI ENGINE — Optimizado para 4GB RAM ===\n";

    ParticleSystem particleSystem(15000);

    std::unique_ptr<HandTracker> handTracker;
    try {
        handTracker = std::make_unique<HandTracker>();
        std::cout << "[OK] Cámara inicializada.\n";
    } catch (const std::runtime_error& e) {
        std::cerr << "[WARN] " << e.what() << " — continuando sin hand tracking.\n";
    }

    httplib::Server svr;

    svr.Post("/command", [&](const httplib::Request& req, httplib::Response& res) {
        Config newCfg = parseConfig(req.body);
        { 
            std::lock_guard<std::mutex> lock(g_mutex); 
            g_config = newCfg; 
        }
        res.set_header("Access-Control-Allow-Origin", "*"); 
        res.set_content("{\"ok\":true}", "application/json");
    });

    svr.Options("/command", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.set_content("", "text/plain");
    });

    std::thread serverThread([&]() {
        std::cout << "[OK] Servidor HTTP escuchando en http://localhost:8080\n";
        svr.listen("0.0.0.0", 8080);
    });
    serverThread.detach();

    std::cout << "[OK] Bucle de física iniciado. Ctrl+C para salir.\n";

    std::string lastShape = "NONE";

    while (g_running) {
        Config currentCfg;
        { 
            std::lock_guard<std::mutex> lock(g_mutex); 
            currentCfg = g_config; 
        }

        // Si cambió la forma geométrica pedida desde la interfaz Web, actualizar los targets (tx, ty, tz)
        if (currentCfg.shapeStr != lastShape && currentCfg.shapeStr != "NONE") {
            lastShape = currentCfg.shapeStr;
            std::cout << "[INFO] Cambiando forma base a: " << lastShape << "\n";
            
            if (lastShape == "SPHERE") generateShape(particleSystem, BaseShape::SPHERE);
            else if (lastShape == "CUBE") generateShape(particleSystem, BaseShape::CUBE);
            else if (lastShape == "HELIX") generateShape(particleSystem, BaseShape::HELIX);
            else if (lastShape == "SPIRAL") generateShape(particleSystem, BaseShape::SPIRAL);
        }

        // Hand tracking físico
        if (handTracker) {
            float hx, hy, hz;
            if (handTracker->getHandPosition(hx, hy, hz)) {
                particleSystem.applyForce(hx, hy, hz, currentCfg.force, currentCfg.action);
            }
        } else {
            // Si no hay cámara, aplicamos fuerzas de retorno al molde de igual forma
            particleSystem.applyForce(0.5f, 0.5f, 0.5f, currentCfg.force, currentCfg.action);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(16)); // ~60 FPS
    }

    svr.stop();
    return 0;
}