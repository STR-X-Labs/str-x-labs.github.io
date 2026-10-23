const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
