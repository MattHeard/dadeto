(function () {
  const toggle = document.querySelector('.menu-toggle');
  const overlay = document.getElementById('mobile-menu');
  if (!toggle || !overlay) return;
  const sheet = overlay.querySelector('.menu-sheet');
  const closeBtn = overlay.querySelector('.menu-close');

  /**
   *
   */
  function openMenu() {
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const first = sheet.querySelector('a,button,[tabindex="0"]');
    if (first) first.focus();
  }

  /**
   *
   */
  function closeMenu() {
    overlay.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => (overlay.hidden = true), 180);
    toggle.focus();
  }

  toggle.addEventListener('click', () =>
    overlay.hidden ? openMenu() : closeMenu()
  );
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeMenu();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) closeMenu();
  });
})();
