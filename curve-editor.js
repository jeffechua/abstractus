let nodes = [];
let lines = [];

class Connection {
    // Note: must have i1 < i2 and x1 < x2.
    constructor(i1, i2) {
        this.i1 = i1;
        this.i2 = i2;
        this.x1 = Reduction.getX(fragments[i1].head) + l + 0.5; // these are in canvas space, hence the half-pixel
        this.y1 = Reduction.getY(fragments[i1].head) + t + 0.5;
        this.x2 = Reduction.getX(fragments[i2].tail) + l + 0.5;
        this.y2 = Reduction.getY(fragments[i2].tail) + t + 0.5;
        this.slope = (this.y2 - this.y1) / (this.x2 - this.x1);
        this.intercept = this.y1 - this.x1 * this.slope;
    }
    intersects(x1, y1, x2, y2) {
        if (Math.max(x1, x2) < Math.min(this.x1, this.x2) ||
            Math.min(x1, x2) > Math.max(this.x1, this.x2) ||
            Math.max(y1, y2) < Math.min(this.y1, this.y2) ||
            Math.min(y1, y2) > Math.max(this.y1, this.y2))
            return false;
        const slope = (y2 - y1) / (x2 - x1);
        const intercept = y1 - x1 * slope;
        const intersect_x = (this.intercept - intercept) / (slope - this.slope);
        return intersect_x < Math.min(Math.max(x1, x2), this.x2) && intersect_x > Math.max(Math.min(x1, x2), this.x1);
    }
}

const curveEditParams = {
    nodeRadius: 2.5
}

function redrawCurveEditor() {
    curvePermaContext.clearRect(0, 0, w, h);
    curveTempContext.clearRect(0, 0, w, h);
    nodes = [];
    for (let i = 0; i < fragments.length; i++) {
        // Only create nodes for connectionless fragment ends
        if (!connections.includes((connection) => connection.i1 == i)) {
            let x = Math.round(Reduction.getX(fragments[i].head) + l) + 0.5; // in canvase space, hence the +0.5
            let y = Math.round(Reduction.getY(fragments[i].head) + t) + 0.5;
            curvePermaContext.fillRect(x - curveEditParams.nodeRadius, y - curveEditParams.nodeRadius,
                curveEditParams.nodeRadius * 2, curveEditParams.nodeRadius * 2);
            if (fragments[i].head.sealed) {
                curvePermaContext.fillStyle = "white";
                curvePermaContext.fillRect(x - curveEditParams.nodeRadius + 1, y - curveEditParams.nodeRadius + 1,
                    curveEditParams.nodeRadius * 2 - 2, curveEditParams.nodeRadius * 2 - 2);
                curvePermaContext.fillStyle = "black";
            }
            nodes.push({ x: x, y: y, i: i, isHead: true });
        }
        if (!connections.includes((connection) => connection.i2 == i)) {
            let x = Math.round(Reduction.getX(fragments[i].tail) + l) + 0.5;
            let y = Math.round(Reduction.getY(fragments[i].tail) + t) + 0.5;
            curvePermaContext.fillRect(x - curveEditParams.nodeRadius, y - curveEditParams.nodeRadius,
                curveEditParams.nodeRadius * 2, curveEditParams.nodeRadius * 2);
            if (fragments[i].tail.sealed) {
                curvePermaContext.fillStyle = "white";
                curvePermaContext.fillRect(x - curveEditParams.nodeRadius + 1, y - curveEditParams.nodeRadius + 1,
                    curveEditParams.nodeRadius * 2 - 2, curveEditParams.nodeRadius * 2 - 2);
                curvePermaContext.fillStyle = "black";
            }
            nodes.push({ x: x, y: y, i: i, isHead: false });
        }
    }
    curvePermaContext.beginPath();
    for (let i = 0; i < connections.length; i++) {
        curvePermaContext.moveTo(connections[i].x1, connections[i].y1);
        curvePermaContext.lineTo(connections[i].x2, connections[i].y2);
    }
    curvePermaContext.stroke();
    recomputeExport();
}

function curveMouseDown(e) {
    curveUIState.x = e.offsetX;
    curveUIState.y = e.offsetY;
    const hitNode = nodes.find((node) =>
        Math.abs(node.x - curveUIState.x) <= curveEditParams.nodeRadius &&
        Math.abs(node.y - curveUIState.y) <= curveEditParams.nodeRadius
    )
    if (hitNode == undefined) {
        curveUIState.state = CURVEUISTATE.CUTTING;
        curveTempContext.strokeStyle = "red";
    } else {
        curveUIState.state = CURVEUISTATE.CONNECTING;
        curveUIState.selectedNode = hitNode;
        curveTempContext.strokeStyle = "black";
    };
}
function curveMouseMove(e) {
    curveTempContext.clearRect(0, 0, w, h);
    let hitNode = nodes.find((node) =>
        Math.abs(node.x - e.offsetX) <= curveEditParams.nodeRadius &&
        Math.abs(node.y - e.offsetY) <= curveEditParams.nodeRadius
    );
    switch (curveUIState.state) {
        case CURVEUISTATE.CUTTING:
            curveTempContext.lineWidth = 1.0;
            curveTempContext.beginPath();
            curveTempContext.moveTo(curveUIState.x, curveUIState.y);
            curveTempContext.lineTo(e.offsetX, e.offsetY);
            curveTempContext.stroke();
            curveUIState.intercepting = connections.filter(
                (connection) => connection.intersects(curveUIState.x, curveUIState.y, e.offsetX, e.offsetY));
            curveTempContext.lineWidth = 2.0;
            curveTempContext.beginPath();
            for (let i = 0; i < curveUIState.intercepting.length; i++) {
                curveTempContext.moveTo(curveUIState.intercepting[i].x1, curveUIState.intercepting[i].y1);
                curveTempContext.lineTo(curveUIState.intercepting[i].x2, curveUIState.intercepting[i].y2);
            }
            curveTempContext.stroke();
            break;
        case CURVEUISTATE.CONNECTING:
            curveTempContext.fillRect(
                curveUIState.selectedNode.x - curveEditParams.nodeRadius - 1,
                curveUIState.selectedNode.y - curveEditParams.nodeRadius - 1,
                curveEditParams.nodeRadius * 2 + 2, curveEditParams.nodeRadius * 2 + 2
            );
            if (hitNode != undefined &&
                ((hitNode.isHead == curveUIState.selectedNode.isHead) ||
                    (curveUIState.selectedNode.isHead != (hitNode.x > curveUIState.selectedNode.x)))) {
                hitNode = undefined;
            }
            curveUIState.targetNode = hitNode;
            if (curveUIState.targetNode == undefined) {
                curveTempContext.lineWidth = 1.0;
                curveTempContext.beginPath();
                curveTempContext.moveTo(curveUIState.selectedNode.x, curveUIState.selectedNode.y);
                curveTempContext.lineTo(e.offsetX, e.offsetY);
                curveTempContext.stroke();
            } else {
                curveTempContext.lineWidth = 2.0;
                curveTempContext.beginPath();
                curveTempContext.moveTo(curveUIState.selectedNode.x, curveUIState.selectedNode.y);
                curveTempContext.lineTo(curveUIState.targetNode.x, curveUIState.targetNode.y);
                curveTempContext.stroke();
            };
        // fall through to CURVREUISTATE.NONE for selectedNode highlighting
        case CURVEUISTATE.NONE:
            if (hitNode != undefined)
                curveTempContext.fillRect(
                    hitNode.x - curveEditParams.nodeRadius - 1,
                    hitNode.y - curveEditParams.nodeRadius - 1,
                    curveEditParams.nodeRadius * 2 + 2, curveEditParams.nodeRadius * 2 + 2
                );
            break;
    }
}

function curveMouseUp(e) {
    if (curveUIState.state == CURVEUISTATE.CUTTING && curveUIState.intercepting.length > 0) {
        connections = connections.filter((connection) => !curveUIState.intercepting.includes(connection));
        rebuildCurves();
    } else if (curveUIState.state == CURVEUISTATE.CONNECTING && curveUIState.targetNode != undefined) {
        const head = curveUIState.selectedNode.isHead ? curveUIState.selectedNode : curveUIState.targetNode;
        const tail = curveUIState.selectedNode.isHead ? curveUIState.targetNode : curveUIState.selectedNode;
        connections = connections.filter((connection) => connection.i1 != head.i && connection.i2 != tail.i);
        connections.push(new Connection(head.i, tail.i));
        rebuildCurves();
    }
    curveUIState.flush();
}

function curveMouseLeave(e) {
    curveTempContext.clearRect(0, 0, w, h);
    curveUIState.flush();
}

function curveDoubleClick(e) {
    let hitNode = nodes.find((node) =>
        Math.abs(node.x - e.offsetX) <= curveEditParams.nodeRadius &&
        Math.abs(node.y - e.offsetY) <= curveEditParams.nodeRadius
    );
    if (hitNode != undefined) {
        if (hitNode.isHead)
            fragments[hitNode.i].head.sealed = !fragments[hitNode.i].head.sealed;
        else
            fragments[hitNode.i].tail.sealed = !fragments[hitNode.i].tail.sealed;
        rebuildCurves();
    }
}

document.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
        curveTempContext.clearRect(0, 0, w, h);
        curveUIState.flush();
    }
})

const CURVEUISTATE = {
    NONE: 0,
    CUTTING: 1,
    CONNECTING: 2
}

const curveUIState = {
    x: 0,
    y: 0,
    state: CURVEUISTATE.NONE,
    selectedNode: 0,
    targetNode: 0,
    intercepting: [],
    flush: function () {
        this.selectedNode = undefined;
        this.targetNode = undefined;
        this.state = CURVEUISTATE.NONE;
        this.intercepting = [];
    }
}
