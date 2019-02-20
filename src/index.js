import * as d3 from 'd3';
import { vec } from './vector';
import { Store } from './store';
import { View } from './view';
import * as cola from 'webcola';

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
    .handleDisconnected(false)
    .linkDistance(100)
    .on('tick', () => view.render(store.entities));

window.onresize = () => {
    const { width, height } = svg.node().getBoundingClientRect()
    d3cola.size([ width, height ]);
}

window.onresize();

const nodes = [
    store.push({
        position: vec(0, 0),
        node: {
            label: '',
            next: null,
            junction: null
        }
    })
];

const conns = [];

for (const value of [ 17, 30, 65, 92 ]) {
    const conn = store.reserve();
    const node = store.reserve();
    store.set(conn, {
        link: {
            source: node,
            target: nodes[nodes.length - 1]
        },
        connector: {
            direction: 'right'
        },
        get constraints() {
            const base = {
                axis: 'x',
                gap: 80
            };
            if (this.connector.direction == 'right')
                return [
                    {
                        ... base,
                        left: this.link.target,
                        right: this.link.source,
                    }
                ];
            else /* 'left' */
                return [
                    {
                        ... base,
                        left: this.link.source,
                        right: this.link.target,
                    }
                ]
        }
    });
    store.set(node, {
        position: vec(0, 0),
        node: {
            label: '',
            next: conn,
            junction: null
        }
    });
    conns.push(conn);
    nodes.push(node);
}

console.log(conns);
console.log(nodes);

view.render(store.entities)

const colaNodes = store.entities.map(d => d.position).filter(d => d);
const colaLinks = store.entities.filter(d => d.link).map(d => ({
    source: store.entities[d.link.source].position,
    target: store.entities[d.link.target].position
}));

const updateCola = () => {
    d3cola
        .nodes(colaNodes)
        .links(colaLinks)
        .start();

    const colaConstraints = store.entities.flatMap(d => d.constraints || []).map(d => {
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
