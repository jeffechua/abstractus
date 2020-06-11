const defaultBwifyParams = {
    alphaThreshold: 200,     // alpha > 200
    intensityThreshold: 0.7  // r+g+b < 500
}

const bwifyParams = {
    alphaThreshold: 200,     // alpha > 200
    intensityThreshold: 0.7  // r+g+b < 500
}

const bwifyDisplayCanvas = document.getElementById("bwify-canvas");
const bwifyDisplayContext = bwifyDisplayCanvas.getContext("2d");

function recomputeBwify() {

    progress = SECTION.BWIFY;

    bwBitmap = new Uint8ClampedArray(w * h * 4);

    // Calculate bwBitmap from rotatedBitmap
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let coord = (x + y * w);
            let a = rotatedBitmap[coord * 4 + 3];
            let rgb = rotatedBitmap[coord * 4] + rotatedBitmap[coord * 4 + 1] + rotatedBitmap[coord * 4 + 2];
            let out = (a < bwifyParams.alphaThreshold || rgb > bwifyParams.intensityThreshold * 256 * 3) * 255;
            bwBitmap[coord * 4] = out;
            bwBitmap[coord * 4 + 1] = out;
            bwBitmap[coord * 4 + 2] = out;
            bwBitmap[coord * 4 + 3] = 255;
        }
    }

    // Write bwBitmap to bw canvas
    contexts[CANVAS.BW].putImageData(new ImageData(bwBitmap, w, h), 0, 0);


    bwifyDisplayCanvas.width = w; bwifyDisplayCanvas.height = h;
    bwifyDisplayContext.drawImage(canvases[CANVAS.BW], 0, 0);

    recomputeDegrid();

}

// UI interface to set bwify params
const bwifySlider = document.getElementById("bwify-thresh-slider");
const bwifyNumber = document.getElementById("bwify-thresh-number");
bwifySlider.value = bwifyParams.intensityThreshold;
bwifyNumber.value = bwifyParams.intensityThreshold;
function setBwifyIntensityThreshold(value) {
    bwifyParams.intensityThreshold = value;
    bwifySlider.value = value;
    bwifyNumber.value = value;
    if (progress >= SECTION.BWIFY)
        recomputeBwify();
}