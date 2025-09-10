/* =========================================================
   CLEAN JS — Accessible, mobile‑first, conflict‑free
   – One source of truth for:
     • Header burger + full‑screen nav overlay (with focus trap)
     • Sticky bottom bar
     • Reservation modal (with focus trap)
   – Event delegation, guards, no duplicate listeners
   – ARIA updates + graceful no‑JS fallback
   ========================================================= */
(function(){
  'use strict';

  /* ----------------------- Helpers ----------------------- */
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

  /* -------------------- Header / Overlay ------------------ */
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
      void sub.offsetHeight; // reflow
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
    // Reset active states and collapse submenus
    qsa('.overlay__item.is-active', overlay).forEach(el => el.classList.remove('is-active'));
    qsa('.overlay__item.has-sub > .overlay__link[aria-expanded="true"]', overlay)
      .forEach(btn => btn.setAttribute('aria-expanded','false'));
    closeAllSubmenus();
    // Scrollbar compensation (desktop)
    const sw = window.innerWidth - document.documentElement.clientWidth;
    if (sw > 0) body.style.paddingRight = sw + 'px';
    updateBottomBar();
  }

  function resetOverlayState(){
    if (!overlay) return;
    qsa('.overlay__item.is-active', overlay).forEach(el => el.classList.remove('is-active'));
    // згорнути всі підменю
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

    // СКИДАЄМО стан меню при кожному закритті
    resetOverlayState();

    if (lastFocusedOverlay) lastFocusedOverlay.focus();
    body.style.paddingRight = '';
    updateBottomBar();
  }

  function toggleOverlay(){
    if (!overlay) return;
    overlay.classList.contains('is-open') ? closeOverlay() : openOverlay();
  }

  // Init header listeners (guarded)
  if (burger && overlay){
    burger.addEventListener('click', toggleOverlay);

    // ONE delegated click handler for overlay
    overlay.addEventListener('click', (e)=>{
      const isBackdrop = e.target === overlay;
      const closeEl    = e.target.closest('.overlay__close');
      const link       = e.target.closest('a[href]');
      const subToggle  = e.target.closest('.overlay__item.has-sub > .overlay__link');

      if (closeEl || isBackdrop){ closeOverlay(); return; }

      // відкриття/закриття підменю
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

      // клік по посиланню
      if (link){
        // не “стрибаємо” на верх для фейкових посилань
        if (link.getAttribute('href') === '#') e.preventDefault();

        // підсвічуємо тільки обраний пункт у поточній сесії
        qsa('.overlay__item.is-active', overlay).forEach(el=>el.classList.remove('is-active'));
        const li = link.closest('.overlay__item');
        if (li) li.classList.add('is-active');

        setTimeout(closeOverlay, 10);
      }
    });

    // Keyboard handling for overlay
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

  /* -------------------- Sticky Bottom Bar ----------------- */
  const bottomBar = qs('#bottom-bar');
  const BB_THRESHOLD = Number((bottomBar && bottomBar.dataset.threshold) || 120);

  function updateBottomBar(){
    if (!bottomBar) return;
    const hiddenByLayers = body.classList.contains('nav-open') || body.classList.contains('modal-open');
    const shouldShow = window.scrollY > BB_THRESHOLD && !hiddenByLayers;
    bottomBar.classList.toggle('show', shouldShow);
  }

  // Initial + scroll/resize/visibility
  document.addEventListener('DOMContentLoaded', updateBottomBar);
  window.addEventListener('scroll', updateBottomBar, { passive:true });
  window.addEventListener('resize', updateBottomBar, { passive:true });
  document.addEventListener('visibilitychange', updateBottomBar);

  // Clicks in header may affect layout → recalc soon after
  document.addEventListener('click', (e)=>{
    if (e.target.closest('.site-header')) setTimeout(updateBottomBar, 0);
  });

  /* -------------------- Reservation Modal ----------------- */
  const modal           = qs('#reserve-modal');
  const reserveTriggers = qsa('.js-reserve');
  let lastFocusedModal  = null;

  function openModal(){
    if (!modal) return;
    if (modal.getAttribute('aria-hidden') === 'false') return;
    lastFocusedModal = document.activeElement;
    modal.setAttribute('aria-hidden','false');
    body.classList.add('modal-open');
    // Focus the first control or the close button
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

    // Keyboard handling for modal
    document.addEventListener('keydown', (e)=>{
      if (modal.getAttribute('aria-hidden') === 'false'){
        if (e.key === 'Escape'){ e.preventDefault(); closeModal(); }
        else trapFocusKeydown(modal, e);
      }
    });
  }
})();
