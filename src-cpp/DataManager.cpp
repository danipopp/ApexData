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

/**
 * Reduces the number of data points while preserving visual extremes (min/max).
 * This is crucial for engineering data to ensure spikes aren't lost.
 * @param targetPoints The approximate number of points desired for the UI.
 */
void DataManager::downsample(int targetPoints)
{
    // Assuming Column 0 is X (Time) and Column 1 is Y (Values)
    if (tableData.size() < 2) return;

    std::vector<double>& rawX = tableData[0];
    std::vector<double>& rawY = tableData[1];
    size_t totalPoints = rawY.size();

    if (totalPoints <= (size_t)targetPoints) return;

    std::vector<double> sampledX;
    std::vector<double> sampledY;

    // We pick 2 points (Min and Max) per bucket, 
    // so we divide the target count by 2 to get the number of buckets.
    int numBuckets = targetPoints / 2;
    double bucketSize = static_cast<double>(totalPoints) / numBuckets;

    // Reserve memory upfront to avoid multiple reallocations
    sampledX.reserve(targetPoints);
    sampledY.reserve(targetPoints);

    for (int i = 0; i < numBuckets; ++i) {
        // Calculate the range of the current bucket
        size_t start = static_cast<size_t>(i * bucketSize);
        size_t end = static_cast<size_t>((i + 1) * bucketSize);

        // Safety check for the last bucket
        if (end > totalPoints) end = totalPoints;
        if (start >= end) continue;

        size_t minIdx = start;
        size_t maxIdx = start;

        // Iterate through the bucket to find the minimum and maximum values
        for (size_t j = start; j < end; ++j) {
            if (rawY[j] < rawY[minIdx]) minIdx = j;
            if (rawY[j] > rawY[maxIdx]) maxIdx = j;
        }

        // To keep the X-axis (Time) consistent, we must add the 
        // min and max points in the order they originally appeared.
        if (minIdx < maxIdx) {
            sampledX.push_back(rawX[minIdx]);
            sampledY.push_back(rawY[minIdx]);
            sampledX.push_back(rawX[maxIdx]);
            sampledY.push_back(rawY[maxIdx]);
        } else if (minIdx > maxIdx) {
            sampledX.push_back(rawX[maxIdx]);
            sampledY.push_back(rawY[maxIdx]);
            sampledX.push_back(rawX[minIdx]);
            sampledY.push_back(rawY[minIdx]);
        } else {
            sampledX.push_back(rawX[minIdx]);
            sampledY.push_back(rawY[minIdx]);
        }
    }

    // Put the downsampled columns back into the main table
    tableData[0] = std::move(sampledX);
    tableData[1] = std::move(sampledY);
}