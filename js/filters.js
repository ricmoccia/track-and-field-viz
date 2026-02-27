// ═══ filters.js — Global filter controls + brush timeline ═══

function initFilters() {
    // ── Chip groups ──
    setupChips('gender-chips', val => { State.gender = val; State.applyFilters(); });
    setupChips('env-chips', val => { State.environment = val; State.applyFilters(); });

    // ── Event type select ──
    const etSel = document.getElementById('filter-event-type');
    const types = [...new Set(State.raw.map(d => d.event_type))].filter(Boolean).sort();
    types.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t;
        etSel.appendChild(o);
    });
    etSel.addEventListener('change', () => {
        State.eventType = etSel.value;
        State.applyFilters();
    });

    // ── Nation select ──
    const nSel = document.getElementById('filter-nation');
    const nations = [...new Set(State.raw.map(d => d.nat))].filter(Boolean).sort();
    nations.forEach(n => {
        const o = document.createElement('option');
        o.value = n; o.textContent = n;
        nSel.appendChild(o);
    });
    nSel.addEventListener('change', () => {
        State.nation = nSel.value;
        State.applyFilters();
    });

    // ── Brush for period ──
    initBrush();
}

function setupChips(containerId, onChange) {
    const container = document.getElementById(containerId);
    const chips = container.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            onChange(chip.dataset.value);
        });
    });
}

function initBrush() {
    const container = document.getElementById('brush-container');
    const rect = container.getBoundingClientRect();
    const w = rect.width || 300;
    const h = 28;
    const margin = { left: 4, right: 4 };
    const innerW = w - margin.left - margin.right;

    const svg = d3.select('#brush-container').append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    // Mini histogram of records per year for context
    const years = State.raw.map(d => d._year).filter(Boolean);
    const extent = d3.extent(years);
    const x = d3.scaleLinear().domain(extent).range([margin.left, margin.left + innerW]);

    const bins = d3.bin().domain(extent).thresholds(40)(years);
    const yMax = d3.max(bins, b => b.length);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([h - 2, 4]);

    // Draw mini bars
    svg.selectAll('.mini-bar')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0))
        .attr('width', d => Math.max(1, x(d.x1) - x(d.x0) - 0.5))
        .attr('y', d => yScale(d.length))
        .attr('height', d => h - 2 - yScale(d.length))
        .attr('fill', 'var(--accent-dim)')
        .attr('opacity', 0.35)
        .attr('rx', 1);

    // Brush
    const brush = d3.brushX()
        .extent([[margin.left, 0], [margin.left + innerW, h]])
        .on('brush end', function (event) {
            if (!event.selection) {
                State.yearRange = extent;
            } else {
                State.yearRange = event.selection.map(x.invert).map(Math.round);
            }
            document.getElementById('brush-range-label').textContent =
                `${State.yearRange[0]} – ${State.yearRange[1]}`;
            State.applyFilters();
        });

    svg.append('g').attr('class', 'brush').call(brush);
}
