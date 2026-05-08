import { Command } from '@tauri-apps/plugin-shell';
import { open } from '@tauri-apps/plugin-dialog';
import { ChartEngine } from './chart/ChartEngine';

// Store the chart instance globally so we can destroy/update it 
// when a new file is loaded, preventing memory leaks.
let chart: ChartEngine | null = null;
const btn = document.querySelector('#run-engine-btn') as HTMLButtonElement;

async function runAnalysis() {
  // 1. SELECT UI ELEMENTS
  // We grab the elements defined in your HTML to provide visual feedback.
  const statusEl = document.getElementById('engine-status');
  const valueEl = document.getElementById('engine-value');
  const chartArea = document.querySelector('#chart-area') as HTMLElement | null;

  btn.disabled = true;
  if (statusEl) statusEl.innerText = "Processing...";

  try {
    // 2. FILE SELECTION
    // Opens the native OS file picker. Only allows .csv files.
    const selected = await open({
      multiple: false,
      filters: [{ name: 'CSV Data', extensions: ['csv'] }]
    });

    // If user closes the dialog without selecting a file, we stop here.
    if (!selected) {
      if (statusEl) statusEl.innerText = "Cancelled";
      return;
    }

    // 3. EXECUTE C++ SIDECAR
    // 'binaries/famos_engine' matches the name in your tauri.conf.json.
    // [selected] passes the file path as the first argument to C++ main().
    const command = Command.sidecar('binaries/famos_engine', [selected]);
    const output = await command.execute();

    // Check if the C++ process finished successfully (return code 0).
    if (output.code === 0) {
      // Parse the JSON string sent via std::cout from C++
      const result = JSON.parse(output.stdout);
      
      // Update the small status labels in the UI card
      if (statusEl) statusEl.innerText = "Success";
      if (valueEl) valueEl.innerText = `${result.headers.length} Columns found`;

      // --- 4. PREPARE DATA FOR APEXCHARTS ---
      if (chartArea) {
        if (chart) {chart.destroy(); chart = null};
        chartArea.innerHTML = "";

        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "400px";

        chartArea.appendChild(canvas);
        chart = new ChartEngine(canvas);

        chart.setSignal(
          result.columns[0],   // time axis
          result.columns[1],   // signal values
          result.headers[1]
        );
      }

      // --- 6. RENDER THE DATA TABLE ---
      // Since C++ sends data in columns, we "pivot" it to rows for HTML <table>
      const rowCount = result.columns[0].length;
      
      // Generate the <th> tags for the header
      const headerHtml = result.headers
        .map((h: string) => `<th>${h}</th>`)
        .join('');
      
      // Generate <tr> tags for every row.
      // We iterate through the row index (i) and then look into every column.
      const rowsHtml = [];
      for (let i = 0; i < rowCount; i++) {
        const cells = result.columns
          .map((col: any) => `<td>${col[i]}</td>`)
          .join('');
        rowsHtml.push(`<tr>${cells}</tr>`);
      }

      // Create a container for the table and append it below the chart
      // We reuse your '.card' class for consistent styling
      let tableContainer = document.getElementById('dynamic-table-container');
      if (!tableContainer) {
        tableContainer = document.createElement('div');
        tableContainer.id = 'dynamic-table-container';
        tableContainer.className = 'card';
        tableContainer.style.marginTop = '20px';
        chartArea?.after(tableContainer);
      }

      tableContainer.innerHTML = `
        <div style="max-height: 300px; overflow-y: auto;">
          <table class="data-table">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowsHtml.join('')}</tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    console.error("Analysis failed:", err);
    if (statusEl) statusEl.innerText = "Error!";
  } finally {
    // Button am Ende wieder freigeben
    btn.disabled = false;
  }
}

btn.addEventListener('click', runAnalysis);