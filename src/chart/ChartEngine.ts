/**
 * ChartEngine is a high-performance canvas-based rendering system for 2D signals.
 * It handles automatic resizing, grid drawing, and data scaling.
 */
export class ChartEngine {
    /** 2D drawing context from the canvas element */
    private ctx: CanvasRenderingContext2D;

    /** X-axis data points (e.g., time) */
    private xData: number[] = [];
    /** Y-axis data points (e.g., amplitude) */
    private yData: number[] = [];
    /** Name of the signal for labeling purposes */
    private signalName: string = "";

    /** Stored reference to the resize handler for proper event listener cleanup */
    private resizeHandler: () => void;

    /**
     * Creates an instance of the ChartEngine.
     * @param canvas The HTML canvas element to render into.
     * @throws Error if the 2D context cannot be acquired.
     */
    constructor(private canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not acquire 2D rendering context");
        }
        this.ctx = context;

        // Initialize the resize handler and bind 'this' correctly
        this.resizeHandler = () => this.resize();
        
        // Initial size sync
        this.resize();

        // Attach global resize listener
        window.addEventListener("resize", this.resizeHandler);
    }

    /**
     * Updates the engine with new signal data and triggers a re-render.
     * @param x Array of X-axis values.
     * @param y Array of Y-axis values.
     * @param name Descriptive name of the signal.
     */
    public setSignal(x: number[], y: number[], name: string): void {
        this.xData = x;
        this.yData = y;
        this.signalName = name;
        
        this.render();
    }

    /**
     * Syncs the canvas internal pixel dimensions with its CSS display size.
     * Triggered on window resize.
     */
    private resize(): void {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // Always re-render on resize to keep visuals crisp
        this.render();
    }

    /**
     * Main rendering loop. Clears the canvas and draws all components.
     */
    public render(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Clear background
        this.ctx.fillStyle = "#0f172a";
        this.ctx.fillRect(0, 0, w, h);

        // 2. Draw background helper grid
        this.drawGrid();

        // 3. Draw the actual signal data if available
        if (this.xData.length > 0 && this.yData.length > 0) {
            this.drawSignal();
            this.drawLabel();
        }
    }

    /**
     * Draws a subtle background grid for better orientation.
     */
    private drawGrid(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        this.ctx.lineWidth = 1;

        // Draw vertical grid lines
        for (let x = 0; x < w; x += 80) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let y = 0; y < h; y += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
    }

    /**
     * Maps the signal data points to canvas pixels using linear scaling.
     */
    private drawSignal(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 40; // Pixel padding from canvas edges

        // Determine data bounds for scaling
        const xMin = Math.min(...this.xData);
        const xMax = Math.max(...this.xData);
        const yMin = Math.min(...this.yData);
        const yMax = Math.max(...this.yData);

        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;

        // Visualization styling
        this.ctx.strokeStyle = "#38bdf8";
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = "round";

        this.ctx.beginPath();

        for (let i = 0; i < this.xData.length; i++) {
            // Normalize data point to [0, 1] range and scale to canvas dimensions
            const xNorm = (this.xData[i] - xMin) / xRange;
            const yNorm = (this.yData[i] - yMin) / yRange;

            // Invert Y axis as canvas (0,0) is top-left
            const px = padding + xNorm * (w - 2 * padding);
            const py = h - (padding + yNorm * (h - 2 * padding));

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.stroke();
    }

    /**
     * Renders the signal name as a label on the canvas.
     */
    private drawLabel(): void {
        this.ctx.fillStyle = "#38bdf8";
        this.ctx.font = "bold 14px Inter, system-ui, sans-serif";
        this.ctx.textAlign = "left";
        this.ctx.fillText(this.signalName, 20, 30);
    }

    /**
     * Cleans up resources, removes event listeners, and clears data.
     * Call this when the chart is no longer needed to prevent memory leaks.
     */
    public destroy(): void {
        window.removeEventListener("resize", this.resizeHandler);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.xData = [];
        this.yData = [];
        this.signalName = "";
    }
}
