// import ChartEngine
import { ChartEngine } from "../chart/ChartEngine";

// This class controls the startup of the whole application
export class WindowManager {

    initilize() {
        // Find canvas element in HTML 
        const canvas = document.getElementById("chartCanvas") as HTMLCanvasElement;

        // create our custom chart engine
        const chart = new ChartEngine(canvas);

        chart.render();
    }
}