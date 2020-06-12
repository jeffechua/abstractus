
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
            while (p <= bottom + 1 && m >= top - 1) {
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
            let u1 = this.head.u; let v1 = this.head.v;
            let du = Math.sqrt(reduceParams.slopeProjectDisplayPx * reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu * this.head.dvdu));
            let u2 = u1 + du; let v2 = v1 + du * this.head.dvdu;
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
            reduceContext.beginPath();
            u1 = this.tail.u; v1 = this.tail.v;
            du = Math.sqrt(reduceParams.slopeProjectDisplayPx * reduceParams.slopeProjectDisplayPx / (1 + this.head.dvdu * this.head.dvdu));
            u2 = u1 - du; v2 = v1 - du * this.tail.dvdu;
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        reduceContext.strokeStyle = color;
        reduceContext.beginPath();
        for (let i = 0; i < this.data.length; i++) {
            const u = i + this.tail.u;
            const v = this.data[i];
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

    testConnectionIsBlocked(offer) {
        const u1 = this.head.u;
        const v1 = this.head.v;
        const u2 = offer.tail.u;
        const v2 = offer.tail.v;
        for(let u = u1+1; u<=u2-1; u++){
            const v = Math.round(v1 + (v2-v1) * (u-u1) / (u2-u1));
            if(!Reduction.isBlack(u,v))
                return false;
        }
        return true;
    }

    draw(color, slopes) {
        reduceContext.strokeStyle = "yellow";
        for (let i = 0; i < this.fragments.length - 1; i++) {
            const u1 = this.fragments[i].head.u;
            const v1 = this.fragments[i].head.v;
            const u2 = this.fragments[i + 1].tail.u;
            const v2 = this.fragments[i + 1].tail.v;
            reduceContext.beginPath();
            reduceContext.moveTo(Reduction.axis ? u1 : v1, Reduction.axis ? v1 : u1);
            reduceContext.lineTo(Reduction.axis ? u2 : v2, Reduction.axis ? v2 : u2);
            reduceContext.stroke();
        }
        for (let i = 0; i < this.fragments.length; i++) {
            this.fragments[i].draw(color, slopes);
        }
    }

}