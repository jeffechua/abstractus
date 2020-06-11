let fragments;

class Fragment {
    constructor(u0, v0) {
        this.first = u0;
        this.data = [];

        let u = u0;
        let top = v0;
        let broken = false;
        while (!broken) {
            // Find the center of the v-tical strip at this u. 
            let integral = 0;
            let area = 0;
            let v;
            for (v = top; v < reduction.vSize && reduction.isFreshBlack(u, v); v++) {
                area += reduction.getTrueBlackness(u, v);
                integral += reduction.getTrueBlackness(u, v) * v;
                reduction.rot(u, v);
            }
            this.data.push(integral / area);
            let bottom = v;
            reduceContext.fillRect(u, top, 1, bottom - top);
            // Look for the strip at u+1
            broken = true;
            if (reduction.isFreshBlack(u + 1, top - 1)) {
                broken = false;
                top--;
                while(reduction.isFreshBlack(u+1, top-1))
                    top--;
            } else {
                for (v = top - 1; v <= bottom; v++) {
                    if (reduction.isFreshBlack(u + 1, v)) {
                        top = v;
                        u++;
                        broken = false;
                        break;
                    }
                }
            }
            // if no next strip was found, the while loop breaks.
        }

        this.last = u; // so Fragment.last is inclusive
    }

}


function recomputeReduction() {
    cleanedBitmap = contexts[CANVAS.POSTCLEAN].getImageData(0, 0, w2, h2).data;
    fragments = [];

    let colors = ["red", "blue", "green"];
    let i = 0;

    reduceContext.clearRect(0,0,w2,h2);
    for (let u = 0; u < reduction.uSize; u++) {
        for (let v = 0; v < reduction.vSize; v++) {
            if (reduction.isFreshBlack(u, v)) {
                reduceContext.fillStyle = colors[i % 3];
                fragments.push(new Fragment(u, v));
                i++;
            }
        }
    }
}

const reduction = {
    _axis: true, // true -> reduce vertical, i.e. u = x, v = y
    get axis() { return this._axis; },
    set axis(axis) {
        this._axis = axis;
        if (progress >= SECTION.CLEAN) {
            this.establish();
        }
    },
    establish: function () {
        this.uGridLines = this.axis ? xGridLines : yGridLines;
        this.vGridLines = this.axis ? yGridLines : xGridLines;
        this.uGridLookup = this.axis ? xGridLookup : yGridLookup;
        this.vGridLookup = this.axis ? yGridLookup : xGridLookup;
        this.uSize = this.axis ? w2 : h2;
        this.vSize = this.axis ? h2 : w2;
        this.uLower = this.axis ? l : t;
        this.vLower = this.axis ? t : l;
        this.isBlack = this.axis ?  // arguments in w2, h2 space
            function (u, v) {
                return bwBitmap[((u + this.uLower) + (v + this.vLower) * w) * 4] == 0;
            } :
            function (u, v) {
                return bwBitmap[((v + this.vLower) + (u + this.uLower) * w) * 4] == 0;
            };
        this.isFreshBlack = this.axis ? // note that this requires an alpha test but not isBlack
            function (u, v) {           // since degridding uses clearRect to show the whitened veiw behind
                return cleanedBitmap[(u + v * w2) * 4 + 3] != 0 && cleanedBitmap[(u + v * w2) * 4] == 0;
            } :
            function (u, v) {
                return cleanedBitmap[(u + v * w2) * 4 + 3] != 0 & cleanedBitmap[(v + u * w2) * 4] == 0;
            };
        this.getTrueBlackness = this.axis ? // arguments in w2, h2 space
            function (u, v) {
                let coord = ((u + this.uLower) + (v + this.vLower) * w) * 4;
                return rotatedBitmap[coord] + rotatedBitmap[coord + 1] + rotatedBitmap[coord + 2];
            } :
            function (u, v) {
                let coord = ((v + this.vLower) + (u + this.uLower) * w) * 4;
                return rotatedBitmap[coord] + rotatedBitmap[coord + 1] + rotatedBitmap[coord + 2];
            };
        this.rot = this.axis ?      // arguments in w2, h2 space
            function (u, v) {
                cleanedBitmap[(u + v * w2) * 4] = 255;
            } :
            function (u, v) {
                cleanedBitmap[(v + u * w2) * 4] = 255;
            };
    }
}