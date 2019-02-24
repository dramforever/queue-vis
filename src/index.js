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

const thequeue = makeQueue(store, { l: null, r: null, s: null });

view.render(store.entities)

function updateCola() {
    const colaNodes = store.entities.map(d => d.position).filter(d => d);
    const colaLinks = store.entities.filter(d => d.link).map(d => ({
        d,
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

window.g = { store, updateCola, arrayToList, algo, vec, thequeue };

updateCola();

(async function() {
    const delay = (t) => new Promise((resolve, _reject) => setTimeout(resolve, t));
    const out = { queue: thequeue, success: true };
    let count = 0;
    while (out.success) {
        const label = Math.random().toString()[2];
        const initial = store.revision(), revs = [];

        const op = store.entities[out.queue].queue.l === null || Math.random() < 0.5
            ? algo.pushReplace(store, out, out.queue, label)
            : algo.popReplace(store, out, out.queue);

        count ++;

        for (const _ of op)
            revs.push(store.revision());

        store.toRevision(initial);

        for (const rev of revs) {
            await delay(500);
            store.toRevision(rev);
            updateCola();
        }
    }
})();
