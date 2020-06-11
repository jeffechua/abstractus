
// Arrays over w2 and h2 respectively, 0=false where there is no gridline and 1=true where there is
let xGridLookup;
let yGridLookup;

function recomputeClean() {

    if (xGridLines.length <= 1 || yGridLines.length <= 1) {
        alert("Insufficient grid lines found to establish chart area bounds. Aborting.");
        return;
    }

    progress = SECTION.CLEAN;

    // Find chart area bounds
    const activeX = xGridLines.filter((element) => element.active);
    l = activeX[0].center;
    r = activeX[activeX.length - 1].center;
    const activeY = yGridLines.filter((element) => element.active);
    t = activeY[0].center;
    b = activeY[activeY.length - 1].center;
    w2 = r - l;
    h2 = b - t; // note that this means the chart area is exclusive of r and t.

    // Size the rest of the working canvases
    for (let i = CANVAS.POSTCROP; i < CANVAS.FINAL; i++) {
        canvases[i].width = w2; canvases[i].height = h2;
    }

    // Recompute grid lookups
    xGridLookup = new Uint8Array(w2);
    yGridLookup = new Uint8Array(h2);
    for (let i = 0; i < xGridLines.length; i++) {
        lower = Math.max(xGridLines[i].llower - l, 0);
        upper = Math.min(xGridLines[i].uupper - l, w2 - 1);
        for (let x = lower; x <= upper; x++)
            xGridLookup[x] = true;
    }
    for (let i = 0; i < yGridLines.length; i++) {
        lower = Math.max(yGridLines[i].llower - t, 0);
        upper = Math.min(yGridLines[i].uupper - t, h2 - 1);
        for (let y = lower; y <= upper; y++)
            yGridLookup[y] = true;
    }

    reduction.establish();

    reconfigureCleanUI();

    autoClean();

}

function regeneratePostCleanCanvas() {
    contexts[CANVAS.POSTCLEAN].drawImage(canvases[CANVAS.POSTCROP], 0, 0);
    contexts[CANVAS.POSTCLEAN].drawImage(maskCanvas, 0, 0);
    recomputeReduction();
}

function autoClean(e) {
    maskContext.clearRect(0,0,w2,h2);
    for (let i = 0; i < reduction.vGridLines.length; i++) {
        const lv = reduction.vGridLines[i].llower-1-reduction.vLower; // immediate left of grid line
        const uv = reduction.vGridLines[i].uupper+1-reduction.vLower; // immediate right of grid line
        let triggered = false;
        let lu; // bottom of current triggered zone
        let uu; // top of current triggered zone
        let llv; // left of current triggered zone <= lu
        let uuv; // right of current triggered zone >= uu
        for(let u = 0; u < reduction.uSize; u++) {
            if(reduction.uGridLookup[u] == true)
                continue;
            let ltrig = reduction.isBlack(u, lv);
            let utrig = reduction.isBlack(u, uv);
            if(!triggered && (ltrig || utrig)) { // starting a triggered zone
                triggered = true;
                lu = u;
                llv = lv;
                uuv = uv;
            } else if(triggered && !(ltrig || utrig)) { // closing a triggered zone
                triggered = false;
                uu = u-1;
                uSize = uu-lu+1;
                vSize = uuv-llv+1;
                if(reduction.axis)
                    maskContext.fillRect(lu, llv, uSize, vSize);
                else
                    maskContext.fillRect(llv, lu, vSize, uSize);
            }
            if(triggered) {
                let v;
                // walk towards -u until we find nonblack
                for(v = lv; v >= 0 && reduction.isBlack(u, v); v--) {} v++;
                if(v < llv) llv = v;
                // walk towards +u until we find nonblack
                for(v = uv; v < reduction.vSize && reduction.isBlack(u, v); v++) {} v--;
                if(v > uuv) uuv = v;
            }
        }
    }
    regeneratePostCleanCanvas();
}
