function resetupCleanUI () {

    // Find chart area bounds
    let activeX = xGridLines.filter((element)=>element.active);
    l = activeX[0].center;
    r = activeX[activeX.length - 1].center;
    let activeY = yGridLines.filter((element)=>element.active);
    t = activeY[0].center;
    b = activeY[activeY.length - 1].center;
    w2 = r - l;
    h2 = b - t; // note that this means the chart area is exclusive of r and t.

    progress = SECTION.CLEAN;

    let dispCanvas = document.createElement("canvas");
    dispCanvas.width = w; dispCanvas.height = h;
    let dispContext = dispCanvas.getContext("2d");

    for (let i = CANVAS.POSTCROP; i < CANVAS.FINAL; i++) {
        canvases.push(document.createElement("canvas"));
        canvases[i].width = w2; canvases[i].height = h2;
        contexts.push(canvases[i].getContext("2d"));
    }
    contexts[CANVAS.POSTCROP].drawImage(canvases[CANVAS.DEGRIDDED], l, t, w2, h2, 0, 0, w2, h2);
    contexts[CANVAS.POSTCLEAN].drawImage(canvases[CANVAS.POSTCROP], 0, 0);

    dispContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);
    dispContext.clearRect(l,t,w2,h2);
    dispContext.drawImage(canvases[CANVAS.POSTCLEAN], l, t);

    clearSection(SECTION.CLEAN);
    sectionDivs[SECTION.CLEAN].appendChild(dispCanvas);

}