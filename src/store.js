export class Store {
    constructor() {
        this.entities = [];
        this.doneOps = [];
        this.revTodoOps = [];
    }

    revision() {
        return this.doneOps.length;
    }

    toRevision(r) {
        if (r < 0 || r > this.doneOps.length + this.revTodoOps.length)
            throw `Revision ${r} does not exist`;
        while (this.revision() < r) this.forwardStep();
        while (this.revision() > r) this.rewindStep();
    }

    last() {
        return this.revTodoOps.length == 0;
    }

    checkLast() {
        if (!this.last())
            throw 'Cannot perform operation at non-last state';
    }

    reserve() {
        this.checkLast();
        const ix = this.entities.length;
        this.revTodoOps.push({
            todo: 'reserve'
        });
        this.forwardStep();
        return ix;
    }

    set(index, to) {
        this.checkLast();
        to = { ... to, id: index };
        this.revTodoOps.push({
            todo: 'set',
            index, to
        });
        this.forwardStep();
    }

    push(value) {
        const ix = this.reserve();
        this.set(ix, value);
        return ix;
    }

    rewindStep() {
        if (this.doneOps.length < 1)
            throw 'No more operations to rewind';

        const op = this.doneOps.pop();
        if (op.done == 'set') {
            this.revTodoOps.push({
                todo: 'set',
                index: op.index,
                to: this.entities[op.index]
            });
            this.entities[op.index] = op.was;
        } else if (op.done == 'reserve') {
            this.entities.pop();
            this.revTodoOps.push({
                todo: 'reserve'
            });
        } else {
            throw 'Unknown operation type';
        }
    }

    forwardStep() {
        if (this.revTodoOps.length < 1)
            throw 'No more operations to forward';

        const op = this.revTodoOps.pop();
        if (op.todo == 'set') {
            this.doneOps.push({
                done: 'set',
                index: op.index,
                was: this.entities[op.index]
            });
            this.entities[op.index] = op.to;
        } else if (op.todo == 'reserve') {
            this.doneOps.push({
                done: 'reserve'
            });
            this.entities.push(undefined);
        } else {
            throw 'Unknown operation type';
        }
    }
}
