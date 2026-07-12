const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    contactStatus.textContent = '';
    contactStatus.className = 'contact-status';

    const submitBtn = contactForm.querySelector('.contact-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    const payload = {
      name: contactForm.name.value.trim(),
      phone: contactForm.phone.value.trim(),
      email: contactForm.email.value.trim(),
      message: contactForm.message.value.trim(),
    };

    try {
      // 1) Supabase에 기록 (연결되어 있는 경우, 관리자 페이지에서 조회 가능)
      const sb = typeof getSupabase === 'function' ? getSupabase() : null;
      if (sb) {
        const { error } = await sb.from('contact_messages').insert([payload]);
        if (error) console.error('Supabase 저장 실패:', error);
      }

      // 2) choihakki@gmail.com 으로 즉시 이메일 발송 (FormSubmit)
      await fetch(`https://formsubmit.co/ajax/${ADMIN_NOTIFY_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `[마이코인소프트] 문의하기 - ${payload.name}`,
          ...payload,
        }),
      });

      contactStatus.textContent = '문의가 접수되었습니다. 빠른 시간내에 연락드리겠습니다.';
      contactStatus.className = 'contact-status ok';
      contactForm.reset();
    } catch (err) {
      console.error(err);
      contactStatus.textContent = '전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      contactStatus.className = 'contact-status err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '문의하기';
    }
  });
}
