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
    logScale: [false, false],
    bounds: [0, 1, 0, 1],
    get exportWidth() { return this.bounds[1] - this.bounds[0]; },
    get exportHeight() { return this.bounds[3] - this.bounds[2]; },
    exportX: function (x) {
        if (exportParams.logScale[0])
            return Math.pow(10, Math.log10(this.bounds[0]) + Math.log10(this.bounds[1] / this.bounds[0]) * x / w2);
        else
            return this.bounds[0] + this.exportWidth * x / w2;
    },
    exportY: function (y) {
        if (exportParams.logScale[1])
            return Math.pow(10, Math.log10(this.bounds[2]) + Math.log10(this.bounds[3] / this.bounds[2]) * (h2 - y) / h2);
        else
            return this.bounds[2] + this.exportHeight * (h2 - y) / h2;
    }
}

const exportCanvas = document.getElementById("export-canvas");
const exportContext = exportCanvas.getContext("2d");
const exportHighlightCanvas = document.getElementById("export-highlight-canvas");
const exportHighlightContext = exportHighlightCanvas.getContext("2d");
const downloadsTable = document.getElementById("downloads-table");

let exportCurves;

function recomputeExport() {

    progress = SECTION.EXPORT;

    exportCanvas.width = w2 + 1 + exportDrawing.leftMargin;
    exportCanvas.height = h2 + 1 + exportDrawing.bottomMargin;
    exportHighlightCanvas.width = w2 + 1 + exportDrawing.leftMargin;
    exportHighlightCanvas.height = h2 + 1 + exportDrawing.bottomMargin;
    exportHighlightContext.lineWidth = 2;

    exportCurves = curves.map((curve) => new ExportCurve(curve, EXPORTMODE.DEFAULT, -1));

    redrawExport();

    while (downloadsTable.rows.length > 0)
        downloadsTable.deleteRow(0);

    downloadsTable.insertRow().insertCell();

    // Global controls
    const topRow = downloadsTable.insertRow();
    const downloadCell = topRow.insertCell(); downloadCell.colSpan = 2;
    const downloadAllLink = document.createElement("a");
    downloadAllLink.text = "Download All";
    downloadAllLink.href = "javascript:;";
    downloadCell.appendChild(downloadAllLink);
    const select = createModeDropdown();
    topRow.insertCell().appendChild(select);
    const intervalControls = createIntervalControls();
    const intervalNumber = intervalControls[0]; const intervalSlider = intervalControls[1];
    topRow.insertCell().appendChild(intervalNumber);
    topRow.insertCell().appendChild(intervalSlider);

    downloadsTable.insertRow().insertCell();

    select.selectedIndex = exportParams.defaultMode + 1;
    intervalNumber.value = exportParams.defaultInterval;
    intervalSlider.value = exportParams.defaultInterval;

    let callbacks = [];

    const nRows = exportCurves.length > 5 ? Math.ceil(exportCurves.length / 2) : exportCurves.length;
    for (let i = 0; i < nRows; i++) downloadsTable.insertRow();

    // Individual controls
    for (let i = 0; i < exportCurves.length; i++) {

        const row = downloadsTable.rows[i % nRows + 3];

        // Download link
        const downloadLink = document.createElement("a");
        downloadLink.innerText = "Download";
        downloadLink.href = exportCurves[i].generateDownloadLink();
        downloadLink.download = "Data_" + (i + 1) + ".csv";
        row.insertCell().appendChild(downloadLink);

        // Dataset name
        const nameCell = row.insertCell();
        const labelText = document.createElement("span");
        labelText.style.color = exportCurves[i].color;
        labelText.innerText = "Data " + (i + 1);
        nameCell.appendChild(labelText);

        // Dataset name editing
        const nameEdit = document.createElement("input");
        nameEdit.type = "text";
        nameEdit.style.width = "100px";
        nameEdit.value = labelText.innerText;
        nameEdit.addEventListener("change", () => {
            if (nameEdit.value == "")
                return;
            labelText.innerText = nameEdit.value;
            downloadLink.download = nameEdit.value.replace(" ", "_") + ".csv";
            labelText.style.display = "block";
            nameEdit.style.display = "none";
            exportHighlightContext.clearRect(0, 0, exportHighlightCanvas.width, exportHighlightCanvas.height);
            exportCanvas.style.opacity = "100%";
        });
        nameEdit.addEventListener("keydown", (e) => {
            if (e.key == "Escape") {
                labelText.style.display = "block";
                nameEdit.style.display = "none";
                nameEdit.value = labelText.innerText;
                exportHighlightContext.clearRect(0, 0, exportHighlightCanvas.width, exportHighlightCanvas.height);
                exportCanvas.style.opacity = "100%";
            }
        })
        labelText.addEventListener("dblclick", () => {
            labelText.style.display = "none";
            nameEdit.style.display = "block";
            nameEdit.focus();
            nameEdit.select();
            exportCurves[i].highlight();
            exportCanvas.style.opacity = "50%";
        })
        nameEdit.style.display = "none";
        nameCell.appendChild(nameEdit);

        // Export mode setter
        const modeSelect = createModeDropdown();
        row.insertCell().appendChild(modeSelect);
        modeSelect.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], parseInt(modeSelect.value), exportCurves[i]._interval);
            downloadLink.href = exportCurves[i].generateDownloadLink();
            updateModeUI(exportCurves[i]._mode, modeSelect, intervalNumber, intervalSlider);
            redrawExport();
        });

        // Interval setter
        const intervalControls = createIntervalControls();
        const intervalNumber = intervalControls[0]; const intervalSlider = intervalControls[1];
        row.insertCell().appendChild(intervalNumber);
        row.insertCell().appendChild(intervalSlider);
        intervalNumber.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, intervalNumber.value);
            downloadLink.href = exportCurves[i].generateDownloadLink();
            updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
            redrawExport();
        });
        intervalSlider.addEventListener("change", () => {
            exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, intervalSlider.value);
            downloadLink.href = exportCurves[i].generateDownloadLink();
            updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
            redrawExport();
        });

        // Hook stuff up to the defaults controls
        callbacks.push(() => {
            if (exportCurves[i]._mode == EXPORTMODE.DEFAULT || exportCurves[i]._interval == -1) {
                exportCurves[i] = new ExportCurve(curves[i], exportCurves[i]._mode, exportCurves[i]._interval);
                updateModeUI(exportCurves[i]._mode, modeSelect, intervalNumber, intervalSlider);
                updateIntervalUI(exportCurves[i]._interval, intervalNumber, intervalSlider);
                downloadLink.href = exportCurves[i].generateDownloadLink();
            }
        });
        downloadAllLink.addEventListener("click", () => downloadLink.click());

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
    const def = document.createElement("option");
    const all = document.createElement("option");
    const intvl = document.createElement("option");
    const dist = document.createElement("option");
    select.selectedIndex = exportParams.defaultMode + 1;
    def.value = EXPORTMODE.DEFAULT; def.innerText = "Reset to default";
    all.value = EXPORTMODE.ALL; all.innerText = "All data";
    intvl.value = EXPORTMODE.FIXED_INTERVAL; intvl.innerText = "Fixed intervals";
    dist.value = EXPORTMODE.FIXED_DISTANCE; dist.innerText = "Fixed distances";
    select.add(def); select.add(all); select.add(intvl); select.add(dist);
    select.style.width = "120px";
    return select;
}

function updateModeUI(_mode, select, number, slider) {
    const mode = _mode == EXPORTMODE.DEFAULT ? exportParams.defaultMode : _mode;
    select.selectedIndex = mode + 1;
    if (mode != EXPORTMODE.ALL) {
        number.style.display = "block";
        slider.style.display = "block";
    } else {
        number.style.display = "none";
        slider.style.display = "none";
    }
    if (_mode == EXPORTMODE.DEFAULT)
        select.style.fontWeight = "normal";
    else
        select.style.fontWeight = "bold";
}

function createIntervalControls() {
    const intervalNumber = document.createElement("input");
    const intervalSlider = document.createElement("input");
    intervalNumber.type = "number"; intervalNumber.style.width = "50px";
    intervalNumber.min = 1; intervalNumber.max = Infinity; intervalNumber.value = exportParams.defaultInterval; intervalNumber.step = 1;
    intervalSlider.type = "range"; intervalNumber.class = "slider"; intervalSlider.style.width = "70px";
    intervalSlider.min = 1; intervalSlider.max = Math.round(Math.max(w2, h2) / 10); intervalSlider.value = exportParams.defaultInterval; intervalSlider.step = 1;
    intervalNumber.style.display = exportParams.defaultMode == EXPORTMODE.ALL ? "none" : "block";
    intervalSlider.style.display = exportParams.defaultMode == EXPORTMODE.ALL ? "none" : "block";
    return [intervalNumber, intervalSlider];
}

function updateIntervalUI(_interval, number, slider) {
    const interval = _interval == -1 ? exportParams.defaultInterval : _interval;
    number.value = interval; // we've indirectly parsed -1s by going through exportCurves[i].
    slider.value = interval;
    if (_interval == -1)
        number.style.fontWeight = "normal";
    else
        number.style.fontWeight = "bold";
}

function redrawExport() {

    exportContext.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportContext.strokeStyle = "black";
    const xPrecision = Math.max(0, 2 - Math.round(Math.log10(Math.abs(exportParams.exportWidth))));
    const yPrecision = Math.max(0, 2 - Math.round(Math.log10(Math.abs(exportParams.exportHeight))));
    const xFormat = exportParams.logScale[0] ? (x) => x.toExponential(1) : (x) => x.toFixed(xPrecision);
    const yFormat = exportParams.logScale[1] ? (y) => y.toExponential(1) : (y) => y.toFixed(yPrecision);

    for (let i = 1; i < xGridLines.length - 1; i++) {
        if (!xGridLines[i].active) continue;
        const x = Math.round(xGridLines[i].center) - l;
        const exportX = exportParams.exportX(x);
        exportContext.beginPath();
        exportContext.moveTo(exportDrawing.l + x + 0.5, exportDrawing.t + 0.5);
        exportContext.lineTo(exportDrawing.l + x + 0.5, exportDrawing.b + 0.5);
        exportContext.stroke();
        writeText(xFormat(exportX), exportContext, exportDrawing.l + x, exportDrawing.b + exportDrawing.textMargin, 0, -1);
    }
    for (let i = 1; i < yGridLines.length - 1; i++) {
        if (!yGridLines[i].active) continue;
        const y = Math.round(yGridLines[i].center) - t;
        const exportY = exportParams.exportY(y);
        exportContext.beginPath();
        exportContext.moveTo(exportDrawing.l + 0.5, exportDrawing.t + y + 0.5);
        exportContext.lineTo(exportDrawing.r + 0.5, exportDrawing.t + y + 0.5);
        exportContext.stroke();
        writeText(yFormat(exportY), exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.t + y, 1, 0);
    }
    exportCurves.map((curve) => curve.draw());
    exportContext.strokeStyle = "black";
    exportContext.strokeRect(exportDrawing.l + 0.5, exportDrawing.t + 0.5, w2, h2);

    exportContext.fillStyle = "black";
    writeText(xFormat(exportParams.bounds[0]), exportContext, exportDrawing.l + exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, -1, -1);
    writeText(xFormat(exportParams.bounds[1]), exportContext, exportDrawing.r - exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, +1, -1);
    writeText(yFormat(exportParams.bounds[2]), exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.b - exportDrawing.textMargin, +1, +1);
    writeText(yFormat(exportParams.bounds[3]), exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.t + exportDrawing.textMargin, +1, -1);

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