import * as d3 from 'd3';

import { RADIUS, HEADROOM, GAP } from "./consts";
import { vec } from './vector';

function chop(v0, v1) {
    const distance = 1.5 * RADIUS;
    const vec = v1.sub(v0), len = vec.len();
    return (len < 2 * distance
        ? null
        : {
            p0: v0.add(vec.muln(distance / len)),
            p1: v1.sub(vec.muln(distance / len)),
            arrowHead: len > 2 * distance + HEADROOM
        });
}

export class View {
    constructor(svg, dragHandler) {
        this.svg = svg;
        this.dragHandler = dragHandler;
        this.dNodeLabels = svg.append('g').selectAll('.node-label');
        this.dNodeBorders = svg.append('g').selectAll('.node-border');
        this.dLinks = svg.append('g').selectAll('.link');
        this.dJunctions = svg.append('g').selectAll('.junction');
        this.dQueues = svg.append('g').selectAll('.queue');
        this.dPointers = svg.append('g').selectAll('.pointer');
    }

    render(entities) {
        this.renderNodes(entities);
        this.renderLinks(entities);
        this.renderJunctions(entities);
        this.renderQueues(entities);
        this.renderPointers(entities);
    }


    renderNodes(entities) {
        const nodes = entities.filter(d => d.node);

        this.dNodeLabels = this.dNodeLabels.data(nodes, d => d.id);
        this.dNodeLabels.exit().remove();
        this.dNodeLabels = this.dNodeLabels
            .enter().append('text').attr('class', 'node-label')
            .merge(this.dNodeLabels)
            .text(d => d.node.label)
            .attr('x', d => d.position.x)
            .attr('y', d => d.position.y);

        this.dNodeBorders = this.dNodeBorders.data(nodes, d => d.id);
        this.dNodeBorders.exit().remove();
        this.dNodeBorders = this.dNodeBorders
            .enter().append('rect').attr('class', 'node-border')
            .call(this.dragHandler)
            .attr('width', 2 * RADIUS)
            .attr('height', 2 * RADIUS)
            .merge(this.dNodeBorders)
            .attr('x', d => d.position.x - RADIUS)
            .attr('y', d => d.position.y - RADIUS);

    }

    renderLinks(entities) {
        const links = entities.filter(d => d.link)
            .map(d => ({
                ... d,
                linkVis: chop(
                    entities[d.link.source].position,
                    entities[d.link.target].position
                )
            }))
            .filter(d => d.linkVis);

        this.dLinks = this.dLinks.data(links, d => d.id);

        this.dLinks.exit().remove();
        this.dLinks = this.dLinks
            .enter().append('path').attr('class', 'link')
            .merge(this.dLinks)
            .classed('link-arrow-head', d => ! d.link.noArrow && d.linkVis.arrowHead)
            .attr('d', d => `M ${d.linkVis.p0} L ${d.linkVis.p1}`)
    }

    renderJunctions(entities) {
        const junctions = entities.filter(d => d.junction);

        this.dJunctions = this.dJunctions.data(junctions, d => d.id);
        this.dJunctions.exit().remove();

        const R = RADIUS;

        this.dJunctions = this.dJunctions
            .enter().append('path').attr('class', 'junction')
            .call(this.dragHandler)
            .merge(this.dJunctions)
            .attr('d', d => `M ${d.position} m -20,0 l 20,-20 l 20,20 l -40,0`)
    }

    renderQueues(entities) {
        const queues = entities.filter(d => d.queue);
        this.dQueues = this.dQueues.data(queues, d => d.id);
        this.dQueues.exit().remove();

        const R = RADIUS;

        this.dQueues = this.dQueues
            .enter().append('path').attr('class', 'queue')
            .call(this.dragHandler)
            .merge(this.dQueues)
            .attr('d', d => `M ${d.position} m 0,${-R} l ${-R},${R} l ${R},${R} l ${R},${-R} Z`);
    }

    renderPointers(entities) {
        const R = RADIUS;

        const pointers = entities.filter(d => d.pointer)
            .map(d => ({
                ... d,
                pVis: {
                    p0: entities[d.pointer.source].position.add(vec(-0.8 * R, -0.8 * R)),
                    p1: entities[d.pointer.target].position.add(vec(1.2 * R, -1.2 * R))
                }
            }));

        this.dPointers = this.dPointers.data(pointers, d => d.id);
        this.dPointers.exit().remove();

        this.dPointers = this.dPointers
            .enter().append('path').attr('class', 'pointer')
            .merge(this.dPointers)
            .attr('d', d =>
                `M ${d.pVis.p0}
                C ${d.pVis.p0.add(vec(-GAP, -GAP))}
                ${d.pVis.p1.add(vec(GAP, -GAP))}
                ${d.pVis.p1}`
            );
    }
}
