// Panggung logo bank yang melayang dan berputar dalam ruang 3D.
// Panggung lebar: kartu mengorbit di sekeliling isi tengah (keep) tanpa menutupinya.
// Panggung sempit: kartu tersusun di dua cincin silinder yang berputar dan bisa digeser.
// Tiap kartu punya dua sisi: depan logo, belakang laba terbaru.
//
// Supaya ringan: tiap kartu punya perspektifnya sendiri (tidak ada satu ruang 3D bersama yang harus
// diurutkan ulang setiap frame), hanya transform yang berubah per frame (tanpa repaint), dan animasi
// berhenti saat panggung tidak terlihat atau pengguna memilih "kurangi gerakan".

import { esc } from './kit.js';
import { LOGOS, logoUrl } from './logos.js';

export const initials = (name) => {
  const words = name.replace(/^bank\s+/i, '').split(/\s+/).filter(Boolean);
  // Singkatan pendek (BRI, BCA, bjb) dipakai utuh supaya tidak tertukar; nama lain diambil huruf awalnya.
  if (words.length === 1 && words[0].length <= 4) return words[0].toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
};

// Logo bank lain (logos-semua.js) dipasang dari app.js supaya hanya dimuat di halaman yang membutuhkannya.
let EXTRA = null;
export function useExtraLogos(mod) { EXTRA = mod; }

/** Logo bank (SVG lokal). Bila logonya belum ada, tampil inisial. */
export function logoImg(b, cls = 'logo') {
  const url = logoUrl(b.kode);
  if (url) {
    const l = LOGOS[b.kode];
    return `<span class="${cls}${l.mark ? ' is-mark' : ''}" style="--ratio:${l.ratio}"><img src="${url}" alt="Logo ${esc(b.nama)}" decoding="async" draggable="false"></span>`;
  }
  const src = EXTRA && b.logo ? EXTRA.logoSrc(b.logo) : null;
  if (src) return `<span class="${cls}" style="--ratio:${EXTRA.LOGO[b.logo].r}"><img src="${src}" alt="Logo ${esc(b.nama)}" decoding="async" draggable="false"></span>`;
  return `<span class="${cls} mono" data-initials="${esc(initials(b.nama))}"></span>`;
}

const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/**
 * host: wadah ruang 3D. keep: elemen di tengah panggung yang tidak boleh tertutup (opsional).
 * Mengembalikan { focus(grup|null) } untuk meredupkan bank di luar kelompok terpilih.
 */
export function orbit(host, banks, { onPick, back, keep = null }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.innerHTML = `<div class="orbit-stage">${banks.map((b) => `
    <button class="tile" type="button" data-kode="${esc(b.kode)}" data-grup="${esc(b.grup)}" aria-label="${esc(b.nama)}: lihat laporan">
      <span class="face front">${logoImg(b)}<small>${esc(LOGOS[b.kode]?.mark || !LOGOS[b.kode] ? b.nama : b.kode)}</small></span>
      <span class="face back">${back(b)}</span>
    </button>`).join('')}</div>`;
  const tiles = [...host.querySelectorAll('.tile')];
  // Banyak bank: kartu sedikit diperkecil supaya cincin tidak terlalu padat.
  host.classList.toggle('many', banks.length > 14);
  const r = rand(11);

  const items = tiles.map((el, i) => ({
    el, i,
    angle: (i / tiles.length) * Math.PI * 2 + (r() - 0.5) * 0.3,
    ring: 0.8 + r() * 0.24,
    z: -260 + r() * 280,
    ax: 10 + r() * 16, ay: 8 + r() * 12,
    fx: 0.18 + r() * 0.22, fy: 0.16 + r() * 0.2,
    ph: r() * Math.PI * 2,
    spin: (0.04 + r() * 0.05) * (r() > 0.5 ? 1 : -1),
    p: r(), hover: 0, hovered: false, zi: null, dimmed: false
  }));

  // Ukuran ruang dan kotak judul (relatif terhadap pusat ruang).
  let W = 0; let H = 0; let tw = 0; let th = 0; let box = null; let mode = 'ring'; let P = 1100; let rect = null;
  const measure = () => {
    // Tinggi minimum dari ukuran sebelumnya dilepas dulu supaya tinggi asli yang terbaca.
    host.style.minHeight = '';
    W = host.clientWidth;
    H = host.clientHeight;
    tw = tiles[0]?.offsetWidth || 140;
    th = tiles[0]?.offsetHeight || 110;
    rect = host.getBoundingClientRect();
    box = null;
    // Panggung cukup lebar: kartu mengorbit. Sempit: silinder yang bisa digeser.
    mode = W >= 560 ? 'ring' : 'carousel';
    host.dataset.mode = mode;
    if (mode === 'ring' && keep) {
      // Kotak gabungan isi yang harus tetap terbaca (bukan wadahnya, yang bisa selebar panggung).
      const rs = [...keep.children].map((c) => c.getBoundingClientRect()).filter((x) => x.width && x.height);
      if (rs.length) {
        const kb = {
          left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)),
          top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom))
        };
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const m = 18;
        // Setengah lebar dan tinggi isi di layar, ditambah jarak aman.
        box = {
          x: Math.max(Math.abs(kb.left - cx), Math.abs(kb.right - cx)) + m,
          y: Math.max(Math.abs(kb.top - cy), Math.abs(kb.bottom - cy)) + m
        };
        // Pastikan ruang cukup tinggi supaya kartu di atas dan di bawahnya tidak terpotong.
        const need = Math.ceil(2 * (box.y + th * 1.3 + 16));
        if (H < need) { host.style.minHeight = `${need}px`; H = need; }
      }
    }
    P = mode === 'ring' ? 1100 : 900;
  };
  measure();
  new ResizeObserver(measure).observe(host);
  document.fonts?.ready.then(measure);
  addEventListener('scroll', () => { rect = host.getBoundingClientRect(); }, { passive: true });

  // Arah pandang mengikuti kursor; di layar sentuh, geser untuk memutar silinder.
  let mx = 0; let my = 0;
  let spinVel = 0; let base = 0; let drag = null; let moved = false;
  host.addEventListener('pointermove', (e) => {
    if (!rect) return;
    mx = (e.clientX - rect.left) / rect.width - 0.5;
    my = (e.clientY - rect.top) / rect.height - 0.5;
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(e.clientX - drag.x0) > 6) moved = true;
      base += dx * 0.009;
      spinVel = (dx * 0.009) / Math.max(0.016, (e.timeStamp - drag.t) / 1000);
      drag.x = e.clientX;
      drag.t = e.timeStamp;
    }
  }, { passive: true });
  host.addEventListener('pointerdown', (e) => {
    rect = host.getBoundingClientRect();
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

  // Animasi hanya berjalan saat panggung terlihat dan tab aktif.
  let visible = true;
  let running = false;
  let last = 0;
  const start = () => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; start(); }).observe(host);
  document.addEventListener('visibilitychange', start);

  let tiltX = 0; let tiltY = 0;
  const clamp = (v, a) => Math.max(-a, Math.min(a, v));
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    tiltX += ((mode === 'ring' ? my * -8 : -6) - tiltX) * 0.06;
    tiltY += ((mode === 'ring' ? mx * 12 : 0) - tiltY) * 0.06;
    if (mode === 'carousel' && !drag) {
      spinVel *= Math.pow(0.04, dt);
      base += (reduce ? 0 : 0.22) * dt + spinVel * dt;
    }
    const n = items.length;
    const perRow = Math.ceil(n / 2);
    const head = `perspective(${P}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    for (const it of items) {
      it.hover += ((it.hovered ? 1 : 0) - it.hover) * 0.14;
      let x; let y; let z; let ry; let rx;
      if (mode === 'ring') {
        if (!reduce) it.angle += dt * 0.025;
        x = Math.cos(it.angle) * 0.42 * W * it.ring + (reduce ? 0 : Math.sin(t * it.fx + it.ph) * it.ax);
        y = Math.sin(it.angle) * 0.4 * H * it.ring + (reduce ? 0 : Math.cos(t * it.fy + it.ph) * it.ay);
        z = it.z + it.hover * 120;
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
        // Tepi luar kartu tetap di dalam ruang; kartu yang berputar tampak lebih tinggi karena perspektif.
        x = clamp(x, (W / 2 - 14) * kz - tw / 2);
        y = clamp(y, (H / 2 - 14) * kz - th * 0.68);
        // Putaran penuh, tapi melambat saat menghadap depan dan cepat saat membelakangi,
        // jadi logo terlihat sekitar dua pertiga waktu. Saat diarahkan kursor, kartu kembali menghadap depan.
        if (!reduce && !it.hovered) it.p = (it.p + dt * Math.abs(it.spin)) % 1;
        if (it.hovered) it.p += (Math.round(it.p) - it.p) * 0.15;
        ry = (it.p - (0.6 / (2 * Math.PI)) * Math.sin(2 * Math.PI * it.p)) * 360 * Math.sign(it.spin);
        rx = Math.sin(t * 0.6 + it.ph) * 7 * (1 - it.hover);
      } else {
        // Dua cincin silinder; kartu menghadap keluar dan ikut berputar bersama cincin.
        const row = it.i < perRow ? 0 : 1;
        const k = row ? it.i - perRow : it.i;
        const count = row ? n - perRow : perRow;
        const R = Math.min(W * 0.62, 280);
        const a = base * (row ? -0.85 : 1) + (k / count) * Math.PI * 2 + (row ? Math.PI / count : 0);
        x = Math.sin(a) * R;
        z = Math.cos(a) * R - R * 0.55 + it.hover * 40;
        y = (row ? 1 : -1) * Math.min(H * 0.24, th * 0.8) + (reduce ? 0 : Math.sin(t * 0.8 + it.ph) * 5);
        ry = (a * 180) / Math.PI;
        rx = 0;
      }
      it.el.style.transform = `${head} translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg)`;
      // Urutan tumpuk hanya diubah bila berubah, supaya tidak memicu kerja ulang setiap frame.
      const zi = Math.round(z / 8) + 100;
      if (zi !== it.zi) { it.zi = zi; it.el.style.zIndex = String(zi); }
    }
    requestAnimationFrame(frame);
  }
  start();

  return {
    focus(grup) {
      for (const it of items) {
        const dim = Boolean(grup && grup !== 'semua' && it.el.dataset.grup !== grup);
        if (dim !== it.dimmed) { it.dimmed = dim; it.el.classList.toggle('dim', dim); }
      }
    }
  };
}
