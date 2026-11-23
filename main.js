const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.08,rootMargin:'80px 0px'});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

(function navMenu(){
  const toggle=document.querySelector('.menu-toggle');
  const menu=document.getElementById('site-menu');
  if(!toggle||!menu) return;

  const setOpen=open=>{
    document.body.classList.toggle('menu-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    if(open) toggle.focus();
  };

  toggle.addEventListener('click',()=>setOpen(!document.body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') setOpen(false);
  });
})();
