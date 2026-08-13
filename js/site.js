document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  toggle.addEventListener('click', () => nav.classList.toggle('open'));
  navLinks.forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

  const sections = document.querySelectorAll('main section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  const roles = ['Data Analyst', 'Data Enthusiast', 'Problem Solver'];
  const roleEl = document.getElementById('heroRole');
  if (roleEl) {
    let ri = 0, ci = 0, deleting = false;
    const tick = () => {
      const word = roles[ri];
      ci += deleting ? -1 : 1;
      roleEl.firstChild.textContent = word.slice(0, ci);
      if (!deleting && ci === word.length) { deleting = true; setTimeout(tick, 1400); return; }
      if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % roles.length; }
      setTimeout(tick, deleting ? 40 : 80);
    };
    tick();
  }

  const reveals = document.querySelectorAll('.reveal');
  const ro = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        ro.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(el => ro.observe(el));

  const counters = document.querySelectorAll('.hero-stats .num');
  const co = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      let cur = 0;
      const step = Math.max(1, Math.round(target / 30));
      const run = () => {
        cur = Math.min(target, cur + step);
        el.textContent = cur + (el.dataset.suffix || '');
        if (cur < target) requestAnimationFrame(run);
      };
      run();
      co.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach(el => co.observe(el));
});
