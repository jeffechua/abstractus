const defaultDegridParams = {
    detectionThreshold: 0.4,
    slopeThreshold: 0.1,
    defaultMargin: 1
}

const degridParams = {
    detectionThreshold: 0.4,
    slopeThreshold: 0.1,
    defaultMargin: 1
}

const editorSize = 50;

let xGridLines;
let yGridLines;

class GridLine {

    editWidget; // UI element that allows modification of the margin

    constructor(lower, upper, dir, margin = -1) {
        this.lower = lower;
        this.upper = upper;
        if (dir != "v" && dir != "h")
            alert("Invalid grid line direction, assuming y.");
        this.dir = dir;
        this._margin = margin; // This is -1 if using default. get this to check if -1; there should be no case where we want to set this.
        this.active = true;
    }

    get margin() { return (this._margin == -1) ? degridParams.defaultMargin : this._margin; }
    set margin(margin) {
        this._margin = margin;
        if (this.editWidget) this.updateEditWidget()
    }

    updateEditWidget() {
        this.editWidget.value = this.margin;
        if (this._margin == -1)
            this.editWidget.style.fontWeight = "normal";
        else
            this.editWidget.style.fontWeight = "bold";
    }

    get llower() { return this.lower - this.margin; }
    get uupper() { return this.upper + this.margin; }

    erase() {
        const span = this.uupper - this.llower + 1; // +1 to be inclusive
        if (this.dir == "v")
            contexts[CANVAS.DEGRIDDED].clearRect(this.llower, 0, span, h);
        else
            contexts[CANVAS.DEGRIDDED].clearRect(0, this.llower, w, span);
    }

    restore() {
        const span = this.uupper - this.llower + 1; // +1 to be inclusive
        if (this.dir == "v")
            contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], this.llower, 0, span, h, this.llower, 0, span, h);
        else
            contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], 0, this.llower, w, span, 0, this.llower, w, span);
    }

    get center() {
        let integral = 0;
        let area = 0;
        const array = (this.dir == "v") ? freqs.xData : freqs.yData;
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
    let deleting = false;
    let lower = 0; let upper = 0; // lower and upper bound the deleted zone.
    l = 0; r = 0; t = 0; b = 0;
    xGridLines = [];
    yGridLines = [];

    // Delete horizontal grid lines
    for (let x = 0; x < freqs.xData.length; x++) {
        if (!deleting && freqs.xData[x] > degridParams.detectionThreshold * freqs.xMax) { // found new deletion zone
            deleting = true; lower = x;
            // Backtrack to find start of deletion zone
            while (lower > 2 && freqs.xData[lower - 1] - freqs.xData[lower - 2] > degridParams.slopeThreshold * freqs.xMax)
                lower--;
        } else if (deleting && freqs.xData[x] <= degridParams.detectionThreshold * freqs.xMax) { // close deletion zone
            deleting = false; upper = x - 1;
            // Forwardtrack to find end of deletion zone
            while (upper < w - 3 && freqs.xData[upper + 1] - freqs.xData[upper + 2] > degridParams.slopeThreshold * freqs.xMax)
                upper++;
            xGridLines.push(new GridLine(lower, upper, "v"));
            // Skip x to upper to save time technically the variable "upper" is unnecessary, but this way is more readable
            x = upper;
        }
    }
    if (deleting) { // Clean up loose ends
        xGridLines.push(new GridLine(lower, w - 1, "v"));
    }

    // Delete vertical grid lines
    deleting = false;
    for (let y = 0; y < freqs.yData.length; y++) {
        if (!deleting && freqs.yData[y] > degridParams.detectionThreshold * freqs.yMax) { // start deleting
            deleting = true; lower = y;
            // Find lower bound of deletion zone
            while (lower > 2 && freqs.yData[lower - 1] - freqs.yData[lower - 2] > degridParams.slopeThreshold * freqs.yMax)
                lower--;
        } else if (deleting && freqs.yData[y] <= degridParams.detectionThreshold * freqs.yMax) { // stop deleting
            deleting = false; upper = y - 1;
            // Find upper bound of deletion zone
            while (upper < w - 3 && freqs.yData[upper + 1] - freqs.yData[upper + 2] > degridParams.slopeThreshold * freqs.yMax)
                upper++;
            yGridLines.push(new GridLine(lower, upper, "h"));
            y = upper;
        }
    }
    if (deleting) // Clean up loose ends
        yGridLines.push(new GridLine(lower, h - 1, "h"));

    if (xGridLines.length <= 0 || yGridLines.length <= 1) {
        alert("Insufficient grid lines found to establish chart area bounds.");
        return;
    }

    rerenderDegrid();

}

function rerenderDegrid() {

    // Clear out and set up root div
    clearSection(SECTION.DEGRID);
    sectionDivs[SECTION.DEGRID].style.height = h + editorSize;
    sectionDivs[SECTION.DEGRID].style.width = w + editorSize;

    // Set up canvas[CANVAS.DEGRIDDED]
    contexts[CANVAS.DEGRIDDED].clearRect(0, 0, w, h);
    contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], 0, 0);

    // Set up underlying canvas
    const dispCanvas = document.createElement("canvas");
    dispCanvas.width = w; dispCanvas.height = h;
    const dispContext = dispCanvas.getContext("2d");
    dispContext.drawImage(canvases[CANVAS.BW], 0, 0);
    dispContext.fillStyle = "rgba(255,255,255,0.8)";
    dispContext.fillRect(0, 0, w, h);

    // Pack everything into the document
    putAtAbsolutePosition(dispCanvas, sectionDivs[SECTION.DEGRID], 0, 0, -1, -1, 1);
    putAtAbsolutePosition(canvases[CANVAS.DEGRIDDED], sectionDivs[SECTION.DEGRID], 0, 0, -1, -1, 2);

    // Draw grid lines
    dispContext.fillStyle = "red";
    for (let i = 0; i < xGridLines.length; i++) {
        // Editing widget
        createEditWidget(xGridLines[i]);
        if (xGridLines[i].active) {
            // Guide on underlying canvas
            let center = xGridLines[i].center;
            dispContext.fillRect(center, 0, 1, h);
            // Gap on masking canvas (canvas[CANVAS.DEGRIDDED])
            if (xGridLines[i].active) xGridLines[i].erase();
        }
    }
    for (let i = 0; i < yGridLines.length; i++) {
        // Editing widget
        createEditWidget(yGridLines[i]);
        if (yGridLines[i].active) {
            // Guide on underlying canvas
            let center = yGridLines[i].center;
            dispContext.fillRect(0, center, w, 1);
            // Gap on masking canvas (canvas[CANVAS.DEGRIDDED])
            yGridLines[i].erase();
        }
    }

    resetupCleanUI();
}

function createEditWidget(gridLine) {

    const isV = (gridLine.dir == "v");

    // Create functional elements
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = gridLine.active;
    checkbox.addEventListener("click", function () {
        gridLine.active = this.checked;
        rerenderDegrid();
    })
    gridLine.editWidget = document.createElement("input");
    gridLine.editWidget.type = "number";
    gridLine.editWidget.style.width = "30px";
    gridLine.editWidget.min = 0;
    gridLine.editWidget.max = 9;
    gridLine.updateEditWidget();
    gridLine.editWidget.addEventListener("change", function () {
        gridLine.margin = parseInt(this.value);
        rerenderDegrid();
    })

    // Pack and align
    const div = document.createElement("div");

    if (isV) {
        div.style.width = editorSize;
        div.style.height = editorSize;
        div.style.textAlign = "center";
        div.appendChild(checkbox);
        div.appendChild(document.createElement("br"));
        div.appendChild(gridLine.editWidget);
    } else {
        div.style.width = editorSize;
        div.style.height = editorSize;
        div.style.display = "inline-flex";
        div.style.alignItems = "center";
        div.appendChild(checkbox);
        div.appendChild(gridLine.editWidget);
    }

    // Position
    const x = isV ? gridLine.center : w;
    const y = isV ? h : gridLine.center;
    const xAnchor = isV ? 0 : -1;
    const yAnchor = isV ? -1 : 0;
    putAtAbsolutePosition(div, sectionDivs[SECTION.DEGRID], x, y, xAnchor, yAnchor);
}

// UI interface to set degrid params

const degridDetectionSlider = document.getElementById("degrid-detection-slider");
const degridDetectionNumber = document.getElementById("degrid-detection-number");
degridDetectionSlider.value = degridParams.detectionThreshold * 100;
degridDetectionNumber.value = degridParams.detectionThreshold * 100;
function setDegridDetectionThreshold(percentage) {
    degridParams.detectionThreshold = percentage / 100;
    degridDetectionSlider.value = percentage;
    degridDetectionNumber.value = percentage;
    if (progress >= SECTION.DEGRID)
        recomputeDegrid();
}

const degridSlopeSlider = document.getElementById("degrid-slope-slider");
const degridSlopeNumber = document.getElementById("degrid-slope-number");
degridSlopeSlider.value = degridParams.slopeThreshold * 100;
degridSlopeNumber.value = degridParams.slopeThreshold * 100;
function setDegridSlopeThreshold(percentage) {
    // This could also be optimized similar to only partially recompute, but
    // it would take effort and I'm lazy.
    degridParams.slopeThreshold = percentage / 100;
    degridSlopeSlider.value = percentage;
    degridSlopeNumber.value = percentage;
    if (progress >= SECTION.DEGRID)
        recomputeDegrid();
}

const degridDefMarginNumber = document.getElementById("degrid-defmargin-number");
degridDefMarginNumber.value = degridParams.defaultMargin;
function setDegridDefaultMargin(value) {
    degridParams.defaultMargin = parseInt(value);
    degridDefMarginNumber.value = value;
    // We could restore all default-margin grid lines, change the default,
    // then erase them again, but assuming that most grid lines are default,
    // it should be faster to simply blit a fresh image and erase from that.
    if (progress >= SECTION.DEGRID)
        rerenderDegrid();
}