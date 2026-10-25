// Shared application state
const State = {
  data: [],
  gender: 'Men',          // 'Men', 'Women', 'Both'
  topN: 100,              // Top N filter
  sortBy: 'total',        // 'total', 'alpha', 'continent'
  selectedCountry: null,   // Country code
  disciplineGroup: 'All',  // 'All', 'Sprints', etc.
  
  listeners: [],

  subscribe(fn) {
    this.listeners.push(fn);
  },

  notify(changeType) {
    this.listeners.forEach(fn => fn(changeType));
  },

  setGender(g) {
    this.gender = g;
    this.notify('gender');
  },

  setTopN(n) {
    this.topN = n;
    this.notify('topN');
  },

  setSortBy(s) {
    this.sortBy = s;
    this.notify('sort');
  },

  setSelectedCountry(code) {
    this.selectedCountry = code;
    this.notify('country');
  },

  setDisciplineGroup(g) {
    this.disciplineGroup = g;
    this.notify('disciplineGroup');
  },

  // Get filtered data
  getFilteredData() {
    let filtered = this.data;
    if (this.topN) {
      filtered = filtered.filter(d => d.Rank <= this.topN);
    }
    if (this.disciplineGroup !== 'All') {
      filtered = filtered.filter(d => d.DisciplineGroup === this.disciplineGroup);
    }
    return filtered;
  },

  // Get aggregated matrix: { countryCode: { discipline: { Men: count, Women: count } } }
  getMatrix() {
    const filtered = this.getFilteredData();
    const matrix = {};
    
    filtered.forEach(d => {
      if (!matrix[d.Nationality]) {
        matrix[d.Nationality] = { _country: d.Country, _continent: d.Continent };
      }
      if (!matrix[d.Nationality][d.Discipline]) {
        matrix[d.Nationality][d.Discipline] = { Men: 0, Women: 0 };
      }
      matrix[d.Nationality][d.Discipline][d.Gender]++;
    });

    return matrix;
  },

  // Get country total for sorting
  getCountryTotal(matrix, code) {
    let total = 0;
    const entry = matrix[code];
    if (!entry) return 0;
    Object.keys(entry).forEach(k => {
      if (k.startsWith('_')) return;
      if (this.gender === 'Both') {
        total += (entry[k].Men || 0) + (entry[k].Women || 0);
      } else {
        total += entry[k][this.gender] || 0;
      }
    });
    return total;
  },

  // Get disciplines in order
  getDisciplines() {
    const order = [
      '100m', '200m', '400m',
      '800m', '1500m',
      '5000m', '10000m', 'Marathon',
      '110mH', '400mH',
      'High Jump', 'Long Jump', 'Triple Jump', 'Pole Vault',
      'Shot Put', 'Discus', 'Javelin', 'Hammer'
    ];
    if (this.disciplineGroup === 'All') return order;
    const groups = {
      'Sprints': ['100m','200m','400m'],
      'Middle Distance': ['800m','1500m'],
      'Long Distance': ['5000m','10000m','Marathon'],
      'Hurdles': ['110mH','400mH'],
      'Jumps': ['High Jump','Long Jump','Triple Jump','Pole Vault'],
      'Throws': ['Shot Put','Discus','Javelin','Hammer']
    };
    return groups[this.disciplineGroup] || order;
  },

  getDisciplineGroups() {
    return {
      '100m': 'Sprints', '200m': 'Sprints', '400m': 'Sprints',
      '800m': 'Middle Distance', '1500m': 'Middle Distance',
      '5000m': 'Long Distance', '10000m': 'Long Distance', 'Marathon': 'Long Distance',
      '110mH': 'Hurdles', '400mH': 'Hurdles',
      'High Jump': 'Jumps', 'Long Jump': 'Jumps', 'Triple Jump': 'Jumps', 'Pole Vault': 'Jumps',
      'Shot Put': 'Throws', 'Discus': 'Throws', 'Javelin': 'Throws', 'Hammer': 'Throws'
    };
  },

  // Sorted country list
  getSortedCountries(matrix) {
    const codes = Object.keys(matrix);
    
    if (this.sortBy === 'alpha') {
      return codes.sort((a, b) => (matrix[a]._country || a).localeCompare(matrix[b]._country || b));
    }
    if (this.sortBy === 'continent') {
      return codes.sort((a, b) => {
        const ca = matrix[a]._continent || '';
        const cb = matrix[b]._continent || '';
        if (ca !== cb) return ca.localeCompare(cb);
        return this.getCountryTotal(matrix, b) - this.getCountryTotal(matrix, a);
      });
    }
    // Default: by total
    return codes.sort((a, b) => this.getCountryTotal(matrix, b) - this.getCountryTotal(matrix, a));
  }
};
