export class ChartEngine {
    // ctx = drawing tool of canvas
    private ctx: CanvasRenderingContext2D;

    private xData: number[] = [];
    private yData: number[] = [];

    private resizeHandler: () => void;

    // constructor runs when chart is created
    constructor(private canvas: HTMLCanvasElement) {
        // get 2D drawing context from canvas 
        this.ctx = canvas.getContext("2d")!;

        this.resizeHandler = () => this.resize();
        // get canvas size correctly
        this.resize();

        // When user resizes window -> resize chart too
        window.addEventListener("resize",()=>this.resize());
    }

    setSignal(x:number[], y:number[], name:string) {
        this.xData = x;
        this.yData = y;
        
        this.render();
    }

    // Adjust internal pixel size to visible size
    private resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (this.xData.length > 0) {
            this.render();
        }
    }

    // Main draw function
    public render() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = "#0f172a";
        this.ctx.fillRect(0, 0, w, h);

        // draw helper grid
        this.drawGrid();

        this.drawDemoSignal();
    }

    private drawGrid() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = "rgba(255,255,255,0.06)";
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < w; x += 80) {
            this.ctx.beginPath();
            this.ctx.moveTo(x,0);
            this.ctx.lineTo(x,h);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < h; y += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(0,y);
            this.ctx.lineTo(w,y);
            this.ctx.stroke();
        }
    }

    private drawDemoSignal() {

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = "#38bdf8"
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();

        // Go pixel by pixel through screen width 
        for (let x = 0; x < w; x++) {
            // Generate sine curve
            const y = h/2 + Math.sin(x*0.02) * 100;

            // First point starts line
            if (x === 0) {
                this.ctx.moveTo(x,y);
            }
            else {
                this.ctx.lineTo(x,y);
            }
        }
        this.ctx.stroke();
    }

    public destroy(): void {
        window.removeEventListener("resize", this.resizeHandler);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.xData = [];
        this.yData = [];
    }
}
