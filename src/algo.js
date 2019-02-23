import { makeNode, makeConnector } from "./models";
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

export function* stepQueue(store, queue) {
    const ptr = store.entities[queue].queue.s;

    if (ptr === null) return;

    const target = store.entities[ptr].pointer.target;

    yield* stepNode(store, target);

    const starget = store.entities[target].node;
    if (starget.next === null) {
        store.update(queue, 'queue', { s: null });
        store.set(ptr, {});
    } else {
        const next = store.entities[starget.next].link.target;
        store.update(ptr, 'pointer', { target: next });
    }
    yield;
}
