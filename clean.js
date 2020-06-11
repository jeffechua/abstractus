
putAtAbsolutePosition(canvases[CANVAS.POSTCROP], sectionDivs[SECTION.CLEAN], 0, 0, -1, -1, 1);
const frameCanvas = document.getElementById("clean-frame-canvas");
const frameContext = frameCanvas.getContext("2d");
const maskCanvas = document.getElementById("clean-mask-canvas");
const maskContext = maskCanvas.getContext("2d");
const cleanUICanvas = document.getElementById("clean-ui-canvas");
const cleanUIContext = cleanUICanvas.getContext("2d");

function resetupCleanUI() {

    // Find chart area bounds
    const activeX = xGridLines.filter((element) => element.active);
    l = activeX[0].center;
    r = activeX[activeX.length - 1].center;
    const activeY = yGridLines.filter((element) => element.active);
    t = activeY[0].center;
    b = activeY[activeY.length - 1].center;
    w2 = r - l;
    h2 = b - t; // note that this means the chart area is exclusive of r and t.

    progress = SECTION.CLEAN;

    // Size the rest of the working canvases for the process
    for (let i = CANVAS.POSTCROP; i < CANVAS.FINAL; i++) {
        canvases[i].width = w2; canvases[i].height = h2;
    }

    // Size our canvases
    frameCanvas.width = w; frameCanvas.height = h;
    maskCanvas.width = w2; maskCanvas.height = h2;
    cleanUICanvas.width = w; cleanUICanvas.height = h;
    // Position those the require it
    maskCanvas.style.left = l; maskCanvas.style.top = t;
    canvases[CANVAS.POSTCROP].style.left = l;
    canvases[CANVAS.POSTCROP].style.top = t;

    // Initial draws and set up
    contexts[CANVAS.POSTCROP].drawImage(canvases[CANVAS.DEGRIDDED], l, t, w2, h2, 0, 0, w2, h2);
    frameContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);
    frameContext.clearRect(l, t, w2, h2);
    maskContext.fillStyle = "white"; // This cannot be done outside since resizing the
    maskContext.globalAlpha = 0.9;   // canvas clears all context state.
    

    const cleanDrawStart = function (e) {
        cleanUIState.drawing = true;
        cleanUIState.x = e.offsetX;
        cleanUIState.y = e.offsetY;
        cleanUIState.delete = !e.shiftKey;
        cleanUIContext.strokeStyle = cleanUIState.delete ? "red" : "green";
    }
    const cleanDrawMove = function (e) {
        if (cleanUIState.drawing != true)
            return;
        cleanUIContext.clearRect(0, 0, w, h);
        cleanUIContext.strokeRect(cleanUIState.x, cleanUIState.y, e.offsetX - cleanUIState.x + 1, e.offsetY - cleanUIState.y + 1);
    }
    const cleanDrawStop = function (e) {
        cleanUIContext.clearRect(0, 0, w, h);
        const x = cleanUIState.x - l;
        const y = cleanUIState.y - t;
        const fillWidth = e.offsetX - cleanUIState.x + 1;
        const fillHeight = e.offsetY - cleanUIState.y + 1;
        maskContext.clearRect(x, y, fillWidth, fillHeight);
        if (cleanUIState.delete)
            maskContext.fillRect(x, y, fillWidth, fillHeight);
        cleanUIState.drawing = false;
    }

    cleanUICanvas.addEventListener("mousedown", cleanDrawStart);
    cleanUICanvas.addEventListener("mousemove", cleanDrawMove);
    cleanUICanvas.addEventListener("mouseup", cleanDrawStop);
    cleanUICanvas.addEventListener("mouseleave", cleanDrawStop);

}

document.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
        cleanUIContext.clearRect(0, 0, w, h);
        cleanUIState.drawing = false;
    }
})

const cleanUIState = {
    x: 0,
    y: 0,
    drawing: false,
    delete: false
}