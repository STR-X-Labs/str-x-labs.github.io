// STR-X sites globe (approach adapted from SAHVERA globe.js) — d3-geo orthographic projection on <canvas>
(function () {
    const canvas = document.getElementById('globe');
    if (!canvas || !window.d3 || !window.topojson) return;

    const ctx = canvas.getContext('2d');
    const labelEl = document.getElementById('globeLabel');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sites: [lon, lat]
    const SITES = {
        jax:  { name: 'Mayo Clinic · Jacksonville (hub)', ll: [-81.4413, 30.2645], kind: 'hub' },
        chi:  { name: "Northwestern / Lurie Children's · Chicago", ll: [-87.6219, 41.8963], kind: 'site' },
        bel:  { name: 'Santa Casa do Pará · Belém, Brazil', ll: [-48.48, -1.443], kind: 'site' },
        bamc: { name: 'Brooke Army Medical Center · San Antonio', ll: [-98.4251, 29.4558], kind: 'site' }
    };
    const COLORS = { hub: '#ffffff', site: '#22d3ee', node: '#9fd8ff' };
    const ARCS = [['jax','chi'],['jax','bel'],['jax','bamc']];

    let land = null;
    let size = 0, dpr = 1;
    const projection = d3.geoOrthographic().clipAngle(90).precision(0.5);
    const path = d3.geoPath(projection, ctx);
    const graticule = d3.geoGraticule10();
    const sphere = { type: 'Sphere' };

    let rotation = [78, -15, 0]; // start facing the Atlantic / Americas
    let dragging = false, lastX = 0, lastY = 0;
    let flyTo = null;
    let hovered = null;
    let idleSince = performance.now();
    let focusKey = null;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        size = w;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(w * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        projection.translate([w / 2, w / 2]).scale(w / 2 - 14);
    }

    function visible(ll) {
        // point is on the visible hemisphere if its angular distance from the view centre < 90deg
        const c = projection.invert([size / 2, size / 2]);
        return d3.geoDistance(ll, c) < Math.PI / 2 - 0.02;
    }

    function draw(t) {
        projection.rotate(rotation);
        ctx.clearRect(0, 0, size, size);

        // atmosphere glow
        const r = projection.scale();
        const g = ctx.createRadialGradient(size / 2, size / 2, r * 0.95, size / 2, size / 2, r * 1.12);
        g.addColorStop(0, 'rgba(34,211,238,0.35)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(size / 2, size / 2, r * 1.12, 0, Math.PI * 2); ctx.fill();

        // ocean
        const og = ctx.createRadialGradient(size * 0.4, size * 0.38, r * 0.1, size / 2, size / 2, r);
        og.addColorStop(0, '#0b2a5c');
        og.addColorStop(1, '#030a1f');
        ctx.beginPath(); path(sphere); ctx.fillStyle = og; ctx.fill();

        // graticule
        ctx.beginPath(); path(graticule);
        ctx.strokeStyle = 'rgba(120,200,255,0.12)'; ctx.lineWidth = 0.6; ctx.stroke();

        // land
        if (land) {
            ctx.beginPath(); path(land);
            ctx.fillStyle = '#123f7a'; ctx.fill();
            ctx.strokeStyle = 'rgba(180,230,255,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();
        }

        // rim
        ctx.beginPath(); path(sphere);
        ctx.strokeStyle = 'rgba(0,212,255,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();

        // arcs (great circles) with travelling pulse
        ARCS.forEach(([a, b], i) => {
            const line = { type: 'LineString', coordinates: [SITES[a].ll, SITES[b].ll] };
            ctx.beginPath(); path(line);
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([4, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (!reduceMotion) {
                const interp = d3.geoInterpolate(SITES[a].ll, SITES[b].ll);
                const p = ((t / 3200) + i * 0.23) % 1;
                const ll = interp(p);
                if (visible(ll)) {
                    const [x, y] = projection(ll);
                    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8; ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        });

        // markers
        Object.keys(SITES).forEach(key => {
            const s = SITES[key];
            if (!visible(s.ll)) return;
            const [x, y] = projection(s.ll);
            const col = COLORS[s.kind];
            const base = s.kind === 'node' ? 3.5 : 5.5;
            const active = key === hovered || key === focusKey;

            // pulse
            if (!reduceMotion && s.kind !== 'node') {
                const ph = ((t / 1600) + key.length * 0.13) % 1;
                ctx.beginPath(); ctx.arc(x, y, base + ph * 16, 0, Math.PI * 2);
                ctx.strokeStyle = col; ctx.globalAlpha = 0.6 * (1 - ph); ctx.lineWidth = 1.5; ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.beginPath(); ctx.arc(x, y, base + (active ? 2.5 : 0), 0, Math.PI * 2);
            ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        });
    }

    function setLabel(key) {
        if (!labelEl) return;
        if (key) { labelEl.textContent = SITES[key].name; labelEl.classList.add('show'); }
        else { labelEl.classList.remove('show'); }
    }

    function pick(x, y) {
        let best = null, bd = 18;
        Object.keys(SITES).forEach(key => {
            if (!visible(SITES[key].ll)) return;
            const [px, py] = projection(SITES[key].ll);
            const d = Math.hypot(px - x, py - y);
            if (d < bd) { bd = d; best = key; }
        });
        return best;
    }

    function rel(e) {
        const r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) * (size / r.width), (e.clientY - r.top) * (size / r.height)];
    }

    // Drag to rotate
    canvas.addEventListener('pointerdown', e => {
        dragging = true; lastX = e.clientX; lastY = e.clientY; flyTo = null;
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        if (dragging) {
            const k = 0.28;
            rotation[0] += (e.clientX - lastX) * k;
            rotation[1] = Math.max(-80, Math.min(80, rotation[1] - (e.clientY - lastY) * k));
            lastX = e.clientX; lastY = e.clientY;
            idleSince = performance.now();
        } else {
            const [x, y] = rel(e);
            hovered = pick(x, y);
            canvas.style.cursor = hovered ? 'pointer' : '';
            setLabel(hovered || focusKey);
        }
    });
    const endDrag = e => { dragging = false; idleSince = performance.now(); };
    canvas.addEventListener('pointerup', e => {
        const moved = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        endDrag(e);
        const [x, y] = rel(e);
        const k = pick(x, y);
        if (k && moved < 4) focus(k, true);
    });
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => { hovered = null; setLabel(focusKey); });

    // Fly to a site
    function focus(key, scrollCard) {
        focusKey = key;
        const [lon, lat] = SITES[key].ll;
        flyTo = {
            from: rotation.slice(),
            to: [-lon, -lat * 0.8 , 0],
            start: performance.now(), dur: 1100
        };
        setLabel(key);
        document.querySelectorAll('.site').forEach(el => {
            el.classList.toggle('is-focus', el.dataset.site === key);
        });
        if (scrollCard) {
            const card = document.querySelector('.site[data-site="' + key + '"]');
            if (card && !card.classList.contains('is-hidden')) {
                card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        }
    }
    document.querySelectorAll('.fly').forEach(btn => {
        btn.addEventListener('click', () => {
            focus(btn.dataset.fly, false);
            document.getElementById('globe').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        });
    });

    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function shortestLon(a, b) { let d = ((b - a + 540) % 360) - 180; return a + d; }

    function frame(t) {
        if (flyTo) {
            const p = Math.min(1, (t - flyTo.start) / flyTo.dur);
            const e = ease(p);
            const lonTo = shortestLon(flyTo.from[0], flyTo.to[0]);
            rotation[0] = flyTo.from[0] + (lonTo - flyTo.from[0]) * e;
            rotation[1] = flyTo.from[1] + (flyTo.to[1] - flyTo.from[1]) * e;
            if (p >= 1) { flyTo = null; idleSince = performance.now() + 4000; }
        } else if (!dragging && !reduceMotion && t - idleSince > 1500 && !focusKey) {
            rotation[0] += 0.12; // gentle auto-rotation
        }
        draw(t);
        requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize();

    (window.LAND ? Promise.resolve(window.LAND) : fetch('data/land-110m.json').then(r => r.json()))
        .then(topo => { land = topojson.feature(topo, topo.objects.land); })
        .catch(() => { /* graticule-only globe if data cannot load (e.g. file://) */ });

    requestAnimationFrame(frame);
})();
