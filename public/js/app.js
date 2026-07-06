document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navbar-nav .nav-link[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '/logout' || href.startsWith('http')) return;
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
});
