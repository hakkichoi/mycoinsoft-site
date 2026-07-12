// ============================================================
// Nav: mobile toggle
// ============================================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navLinks.style.display = navLinks.classList.contains('open') ? 'flex' : '';
  });
}

// close mobile menu after clicking a link
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navLinks.style.display = '';
  });
});

// ============================================================
// Scroll reveal
// ============================================================
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => io.observe(el));

// ============================================================
// Ledger tape (Introduction section) — admin-managed via Supabase
// Falls back to whatever static items are already in the HTML
// if Supabase hasn't been configured yet.
// ============================================================
async function loadLedgerTape() {
  const track = document.getElementById('ledger-track');
  if (!track) return;

  const sb = typeof getSupabase === 'function' ? getSupabase() : null;
  if (!sb) return; // keep static fallback markup

  const { data, error } = await sb
    .from('timeline_events')
    .select('year, title')
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    console.warn('타임라인을 불러오지 못해 기본 내용을 표시합니다.', error);
    return;
  }

  const itemHtml = (item) =>
    `<div class="ledger-item"><span class="yr">${item.year}</span><span class="ev">${item.title}</span></div>`;

  // duplicate the list once so the CSS marquee (-50%) loops seamlessly
  const html = data.map(itemHtml).join('') + data.map(itemHtml).join('');
  track.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadLedgerTape);
