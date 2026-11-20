/* Scroll-snap carousel: native horizontal scrolling with prev/next buttons and a live status. */
class WtCarousel extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-track]');
    if (!this.track) return;
    this.prev = this.querySelector('[data-prev]');
    this.next = this.querySelector('[data-next]');
    this.status = this.querySelector('[data-status]');
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prev?.addEventListener('click', () => this.go(-1));
    this.next?.addEventListener('click', () => this.go(1));
    this.track.addEventListener('scroll', () => this.queue(), { passive: true });
    new ResizeObserver(() => this.queue()).observe(this.track);
    this.update();
  }

  step() {
    const item = this.track.firstElementChild;
    if (!item) return this.track.clientWidth;
    const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
    return item.getBoundingClientRect().width + gap;
  }

  go(dir) {
    const behavior = this.reduce.matches ? 'auto' : 'smooth';
    this.track.scrollBy({ left: dir * this.step(), behavior });
  }

  queue() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.update();
    });
  }

  update() {
    const t = this.track;
    const max = t.scrollWidth - t.clientWidth - 2;
    if (this.prev) this.prev.disabled = t.scrollLeft <= 2;
    if (this.next) this.next.disabled = t.scrollLeft >= max;
    this.toggleAttribute('data-static', max <= 0);
    if (this.status) {
      const total = t.children.length;
      const current = Math.min(total, Math.round(t.scrollLeft / this.step()) + 1);
      this.status.textContent = `${current} / ${total}`;
    }
  }
}

if (!customElements.get('wt-carousel')) customElements.define('wt-carousel', WtCarousel);
