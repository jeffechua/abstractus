let fragments;

const reduceParams = {
    maxSlopeSamplePx: 7,
    slopeProjectDisplayPx: 10,
    minFragmentSize: 7,
    maxProjectedErrorFactor: 2
}

/*
function threePointSlope(x1, y1, x2, y2, x3, y3) {
    const x = x1 - x2;
    const y = y1 - y2;
    const X = x3 - x2;
    const Y = y3 - y2;
    const m = (4 * (X * Y + x * y) - (y + Y) * (x + X)) / (4 * (x * x + X * X) - (x + X) * (x + X));
    return ((y + Y) - (x + X) * m) / 4;
}*/

class Fragment {
    constructor(u0, v0) {
        this.data = [];
        this.size = 0;

        let u = u0;
        let top = v0;
        let broken = false;
        reduceContext.beginPath();
        while (!broken) {
            // Find the center of the v-tical strip at this u. 
            let integral = 0;
            let area = 0;
            let v;
            for (v = top; v < reduction.vSize && reduction.isFreshBlack(u, v); v++) {
                area += reduction.getTrueBlackness(u, v);
                integral += reduction.getTrueBlackness(u, v) * v;
                reduction.rot(u, v);
                this.size++;
            }
            this.data.push(integral / area);
            const bottom = v;
            // Look for the strip at u+1
            broken = true;
            if (reduction.isFreshBlack(u + 1, top - 1)) {
                broken = false;
                top--;
                while (reduction.isFreshBlack(u + 1, top - 1))
                    top--;
                u++;
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
        reduceContext.stroke();

        // Compute head and tail
        let dvdu1;
        let dvdu2;
        const l = this.data.length;
        const d = Math.min(l - 1, reduceParams.maxSlopeSamplePx);
        this.tail = {
            u: u0,
            v: this.data[0],
            dvdu: (this.data[d] - this.data[0]) / d
        };
        this.head = {
            u: u,
            v: this.data[this.data.length - 1],
            dvdu: (this.data[l - 1] - this.data[l - 1 - d]) / d
        };
    }

    draw(color, slopes = false) {
        if (slopes) {
            reduceContext.strokeStyle = "magenta";
            reduceContext.beginPath();
            let u1 = this.head.u; let v1 = this.head.v;
            let du = Math.sqrt(reduceParams.slopeProjectDisplayPx*reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu*this.head.dvdu));
            let u2 = u1 + du; let v2 = v1 + du * this.head.dvdu;
            reduceContext.moveTo(reduction.axis ? u1 : v1, reduction.axis ? v1 : u1);
            reduceContext.lineTo(reduction.axis ? u2 : v2, reduction.axis ? v2 : u2);
            reduceContext.stroke();
            reduceContext.beginPath();
            u1 = this.tail.u; v1 = this.tail.v;
            du = Math.sqrt(reduceParams.slopeProjectDisplayPx*reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu*this.head.dvdu));
            u2 = u1 - du; v2 = v1 - du * this.tail.dvdu;
            reduceContext.moveTo(reduction.axis ? u1 : v1, reduction.axis ? v1 : u1);
            reduceContext.lineTo(reduction.axis ? u2 : v2, reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        reduceContext.strokeStyle = color;
        reduceContext.beginPath();
        for (let i = 0; i < this.data.length; i++) {
            const u = i + this.tail.u;
            const v = this.data[i];
            if (i == 0)
                reduceContext.moveTo(reduction.axis ? u : v, reduction.axis ? v : u);
            else
                reduceContext.lineTo(reduction.axis ? u : v, reduction.axis ? v : u);
        }
        reduceContext.stroke();
    }

}

class Curve {
    constructor(first) {
        this.tail = first.tail;
        this.head = first.head;
        this.fragments = [first];
    }

    push(fragment) {
        this.fragments.push(fragment);
        this.head = fragment.head;
    }

    tryD2vdu2(offer) {
        return (offer.tail.dvdu - this.tail.dvdu) / (offer.tail.u - this.tail.u);
    }

    tryPE(offer) {
        const uGap = offer.tail.u - this.head.u;
        const e1 = offer.tail.v - (this.head.v + this.head.dvdu * uGap);
        const e2 = this.head.v - (offer.tail.v - offer.tail.dvdu * uGap);
        return Math.abs(e1) + Math.abs(e2);
    }

    draw(color, slopes) {
        reduceContext.strokeStyle = "yellow";
        for (let i = 0; i < this.fragments.length - 1; i++) {
            const u1 = this.fragments[i].head.u;
            const v1 = this.fragments[i].head.v;
            const u2 = this.fragments[i + 1].tail.u;
            const v2 = this.fragments[i + 1].tail.v;
            reduceContext.beginPath();
            reduceContext.moveTo(reduction.axis ? u1 : v1, reduction.axis ? v1 : u1);
            reduceContext.lineTo(reduction.axis ? u2 : v2, reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        for (let i = 0; i < this.fragments.length; i++) {
            this.fragments[i].draw(color, slopes);
        }
    }

}

function recomputeReduction() {
    cleanedBitmap = contexts[CANVAS.POSTCLEAN].getImageData(0, 0, w2, h2).data;
    fragments = [];
    curves = [];

    reduceContext.clearRect(0, 0, w2, h2);
    for (let u = 0; u < reduction.uSize; u++) {
        for (let v = 0; v < reduction.vSize; v++) {
            if (reduction.isFreshBlack(u, v)) {
                let fragment = new Fragment(u, v);
                if (fragment.size >= reduceParams.minFragmentSize) // TODO: make this feed back to autoclean instead of ignoring
                    fragments.push(fragment);
            }
        }
    }

    let colors = ["red", "green", "blue", "cyan", "magenta", "orange"];
    let c = 0;

    // The key thing to keep in mind in understanding this process is that
    // the fragments array, by nature of its generation method, is sorted in
    // ascending order of tail.u. Hence, building from low-u upwards,
    // (fragments[i].tail.u - crv.head.u) is increasing with i.
    while (fragments.length > 0) {
        // Start new curve
        let crv = new Curve(fragments.shift());
        let i = 0;
        while (i < fragments.length) {
            const refDistance = fragments[i].tail.u - crv.head.u;
            if (refDistance <= 0) { // move i forward until we start finding fragments that are in front of
                i++;                // instead of behind the curve
                continue;
            }
            let candidates = [];
            let minD2v = Infinity;
            let minPE = Infinity;
            // then we pick out the set of fragments then on that are overlapping the u-range of this first valid fragment
            for (let j = i; j < fragments.length && fragments[j].tail.u <= fragments[i].head.u; j++) {
                const d2vd2u = crv.tryD2vdu2(fragments[j]);
                const pe = crv.tryPE(fragments[j]);
                if (d2vd2u < minD2v) minD2v = d2vd2u;
                if (pe < minPE) minPE = pe;
                candidates.push({ index: j, d2vdu2: d2vd2u, pe: pe });
            }
            // Then we find the ones with the least d2v2u (change in slope) and projection error (offset in v).
            let winner = candidates.reduce((f1, f2) => {
                f1Error = f1.d2vdu2 / minD2v + f1.pe / minPE;
                f2Error = f2.d2vdu2 / minD2v + f2.pe / minPE;
                return f1Error < f2Error ? f1 : f2;
            });
            i = winner.index;
            if(winner.pe / (fragments[i].tail.u-crv.head.u) > reduceParams.maxProjectedErrorFactor * 2) { // *2 since pe generation doesn't divide by two to average
                break;
            }
            crv.push(fragments[i]);
            fragments.splice(i, 1);
        }
        // Draw the curve
        crv.draw(colors[c % 6], true);
        c++;
        // Push it to the list
        curves.push(crv);
    }
    console.log(curves);
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
        this.getTrueBlackness = this.axis ? // arguments in w2, h2 space     TODO: something wrong with this? reducing centers seem to be wonky (see graph 4)
            function (u, v) {
                let coord = ((u + this.uLower) + (v + this.vLower) * w) * 4;
                return 765 - rotatedBitmap[coord] - rotatedBitmap[coord + 1] - rotatedBitmap[coord + 2];
            } :
            function (u, v) {
                let coord = ((v + this.vLower) + (u + this.uLower) * w) * 4;
                return 765 - rotatedBitmap[coord] - rotatedBitmap[coord + 1] - rotatedBitmap[coord + 2];
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