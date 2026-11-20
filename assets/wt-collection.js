/* Collection filtering: native Storefront filters + Section Rendering API, URL state, back button support. */
(() => {
  const root = document.querySelector('[data-wt-collection]');
  if (!root) return;
  const sectionId = root.dataset.sectionId;
  const mult = parseFloat(root.dataset.mult || '1') || 1;
  const cache = new Map();
  let controller;
  const collapsed = new Set();

  const facets = () => root.querySelector('[data-wt-facets]');
  const form = () => root.querySelector('[data-wt-filter-form]');
  const results = () => root.querySelector('[data-wt-results]');

  const paramsFromForm = () => {
    const fd = new FormData(form());
    const p = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (String(v).trim() !== '') p.append(k, v);
    return p.toString();
  };

  const render = async (search, { push = true } = {}) => {
    const url = `${location.pathname}${search ? `?${search}` : ''}`;
    results().classList.add('is-loading');
    controller?.abort();
    controller = new AbortController();
    try {
      let html = cache.get(url);
      if (!html) {
        const sep = search ? '&' : '?';
        const res = await fetch(`${url}${sep}section_id=${sectionId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(res.status);
        html = await res.text();
        cache.set(url, html);
      }
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const activeId = document.activeElement?.id;
      const wasOpen = facets().classList.contains('is-open');
      facets().innerHTML = doc.querySelector('[data-wt-facets]').innerHTML;
      results().innerHTML = doc.querySelector('[data-wt-results]').innerHTML;
      if (wasOpen) facets().classList.add('is-open');
      restoreCollapsed();
      initPrice();
      applyView();
      if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
      if (push) history.pushState({ wt: true, search }, '', url);
    } catch (e) {
      if (e.name !== 'AbortError') location.href = url;
    } finally {
      results().classList.remove('is-loading');
    }
  };

  /* Accordion state survives re-render */
  const restoreCollapsed = () => {
    root.querySelectorAll('[data-wt-facet-toggle]').forEach((btn) => {
      const key = btn.closest('.wt-facet').dataset.key;
      const closed = collapsed.has(key);
      btn.setAttribute('aria-expanded', String(!closed));
      document.getElementById(btn.getAttribute('aria-controls')).hidden = closed;
    });
  };

  /* Price slider: display values are multiplied (per m2), params are real variant prices */
  let priceTimer;
  const initPrice = () => {
    const wrap = root.querySelector('[data-wt-price]');
    if (!wrap) return;
    const max = parseFloat(wrap.dataset.max);
    const rMin = wrap.querySelector('[data-range=min]');
    const rMax = wrap.querySelector('[data-range=max]');
    const iMin = wrap.querySelector('[data-price=min]');
    const iMax = wrap.querySelector('[data-price=max]');
    const pMin = wrap.querySelector('[data-price-param=min]');
    const pMax = wrap.querySelector('[data-price-param=max]');
    const fill = wrap.querySelector('.wt-range__fill');
    const paint = () => {
      const a = (+rMin.value / max) * 100; const b = (+rMax.value / max) * 100;
      fill.style.left = `${a}%`; fill.style.right = `${100 - b}%`;
    };
    const commit = () => {
      const lo = iMin.value === '' ? '' : Math.max(0, +iMin.value);
      const hi = iMax.value === '' ? '' : Math.min(max, +iMax.value);
      pMin.value = lo === '' || lo === 0 ? '' : (lo / mult).toFixed(2);
      pMax.value = hi === '' || hi >= max ? '' : (hi / mult).toFixed(2);
      clearTimeout(priceTimer);
      priceTimer = setTimeout(() => render(paramsFromForm()), 450);
    };
    [rMin, rMax].forEach((r) => r.addEventListener('input', () => {
      if (+rMin.value > +rMax.value) (r === rMin ? rMin.value = rMax.value : rMax.value = rMin.value);
      iMin.value = rMin.value; iMax.value = rMax.value; paint(); commit();
    }));
    [iMin, iMax].forEach((i) => i.addEventListener('change', () => {
      rMin.value = iMin.value || 0; rMax.value = iMax.value || max; paint(); commit();
    }));
    paint();
  };

  /* Grid / list view */
  let view = 'grid';
  try { view = localStorage.getItem('wt-view') || 'grid'; } catch (e) { /* storage unavailable */ }
  const applyView = () => {
    root.querySelector('[data-wt-grid]')?.classList.toggle('wt-grid--list', view === 'list');
    root.querySelectorAll('[data-wt-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wtView === view)));
  };

  /* Delegated events (survive re-render) */
  root.addEventListener('change', (e) => {
    if (e.target.closest('[data-wt-price]')) return;
    if (e.target.matches('input[type=checkbox], [data-wt-sort]')) render(paramsFromForm());
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); render(paramsFromForm()); });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-wt-ajax]');
    if (a) {
      e.preventDefault();
      render(new URL(a.href).searchParams.toString());
      if (a.closest('.wt-pagination')) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const tog = e.target.closest('[data-wt-facet-toggle]');
    if (tog) {
      const key = tog.closest('.wt-facet').dataset.key;
      collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
      restoreCollapsed();
      return;
    }
    const v = e.target.closest('[data-wt-view]');
    if (v) {
      view = v.dataset.wtView;
      try { localStorage.setItem('wt-view', view); } catch (err) { /* ignore */ }
      applyView();
      return;
    }
    if (e.target.closest('[data-wt-facets-open]')) {
      facets().classList.add('is-open');
      e.target.closest('[data-wt-facets-open]').setAttribute('aria-expanded', 'true');
      facets().querySelector('button, input, a')?.focus();
      return;
    }
    if (e.target.closest('[data-wt-facets-close]')) closeFacets();
  });
  const closeFacets = () => {
    if (!facets().classList.contains('is-open')) return;
    facets().classList.remove('is-open');
    const opener = root.querySelector('[data-wt-facets-open]');
    opener?.setAttribute('aria-expanded', 'false');
    opener?.focus();
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFacets();
      root.querySelectorAll('details.wt-pill[open]').forEach((d) => { d.open = false; d.querySelector('summary').focus(); });
    }
  });
  /* Close pill dropdowns on outside click / when another opens */
  document.addEventListener('click', (e) => {
    root.querySelectorAll('details.wt-pill[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  });

  window.addEventListener('popstate', () => render(location.search.slice(1), { push: false }));
  history.replaceState({ wt: true, search: location.search.slice(1) }, '', location.href);
  initPrice();
  applyView();
})();
