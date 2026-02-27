// Small Multiples Record Progression (Vista 2 notion)
// Task 4: Compute + Find Extrema — per quano tempo reggono i record? 
// Task 6: Retrieve — details on demand via click → detail panel

function drawMultiples(data) {
    const container = document.getElementById('chart-multiples');
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = '<div class="loading">No data for current filters</div>';
        return;
    }

    //  For each event, find the progression of records (best mark over time)
    // Use event_rank === 1 for each event as the record, or take the best results_score per event per year
    const byEvent = d3.group(data, d => d.event);

    // Build record progressions
    const progressions = [];

    byEvent.forEach((records, eventName) => {
        const withYear = records.filter(d => d._year && d.results_score);

        // Sort by date, take running best score
        const sorted = withYear.sort((a, b) => {
            if (a._year !== b._year) return a._year - b._year;
            return (a.date || '').localeCompare(b.date || '');
        });

        // Running maximum score (best performance)
        let maxScore = -Infinity;
        const steps = [];
        sorted.forEach(d => {
            if (d.results_score > maxScore) {
                maxScore = d.results_score;
                steps.push({
                    year: d._year,
                    score: d.results_score,
                    mark: d.mark,
                    athlete: d.competitor,
                    nat: d.nat,
                    date: d.date,
                    venue: d.venue
                });
            }
        });

        if (steps.length >= 2) {
            const eventType = records[0].event_type;
            const gender = records[0].gender;

            // How long has the current record stood?
            const lastStep = steps[steps.length - 1];
            const currentYear = 2023;
            const yearsUnbroken = currentYear - lastStep.year;

            progressions.push({
                event: eventName,
                eventType,
                gender,
                steps,
                currentRecord: lastStep,
                yearsUnbroken,
                totalImprovement: steps.length > 1 ?
                    ((steps[steps.length - 1].score - steps[0].score) / steps[0].score * 100).toFixed(1) : 0
            });
        }
    });

    // Sort: longest-standing records first (T4: which records are most durable)
    progressions.sort((a, b) => b.yearsUnbroken - a.yearsUnbroken);

    // Render each small multiple 
    progressions.forEach((prog, idx) => {
        const cell = document.createElement('div');
        cell.className = 'sm-cell';
        cell.style.animationDelay = `${idx * 30}ms`;

        const title = document.createElement('div');
        title.className = 'sm-title';
        title.textContent = prog.event;
        title.style.color = State.eventColorHex(prog.eventType);

        const chartDiv = document.createElement('div');
        chartDiv.className = 'sm-chart';

        const meta = document.createElement('div');
        meta.className = 'sm-meta';
        meta.innerHTML = `Record: <span style="color:var(--t1)">${prog.currentRecord.mark}</span> · ${prog.currentRecord.athlete} · <span style="color:var(--accent)">${prog.yearsUnbroken}yr</span> unbroken`;

        cell.appendChild(title);
        cell.appendChild(chartDiv);
        cell.appendChild(meta);
        container.appendChild(cell);

        // Draw step chart
        drawStepChart(chartDiv, prog);

        // Click → detail panel (T6, T7)
        cell.addEventListener('click', () => {
            document.querySelectorAll('.sm-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            State.selectedEvent = prog;
            openDetail(prog);
            updateMantra('detail');
        });

        // Hover → cross-highlight event type in chord
        cell.addEventListener('mouseenter', () => {
            State.hoveredEventType = prog.eventType;
            State.emit('hover-eventtype');
        });
        cell.addEventListener('mouseleave', () => {
            State.hoveredEventType = null;
            State.emit('hover-eventtype');
        });
    });

    if (!progressions.length) {
        container.innerHTML = '<div class="loading">Not enough record data</div>';
    }
}

function drawStepChart(el, prog) {
    const W = 200, H = 60;
    const m = { top: 4, right: 4, bottom: 4, left: 4 };
    const w = W - m.left - m.right;
    const h = H - m.top - m.bottom;

    const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    const steps = prog.steps;
    const x = d3.scaleLinear()
        .domain(d3.extent(steps, d => d.year))
        .range([0, w]);
    const y = d3.scaleLinear()
        .domain(d3.extent(steps, d => d.score))
        .range([h, 0])
        .nice();

    const color = State.eventColorHex(prog.eventType);

    // Step line
    const stepLine = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.score))
        .curve(d3.curveStepAfter);

    // Area under
    const area = d3.area()
        .x(d => x(d.year))
        .y0(h)
        .y1(d => y(d.score))
        .curve(d3.curveStepAfter);

    g.append('path')
        .datum(steps)
        .attr('d', area)
        .attr('fill', color)
        .attr('opacity', 0.08);

    const path = g.append('path')
        .datum(steps)
        .attr('d', stepLine)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8);

    // Animate
    const len = path.node().getTotalLength();
    path.attr('stroke-dasharray', len)
        .attr('stroke-dashoffset', len)
        .transition().duration(800).delay(100)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

    // Record-break dots
    g.selectAll('.sm-dot')
        .data(steps)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.year))
        .attr('cy', d => y(d.score))
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', 'var(--bg-raised)')
        .attr('stroke-width', 1)
        .on('mouseover', function (event, d) {
            d3.select(this).attr('r', 4);
            TT.show(event, `
                <div class="tt-title">${d.athlete} (${d.nat})</div>
                <div class="tt-row"><span class="tt-label">Mark</span><span class="tt-val">${d.mark}</span></div>
                <div class="tt-row"><span class="tt-label">Score</span><span class="tt-val">${d.score.toFixed(1)}</span></div>
                <div class="tt-row"><span class="tt-label">Year</span><span class="tt-val">${d.year}</span></div>
                <div class="tt-row"><span class="tt-label">Venue</span><span class="tt-val">${d.venue || '—'}</span></div>
            `);
        })
        .on('mousemove', e => TT.show(e, TT.el.innerHTML))
        .on('mouseout', function () {
            d3.select(this).attr('r', 2.5);
            TT.hide();
        })
        .transition().duration(300).delay((d, i) => 800 + i * 50)
        .attr('r', 2.5);
}

// Shneiderman mantra indicator 
function updateMantra(level) {
    document.querySelectorAll('.mantra-step').forEach(el => {
        el.classList.toggle('active', el.dataset.level === level);
    });
}
