document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('open'))
    );
  }

  // Highlight the section currently in view in the sticky case-study nav.
  const csLinks = document.querySelectorAll('.cs-nav a');
  const targets = [...csLinks]
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (targets.length) {
    const setActive = (id) => {
      csLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    };

    const spy = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-130px 0px -60% 0px', threshold: 0 });

    targets.forEach(t => spy.observe(t));
    setActive(targets[0].id);
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
