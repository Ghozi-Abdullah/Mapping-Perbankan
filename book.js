// Laporan bank sebagai buku: tiap bab adalah satu bentangan dua halaman (.spread dengan .page.left dan .page.right).
// Pindah bab dengan membalik halaman: lembar kanan berputar di punggung buku ke kiri (maju), atau sebaliknya (mundur).
// Di layar sempit halaman bertumpuk, jadi seluruh bentangan yang dibalik seperti satu lembar.

import { $, $$, esc } from './kit.js';
import { lucide } from './icons.js';

const DUR = 820;

/** Salinan halaman untuk lembar yang dibalik: tanpa id supaya tidak bentrok dengan halaman aslinya. */
function ghost(el) {
  const c = el.cloneNode(true);
  c.removeAttribute('id');
  $$('[id]', c).forEach((x) => x.removeAttribute('id'));
  c.hidden = false;
  c.setAttribute('aria-hidden', 'true');
  c.inert = true;
  return c;
}

/**
 * host: section.book. Mengembalikan { turn(i), go(dir), get cur }.
 * onTurn(i) dipanggil setiap bab berganti (misalnya untuk menyimpan nomor bab di alamat halaman).
 */
export function book(host, { start = 0, onTurn = () => {} } = {}) {
  const body = $('.book-body', host);
  const spreads = $$('.spread', body);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 720px)');
  let cur = Math.min(Math.max(0, start), spreads.length - 1);
  let busy = false;

  $('#book-tabs', host).innerHTML = spreads.map((s, i) => `<button type="button" role="tab" data-hal="${i}" aria-selected="false">${lucide(s.dataset.icon || 'book-open', 'lc')}<span>${esc(s.dataset.title || `Bab ${i + 1}`)}</span></button>`).join('');

  // Nomor halaman: bab pertama halaman 1–2, dan seterusnya. Bentangan satu halaman tetap memakai dua nomor.
  const numberPages = () => spreads.forEach((s, i) => {
    $$(':scope > .page', s).forEach((p, k) => { p.dataset.folio = String(i * 2 + k + 1); });
  });
  numberPages();

  const show = (i) => {
    spreads.forEach((s, k) => { s.hidden = k !== i; });
    cur = i;
    $$('#book-tabs [data-hal]', host).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.hal === i)));
    $$('[data-turn="-1"]', host).forEach((b) => { b.disabled = i === 0; });
    $$('[data-turn="1"]', host).forEach((b) => { b.disabled = i === spreads.length - 1; });
    const pages = $$(':scope > .page:not([hidden])', spreads[i]);
    const nums = pages.map((p) => p.dataset.folio);
    $('#book-folio', host).textContent = `Halaman ${nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums[0] || i * 2 + 1} dari ${spreads.length * 2}`;
    onTurn(i);
  };

  const turn = (to) => {
    if (busy || to === cur || to < 0 || to >= spreads.length) return;
    const from = spreads[cur];
    const next = spreads[to];
    const dir = to > cur ? 1 : -1;
    if (reduce) { show(to); return; }
    busy = true;
    const h = body.offsetHeight;
    const fromLeft = $(':scope > .page.left:not([hidden])', from);
    const fromRight = $(':scope > .page.right:not([hidden])', from);
    show(to);
    const nextLeft = $(':scope > .page.left:not([hidden])', next);
    const nextRight = $(':scope > .page.right:not([hidden])', next);
    // Selama dibalik, tinggi buku memakai yang lebih tinggi supaya lembar tidak terpotong.
    body.style.minHeight = `${Math.max(h, body.offsetHeight)}px`;
    const layers = [];
    const add = (cls, front, back) => {
      const f = document.createElement('div');
      f.className = `leaf ${cls}`;
      f.innerHTML = '<div class="leaf-face front"></div><div class="leaf-face back"></div>';
      if (front) f.firstChild.append(front);
      if (back) f.lastChild.append(back);
      body.append(f);
      layers.push(f);
      return f;
    };
    let leaf;
    if (narrow.matches || !fromLeft || !fromRight || !nextLeft || !nextRight) {
      // Satu lembar selebar buku: bentangan lama terbuka seperti halaman yang dibalik.
      leaf = add(`whole ${dir > 0 ? 'fwd' : 'back'}`, ghost(from), null);
    } else if (dir > 0) {
      // Maju: halaman kiri lama tetap terlihat sampai lembar mendarat; lembar kanan berputar ke kiri.
      add('cover left', ghost(fromLeft), null);
      leaf = add('half fwd', ghost(fromRight), ghost(nextLeft));
    } else {
      add('cover right', ghost(fromRight), null);
      leaf = add('half back', ghost(fromLeft), ghost(nextRight));
    }
    requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('go')));
    setTimeout(() => {
      layers.forEach((l) => l.remove());
      body.style.minHeight = '';
      busy = false;
    }, DUR + 40);
  };

  host.addEventListener('click', (e) => {
    const t = e.target.closest('[data-turn]');
    if (t && !t.disabled) { turn(cur + +t.dataset.turn); return; }
    const tab = e.target.closest('[data-hal]');
    if (tab) turn(+tab.dataset.hal);
  });
  // Panah kiri/kanan membalik halaman, kecuali sedang mengetik atau memilih di dalam tombol pilihan.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (e.target.closest('input, select, textarea, .seg, .table-wrap, [role="tablist"]')) return;
    turn(cur + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // Geser di layar sentuh, kecuali di atas tabel atau tombol pilihan yang bisa digeser sendiri.
  let sx = null; let sy = null;
  body.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('.table-wrap, .seg, .bd-chart')) { sx = null; return; }
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
  return { turn, renumber: () => { numberPages(); show(cur); }, get cur() { return cur; } };
}
