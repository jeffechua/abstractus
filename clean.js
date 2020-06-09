function resetupCleanUI () {

    for (let i = CANVAS.POSTCROP; i < CANVAS.FINAL; i++) {
        canvases.push(document.createElement("canvas"));
        canvases[i].width = w2; canvases[i].height = h2;
        contexts.push(canvases[i].getContext("2d"));
    }
    console.log(canvases);
    contexts[CANVAS.POSTCROP].drawImage(canvases[CANVAS.DEGRIDDED], l, t, w2, h2, 0, 0, w2, h2);
    contexts[CANVAS.POSTCLEAN].drawImage(canvases[CANVAS.POSTCROP], 0, 0);

    cleanUICanvas.width = w;
    cleanUICanvas.height = h;
    cleanUIContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);
    cleanUIContext.drawImage(canvases[CANVAS.POSTCLEAN], l, t);

}