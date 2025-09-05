// Початковий JS (нічого критичного для валідації)
// Лише готуємо хук для бургер-меню (реалізація — на кроці 5)
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

if (toggle && nav){
  toggle.addEventListener('click', () => {
    const open = nav.getAttribute('data-open') === 'true';
    nav.setAttribute('data-open', String(!open));
    toggle.setAttribute('aria-expanded', String(!open));
  });
}


/* Debug grid overlay: натисни 'g' для вкл/викл */
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
    document.documentElement.classList.toggle('debug-grid');
  }
});
