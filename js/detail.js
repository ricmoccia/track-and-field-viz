// Details on demand
// Task 6: Retrieve — who holds the record, when, where
// T7: Determine Range — improvement delta over time

const detailPanel = document.getElementById('detail-panel');
const detailContent = document.getElementById('detail-content');
const detailClose = document.getElementById('detail-close');

detailClose.addEventListener('click', closeDetail);

function openDetail(prog) {
    detailPanel.classList.add('detail-open');
    detailContent.innerHTML = '';

    const steps = prog.steps;
    const first = steps[0];
    const last = steps[steps.length - 1];
    const improvementPct = prog.totalImprovement;
    const color = State.eventColorHex(prog.eventType);

    // Header 
    const h3 = document.createElement('h3');
    h3.textContent = prog.event;
    h3.style.color = color;
    detailContent.appendChild(h3);

    //Stat rows 
    const statData = [
        ['Current Record', last.mark],
        ['Record Holder', `${last.athlete} (${last.nat})`],
        ['Set On', `${last.date || last.year}`],
        ['Venue', last.venue || '—'],
        ['Score', last.score.toFixed(1)],
        ['Years Unbroken', `${prog.yearsUnbroken}`, true],
        ['Total Record Changes', `${steps.length}`],
        ['First Tracked Record', `${first.mark} (${first.year})`],
        ['Improvement', `${improvementPct > 0 ? '+' : ''}${improvementPct}%`, true],
        ['Gender', prog.gender],
        ['Discipline', prog.eventType],
    ];

    statData.forEach(([label, value, highlight]) => {
        const row = document.createElement('div');
        row.className = 'detail-stat-row';
        row.innerHTML = `
            <span class="detail-stat-label">${label}</span>
            <span class="detail-stat-value${highlight ? ' highlight' : ''}">${value}</span>
        `;
        detailContent.appendChild(row);
    });

    //  Record progression chart (larger version) 
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'detail-section-title';
    sectionTitle.textContent = 'Record Progression Timeline';
    detailContent.appendChild(sectionTitle);

    const chartDiv = document.createElement('div');
    chartDiv.className = 'detail-chart';
    detailContent.appendChild(chartDiv);

    drawDetailChart(chartDiv, prog, color);

    // Record holders table 
    const tableTitle = document.createElement('div');
    tableTitle.className = 'detail-section-title';
    tableTitle.textContent = 'All Record Holders';
    detailContent.appendChild(tableTitle);

    steps.forEach((step, i) => {
        const row = document.createElement('div');
        row.className = 'detail-stat-row';
        const duration = i < steps.length - 1 ? steps[i + 1].year - step.year : prog.yearsUnbroken;
        row.innerHTML = `
            <span class="detail-stat-label" style="flex:1">
                <span style="color:${color};font-family:var(--f-mono);font-size:0.7rem">${step.year}</span>
                ${step.athlete} (${step.nat})
            </span>
            <span class="detail-stat-value">${step.mark} <span style="color:var(--t3);font-size:0.65rem">${duration}yr</span></span>
        `;
        detailContent.appendChild(row);
    });

    updateMantra('detail');
}

function closeDetail() {
    detailPanel.classList.remove('detail-open');
    document.querySelectorAll('.sm-cell').forEach(c => c.classList.remove('selected'));
    State.selectedEvent = null;
    updateMantra('overview');
}

function drawDetailChart(el, prog, color) {
    const W = 340, H = 140;
    const m = { top: 15, right: 10, bottom: 25, left: 45 };
    const w = W - m.left - m.right;
    const h = H - m.top - m.bottom;

    const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const steps = prog.steps;
    const x = d3.scaleLinear().domain(d3.extent(steps, d => d.year)).range([0, w]);
    const y = d3.scaleLinear().domain(d3.extent(steps, d => d.score)).range([h, 0]).nice();

    // Grid
    g.selectAll('.dg')
        .data(y.ticks(4))
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', d => y(d)).attr('y2', d => y(d));

    // Axes
    g.append('g').attr('class', 'axis')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));

    g.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4));

    // Area
    const area = d3.area()
        .x(d => x(d.year)).y0(h).y1(d => y(d.score))
        .curve(d3.curveStepAfter);

    g.append('path').datum(steps)
        .attr('d', area)
        .attr('fill', color)
        .attr('opacity', 0.1);

    // Step line
    const line = d3.line()
        .x(d => x(d.year)).y(d => y(d.score))
        .curve(d3.curveStepAfter);

    g.append('path').datum(steps)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2);

    // Dots with labels
    steps.forEach((step, i) => {
        g.append('circle')
            .attr('cx', x(step.year))
            .attr('cy', y(step.score))
            .attr('r', 3.5)
            .attr('fill', color)
            .attr('stroke', 'var(--bg-panel)')
            .attr('stroke-width', 1.5);

        // Annotate key moments
        if (i === 0 || i === steps.length - 1) {
            g.append('text')
                .attr('x', x(step.year))
                .attr('y', y(step.score) - 8)
                .attr('text-anchor', i === 0 ? 'start' : 'end')
                .attr('fill', color)
                .attr('font-family', 'var(--f-mono)')
                .attr('font-size', '9px')
                .text(step.mark);
        }
    });
}
