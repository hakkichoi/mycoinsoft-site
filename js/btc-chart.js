/* ============================================================
   BTC/KRW 실시간 시세 그래프
   - Google Finance는 공개 API가 없어 브라우저에서 직접 호출할 수 없으므로,
     동일한 실시간 시장가를 제공하는 CoinGecko 공개 API를 사용합니다.
     (무료, API 키 불필요, 브라우저에서 바로 호출 가능)
   - 1분 간격으로 새 시세를 가져오고, 그 사이에는 화면이 천천히
     오른쪽에서 왼쪽으로 흐르는 것처럼 매 프레임 다시 그립니다.
============================================================ */

(function () {
  const svg = document.getElementById('btc-chart-svg');
  if (!svg) return; // 이 페이지에 차트가 없으면 종료

  const PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=krw';
  const INTERVAL = 60 * 1000; // 1분
  const MAX_POINTS = 5;

  const CHART_W = 600;
  const CHART_H = 180;
  const NOW_X = CHART_W * 0.66; // 중앙보다 오른쪽에 고정되는 "현재" 지점
  const SPACING = NOW_X / (MAX_POINTS - 1);
  const PAD_Y = 28;

  const pathEl = document.getElementById('btc-path');
  const dotEl = document.getElementById('btc-dot');
  const ringEl = document.getElementById('btc-pulse-ring');
  const gridEl = document.getElementById('btc-grid');
  const labelsEl = document.getElementById('btc-labels');
  const priceEl = document.getElementById('btc-current-price');
  const deltaEl = document.getElementById('btc-current-delta');

  let history = []; // [{ price, t }]
  let lastFetchTime = 0;
  let pulseStart = 0;

  const fmtWon = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');

  async function fetchPrice() {
    try {
      const res = await fetch(PRICE_API);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const price = data && data.bitcoin && data.bitcoin.krw;
      if (!price) throw new Error('no price');

      history.push({ price, t: Date.now() });
      if (history.length > MAX_POINTS) history.shift();
      lastFetchTime = Date.now();
      pulseStart = lastFetchTime;

      priceEl.textContent = fmtWon(price);
      if (history.length >= 2) {
        const prev = history[history.length - 2].price;
        const diff = price - prev;
        const pct = (diff / prev) * 100;
        deltaEl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}% (${fmtWon(Math.abs(diff))})`;
        deltaEl.className = 'btc-chart-delta ' + (diff >= 0 ? 'up' : 'down');
      }
    } catch (err) {
      console.error('BTC 시세를 불러오지 못했습니다:', err);
      if (history.length === 0) priceEl.textContent = '연결 재시도 중…';
    }
  }

  function priceToY(price, min, max) {
    if (max === min) return CHART_H / 2;
    const t = (price - min) / (max - min);
    return (CHART_H - PAD_Y) - t * (CHART_H - PAD_Y * 2);
  }

  function drawGrid(shift) {
    let html = `<line x1="0" y1="${CHART_H / 2}" x2="${CHART_W}" y2="${CHART_H / 2}" stroke="rgba(61,220,132,0.08)" stroke-width="1" />`;
    for (let i = 0; i < MAX_POINTS; i++) {
      const x = NOW_X - i * SPACING - shift;
      html += `<line x1="${x}" y1="0" x2="${x}" y2="${CHART_H}" stroke="rgba(61,220,132,0.07)" stroke-width="1" />`;
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

    // 심장박동처럼 퍼지는 펄스 링
    const pulseT = Math.min(1, (now - pulseStart) / 1400);
    ringEl.setAttribute('cx', newest.x);
    ringEl.setAttribute('cy', newest.y);
    ringEl.setAttribute('r', 4 + pulseT * 14);
    ringEl.setAttribute('opacity', String(0.55 * (1 - pulseT)));

    // 마지막 2개 가격만 아주 작게 표시
    const lastTwo = pts.slice(-2);
    labelsEl.innerHTML = lastTwo
      .map((p, i) => {
        const isNewest = i === lastTwo.length - 1;
        const yOff = p.y < CHART_H / 2 ? 16 : -10;
        return `<text class="btc-price-label" x="${p.x}" y="${p.y + yOff}" text-anchor="middle" opacity="${isNewest ? 1 : 0.55}">${fmtWon(p.price)}</text>`;
      })
      .join('');
  }

  fetchPrice();
  setInterval(fetchPrice, INTERVAL);
  requestAnimationFrame(draw);
})();
