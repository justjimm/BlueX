
(function(){
  const btn = document.querySelector('[data-menu-btn]');
  const panel = document.querySelector('[data-menu-panel]');
  if(btn && panel){
    btn.addEventListener('click', () => {
      panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false');
    });
  }
})();
