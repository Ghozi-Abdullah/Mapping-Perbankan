// Interaksi kecil yang terasa "hidup", terinspirasi blok-blok di bencho.dev, ditulis ulang tanpa pustaka:
// - liquidSeg: indikator tombol pilihan yang meregang seperti tetesan saat berpindah, lalu memantul ke tempatnya.
// - edgeLight: tepi kartu menyala tipis di sisi yang paling dekat dengan kursor.
// - develop: kartu muncul dari blur secara berurutan setiap kali isinya berganti.
// Semua efek mati saat pengguna memilih "kurangi gerakan".

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pasang indikator cair pada satu .seg. Aman dipanggil ulang; tombol boleh dirender ulang kapan saja. */
export function liquidSeg(seg) {
  if (!seg || seg._liquid) return;
  seg._liquid = true;
  seg.classList.add('liquid');
  const blob = document.createElement('span');
  blob.className = 'seg-blob';
  blob.setAttribute('aria-hidden', 'true');
  seg.prepend(blob);
  let cur = null;
  const place = (animate) => {
    const on = seg.querySelector('button[aria-pressed="true"]');
    if (!on) { blob.style.opacity = '0'; return; }
    const to = { l: on.offsetLeft, w: on.offsetWidth, t: on.offsetTop, h: on.offsetHeight };
    blob.style.opacity = '1';
    blob.style.top = `${to.t}px`;
    blob.style.height = `${to.h}px`;
    if (!animate || !cur || reduce()) {
      blob.style.transition = 'none';
      blob.style.left = `${to.l}px`;
      blob.style.width = `${to.w}px`;
      cur = to;
      requestAnimationFrame(() => { blob.style.transition = ''; });
      return;
    }
    // Tahap 1: meregang menutupi posisi lama dan baru. Tahap 2: menyusut ke tombol baru dengan pantulan.
    const l = Math.min(cur.l, to.l);
    const r = Math.max(cur.l + cur.w, to.l + to.w);
    blob.classList.add('stretch');
    blob.style.left = `${l}px`;
    blob.style.width = `${r - l}px`;
    clearTimeout(seg._t);
    seg._t = setTimeout(() => {
      blob.classList.remove('stretch');
      blob.style.left = `${to.l}px`;
      blob.style.width = `${to.w}px`;
    }, 130);
    cur = to;
  };
  new MutationObserver((list) => {
    const rerender = list.some((m) => m.type === 'childList');
    if (rerender && !seg.contains(blob)) seg.prepend(blob);
    place(!rerender);
  }).observe(seg, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });
  new ResizeObserver(() => place(false)).observe(seg);
  document.fonts?.ready.then(() => place(false));
  place(false);
}

/** Tepi kartu yang menyala mengikuti kursor. Satu pendengar untuk seluruh root. */
export function edgeLight(root, selector) {
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduce()) return;
    const el = e.target.closest(selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ex', `${e.clientX - r.left}px`);
    el.style.setProperty('--ey', `${e.clientY - r.top}px`);
  }, { passive: true });
}

/** Mainkan animasi "muncul dari blur" pada anak-anak host secara berurutan. */
export function develop(host, selector = ':scope > *') {
  if (reduce()) return;
  host.querySelectorAll(selector).forEach((el, i) => {
    el.classList.remove('develop');
    el.style.setProperty('--d', `${Math.min(i, 10) * 45}ms`);
    // Paksa reflow supaya animasi bisa diulang pada elemen yang sama.
    void el.offsetWidth;
    el.classList.add('develop');
  });
}
