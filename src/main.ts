import { Command } from '@tauri-apps/plugin-shell';
import { open } from '@tauri-apps/plugin-dialog';
import { ChartEngine } from './chart/ChartEngine';

// Store the chart instance globally so we can destroy/update it 
// when a new file is loaded, preventing memory leaks.
let chart: ChartEngine | null = null;
let allColumns: number[][] = [];
let allHeaders: string[] = [];

const btn = document.querySelector('#run-engine-btn') as HTMLButtonElement;
const statusEl = document.getElementById('engine-status');
const valueEl = document.getElementById('engine-value');
const chartArea = document.querySelector('#chart-area') as HTMLElement | null;

async function runAnalysis() {
  btn.disabled = true;
  if (statusEl) statusEl.innerText = "Processing...";

  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'CSV Data', extensions: ['csv'] }]
    });

    if (!selected) {
      if (statusEl) statusEl.innerText = "Cancelled";
      return;
    }

    const command = Command.sidecar('binaries/famos_engine', [selected]);
    const output = await command.execute();

    if (output.code === 0) {
      try {
        const result = JSON.parse(output.stdout);
        allColumns = result.columns;
        allHeaders = result.headers;

        if (statusEl) statusEl.innerText = "Success";
        if (valueEl) valueEl.innerText = `${allHeaders.length} Columns found`;

        renderChartArea();
        renderDataTable(result);
      } catch (jsonErr) {
        console.error("JSON parsing error:", jsonErr);
        if (statusEl) statusEl.innerText = "Engine Error";
      }
    } else {
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

function renderChartArea() {
  if (!chartArea) return;

  if (chart) { chart.destroy(); chart = null; }
  chartArea.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "400px";
  chartArea.appendChild(canvas);

  chart = new ChartEngine(canvas);
  renderSignalSelectionUI(allHeaders);
}

function renderDataTable(result: { columns: number[][], headers: string[] }) {
  const rowCount = result.columns[0].length;
  const headerHtml = result.headers.map((h: string) => `<th>${h}</th>`).join('');
  const rowsHtml = [];

  for (let i = 0; i < rowCount; i++) {
    const cells = result.columns.map((col: any) => `<td>${col[i]}</td>`).join('');
    rowsHtml.push(`<tr>${cells}</tr>`);
  }

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

function renderSignalSelectionUI(headers: string[]) {
  const selectionArea = document.getElementById('signal-selection-area');
  if (!selectionArea) return;

  selectionArea.innerHTML = '<p style="font-weight: bold; margin-bottom: 10px;">Select Y-Axis Signals:</p>';

  headers.slice(1).forEach((header, index) => {
    const div = document.createElement('div');
    div.className = 'signal-checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `signal-select-${index + 1}`;
    checkbox.value = String(index + 1);
    if (index === 0) {
      checkbox.checked = true;
    }
    checkbox.onchange = updateChart;

    const label = document.createElement('label');
    label.htmlFor = `signal-select-${index + 1}`;
    label.textContent = header;

    div.appendChild(checkbox);
    div.appendChild(label);
    selectionArea.appendChild(div);
  });
}

function renderSignalNamesHeader(selectedSignalNames: string[]) {
  const signalNamesContainer = document.getElementById('signal-names-container');
  if (!signalNamesContainer) return;

  signalNamesContainer.innerHTML = '';

  selectedSignalNames.forEach((name, index) => {
    const span = document.createElement('span');
    span.className = 'signal-name';
    span.textContent = name;
    span.style.marginRight = '10px';

    signalNamesContainer.appendChild(span);
  });
}

function updateChart() {
  if (!chart || allColumns.length === 0 || allHeaders.length === 0) return;

  const selectedYSignals: number[][] = [];
  const selectedSignalNames: string[] = [];

  const selectionArea = document.getElementById('signal-selection-area');
  if (selectionArea) {
    const checkboxes = selectionArea.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const colIndex = parseInt(checkbox.value, 10);
        if (colIndex < allColumns.length) {
          selectedYSignals.push(allColumns[colIndex]);
          selectedSignalNames.push(allHeaders[colIndex]);
        }
      }
    });
  }

  if (selectedYSignals.length === 0) {
    if (chart) chart.setSignal([], [], []);
    return;
  }

  renderSignalNamesHeader(selectedSignalNames);
  chart.setSignal(allColumns[0], selectedYSignals, selectedSignalNames);
}

btn.addEventListener('click', runAnalysis);
