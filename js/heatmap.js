const Heatmap = {
  svg: null,
  margin: { top: 100, right: 30, bottom: 30, left: 130 },
  cellSize: 26,
  cellPad: 2,

  init() {
    this.svg = d3.select('#heatmap-svg');
    this.render();
  },

  getColorScale(gender) {
    if (gender === 'Women') {
      return d3.scaleSequential()
        .interpolator(d3.interpolate('#111827', '#f472b6'));
    }
    if (gender === 'Both') {
      return d3.scaleSequential()
        .interpolator(d3.interpolate('#111827', '#a78bfa'));
    }
    return d3.scaleSequential()
      .interpolator(d3.interpolate('#111827', '#3b82f6'));
  },

  render() {
    const matrix = State.getMatrix();
    const disciplines = State.getDisciplines();
    const groups = State.getDisciplineGroups();
    const countries = State.getSortedCountries(matrix);

    // Filter out countries with 0 total
    const activeCountries = countries.filter(c => State.getCountryTotal(matrix, c) > 0);

    const cs = this.cellSize;
    const cp = this.cellPad;
    const m = this.margin;

    // Calculate group offsets for spacing between discipline groups
    let groupGaps = {};
    let prevGroup = null;
    let gapOffset = 0;
    disciplines.forEach((d, i) => {
      const g = groups[d];
      if (prevGroup && g !== prevGroup) gapOffset += 10;
      groupGaps[d] = gapOffset;
      prevGroup = g;
    });

    const width = m.left + disciplines.length * (cs + cp) + gapOffset + m.right;
    const height = m.top + activeCountries.length * (cs + cp) + m.bottom;

    this.svg.attr('width', width).attr('height', height);
    this.svg.selectAll('*').remove();

    const g = this.svg.append('g');

    // Compute max value for color scale
    let maxVal = 0;
    activeCountries.forEach(code => {
      disciplines.forEach(disc => {
        const cell = matrix[code] && matrix[code][disc];
        if (!cell) return;
        let val = 0;
        if (State.gender === 'Both') val = (cell.Men || 0) + (cell.Women || 0);
        else val = cell[State.gender] || 0;
        if (val > maxVal) maxVal = val;
      });
    });
    maxVal = Math.max(maxVal, 1);

    const colorScale = this.getColorScale(State.gender).domain([0, maxVal]);

    // Column headers (disciplines)
    const colGroup = g.append('g').attr('class', 'col-headers');
    
    // Group labels
    let lastGroup = null;
    let groupStart = 0;
    disciplines.forEach((d, i) => {
      const gr = groups[d];
      const xPos = m.left + i * (cs + cp) + groupGaps[d];
      
      if (gr !== lastGroup) {
        if (lastGroup !== null) {
          // Draw group label for previous group
          const midX = (groupStart + xPos - (cs + cp)) / 2;
          colGroup.append('text')
            .attr('class', 'heatmap-group-label')
            .attr('x', midX + cs / 2)
            .attr('y', m.top - 60)
            .attr('text-anchor', 'middle')
            .text(lastGroup);
          
          // Group separator line
          colGroup.append('line')
            .attr('x1', xPos - 5)
            .attr('y1', m.top - 55)
            .attr('x2', xPos - 5)
            .attr('y2', height - m.bottom)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,3');
        }
        groupStart = xPos;
        lastGroup = gr;
      }

      // Discipline name (rotated)
      colGroup.append('text')
        .attr('class', 'heatmap-col-label')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'end')
        .attr('transform', `translate(${xPos + cs / 2 + 3}, ${m.top - 12}) rotate(-45)`)
        .text(d);
    });

    // Last group label
    if (lastGroup) {
      const lastIdx = disciplines.length - 1;
      const lastXPos = m.left + lastIdx * (cs + cp) + groupGaps[disciplines[lastIdx]];
      const midX = (groupStart + lastXPos) / 2;
      colGroup.append('text')
        .attr('class', 'heatmap-group-label')
        .attr('x', midX + cs / 2)
        .attr('y', m.top - 60)
        .attr('text-anchor', 'middle')
        .text(lastGroup);
    }

    // Rows (countries)
    const rowsGroup = g.append('g').attr('class', 'rows');

    activeCountries.forEach((code, ri) => {
      const y = m.top + ri * (cs + cp);
      const row = rowsGroup.append('g').attr('class', 'heatmap-row');

      // Country label
      const countryName = matrix[code]._country || code;
      const displayName = countryName.length > 18 ? countryName.substring(0, 16) + '…' : countryName;
      
      row.append('text')
        .attr('class', `heatmap-row-label ${code === State.selectedCountry ? 'selected' : ''}`)
        .attr('x', m.left - 10)
        .attr('y', y + cs / 2 + 4)
        .attr('text-anchor', 'end')
        .text(displayName)
        .on('click', () => {
          State.setSelectedCountry(code === State.selectedCountry ? null : code);
        })
        .on('mouseenter', (event) => {
          const total = State.getCountryTotal(matrix, code);
          Tooltip.show(`
            <div class="tt-title">${countryName} (${code})</div>
            <div class="tt-row"><span class="tt-label">Continent</span><span class="tt-value">${matrix[code]._continent}</span></div>
            <div class="tt-row"><span class="tt-label">Athletes in top ${State.topN}</span><span class="tt-value">${total}</span></div>
          `, event);
        })
        .on('mousemove', (event) => Tooltip.move(event))
        .on('mouseleave', () => Tooltip.hide());

      // Country code badge
      row.append('text')
        .attr('x', m.left - 8)
        .attr('y', y + cs / 2 + 4)
        .attr('text-anchor', 'start')
        .attr('font-size', '8px')
        .attr('fill', '#556380')
        .attr('opacity', 0); // hidden, could enable

      // Cells
      disciplines.forEach((disc, ci) => {
        const x = m.left + ci * (cs + cp) + groupGaps[disc];
        const cell = matrix[code] && matrix[code][disc];
        let val = 0;
        let menVal = 0, womenVal = 0;
        if (cell) {
          menVal = cell.Men || 0;
          womenVal = cell.Women || 0;
          if (State.gender === 'Both') val = menVal + womenVal;
          else val = cell[State.gender] || 0;
        }

        if (State.gender === 'Both' && val > 0) {
          // Split cell: top half men, bottom half women
          const menColor = this.getColorScale('Men').domain([0, maxVal])(menVal);
          const womenColor = this.getColorScale('Women').domain([0, maxVal])(womenVal);

          row.append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', x).attr('y', y)
            .attr('width', cs).attr('height', cs / 2)
            .attr('rx', 2).attr('ry', 2)
            .attr('fill', menColor)
            .on('mouseenter', (event) => this.cellTooltip(event, code, disc, menVal, womenVal, matrix))
            .on('mousemove', (event) => Tooltip.move(event))
            .on('mouseleave', () => Tooltip.hide())
            .on('click', () => State.setSelectedCountry(code));

          row.append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', x).attr('y', y + cs / 2)
            .attr('width', cs).attr('height', cs / 2)
            .attr('rx', 2).attr('ry', 2)
            .attr('fill', womenColor)
            .on('mouseenter', (event) => this.cellTooltip(event, code, disc, menVal, womenVal, matrix))
            .on('mousemove', (event) => Tooltip.move(event))
            .on('mouseleave', () => Tooltip.hide())
            .on('click', () => State.setSelectedCountry(code));
        } else {
          row.append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', x).attr('y', y)
            .attr('width', cs).attr('height', cs)
            .attr('rx', 2).attr('ry', 2)
            .attr('fill', val > 0 ? colorScale(val) : '#0d1321')
            .on('mouseenter', (event) => this.cellTooltip(event, code, disc, menVal, womenVal, matrix))
            .on('mousemove', (event) => Tooltip.move(event))
            .on('mouseleave', () => Tooltip.hide())
            .on('click', () => State.setSelectedCountry(code));
        }
      });

      // Highlight selected row
      if (code === State.selectedCountry) {
        row.insert('rect', ':first-child')
          .attr('x', m.left - 4)
          .attr('y', y - 1)
          .attr('width', width - m.left - m.right + 8)
          .attr('height', cs + 2)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 1.5)
          .attr('rx', 3)
          .attr('opacity', 0.6);
      }
    });

    // Update legend
    this.renderLegend(maxVal);
  },

  cellTooltip(event, code, disc, menVal, womenVal, matrix) {
    const countryName = matrix[code]._country || code;
    Tooltip.show(`
      <div class="tt-title">${countryName} — ${disc}</div>
      <div class="tt-row"><span class="tt-label">Men in top ${State.topN}</span><span class="tt-value men">${menVal}</span></div>
      <div class="tt-row"><span class="tt-label">Women in top ${State.topN}</span><span class="tt-value women">${womenVal}</span></div>
      <div class="tt-row"><span class="tt-label">Total</span><span class="tt-value">${menVal + womenVal}</span></div>
    `, event);
  },

  renderLegend(maxVal) {
    const container = document.getElementById('heatmap-legend');
    if (!container) return;
    container.innerHTML = '';

    const steps = 6;
    const colors = [];
    const scale = this.getColorScale(State.gender).domain([0, maxVal]);
    for (let i = 0; i < steps; i++) {
      colors.push(scale(maxVal * i / (steps - 1)));
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'legend-container';

    const labelL = document.createElement('span');
    labelL.className = 'legend-label';
    labelL.textContent = '0';
    wrapper.appendChild(labelL);

    const bar = document.createElement('div');
    bar.className = 'legend-bar';
    colors.forEach(c => {
      const swatch = document.createElement('div');
      swatch.style.background = c;
      bar.appendChild(swatch);
    });
    wrapper.appendChild(bar);

    const labelR = document.createElement('span');
    labelR.className = 'legend-label';
    labelR.textContent = `${maxVal} athletes`;
    wrapper.appendChild(labelR);

    container.appendChild(wrapper);
  }
};
