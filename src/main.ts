import { Command } from '@tauri-apps/plugin-shell';
import { open } from '@tauri-apps/plugin-dialog';
import { ChartEngine } from './chart/ChartEngine';

// Store the chart instance globally so we can destroy/update it 
// when a new file is loaded, preventing memory leaks.
let chart: ChartEngine | null = null;
let allColumns: number[][] = [];
let allHeaders: string[] = [];
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

    // Store all data globally
    allColumns = result.columns;
    allHeaders = result.headers;

    // Update the small status labels in the UI card
    if (statusEl) statusEl.innerText = "Success";
    if (valueEl) valueEl.innerText = `${allHeaders.length} Columns found`;

    // --- 4. PREPARE DATA FOR CHART ---
    if (chartArea) {
      // Destroy existing chart and clear area if a new file is loaded
      if (chart) { chart.destroy(); chart = null; }
      chartArea.innerHTML = "";

      // Create and append canvas for the chart
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "400px"; // Fixed height for consistency
      chartArea.appendChild(canvas);

      // Initialize ChartEngine
      chart = new ChartEngine(canvas);

      // Render signal selection UI and update chart with initial selection
      renderSignalSelectionUI(allHeaders);
      updateChart();
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
    } else {
      // Handle cases where C++ sidecar runs but returns non-zero code
      if (statusEl) statusEl.innerText = "Engine Error";
      console.error("Sidecar error output:", output.stderr);
    }
  } catch (err) {
    console.error("Analysis failed:", err);
    if (statusEl) statusEl.innerText = "Error!";
  } finally {
    btn.disabled = false;
  }
}

/**
 * Renders checkboxes for signal selection based on available headers.
 * The first header is assumed to be the X-axis and is not selectable as a Y-signal.
 * @param headers An array of signal headers.
 */
function renderSignalSelectionUI(headers: string[]) {
  const selectionArea = document.getElementById('signal-selection-area');
  if (!selectionArea) return;

  selectionArea.innerHTML = '<p style="font-weight: bold; margin-bottom: 10px;">Select Y-Axis Signals:</p>';

  // Create checkboxes for each signal (skip the first one, assumed to be X-axis)
  headers.slice(1).forEach((header, index) => {
    const div = document.createElement('div');
    div.className = 'signal-checkbox-item'; // Optional: for styling

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `signal-select-${index + 1}`; // +1 to match original index
    checkbox.value = String(index + 1);
    // Check the first Y-signal by default
    if (index === 0) {
        checkbox.checked = true;
    }
    checkbox.onchange = updateChart; // Re-render chart on selection change

    const label = document.createElement('label');
    label.htmlFor = `signal-select-${index + 1}`;
    label.textContent = header;

    div.appendChild(checkbox);
    div.appendChild(label);
    selectionArea.appendChild(div);
  });
}

/**
 * Updates the chart based on the currently selected signals.
 */
function updateChart() {
  if (!chart || allColumns.length === 0 || allHeaders.length === 0) {
    return; // No chart or data to render
  }

  const selectedYSignals: number[][] = [];
  const selectedSignalNames: string[] = [];

  const selectionArea = document.getElementById('signal-selection-area');
  if (selectionArea) {
    // Get all checkboxes in the selection area
    const checkboxes = selectionArea.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const colIndex = parseInt(checkbox.value, 10); // Get original column index
        if (colIndex < allColumns.length) {
          selectedYSignals.push(allColumns[colIndex]);
          selectedSignalNames.push(allHeaders[colIndex]);
        }
      }
    });
  }

  // If no signals are selected, clear the chart or show a message
  if (selectedYSignals.length === 0) {
    if (chart) {
      chart.setSignal([], [], []); // Clear chart
    }
    return;
  }

  // Update the chart with the selected signals
  chart.setSignal(allColumns[0], selectedYSignals, selectedSignalNames);
}

btn.addEventListener('click', runAnalysis);