// Main application entry point

document.addEventListener('DOMContentLoaded', () => {
  Tooltip.init();

  // Load data
  d3.csv('data.csv').then(raw => {
    // Parse
    raw.forEach(d => {
      d.Rank = +d.Rank;
      d.Year = +d.Year;
      d.ResultsScore = +d.ResultsScore;
    });

    State.data = raw;

    // Update header stats
    const countries = new Set(raw.map(d => d.Nationality));
    const athletes = new Set(raw.map(d => d.Competitor));
    document.getElementById('stat-records').textContent = raw.length.toLocaleString();
    document.getElementById('stat-countries').textContent = countries.size;
    document.getElementById('stat-disciplines').textContent = new Set(raw.map(d => d.Discipline)).size;

    // Initialize views
    Heatmap.init();
    Profile.init();
    GenderGap.init();

    // Subscribe to state changes
    State.subscribe((changeType) => {
      Heatmap.render();
      Profile.render();
      GenderGap.render();
    });

    // Setup controls
    setupControls();

  }).catch(err => {
    console.error('Error loading data:', err);
  });
});

function setupControls() {
  // Gender toggle
  const genderBtns = document.querySelectorAll('.gender-toggle button');
  genderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const gender = btn.dataset.gender;
      genderBtns.forEach(b => {
        b.className = '';
      });
      if (gender === 'Men') btn.classList.add('active-men');
      else if (gender === 'Women') btn.classList.add('active-women');
      else btn.classList.add('active-both');
      State.setGender(gender);
    });
  });

  // Top N slider
  const slider = document.getElementById('topn-slider');
  const display = document.getElementById('topn-display');
  slider.addEventListener('input', () => {
    const val = +slider.value;
    display.textContent = `Top ${val}`;
    State.setTopN(val);
  });

  // Sort
  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', () => {
    State.setSortBy(sortSelect.value);
  });

  // Discipline group
  const groupSelect = document.getElementById('group-select');
  groupSelect.addEventListener('change', () => {
    State.setDisciplineGroup(groupSelect.value);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      State.setSelectedCountry(null);
    }
  });
}
