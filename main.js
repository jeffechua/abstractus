const sourceSelector = document.getElementById("source-selector");

// UI stuff

const SECTION = {
    ROTATION: 0,
    BWIFY: 1,
    DEGRID: 2,
    FINALIZE: 3
}
const sectionNames = [
    "rotation",
    "bwify",
    "degrid",
    "finalize"
]
const sectionToggles = [];
const sectionDivs = [];
for (let i = 0; i < sectionNames.length; i++) {
    sectionToggles.push(document.getElementById(sectionNames[i] + "-toggle"));
    sectionDivs.push(document.getElementById(sectionNames[i] + "-div"));
}

function toggleSection(i) {
    if (sectionToggles[i].innerText == "Show") {
        sectionDivs[i].style.display = "block";
        sectionToggles[i].innerText = "Hide";
    } else {
        sectionDivs[i].style.display = "none";
        sectionToggles[i].innerText = "Show";
    }
}

function clearSection(i) {
    while (sectionDivs[i].lastElementChild)
        sectionDivs[i].removeChild(sectionDivs[i].lastElementChild);
    sectionDivs[i].innerText = "";
}

// Processing stuff

const CANVAS = {
    ORIGINAL: 0,
    ROTATED: 1,
    BW: 2,
    DEGRIDDED: 3,
    POSTCROP: 4,
    POSTCLEAN: 5,
    FINAL: 6
}
let canvases = []; // array over CANVAS.
let contexts = [];
for (let i = 0; i < CANVAS.FINAL; i++) {
    canvases.push(document.createElement("canvas"));
    contexts.push(canvases[i].getContext("2d"));
}

let w; let h; // width and height of image
let w2; let wh; // width and height of chart area
let l = 0; let r = 0; let t = 0; let b = 0; // bounds of *chart area*

let rotatedBitmap; // bitmap data of canvases[CANVAS.ROTATED]
let bwBitmap;      // bitmap data of canvases[CANVAS.BW]
let cleanedBitmap; // bitmap data of canvases[CANVAS.POSTCLEAN], but note this is processed DESTRUCTIVELY in the same function call it is created.

let progress = -1;

function onSourceChanged() {

    if (sourceSelector.files.length == 0)
        return;

    const promise = createImageBitmap(sourceSelector.files[0]);
    promise.then(processBitmap, (reason) => alert("Image could not be loaded:" + reason));

}

function processBitmap(bitmap) {

    w = bitmap.width;
    h = bitmap.height;

    for (let i = 0; i < CANVAS.POSTCROP; i++) {
        canvases[i].width = w; canvases[i].height = h;
    }

    contexts[CANVAS.ORIGINAL].drawImage(bitmap, 0, 0);
    bitmap.close();

    // Begin recomputation cascade
    recomputeRotation();

}

function parseLength(text) {
    return parseInt(text.substr(0, text.length - 2));
}

// anchor: -1 = left, 0 = center, 1 = right
// radius is half the width given for the element to center itself in for the centering trick.
function putAtAbsolutePosition(element, container, x, y, xAnchor, yAnchor, z = -1, radius = 100) {
    container.appendChild(element);
    element.style.position = "absolute";
    reposition(element, x, y, xAnchor, yAnchor, z, radius);
}

function reposition(element, x, y, xAnchor, yAnchor, z = -1, radius = 100) {
    const container = element.parentElement;
    switch (xAnchor) {
        case -1:
            element.style.left = x + "px";
            break;
        case 0:
            element.style.left = (x - radius) + "px";
            element.style.right = (parseLength(container.style.width) - (x + radius)) + "px";
            element.style.marginLeft = "auto";
            element.style.marginRight = "auto";
            break;
        case 1:
            element.style.right = (parseLength(container.style.width) - x) + "px";
    }

    switch (yAnchor) {
        case -1:
            element.style.top = y + "px";
            break;
        case 0:
            element.style.top = (y - radius) + "px";
            element.style.bottom = (parseLength(container.style.height) - (y + radius)) + "px";
            element.style.marginTop = "auto";
            element.style.marginBottom = "auto";
            break;
        case 1:
            element.style.bottom = (parseLength(container.style.height) - y) + "px";
    }
    if (z != -1)
        element.style.zIndex = z;
}