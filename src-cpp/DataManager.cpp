#include "DataManager.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>

DataManager::DataManager(std::string path) : filePath(path) {}

bool DataManager::loadDynamicCSV() {
    std::ifstream file(filePath);
    if (!file.is_open()) return false;

    std::string line;
    
    // 1. SCHRITT: Header lesen (Erste Zeile)
    if (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string colName;
        while (std::getline(ss, colName, ',')) {
            // Eventuelle Leerzeichen am Anfang/Ende entfernen
            colName.erase(0, colName.find_first_not_of(" \t\r\n"));
            colName.erase(colName.find_last_not_of(" \t\r\n") + 1);
            headers.push_back(colName);
        }
    }

    // Für jede gefundene Spalte bereiten wir einen leeren Vektor vor
    tableData.resize(headers.size());

    // 2. SCHRITT: Daten lesen (Alle weiteren Zeilen)
    while (std::getline(file, line)) {
        if (line.empty()) continue;

        std::stringstream ss(line);
        std::string cell;
        int colIndex = 0;

        while (std::getline(ss, cell, ',')) {
            // Nur verarbeiten, wenn wir innerhalb der Spaltenanzahl sind
            if (colIndex < headers.size()) {
                try {
                    // Versuche den Text in eine Zahl (double) umzuwandeln
                    // Falls es ein Zeitstempel oder Text ist, wird das fehlschlagen
                    double val = std::stod(cell);
                    tableData[colIndex].push_back(val);
                } catch (...) {
                    // Wenn keine Zahl (z.B. Datum "2000-01-01"): 
                    // Speichern wir 0.0 oder ignorieren es für die Berechnung
                    tableData[colIndex].push_back(0.0);
                }
            }
            colIndex++;
        }
    }

    file.close();
    return true;
}

void DataManager::printAsJson() const {
    // Wir bauen ein JSON-Objekt, das dem Frontend sagt, was vorhanden ist
    std::cout << "{" << "\"status\":\"success\",";
    
    // Spaltennamen senden
    std::cout << "\"headers\": [";
    for (size_t i = 0; i < headers.size(); ++i) {
        std::cout << "\"" << headers[i] << "\"" << (i < headers.size() - 1 ? "," : "");
    }
    std::cout << "],";

    // Die eigentlichen Messdaten senden
    std::cout << "\"columns\": [";
    for (size_t i = 0; i < tableData.size(); ++i) {
        std::cout << "[";
        for (size_t j = 0; j < tableData[i].size(); ++j) {
            std::cout << tableData[i][j] << (j < tableData[i].size() - 1 ? "," : "");
        }
        std::cout << "]" << (i < tableData.size() - 1 ? "," : "");
    }
    std::cout << "]} " << std::endl;
}

void DataManager::downsample(int targetPoints)
{
    size_t totalPoints = rawDataY.size();

    
}