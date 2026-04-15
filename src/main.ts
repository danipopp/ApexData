import { Command } from '@tauri-apps/plugin-shell';
import { open } from '@tauri-apps/plugin-dialog';

async function runAnalysis() {

  console.log("Starte Analyse...");
  
  // DEBUG: Schauen, was Tauri geladen hat
  console.log("Verfügbare Internals:", (window as any).__TAURI_INTERNALS__);
  
  try {
    // 1. Datei auswählen
    const selected = await open({
      multiple: false,
      filters: [{ name: 'CSV Daten', extensions: ['csv'] }]
    });

    if (!selected) return;

    // 2. C++ Sidecar starten
    const command = Command.sidecar('binaries/famos_engine', [selected]);
    const output = await command.execute();

    if (output.code === 0) {
      // JSON parsen
      const result = JSON.parse(output.stdout);
      console.log("Struktur erkannt:", result.headers);
      console.log("Daten erhalten:", result.columns);

      // Ein bisschen Feedback auf die Seite schreiben
      const appEl = document.querySelector('#app');
      if (appEl) {
        appEl.innerHTML = `
          <h1>FAMOS Analyse</h1>
          <div class="card">
            <p>Datei geladen: <b>${result.headers.length} Spalten gefunden</b></p>
            <ul id="column-list">
              ${result.headers.map((h: string, i: number) => 
                `<li>Spalte ${i}: <b>${h}</b> (${result.columns[i].length} Datenpunkte)</li>`
              ).join('')}
            </ul>
          </div>
          <button id="re-run">Neue Datei laden</button>
        `;
        // Event-Listener für den neuen Button wieder hinzufügen
        document.querySelector('#re-run')?.addEventListener('click', runAnalysis);
      }
    }
  } catch (err) {
    console.error("Test fehlgeschlagen:", err);
  }
}

// Erster Start
document.querySelector('#run-engine-btn')?.addEventListener('click', runAnalysis);