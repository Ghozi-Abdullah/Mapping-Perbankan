// Panggung logo bank yang melayang dan berputar dalam ruang 3D (CSS perspective).
// Layar lebar: kartu mengorbit di sekeliling judul tanpa menutupinya.
// Layar sempit: kartu tersusun di dua cincin silinder yang berputar dan bisa digeser.
// Tiap kartu berupa lempeng tebal: sisi depan logo dan nama, sisi belakang angka utama.
// Gerakan berhenti bila pengguna memilih "kurangi gerakan".

import { esc } from './kit.js';

const LOGO = (domain, size = 128) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
const LOGO_ALT = (domain) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
export const initials = (name) => {
  const words = name.replace(/^bank\s+/i, '').split(/\s+/).filter(Boolean);
  // Singkatan pendek (BRI, BCA, bjb) dipakai utuh supaya tidak tertukar; nama lain diambil huruf awalnya.
  if (words.length === 1 && words[0].length <= 4) return words[0].toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
};

/** Gambar logo dengan cadangan: ikon resmi situs bank, lalu inisial bila ikon tidak tersedia. */
export function logoImg(b, size = 128, cls = 'logo') {
  return `<span class="${cls}" data-initials="${esc(initials(b.nama))}"><img src="${LOGO(b.domain, size)}" data-alt="${LOGO_ALT(b.domain)}" alt="Logo ${esc(b.nama)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>`;
}
/** Pasang penanganan gagal-muat untuk semua logo di dalam root. */
export function wireLogos(root) {
  root.querySelectorAll('[data-initials] > img:not([data-wired])').forEach((img) => {
    img.dataset.wired = '1';
    const fail = () => {
      if (img.dataset.alt && img.src !== img.dataset.alt) { img.src = img.dataset.alt; img.dataset.alt = ''; return; }
      img.parentElement?.classList.add('mono');
      img.remove();
    };
    img.addEventListener('error', fail);
    // Layanan ikon mengembalikan bola dunia 16 px bila situs tidak punya ikon: anggap gagal.
    img.addEventListener('load', () => { if (img.naturalWidth && img.naturalWidth < 24) fail(); });
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
  });
}

const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const SLABS = [-3.75, -2.5, -1.25, 0, 1.25, 2.5, 3.75];

/**
 * host: wadah ruang 3D. keep: elemen judul yang tidak boleh tertutup (opsional).
 * Mengembalikan { focus(grup|null) } untuk meredupkan bank di luar kelompok terpilih.
 */
export function orbit(host, banks, { onPick, back, keep = null }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.innerHTML = `<div class="orbit-stage">${banks.map((b, i) => `
    <button class="tile" type="button" data-kode="${esc(b.kode)}" data-grup="${esc(b.grup)}" style="--i:${i}" aria-label="${esc(b.nama)}: lihat laporan">
      ${SLABS.map((z) => `<span class="slab" style="transform:translateZ(${z}px)"></span>`).join('')}
      <span class="face front">${logoImg(b)}<b>${esc(b.nama)}</b></span>
      <span class="face back">${back(b)}</span>
    </button>`).join('')}</div>`;
  wireLogos(host);
  const stage = host.querySelector('.orbit-stage');
  const tiles = [...host.querySelectorAll('.tile')];
  const r = rand(11);

  const items = tiles.map((el, i) => ({
    el, i,
    angle: (i / tiles.length) * Math.PI * 2 + (r() - 0.5) * 0.3,
    ring: 0.8 + r() * 0.24,
    z: -240 + r() * 320,
    ax: 10 + r() * 18, ay: 8 + r() * 14,
    fx: 0.18 + r() * 0.22, fy: 0.16 + r() * 0.2,
    ph: r() * Math.PI * 2,
    spin: (0.05 + r() * 0.05) * (r() > 0.5 ? 1 : -1),
    rot: r() * 360, hover: 0, hovered: false, dim: 0, dimTo: 0
  }));

  // Ukuran ruang dan kotak judul (relatif terhadap pusat ruang).
  let W = 0; let H = 0; let tw = 0; let th = 0; let box = null; let mode = 'ring'; let P = 1100;
  const measure = () => {
    W = host.clientWidth;
    H = host.clientHeight;
    P = parseFloat(getComputedStyle(host).perspective) || 1100;
    tw = tiles[0]?.offsetWidth || 120;
    th = tiles[0]?.offsetHeight || 140;
    box = null;
    mode = 'carousel';
    if (keep) {
      const hb = host.getBoundingClientRect();
      // Kotak gabungan isi judul (bukan wadahnya, yang bisa selebar panggung).
      const rs = [...keep.children].map((c) => c.getBoundingClientRect()).filter((x) => x.width && x.height);
      const kb = rs.length ? {
        left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)),
        top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom))
      } : keep.getBoundingClientRect();
      const overlaps = kb.bottom > hb.top && kb.top < hb.bottom;
      if (overlaps) {
        const cx = hb.left + hb.width / 2;
        const cy = hb.top + hb.height / 2;
        const m = 18;
        // Setengah lebar dan tinggi isi judul di layar, ditambah jarak aman.
        box = {
          x: Math.max(Math.abs(kb.left - cx), Math.abs(kb.right - cx)) + m,
          y: Math.max(Math.abs(kb.top - cy), Math.abs(kb.bottom - cy)) + m
        };
        mode = 'ring';
        // Pastikan ruang cukup tinggi supaya kartu di atas dan di bawah judul tidak terpotong.
        const need = Math.ceil(2 * (box.y + th * 1.3 + 16));
        if (H < need) { host.style.minHeight = `${need}px`; H = need; }
      }
    }
    if (mode === 'carousel') host.style.minHeight = '';
    host.dataset.mode = mode;
  };
  measure();
  new ResizeObserver(measure).observe(host);
  document.fonts?.ready.then(measure);

  // Arah pandang mengikuti kursor; di layar sentuh, geser untuk memutar silinder.
  let mx = 0; let my = 0;
  let spinVel = 0; let base = 0; let drag = null; let moved = false;
  host.addEventListener('pointermove', (e) => {
    const b = host.getBoundingClientRect();
    mx = (e.clientX - b.left) / b.width - 0.5;
    my = (e.clientY - b.top) / b.height - 0.5;
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(e.clientX - drag.x0) > 6) moved = true;
      base += dx * 0.009;
      spinVel = dx * 0.009 / Math.max(0.016, (e.timeStamp - drag.t) / 1000);
      drag.x = e.clientX;
      drag.t = e.timeStamp;
    }
  });
  host.addEventListener('pointerdown', (e) => {
    if (mode !== 'carousel') return;
    drag = { x: e.clientX, x0: e.clientX, t: e.timeStamp };
    moved = false;
  });
  const endDrag = () => { drag = null; };
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);
  host.addEventListener('pointerleave', () => { mx = 0; my = 0; endDrag(); });
  items.forEach((it) => {
    const on = () => { it.hovered = true; };
    const off = () => { it.hovered = false; };
    it.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
    it.el.addEventListener('pointerleave', off);
    it.el.addEventListener('focus', on);
    it.el.addEventListener('blur', off);
    it.el.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); moved = false; return; }
      onPick(it.el.dataset.kode);
    });
  });

  let visible = true;
  new IntersectionObserver(([en]) => {
    const was = visible;
    visible = en.isIntersecting;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(host);

  let last = performance.now();
  let tiltX = 0; let tiltY = 0;
  const clamp = (v, a) => Math.max(-a, Math.min(a, v));
  function frame(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    tiltX += ((mode === 'ring' ? my * -8 : -6) - tiltX) * 0.06;
    tiltY += ((mode === 'ring' ? mx * 12 : 0) - tiltY) * 0.06;
    stage.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    if (mode === 'carousel' && !drag) {
      spinVel *= Math.pow(0.04, dt);
      base += (reduce ? 0 : 0.22) * dt + spinVel * dt;
    }
    const n = items.length;
    const perRow = Math.ceil(n / 2);
    for (const it of items) {
      it.hover += ((it.hovered ? 1 : 0) - it.hover) * 0.12;
      it.dim += (it.dimTo - it.dim) * 0.1;
      let x; let y; let z; let ry; let rx; let fog;
      if (mode === 'ring') {
        if (!reduce) it.angle += dt * 0.025;
        x = Math.cos(it.angle) * 0.42 * W * it.ring + (reduce ? 0 : Math.sin(t * it.fx + it.ph) * it.ax);
        y = Math.sin(it.angle) * 0.4 * H * it.ring + (reduce ? 0 : Math.cos(t * it.fy + it.ph) * it.ay);
        z = it.z + it.hover * 160;
        // Dorong keluar dari kotak judul sepanjang garis dari pusat, supaya geraknya tetap mulus.
        // Posisi di layar = posisi 3D / k, dengan k = (P - z) / P. Kartu jauh tampak lebih dekat ke pusat,
        // jadi batasnya dihitung dalam ruang 3D: tepi kartu terdekat ke judul harus berada di luar kotak judul.
        const kz = (P - z) / P;
        if (box) {
          const bx = box.x * kz + tw / 2;
          const by = box.y * kz + th / 2;
          if (Math.abs(x) < bx && Math.abs(y) < by) {
            const s = Math.min(bx / Math.max(1e-3, Math.abs(x)), by / Math.max(1e-3, Math.abs(y)));
            x *= s; y *= s;
          }
        }
        // Tepi luar kartu tetap di dalam ruang.
        x = clamp(x, (W / 2 - 14) * kz - tw / 2);
        y = clamp(y, (H / 2 - 14) * kz - th * 0.68);  // kartu yang berputar tampak lebih tinggi karena perspektif
        if (!reduce && !it.hovered) it.rot = (it.rot + dt * it.spin * 360) % 360;
        if (it.hovered) it.rot += (Math.round(it.rot / 360) * 360 - it.rot) * 0.15;
        ry = it.rot;
        rx = Math.sin(t * 0.6 + it.ph) * 8 * (1 - it.hover);
        fog = Math.max(0, Math.min(1, (40 - z) / 300)) * 0.42;
      } else {
        // Dua cincin silinder; kartu menghadap keluar dan ikut berputar bersama cincin.
        const row = it.i < perRow ? 0 : 1;
        const k = row ? it.i - perRow : it.i;
        const count = row ? n - perRow : perRow;
        const R = Math.min(W * 0.62, 260);
        const a = base * (row ? -0.85 : 1) + (k / count) * Math.PI * 2 + (row ? Math.PI / count : 0);
        x = Math.sin(a) * R;
        z = Math.cos(a) * R - R * 0.55 + it.hover * 40;
        y = (row ? 1 : -1) * Math.min(H * 0.24, th * 0.78) + (reduce ? 0 : Math.sin(t * 0.8 + it.ph) * 5);
        ry = (a * 180) / Math.PI;
        rx = 0;
        fog = Math.max(0, Math.min(1, (R * 0.3 - z) / (R * 1.6))) * 0.5;
      }
      fog = Math.max(fog, it.dim * 0.82);
      it.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg)`;
      it.el.style.setProperty('--fog', fog.toFixed(3));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    focus(grup) { for (const it of items) it.dimTo = grup && grup !== 'semua' && it.el.dataset.grup !== grup ? 1 : 0; }
  };
}
