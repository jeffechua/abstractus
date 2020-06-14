const exportDrawing = {
    leftMargin: 30,
    bottomMargin: 30,
    gridlineNumberPrecision: 2,
    get l() { return this.leftMargin; },
    get r() { return this.leftMargin + w2 + 1; },
    get t() { return 0; },
    get b() { return h2 + 1; },
    textMargin: 3
}

const EXPORTMODE = {
    DEFAULT: -1,
    ALL: 0,
    FIXED_INTERVAL: 1,
    FIXED_DISTANCE: 2
}

const exportParams = {
    defaultMode: EXPORTMODE.ALL,
    defaultInterval: 5,
    bounds: [0, 1, 0, 1],
    get exportWidth() { return this.bounds[1] - this.bounds[0]; },
    get exportHeight() { return this.bounds[3] - this.bounds[2]; },
    exportX: function (x) {
        return this.bounds[0] + this.exportWidth * x / w2;
    },
    exportY: function (y) {
        return this.bounds[2] + this.exportHeight * (h2 - y) / h2;
    }
}

const exportCanvas = document.getElementById("export-canvas");
const exportContext = exportCanvas.getContext("2d");
const downloadsTable = document.getElementById("downloads-table");

function setExportBounds(input, target) {
    const value = parseInt(input.value);
    if (value == undefined) {
        input.value = exportParams.Bounds[target];
    } else {
        exportParams.bounds[target] = value;
        recomputeExport();
    }
    input.blur();
}

let exportCurves;

function recomputeExport() {

    exportCanvas.width = w2 + 1 + exportDrawing.leftMargin;
    exportCanvas.height = h2 + 1 + exportDrawing.bottomMargin;

    exportCurves = curves.map((curve) => new ExportCurve(curve, EXPORTMODE.DEFAULT, -1));

    redrawExport();

    while (downloadsTable.rows.length > 0)
        downloadsTable.deleteRow(0);

    // Global controls
    const topRow = downloadsTable.insertRow(0);
    topRow.insertCell(); topRow.insertCell();
    const select = createModeDropdown();
    cell = topRow.insertCell(); cell.appendChild(select);
    const intervalControls = createIntervalControls();
    const intervalNumber = intervalControls[0]; const intervalSlider = intervalControls[1];
    const cell1 = topRow.insertCell(); cell1.appendChild(intervalNumber);
    const cell2 = topRow.insertCell(); cell2.appendChild(intervalSlider);

    select.selectedIndex = exportParams.defaultMode;
    intervalNumber.value = exportParams.defaultInterval;
    intervalSlider.value = exportParams.defaultInterval;

    let callbacks = [];


    // Individual controls
    for (let i = 0; i < exportCurves.length; i++) {
        const row = downloadsTable.insertRow();
        let cell;

        const labelText = document.createElement("span");
        labelText.style.color = exportCurves[i].color;
        labelText.innerText = "Data " + (i + 1);
        cell = row.insertCell(); cell.appendChild(labelText);

        const downloadButton = document.createElement("a");
        downloadButton.innerText = "Download";
        downloadButton.href = exportCurves[i].generateDownloadLink();
        downloadButton.download = "data_" + (i + 1) + ".csv";
        cell = row.insertCell(); cell.appendChild(downloadButton);

        // Export mode setter
        const modeSelect = createModeDropdown();
        cell = row.insertCell(); cell.appendChild(modeSelect);
        modeSelect.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], parseInt(modeSelect.value), exportCurves[i]._interval);
            downloadButton.href = exportCurves[i].generateDownloadLink();
            updateModeUI(exportCurves[i]._mode, modeSelect, intervalNumber, intervalSlider);
            redrawExport();
        });

        // Interval setter
        const intervalControls = createIntervalControls();
        const intervalNumber = intervalControls[0]; const intervalSlider = intervalControls[1];
        const cell1 = row.insertCell(); cell1.appendChild(intervalNumber);
        const cell2 = row.insertCell(); cell2.appendChild(intervalSlider);
        intervalNumber.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, intervalNumber.value);
            downloadButton.href = exportCurves[i].generateDownloadLink();
            updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
            redrawExport();
        });
        intervalSlider.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, intervalSlider.value);
            downloadButton.href = exportCurves[i].generateDownloadLink();
            updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
            redrawExport();
        });

        // Hook stuff up to the defaults controls
        callbacks.push(() => {
            if (exportCurves[i]._mode == EXPORTMODE.DEFAULT || exportCurves[i]._interval == -1) {
                exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, exportCurves[i]._interval);
                updateModeUI(exportCurves[i]._mode, modeSelect, intervalNumber, intervalSlider);
                updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
                downloadButton.href = exportCurves[i].generateDownloadLink();
            }
        });
        
        updateModeUI(exportCurves[i]._mode, modeSelect, intervalNumber, intervalSlider);
        updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);

    }

    // Default change listeners
    select.addEventListener("change", function () {
        exportParams.defaultMode = parseInt(this.value);
        if (this.value != EXPORTMODE.ALL) {
            intervalNumber.style.display = "block";
            intervalSlider.style.display = "block";
        } else {
            intervalNumber.style.display = "none";
            intervalSlider.style.display = "none";
        }
        for (let i = 0; i < callbacks.length; i++) callbacks[i]();
        redrawExport();
    });
    intervalNumber.addEventListener("change", function () {
        intervalSlider.value = this.value;
        exportParams.defaultInterval = this.value;
        for (let i = 0; i < callbacks.length; i++) callbacks[i]();
        redrawExport();
    });
    intervalSlider.addEventListener("change", function () {
        intervalNumber.value = this.value;
        exportParams.defaultInterval = this.value;
        for (let i = 0; i < callbacks.length; i++) callbacks[i]();
        redrawExport();
    });

}

function createModeDropdown() {
    const select = document.createElement("select");
    const all = document.createElement("option");
    const intvl = document.createElement("option");
    const dist = document.createElement("option");
    select.selectedIndex = exportParams.defaultMode;
    all.value = EXPORTMODE.ALL; all.innerText = "All data";
    intvl.value = EXPORTMODE.FIXED_INTERVAL; intvl.innerText = "Fixed x intervals";
    dist.value = EXPORTMODE.FIXED_DISTANCE; dist.innerText = "Fixed 2D distances";
    select.add(all); select.add(intvl); select.add(dist);
    return select;
}

function updateModeUI(_mode, select, number, slider) {
    const mode = _mode == EXPORTMODE.DEFAULT ? exportParams.defaultMode : _mode;
    select.selectedIndex = mode; // this depends on the options being 1:1 corresponding to EXPORTMODE
    if (mode != EXPORTMODE.ALL) {
        number.style.display = "block";
        slider.style.display = "block";
    } else {
        number.style.display = "none";
        slider.style.display = "none";
    }
    if(_mode == EXPORTMODE.DEFAULT)
        select.style.fontWeight = "normal";
    else 
        select.style.fontWeight = "bold";
}

function createIntervalControls() {
    const intervalNumber = document.createElement("input");
    const intervalSlider = document.createElement("input");
    intervalNumber.type = "number"; intervalNumber.style.width = "50px";
    intervalNumber.min = 1; intervalNumber.max = Infinity; intervalNumber.value = exportParams.defaultInterval; intervalNumber.step = 1;
    intervalSlider.type = "range"; intervalNumber.class = "slider";
    intervalSlider.min = 1; intervalSlider.max = Math.round(Math.max(w2, h2) / 3); intervalSlider.value = exportParams.defaultInterval; intervalSlider.step = 1;
    intervalNumber.style.display = exportParams.defaultMode == EXPORTMODE.ALL ? "none" : "block";
    intervalSlider.style.display = exportParams.defaultMode == EXPORTMODE.ALL ? "none" : "block";
    return [intervalNumber, intervalSlider];
}

function updateIntervalUI(_interval, number, slider) {
    const interval = _interval == -1 ? exportParams.defaultInterval : _interval;
    number.value = interval; // we've indirectly parsed -1s by going through exportCurves[i].
    slider.value = interval;
    if(_interval == -1)
        number.style.fontWeight = "normal";
    else 
        number.style.fontWeight = "bold";
}

function redrawExport() {

    exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportContext.strokeStyle = "black";
    const xPrecision = Math.pow(10, Math.round(Math.log10(exportParams.exportWidth)) - 2);
    const yPrecision = Math.pow(10, Math.round(Math.log10(exportParams.exportHeight)) - 2);

    for (let i = 1; i < xGridLines.length - 1; i++) {
        const x = Math.round(xGridLines[i].center) - l;
        const exportX = exportParams.exportX(x);
        exportContext.beginPath();
        exportContext.moveTo(exportDrawing.l + x + 0.5, exportDrawing.t + 0.5);
        exportContext.lineTo(exportDrawing.l + x + 0.5, exportDrawing.b + 0.5);
        exportContext.stroke();
        writeText(Math.round(exportX / xPrecision) * xPrecision, exportContext, exportDrawing.l + x, exportDrawing.b + exportDrawing.textMargin, 0, -1);
    }
    for (let i = 1; i < yGridLines.length - 1; i++) {
        const y = Math.round(yGridLines[i].center) - t;
        const exportY = exportParams.exportY(y);
        exportContext.beginPath();
        exportContext.moveTo(exportDrawing.l + 0.5, exportDrawing.t + y + 0.5);
        exportContext.lineTo(exportDrawing.r + 0.5, exportDrawing.t + y + 0.5);
        exportContext.stroke();
        writeText(Math.round(exportY / yPrecision) * yPrecision, exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.t + y, 1, 0);
    }
    exportCurves.map((curve) => curve.draw());
    exportContext.strokeStyle = "black";
    exportContext.strokeRect(exportDrawing.l + 0.5, exportDrawing.t + 0.5, w2, h2);

    writeText(exportParams.bounds[0], exportContext, exportDrawing.l + exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, -1, -1);
    writeText(exportParams.bounds[1], exportContext, exportDrawing.r - exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, +1, -1);
    writeText(exportParams.bounds[2], exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.b - exportDrawing.textMargin, +1, +1);
    writeText(exportParams.bounds[3], exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.t + exportDrawing.textMargin, +1, -1);

}

function writeText(text, context, x, y, xAnchor, yAnchor) {
    const size = context.measureText(text);
    let _x;
    let _y;
    switch (xAnchor) {
        case -1:
            _x = x;
            break;
        case 0:
            _x = x - size.width / 2;
            break;
        case +1:
            _x = x - size.width;
            break;
    }
    switch (yAnchor) {
        case -1:
            _y = y + size.actualBoundingBoxAscent;
            break;
        case 0:
            _y = y + size.actualBoundingBoxAscent / 2 - size.actualBoundingBoxDescent;
            break;
        case +1:
            _y = y - size.actualBoundingBoxDescent;
            break;
    }
    context.fillText(text, _x + 0.5, _y + 0.5);
}