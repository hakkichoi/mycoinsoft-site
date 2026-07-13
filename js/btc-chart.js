/* ============================================================
   BTC/KRW 실시간 시세 그래프
   - Google Finance는 공개 API가 없어 브라우저에서 직접 호출할 수 없으므로,
     동일한 실시간 시장가를 제공하는 CoinGecko 공개 API를 사용합니다.
     (무료, API 키 불필요, 브라우저에서 바로 호출 가능하도록 검증된 소스)
   - 12초 간격(분당 5회)으로 새 시세를 가져와 최근 5분 구간을 그래프로 표시합니다.
   - 현재 시세 지점은 화면 중앙보다 오른쪽에 고정되고, 지난 시세들은
     그 왼쪽으로 서서히 흘러가며 표시됩니다.
============================================================ */

(function () {
  const svg = document.getElementById('btc-chart-svg');
  if (!svg) return; // 이 페이지에 차트가 없으면 종료

  const PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=krw';
  const INTERVAL = 12 * 1000; // 12초 = 분당 5회
  const WINDOW_MINUTES = 5;
  const MAX_POINTS = Math.round((WINDOW_MINUTES * 60 * 1000) / INTERVAL); // 5분 구간에 들어가는 점 개수 (25개)

  const CHART_W = 600;
  const CHART_H = 180;
  const NOW_X = CHART_W * 0.66; // 중앙보다 오른쪽에 고정되는 "현재" 지점
  const SPACING = NOW_X / (MAX_POINTS - 1);
  const PAD_Y = 24;

  const pathEl = document.getElementById('btc-path');
  const dotEl = document.getElementById('btc-dot');
  const ringEl = document.getElementById('btc-pulse-ring');
  const gridEl = document.getElementById('btc-grid');
  const nowLineEl = document.getElementById('btc-now-line');
  const tagEl = document.getElementById('btc-price-tag');
  const priceEl = document.getElementById('btc-current-price');
  const deltaEl = document.getElementById('btc-current-delta');

  nowLineEl.setAttribute('x1', NOW_X);
  nowLineEl.setAttribute('x2', NOW_X);

  let history = []; // [{ price, t }]
  let lastFetchTime = 0;
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
      lastFetchTime = Date.now();
      pulseStart = lastFetchTime;

      updateHeader(price);
    } catch (err) {
      consecutiveFailures++;
      console.error('BTC 시세를 불러오지 못했습니다:', err);
      // 실패 시, 시간 축 흐름은 유지하되 마지막으로 알고 있던 가격을 재사용
      if (history.length > 0) {
        const lastKnown = history[history.length - 1].price;
        history.push({ price: lastKnown, t: Date.now() });
        if (history.length > MAX_POINTS) history.shift();
        lastFetchTime = Date.now();
      } else {
        priceEl.textContent = '연결 재시도 중…';
      }
    }
  }

  function updateHeader(price) {
    priceEl.textContent = fmtWon(price);
    if (history.length >= 2) {
      const prev = history[history.length - 2].price;
      const diff = price - prev;
      const pct = prev ? (diff / prev) * 100 : 0;
      deltaEl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(3)}% (${fmtWon(Math.abs(diff))})`;
      deltaEl.className = 'btc-chart-delta ' + (diff >= 0 ? 'up' : 'down');
    }
  }

  function nextInterval() {
    // 연속 실패 시 잠시 간격을 늘려 불필요한 호출을 줄임 (부하 방지)
    if (consecutiveFailures >= 3) return INTERVAL * 3;
    return INTERVAL;
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

  function drawGrid(shift) {
    let html = `<line x1="0" y1="${CHART_H / 2}" x2="${CHART_W}" y2="${CHART_H / 2}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
    const gridCount = 6; // 5분 구간을 1분 단위로 살짝 구분해주는 보조선 (분당 5개 샘플 기준)
    const gridSpacing = SPACING * (MAX_POINTS / gridCount);
    for (let i = 0; i <= gridCount; i++) {
      const x = NOW_X - i * gridSpacing - shift;
      if (x < -20 || x > CHART_W + 20) continue;
      html += `<line x1="${x}" y1="0" x2="${x}" y2="${CHART_H}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`;
    }
    gridEl.innerHTML = html;
  }

  function draw() {
    requestAnimationFrame(draw);
    if (history.length === 0) return;

    const now = Date.now();
    const progress = Math.min(1, (now - lastFetchTime) / INTERVAL);
    const shift = progress * SPACING;

    drawGrid(shift);

    const prices = history.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const n = history.length;

    const pts = history.map((h, i) => {
      const idxFromEnd = n - 1 - i; // 0 = 최신
      const x = NOW_X - idxFromEnd * SPACING - shift;
      const y = priceToY(h.price, min, max);
      return { x, y, price: h.price };
    });

    if (pts.length === 1) {
      pathEl.setAttribute('d', `M${pts[0].x},${pts[0].y} L${pts[0].x},${pts[0].y}`);
    } else {
      pathEl.setAttribute('d', pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' '));
    }

    const newest = pts[pts.length - 1];
    dotEl.setAttribute('cx', newest.x);
    dotEl.setAttribute('cy', newest.y);

    // 새 시세가 들어올 때마다 은은하게 퍼지는 펄스
    const pulseT = Math.min(1, (now - pulseStart) / 900);
    ringEl.setAttribute('cx', newest.x);
    ringEl.setAttribute('cy', newest.y);
    ringEl.setAttribute('r', 3 + pulseT * 10);
    ringEl.setAttribute('opacity', String(0.5 * (1 - pulseT)));

    drawPriceTag(newest);
  }

  function drawPriceTag(pt) {
    const label = fmtWon(pt.price);
    const boxW = Math.max(58, label.length * 6.4 + 16);
    const boxH = 20;
    // 점보다 위/아래 중 화면 안쪽으로 여유가 있는 방향에 표시
    const above = pt.y > 34;
    const boxY = above ? pt.y - boxH - 10 : pt.y + 10;
    let boxX = pt.x - boxW / 2;
    boxX = Math.max(4, Math.min(CHART_W - boxW - 4, boxX));

    tagEl.innerHTML = `
      <rect class="btc-price-tag-box" x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="4"></rect>
      <text class="btc-price-tag-text" x="${boxX + boxW / 2}" y="${boxY + boxH / 2 + 3.5}" text-anchor="middle">${label}</text>
    `;
  }

  fetchPrice().then(() => scheduleNext());
  requestAnimationFrame(draw);
})();
