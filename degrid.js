const degridParams = {
    deleteThreshold: 0.4,
    cleanThreshold: 0.1,
    defaultMargin: 1
}

let xGridLines;
let yGridLines;

class GridLine {

    constructor(lower, upper, dir, margin = -1) {
        this.lower = lower;
        this.upper = upper;
        if (dir != "x" && dir != "y")
            alert("Invalid grid line direction, assuming y.");
        this.dir = dir;
        this._margin = margin; // DO NOT CHANGE THIS DIRECTLY. Always use "margin".
        this.erase();
    }

    get margin() { return (this._margin == -1) ? degridParams.defaultMargin : this._margin; }
    set margin(margin) {
        this.restore();
        this._margin = margin;
        this.erase();
    }

    get llower() { return this.lower - this.margin; }
    get uupper() { return this.upper + this.margin; }

    erase() {
        let span = this.uupper - this.llower + 1; // +1 to be inclusive
        if (this.dir == 'x')
            contexts[CANVAS.DEGRIDDED].clearRect(this.llower, 0, span, h);
        else
            contexts[CANVAS.DEGRIDDED].clearRect(0, this.llower, w, span);
    }

    restore() {
        let span = this.uupper - this.llower + 1; // +1 to be inclusive
        if (this.dir == 'x')
            contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], this.llower, 0, span, h, this.llower, 0, span, h);
        else
            contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], 0, this.llower, w, span, 0, this.llower, w, span);
    }

    get center() {
        let integral = 0;
        let area = 0;
        const array = (this.dir == "x") ? freqs.xData : freqs.yData;
        for (let i = this.lower; i <= this.upper; i++) {
            integral += i * array[i];
            area += array[i];
        }
        return Math.round(integral / area);
    }
    
}

function recomputeDegrid() {

    progress = SECTION.DEGRID;

    // Set up for grid removal
    contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], 0, 0);
    let deleting = false;
    let lower = 0; let upper = 0; // lower and upper bound the deleted zone.
    l = 0; r = 0; t = 0; b = 0;
    xGridLines = [];
    yGridLines = [];

    // Delete horizontal grid lines
    for (let x = 0; x < freqs.xData.length; x++) {
        if (!deleting && freqs.xData[x] > degridParams.deleteThreshold * freqs.xMax) { // found new deletion zone
            deleting = true; lower = x;
            // Backtrack to find start of deletion zone
            while (lower > 2 && freqs.xData[lower - 1] - freqs.xData[lower - 2] > degridParams.cleanThreshold * freqs.xMax)
                lower--;
        } else if (deleting && freqs.xData[x] <= degridParams.deleteThreshold * freqs.xMax) { // close deletion zone
            deleting = false; upper = x - 1;
            // Forwardtrack to find end of deletion zone
            while (upper < w - 3 && freqs.xData[upper + 1] - freqs.xData[upper + 2] > degridParams.cleanThreshold * freqs.xMax)
                upper++;
            xGridLines.push(new GridLine(lower, upper, 'x'));
            // Skip x to upper to save time technically the variable "upper" is unnecessary, but this way is more readable
            x = upper;
        }
    }
    if (deleting) { // Clean up loose ends
        xGridLines.push(new GridLine(lower, w - 1, 'x'));
    }

    // Delete vertical grid lines
    deleting = false;
    for (let y = 0; y < freqs.yData.length; y++) {
        if (!deleting && freqs.yData[y] > degridParams.deleteThreshold * freqs.yMax) { // start deleting
            deleting = true; lower = y;
            // Find lower bound of deletion zone
            while (lower > 2 && freqs.yData[lower - 1] - freqs.yData[lower - 2] > degridParams.cleanThreshold * freqs.yMax)
                lower--;
        } else if (deleting && freqs.yData[y] <= degridParams.deleteThreshold * freqs.yMax) { // stop deleting
            deleting = false; upper = y - 1;
            // Find upper bound of deletion zone
            while (upper < w - 3 && freqs.yData[upper + 1] - freqs.yData[upper + 2] > degridParams.cleanThreshold * freqs.yMax)
                upper++;
            yGridLines.push(new GridLine(lower, upper, 'y'));
            y = upper;
        }
    }
    if (deleting) // Clean up loose ends
        yGridLines.push(new GridLine(lower, h - 1, 'y'));

    if (xGridLines.length <= 0 || yGridLines.length <= 1) {
        alert("Insufficient grid lines found to establish chart area bounds.");
        return;
    }

    // Find chart area bounds
    l = xGridLines[0].center;
    r = xGridLines[xGridLines.length - 1].center;
    t = yGridLines[0].center;
    b = yGridLines[yGridLines.length - 1].center;
    w2 = r - l;
    h2 = b - t; // note that this means the chart area is exclusive of r and t.

    // Draw
    let dispCanvas = document.createElement("canvas");
    dispCanvas.width = w; dispCanvas.height = h;
    let dispContext = dispCanvas.getContext("2d");
    dispContext.drawImage(canvases[CANVAS.BW], 0, 0);
    dispContext.fillStyle = "rgba(255,0,0,0.5)";
    dispContext.fillRect(0, 0, w, h);

    clearSection(SECTION.DEGRID);
    sectionDivs[SECTION.DEGRID].appendChild(dispCanvas); // this is irritating because it would be nice if all of canvases[] were offscreen, but I don't want to make a separate canvas.
    dispCanvas.style.position = "absolute";
    dispCanvas.style.left = "0px";
    dispCanvas.style.right = "0px";
    dispCanvas.style.zIndex = 1;
    sectionDivs[SECTION.DEGRID].appendChild(canvases[CANVAS.DEGRIDDED]); // this is irritating because it would be nice if all of canvases[] were offscreen, but I don't want to make a separate canvas.
    canvases[CANVAS.DEGRIDDED].style.position = "absolute";
    canvases[CANVAS.DEGRIDDED].style.left = "0px";
    canvases[CANVAS.DEGRIDDED].style.right = "0px";
    canvases[CANVAS.DEGRIDDED].style.zIndex = 2;
    sectionDivs[SECTION.DEGRID].style.height = h;

    resetupCleanUI();

}