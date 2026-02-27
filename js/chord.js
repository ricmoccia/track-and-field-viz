// Nazioni e specialità (Vista 3 notion)
// Task 2: dominanza geografica — quali nazioni eccellono in quali discipline?
// Task 5: Cluster — nazioni che eccellono in piu discipline

function drawChord(data) {
    const container = document.getElementById('chart-chord');
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = '<div class="loading">No data for current filters</div>';
        return;
    }

    const rect = container.getBoundingClientRect();
    const W = rect.width || 700;
    const H = rect.height || 380;
    const outerR = Math.min(W, H) / 2 - 50;
    const innerR = outerR - 18;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g')
        .attr('transform', `translate(${W / 2},${H / 2})`);

    //  Build matrix: top N nations × event types 
    const topN = 10;
    const eventTypes = [...new Set(data.map(d => d.event_type))].filter(Boolean).sort();

    // Top nations by total count
    const natCounts = d3.rollup(data, v => v.length, d => d.nat);
    const topNations = Array.from(natCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(d => d[0]);

    const names = [...topNations, ...eventTypes];
    const n = names.length;
    const nNat = topNations.length;
    const nEv = eventTypes.length;

    // Build matrix
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Count: nation i → event type j
    const crossCounts = d3.rollup(
        data.filter(d => topNations.includes(d.nat) && eventTypes.includes(d.event_type)),
        v => v.length,
        d => d.nat,
        d => d.event_type
    );

    topNations.forEach((nat, i) => {
        const evMap = crossCounts.get(nat);
        if (!evMap) return;
        evMap.forEach((count, et) => {
            const j = nNat + eventTypes.indexOf(et);
            matrix[i][j] = count;
            matrix[j][i] = count;
        });
    });

    //  Chord layout 
    const chord = d3.chord()
        .padAngle(0.04)
        .sortSubgroups(d3.descending)(matrix);

    // Color: nations get warm tones, event types get their semantic colors 
    function getColor(i) {
        if (i < nNat) return State.nationColors[i % State.nationColors.length];
        return State.eventColorHex(eventTypes[i - nNat]);
    }

    // Draw outer arcs 
    const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);

    const arcsG = g.selectAll('.arc-group')
        .data(chord.groups)
        .enter()
        .append('g')
        .attr('class', 'arc-group');

    arcsG.append('path')
        .attr('d', arc)
        .attr('fill', d => getColor(d.index))
        .attr('opacity', 0.85)
        .attr('stroke', 'var(--bg-panel)')
        .attr('stroke-width', 1)
        .on('mouseover', function (event, d) {
            highlightGroup(d.index, true);
            const name = names[d.index];
            const total = d3.sum(matrix[d.index]);
            TT.show(event, `
                <div class="tt-title">${name}</div>
                <div class="tt-row"><span class="tt-label">Total links</span><span class="tt-val">${total.toLocaleString()}</span></div>
                <div class="tt-row"><span class="tt-label">Type</span><span class="tt-val">${d.index < nNat ? 'Nation' : 'Discipline'}</span></div>
            `);
        })
        .on('mousemove', e => TT.show(e, TT.el.innerHTML))
        .on('mouseout', function (event, d) {
            highlightGroup(null, false);
            TT.hide();
        })
        .transition()
        .duration(800)
        .attrTween('d', function (d) {
            const interp = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
            return t => arc(interp(t));
        });

    // Labels 
    arcsG.append('text')
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('class', 'chord-label')
        .attr('dy', '0.35em')
        .attr('transform', d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerR + 8})
            ${d.angle > Math.PI ? 'rotate(180)' : ''}
        `)
        .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
        .attr('fill', d => getColor(d.index))
        .text(d => names[d.index])
        .attr('opacity', 0)
        .transition().duration(400).delay(800)
        .attr('opacity', 1);

    //  Ribbons 
    const ribbon = d3.ribbon().radius(innerR - 2);

    const ribbonsG = g.append('g').attr('class', 'ribbons');

    ribbonsG.selectAll('.ribbon')
        .data(chord)
        .enter()
        .append('path')
        .attr('class', 'ribbon')
        .attr('d', ribbon)
        .attr('fill', d => getColor(d.source.index))
        .attr('opacity', 0)
        .attr('stroke', 'none')
        .transition()
        .duration(600)
        .delay((d, i) => 400 + i * 15)
        .attr('opacity', 0.35);

    // Highlight helper 
    function highlightGroup(idx, on) {
        ribbonsG.selectAll('.ribbon')
            .transition().duration(200)
            .attr('opacity', d => {
                if (!on) return 0.35;
                return (d.source.index === idx || d.target.index === idx) ? 0.7 : 0.04;
            });

        arcsG.selectAll('path')
            .transition().duration(200)
            .attr('opacity', d => {
                if (!on) return 0.85;
                // Check if connected to hovered group
                const connected = chord.some(c =>
                    (c.source.index === idx && c.target.index === d.index) ||
                    (c.target.index === idx && c.source.index === d.index) ||
                    d.index === idx
                );
                return connected ? 0.95 : 0.2;
            });

        // Cross-view coordination
        if (idx !== null && idx < nNat) {
            State.hoveredNation = on ? topNations[idx] : null;
            State.emit('hover-nation');
        }
    }

    // Listen for cross-view hover events
    State.subscribe(reason => {
        if (reason === 'hover-eventtype') {
            const et = State.hoveredEventType;
            if (!et) {
                ribbonsG.selectAll('.ribbon').transition().duration(200).attr('opacity', 0.35);
                arcsG.selectAll('path').transition().duration(200).attr('opacity', 0.85);
                return;
            }
            const etIdx = nNat + eventTypes.indexOf(et);
            if (etIdx >= nNat) highlightGroup(etIdx, true);
        }
    });
}
