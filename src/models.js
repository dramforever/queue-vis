import { vec } from "./vector";
import { GAP } from "./consts";

export function getConnectorConstraints() {
    const base = {
        axis: 'x',
        gap: GAP
    };

    if (this.connector.direction == 'right')
        return [
            {
                ... base,
                left: this.link.source,
                right: this.link.target,
            }
        ];
    else /* 'left' */
        return [
            {
                ... base,
                left: this.link.target,
                right: this.link.source,
            }
        ]
}

export function getJunctionConstraints() {
    return [
        {
            axis: 'y',
            gap: GAP,
            left: this.link.source,
            right: this.link.target
        }
    ];
}

export function makeConnector(store, { source, target, direction }) {
    return store.push({
        link: {
            source, target
        },
        connector: {
            direction
        },
        getConstraints: getConnectorConstraints
    });
}

export function checkMakeConnector(store, source, target, dir) {
    return target === null
        ? null
        : makeConnector(store, {
            source, target, direction: dir
        });
}

export function makeNode(store, { label, direction, next = null, r1 = null, r2 = null }) {
    const node = store.reserve();
    const nextConn = checkMakeConnector(store, node, next, direction);
    const junction = (r1 === null && r2 === null) ? null : store.reserve();
    const r1Conn = checkMakeConnector(store, junction, r1, 'right');
    const r2Conn = checkMakeConnector(store, junction, r2, 'left');

    if (junction !== null)
        store.set(junction, {
            position: vec(600, 200),
            link: {
                source: node,
                target: junction,
                noArrow: true
            },
            junction: {
                r1: r1Conn,
                r2: r2Conn
            },
            getConstraints: getJunctionConstraints
        });

    store.set(node, {
        position: vec(600, 200),
        node: {
            label,
            next: nextConn,
            junction
        }
    });

    return node;
}

export function makeQueue(store, { l, r, s }) {
    const queue = store.reserve();
    const lConn = checkMakeConnector(store, queue, l, 'left');
    const rConn = checkMakeConnector(store, queue, r, 'right');
    const sPtr = s === null
        ? null
        : store.push({
            pointer: {
                source: queue,
                target: s
            }
        });

    store.set(queue, {
        position: vec(800, 200),
        queue: {
            l: lConn,
            r: rConn,
            s: sPtr
        }
    });

    return queue;
}

