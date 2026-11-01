// Laporan bank sebagai buku: tiap bab adalah satu bentangan dua halaman (.spread dengan .page.left dan .page.right).
// Di layar lebar semua bentangan ditumpuk di petak yang sama (yang tidak dibuka disembunyikan dengan visibility),
// jadi tinggi buku tetap dan grafik sudah tergambar sebelum halamannya dibuka: tidak ada yang bergeser saat dibalik.
// Membalik halaman memakai halaman aslinya sendiri dalam dua tahap: halaman lama berputar di punggung buku sampai
// tegak lurus, lalu halaman baru turun dari posisi tegak lurus ke tempatnya. Di ponsel halaman bertumpuk ke bawah,
// jadi seluruh bentangan dibalik seperti satu lembar.
// Bila ada .book-cover, buku mulai tertutup dan miring sedikit seperti benda 3D. Sampul berputar di punggung buku
// ke kiri, buku bergeser ke tengah dan menjadi rata supaya teks tetap tajam saat dibaca.

import { $, $$, esc } from './kit.js';
import { lucide } from './icons.js';

const UP = 380;   // tahap 1: halaman lama terangkat
const DOWN = 440; // tahap 2: halaman baru turun
const OPEN = 950; // sampul terbuka atau tertutup
const AUTO = 700; // jeda sebelum buku terbuka sendiri setelah terlihat

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * host: section.book. Mengembalikan { turn(i), renumber(), get cur }.
 * onTurn(i) dipanggil setiap bab berganti (misalnya untuk menyimpan nomor bab di alamat halaman).
 */
export function book(host, { start = 0, onTurn = () => {} } = {}) {
  const body = $('.book-body', host);
  const spreads = $$('.spread', body);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 720px)');
  let cur = Math.min(Math.max(0, start), spreads.length - 1);
  let busy = false;
  const cover = $('.book-cover', host);
  const shut = $('[data-shut]', host);
  let closed = Boolean(cover) && start === 0 && !reduce;
  if (cover) host.classList.add('has-cover');
  host.classList.toggle('closed', closed);

  $('#book-tabs', host).innerHTML = spreads.map((s, i) => `<button type="button" role="tab" data-hal="${i}" aria-selected="false" aria-controls="${s.id || ''}">${lucide(s.dataset.icon || 'book-open', 'lc')}<span>${esc(s.dataset.title || `Bab ${i + 1}`)}</span></button>`).join('');

  // Nomor halaman: bab pertama halaman 1–2, dan seterusnya.
  const numberPages = () => spreads.forEach((s, i) => {
    $$(':scope > .page', s).forEach((p, k) => { p.dataset.folio = String(i * 2 + k + 1); });
  });
  numberPages();

  const pagesOf = (s) => ({ left: $(':scope > .page.left:not([hidden])', s), right: $(':scope > .page.right:not([hidden])', s) });

  const show = (i) => {
    spreads.forEach((s, k) => {
      const on = k === i;
      s.classList.toggle('on', on);
      s.inert = !on;
      s.setAttribute('aria-hidden', String(!on));
    });
    cur = i;
    if (closed) spreads[i].inert = true;
    $$('#book-tabs [data-hal]', host).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.hal === i)));
    $$('[data-turn="-1"]', host).forEach((b) => { b.disabled = i === 0; });
    $$('[data-turn="1"]', host).forEach((b) => { b.disabled = i === spreads.length - 1; });
    const nums = $$(':scope > .page:not([hidden])', spreads[i]).map((p) => p.dataset.folio);
    $('#book-folio', host).textContent = `Halaman ${nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums[0] || i * 2 + 1} dari ${spreads.length * 2}`;
    onTurn(i);
  };

  // Bersihkan semua kelas dan gaya sementara dari animasi.
  const settle = () => {
    $$('.page, .spread', body).forEach((el) => el.classList.remove('flip-up', 'flip-down', 'flip-under', 'flip-stay', 'fwd', 'back', 'leaving', 'peek', 'go'));
    body.classList.remove('turning');
  };

  const setShut = () => {
    if (!shut) return;
    shut.setAttribute('aria-label', closed ? 'Buka buku' : 'Tutup buku');
    shut.title = closed ? 'Buka buku' : 'Tutup buku';
    shut.setAttribute('aria-pressed', String(closed));
  };
  // Buka: sampul berputar 180° di punggung buku, sisi kiri muncul mengikuti sampul, halaman kiri muncul belakangan.
  const open = async () => {
    if (!closed || busy) return;
    busy = true;
    closed = false;
    host.classList.add('opening');
    host.classList.remove('closed', 'flat');
    if (!reduce) await wait(OPEN);
    host.classList.remove('opening');
    host.classList.add('flat');
    spreads[cur].inert = false;
    cover?.setAttribute('tabindex', '-1');
    cover?.setAttribute('aria-hidden', 'true');
    setShut();
    busy = false;
  };
  const close = async () => {
    if (closed || busy || !cover) return;
    busy = true;
    closed = true;
    spreads[cur].inert = true;
    host.classList.remove('flat');
    host.classList.add('closing');
    await frame();
    host.classList.add('closed');
    if (!reduce) await wait(OPEN);
    host.classList.remove('closing');
    cover.removeAttribute('tabindex');
    cover.removeAttribute('aria-hidden');
    setShut();
    busy = false;
  };

  const turn = async (to) => {
    if (closed) await open();
    if (busy || to === cur || to < 0 || to >= spreads.length) return;
    const dir = to > cur ? 1 : -1;
    const from = spreads[cur];
    const next = spreads[to];
    if (reduce) { show(to); return; }
    busy = true;
    body.classList.add('turning');
    const a = pagesOf(from);
    const b = pagesOf(next);
    const two = !narrow.matches && a.left && a.right && b.left && b.right;
    if (two) {
      // Lebar: halaman kanan lama (maju) atau kiri lama (mundur) terangkat di punggung buku, lalu halaman
      // kiri baru (maju) atau kanan baru (mundur) turun menutup halaman lama di sisi itu.
      const lifting = dir > 0 ? a.right : a.left;
      const staying = dir > 0 ? a.left : a.right;
      const landing = dir > 0 ? b.left : b.right;
      const under = dir > 0 ? b.right : b.left;
      const cls = dir > 0 ? 'fwd' : 'back';
      next.classList.add('peek');               // bentangan baru ikut terlihat selama animasi
      under.classList.add('flip-under');
      staying.classList.add('flip-stay');
      landing.classList.add('flip-down', cls);  // mulai tegak lurus, belum terlihat
      lifting.classList.add('flip-up', cls);
      await frame();
      lifting.classList.add('go');
      await wait(UP);
      landing.classList.add('go');
      await wait(DOWN);
      lifting.classList.remove('go');
      landing.classList.remove('go');
      show(to);
    } else {
      // Sempit, atau bentangan satu halaman: bentangan lama dibalik seperti satu lembar di atas yang baru.
      from.classList.add('flip-up', 'leaving', dir > 0 ? 'fwd' : 'back');
      show(to);
      from.classList.add('on');
      await frame();
      from.classList.add('go');
      await wait(UP + 160);
      from.classList.remove('go', 'on');
      from.inert = true;
      // Di ponsel, kembali ke atas buku bila judul bab sudah tergulir keluar layar.
      const top = host.getBoundingClientRect().top;
      if (top < 0) host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    settle();
    busy = false;
  };

  host.addEventListener('click', (e) => {
    if (e.target.closest('.book-cover')) { open(); return; }
    if (e.target.closest('[data-shut]')) { if (closed) open(); else close(); return; }
    const t = e.target.closest('[data-turn]');
    if (t && !t.disabled) { turn(cur + +t.dataset.turn); return; }
    const tab = e.target.closest('[data-hal]');
    if (tab) turn(+tab.dataset.hal);
  });
  // Panah kiri/kanan membalik halaman, kecuali sedang mengetik atau memilih di dalam tombol pilihan.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (e.target.closest('input, select, textarea, .seg, .table-wrap, [role="tablist"]')) return;
    if (closed) { if (e.key === 'ArrowRight') open(); return; }
    turn(cur + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // Geser di layar sentuh, kecuali di atas tabel, grafik, atau tombol pilihan yang bisa digeser sendiri.
  let sx = null; let sy = null;
  body.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('.table-wrap, .seg, .bd-chart, .bd-sources')) { sx = null; return; }
    sx = e.clientX; sy = e.clientY;
  });
  body.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; const dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) turn(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });
  // Tab bab: panah kiri/kanan berpindah tab, seperti tablist biasa.
  $('#book-tabs', host).addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const to = Math.min(spreads.length - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    turn(to);
    $(`#book-tabs [data-hal="${to}"]`, host)?.focus();
  });

  show(cur);
  setShut();
  if (!closed) host.classList.add('flat');
  // Keadaan awal dipasang tanpa animasi; transisi baru aktif setelah dua bingkai.
  frame().then(() => host.classList.remove('still'));
  // Buka sendiri sekali, sebentar setelah buku terlihat, supaya pembaca langsung sampai ke isi.
  if (closed && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => {
      if (!list.some((x) => x.isIntersecting)) return;
      io.disconnect();
      setTimeout(open, AUTO);
    }, { threshold: 0.35 });
    io.observe(host);
  }
  return { turn, open, close, renumber: () => { numberPages(); show(cur); }, get cur() { return cur; }, get closed() { return closed; } };
}
