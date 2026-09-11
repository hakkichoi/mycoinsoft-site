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
    initDashboard();
  } else {
    msg.textContent = '아이디 또는 비밀번호가 일치하지 않습니다.';
    msg.className = 'demo-msg err';
  }
});

document.getElementById('admin-logout-btn').addEventListener('click', () => {
  dashSection.style.display = 'none';
  loginSection.style.display = 'flex';
});

// ---------------- Tabs ----------------
document.querySelectorAll('.admin-tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  });
});

// ---------------- Stats ----------------
async function loadStats() {
  const { data: users } = await sb.from('demo_users').select('mycoin_balance');
  const { data: pending } = await sb.from('demo_exchange_requests').select('id').eq('status', 'pending');

  document.getElementById('stat-users').textContent = users ? users.length : 0;
  const totalBalance = (users || []).reduce((sum, u) => sum + Number(u.mycoin_balance), 0);
  document.getElementById('stat-balance').textContent = fmtNum(totalBalance);
  document.getElementById('stat-pending').textContent = pending ? pending.length : 0;
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
    });
  });

  tbody.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('demo_exchange_requests').update({ status: 'rejected' }).eq('id', btn.dataset.reject);
      showToast('거절 처리되었습니다.');
      loadExchangeRequests();
      loadStats();
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

  // 고정 데모 로그인 계정(user_1)은 항상 살아있어야 하므로 다시 생성
  await sb.from('demo_users').insert([
    { username: 'user_1', pin: '1234', mycoin_balance: 500, referral_code: 'DEMO01' },
  ]);

  // 차트 6~10번 슬롯을 비움 (1~5 고정값은 유지)
  for (let i = 6; i <= 10; i++) {
    await sb.from('demo_chart_volume').update({ value: null }).eq('slot_index', i);
    await sb.from('demo_chart_price').update({ value: null }).eq('slot_index', i);
  }

  showToast('전체 초기화되었습니다. (기본 데모 계정 user_1은 유지됩니다)');
  loadUsers();
  loadExchangeRequests();
  loadStats();
  loadCharts();
  loadNewsletter();
});

// ---------------- Init (로그인 이후에만 실행) ----------------
function initDashboard() {
  loadStats();
  loadUsers();
  loadExchangeRequests();
  loadCharts();
  loadRate();
  loadNewsletter();
}
