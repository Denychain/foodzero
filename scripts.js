(function(){
  'use strict';

  const qs  = (sel, ctx=document) => ctx.querySelector(sel);
  const qsa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isVisible = (el) => !!(el && el.offsetParent !== null);

  const getFocusable = (root) => qsa(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    root
  ).filter(el => !el.hasAttribute('inert'));

  const focusFirst = (root) => {
    const first = getFocusable(root)[0];
    if (first) first.focus();
  };

  function trapFocusKeydown(root, e){
    if (e.key !== 'Tab') return;
    const f = getFocusable(root);
    if (!f.length) return;
    const first = f[0], last = f[f.length-1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  const burger   = qs('.nav-toggle');
  const overlay  = qs('#nav-overlay');
  const closeBtn = overlay ? qs('.overlay__close', overlay) : null;
  const body     = document.body;

  let lastFocusedOverlay = null;

  function getTopLevelLinks(){
    if (!overlay) return [];
    const list = qs('.overlay__list', overlay);
    if (!list) return [];
    return qsa(':scope > .overlay__item > .overlay__link', list);
  }

  function getSub(listItem){
    return listItem ? qs('.overlay__sub', listItem) : null;
  }

  function collapseSub(li){
    if (!li) return;
    const btn = qs('.overlay__link', li);
    const sub = getSub(li);
    if (btn) btn.setAttribute('aria-expanded','false');
    li.classList.remove('is-active');
    if (!sub) return;
    if (prefersReduced){
      sub.style.transition = 'none';
      sub.style.height = '0px';
      void sub.offsetHeight; 
      sub.style.transition = '';
      return;
    }
    const current = sub.getBoundingClientRect().height;
    sub.style.height = current + 'px';
    requestAnimationFrame(()=>{ sub.style.height = '0px'; });
  }

  function expandSub(li){
    if (!li) return;
    const btn = qs('.overlay__link', li);
    const sub = getSub(li);
    if (btn) btn.setAttribute('aria-expanded','true');
    li.classList.add('is-active');
    if (!sub) return;
    if (prefersReduced){
      sub.style.transition = 'none';
      sub.style.height = 'auto';
      void sub.offsetHeight;
      sub.style.transition = '';
      return;
    }
    sub.style.height = 'auto';
    const target = sub.scrollHeight;
    sub.style.height = '0px';
    requestAnimationFrame(()=>{
      sub.style.height = target + 'px';
      const onEnd = (e)=>{
        if (e.propertyName !== 'height') return;
        sub.style.height = 'auto';
        sub.removeEventListener('transitionend', onEnd);
      };
      sub.addEventListener('transitionend', onEnd);
    });
  }

  function closeAllSubmenus(exceptLi){
    if (!overlay) return;
    qsa('.overlay__item.has-sub', overlay).forEach(li=>{
      if (exceptLi && li === exceptLi) return;
      collapseSub(li);
    });
  }

  function openOverlay(){
    if (!overlay || !burger) return;
    if (overlay.classList.contains('is-open')) return;
    lastFocusedOverlay = document.activeElement;
    burger.setAttribute('aria-expanded','true');
    burger.classList.add('is-open');
    burger.setAttribute('aria-label','Close menu');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden','false');
    body.classList.add('nav-open');
    (closeBtn || overlay).focus();
    qsa('.overlay__item.is-active', overlay).forEach(el => el.classList.remove('is-active'));
    qsa('.overlay__item.has-sub > .overlay__link[aria-expanded="true"]', overlay)
      .forEach(btn => btn.setAttribute('aria-expanded','false'));
    closeAllSubmenus();
    const sw = window.innerWidth - document.documentElement.clientWidth;
    if (sw > 0) body.style.paddingRight = sw + 'px';
    updateBottomBar();
  }

  function resetOverlayState(){
    if (!overlay) return;
    qsa('.overlay__item.is-active', overlay).forEach(el => el.classList.remove('is-active'));
    qsa('.overlay__item.has-sub > .overlay__link[aria-expanded="true"]', overlay)
      .forEach(btn => btn.setAttribute('aria-expanded','false'));
  }

  function closeOverlay(){
    if (!overlay || !burger) return;
    burger.setAttribute('aria-expanded','false');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden','true');
    body.classList.remove('nav-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-label','Open menu');

    resetOverlayState();

    if (lastFocusedOverlay) lastFocusedOverlay.focus();
    body.style.paddingRight = '';
    updateBottomBar();
  }

  function toggleOverlay(){
    if (!overlay) return;
    overlay.classList.contains('is-open') ? closeOverlay() : openOverlay();
  }

  if (burger && overlay){
    burger.addEventListener('click', toggleOverlay);

    overlay.addEventListener('click', (e)=>{
      const isBackdrop = e.target === overlay;
      const closeEl    = e.target.closest('.overlay__close');
      const link       = e.target.closest('a[href]');
      const subToggle  = e.target.closest('.overlay__item.has-sub > .overlay__link');

      if (closeEl || isBackdrop){ closeOverlay(); return; }

      if (subToggle){
        const li = subToggle.closest('.overlay__item');
        const expanded = subToggle.getAttribute('aria-expanded') === 'true';
        if (expanded){
          collapseSub(li);
        } else {
          closeAllSubmenus(li);
          expandSub(li);
        }
        return;
      }

      if (link){
        if (link.getAttribute('href') === '#') e.preventDefault();

        qsa('.overlay__item.is-active', overlay).forEach(el=>el.classList.remove('is-active'));
        const li = link.closest('.overlay__item');
        if (li) li.classList.add('is-active');

        setTimeout(closeOverlay, 10);
      }
    });

    document.addEventListener('keydown', (e)=>{
      if (!overlay.classList.contains('is-open')) return;
      const key = e.key;
      if (key === 'Escape'){ e.preventDefault(); closeOverlay(); return; }
      const links = getTopLevelLinks();
      const idx = links.indexOf(document.activeElement);
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End'){
        e.preventDefault();
        if (!links.length){ trapFocusKeydown(overlay, e); return; }
        let nextIndex = idx;
        if (key === 'Home') nextIndex = 0;
        else if (key === 'End') nextIndex = links.length - 1;
        else if (key === 'ArrowDown') nextIndex = idx < 0 ? 0 : (idx + 1) % links.length;
        else if (key === 'ArrowUp') nextIndex = idx <= 0 ? links.length - 1 : idx - 1;
        links[nextIndex].focus();
        return;
      }
      if ((key === 'Enter' || key === ' ') && document.activeElement && document.activeElement.matches('.overlay__item.has-sub > .overlay__link')){
        e.preventDefault();
        const li = document.activeElement.closest('.overlay__item');
        const expanded = document.activeElement.getAttribute('aria-expanded') === 'true';
        if (expanded){ collapseSub(li); } else { closeAllSubmenus(li); expandSub(li); }
        return;
      }
      trapFocusKeydown(overlay, e);
    });
  }

  const bottomBar = qs('#bottom-bar');
  const BB_THRESHOLD = Number((bottomBar && bottomBar.dataset.threshold) || 120);

  function updateBottomBar(){
    if (!bottomBar) return;
    const hiddenByLayers = body.classList.contains('nav-open') || body.classList.contains('modal-open');
    const shouldShow = window.scrollY > BB_THRESHOLD && !hiddenByLayers;
    bottomBar.classList.toggle('show', shouldShow);
  }

  document.addEventListener('DOMContentLoaded', updateBottomBar);
  window.addEventListener('scroll', updateBottomBar, { passive:true });
  window.addEventListener('resize', updateBottomBar, { passive:true });
  document.addEventListener('visibilitychange', updateBottomBar);

  document.addEventListener('click', (e)=>{
    if (e.target.closest('.site-header')) setTimeout(updateBottomBar, 0);
  });

  const modal           = qs('#reserve-modal');
  const reserveTriggers = qsa('.js-reserve');
  let lastFocusedModal  = null;

  function openModal(){
    if (!modal) return;
    if (modal.getAttribute('aria-hidden') === 'false') return;
    lastFocusedModal = document.activeElement;
    modal.setAttribute('aria-hidden','false');
    body.classList.add('modal-open');
    const firstControl = qs('input, button, [tabindex]:not([tabindex="-1"])', modal);
    (firstControl || qs('.modal__close', modal) || modal).focus();
    updateBottomBar();
  }

  function closeModal(){
    if (!modal) return;
    if (modal.getAttribute('aria-hidden') === 'true') return;
    modal.setAttribute('aria-hidden','true');
    body.classList.remove('modal-open');
    if (lastFocusedModal) lastFocusedModal.focus();
    updateBottomBar();
  }

  if (modal){
    const modalClose    = qs('.modal__close', modal);
    const modalBackdrop = qs('.modal__backdrop', modal);

    reserveTriggers.forEach(btn => btn.addEventListener('click', openModal));
    if (modalClose)    modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', (e)=>{ if (e.target === modalBackdrop || e.target.dataset.close) closeModal(); });

    document.addEventListener('keydown', (e)=>{
      if (modal.getAttribute('aria-hidden') === 'false'){
        if (e.key === 'Escape'){ e.preventDefault(); closeModal(); }
        else trapFocusKeydown(modal, e);
      }
    });
  }
})();


(() => {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;

    header.classList.toggle('is-glass', y > 0);

    if (y > lastY && y > 50) {
      header.classList.add('is-hidden');
    } else {
      header.classList.remove('is-hidden');
    }

    lastY = y;
  }

  document.addEventListener('DOMContentLoaded', onScroll);
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive:true });
})();

(() => {
  const wraps = Array.from(document.querySelectorAll('.custom-select'));
  if (!wraps.length) return;

  const getBtn   = w => w.querySelector('.custom-select__button');
  const getList  = w => w.querySelector('.custom-select__list');
  const getLabel = w => w.querySelector('.custom-select__label');
  const getOpts  = w => Array.from(w.querySelectorAll('.custom-select__option'));
  const getHidden = w => {
    const name = w.dataset.target;
    const form = w.closest('form') || document;
    return name ? form.querySelector(`input[type="hidden"][name="${CSS.escape(name)}"]`) : null;
  };

  function open(w){
    if (w.getAttribute('aria-expanded') === 'true') return;
    closeAll(w);
    w.setAttribute('aria-expanded','true');
    getBtn(w)?.setAttribute('aria-expanded','true');
    const sel = w.querySelector('.custom-select__option[aria-selected="true"]') || getOpts(w)[0];
    if (sel){ sel.focus(); sel.scrollIntoView({block:'nearest'}); }
  }
  function close(w){
    if (w.getAttribute('aria-expanded') === 'false') return;
    w.setAttribute('aria-expanded','false');
    getBtn(w)?.setAttribute('aria-expanded','false');
  }
  function closeAll(except){
    wraps.forEach(w => { if (w !== except) close(w); });
  }
  function selectOption(w, li){
    if (!li) return;
    getOpts(w).forEach(o => o.removeAttribute('aria-selected'));
    li.setAttribute('aria-selected','true');
    const text = li.textContent.trim();
    const val  = li.dataset.value ?? text;
    const hid  = getHidden(w);
    if (hid){
      hid.value = val;
      hid.dispatchEvent(new Event('change', { bubbles:true }));
    }
    const lbl = getLabel(w);
    if (lbl) lbl.textContent = text;
    close(w);
    getBtn(w)?.focus();
  }

  wraps.forEach(w => {
    if (w.dataset.csInit) return;
    w.dataset.csInit = '1';

    const btn  = getBtn(w);
    const list = getList(w);
    if (!btn || !list) return;
    getOpts(w).forEach(li => li.tabIndex = -1);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      (w.getAttribute('aria-expanded') === 'true') ? close(w) : open(w);
    });

    list.addEventListener('click', (e) => {
      const li = e.target.closest('.custom-select__option');
      if (li) selectOption(w, li);
    });

    btn.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === ' ' || k === 'Enter'){
        e.preventDefault(); open(w);
      } else if (k === 'Escape'){ close(w); }
    });

    list.addEventListener('keydown', (e) => {
      const k = e.key;
      const opts = getOpts(w);
      let i = opts.indexOf(document.activeElement);
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End'){
        e.preventDefault();
        if (i < 0) i = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
        if (k === 'ArrowDown') i = Math.min(opts.length - 1, (i < 0 ? 0 : i + 1));
        if (k === 'ArrowUp')   i = Math.max(0, (i < 0 ? 0 : i - 1));
        if (k === 'Home')      i = 0;
        if (k === 'End')       i = opts.length - 1;
        opts[i].focus(); opts[i].scrollIntoView({block:'nearest'});
      } else if (k === 'Enter' || k === ' '){
        e.preventDefault(); selectOption(w, document.activeElement.closest('.custom-select__option'));
      } else if (k === 'Escape'){
        e.preventDefault(); close(w); getBtn(w)?.focus();
      } else if (k === 'Tab'){ close(w); }
    });
  });

  document.addEventListener('click', (e) => {
    const openWrap = document.querySelector('.custom-select[aria-expanded="true"]');
    if (openWrap && !openWrap.contains(e.target)) close(openWrap);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      const openWrap = document.querySelector('.custom-select[aria-expanded="true"]');
      if (openWrap){ close(openWrap); getBtn(openWrap)?.focus(); }
    }
  });
})();

(() => {
  const qs  = (s, ctx=document) => ctx.querySelector(s);
  const qsa = (s, ctx=document) => Array.from((ctx||document).querySelectorAll(s));

  const modal       = qs('#reserve-modal');
  const modalForm   = modal ? qs('.modal__form', modal) : null;
  const sectionForm = qs('.reservation__form');
  const bottomBar   = qs('#bottom-bar');
  const footer      = qs('.footer');

  let lastTrigger = null;
  let lastScrollY = 0;

  function getValuesFromSection(){
    if (!sectionForm) return {};
    return {
      date:    qs('input[name="date"]',    sectionForm)?.value || '',
      time:    qs('input[name="time"]',    sectionForm)?.value || '',
      persons: qs('input[name="persons"]', sectionForm)?.value || ''
    };
  }

  function setCustomSelectValue(root, name, value, fallbackLabel){
    const hidden = qs(`input[type="hidden"][name="${name}"]`, root);
    const wrap   = qs(`.custom-select[data-target="${name}"]`, root);
    if (!wrap) return;
    const label  = qs('.custom-select__label', wrap);
    const opts   = qsa('.custom-select__option', wrap);
    let used = null;
    opts.forEach(li => {
      const isMatch = (li.dataset.value ?? li.textContent.trim()) === value && value !== '';
      li.toggleAttribute('aria-selected', !!isMatch);
      if (isMatch) used = li;
    });
    const text = used ? used.textContent.trim() : (fallbackLabel || (opts[0]?.textContent.trim() || ''));
    if (hidden) hidden.value = used ? (used.dataset.value ?? text) : (value || (opts[0]?.dataset.value || ''));
    if (label)  label.textContent = text;
  }

  function prefillModalFromSection(){
    if (!modalForm) return;
    const v = getValuesFromSection();
    if (v.date) qs('input[name="date"]', modalForm).value = v.date;
    setCustomSelectValue(modalForm, 'time',    v.time,    'Select time');
    setCustomSelectValue(modalForm, 'persons', v.persons, 'Select persons');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-reserve');
    if (!btn) return;
    lastTrigger = btn;
    lastScrollY = window.scrollY;
  }, { capture:false, passive:true });

  if (modal){
    const mo = new MutationObserver(() => {
      if (modal.getAttribute('aria-hidden') === 'false'){
        prefillModalFromSection();
      }
    });
    mo.observe(modal, { attributes:true, attributeFilter:['aria-hidden'] });
  }

  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }
  function validPhone(v){
    const s = v.replace(/[^\d+]/g,'');
    return /^(\+?\d{7,15})$/.test(s);
  }
  function markValid(el, ok, msg){
    el.classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    el.title = ok ? '' : msg;
    return ok;
  }

  if (modalForm){
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const f = modalForm;
      const date    = qs('input[name="date"]',    f);
      const phone   = qs('input[name="phone"]',   f);
      const email   = qs('input[name="email"]',   f);
      const time    = qs('input[name="time"]',    f);
      const persons = qs('input[name="persons"]', f);

      const okDate    = markValid(date,  !!date.value.trim(), 'Please enter a date');
      const okPhone   = markValid(phone, validPhone(phone.value), 'Please enter a valid phone number');
      const okEmail   = markValid(email, validEmail(email.value), 'Please enter a valid email');
      const okTime    = !!time.value;
      const okPersons = !!persons.value;

      if (!(okDate && okPhone && okEmail && okTime && okPersons)) return;

      if (sectionForm){
        const secDate = qs('input[name="date"]',    sectionForm);
        const secTime = qs('input[name="time"]',    sectionForm);
        const secPers = qs('input[name="persons"]', sectionForm);
        if (secDate) secDate.value = date.value;
        if (secTime) secTime.value = time.value;
        if (secPers) secPers.value = persons.value;

        setCustomSelectValue(sectionForm, 'time',    time.value);
        setCustomSelectValue(sectionForm, 'persons', persons.value);
      }

      const evt = new Event('keydown'); evt.key = 'Escape';
      document.dispatchEvent(evt);

      if (lastTrigger && lastTrigger.scrollIntoView){
        lastTrigger.scrollIntoView({ block:'center', behavior:'smooth' });
      } else {
        window.scrollTo({ top:lastScrollY, behavior:'smooth' });
      }

      showToast('Дякуємо, ми вам скоро перетелефонуємо');
    });
  }

  function showToast(text){
    let t = qs('#app-toast');
    if (!t){
      t = document.createElement('div');
      t.id = 'app-toast';
      t.className = 'toast';
      t.setAttribute('role','status');
      t.setAttribute('aria-live','polite');
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(() => t.classList.remove('show'), 3500);
  }

  if (bottomBar){
    const footerObserver = new IntersectionObserver((entries) => {
      const en = entries[0];
      bottomBar.classList.toggle('hide', !!en.isIntersecting);
    }, { root:null, threshold:0.01 });
    if (footer) footerObserver.observe(footer);
  }
})();

(() => {
  const wrap   = document.getElementById('testimonials');
  if (!wrap) return;

  const quoteEl   = wrap.querySelector('.testimonial p');
  const avatarEl  = wrap.querySelector('.author__avatar');
  const nameEl    = wrap.querySelector('.author__name');
  const roleEl    = wrap.querySelector('.author__role');

  const prevBtn   = document.querySelector('.testimonials__prev');
  const nextBtn   = document.querySelector('.testimonials__next');
  const currentEl = document.querySelector('.testimonials__counter .current');
  const totalEl   = document.querySelector('.testimonials__counter .total');

  const slides = [
    {
      text: '“ Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus lorem id penatibus imperdiet. Turpis egestas ultricies purus Lorem ipsum dolor sit amet.”',
      name: 'John Doe',
      role: 'Blogger',
      avatar: 'assets/img/avatar-1.png'
    },
    {
      text: '“ Tasty, seasonal and always fresh. Service was lovely and we will definitely come back again!”',
      name: 'Dianne Russell',
      role: 'Food editor',
      avatar: 'assets/img/avatar-dianne.png'
    },
    {
      text: '“ Simple menu, premium ingredients. Best salad and coffee combo I had this year.”',
      name: 'Julie Christie',
      role: 'Photographer',
      avatar: 'assets/img/avatar-julie.png'
    }
  ];

  let i = 0;
  totalEl && (totalEl.textContent = String(slides.length));

  function render(idx){
    const s = slides[idx];
    wrap.classList.add('is-fading');
    requestAnimationFrame(() => {
      quoteEl.textContent  = s.text;
      nameEl.textContent   = s.name;
      roleEl.textContent   = s.role;
      avatarEl.src         = s.avatar;
      avatarEl.alt         = s.name;
      currentEl && (currentEl.textContent = String(idx + 1));
      requestAnimationFrame(() => wrap.classList.remove('is-fading'));
    });
  }

  function go(n){
    i = (i + n + slides.length) % slides.length;
    render(i);
  }

  nextBtn && nextBtn.addEventListener('click', () => go(1));
  prevBtn && prevBtn.addEventListener('click', () => go(-1));

  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  let sx = 0, dx = 0;
  wrap.addEventListener('touchstart', (e)=>{ sx = e.touches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchmove',  (e)=>{ dx = e.touches[0].clientX - sx; }, {passive:true});
  wrap.addEventListener('touchend',   ()=>{ if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); sx = dx = 0; });

  render(i);
})();
