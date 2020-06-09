
function recomputeDegrid() {

    // Set up for grid removal
    contexts[CANVAS.DEGRIDDED].drawImage(canvases[CANVAS.BW], 0, 0);
    contexts[CANVAS.DEGRIDDED].fillStyle = "white";
    const deleteThreshold = 0.4;
    const cleanThreshold = 0.2;
    let deleting = false;
    let lower = 0; let upper = 0; // lower and upper bound the deleted zone.

    // Delete horizontal grid lines
    for (let x = 0; x < freqResults.xData.length; x++) {
        if (!deleting && freqResults.xData[x] > 0.4 * freqResults.xMax) { // start deleting
            deleting = true; lower = x;
            // Find lower bound of deletion zone
            while (lower > 2 && freqResults.xData[lower - 1] - freqResults.xData[lower - 2] > cleanThreshold * freqResults.xMax) {
                freqResults.xData[lower - 1] *= -1; lower--;
            } freqResults.xData[lower - 1] *= -1; lower--;
            // Mark rough bounds of the chart area
            if(l == 0) l = lower;
            r = lower;
        } else if (deleting && freqResults.xData[x] <= 0.4 * freqResults.xMax) { // stop deleting
            deleting = false; upper = x - 1;
            // Find upper bound of deletion zone
            while (upper < w - 3 && freqResults.xData[upper + 1] - freqResults.xData[upper + 2] > cleanThreshold * freqResults.xMax) {
                freqResults.xData[upper + 1] *= -1; upper++;
            } freqResults.xData[upper + 1] *= -1; upper++;
            // Delete deletion zone
            contexts[CANVAS.DEGRIDDED].fillRect(lower, 0, upper - lower + 1, h); // +1 to be inclusive
            // Skip x to upper to save time technically the variable "upper" is unnecessary, but this way is more readable
            x = upper;
        }
        if (deleting)
            freqResults.xData[upper + 1] *= -1;
    }
    if (deleting) { // Clean up loose ends
        contexts[CANVAS.DEGRIDDED].fillRect(lower, 0, w - lower, h);
    }

    // Delete vertical grid lines
    deleting = false;
    for (let y = 0; y < freqResults.yData.length; y++) {
        if (!deleting && freqResults.yData[y] > 0.4 * freqResults.yMax) { // start deleting
            deleting = true; lower = y;
            // Find lower bound of deletion zone
            while (lower > 2 && freqResults.yData[lower - 1] - freqResults.yData[lower - 2] > cleanThreshold * freqResults.yMax) {
                freqResults.yData[lower - 1] *= -1; lower--;
            } freqResults.yData[lower - 1] *= -1; lower--;
            // Mark rough bounds of the chart area
            if(b == 0) b = lower;
            t = lower;
        } else if (deleting && freqResults.yData[y] <= 0.4 * freqResults.yMax) { // stop deleting
            deleting = false; upper = y - 1;
            // Find upper bound of deletion zone
            while (upper < w - 3 && freqResults.yData[upper + 1] - freqResults.yData[upper + 2] > cleanThreshold * freqResults.yMax) {
                freqResults.yData[upper + 1] *= -1; upper++;
            } freqResults.yData[upper + 1] *= -1; upper++;
            // Delete deletion zone
            contexts[CANVAS.DEGRIDDED].fillRect(0, lower, w, upper - lower + 1); // +1 to be inclusive
            // Skip y to upper to save time technically the variable "upper" is unnecessary, but this way is more readable
            y = upper;
        }
        if (deleting)
            freqResults.yData[upper + 1] *= -1;
    }
    if (deleting) { // Clean up loose ends
        contexts[CANVAS.DEGRIDDED].fillRect(0, lower, w, h - lower);
    }

    // Find chart area bounds
    l = computeCenterOfMassOfNegativeZoneStartingFrom(l, freqResults.xData);
    r = computeCenterOfMassOfNegativeZoneStartingFrom(r, freqResults.xData);
    t = computeCenterOfMassOfNegativeZoneStartingFrom(t, freqResults.yData);
    b = computeCenterOfMassOfNegativeZoneStartingFrom(b, freqResults.yData);

    if(!degridDiv.lastElementChild)
        degridDiv.appendChild(canvases[CANVAS.DEGRIDDED]);

}

function computeCenterOfMassOfNegativeZoneStartingFrom(index, array) {
    let integral = 0;
    let area = 0;
    for(let i = index; array[i] < 0; i++) {
        integral += i * array[i];
        area += array[i];
    }
    return integral/area;
}