#include "DataManager.h"
#include <iostream>

int main(int argc, char* argv[]) {
    // Überprüfen, ob Tauri einen Pfad mitgegeben hat
    if (argc < 2) {
        std::cout << "{\"status\":\"error\", \"msg\":\"Kein Pfad\"}" << std::endl;
        return 1;
    }

    // Instanz unserer Klasse erstellen (OOP)
    DataManager myManager(argv[1]);

    // Daten laden und bei Erfolg als JSON ausgeben
    if (myManager.loadDynamicCSV()) {
        // Reduce data so ApexCharts stays smooth
        myManager.downsample(2000);

        myManager.printAsJson();
    } else {
        std::cout << "{\"status\":\"error\", \"msg\":\"Datei-Zugriff verweigert\"}" << std::endl;
    }

    return 0;
}