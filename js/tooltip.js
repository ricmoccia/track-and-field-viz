const Tooltip = {
  el: null,

  init() {
    this.el = document.getElementById('tooltip');
  },

  show(html, event) {
    if (!this.el) return;
    this.el.innerHTML = html;
    this.el.classList.add('visible');
    this.move(event);
  },

  move(event) {
    if (!this.el) return;
    const pad = 16;
    const rect = this.el.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;

    if (x + rect.width > window.innerWidth - pad) {
      x = event.clientX - rect.width - pad;
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = event.clientY - rect.height - pad;
    }

    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  hide() {
    if (!this.el) return;
    this.el.classList.remove('visible');
  }
};
