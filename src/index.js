import * as d3 from 'd3';
import * as cola from 'webcola';

import { Store } from './store';
import { View } from './view';
import { makeNode, makeQueue } from './models';

import * as algo from './algo';
import { vec } from './vector';

const d3cola = cola.d3adaptor(d3);

const dragHandler = d3.drag()
    .subject(cola.Layout.dragOrigin)
    .on("start", d => cola.Layout.dragStart(d.position))
    .on("drag", d => {
        cola.Layout.drag(d.position, d3.event);
        d3cola.resume();
    })
    .on('end', d => cola.Layout.dragEnd(d.position));

const svg = d3.select('svg');
const view = new View(svg, dragHandler);
const store = new Store();

d3cola
    .linkDistance(30)
    .handleDisconnected(false)
    .on('tick', () => view.render(store.entities));

window.onresize = () => {
    const { width, height } = svg.node().getBoundingClientRect()
    d3cola.size([ width, height ]).start();
}

window.onresize();

function arrayToList(values, direction, next = null) {
    let prevNode = next;

    function append(value) {
        prevNode = makeNode(store, {
            label: value,
            direction,
            next: prevNode
        });
    }

    for (const value of values)
        append(value);

    return prevNode;
}

const r1n = arrayToList([ 8, 9, 10, 11, 12 ], 'right');
const r2n = arrayToList([ 15, 14, 13 ], 'left');

const m = arrayToList([ 7, 6, 5 ], 'left');

const q = makeNode(store, {
    label: '4',
    direction: 'left',
    next: m,
    r1: r1n,
    r2: r2n
})

const n = arrayToList([ 3, 2, 1 ], 'left', q)

const p = arrayToList([ 16, 17, 18, 19 ], 'right')

makeQueue(store, { l: n, r: p, s: q });

view.render(store.entities)

function updateCola() {
    const colaNodes = store.entities.map(d => d.position).filter(d => d);
    const colaLinks = store.entities.filter(d => d.link).map(d => ({
        source: store.entities[d.link.source].position,
        target: store.entities[d.link.target].position
    }));

    d3cola
        .nodes(colaNodes)
        .links(colaLinks)
        .constraints([])
        .start();

    const colaConstraints = store.entities.flatMap(d => d.getConstraints ? d.getConstraints() : []).map(d => {
        if ('gap' in d)
            return {
                ... d,
                left: store.entities[d.left].position.index,
                right: store.entities[d.right].position.index,
            };
        else if (d.type == 'alignment')
            return {
                ... d,
                offsets: d.offsets.map(u => ({
                    ... u,
                    node: store.entities[u.node].position.index
                }))
            }
    });

    d3cola
        .constraints(colaConstraints)
        .start();
};

updateCola();

Object.assign(window, { store, updateCola, arrayToList, algo, vec });

const initial = store.revision();

const revs = [ ];

for (let i = 0; i < 4; i ++) {
    for (const _ of algo.stepQueue(store, 37))
        revs.push([ store.revision(), 1000 ]);
    revs.push([ store.revision(), 2000 ]);
}

store.toRevision(initial);

(async () => {
    const delay = (t) =>
        new Promise((res, _rej) => setTimeout(res, t));

    function to(rev) {
        store.toRevision(rev);
        updateCola();
    }
    while(true) {
        to(initial)
        await delay(3000);
        for (const [ rev, del ] of revs) {
            to(rev);
            await delay(del);
        }
        await delay(3000);
    }
})()
