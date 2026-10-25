const GenderGap = {
  svg: null,
  margin: { top: 20, right: 40, bottom: 30, left: 80 },

  init() {
    this.svg = d3.select('#gendergap-svg');
    this.render();
  },

  render() {
    const container = document.getElementById('gendergap-container');
    const w = container.clientWidth || 350;
    const h = 340;
    const m = this.margin;
    const chartW = w - m.left - m.right;
    const chartH = h - m.top - m.bottom;

    this.svg.attr('width', w).attr('height', h);
    this.svg.selectAll('*').remove();

    const matrix = State.getMatrix();
    const disciplines = State.getDisciplines();

    // Aggregate across all countries: total men vs women per discipline
    const gapData = disciplines.map(disc => {
      let men = 0, women = 0;
      Object.keys(matrix).forEach(code => {
        const cell = matrix[code][disc];
        if (cell) {
          men += cell.Men || 0;
          women += cell.Women || 0;
        }
      });
      return { discipline: disc, men, women, gap: men - women };
    });

    // If a country is selected, show that country's gap instead
    if (State.selectedCountry && matrix[State.selectedCountry]) {
      const entry = matrix[State.selectedCountry];
      gapData.forEach(d => {
        const cell = entry[d.discipline];
        d.men = cell ? (cell.Men || 0) : 0;
        d.women = cell ? (cell.Women || 0) : 0;
        d.gap = d.men - d.women;
      });
    }

    const g = this.svg.append('g')
      .attr('transform', `translate(${m.left},${m.top})`);

    const maxVal = d3.max(gapData, d => Math.max(d.men, d.women)) || 1;

    const y = d3.scaleBand()
      .domain(disciplines)
      .range([0, chartH])
      .padding(0.2);

    const xLeft = d3.scaleLinear()
      .domain([maxVal, 0])
      .range([0, chartW / 2 - 4]);

    const xRight = d3.scaleLinear()
      .domain([0, maxVal])
      .range([chartW / 2 + 4, chartW]);

    // Center axis
    g.append('line')
      .attr('x1', chartW / 2).attr('x2', chartW / 2)
      .attr('y1', -5).attr('y2', chartH)
      .attr('stroke', '#2d3b54')
      .attr('stroke-width', 1);

    // Labels
    g.append('text')
      .attr('x', chartW / 4).attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#60a5fa').attr('font-size', '10px').attr('font-weight', '600')
      .text('← MEN');

    g.append('text')
      .attr('x', chartW * 3 / 4).attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f9a8d4').attr('font-size', '10px').attr('font-weight', '600')
      .text('WOMEN →');

    // Discipline labels
    g.selectAll('.gap-label')
      .data(gapData)
      .join('text')
      .attr('class', 'gap-label')
      .attr('x', -8)
      .attr('y', d => y(d.discipline) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#8b99b5')
      .attr('font-size', '10px')
      .text(d => d.discipline);

    // Men bars (left side)
    g.selectAll('.bar-men')
      .data(gapData)
      .join('rect')
      .attr('class', 'bar-men')
      .attr('x', d => xLeft(d.men))
      .attr('y', d => y(d.discipline))
      .attr('width', d => chartW / 2 - 4 - xLeft(d.men))
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .on('mouseenter', (event, d) => {
        Tooltip.show(`
          <div class="tt-title">${d.discipline}</div>
          <div class="tt-row"><span class="tt-label">Men</span><span class="tt-value men">${d.men}</span></div>
          <div class="tt-row"><span class="tt-label">Women</span><span class="tt-value women">${d.women}</span></div>
          <div class="tt-row"><span class="tt-label">Gap (M-W)</span><span class="tt-value">${d.gap > 0 ? '+' : ''}${d.gap}</span></div>
        `, event);
      })
      .on('mousemove', (event) => Tooltip.move(event))
      .on('mouseleave', () => Tooltip.hide());

    // Women bars (right side)
    g.selectAll('.bar-women')
      .data(gapData)
      .join('rect')
      .attr('class', 'bar-women')
      .attr('x', chartW / 2 + 4)
      .attr('y', d => y(d.discipline))
      .attr('width', d => xRight(d.women) - chartW / 2 - 4)
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .on('mouseenter', (event, d) => {
        Tooltip.show(`
          <div class="tt-title">${d.discipline}</div>
          <div class="tt-row"><span class="tt-label">Men</span><span class="tt-value men">${d.men}</span></div>
          <div class="tt-row"><span class="tt-label">Women</span><span class="tt-value women">${d.women}</span></div>
          <div class="tt-row"><span class="tt-label">Gap (M-W)</span><span class="tt-value">${d.gap > 0 ? '+' : ''}${d.gap}</span></div>
        `, event);
      })
      .on('mousemove', (event) => Tooltip.move(event))
      .on('mouseleave', () => Tooltip.hide());

    // Value labels on bars
    g.selectAll('.val-men')
      .data(gapData.filter(d => d.men > 0))
      .join('text')
      .attr('x', d => xLeft(d.men) + 4)
      .attr('y', d => y(d.discipline) + y.bandwidth() / 2 + 4)
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .text(d => d.men);

    g.selectAll('.val-women')
      .data(gapData.filter(d => d.women > 0))
      .join('text')
      .attr('x', d => xRight(d.women) - 4)
      .attr('y', d => y(d.discipline) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .text(d => d.women);
  }
};
