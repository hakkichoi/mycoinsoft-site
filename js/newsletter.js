/* ============================================================
   뉴스레터 구독 (이메일만 입력)
   - Google 설문지(Form)에 연결해서, 응답이 자동으로 관리자의
     Google 시트에 한 줄씩 쌓이도록 합니다.
   - 설문지의 "제출" 동작을 보이지 않는 iframe 안에서 실행해서
     사용자가 다른 페이지로 이동하지 않고 이 사이트에 그대로 남습니다.
   - 설정 방법은 README.md 의 "뉴스레터 구독 설정" 항목을 참고하세요.
============================================================ */

(function () {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  const statusEl = document.getElementById('newsletter-status');
  const IFRAME_NAME = 'newsletter-hidden-frame';

  // 응답을 받을 보이지 않는 iframe 생성
  let iframe = document.querySelector(`iframe[name="${IFRAME_NAME}"]`);
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.name = IFRAME_NAME;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (NEWSLETTER_FORM_ACTION.includes('REPLACE_WITH') || NEWSLETTER_EMAIL_ENTRY.includes('REPLACE_WITH')) {
      statusEl.textContent = '아직 뉴스레터 연결이 완료되지 않았습니다. README를 참고해 설정해주세요.';
      statusEl.className = 'newsletter-status err';
      return;
    }

    const email = form.email.value.trim();
    if (!email) return;

    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = '구독 중...';
    statusEl.textContent = '';
    statusEl.className = 'newsletter-status';

    // 임시 폼을 만들어 Google Form의 formResponse 주소로 iframe 안에서 제출
    const tempForm = document.createElement('form');
    tempForm.action = NEWSLETTER_FORM_ACTION;
    tempForm.method = 'POST';
    tempForm.target = IFRAME_NAME;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = NEWSLETTER_EMAIL_ENTRY;
    input.value = email;
    tempForm.appendChild(input);

    document.body.appendChild(tempForm);
    tempForm.submit();
    document.body.removeChild(tempForm);

    setTimeout(() => {
      statusEl.textContent = '구독해주셔서 감사합니다!';
      statusEl.className = 'newsletter-status ok';
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = '구독하기';
    }, 900);
  });
})();
