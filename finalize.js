
putAtAbsolutePosition(canvases[CANVAS.POSTCROP], sectionDivs[SECTION.FINALIZE], 0, 0, -1, -1, 1);
const frameCanvas = document.getElementById("clean-frame-canvas"); // The peripheral cosmetic frame with the axes and labels
const frameContext = frameCanvas.getContext("2d");
const maskCanvas = document.getElementById("clean-mask-canvas");   // The mask to indicate which areas have been cleaned (deleted)
const maskContext = maskCanvas.getContext("2d");
const reduceCanvas = document.getElementById("reduce-canvas");     // The layer where the computed curves are shown
const reduceContext = reduceCanvas.getContext("2d");
const cleanUICanvas = document.getElementById("clean-ui-canvas");  // The layer where the UI box for cleaning is shown
const cleanUIContext = cleanUICanvas.getContext("2d");
const curveTempCanvas = document.getElementById("curve-temp-canvas");   // The layer where real-time curve editing UI lines are drawn
const curveTempContext = curveTempCanvas.getContext("2d");
const curvePermaCanvas = document.getElementById("curve-perma-canvas"); // The layer where nodes and existing connections are shown
const curvePermaContext = curvePermaCanvas.getContext("2d");

const xMinInput = document.getElementById("x-min-input");
const xMaxInput = document.getElementById("x-max-input");
const yMinInput = document.getElementById("y-min-input");
const yMaxInput = document.getElementById("y-max-input");

cleanUICanvas.addEventListener("mousedown", cleanDrawStart);
cleanUICanvas.addEventListener("mousemove", cleanDrawMove);
cleanUICanvas.addEventListener("mouseup", cleanDrawStop);
cleanUICanvas.addEventListener("mouseleave", cleanDrawStop);

curvePermaCanvas.addEventListener("mousedown", curveMouseDown);
curvePermaCanvas.addEventListener("mousemove", curveMouseMove);
curvePermaCanvas.addEventListener("mouseup", curveMouseUp);
curvePermaCanvas.addEventListener("mouseleave", curveMouseLeave);

// Arrays over w2 and h2 respectively, 0=false where there is no gridline and 1=true where there is
let xGridLookup;
let yGridLookup;

function setupFinalize() {

    if (xGridLines.length <= 1 || yGridLines.length <= 1) {
        alert("Insufficient grid lines found to establish chart area bounds. Aborting.");
        return;
    }

    progress = SECTION.FINALIZE;

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

    Reduction.establish();

    generateFinalizeUI();

}

function generateFinalizeUI() {

    // Size our elements
    sectionDivs[SECTION.FINALIZE].style.width = w;
    sectionDivs[SECTION.FINALIZE].style.height = h;
    frameCanvas.width = w; frameCanvas.height = h;
    maskCanvas.width = w2; maskCanvas.height = h2;
    reduceCanvas.width = w2; reduceCanvas.height = h2;
    cleanUICanvas.width = w; cleanUICanvas.height = h;
    curveTempCanvas.width = w; curveTempCanvas.height = h;
    curvePermaCanvas.width = w; curvePermaCanvas.height = h;
    // Position things that require it
    maskCanvas.style.left = l; maskCanvas.style.top = t;
    reduceCanvas.style.left = l; reduceCanvas.style.top = t;
    canvases[CANVAS.POSTCROP].style.left = l;
    canvases[CANVAS.POSTCROP].style.top = t;
    reposition(xMinInput, l, t + h2 + 3, -1, -1);
    reposition(xMaxInput, l + w2, t + h2 + 3, 1, -1);
    reposition(yMinInput, l - 3, t + h2, 1, 1);
    reposition(yMaxInput, l - 3, t, 1, -1);
    // Initial draws and set up
    contexts[CANVAS.POSTCROP].drawImage(canvases[CANVAS.DEGRIDDED], l, t, w2, h2, 0, 0, w2, h2);
    frameContext.drawImage(canvases[CANVAS.ROTATED], 0, 0);
    frameContext.clearRect(l+1, t+1, w2-1, h2-1);
    maskContext.fillStyle = "white"; // This cannot be done outside since resizing a canvas clears context

    autoClean();
}

function uvSwitch(button) {
    if (button.innerText == "x") {
        button.innerText = "y";
        Reduction.axis = false;
    } else {
        button.innerText = "x";
        Reduction.axis = true;
    }
    Reduction.establish();
    autoClean();
}

const curveEditToggle = document.getElementById("curve-edit-toggle");
curveEditToggleChanged();
function curveEditToggleChanged() {
    if(curveEditToggle.checked) {
        canvases[CANVAS.POSTCROP].style.display = "none";
        curvePermaCanvas.style.display = "block";
        curveTempCanvas.style.display = "block";
    } else {
        canvases[CANVAS.POSTCROP].style.display = "block";
        curvePermaCanvas.style.display = "none";
        curveTempCanvas.style.display = "none";
    }
}