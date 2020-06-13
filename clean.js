// Autoclean

function autoClean(e) {
    maskContext.clearRect(0, 0, w2, h2);
    for (let i = 0; i < Reduction.vGridLines.length; i++) {
        const lv = Reduction.vGridLines[i].llower - 1 - Reduction.vLower; // immediate left of grid line
        const uv = Reduction.vGridLines[i].uupper + 1 - Reduction.vLower; // immediate right of grid line
        let triggered = false;
        let lu; // bottom of current triggered zone
        let uu; // top of current triggered zone
        let llv; // left of current triggered zone <= lu
        let uuv; // right of current triggered zone >= uu

        let u;
        for (u = 0; u < Reduction.uSize; u++) {
            if (Reduction.uGridLookup[u] == true)
                continue;
            let ltrig = Reduction.isBlack(u, lv);
            let utrig = Reduction.isBlack(u, uv);
            if (!triggered && (ltrig || utrig)) { // starting a triggered zone
                triggered = true;
                lu = u;
                llv = lv;
                uuv = uv;
            } else if (triggered && !(ltrig || utrig)) { // closing a triggered zone
                triggered = false;
                uu = u - 1;
                uSize = uu - lu + 1;
                vSize = uuv - llv + 1;
                if (Reduction.axis)
                    maskContext.fillRect(lu, llv, uSize, vSize);
                else
                    maskContext.fillRect(llv, lu, vSize, uSize);
            }
            if (triggered) {
                let v;
                // walk towards -u until we find nonblack
                for (v = lv; v >= 0 && Reduction.isBlack(u, v); v--) { } v++;
                if (v < llv) llv = v;
                // walk towards +u until we find nonblack
                for (v = uv; v < Reduction.vSize && Reduction.isBlack(u, v); v++) { } v--;
                if (v > uuv) uuv = v;
            }
        }
        if (triggered) { // cleanup
            triggered = false;
            uu = u - 1;
            uSize = uu - lu + 1;
            vSize = uuv - llv + 1;
            if (Reduction.axis)
                maskContext.fillRect(lu, llv, uSize, vSize);
            else
                maskContext.fillRect(llv, lu, vSize, uSize);
        }
    }
    recomputeReduction();
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
    recomputeReduction();
}

document.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
        cleanUIContext.clearRect(0, 0, w, h);
        manualCleanState.drawing = false;
    }
})

const manualCleanState = {
    x: 0,
    y: 0,
    drawing: false,
    delete: false
}
