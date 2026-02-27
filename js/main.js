// ═══ main.js — App Orchestration ═══
// Shneiderman's Visual Information Seeking Mantra:
// Overview first → Zoom & Filter → Details on Demand

(async function init() {
    TT.init();

    // Loading state
    document.querySelectorAll('.chart-area').forEach(el => {
        if (!el.children.length) el.innerHTML = '<div class="loading">Loading data…</div>';
    });

    // ── Load CSV ──
    try {
        State.raw = await d3.csv('world-athletics_all-time-top-lists.csv', d => {
            const yr = parseYear(d.date);
            return {
                all_time_rank: +d.all_time_rank,
                results_score: +d.results_score || 0,
                event: d.event || '',
                category: d.category || '',
                event_rank: +d.event_rank,
                mark: d.mark || '',
                competitor: d.competitor || '',
                nat: d.nat || '',
                date_of_birth: d.date_of_birth || '',
                date: d.date || '',
                venue: d.venue || '',
                age: +d.age || 0,
                wind: d.wind || '',
                year_of_birth: +d.year_of_birth || 0,
                event_name: d.event_name || '',
                event_type: d.event_type || '',
                environment: d.environment || '',
                age_category: d.age_category || '',
                gender: d.gender || '',
                _year: yr  // Pre-computed
            };
        });

        console.log(`✓ Loaded ${State.raw.length} records`);

        // Compute year range from data
        const years = State.raw.map(d => d._year).filter(Boolean);
        State.yearRange = d3.extent(years);

        // Initialize filters
        initFilters();

        // Subscribe views to state changes
        State.subscribe(reason => {
            if (reason === 'filter') {
                updateStats();
                drawBump(State.filtered);
                drawMultiples(State.filtered);
                drawChord(State.filtered);
                updateMantra('filter');
            }
        });

        // Initial render (triggers filter)
        State.applyFilters();
        updateMantra('overview');

        // Responsive redraw
        window.addEventListener('resize', debounce(() => {
            drawBump(State.filtered);
            drawMultiples(State.filtered);
            drawChord(State.filtered);
        }, 300));

    } catch (err) {
        console.error('Failed to load data:', err);
        document.querySelectorAll('.chart-area').forEach(el => {
            el.innerHTML = `<div class="loading" style="color:var(--c-sprints)">
                Error loading CSV — make sure <code style="color:var(--accent)">world-athletics_all-time-top-lists.csv</code> is in the same folder as index.html
            </div>`;
        });
    }
})();

// ── Update stats ribbon ──
function updateStats() {
    const d = State.filtered;
    animateNum('#s-records', d.length);
    animateNum('#s-athletes', new Set(d.map(r => r.competitor)).size);
    animateNum('#s-nations', new Set(d.map(r => r.nat)).size);
    animateNum('#s-events', new Set(d.map(r => r.event)).size);
}
