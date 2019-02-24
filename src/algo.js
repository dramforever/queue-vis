import { makeNode, makeConnector, makeQueue } from "./models";
import { GAP } from "./consts";
import { vec } from "./vector";

export function* stepJunction(store, junction) {
    const r1 = store.entities[junction].junction.r1;
    const r1Target = store.entities[r1].link.target;
    const r1Node = store.entities[r1Target].node;

    const r2 = store.entities[junction].junction.r2;
    const r2Node = r2 === null ? null : store.entities[r2].link.target;
    const r2NewNode = makeNode(store, {
        label: r1Node.label,
        direction: 'left',
        next: r2Node
    });

    if (r2 === null) {
        store.update(junction, 'junction', {
            r2: makeConnector(store, {
                source: junction,
                target: r2NewNode,
                direction: 'left'
            })
        });
    } else {
        store.update(r2, 'link', { target: r2NewNode });
    }

    yield;

    if (r1Node.next === null) {
        store.set(r1, {});
        store.update(junction, 'junction', { r1: null });
    } else {
        store.update(r1, 'link', {
            target: store.entities[r1Node.next].link.target
        });
    }

    yield;
}

export function* stepNode(store, node) {
    const snode = store.entities[node].node;
    if (snode.junction === null) return;

    if (snode.next !== null) {
        const next = store.entities[snode.next].link.target;
        yield* stepJunction(store, snode.junction);


        const newNextNode = store.reserve();

        const nextNext = store.entities[next].node.next;

        store.set(newNextNode, {
            ... store.entities[next],
            position: vec(600, 200),
            node: {
                label: store.entities[next].node.label,
                next: nextNext === null ? null : makeConnector(store, {
                    source: newNextNode,
                    target: store.entities[nextNext].link.target
                }),
                junction: snode.junction
            }
        });

        store.update(snode.next, 'link', { target: newNextNode });

        yield;

        store.update(snode.junction, 'link', { source: newNextNode });
        store.update(node, 'node', { junction: null });

        yield;
    } else {
        yield* stepJunction(store, snode.junction);
        yield* stepJunction(store, snode.junction);

        const sjunction = store.entities[snode.junction].junction;

        store.update(sjunction.r2, 'link', { source: node });
        store.update(node, 'node', { next: sjunction.r2 });

        store.set(snode.junction, {});

        yield;
    }
}

function* pre(store, queue) {
    const squeue = store.entities[queue].queue;
    if (squeue.s !== null) {
        const cur = store.entities[squeue.s].pointer.target;
        yield* stepNode(store, cur);
    }
}

function createLazy(store, x, y) {
    if (x === null) {
        return y;
    } else {
        const snode = store.entities[x].node;
        return makeNode(store, {
            label: snode.label,
            next: snode.next === null ? null : store.entities[snode.next].link.target,
            direction: 'left',
            r1: y,
            r2: null
        })
    }
}

function rebuild(store, l, r, queue) {
    const squeue = store.entities[queue].queue;
    const s0 = squeue.s === null ? null : store.entities[squeue.s].pointer.target;
    if (s0 === null) {
        const il = createLazy(store, l, r);
        return makeQueue(store, { l: il, r: null, s: il });
    } else {
        const scur = store.entities[s0].node;
        const res = makeQueue(store, {
            l, r,
            s: scur.next === null ? null : store.entities[scur.next].link.target
        });
        return res;
    }
}

export function* push(store, out, queue, label) {
    const squeue = store.entities[queue].queue;
    yield* pre(store, queue);
    const ir = makeNode(store, {
        label,
        direction: 'right',
        next: squeue.r === null ? null : store.entities[squeue.r].link.target
    });
    out.queue = rebuild(
        store,
        squeue.l === null ? null : store.entities[squeue.l].link.target,
        ir,
        queue
    );
}

export function* pop(store, out, queue) {
    const squeue = store.entities[queue].queue;
    if (squeue.l == null) {
        out.success = false;
        return;
    }
    yield* pre(store, queue);
    const snode = store.entities[store.entities[squeue.l].link.target].node;
    out.success = true;
    out.label = snode.label;
    const next = snode.next === null ? null : store.entities[snode.next].link.target;
    out.queue = rebuild(
        store,
        next,
        squeue.r === null ? null : store.entities[squeue.r].link.target,
        queue
    );
}

export function* replaceQueue(store, q0, q1) {
    store.set(q0, {
        ... store.entities[q0],
        getConstraints: () => ({
            axis: 'y',
            left: q0,
            right: q1,
            gap: GAP
        })
    });

    yield;

    const sq0 = store.entities[q0].queue;
    store.set(q0, {});
    for (const name of 'l r s'.split(' '))
        if (sq0[name] !== null) store.set(sq0[name], {});

    yield;
}

export function* pushReplace(store, out, queue, label) {
    yield* push(store, out, queue, label);
    yield* replaceQueue(store, queue, out.queue);
}

export function* popReplace(store, out, queue) {
    yield* pop(store, out, queue);
    if (out.success) yield* replaceQueue(store, queue, out.queue);
}
