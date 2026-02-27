// ranking delle nazioni nella vista 1(notion) 
// Taski 1: (trova gli estremi) — quali nazioni sono state più performanti in ogni periodo?
// Task 5: (Cluster) — gruppi di nazioni con andamenti simili

function drawBump(data) {
    const container = document.getElementById('chart-bump');
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = '<div class="loading">No data for current filters</div>';
        return;
    }

    const rect = container.getBoundingClientRect();
    const W = rect.width || 600;
    const H = rect.height || 400;
    const m = { top: 25, right: 90, bottom: 35, left: 45 };
    const w = W - m.left - m.right;
    const h = H - m.top - m.bottom;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // ── Compute nation rank per 5-year period ──
    const periodSize = 5;
    const withYear = data.filter(d => d._year);
    const periods = d3.rollup(withYear,
        v => d3.rollup(v, recs => recs.length, d => d.nat),
        d => Math.floor(d._year / periodSize) * periodSize
    );

    // Sorted period keys
    const periodKeys = Array.from(periods.keys()).sort((a, b) => a - b);
    if (periodKeys.length < 2) {
        container.innerHTML = '<div class="loading">Not enough temporal data</div>';
        return;
    }

    // For each period, rank nations by count (top N)
    const N = 12;
    const nationSet = new Set();
    const rankings = new Map(); // period → [{nat, rank, count}]

    periodKeys.forEach(pk => {
        const natMap = periods.get(pk);
        const sorted = Array.from(natMap.entries())
            .map(([nat, count]) => ({ nat, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, N);
        sorted.forEach((d, i) => { d.rank = i + 1; nationSet.add(d.nat); });
        rankings.set(pk, sorted);
    });

    // Build series per nation
    const nations = Array.from(nationSet);
    const series = nations.map(nat => {
        const points = [];
        periodKeys.forEach(pk => {
            const entry = rankings.get(pk)?.find(d => d.nat === nat);
            if (entry) points.push({ period: pk, rank: entry.rank, count: entry.count });
        });
        return { nat, points };
    }).filter(s => s.points.length >= 2);

    // ── Scales ──
    const x = d3.scalePoint()
        .domain(periodKeys)
        .range([0, w])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([1, N])
        .range([0, h]);

    const colorMap = {};
    // Assign stable colors to top nations by total appearances
    series.sort((a, b) => b.points.length - a.points.length);
    series.forEach((s, i) => { colorMap[s.nat] = State.nationColors[i % State.nationColors.length]; });

    // Grid 
    for (let r = 1; r <= N; r++) {
        g.append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', w)
            .attr('y1', y(r)).attr('y2', y(r));
    }

    // Axes
    g.append('g').attr('class', 'axis')
        .attr('transform', `translate(0,${h + 8})`)
        .call(d3.axisBottom(x).tickFormat(d => `${d}s`))
        .select('.domain').remove();

    g.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(N).tickFormat(d => `#${d}`))
        .select('.domain').remove();

    // Lines
    const line = d3.line()
        .x(d => x(d.period))
        .y(d => y(d.rank))
        .curve(d3.curveMonotoneX);

    const linesG = g.append('g');

    series.forEach((s, idx) => {
        const color = colorMap[s.nat];

        const path = linesG.append('path')
            .datum(s.points)
            .attr('class', 'bump-line')
            .attr('stroke', color)
            .attr('d', line)
            .attr('opacity', 0.7);

        // Animate
        const len = path.node().getTotalLength();
        path.attr('stroke-dasharray', len)
            .attr('stroke-dashoffset', len)
            .transition().duration(1200).delay(idx * 60).ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0);

        // Dots
        s.points.forEach((pt, pi) => {
            g.append('circle')
                .attr('class', 'bump-dot')
                .attr('cx', x(pt.period))
                .attr('cy', y(pt.rank))
                .attr('r', 0)
                .attr('fill', color)
                .attr('stroke', 'var(--bg-panel)')
                .on('mouseover', function (event) {
                    d3.select(this).attr('r', 7).attr('stroke-width', 2.5);
                    highlightNation(s.nat, true);
                    TT.show(event, `
                        <div class="tt-title">${s.nat}</div>
                        <div class="tt-row"><span class="tt-label">Period</span><span class="tt-val">${pt.period}–${pt.period + periodSize - 1}</span></div>
                        <div class="tt-row"><span class="tt-label">Rank</span><span class="tt-val">#${pt.rank}</span></div>
                        <div class="tt-row"><span class="tt-label">Performances</span><span class="tt-val">${pt.count}</span></div>
                    `);
                })
                .on('mousemove', e => TT.show(e, TT.el.innerHTML))
                .on('mouseout', function () {
                    d3.select(this).attr('r', 4.5).attr('stroke-width', 1.5);
                    highlightNation(null, false);
                    TT.hide();
                })
                .on('click', () => {
                    // Cross-view: filter nation
                    document.getElementById('filter-nation').value = s.nat;
                    State.nation = s.nat;
                    State.applyFilters();
                })
                .transition().duration(400).delay(1200 + idx * 60 + pi * 30)
                .attr('r', 4.5);
        });
    });

    //Right-side labels
    const lastPeriod = periodKeys[periodKeys.length - 1];
    series.forEach(s => {
        const last = s.points.find(p => p.period === lastPeriod);
        if (!last) return;
        g.append('text')
            .attr('x', w + 8)
            .attr('y', y(last.rank))
            .attr('dy', '0.35em')
            .attr('fill', colorMap[s.nat])
            .attr('font-family', 'var(--f-mono)')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('opacity', 0)
            .text(s.nat)
            .transition().duration(400).delay(1600)
            .attr('opacity', 1);
    });

    // Cross-highlight helper
    function highlightNation(nat, on) {
        State.hoveredNation = on ? nat : null;
        State.emit('hover-nation');

        linesG.selectAll('.bump-line')
            .transition().duration(200)
            .attr('opacity', d => !on ? 0.7 : (d[0] && series.find(s => s.points === d)?.nat === nat ? 1 : 0.12))
            .attr('stroke-width', d => !on ? 2.2 : (d[0] && series.find(s => s.points === d)?.nat === nat ? 3.5 : 1.5));
    }
}
