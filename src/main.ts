import { Command } from '@tauri-apps/plugin-shell';
import { open } from '@tauri-apps/plugin-dialog';
import ApexCharts, { ApexOptions } from 'apexcharts';

// Store the chart instance globally so we can destroy/update it 
// when a new file is loaded, preventing memory leaks.
let chart: ApexCharts | null = null;

async function runAnalysis() {
  // 1. SELECT UI ELEMENTS
  // We grab the elements defined in your HTML to provide visual feedback.
  const statusEl = document.getElementById('engine-status');
  const valueEl = document.getElementById('engine-value');
  const chartArea = document.querySelector('#chart-area') as HTMLElement | null;
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
      // ApexCharts line charts expect data in the format: [ [x1, y1], [x2, y2] ... ]
      // We assume Column 0 is Time (X) and Column 1 is Value (Y).
      const seriesData = result.columns[0].map((xValue: number, index: number) => {
        return [xValue, result.columns[1][index]];
      });

      const chartOptions : ApexOptions = {
        series: [{ 
          name: result.headers[1], // Legend takes the name from C++ Header
          data: seriesData 
        }],
        chart: {
          type: 'line',
          height: 350,
          background: 'transparent', // Let CSS handle the background
          foreColor: '#e2e8f0',      // Light text for dark mode
          animations: { enabled: false }, // Disabled for performance with downsampled data
          zoom: { enabled: true }
        },
        colors: ['#38bdf8'], // The technical blue from your CSS
        stroke: { width: 2, curve: 'straight' },
        grid: { borderColor: '#334155' }, // Subtle grid lines
        xaxis: { 
          type: 'numeric', 
          title: { text: result.headers[0] } // X-Label from C++
        },
        yaxis: {
            title: { text: result.headers[1] } // Y-Label from C++
        },
        theme: { mode: 'dark' }
      };

      // --- 5. RENDER THE CHART ---
      if (chartArea) {
        chartArea.innerHTML = ""; // Remove the "No data" placeholder text
        if (chart) chart.destroy(); // Clean up old chart if it exists
        chart = new ApexCharts(chartArea, chartOptions);
        chart.render();
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
  }
}

// Initial event listener for the start button
document.querySelector('#run-engine-btn')?.addEventListener('click', runAnalysis);