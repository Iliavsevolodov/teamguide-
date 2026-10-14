/* #СуперГерои — small, dependency-free interactive guide */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const toastNode = $('#toast');
  let toastTimer;

  function toast(message) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastNode.classList.remove('show'), 2600);
  }

  async function copyText(value) {
    if (!value || !value.trim()) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value.trim());
      } else {
        const field = document.createElement('textarea');
        field.value = value.trim();
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(field);
        field.select();
        const success = document.execCommand('copy');
        field.remove();
        if (!success) throw new Error('clipboard unavailable');
      }
      toast('✓ Текст скопирован. Адаптируй его под человека!');
    } catch (error) {
      toast('Не удалось скопировать автоматически — выдели текст вручную.');
    }
  }

  $$('[data-copy-target]').forEach(button => {
    button.addEventListener('click', () => {
      const element = document.getElementById(button.dataset.copyTarget);
      if (element) copyText(element.innerText || element.textContent);
    });
  });

  // Two personalized voice-message examples, with accessible tabs.
  const tabs = $$('.tab[role="tab"]');
  const panels = $$('.tab-panel');
  let activeScript = 'voice-pro';

  function setTab(id, focus = false) {
    if (!document.getElementById(id)) return;
    activeScript = id;
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === id;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next].dataset.tab, true);
    });
  });

  $('[data-copy-active-script]')?.addEventListener('click', () => {
    const script = document.getElementById(activeScript);
    if (script) copyText(script.innerText || script.textContent);
  });

  // Safe local progress persistence. Works even when storage is unavailable.
  function stored(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value.map(String) : fallback;
    } catch (_) { return fallback; }
  }
  function persist(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function initTracker(selector, dataKey, storageKey, counterSelector, onUpdate) {
    const inputs = $$('input[' + dataKey + ']', $(selector));
    const selected = new Set(stored(storageKey, []));
    inputs.forEach(input => {
      input.checked = selected.has(input.getAttribute(dataKey));
      input.addEventListener('change', () => {
        const id = input.getAttribute(dataKey);
        if (input.checked) selected.add(id);
        else selected.delete(id);
        persist(storageKey, Array.from(selected));
        update();
      });
    });
    function update() {
      const count = inputs.filter(input => input.checked).length;
      const counter = $(counterSelector);
      if (counter) counter.textContent = String(count);
      if (onUpdate) onUpdate(count, inputs.length);
    }
    update();
    return {inputs, update};
  }

  initTracker('#plan', 'data-day', 'superheroes-guide-days-v1', '#plan-count', (count, total) => {
    const progress = $('#plan-progress');
    if (progress) {
      progress.setAttribute('aria-valuenow', String(count));
      const bar = $('span', progress);
      if (bar) bar.style.width = ((count / total) * 100) + '%';
    }
    if (count === total && !sessionStorage.getItem('superheroes-days-complete')) {
      toast('⚡ Все 7 дней выполнены! Отличная работа.');
      try { sessionStorage.setItem('superheroes-days-complete', '1'); } catch (_) {}
    }
  });

  const checklist = initTracker('#checklist', 'data-check', 'superheroes-guide-checklist-v1', '#check-count', (count, total) => {
    const status = $('#check-status');
    if (status) status.textContent = count === total ? '✓ Готово! Приглашение прошло проверку.' : count === 0 ? 'Отмечай пункты по мере готовности' : 'Осталось проверить: ' + (total - count);
  });

  $('#reset-checks')?.addEventListener('click', () => {
    checklist.inputs.forEach(input => { input.checked = false; });
    persist('superheroes-guide-checklist-v1', []);
    checklist.update();
    toast('Чек-лист сброшен.');
  });

  // Mobile navigation drawer.
  const menu = $('#mobile-menu');
  const menuButton = $('#mobile-menu-button');
  const closeButton = $('#close-mobile-menu');
  const bottomMenuButton = $('#mobile-bottom-menu');
  let lastFocused = null;

  function openMenu() {
    if (!menu) return;
    lastFocused = document.activeElement;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    menuButton?.setAttribute('aria-expanded', 'true');
    closeButton?.focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  menuButton?.addEventListener('click', openMenu);
  bottomMenuButton?.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', closeMenu);
  $$('.mobile-menu-list a').forEach(link => link.addEventListener('click', () => {
    closeMenu();
    // Native hash-link navigation continues normally.
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
    if (event.key !== 'Tab' || !menu || menu.hidden) return;
    const tabbables = $$('button:not([disabled]),a[href]', menu);
    if (!tabbables.length) return;
    const first = tabbables[0], last = tabbables[tabbables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Live chapter marker and reading progress.
  const chapters = $$('.chapter[data-chapter]');
  const sectionLinks = $$('.section-nav a');
  const mobileCurrent = $('#mobile-current');
  const progressBar = $('#reading-progress');
  const labels = {
    philosophy: 'ГЛАВНЫЙ ПРИНЦИП',
    formula: 'ФОРМУЛА ПРИГЛАШЕНИЯ',
    voice: 'ГОЛОСОВЫЕ СКРИПТЫ',
    messages: 'ПЕРВОЕ СООБЩЕНИЕ',
    start: 'С ЧЕГО НАЧАТЬ',
    objections: 'ВОЗРАЖЕНИЯ',
    route: 'ПУТЬ ЧЕЛОВЕКА',
    plan: 'ПЛАН НА 7 ДНЕЙ',
    checklist: 'ЧЕК-ЛИСТ',
    final: 'КОД КОМАНДЫ'
  };
  let rafPending = false;

  function updateScroll() {
    rafPending = false;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.max(0, Math.min(100, (window.scrollY / maxScroll) * 100));
    if (progressBar) progressBar.style.width = progress.toFixed(2) + '%';
    const threshold = window.innerHeight * .33;
    let current = chapters[0];
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top <= threshold) current = chapter;
    }
    if (!current) return;
    sectionLinks.forEach(link => {
      const isActive = link.getAttribute('href') === '#' + current.id;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (mobileCurrent) mobileCurrent.textContent = current.dataset.chapter + ' / ' + (labels[current.id] || 'ГАЙД');
  }
  window.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateScroll);
    }
  }, {passive:true});
  window.addEventListener('resize', updateScroll, {passive:true});
  updateScroll();

  // Browser-native Save as PDF, no third-party services.
  $('#print-guide')?.addEventListener('click', () => window.print());
})();
