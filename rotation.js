// TODO: OPTIMIZE RECOMPUTEROTATION; WE NEED TO REUSE OLD FREQUENCINGS INSTEAD OF RECALCULATING REDUNDANTLY

const freqs = {
    xData: null,
    yData: null,
    xMax: 0,
    yMax: 0
}

let angle;

function recomputeRotation() {

    progress = SECTION.ROTATION;

    angle = 0;
    let delta = 4.0;
    let iterations = 0;

    freqs.xData = new Uint16Array(w);
    freqs.yData = new Uint16Array(h);
    freqs.x = 0;
    freqs.y = 0;

    clearSection(SECTION.ROTATION);

    // Initial frequence
    let currentQuality = frequenceAtRotation(angle);
    renderWithFrequencing("0");

    // Solve for highest xMax
    while (delta > 0.05) { // i.e. 0.0625 or larger
        let pQuality = frequenceAtRotation(angle + delta);
        let mQuality = frequenceAtRotation(angle - delta);
        // the higher xMax, the higher quality, since at perfect alignment a whole grid line collapses to one pixel
        // xMax is used instead of yMax since the x-axis label creates a spike in the yFreq spectrum.
        //          P
        //      <   =   >
        //   <  R   R   +            R: refine delta
        // M =  R   R   +          -/+: increment or decrement angle
        //   <  -   -   ?            ?: the higher of P or M wins
        //
        if (pQuality <= currentQuality && mQuality <= currentQuality) { // i.e. ±delta both worsen
            delta /= 2;
        } else {
            // If our first correction is a minimal improvement, abort---most likely it was already correct.
            if (iterations == 0 && Math.max(pQuality, mQuality, currentQuality) - currentQuality < currentQuality / 100)
                break;
            angle += (pQuality > mQuality) ? delta : -delta;
            currentQuality = frequenceAtRotation(angle);
            renderWithFrequencing(angle);
            iterations++;
        }
    }

    frequenceAtRotation(angle); // in case we broke right after an mQuality evaluation.
    // This ensures global bwBitmap and freqs match the most recent render

    recomputeBwify();

}

function renderWithFrequencing() {

    const freqDispSize = 100; // the height of the xFreq display and the width of the yFreq one

    // Build HTML layout

    const displayCanvas = document.createElement("canvas");
    displayCanvas.width = w + freqDispSize; displayCanvas.height = h + freqDispSize;
    const displayContext = displayCanvas.getContext("2d");

    sectionDivs[SECTION.ROTATION].appendChild(displayCanvas);
    sectionDivs[SECTION.ROTATION].appendChild(document.createElement("br"));
    sectionDivs[SECTION.ROTATION].appendChild(document.createElement("br"));

    // Draw to image canvas, reading from the rotated canvas

    displayContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);

    // Render global freqs with global canvases[CANVAS.ROTATED]

    const xFreqDisplayBitmap = new Uint8ClampedArray(freqDispSize * w * 4);
    for (let x = 0; x < w; x++)
        for (let y = 1; y <= freqs.xData[x] * freqDispSize / freqs.xMax; y++)
            xFreqDisplayBitmap[(x + y * w) * 4 + 3] = 255;

    const yFreqDisplayBitmap = new Uint8ClampedArray(freqDispSize * h * 4);
    for (let y = 0; y < h; y++)
        for (let x = 1; x <= freqs.yData[y] * freqDispSize / freqs.yMax; x++)
            yFreqDisplayBitmap[(x + y * freqDispSize) * 4 + 3] = 255;

    textSize = parseLength(displayContext.font.split(" ")[0]);
    displayContext.putImageData(new ImageData(xFreqDisplayBitmap, w, freqDispSize), 0, h);
    displayContext.putImageData(new ImageData(yFreqDisplayBitmap, freqDispSize, h), w, 0);
    displayContext.fillText("Angle: " + ((angle > 0) ? "+" : "") + angle, w, h + textSize);
    displayContext.fillText("Quality: " + freqs.xMax, w, h + 2 * textSize);

}

function frequenceAtRotation(angle) {

    const w = canvases[CANVAS.ROTATED].width;
    const h = canvases[CANVAS.ROTATED].height;

    // Generate the rotated image
    contexts[CANVAS.ROTATED].clearRect(0, 0, w, h);
    contexts[CANVAS.ROTATED].translate(w / 2, h / 2);
    contexts[CANVAS.ROTATED].rotate(angle * Math.PI / 180);
    contexts[CANVAS.ROTATED].translate(-w / 2, -h / 2);
    contexts[CANVAS.ROTATED].drawImage(canvases[CANVAS.ORIGINAL], 0, 0);
    contexts[CANVAS.ROTATED].resetTransform();

    // Extract the rotated image data
    rotatedBitmap = contexts[CANVAS.ROTATED].getImageData(0, 0, w, h).data;

    // Frequence
    freqs.xData.fill(0);
    freqs.yData.fill(0);
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let coord = (x + y * w);
            if (rotatedBitmap[coord * 4 + 3] > bwifyParams.alphaThreshold) {
                let rgb = (1.0 - (rotatedBitmap[coord * 4] + rotatedBitmap[coord * 4 + 1] + rotatedBitmap[coord * 4 + 2]) / 256 / 3) * 5;
                freqs.xData[x] += rgb;
                freqs.yData[y] += rgb;
            }
        }
    }
    [].find
    // Compute maxes
    freqs.xMax = freqs.xData.reduce((prev, curr) => Math.max(prev, curr));
    freqs.yMax = freqs.yData.reduce((prev, curr) => Math.max(prev, curr));

    return freqs.xMax;

}