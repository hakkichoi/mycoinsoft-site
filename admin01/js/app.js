const sb = getSupabase();

const ADMIN_USERNAME = 'admin_user_1';
const ADMIN_PASSWORD = 'admin1234';

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

const fmtNum = (n) => Number(n).toLocaleString('ko-KR');

// ---------------- Password show/hide ----------------
document.getElementById('admin-pw-toggle').addEventListener('click', () => {
  const input = document.getElementById('admin-li-pw');
  const btn = document.getElementById('admin-pw-toggle');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
});

// ---------------- Login gate (데모 전용 — 실제 서버 인증이 아닌 화면 예시용) ----------------
const loginSection = document.getElementById('admin-login-section');
const dashSection = document.getElementById('admin-dashboard-section');

document.getElementById('admin-login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('admin-li-username').value.trim();
  const password = document.getElementById('admin-li-pw').value.trim();
  const msg = document.getElementById('admin-login-msg');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    loginSection.style.display = 'none';
    dashSection.style.display = 'block';
    document.getElementById('admin-who').textContent = username;
    document.getElementById('admin-who-side').textContent = username;
    initDashboard();
  } else {
    msg.textContent = '아이디 또는 비밀번호가 일치하지 않습니다.';
    msg.className = 'demo-msg err';
  }
});

function doAdminLogout() {
  dashSection.style.display = 'none';
  loginSection.style.display = 'flex';
}
document.getElementById('admin-logout-btn').addEventListener('click', doAdminLogout);
document.getElementById('admin-logout-btn-top').addEventListener('click', doAdminLogout);

// ---------------- Panel switching (subnav + sidebar 공용) ----------------
function switchPanel(panelId) {
  document.querySelectorAll('.ap-subnav button').forEach((b) => b.classList.toggle('active', b.dataset.panel === panelId));
  document.querySelectorAll('.ap-menu a[data-panel]').forEach((a) => a.classList.toggle('active', a.dataset.panel === panelId));
  document.querySelectorAll('.ap-panel').forEach((p) => p.classList.toggle('active', p.id === panelId));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

document.querySelectorAll('.ap-subnav button').forEach((btn) => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});
document.querySelectorAll('.ap-menu a[data-panel]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    switchPanel(a.dataset.panel);
  });
});
document.querySelectorAll('.ap-more[data-goto]').forEach((el) => {
  el.addEventListener('click', () => switchPanel(el.dataset.goto));
});

// ---------------- Stats ----------------
async function loadStats() {
  const { data: users } = await sb.from('demo_users').select('mycoin_balance');
  const { data: allReq } = await sb.from('demo_exchange_requests').select('status');
  const { data: nl } = await sb.from('demo_newsletter').select('id');

  const userCount = users ? users.length : 0;
  const totalBalance = (users || []).reduce((sum, u) => sum + Number(u.mycoin_balance), 0);
  const pending = (allReq || []).filter((r) => r.status === 'pending').length;
  const approved = (allReq || []).filter((r) => r.status === 'approved').length;
  const rejected = (allReq || []).filter((r) => r.status === 'rejected').length;
  const nlCount = nl ? nl.length : 0;

  document.getElementById('stat-users').textContent = userCount;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-balance').textContent = fmtNum(totalBalance);
  document.getElementById('stat-newsletter').textContent = nlCount;

  document.getElementById('st-all-users').textContent = userCount;
  document.getElementById('st-all-pending').textContent = pending;
  document.getElementById('st-all-approved').textContent = approved;
  document.getElementById('st-all-rejected').textContent = rejected;
  document.getElementById('st-all-nl').textContent = nlCount;
}

// ---------------- Dashboard: recent lists ----------------
async function loadDashboardLists() {
  const { data: exReq } = await sb
    .from('demo_exchange_requests')
    .select('*, demo_users(username)')
    .order('created_at', { ascending: false })
    .limit(5);

  const exList = document.getElementById('dash-exchange-list');
  if (!exReq || exReq.length === 0) {
    exList.innerHTML = '<li class="empty">신청 내역이 없습니다.</li>';
  } else {
    const dotClass = { pending: 'wait', approved: 'ok', rejected: '' };
    exList.innerHTML = exReq
      .map(
        (r) => `<li><span class="dot ${dotClass[r.status]}"></span><span class="tt">${r.demo_users ? r.demo_users.username : '탈퇴회원'} · ${fmtNum(r.mycoin_amount)} MyCoin</span><span class="dd">${new Date(r.created_at).toLocaleDateString('ko-KR')}</span></li>`
      )
      .join('');
  }

  const { data: recentUsers } = await sb.from('demo_users').select('*').order('created_at', { ascending: false }).limit(5);
  const usersList = document.getElementById('dash-users-list');
  if (!recentUsers || recentUsers.length === 0) {
    usersList.innerHTML = '<li class="empty">회원이 없습니다.</li>';
  } else {
    usersList.innerHTML = recentUsers
      .map(
        (u) => `<li><span class="dot ok"></span><span class="tt">${u.username} · ${fmtNum(u.mycoin_balance)} MyCoin</span><span class="dd">${new Date(u.created_at).toLocaleDateString('ko-KR')}</span></li>`
      )
      .join('');
  }

  const { data: recentNl } = await sb.from('demo_newsletter').select('*').order('created_at', { ascending: false }).limit(5);
  const nlList = document.getElementById('dash-newsletter-list');
  if (!recentNl || recentNl.length === 0) {
    nlList.innerHTML = '<li class="empty">구독자가 없습니다.</li>';
  } else {
    nlList.innerHTML = recentNl
      .map(
        (n) => `<li><span class="dot ok"></span><span class="tt">${n.email}</span><span class="dd">${new Date(n.created_at).toLocaleDateString('ko-KR')}</span></li>`
      )
      .join('');
  }
}

// ---------------- Dashboard: calendar (정적 표시, 오늘 하이라이트) ----------------
function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  document.getElementById('cal-head').innerHTML = `일정<span class="ap-more">${year}.${String(month + 1).padStart(2, '0')}</span>`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ d: daysInPrevMonth - i, other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, other: false, isToday: d === today });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length, other: true });

  let rows = '';
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    rows += '<tr>' + week.map((c) => `<td class="${c.other ? 'other-month' : ''} ${c.isToday ? 'today' : ''}">${c.isToday ? `<span>${c.d}</span>` : c.d}</td>`).join('') + '</tr>';
  }

  document.getElementById('ap-calendar').innerHTML = `
    <table>
      <thead><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------------- Dashboard: price chart ----------------
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

function renderMiniChart(svgId, tooltipId, rawSlots, color, fmt) {
  const svg = document.getElementById(svgId);
  const tooltip = document.getElementById(tooltipId);
  if (!svg) return;
  const W = 460, H = 150, PAD_X = 8, PAD_Y = 16;

  const slots = (rawSlots || []).filter((s) => s.value !== null && s.value !== undefined);
  if (slots.length === 0) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#8C9A94" font-size="12">데이터가 없습니다.</text>`;
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
        <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none"></path>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"></path>
  `;
  pts.forEach((p) => {
    html += `<circle class="chart-point" cx="${p.x}" cy="${p.y}" r="9" fill="transparent" data-value="${p.value}" data-x="${p.x}" data-y="${p.y}"></circle>`;
    html += `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="${color}" stroke="#fff" stroke-width="1" pointer-events="none"></circle>`;
  });
  svg.innerHTML = html;

  if (tooltip) {
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
}

async function loadDashboardChart() {
  const { data: priceData } = await sb.from('demo_chart_price').select('*').order('slot_index', { ascending: true });
  renderMiniChart('dash-price-chart', 'dash-price-tooltip', priceData, '#14A87F', (v) => '$' + Number(v).toFixed(3));
}

// ---------------- Users ----------------
async function loadUsers() {
  const { data, error } = await sb.from('demo_users').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('users-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5">아직 가입한 회원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (u) => `
    <tr>
      <td>${u.username}</td>
      <td>
        <div class="bal-edit">
          <input type="number" step="0.01" value="${u.mycoin_balance}" data-balance-input="${u.id}">
          <button data-save-balance="${u.id}">저장</button>
        </div>
      </td>
      <td>${u.referral_code || '-'}</td>
      <td>${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
      <td class="row-actions">${u.username === 'user_1' ? '<span style="color:var(--dk-text-faint);font-size:11.5px;">기본 계정</span>' : `<button class="danger" data-delete-user="${u.id}">삭제</button>`}</td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-save-balance]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.saveBalance;
      const input = tbody.querySelector(`[data-balance-input="${id}"]`);
      const value = parseFloat(input.value);
      if (isNaN(value)) return;
      await sb.from('demo_users').update({ mycoin_balance: value }).eq('id', id);
      showToast('MyCoin 잔고가 수정되었습니다.');
      loadStats();
    });
  });

  tbody.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 회원을 삭제하시겠습니까? 교환 신청 내역도 함께 삭제됩니다.')) return;
      await sb.from('demo_users').delete().eq('id', btn.dataset.deleteUser);
      loadUsers();
      loadStats();
      showToast('삭제되었습니다.');
    });
  });
}

// ---------------- Exchange requests ----------------
async function loadExchangeRequests() {
  const { data, error } = await sb
    .from('demo_exchange_requests')
    .select('*, demo_users(username)')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('exchange-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="7">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7">교환 신청 내역이 없습니다.</td></tr>';
    return;
  }

  const dirLabel = { buy: 'USDT→MyCoin', sell: 'MyCoin→USDT' };
  const statusLabel = { pending: '대기중', approved: '승인됨', rejected: '거절됨' };

  tbody.innerHTML = data
    .map((t) => {
      const actions =
        t.status === 'pending'
          ? `<button class="approve" data-approve="${t.id}" data-uid="${t.user_id}" data-dir="${t.direction}" data-amount="${t.mycoin_amount}">승인</button>
             <button class="danger" data-reject="${t.id}">거절</button>`
          : '-';
      return `
    <tr>
      <td>${new Date(t.created_at).toLocaleString('ko-KR')}</td>
      <td>${t.demo_users ? t.demo_users.username : '(삭제된 회원)'}</td>
      <td>${dirLabel[t.direction]}</td>
      <td>${fmtNum(t.mycoin_amount)}</td>
      <td>${fmtNum(t.usdt_amount)}</td>
      <td><span class="demo-badge ${t.status}">${statusLabel[t.status]}</span></td>
      <td class="row-actions">${actions}</td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { approve: reqId, uid, dir, amount } = btn.dataset;
      const { data: user } = await sb.from('demo_users').select('mycoin_balance').eq('id', uid).maybeSingle();
      if (!user) return;

      const delta = dir === 'buy' ? Number(amount) : -Number(amount);
      const newBalance = Number(user.mycoin_balance) + delta;

      await sb.from('demo_users').update({ mycoin_balance: newBalance }).eq('id', uid);
      await sb.from('demo_exchange_requests').update({ status: 'approved' }).eq('id', reqId);

      showToast('승인되었습니다.');
      loadExchangeRequests();
      loadUsers();
      loadStats();
      loadDashboardLists();
    });
  });

  tbody.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('demo_exchange_requests').update({ status: 'rejected' }).eq('id', btn.dataset.reject);
      showToast('거절 처리되었습니다.');
      loadExchangeRequests();
      loadStats();
      loadDashboardLists();
    });
  });
}

// ---------------- Chart slots ----------------
function buildSlotGrid(containerId, slots) {
  const container = document.getElementById(containerId);
  container.innerHTML = slots
    .map((s) => {
      const locked = s.slot_index <= 5;
      return `
      <div class="slot-cell ${locked ? 'locked' : ''}">
        <div class="idx">#${s.slot_index}</div>
        <input type="number" step="0.001" data-slot="${s.slot_index}" value="${s.value !== null ? s.value : ''}" ${locked ? 'disabled' : ''} placeholder="비어있음">
        ${locked ? '<span class="locked-tag">고정값</span>' : ''}
      </div>`;
    })
    .join('');
}

async function loadCharts() {
  const { data: volData } = await sb.from('demo_chart_volume').select('*').order('slot_index', { ascending: true });
  const { data: priceData } = await sb.from('demo_chart_price').select('*').order('slot_index', { ascending: true });
  if (volData) buildSlotGrid('volume-slot-grid', volData);
  if (priceData) buildSlotGrid('price-slot-grid', priceData);
}

document.getElementById('save-volume-btn').addEventListener('click', async () => {
  const inputs = document.querySelectorAll('#volume-slot-grid input:not(:disabled)');
  for (const input of inputs) {
    const idx = parseInt(input.dataset.slot, 10);
    const val = input.value.trim() === '' ? null : parseFloat(input.value);
    await sb.from('demo_chart_volume').update({ value: val }).eq('slot_index', idx);
  }
  showToast('거래 그래프 데이터가 저장되었습니다.');
});

document.getElementById('save-price-btn').addEventListener('click', async () => {
  const inputs = document.querySelectorAll('#price-slot-grid input:not(:disabled)');
  for (const input of inputs) {
    const idx = parseInt(input.dataset.slot, 10);
    const val = input.value.trim() === '' ? null : parseFloat(input.value);
    await sb.from('demo_chart_price').update({ value: val }).eq('slot_index', idx);
  }
  showToast('가격 그래프 데이터가 저장되었습니다.');
  loadDashboardChart();
});

// ---------------- Rate ----------------
async function loadRate() {
  const { data } = await sb.from('demo_settings').select('value').eq('key', 'exchange_rate').maybeSingle();
  if (data) document.getElementById('rate-input').value = data.value;
}
document.getElementById('save-rate-btn').addEventListener('click', async () => {
  const value = document.getElementById('rate-input').value;
  if (value === '' || isNaN(parseFloat(value))) return;
  await sb.from('demo_settings').upsert({ key: 'exchange_rate', value: String(value) });
  showToast('환율이 저장되었습니다.');
});

// ---------------- Newsletter ----------------
async function loadNewsletter() {
  const { data, error } = await sb.from('demo_newsletter').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('newsletter-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="3">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="3">등록된 이메일이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = data
    .map(
      (n) => `
    <tr>
      <td>${n.email}</td>
      <td>${new Date(n.created_at).toLocaleDateString('ko-KR')}</td>
      <td class="row-actions"><button class="danger" data-delete-nl="${n.id}">삭제</button></td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-delete-nl]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('demo_newsletter').delete().eq('id', btn.dataset.deleteNl);
      loadNewsletter();
      loadStats();
      showToast('삭제되었습니다.');
    });
  });
}

// ---------------- Full reset ----------------
document.getElementById('reset-all-btn').addEventListener('click', async () => {
  if (!confirm('정말 전체 회원, 교환 신청, 뉴스레터 내역을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  if (!confirm('한 번 더 확인합니다. 정말 전체 초기화하시겠습니까?')) return;

  await sb.from('demo_exchange_requests').delete().neq('id', 0);
  await sb.from('demo_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('demo_newsletter').delete().neq('id', 0);

  await sb.from('demo_users').insert([
    { username: 'user_1', pin: '1234', mycoin_balance: 500, referral_code: 'DEMO01' },
  ]);

  for (let i = 6; i <= 10; i++) {
    await sb.from('demo_chart_volume').update({ value: null }).eq('slot_index', i);
    await sb.from('demo_chart_price').update({ value: null }).eq('slot_index', i);
  }

  showToast('전체 초기화되었습니다. (기본 데모 계정 user_1은 유지됩니다)');
  initDashboard();
});

// ---------------- Init (로그인 이후에만 실행) ----------------
function initDashboard() {
  loadStats();
  loadUsers();
  loadExchangeRequests();
  loadCharts();
  loadRate();
  loadNewsletter();
  loadDashboardLists();
  loadDashboardChart();
  renderCalendar();
}
