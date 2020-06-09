
function recomputeRotation() {
    angle = 0.0;
    delta = 4.0;
    let currentFreqs = frequenceAtRotation(angle);
    renderWithFrequencing("0");
    while (delta > 0.05) { // i.e. 0.0625 or larger
        let pFreqs = frequenceAtRotation(angle + delta);
        let mFreqs = frequenceAtRotation(angle - delta);
        // the higher xMax, the higher quality, since at perfect alignment a whole grid line collapses to one pixel
        // xMax is used instead of yMax since the x-axis label creates a spike in the yFreq spectrum.
        //          P
        //      <   =   >
        //   <  R   R   +            R: refine delta
        // M =  R   R   +          -/+: increment or decrement angle
        //   <  -   -   ?            ?: the higher of P or M wins
        //
        if (pFreqs <= currentFreqs && mFreqs <= currentFreqs) { // i.e. ±delta both worsen
            delta /= 2;
        } else {
            angle += (pFreqs > mFreqs) ? delta : -delta;
            currentFreqs = frequenceAtRotation(angle);
            renderWithFrequencing(angle);
        }
    }
    frequenceAtRotation(angle); // in case we broke right after an mFreqs evaluation.
    // This ensures global bwBitmap and freqResults match the most recent render

    // Write black and white image
    contexts[CANVAS.BW].putImageData(new ImageData(bwBitmap, w, h), 0, 0);

    recomputeDegrid();

}


function renderWithFrequencing(text) {

    const w = canvases[CANVAS.ROTATED].width;
    const h = canvases[CANVAS.ROTATED].height;
    const freqDispSize = 100; // the height of the xFreq display and the width of the yFreq one

    // Build HTML layout

    const displayCanvas = document.createElement("canvas"); displayCanvas.width = w + 150; displayCanvas.height = h + 150;
    const xFreqCanvas = document.createElement("canvas"); xFreqCanvas.width = w; xFreqCanvas.height = freqDispSize;
    const yFreqCanvas = document.createElement("canvas"); yFreqCanvas.width = freqDispSize; yFreqCanvas.height = h;

    const displayContext = displayCanvas.getContext("2d");
    const xFreqContext = xFreqCanvas.getContext("2d");
    const yFreqContext = yFreqCanvas.getContext("2d");


    while (rotationIterationsDiv.lastElementChild)
        rotationIterationsDiv.removeChild(rotationIterationsDiv.lastElementChild);
    rotationIterationsDiv.innerText = "";

    rotationIterationsDiv.appendChild(displayCanvas);
    rotationIterationsDiv.appendChild(document.createTextNode("  " + text + ", " + freqResults.xMax));
    rotationIterationsDiv.appendChild(document.createElement("br"));
    rotationIterationsDiv.appendChild(document.createElement("br"));

    // Draw to image canvas, reading from the rotated canvas

    displayContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);

    // Render global freqResults with global canvases[CANVAS.ROTATED]

    let xFreqRenderData = new Uint8ClampedArray(freqDispSize * w * 4);
    for (let x = 0; x < w; x++)
        for (let y = 1; y <= freqResults.xData[x] * freqDispSize / freqResults.xMax; y++)
            xFreqRenderData[(x + y * w) * 4 + 3] = 255;

    let yFreqRenderData = new Uint8ClampedArray(freqDispSize * h * 4);
    for (let y = 0; y < h; y++)
        for (let x = 1; x <= freqResults.yData[y] * freqDispSize / freqResults.yMax; x++)
            yFreqRenderData[(x + y * freqDispSize) * 4 + 3] = 255;

    xFreqContext.putImageData(new ImageData(xFreqRenderData, w, freqDispSize), 0, 0);
    yFreqContext.putImageData(new ImageData(yFreqRenderData, freqDispSize, h), 0, 0);
    displayContext.drawImage(xFreqCanvas, 0, h);
    displayContext.drawImage(yFreqCanvas, w, 0);

}

function frequenceAtRotation(angle) {

    const w = canvases[CANVAS.ROTATED].width;
    const h = canvases[CANVAS.ROTATED].height;

    // Generate the rotated image
    contexts[CANVAS.ROTATED].clearRect(0, 0, w, h);
    contexts[CANVAS.ROTATED].resetTransform();
    contexts[CANVAS.ROTATED].translate(w / 2, h / 2);
    contexts[CANVAS.ROTATED].rotate(angle * Math.PI / 180);
    contexts[CANVAS.ROTATED].translate(-w / 2, -h / 2);
    contexts[CANVAS.ROTATED].drawImage(canvases[CANVAS.ORIGINAL], 0, 0);
    contexts[CANVAS.ROTATED].resetTransform();

    // Extract the rotated image data
    const sourceData = contexts[CANVAS.ROTATED].getImageData(0, 0, w, h).data;

    // Compute bwBitmap (black and white bitmap) from rotated image data, and frequence
    freqResults.xData.fill(0);
    freqResults.yData.fill(0);
    const alphaThreshold = 200;     // alpha > 200
    const intensityThreshold = 500; // r+g+b < 500; these are the thresholds to consider a pixel black
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            coord = (x + y * w);
            if ((sourceData[coord * 4 + 3] > alphaThreshold) && ((sourceData[coord * 4] + sourceData[coord * 4 + 1] + sourceData[coord * 4 + 2]) < intensityThreshold)) {
                bwBitmap[coord * 4] = 0;
                bwBitmap[coord * 4 + 1] = 0;
                bwBitmap[coord * 4 + 2] = 0;
                bwBitmap[coord * 4 + 3] = 255;
                freqResults.xData[x] += 1;
                freqResults.yData[y] += 1;
            } else {
                bwBitmap[coord * 4] = 255;
                bwBitmap[coord * 4 + 1] = 255;
                bwBitmap[coord * 4 + 2] = 255;
                bwBitmap[coord * 4 + 3] = 255;
            }
        }
    }

    // Compute maxes
    freqResults.xMax = freqResults.xData.reduce((prev, curr) => Math.max(prev, curr));
    freqResults.yMax = freqResults.yData.reduce((prev, curr) => Math.max(prev, curr));

    return freqResults.xMax;

}