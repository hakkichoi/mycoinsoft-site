(function () {
  const sb = getSupabase();
  const SESSION_KEY = 'demo01_user_id';

  const authSection = document.getElementById('auth-section');
  const dashSection = document.getElementById('dash-section');
  const innerAuth = document.getElementById('inner-auth');
  const fmtWon = (n) => Number(n).toLocaleString('ko-KR');

  let EXCHANGE_RATE = 24;
  let EXCHANGE_DIR = 'buy'; // buy: USDT->MyCoin, sell: MyCoin->USDT

  // ---------------- Password show/hide ----------------
  document.getElementById('pw-toggle').addEventListener('click', () => {
    const input = document.getElementById('li-pin');
    const btn = document.getElementById('pw-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });

  // ---------------- Nav auth state ----------------
  function renderNavAuth(loggedIn, username) {
    if (loggedIn) {
      innerAuth.innerHTML = `
        <span class="who">${username} 님</span>
        <a href="#mypage">마이페이지</a>
        <button type="button" id="nav-logout-btn">로그아웃</button>
      `;
      document.getElementById('nav-logout-btn').addEventListener('click', doLogout);
    } else {
      innerAuth.innerHTML = `<a href="#mypage" class="primary">로그인</a>`;
    }
  }

  // ---------------- Login ----------------
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-msg');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = '';
    loginMsg.className = 'demo-msg';

    const username = document.getElementById('li-username').value.trim();
    const pin = document.getElementById('li-pin').value.trim();

    const { data, error } = await sb.from('demo_users').select('id').eq('username', username).eq('pin', pin).maybeSingle();
    if (error || !data) {
      loginMsg.textContent = '아이디 또는 비밀번호가 일치하지 않습니다.';
      loginMsg.className = 'demo-msg err';
      return;
    }

    localStorage.setItem(SESSION_KEY, data.id);
    loadDashboard();
  });

  function doLogout() {
    localStorage.removeItem(SESSION_KEY);
    dashSection.style.display = 'none';
    authSection.style.display = 'block';
    renderNavAuth(false);
  }
  document.getElementById('logout-btn').addEventListener('click', doLogout);

  // ---------------- Dashboard ----------------
  async function loadDashboard() {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return;

    const { data: user, error } = await sb.from('demo_users').select('*').eq('id', userId).maybeSingle();
    if (error || !user) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    authSection.style.display = 'none';
    dashSection.style.display = 'block';
    renderNavAuth(true, user.username);

    document.getElementById('dash-balance').textContent = fmtWon(user.mycoin_balance) + ' MyCoin';
    document.getElementById('dash-username').textContent = user.username;

    loadExchangeHistory(userId);
  }

  async function loadExchangeHistory(userId) {
    const { data, error } = await sb
      .from('demo_exchange_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const tbody = document.querySelector('#tx-table tbody');
    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">신청 내역이 없습니다.</td></tr>';
      return;
    }

    const dirLabel = { buy: 'USDT→MyCoin', sell: 'MyCoin→USDT' };
    const statusLabel = { pending: '대기중', approved: '승인됨', rejected: '거절됨' };

    tbody.innerHTML = data
      .map(
        (t) => `
      <tr>
        <td>${new Date(t.created_at).toLocaleString('ko-KR')}</td>
        <td>${dirLabel[t.direction]}</td>
        <td>${fmtWon(t.mycoin_amount)}</td>
        <td>${fmtWon(t.usdt_amount)}</td>
        <td><span class="demo-badge ${t.status}">${statusLabel[t.status]}</span></td>
      </tr>`
      )
      .join('');
  }

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!confirm('내 데모 데이터를 초기화하시겠습니까? MyCoin 잔고가 기본값(500)으로 되돌아가고 교환 신청 내역이 모두 삭제됩니다.')) return;
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return;

    await sb.from('demo_exchange_requests').delete().eq('user_id', userId);
    await sb.from('demo_users').update({ mycoin_balance: 500 }).eq('id', userId);
    loadDashboard();
  });

  // ---------------- Exchange rate ----------------
  async function loadRate() {
    const { data } = await sb.from('demo_settings').select('value').eq('key', 'exchange_rate').maybeSingle();
    if (data) EXCHANGE_RATE = parseFloat(data.value) || 24;
    document.getElementById('exchange-rate-val').textContent = EXCHANGE_RATE;
    updateExchangePreview();
  }

  // ---------------- Exchange toggle ----------------
  document.querySelectorAll('.exchange-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exchange-toggle button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      EXCHANGE_DIR = btn.dataset.dir;
      updateExchangePreview();
    });
  });

  function updateExchangePreview() {
    const amount = parseFloat(document.getElementById('exchange-amount').value);
    const preview = document.getElementById('exchange-preview');
    if (!amount || amount <= 0) {
      preview.innerHTML = '수량을 입력하면 예상 교환 값이 표시됩니다.';
      return;
    }
    const usdt = amount * EXCHANGE_RATE;
    if (EXCHANGE_DIR === 'buy') {
      preview.innerHTML = `<b>${fmtWon(usdt)} USDT</b> 를 지불하고 <b>${fmtWon(amount)} MyCoin</b> 을 받습니다.`;
    } else {
      preview.innerHTML = `<b>${fmtWon(amount)} MyCoin</b> 을 지불하고 <b>${fmtWon(usdt)} USDT</b> 를 받습니다.`;
    }
  }
  document.getElementById('exchange-amount').addEventListener('input', updateExchangePreview);

  // ---------------- Exchange submit ----------------
  const exchangeForm = document.getElementById('exchange-form');
  const exchangeMsg = document.getElementById('exchange-msg');

  exchangeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    exchangeMsg.textContent = '';
    exchangeMsg.className = 'demo-msg';

    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) {
      exchangeMsg.textContent = '로그인 후 이용해주세요. 아래 마이페이지에서 로그인해주세요.';
      exchangeMsg.className = 'demo-msg err';
      return;
    }

    const amount = parseFloat(document.getElementById('exchange-amount').value);
    if (!amount || amount <= 0) {
      exchangeMsg.textContent = '교환할 수량을 입력해주세요.';
      exchangeMsg.className = 'demo-msg err';
      return;
    }

    const usdt = amount * EXCHANGE_RATE;
    const { error } = await sb.from('demo_exchange_requests').insert([
      { user_id: userId, direction: EXCHANGE_DIR, mycoin_amount: amount, usdt_amount: usdt, status: 'pending' },
    ]);

    if (error) {
      exchangeMsg.textContent = '신청 중 오류가 발생했습니다.';
      exchangeMsg.className = 'demo-msg err';
      return;
    }

    exchangeMsg.textContent = '교환 신청이 접수되었습니다. 관리자 승인 후 마이페이지에 반영됩니다.';
    exchangeMsg.className = 'demo-msg ok';
    exchangeForm.reset();
    updateExchangePreview();
    loadExchangeHistory(userId);
  });

  // ---------------- Charts ----------------
  function smoothPath(pts) {
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y} L${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q${pts[i].x},${pts[i].y} ${midX},${midY}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last.x},${last.y}`;
    return d;
  }

  function renderChart(svgId, tooltipId, rawSlots, colorFrom, colorTo, fmt) {
    const svg = document.getElementById(svgId);
    const tooltip = document.getElementById(tooltipId);
    const W = 460, H = 150, PAD_X = 8, PAD_Y = 16;

    const slots = rawSlots.filter((s) => s.value !== null && s.value !== undefined);
    if (slots.length === 0) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--dk-text-faint)" font-size="12">데이터가 없습니다.</text>`;
      return;
    }

    const values = slots.map((s) => s.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const n = slots.length;
    const usableW = W - PAD_X * 2;
    const step = n > 1 ? usableW / (n - 1) : 0;

    const pts = slots.map((s, i) => {
      const x = n > 1 ? PAD_X + i * step : W / 2;
      const t = max === min ? 0.5 : (s.value - min) / (max - min);
      const y = (H - PAD_Y) - t * (H - PAD_Y * 2);
      return { x, y, value: s.value };
    });

    const linePath = smoothPath(pts);
    const areaPath = `${linePath} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
    const gradId = svgId + '-grad';

    let html = `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colorFrom}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${colorFrom}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gradId})" stroke="none"></path>
      <path d="${linePath}" fill="none" stroke="${colorTo}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"></path>
    `;
    pts.forEach((p) => {
      html += `<circle class="chart-point" cx="${p.x}" cy="${p.y}" r="9" fill="transparent" data-value="${p.value}" data-x="${p.x}" data-y="${p.y}"></circle>`;
      html += `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="${colorTo}" stroke="${colorFrom}" stroke-width="1" pointer-events="none"></circle>`;
    });
    svg.innerHTML = html;

    svg.querySelectorAll('.chart-point').forEach((c) => {
      c.addEventListener('mouseenter', () => {
        const x = parseFloat(c.dataset.x);
        const y = parseFloat(c.dataset.y);
        const val = parseFloat(c.dataset.value);
        tooltip.textContent = fmt(val);
        tooltip.style.left = `${(x / W) * 100}%`;
        tooltip.style.top = `${(y / H) * 100}%`;
        tooltip.classList.add('show');
      });
      c.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
    });
  }

  async function loadCharts() {
    const [{ data: volData }, { data: priceData }] = await Promise.all([
      sb.from('demo_chart_volume').select('*').order('slot_index', { ascending: true }),
      sb.from('demo_chart_price').select('*').order('slot_index', { ascending: true }),
    ]);

    renderChart(
      'volume-chart', 'volume-tooltip',
      volData || [], '#8B5CF6', '#8B5CF6',
      (v) => fmtWon(v) + ' 거래'
    );
    renderChart(
      'price-chart', 'price-tooltip',
      priceData || [], '#4FD1FF', '#4FD1FF',
      (v) => '$' + Number(v).toFixed(3)
    );
  }

  // ---------------- Demo newsletter (샘플 전용, 실제 뉴스레터와 별개) ----------------
  const demoNewsletterForm = document.getElementById('demo-newsletter-form');
  demoNewsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('demo-newsletter-email').value.trim();
    const msg = document.getElementById('demo-newsletter-msg');
    if (!email) return;

    const { error } = await sb.from('demo_newsletter').insert([{ email }]);
    if (error) {
      msg.textContent = '등록 중 오류가 발생했습니다.';
      msg.className = 'demo-msg err';
      return;
    }
    msg.textContent = '등록되었습니다. (샘플 페이지이므로 초기화 시 삭제됩니다)';
    msg.className = 'demo-msg ok';
    demoNewsletterForm.reset();
  });

  // ---------------- Init ----------------
  document.addEventListener('DOMContentLoaded', () => {
    loadRate();
    loadCharts();
    if (localStorage.getItem(SESSION_KEY)) {
      loadDashboard();
    }
  });
})();
