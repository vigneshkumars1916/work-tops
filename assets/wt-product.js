/* Product page: gallery, tabs, variant selection, made-to-measure calculator, AJAX add to cart, quote dialog. */
(() => {
  const root = document.querySelector('[data-wt-pdp]');
  if (!root) return;
  const cfgEl = root.querySelector('[data-wt-config]');
  const cfg = cfgEl ? JSON.parse(cfgEl.textContent) : { mtm: false, variants: [] };
  const form = root.querySelector('[data-wt-form]');
  const fmt = new Intl.NumberFormat(cfg.locale || undefined, { style: 'currency', currency: cfg.currency || 'GBP' });
  const money = (cents) => fmt.format(cents / 100);
  const money0 = (cents) => new Intl.NumberFormat(cfg.locale || undefined, { style: 'currency', currency: cfg.currency || 'GBP', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const $ = (s, el = root) => el.querySelector(s);

  /* ---------- Gallery ---------- */
  const gal = $('[data-wt-gallery]');
  if (gal) {
    const slides = [...gal.querySelectorAll('.wt-gal__slide')];
    const thumbs = [...gal.querySelectorAll('.wt-gal__thumb')];
    const dots = [...gal.querySelectorAll('.wt-gal__dots span')];
    let cur = +(gal.dataset.start || 0);
    const show = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, n) => { s.hidden = n !== cur; if (n !== cur) s.querySelector('video')?.pause(); });
      thumbs.forEach((t, n) => (n === cur ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
      dots.forEach((d, n) => (n === cur ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    };
    thumbs.forEach((t) => t.addEventListener('click', () => show(+t.dataset.index)));
    gal.querySelectorAll('.wt-gal__nav').forEach((b) => b.addEventListener('click', () => show(cur + +b.dataset.dir)));
    gal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && e.target.closest('.wt-gal__thumbs, .wt-gal__stage')) show(cur + 1);
      if (e.key === 'ArrowLeft' && e.target.closest('.wt-gal__thumbs, .wt-gal__stage')) show(cur - 1);
    });
    let x0 = null;
    gal.querySelector('.wt-gal__stage')?.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    gal.querySelector('.wt-gal__stage')?.addEventListener('touchend', (e) => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null;
    });
    const zoomDlg = $('[data-wt-zoom-dialog]');
    $('[data-wt-zoom]')?.addEventListener('click', () => {
      const img = slides[cur].querySelector('img');
      if (!img) return;
      const big = $('[data-wt-zoom-img]', zoomDlg);
      big.src = (img.currentSrc || img.src).replace(/width=\d+/, 'width=1800');
      big.alt = img.alt;
      zoomDlg.showModal();
    });
    zoomDlg?.addEventListener('click', (e) => { if (e.target === zoomDlg) zoomDlg.close(); });
  }

  /* ---------- Tabs (WAI-ARIA tabs pattern) ---------- */
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (e.key in map) { e.preventDefault(); select(tabs[(map[e.key] + tabs.length) % tabs.length], true); }
    });
  });

  if (!form) return;

  /* ---------- Variant + calculator ---------- */
  const idInput = $('[data-wt-variant-id]', form);
  const qtyHidden = $('[data-wt-qty-hidden]', form);
  const addBtn = $('[data-wt-add]');
  const addLabel = $('[data-wt-add-label]');
  const msg = $('[data-wt-msg]');
  const priceEl = $('[data-wt-price]');
  const out = (k) => root.querySelector(`[data-wt-out="${k}"]`);
  const dimL = $('[data-wt-dim=length]', form);
  const dimW = $('[data-wt-dim=width]', form);
  const areaProp = $('[data-wt-area-prop]', form);
  const addText = addLabel?.textContent;
  let variant = cfg.variants.find((v) => String(v.id) === idInput.value) || cfg.variants[0];

  const currentOptions = () => {
    const opts = [];
    form.querySelectorAll('[data-wt-option]:checked').forEach((r) => { opts[+r.dataset.wtOption] = r.value; });
    return opts;
  };
  const findVariant = () => {
    const opts = currentOptions();
    return cfg.variants.find((v) => v.options.every((o, i) => opts[i] === undefined || opts[i] === o));
  };

  const rules = {
    length: { min: cfg.minL, max: cfg.maxL, name: 'Length' },
    width: { min: cfg.minW, max: cfg.maxW, name: 'Width' },
  };
  const validateDim = (input, show) => {
    const r = rules[input.dataset.wtDim];
    const raw = input.value.trim();
    const err = document.getElementById(input.getAttribute('aria-describedby').split(' ')[1]);
    let m = '';
    if (raw === '') m = `Enter a ${r.name.toLowerCase()} in millimetres.`;
    else if (!/^\d+$/.test(raw)) m = `${r.name} must be a whole number of millimetres (no decimals).`;
    else if (+raw < r.min) m = `${r.name} must be at least ${r.min} mm.`;
    else if (+raw > r.max) m = `${r.name} can't be more than ${r.max} mm (maximum slab size).`;
    if (show || input.getAttribute('aria-invalid') === 'true') {
      err.textContent = m;
      input.setAttribute('aria-invalid', m ? 'true' : 'false');
    }
    return !m;
  };

  const calc = () => {
    if (!cfg.mtm) return null;
    const okL = validateDim(dimL, false);
    const okW = validateDim(dimW, false);
    const summary = $('[data-wt-summary]');
    out('ppm').textContent = money(variant.price * 100);
    if (!okL || !okW) {
      out('area').textContent = '–'; out('total').textContent = '–';
      summary?.classList.add('is-invalid');
      return null;
    }
    const L = +dimL.value; const W = +dimW.value;
    const units = Math.ceil((L * W) / 10000); /* billable units of 0.01 m2 */
    const area = units / 100;
    out('area').textContent = `${area.toFixed(2)} m²`;
    out('total').textContent = money(units * variant.price);
    summary?.classList.remove('is-invalid');
    qtyHidden.value = String(units);
    areaProp.value = area.toFixed(2);
    return { L, W, units, area };
  };

  const syncQuote = () => {
    const q = document.querySelector('[data-wt-quote]');
    if (!q) return;
    const dims = cfg.mtm && dimL && dimW ? `${dimL.value || '?'} x ${dimW.value || '?'} mm` : '';
    q.querySelector('[data-q=variant]') && (q.querySelector('[data-q=variant]').value = variant.title);
    q.querySelector('[data-q=dims]') && (q.querySelector('[data-q=dims]').value = dims);
    const sum = q.querySelector('[data-q=summary]');
    if (sum) sum.textContent = [document.querySelector('.wt-info__title')?.textContent.trim(), variant.title, dims].filter(Boolean).join(' · ');
  };

  const onVariant = () => {
    const v = findVariant();
    if (!v) {
      addBtn.disabled = true; addLabel.textContent = window.variantStrings?.unavailable || 'Unavailable';
      return;
    }
    variant = v;
    idInput.value = v.id;
    addBtn.disabled = !v.available;
    addLabel.textContent = v.available ? addText : (window.variantStrings?.soldOut || 'Sold out');
    const amt = priceEl?.querySelector('.wt-price__amount');
    if (amt) amt.textContent = money0(cfg.mtm ? v.price * 100 : v.price);
    const url = new URL(location.href); url.searchParams.set('variant', v.id);
    history.replaceState(history.state, '', url);
    calc(); syncQuote();
  };

  form.addEventListener('change', (e) => { if (e.target.matches('[data-wt-option]')) onVariant(); });
  [dimL, dimW].filter(Boolean).forEach((i) => {
    i.addEventListener('input', () => { calc(); syncQuote(); });
    i.addEventListener('blur', () => { validateDim(i, true); calc(); });
  });
  /* Quantity stepper for normal products */
  const qty = $('[data-wt-qty]', form);
  form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    qty.value = Math.min(99, Math.max(1, (+qty.value || 1) + +b.dataset.step));
  }));

  /* ---------- Add to cart (AJAX, opens Dawn cart drawer) ---------- */
  const addToCart = async (items) => {
    const drawer = document.querySelector('cart-drawer');
    const body = { items };
    if (drawer) { body.sections = ['cart-drawer', 'cart-icon-bubble']; body.sections_url = location.pathname; }
    const res = await fetch(`${window.routes?.cart_add_url || '/cart/add'}.js`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.status) throw new Error(json.description || json.message || 'Could not add to cart');
    if (drawer) {
      drawer.classList.contains('is-empty') && drawer.classList.remove('is-empty');
      drawer.renderContents(json);
    } else {
      location.href = window.routes?.cart_url || '/cart';
    }
    return json;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = ''; msg.className = 'wt-buy__msg';
    const item = { id: +idInput.value, quantity: 1, properties: {} };
    if (cfg.mtm) {
      const okL = validateDim(dimL, true); const okW = validateDim(dimW, true);
      if (!okL || !okW) { (okL ? dimW : dimL).focus(); return; }
      const r = calc();
      item.quantity = r.units;
      item.properties = { 'Length (mm)': String(r.L), 'Width (mm)': String(r.W), 'Area (m²)': r.area.toFixed(2) };
    } else {
      item.quantity = Math.max(1, +qty?.value || 1);
    }
    addBtn.setAttribute('aria-busy', 'true'); addBtn.disabled = true;
    try {
      await addToCart([item]);
      msg.textContent = cfg.msgAdded || 'Added to your cart.'; msg.classList.add('wt-buy__msg--ok');
    } catch (err) {
      msg.textContent = err.message; msg.classList.add('wt-buy__msg--error');
    } finally {
      addBtn.removeAttribute('aria-busy'); addBtn.disabled = !variant.available;
    }
  });

  /* Complete-your-project quick add */
  document.querySelectorAll('[data-wt-quick-add]').forEach((b) => b.addEventListener('click', async () => {
    b.setAttribute('aria-busy', 'true');
    try { await addToCart([{ id: +b.dataset.wtQuickAdd, quantity: 1 }]); } catch (err) { alertLive(err.message); }
    b.removeAttribute('aria-busy');
  }));
  const alertLive = (t) => { msg.textContent = t; msg.className = 'wt-buy__msg wt-buy__msg--error'; };

  /* ---------- Quote dialog ---------- */
  const dlg = $('[data-wt-quote-dialog]');
  const qform = dlg?.querySelector('[data-wt-quote]');
  const openedAt = { t: 0 };
  root.querySelectorAll('[data-wt-quote-open]').forEach((b) => b.addEventListener('click', () => {
    syncQuote();
    const notes = qform.querySelector('[data-q=notes]');
    if (b.dataset.sample && notes && !notes.value) notes.value = `Please send me a free sample of ${document.querySelector('.wt-info__title')?.textContent.trim()}.`;
    openedAt.t = Date.now();
    dlg.showModal();
    qform.querySelector('input:not([type=hidden]):not([tabindex="-1"])')?.focus();
  }));
  dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  qform?.addEventListener('submit', (e) => {
    const err = qform.querySelector('[data-q=error]');
    err.textContent = '';
    if (qform.querySelector('[data-q=hp]').value) { e.preventDefault(); return; } /* honeypot: silently drop bots */
    if (openedAt.t && Date.now() - openedAt.t < 2500) { e.preventDefault(); err.textContent = 'Please take a moment to check your details, then send again.'; return; }
    if (!qform.checkValidity()) { e.preventDefault(); qform.reportValidity(); }
  });
  if (qform?.querySelector('[data-wt-quote-ok], [role=alert] li')) dlg.showModal();

  /* Share */
  root.querySelector('[data-wt-share]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try {
      if (navigator.share) await navigator.share({ title: b.dataset.title, url: b.dataset.url });
      else { await navigator.clipboard.writeText(b.dataset.url); msg.textContent = 'Link copied.'; msg.className = 'wt-buy__msg wt-buy__msg--ok'; }
    } catch (err) { /* cancelled */ }
  });

  calc(); syncQuote();
})();
