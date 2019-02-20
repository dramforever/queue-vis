import * as d3 from 'd3';
import { RADIUS, HEADROOM } from "./consts";
import * as cola from 'webcola';

const chop = (v0, v1) => {
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
    }

    render(entities) {
        this.renderNodes(entities);
        this.renderLinks(entities);
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

        this.dLinks = this.dLinks
            .data(links, d => d.id);
        
        this.dLinks.exit().remove();
        this.dLinks = this.dLinks
            .enter().append('path').attr('class', 'link')
            .merge(this.dLinks)
            .classed('link-arrow-head', d => d.linkVis.arrowHead)
            .attr('d', d => `M ${d.linkVis.p0} L ${d.linkVis.p1}`)
    }
}
