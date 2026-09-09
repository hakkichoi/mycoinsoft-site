const sb = getSupabase();

const ADMIN_USERNAME = 'admin_user_1';
const ADMIN_PASSWORD = 'admin1234';

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

const fmtWon = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');

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
  const { data: users } = await sb.from('demo_users').select('wallet_balance');
  const { data: pending } = await sb.from('demo_transactions').select('id').eq('status', 'pending');

  document.getElementById('stat-users').textContent = users ? users.length : 0;
  const totalBalance = (users || []).reduce((sum, u) => sum + Number(u.wallet_balance), 0);
  document.getElementById('stat-balance').textContent = fmtWon(totalBalance);
  document.getElementById('stat-pending').textContent = pending ? pending.length : 0;
}

// ---------------- Users ----------------
async function loadUsers() {
  const { data, error } = await sb.from('demo_users').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('users-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6">아직 가입한 회원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (u) => `
    <tr>
      <td>${u.username}</td>
      <td>
        <div class="bal-edit">
          <input type="number" step="1000" value="${u.wallet_balance}" data-balance-input="${u.id}">
          <button data-save-balance="${u.id}">저장</button>
        </div>
      </td>
      <td>${u.referral_code}</td>
      <td>${u.referred_by || '-'}</td>
      <td>${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
      <td class="row-actions"><button class="danger" data-delete-user="${u.id}">삭제</button></td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-save-balance]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.saveBalance;
      const input = tbody.querySelector(`[data-balance-input="${id}"]`);
      const value = parseFloat(input.value);
      if (isNaN(value)) return;
      await sb.from('demo_users').update({ wallet_balance: value }).eq('id', id);
      showToast('잔액이 수정되었습니다.');
      loadStats();
    });
  });

  tbody.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 회원을 삭제하시겠습니까? 신청 내역도 함께 삭제됩니다.')) return;
      await sb.from('demo_users').delete().eq('id', btn.dataset.deleteUser);
      loadUsers();
      loadStats();
      showToast('삭제되었습니다.');
    });
  });
}

// ---------------- Transactions ----------------
async function loadTransactions() {
  const { data, error } = await sb
    .from('demo_transactions')
    .select('*, demo_users(username)')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('tx-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6">신청 내역이 없습니다.</td></tr>';
    return;
  }

  const typeLabel = { deposit: '입금', withdraw: '출금' };
  const statusLabel = { pending: '대기중', approved: '승인됨', rejected: '거절됨' };

  tbody.innerHTML = data
    .map((t) => {
      const actions =
        t.status === 'pending'
          ? `<button class="approve" data-approve="${t.id}" data-uid="${t.user_id}" data-type="${t.type}" data-amount="${t.amount}">승인</button>
             <button class="danger" data-reject="${t.id}">거절</button>`
          : '-';
      return `
    <tr>
      <td>${new Date(t.created_at).toLocaleString('ko-KR')}</td>
      <td>${t.demo_users ? t.demo_users.username : '(삭제된 회원)'}</td>
      <td>${typeLabel[t.type]}</td>
      <td>${fmtWon(t.amount)}</td>
      <td><span class="demo-badge ${t.status}">${statusLabel[t.status]}</span></td>
      <td class="row-actions">${actions}</td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { approve: txId, uid, type, amount } = btn.dataset;
      const { data: user } = await sb.from('demo_users').select('wallet_balance').eq('id', uid).maybeSingle();
      if (!user) return;

      const delta = type === 'deposit' ? Number(amount) : -Number(amount);
      const newBalance = Number(user.wallet_balance) + delta;

      await sb.from('demo_users').update({ wallet_balance: newBalance }).eq('id', uid);
      await sb.from('demo_transactions').update({ status: 'approved' }).eq('id', txId);

      showToast('승인되었습니다.');
      loadTransactions();
      loadUsers();
      loadStats();
    });
  });

  tbody.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('demo_transactions').update({ status: 'rejected' }).eq('id', btn.dataset.reject);
      showToast('거절 처리되었습니다.');
      loadTransactions();
      loadStats();
    });
  });
}

// ---------------- Notices ----------------
async function loadNoticesAdmin() {
  const { data, error } = await sb.from('demo_notices').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
  const tbody = document.getElementById('notices-tbody');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="4">불러오기 실패</td></tr>';
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4">등록된 공지가 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = data
    .map(
      (n) => `
    <tr>
      <td>${n.title}</td>
      <td>${n.pinned ? '고정' : '-'}</td>
      <td>${new Date(n.created_at).toLocaleDateString('ko-KR')}</td>
      <td class="row-actions"><button class="danger" data-delete-notice="${n.id}">삭제</button></td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-delete-notice]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 공지를 삭제하시겠습니까?')) return;
      await sb.from('demo_notices').delete().eq('id', btn.dataset.deleteNotice);
      loadNoticesAdmin();
      showToast('삭제되었습니다.');
    });
  });
}

document.getElementById('add-notice-btn').addEventListener('click', async () => {
  const title = document.getElementById('notice-title').value.trim();
  const content = document.getElementById('notice-content').value.trim();
  const pinned = document.getElementById('notice-pinned').checked;
  if (!title || !content) return;

  await sb.from('demo_notices').insert([{ title, content, pinned }]);
  document.getElementById('notice-title').value = '';
  document.getElementById('notice-content').value = '';
  document.getElementById('notice-pinned').checked = false;
  loadNoticesAdmin();
  showToast('공지가 등록되었습니다.');
});

// ---------------- Full reset ----------------
document.getElementById('reset-all-btn').addEventListener('click', async () => {
  if (!confirm('정말 전체 회원과 신청 내역을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  if (!confirm('한 번 더 확인합니다. 정말 전체 초기화하시겠습니까?')) return;

  await sb.from('demo_transactions').delete().neq('id', 0);
  await sb.from('demo_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 고정 데모 로그인 계정(user_1)은 항상 살아있어야 하므로 다시 생성
  await sb.from('demo_users').insert([
    { username: 'user_1', pin: '1234', wallet_balance: 1000000, referral_code: 'DEMO01' },
  ]);

  showToast('전체 초기화되었습니다. (기본 데모 계정 user_1은 유지됩니다)');
  loadUsers();
  loadTransactions();
  loadStats();
});

// ---------------- Init (로그인 이후에만 실행) ----------------
function initDashboard() {
  loadStats();
  loadUsers();
  loadTransactions();
  loadNoticesAdmin();
}
