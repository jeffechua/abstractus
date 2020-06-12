const reduceParams = {
    maxSlopeSamplePx: 7,
    slopeProjectDisplayPx: 10,
    minFragmentSize: 7,
    maxProjectedErrorFactor: 2
}

let curves;
let fragments;

function recomputeReduction() {

    // Render cleaning results to a bitmap
    contexts[CANVAS.POSTCLEAN].drawImage(canvases[CANVAS.POSTCROP], 0, 0);
    contexts[CANVAS.POSTCLEAN].drawImage(maskCanvas, 0, 0);
    cleanedBitmap = contexts[CANVAS.POSTCLEAN].getImageData(0, 0, w2, h2).data;

    // Extract fragments from bitmap
    fragments = [];
    reduceContext.clearRect(0, 0, w2, h2);
    for (let u = 0; u < Reduction.uSize; u++) {
        for (let v = 0; v < Reduction.vSize; v++) {
            if (Reduction.isFreshBlack(u, v)) {
                let fragment = new Fragment(u, v);
                if (fragment.size >= reduceParams.minFragmentSize && fragment.head.u - fragment.tail.u > 3)
                    fragments.push(fragment);
            }
        }
    }

    let colors = ["red", "green", "blue", "cyan", "magenta", "orange"];
    let c = 0;

    // The key thing to keep in mind in understanding this process is that
    // the fragments array, by nature of its generation method, is sorted in
    // ascending order of tail.u.
    curves = [];
    while (fragments.length > 0) {
        // Get batch of seed fragments
        let seeds = [fragments[0]];
        let minHeadU = seeds[0].head.u;
        for (let i = 1; i < fragments.length && fragments[i].tail.u < minHeadU; i++) {
            seeds.push(fragments[i]);
            minHeadU = Math.min(fragments[i].head.u, minHeadU);
        }
        // These seed fragments cannot possibly connect to each other due to all of their tail.u < minHeadU
        // So we try to generate curves from all of them, starting from the largest one.
        seeds.sort((a, b) => a.size - b.size);
        while (seeds.length > 0) {
            let crv = buildCurveFromFragment(seeds.pop());
            crv.draw(colors[c % 6], false);
            c++;
            curves.push(crv);
        }
    }

    recomputeOutput();

}

function buildCurveFromFragment(fragment, color) {
    let i = fragments.findIndex((element) => element == fragment);
    let crv = new Curve(fragments[i]);
    fragments.splice(i, 1);
    while (i < fragments.length) {
        const refDistance = fragments[i].tail.u - crv.head.u;
        if (refDistance <= 0) { // move i forward until we start finding fragments that are in front of
            i++;                // instead of behind the curve
            continue;
        }
        const peValid = (v) => v / (fragments[i].tail.u - crv.head.u) < reduceParams.maxProjectedErrorFactor * 2;
        if (!peValid(crv.tryPE(fragments[i])) || !crv.testConnectionIsBlocked(fragments[i])) {
            i++;     // eliminate outright candidates with too awful PEs.
            continue;// and those with a gap that isn't masked, grid-obscured, or an ignored fragment
        }
        let candidates = [];
        let minD2v = Infinity;
        let minPE = Infinity;
        // then we pick out the set of fragments then on that are overlapping the u-range of this first valid fragment
        for (let j = i; j < fragments.length && fragments[j].tail.u <= fragments[i].head.u; j++) {
            const d2vd2u = crv.tryD2vdu2(fragments[j]);
            const pe = crv.tryPE(fragments[j]);
            if (!peValid(pe) || !crv.testConnectionIsBlocked(fragments[j])) continue; // eliminate too awful PEs and unjustified gaps
            if (d2vd2u < minD2v) minD2v = d2vd2u;
            if (pe < minPE) minPE = pe;
            candidates.push({ index: j, d2vdu2: d2vd2u, pe: pe });
        }
        // Then we find the ones with the least d2v2u (change in slope) and projection error (offset in v).
        i = candidates.reduce((f1, f2) => {
            f1Error = f1.d2vdu2 / minD2v + f1.pe / minPE;
            f2Error = f2.d2vdu2 / minD2v + f2.pe / minPE;
            return f1Error < f2Error ? f1 : f2;
        }).index;
        crv.push(fragments[i]);
        fragments.splice(i, 1);
    }
    return crv;
}

class Reduction {
    static _axis = true; // true -> reduce vertical, i.e. u = x, v = y
    static get axis() { return this._axis; }
    static set axis(axis) {
        this._axis = axis;
        if (progress >= SECTION.FINALIZE) {
            this.establish();
        }
    }
    static establish() {
        this.uGridLines = this.axis ? xGridLines : yGridLines;
        this.vGridLines = this.axis ? yGridLines : xGridLines;
        this.uGridLookup = this.axis ? xGridLookup : yGridLookup;
        this.vGridLookup = this.axis ? yGridLookup : xGridLookup;
        this.uSize = this.axis ? w2 : h2;
        this.vSize = this.axis ? h2 : w2;
        this.uLower = this.axis ? l : t;
        this.vLower = this.axis ? t : l;
        this.largeCoord = this.axis ?
            function (u, v) {
                return ((u + this.uLower) + (v + this.vLower) * w) * 4;
            } :
            function (u, v) {
                return ((v + this.vLower) + (u + this.uLower) * w) * 4;
            };
        this.smallCoord = this.axis ?
            function (u, v) {
                return (u + v * w2) * 4;
            } :
            function (u, v) {
                return (v + u * w2) * 4;
            };
    }
    static isBlack(u, v) {             // post-bwify, pre-degridding
        return bwBitmap[this.largeCoord(u, v)] == 0;
    }
    static getTrueBlackness(u, v) {    // pre-bwify blackness number
        const coord = this.largeCoord(u, v);
        return 765 - rotatedBitmap[coord] - rotatedBitmap[coord + 1] - rotatedBitmap[coord + 2];
    }
    static isFreshBlack(u, v) {        // getter for the flood-fill fragment finding algorithm
        const coord = this.smallCoord(u, v);
        return cleanedBitmap[coord] == 0;
    }
    static rot(u, v) {                 // setter for the flood-fill fragment finding algorithm
        cleanedBitmap[this.smallCoord(u, v)] = 255;
    }
}