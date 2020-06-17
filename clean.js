// Autoclean

function autoClean(e) {
    maskContext.clearRect(0, 0, w2, h2);
    for (let i = 0; i < Reduction.vGridLines.length; i++) {
        const lv = Reduction.vGridLines[i].llower - 1 - Reduction.vLower; // immediate up of grid line
        const uv = Reduction.vGridLines[i].uupper + 1 - Reduction.vLower; // immediate down of grid line
        for (let u = 0; u < Reduction.uSize; u++) {
            if (Reduction.uGridLookup[u] == true)
                continue;
            if (Reduction.isBlack(u, lv)) {
                let v = lv;
                while (Reduction.isBlack(u, v - 1)) v--;
                const x = Reduction.axis ? u : v; const y = Reduction.axis ? v : u;
                const width = Reduction.axis ? 1 : lv - v + 1;
                const height = Reduction.axis ? lv - v + 1 : 1;
                maskContext.fillRect(x, y, width, height);
            }
            if (Reduction.isBlack(u, uv)) {
                let v = uv;
                while (Reduction.isBlack(u, v + 1)) v++;
                const x = Reduction.axis ? u : uv; const y = Reduction.axis ? uv : u;
                const width = Reduction.axis ? 1 : v - uv + 1;
                const height = Reduction.axis ? v - uv + 1 : 1;
                maskContext.fillRect(x, y, width, height);
            }
        }
    }
    recomputeFragments();
}

// Manual cleaning

function cleanDrawStart(e) {
    manualCleanState.drawing = true;
    manualCleanState.x = e.offsetX;
    manualCleanState.y = e.offsetY;
    manualCleanState.delete = !e.shiftKey;
    cleanUIContext.strokeStyle = manualCleanState.delete ? "red" : "green";
}
function cleanDrawMove(e) {
    if (!manualCleanState.drawing)
        return;
    cleanUIContext.clearRect(0, 0, w, h);
    cleanUIContext.strokeRect(manualCleanState.x, manualCleanState.y, e.offsetX - manualCleanState.x + 1, e.offsetY - manualCleanState.y + 1);
}
function cleanDrawStop(e) {
    if (!manualCleanState.drawing)
        return;
    cleanUIContext.clearRect(0, 0, w, h);
    const x = manualCleanState.x - l;
    const y = manualCleanState.y - t;
    const fillWidth = e.offsetX - manualCleanState.x;
    const fillHeight = e.offsetY - manualCleanState.y;
    if (manualCleanState.delete)
        maskContext.fillRect(x, y, fillWidth, fillHeight);
    else
        maskContext.clearRect(x, y, fillWidth, fillHeight);;
    manualCleanState.drawing = false;
    recomputeFragments();
}

document.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
        cleanUIContext.clearRect(0, 0, w, h);
        manualCleanState.drawing = false;
    }
});

const manualCleanState = {
    x: 0,
    y: 0,
    drawing: false,
    delete: false
}
