(function () {
  const sb = getSupabase();
  const SESSION_KEY = 'demo01_user_id';

  const authSection = document.getElementById('auth-section');
  const dashSection = document.getElementById('dash-section');
  const fmtWon = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');

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

  // ---------------- Stat: total demo users ----------------
  async function loadStat() {
    const { count } = await sb.from('demo_users').select('id', { count: 'exact', head: true });
    const el = document.getElementById('stat-total-users');
    if (el) el.textContent = count != null ? count.toLocaleString('ko-KR') : '0';
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

    document.getElementById('dash-balance').textContent = fmtWon(user.wallet_balance);
    document.getElementById('dash-username').textContent = user.username;
    document.getElementById('dash-refcode').textContent = user.referral_code;

    loadTransactions(userId);
  }

  async function loadTransactions(userId) {
    const { data, error } = await sb
      .from('demo_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const tbody = document.querySelector('#tx-table tbody');
    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">신청 내역이 없습니다.</td></tr>';
      return;
    }

    const typeLabel = { deposit: '입금', withdraw: '출금' };
    const statusLabel = { pending: '대기중', approved: '승인됨', rejected: '거절됨' };

    tbody.innerHTML = data
      .map(
        (t) => `
      <tr>
        <td>${new Date(t.created_at).toLocaleString('ko-KR')}</td>
        <td>${typeLabel[t.type]}</td>
        <td>${fmtWon(t.amount)}</td>
        <td><span class="demo-badge ${t.status}">${statusLabel[t.status]}</span></td>
      </tr>`
      )
      .join('');
  }

  // ---------------- Tx submit ----------------
  const txForm = document.getElementById('tx-form');
  const txMsg = document.getElementById('tx-msg');

  txForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return;

    const type = document.getElementById('tx-type').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    if (!amount || amount <= 0) return;

    const { error } = await sb.from('demo_transactions').insert([{ user_id: userId, type, amount, status: 'pending' }]);
    if (error) {
      txMsg.textContent = '신청 중 오류가 발생했습니다.';
      txMsg.className = 'demo-msg err';
      return;
    }

    txMsg.textContent = '신청이 접수되었습니다. 관리자 승인을 기다려주세요.';
    txMsg.className = 'demo-msg ok';
    txForm.reset();
    loadTransactions(userId);
  });

  // ---------------- Copy referral ----------------
  document.getElementById('copy-ref-btn').addEventListener('click', () => {
    const code = document.getElementById('dash-refcode').textContent;
    const url = `${location.origin}${location.pathname}?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-ref-btn');
      const original = btn.textContent;
      btn.textContent = '복사됨!';
      setTimeout(() => (btn.textContent = original), 1500);
    });
  });

  // ---------------- Logout / reset ----------------
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    dashSection.style.display = 'none';
    authSection.style.display = 'block';
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!confirm('내 데모 데이터를 초기화하시겠습니까? 잔액이 100만원으로 되돌아가고 신청 내역이 모두 삭제됩니다.')) return;
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return;

    await sb.from('demo_transactions').delete().eq('user_id', userId);
    await sb.from('demo_users').update({ wallet_balance: 1000000 }).eq('id', userId);
    loadDashboard();
  });

  // ---------------- Notices ----------------
  async function loadNotices() {
    const { data, error } = await sb
      .from('demo_notices')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    const box = document.getElementById('notice-list');
    if (error || !data || data.length === 0) {
      box.innerHTML = '<div class="demo-notice-item">등록된 공지사항이 없습니다.</div>';
      return;
    }

    box.innerHTML = data
      .map(
        (n) => `
      <div class="demo-notice-item">
        <h4>${n.pinned ? '<span class="pin-tag">고정</span>' : ''}${n.title}</h4>
        <p>${n.content}</p>
      </div>`
      )
      .join('');
  }

  // ---------------- Init ----------------
  document.addEventListener('DOMContentLoaded', () => {
    loadNotices();
    loadStat();
    if (localStorage.getItem(SESSION_KEY)) {
      loadDashboard();
    }
  });
})();
