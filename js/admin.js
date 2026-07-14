const sb = getSupabase();

const loginView = document.getElementById('admin-login');
const shellView = document.getElementById('admin-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// ============================================================
// Auth
// ============================================================
async function checkSession() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showShell();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = 'flex';
  shellView.style.display = 'none';
}

function showShell() {
  loginView.style.display = 'none';
  shellView.style.display = 'flex';
  loadTimeline();
  loadContacts();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = '로그인 정보가 올바르지 않습니다.';
    return;
  }
  showShell();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ============================================================
// Sidebar nav
// ============================================================
document.querySelectorAll('.admin-nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  });
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// ============================================================
// Timeline (소개 섹션 ledger)
// ============================================================
async function loadTimeline() {
  const { data, error } = await sb.from('timeline_events').select('*').order('sort_order', { ascending: true });
  const tbody = document.querySelector('#timeline-table tbody');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">불러오기 실패</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (item) => `
    <tr>
      <td>${item.sort_order}</td>
      <td>${item.year}</td>
      <td>${item.title}</td>
      <td class="row-actions">
        <button data-edit='${JSON.stringify(item)}'>수정</button>
        <button class="danger" data-delete="${item.id}">삭제</button>
      </td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => openTimelineModal(JSON.parse(b.dataset.edit)))
  );
  tbody.querySelectorAll('[data-delete]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('삭제하시겠습니까?')) return;
      await sb.from('timeline_events').delete().eq('id', b.dataset.delete);
      loadTimeline();
      showToast('삭제되었습니다.');
    })
  );
}

const timelineModal = document.getElementById('timeline-modal');
const timelineForm = document.getElementById('timeline-form');

document.getElementById('add-timeline-btn').addEventListener('click', () => openTimelineModal());

function openTimelineModal(item) {
  timelineForm.reset();
  timelineForm.dataset.id = item ? item.id : '';
  document.getElementById('timeline-modal-title').textContent = item ? '항목 수정' : '항목 추가';
  if (item) {
    timelineForm.year.value = item.year;
    timelineForm.title.value = item.title;
    timelineForm.sort_order.value = item.sort_order;
  }
  timelineModal.classList.add('open');
}

document.querySelectorAll('[data-close-modal]').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.admin-modal-overlay').forEach((m) => m.classList.remove('open'));
  })
);

timelineForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    year: timelineForm.year.value.trim(),
    title: timelineForm.title.value.trim(),
    sort_order: parseInt(timelineForm.sort_order.value, 10) || 0,
  };
  const id = timelineForm.dataset.id;
  if (id) {
    await sb.from('timeline_events').update(payload).eq('id', id);
  } else {
    await sb.from('timeline_events').insert([payload]);
  }
  timelineModal.classList.remove('open');
  loadTimeline();
  showToast('저장되었습니다.');
});

// ============================================================
// Contact messages (문의하기 내역)
// ============================================================
async function loadContacts() {
  const { data, error } = await sb
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  const tbody = document.querySelector('#contacts-table tbody');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5">불러오기 실패</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5">아직 문의 내역이 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (c) => `
    <tr>
      <td>${new Date(c.created_at).toLocaleString('ko-KR')}</td>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td>${c.message}</td>
    </tr>`
    )
    .join('');
}

checkSession();
