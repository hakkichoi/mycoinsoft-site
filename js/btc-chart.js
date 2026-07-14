/* ============================================================
   BTC/KRW 실시간 시세 그래프
   - Google Finance는 공개 API가 없어 브라우저에서 직접 호출할 수 없으므로,
     동일한 실시간 시장가를 제공하는 CoinGecko 공개 API를 사용합니다.
     (무료, API 키 불필요, 브라우저에서 바로 호출 가능하도록 검증된 소스)
   - 1분 간격으로 시세를 가져와 최근 30분을 부드러운 영역 그래프로 표시합니다.
     CoinGecko 무료 API의 실제 데이터 자체가 1~5분 주기로만 갱신되기 때문에,
     이보다 훨씬 자주 요청해도 같은 값을 반복해서 받는 경우가 많아 1분 간격이
     가장 부하 없이 의미 있는 주기입니다.
============================================================ */

(function () {
  const svg = document.getElementById('btc-chart-svg');
  if (!svg) return; // 이 페이지에 차트가 없으면 종료

  const PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=krw';
  const INTERVAL = 60 * 1000; // 1분
  const MAX_POINTS = 30; // 최근 30분

  const CHART_W = 600;
  const CHART_H = 180;
  const PAD_X = 6;
  const PAD_Y = 20;

  const pathEl = document.getElementById('btc-path');
  const areaEl = document.getElementById('btc-area');
  const dotEl = document.getElementById('btc-dot');
  const ringEl = document.getElementById('btc-pulse-ring');
  const gridEl = document.getElementById('btc-grid');
  const priceEl = document.getElementById('btc-current-price');
  const deltaEl = document.getElementById('btc-current-delta');

  let history = []; // [{ price, t }]
  let pulseStart = 0;
  let consecutiveFailures = 0;

  const fmtWon = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');

  async function fetchPrice() {
    try {
      const res = await fetch(PRICE_API);
      if (!res.ok) throw new Error('bad response: ' + res.status);
      const data = await res.json();
      const price = data && data.bitcoin && data.bitcoin.krw;
      if (!price) throw new Error('no price in response');

      consecutiveFailures = 0;
      history.push({ price, t: Date.now() });
      if (history.length > MAX_POINTS) history.shift();
      pulseStart = Date.now();

      updateHeader(price);
      render();
    } catch (err) {
      consecutiveFailures++;
      console.error('BTC 시세를 불러오지 못했습니다:', err);
      if (history.length === 0) priceEl.textContent = '연결 재시도 중…';
    }
  }

  function updateHeader(price) {
    priceEl.textContent = fmtWon(price);
    if (history.length >= 2) {
      const prev = history[history.length - 2].price;
      const diff = price - prev;
      const pct = prev ? (diff / prev) * 100 : 0;
      deltaEl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(3)}%`;
      deltaEl.className = 'btc-chart-delta ' + (diff >= 0 ? 'up' : 'down');
    }
  }

  function nextInterval() {
    // 연속 실패 시 잠시 간격을 늘려 불필요한 호출을 줄임 (부하 방지)
    return consecutiveFailures >= 3 ? INTERVAL * 3 : INTERVAL;
  }

  function scheduleNext() {
    setTimeout(async () => {
      await fetchPrice();
      scheduleNext();
    }, nextInterval());
  }

  function priceToY(price, min, max) {
    if (max === min) return CHART_H / 2;
    const t = (price - min) / (max - min);
    return (CHART_H - PAD_Y) - t * (CHART_H - PAD_Y * 2);
  }

  // 부드러운 곡선을 위한 2차 베지어 스무딩 (연속된 점 사이 중점을 앵커로 사용)
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

  function drawGrid() {
    const rows = 3;
    let html = '';
    for (let i = 0; i <= rows; i++) {
      const y = PAD_Y + (i / rows) * (CHART_H - PAD_Y * 2);
      html += `<line x1="0" y1="${y.toFixed(1)}" x2="${CHART_W}" y2="${y.toFixed(1)}" stroke="rgba(35,26,4,0.06)" stroke-width="1" />`;
    }
    gridEl.innerHTML = html;
  }

  function render() {
    if (history.length === 0) return;
    drawGrid();

    const prices = history.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const n = history.length;
    const usableW = CHART_W - PAD_X * 2;
    const step = n > 1 ? usableW / (n - 1) : 0;

    const pts = history.map((h, i) => ({
      x: n > 1 ? PAD_X + i * step : CHART_W - PAD_X,
      y: priceToY(h.price, min, max),
    }));

    const linePath = smoothPath(pts);
    pathEl.setAttribute('d', linePath);

    const areaPath = `${linePath} L${pts[pts.length - 1].x},${CHART_H} L${pts[0].x},${CHART_H} Z`;
    areaEl.setAttribute('d', areaPath);

    const newest = pts[pts.length - 1];
    dotEl.setAttribute('cx', newest.x);
    dotEl.setAttribute('cy', newest.y);
    ringEl.setAttribute('cx', newest.x);
    ringEl.setAttribute('cy', newest.y);
  }

  function animatePulse() {
    requestAnimationFrame(animatePulse);
    if (history.length === 0) return;
    const t = Math.min(1, (Date.now() - pulseStart) / 1200);
    ringEl.setAttribute('r', String(4 + t * 11));
    ringEl.setAttribute('opacity', String(0.45 * (1 - t)));
  }

  fetchPrice().then(() => scheduleNext());
  requestAnimationFrame(animatePulse);
})();
