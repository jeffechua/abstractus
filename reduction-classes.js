
class Fragment {

    get fragments() { return [this]; }

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
            for (v = top; v < Reduction.vSize && Reduction.isFreshBlack(u, v); v++) {
                area += Reduction.getTrueBlackness(u, v);
                integral += Reduction.getTrueBlackness(u, v) * v;
                Reduction.rot(u, v);
                this.size++;
            }
            const center = integral / area;
            this.data.push(center);
            const bottom = v - 1; // inclusive

            // Search for the next strip, starting at v center and working
            // up and down. Then we set top to the top of the next strip and continue
            broken = true;
            let p = Math.round(center);
            let m = p - 1;
            while (p <= bottom + 1 || m >= top - 1) {
                if (p <= bottom + 1) {
                    if (Reduction.isFreshBlack(u + 1, p)) {
                        while (Reduction.isFreshBlack(u + 1, p - 1))
                            p--; // technically this is only necessary the first iteration,
                        broken = false; // as afterwards any p hit *must* be the top.
                        top = p;
                        u++;
                        break;
                    } else {
                        p++;
                    }
                }
                if (m >= top - 1) {
                    if (Reduction.isFreshBlack(u + 1, m)) {
                        while (Reduction.isFreshBlack(u + 1, m - 1))
                            m--;
                        broken = false;
                        top = m;
                        u++;
                        break;
                    } else {
                        m--;
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
            let u1 = this.head.u + 0.5; let v1 = this.head.v + 0.5;
            let du = Math.sqrt(reduceParams.slopeProjectDisplayPx * reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu * this.head.dvdu));
            let u2 = u1 + du; let v2 = v1 + du * this.head.dvdu;
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
            reduceContext.beginPath();
            u1 = this.tail.u + 0.5; v1 = this.tail.v + 0.5;
            du = Math.sqrt(reduceParams.slopeProjectDisplayPx * reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu * this.head.dvdu));
            u2 = u1 - du; v2 = v1 - du * this.tail.dvdu;
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        reduceContext.strokeStyle = color;
        reduceContext.beginPath();
        for (let i = 0; i < this.data.length; i++) {
            const u = i + this.tail.u + 0.5;
            const v = this.data[i] + 0.5;
            if (i == 0)
                reduceContext.moveTo(Reduction.axis ? u : v, Reduction.axis ? v : u);
            else
                reduceContext.lineTo(Reduction.axis ? u : v, Reduction.axis ? v : u);
        }
        reduceContext.stroke();
        // Note that since lineTo() is apparently not inclusive, an astute viewer might notice a missing pixel at the head of a fragment.
    }

}

class Curve {

    static colors = ["red", "green", "blue", "cyan", "magenta", "orange"];
    static c = 0;

    constructor(first) {
        this.tail = first.tail;
        this.head = first.head;
        this.fragments = [];
        for(let i = 0; i < first.fragments.length; i++)
            this.fragments.push(first.fragments[i]);
        this.color = Curve.colors[Curve.c % Curve.colors.length];
        Curve.c++;
    }

    push(fragment) {
        for(let i = 0; i < fragment.fragments.length; i++)
            this.fragments.push(fragment.fragments[i]);
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

    testConnectionIsBlocked(offer) {
        const u1 = this.head.u;
        const v1 = this.head.v;
        const u2 = offer.tail.u;
        const v2 = offer.tail.v;
        for (let u = u1 + 1; u <= u2 - 1; u++) {
            const v = Math.round(v1 + (v2 - v1) * (u - u1) / (u2 - u1));
            if (!(Reduction.isBlack(u, v) || Reduction.isBlack(u, v + 1) || Reduction.isBlack(u, v - 1)))
                return false;
        }
        return true;
    }

    draw(slopes) {
        reduceContext.strokeStyle = "yellow";
        for (let i = 0; i < this.fragments.length - 1; i++) {
            const u1 = this.fragments[i].head.u + 0.5;
            const v1 = this.fragments[i].head.v + 0.5;
            const u2 = this.fragments[i + 1].tail.u + 0.5;
            const v2 = this.fragments[i + 1].tail.v + 0.5;
            reduceContext.beginPath();
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        for (let i = 0; i < this.fragments.length; i++) {
            this.fragments[i].draw(this.color, slopes);
        }
    }

}

class ExportCurve {
    constructor(curve, mode, interval) {
        this.data = [];
        this._mode = mode;
        this.mode = mode == EXPORTMODE.DEFAULT ? exportParams.defaultMode : mode;
        this._interval = interval;
        this.interval = interval == -1 ? exportParams.defaultInterval : interval;
        this.color = curve.color;
        for (let i = 0; i < curve.fragments.length; i++) {
            let last = 0;
            for (let j = 0; j < curve.fragments[i].data.length; j++) {
                switch (this.mode) {
                    case EXPORTMODE.ALL:
                        break;
                    case EXPORTMODE.FIXED_INTERVAL:
                        if (j % this.interval != 0 && j != curve.fragments[i].data.length - 1)
                            continue;
                        break;
                    case EXPORTMODE.FIXED_DISTANCE:
                        const du = j - last;
                        const dv = curve.fragments[i].data[j] - curve.fragments[i].data[last];
                        if (du * du + dv * dv < this.interval * this.interval && j != 0 && j != curve.fragments[i].data.length - 1)
                            continue;
                        last = j;
                        break;
                }
                const u = j + curve.fragments[i].tail.u;
                const v = curve.fragments[i].data[j];
                this.data.push({
                    x: Reduction.axis ? u : v,
                    y: Reduction.axis ? v : u
                });
            }
        }
    }

    generateDownloadLink() {
        let contents = "x,y";
        for (let i = 0; i < this.data.length; i++) {
            contents += "\n" + exportParams.exportX(this.data[i].x) + "," + exportParams.exportY(this.data[i].y);
        }
        return "data:text/plain;charset=utf-8," + encodeURIComponent(contents);
    }

    draw() {
        exportContext.strokeStyle = this.color;
        exportContext.fillStyle = this.color;
        exportContext.beginPath();
        exportContext.moveTo(this.data[0].x + exportDrawing.l + 0.5, this.data[0].y + exportDrawing.t + 0.5);
        if (this.mode != EXPORTMODE.ALL) exportContext.fillRect(this.data[0].x + exportDrawing.l - 1, this.data[0].y + exportDrawing.t - 1, 3, 3);
        for (let i = 1; i < this.data.length; i++) {
            exportContext.lineTo(this.data[i].x + exportDrawing.l + 0.5, this.data[i].y + exportDrawing.t + 0.5);
            if (this.mode != EXPORTMODE.ALL) exportContext.fillRect(this.data[i].x + exportDrawing.l - 1, this.data[i].y + exportDrawing.t - 1, 3, 3);
        }
        exportContext.stroke();
        return this;
    }
}