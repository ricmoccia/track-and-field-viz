//Centralized reactive state for coordinated views
const State = {
    raw: [],           // All data
    filtered: [],      // After global filters
    yearRange: [1935, 2023],

    // Current filter values
    gender: 'all',
    environment: 'all',
    eventType: 'all',
    nation: 'all',

    // Interaction state (cross-view coordination)
    hoveredNation: null,
    hoveredEventType: null,
    selectedEvent: null,   // for detail panel

    // Subscribers
    _listeners: [],

    subscribe(fn) { this._listeners.push(fn); },

    emit(reason) {
        this._listeners.forEach(fn => fn(reason));
    },

    applyFilters() {
        this.filtered = this.raw.filter(d => {
            if (this.gender !== 'all' && d.gender !== this.gender) return false;
            if (this.environment !== 'all' && d.environment !== this.environment) return false;
            if (this.eventType !== 'all' && d.event_type !== this.eventType) return false;
            if (this.nation !== 'all' && d.nat !== this.nation) return false;
            const yr = d._year;
            if (yr && (yr < this.yearRange[0] || yr > this.yearRange[1])) return false;
            return true;
        });
        this.emit('filter');
    },

    // Event type → CSS color
    eventColor(t) {
        const map = {
            'sprints': 'var(--c-sprints)', 'middle-long': 'var(--c-middle)',
            'hurdles': 'var(--c-hurdles)', 'relays': 'var(--c-relays)',
            'jumps': 'var(--c-jumps)', 'throws': 'var(--c-throws)',
            'combined': 'var(--c-combined)', 'race-walks': 'var(--c-walks)',
            'road-running': 'var(--c-road)',
        };
        return map[t] || '#8891a8';
    },

    eventColorHex(t) {
        const map = {
            'sprints': '#e85d4a', 'middle-long': '#e8a43a',
            'hurdles': '#5a9de8', 'relays': '#9a6aed',
            'jumps': '#4ec89a', 'throws': '#e8743a',
            'combined': '#45c5d6', 'race-walks': '#d64a8a',
            'road-running': '#8bc84a',
        };
        return map[t] || '#8891a8';
    },

    // Top N nation palette (distinct warm/cool)
    nationColors: [
        '#d4915c', '#e85d4a', '#5a9de8', '#4ec89a', '#9a6aed',
        '#e8a43a', '#45c5d6', '#d64a8a', '#8bc84a', '#e8743a',
        '#7a8be8', '#c8a84a', '#e85d8a', '#4a9a6a', '#b86ae8'
    ],
};

// Tooltip helper
const TT = {
    el: null,
    init() { this.el = document.getElementById('tooltip'); },
    show(event, html) {
        this.el.innerHTML = html;
        this.el.classList.add('visible');
        const r = this.el.getBoundingClientRect();
        let x = event.clientX + 12, y = event.clientY - 8;
        if (x + r.width > window.innerWidth - 12) x = event.clientX - r.width - 12;
        if (y + r.height > window.innerHeight - 12) y = event.clientY - r.height - 8;
        if (y < 4) y = 4;
        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
    },
    hide() { this.el.classList.remove('visible'); }
};

// Utility: parse year from date string
function parseYear(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{4})/);
    return m ? +m[1] : null;
}

// Debounce 
function debounce(fn, ms = 180) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Animate counter 
function animateNum(selector, end, dur = 600) {
    const el = document.querySelector(selector);
    if (!el) return;
    const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
    const t0 = performance.now();
    (function step(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (end - start) * e).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}
