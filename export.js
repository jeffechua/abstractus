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

const exportParams = {
    mode: "all",
    interval: 5,
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
    exportCurves = curves.map((curve) => new ExportCurve(curve).draw());
    exportContext.strokeStyle = "black";
    exportContext.strokeRect(exportDrawing.l + 0.5, exportDrawing.t + 0.5, w2, h2);

    writeText(exportParams.bounds[0], exportContext, exportDrawing.l + exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, -1, -1);
    writeText(exportParams.bounds[1], exportContext, exportDrawing.r - exportDrawing.textMargin, exportDrawing.b + exportDrawing.textMargin, +1, -1);
    writeText(exportParams.bounds[2], exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.b - exportDrawing.textMargin, +1, +1);
    writeText(exportParams.bounds[3], exportContext, exportDrawing.l - exportDrawing.textMargin, exportDrawing.t + exportDrawing.textMargin, +1, -1);

    while (downloadsTable.rows.length > 0)
        downloadsTable.deleteRow(0);

    for (let i = 0; i < exportCurves.length; i++) {
        const row = downloadsTable.insertRow();
        let cell;

        const labelText = document.createElement("span");
        labelText.style.color = exportCurves[i].color;
        labelText.innerText = "Data " + (i + 1);
        cell = row.insertCell(); cell.appendChild(labelText);

        const downloadButton = document.createElement("a");
        downloadButton.innerText = "Download";
        downloadButton.href = exportCurves[i].downloadLink;
        downloadButton.download = "data_" + (i+1) + ".csv";
        cell = row.insertCell(); cell.appendChild(downloadButton);

    }

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