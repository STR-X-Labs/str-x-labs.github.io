const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const map=L.map('map',{scrollWheelZoom:false,worldCopyJump:true}).setView([15,-70],3);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles &copy; Esri',maxZoom:16}).addTo(map);
const sites=[
 {ll:[30.2645,-81.4413],hub:1,t:'Mayo Clinic · Jacksonville, FL',d:'STR-X hub and ASTRAL studio<br>Dr W. David Freeman · Dr Giselle Coelho'},
 {ll:[41.8963,-87.6219],t:"Northwestern / Lurie Children's · Chicago",d:'Dr Sandi K. Lam<br>Pediatric neurosurgery'},
 {ll:[-1.4430,-48.4800],t:'Santa Casa do Pará · Belém, Brazil',d:'Dr Simone Rogério<br>Pediatric neurosurgery<br><a href="https://www.instagram.com/simonerogerio" target="_blank" rel="noopener">@simonerogerio</a>'},
 {ll:[29.4558,-98.4251],img:'assets/levi-howard.jpg',t:'Brooke Army Medical Center · San Antonio, TX',d:'Dr Levi Howard'}];
const pts=[];
sites.forEach(s=>{const m=L.marker(s.ll,{icon:L.divIcon({className:'',html:`<div class="glow${s.hub?' hub':''}"></div>`,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map);
 m.bindPopup(`<div class="pop">${s.img?`<img src="${s.img}" alt="">`:''}<div><b>${s.t}</b><br>${s.d}</div></div>`);pts.push(s.ll);
 if(!s.hub)L.polyline([sites[0].ll,s.ll],{color:'#22d3ee',weight:1,opacity:.5,dashArray:'4 6'}).addTo(map);});
map.fitBounds(pts,{padding:[60,60]});
