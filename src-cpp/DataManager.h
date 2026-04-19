#ifndef DATAMANAGER_H
#define DATAMANAGER_H

#include <vector>
#include <string>

class DataManager {
private:
    std::string filePath;
    // Liste der Spaltennamen (aus der ersten Zeile der CSV)
    std::vector<std::string> headers;
    // Die eigentlichen Daten: Ein Vektor, der pro Spalte einen Vektor von Zahlen enthält
    // Tabelle[Spalte][Zeile]
    std::vector<std::vector<double>> tableData;

    std::vector<double> rawDataX; // Usually the Time axis
    std::vector<double> rawDataY; // Usually the Measurement values

public:
    // Konstruktor nimmt nur den Pfad entgegen
    DataManager(std::string path);

    // Hauptfunktion zum Laden
    bool loadDynamicCSV();

    // Funktion, die die Daten als JSON an das Frontend schickt
    void printAsJson() const;

    void downsample(int targetPoints);
};

#endif