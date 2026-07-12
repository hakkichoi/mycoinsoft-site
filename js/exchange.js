// ============================================================
// State
// ============================================================
let ALL_COINS = [];
let VICT_RATE = 1; // 1 VICT = ? USDT, from site_settings
let currentPage = 1;
const PAGE_SIZE = 8;
let searchTerm = '';

const grid = document.getElementById('coin-grid');
const pager = document.getElementById('pagination');
const searchInput = document.getElementById('coin-search');

// ============================================================
// Load data
// ============================================================
async function loadCoins() {
  const sb = getSupabase();
  if (!sb) {
    grid.innerHTML = '<div class="coin-empty">Supabase 연결 정보를 js/supabase-config.js 에 입력하면<br>이곳에 교환 가능한 코인 목록이 표시됩니다.</div>';
    return;
  }

  const [{ data: coins, error: coinErr }, { data: settings }] = await Promise.all([
    sb.from('coins').select('*').eq('active', true).order('sort_order', { ascending: true }),
    sb.from('site_settings').select('*').eq('key', 'vict_usdt_rate'),
  ]);

  if (coinErr) {
    grid.innerHTML = '<div class="coin-empty">코인 목록을 불러오지 못했습니다.</div>';
    console.error(coinErr);
    return;
  }

  ALL_COINS = coins || [];
  if (settings && settings.length) VICT_RATE = parseFloat(settings[0].value) || 1;

  renderGrid();
}

function filteredCoins() {
  if (!searchTerm) return ALL_COINS;
  const q = searchTerm.toLowerCase();
  return ALL_COINS.filter(
    (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  );
}

function renderGrid() {
  const list = filteredCoins();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (pageItems.length === 0) {
    grid.innerHTML = '<div class="coin-empty">검색 결과가 없습니다.</div>';
    pager.innerHTML = '';
    return;
  }

  grid.innerHTML = pageItems
    .map(
      (c) => `
    <div class="coin-card">
      <div class="coin-top">
        <div class="coin-badge">${c.symbol.slice(0, 3)}</div>
        <div>
          <div class="coin-name">${c.name}</div>
          <div class="coin-sym">${c.symbol}</div>
        </div>
      </div>
      <div class="coin-price">${formatNum(c.price_usdt)}<span>USDT</span></div>
      <div class="coin-links">
        ${c.info_url ? `<a href="${c.info_url}" target="_blank" rel="noopener">코인정보</a><span class="sep">|</span>` : ''}
        ${c.whitepaper_url ? `<a href="${c.whitepaper_url}" target="_blank" rel="noopener">백서</a><span class="sep">|</span>` : ''}
        ${c.homepage_url ? `<a href="${c.homepage_url}" target="_blank" rel="noopener">홈페이지</a>` : ''}
      </div>
      <button class="btn-exchange" data-symbol="${c.symbol}" data-price="${c.price_usdt}" data-name="${c.name}">교환하기 클릭</button>
    </div>
  `
    )
    .join('');

  renderPager(totalPages);

  grid.querySelectorAll('.btn-exchange').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset));
  });
}

function renderPager(totalPages) {
  if (totalPages <= 1) {
    pager.innerHTML = '';
    return;
  }
  let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
  pager.innerHTML = html;
  pager.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      currentPage = parseInt(b.dataset.page, 10);
      renderGrid();
      window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
    });
  });
}

function formatNum(n) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 8 });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    currentPage = 1;
    renderGrid();
  });
}

// ============================================================
// Modal
// ============================================================
const overlay = document.getElementById('exchange-modal');
const form = document.getElementById('exchange-form');
const receiveAmountEl = document.getElementById('receive-amount');
const statusEl = document.getElementById('form-status');

function openModal(dataset) {
  form.reset();
  statusEl.textContent = '';
  statusEl.className = 'form-status';
  form.receive_coin.value = dataset.symbol;
  form.dataset.receivePrice = dataset.price;
  document.getElementById('modal-target-name').textContent = `${dataset.name} (${dataset.symbol})`;
  updateReceiveAmount();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

function updateReceiveAmount() {
  const sendCoin = form.send_coin.value;
  const sendAmount = parseFloat(form.send_amount.value) || 0;
  const targetPrice = parseFloat(form.dataset.receivePrice || '0');

  if (!targetPrice || sendAmount <= 0) {
    receiveAmountEl.textContent = '0';
    return;
  }

  const usdtEquivalent = sendCoin === 'VICT' ? sendAmount * VICT_RATE : sendAmount;
  const receiveQty = usdtEquivalent / targetPrice;
  receiveAmountEl.textContent = formatNum(receiveQty);
}

form.send_coin.addEventListener('change', updateReceiveAmount);
form.send_amount.addEventListener('input', updateReceiveAmount);

// TRON 지갑 주소 간단 형식 체크 (T로 시작, 34자)
function isValidTronAddress(addr) {
  return /^T[a-zA-Z0-9]{33}$/.test(addr.trim());
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  statusEl.className = 'form-status';

  const wallet = form.wallet_address.value.trim();
  if (!isValidTronAddress(wallet)) {
    statusEl.textContent = 'TRON 지갑 주소 형식을 확인해주세요 (T로 시작하는 34자리 주소).';
    statusEl.className = 'form-status err';
    return;
  }

  const submitBtn = form.querySelector('.modal-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '신청 중...';

  const payload = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    send_coin: form.send_coin.value,
    send_amount: parseFloat(form.send_amount.value),
    receive_coin: form.receive_coin.value,
    receive_amount: parseFloat(receiveAmountEl.textContent.replace(/,/g, '')) || 0,
    wallet_address: wallet,
    message: form.message.value.trim(),
  };

  try {
    // 1) Supabase에 기록 (관리자 페이지에서 조회 가능)
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('exchange_requests').insert([payload]);
      if (error) console.error('Supabase 저장 실패:', error);
    }

    // 2) 관리자 이메일로 즉시 알림 (FormSubmit)
    await fetch(`https://formsubmit.co/ajax/${ADMIN_NOTIFY_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `[마이코인소프트] 코인 교환 신청 - ${payload.name}`,
        ...payload,
      }),
    });

    statusEl.textContent = '신청이 접수되었습니다. 담당자가 이메일 또는 문자로 안내드립니다.';
    statusEl.className = 'form-status ok';
    form.reset();
    setTimeout(closeModal, 2200);
  } catch (err) {
    console.error(err);
    statusEl.textContent = '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    statusEl.className = 'form-status err';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '신청하기';
  }
});

document.addEventListener('DOMContentLoaded', loadCoins);
