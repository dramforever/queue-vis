export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `${this.x}, ${this.y}`;
    }

    mulx(n) {
        return vec(this.x * n, this.y);
    }

    muly(n) {
        return vec(this.x, this.y * n);
    }

    muln(n) {
        return vec(this.x * n, this.y * n);
    }

    neg() {
        return this.muln(-1);
    }

    add(that) {
        return vec(this.x + that.x, this.y + that.y);
    }

    sub(that) {
        return vec(this.x - that.x, this.y - that.y);
    }

    dot(that) {
        return this.x * that.x + this.y * that.y;
    }

    norm() {
        return this.dot(this);
    }

    len() {
        return Math.sqrt(this.norm());
    }

    rot(th) {
        const c = Math.cos(th), s = Math.sin(th);
        return vec(
            c * this.x - s * this.y,
            s * this.x + c * this.y
        );
    }
}

export const vec = (x, y) => new Vector(x, y);
