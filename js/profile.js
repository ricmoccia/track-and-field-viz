const Profile = {
  svg: null,
  margin: { top: 20, right: 20, bottom: 80, left: 40 },

  init() {
    this.svg = d3.select('#profile-svg');
    this.render();
  },

  render() {
    const container = document.getElementById('profile-container');
    const badge = document.getElementById('country-badge');
    const placeholder = document.getElementById('profile-placeholder');

    if (!State.selectedCountry) {
      if (placeholder) placeholder.style.display = 'flex';
      if (badge) badge.style.display = 'none';
      this.svg.selectAll('*').remove();
      return;
    }

    if (placeholder) placeholder.style.display = 'none';
    if (badge) badge.style.display = 'inline-flex';

    const matrix = State.getMatrix();
    const entry = matrix[State.selectedCountry];
    if (!entry) return;

    // Update badge
    if (badge) {
      badge.querySelector('.name').textContent = entry._country;
      badge.querySelector('.code').textContent = State.selectedCountry;
    }

    const disciplines = State.getDisciplines();
    const groups = State.getDisciplineGroups();

    // Compute data
    const barData = disciplines.map(disc => {
      const cell = entry[disc] || { Men: 0, Women: 0 };
      return {
        discipline: disc,
        group: groups[disc],
        men: cell.Men || 0,
        women: cell.Women || 0
      };
    });

    const w = container.clientWidth || 350;
    const h = 300;
    const m = this.margin;
    const chartW = w - m.left - m.right;
    const chartH = h - m.top - m.bottom;

    this.svg.attr('width', w).attr('height', h);
    this.svg.selectAll('*').remove();

    const g = this.svg.append('g')
      .attr('transform', `translate(${m.left},${m.top})`);

    const maxVal = d3.max(barData, d => Math.max(d.men, d.women)) || 1;

    const x = d3.scaleBand()
      .domain(disciplines)
      .range([0, chartW])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .nice()
      .range([chartH, 0]);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickSize(-chartW))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,3'))
      .call(g => g.selectAll('.tick text')
        .attr('fill', '#556380')
        .attr('font-size', '10px'));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${chartH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').attr('stroke', '#1e293b'))
      .selectAll('text')
      .attr('fill', '#8b99b5')
      .attr('font-size', '9px')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-50)')
      .attr('dx', '-4px')
      .attr('dy', '4px');

    const barWidth = x.bandwidth() / 2 - 1;

    // Men bars
    g.selectAll('.bar-m')
      .data(barData)
      .join('rect')
      .attr('class', 'bar-m')
      .attr('x', d => x(d.discipline))
      .attr('y', d => y(d.men))
      .attr('width', barWidth)
      .attr('height', d => chartH - y(d.men))
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.85)
      .attr('rx', 2)
      .on('mouseenter', (event, d) => {
        Tooltip.show(`
          <div class="tt-title">${d.discipline} — Men</div>
          <div class="tt-row"><span class="tt-label">Athletes</span><span class="tt-value men">${d.men}</span></div>
        `, event);
      })
      .on('mousemove', (event) => Tooltip.move(event))
      .on('mouseleave', () => Tooltip.hide());

    // Women bars
    g.selectAll('.bar-w')
      .data(barData)
      .join('rect')
      .attr('class', 'bar-w')
      .attr('x', d => x(d.discipline) + barWidth + 2)
      .attr('y', d => y(d.women))
      .attr('width', barWidth)
      .attr('height', d => chartH - y(d.women))
      .attr('fill', '#f472b6')
      .attr('opacity', 0.85)
      .attr('rx', 2)
      .on('mouseenter', (event, d) => {
        Tooltip.show(`
          <div class="tt-title">${d.discipline} — Women</div>
          <div class="tt-row"><span class="tt-label">Athletes</span><span class="tt-value women">${d.women}</span></div>
        `, event);
      })
      .on('mousemove', (event) => Tooltip.move(event))
      .on('mouseleave', () => Tooltip.hide());

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${chartW - 100}, -10)`);

    legend.append('rect').attr('width', 10).attr('height', 10).attr('fill', '#3b82f6').attr('rx', 2);
    legend.append('text').attr('x', 14).attr('y', 9).text('Men').attr('fill', '#8b99b5').attr('font-size', '10px');
    legend.append('rect').attr('x', 50).attr('width', 10).attr('height', 10).attr('fill', '#f472b6').attr('rx', 2);
    legend.append('text').attr('x', 64).attr('y', 9).text('Women').attr('fill', '#8b99b5').attr('font-size', '10px');
  }
};
