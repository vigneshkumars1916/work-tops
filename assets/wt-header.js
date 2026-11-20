/* Header: accessible mega menu (click/keyboard/hover), mobile drawer, search dialog */
(() => {
  const root = document.querySelector('[data-wt-header]');
  if (!root) return;
  const toggles = [...root.querySelectorAll('[data-wt-menu-toggle]')];
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let hoverTimer;

  const panelOf = (btn) => document.getElementById(btn.getAttribute('aria-controls'));
  const close = (btn, focus = false) => {
    if (!btn || btn.getAttribute('aria-expanded') !== 'true') return;
    btn.setAttribute('aria-expanded', 'false');
    panelOf(btn).hidden = true;
    if (focus) btn.focus();
  };
  const closeAll = (except) => toggles.forEach((b) => b !== except && close(b));
  const open = (btn) => {
    closeAll(btn);
    btn.setAttribute('aria-expanded', 'true');
    panelOf(btn).hidden = false;
  };

  toggles.forEach((btn, i) => {
    const item = btn.closest('li');
    btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close(btn) : open(btn)));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(btn); panelOf(btn).querySelector('a')?.focus(); }
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(btn, true); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (e.target !== btn) return;
        const links = [...root.querySelectorAll('.wt-nav__link')];
        const idx = links.indexOf(btn);
        links[(idx + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length].focus();
      }
    });
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) close(btn); });
    item.addEventListener('mouseenter', () => { if (!fine.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => open(btn), 120); });
    item.addEventListener('mouseleave', () => { if (!fine.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => close(btn), 200); });
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) closeAll(); });
  window.addEventListener('resize', () => closeAll(), { passive: true });

  /* Mobile drawer with focus trap */
  const drawer = document.querySelector('[data-wt-drawer]');
  const opener = root.querySelector('[data-wt-drawer-open]');
  const focusables = () => [...drawer.querySelectorAll('a[href],button:not([disabled])')].filter((el) => el.offsetParent !== null);
  const closeDrawer = () => {
    drawer.hidden = true; opener.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = ''; opener.focus();
  };
  opener?.addEventListener('click', () => {
    drawer.hidden = false; opener.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden'; focusables()[0]?.focus();
  });
  drawer?.querySelectorAll('[data-wt-drawer-close]').forEach((el) => el.addEventListener('click', closeDrawer));
  drawer?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeDrawer();
    if (e.key !== 'Tab') return;
    const f = focusables(); const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  drawer?.querySelectorAll('[data-wt-sub-toggle]').forEach((b) => b.addEventListener('click', () => {
    const exp = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!exp));
    document.getElementById(b.getAttribute('aria-controls')).hidden = exp;
  }));

  /* Search dialog */
  const dlg = document.getElementById('WtSearch');
  root.querySelector('[data-wt-search-open]')?.addEventListener('click', () => { dlg.showModal(); dlg.querySelector('input[type=search]').focus(); });
  dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
})();

/* Wishlist hearts (cards + product page): per-browser, stored locally */
(() => {
  const KEY = 'wt-wishlist';
  const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { return new Set(); } };
  const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch (e) { /* storage unavailable */ } };
  const paint = () => { const s = read(); document.querySelectorAll('[data-wt-wish]').forEach((b) => b.setAttribute('aria-pressed', String(s.has(b.dataset.wtWish)))); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wt-wish]');
    if (!b) return;
    e.preventDefault();
    const s = read(); const h = b.dataset.wtWish;
    s.has(h) ? s.delete(h) : s.add(h);
    write(s); paint();
  });
  paint();
  new MutationObserver(paint).observe(document.body, { childList: true, subtree: true });
})();
