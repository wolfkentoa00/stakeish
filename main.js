// --- GLOBAL STATE ---
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;
let graphData = JSON.parse(localStorage.getItem('stakeishGraphData')) || [];
let profitChart = null;

// --- DOM ELEMENTS ---
const balanceDisplay = document.getElementById('balanceDisplay');
const gameArea = document.getElementById('game-area');
const floatingGraph = document.getElementById('floatingGraph');

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    loadGame('crash'); // Default load
    initGraph();
    
    document.getElementById('walletButton')?.addEventListener('click', () => document.getElementById('depositModal').classList.remove('hidden'));
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('depositModal').classList.add('hidden'));
    document.getElementById('depositButton')?.addEventListener('click', () => {
        const amt = parseFloat(document.getElementById('depositAmount').value);
        if (amt > 0) { balance += amt; updateBalanceDisplay(); document.getElementById('depositModal').classList.add('hidden'); }
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => loadGame(btn.dataset.game));
    });
});

// --- UTILS ---
function updateBalanceDisplay() {
    if(balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
    localStorage.setItem('stakeishBalance', balance);
}

function modifyBet(inputId, modifier) {
    const input = document.getElementById(inputId);
    if (!input || input.disabled) return;
    let val = parseFloat(input.value) || 0;
    if (modifier === 'max') val = balance;
    else val *= modifier;
    input.value = Math.max(0, Math.floor(val * 100) / 100);
}
window.modifyBet = modifyBet; 

function updateGraph(wager, profit) {
    graphData.push({ wager, profit, total: balance });
    if(graphData.length > 50) graphData.shift(); 
    localStorage.setItem('stakeishGraphData', JSON.stringify(graphData));
    drawGraph();
}

// --- GRAPH ---
function initGraph() {
    let isDown = false, offset = [0,0];
    const header = document.getElementById('graphHeader');
    
    header.addEventListener('mousedown', (e) => { isDown = true; offset = [floatingGraph.offsetLeft - e.clientX, floatingGraph.offsetTop - e.clientY]; });
    document.addEventListener('mouseup', () => { isDown = false; });
    document.addEventListener('mousemove', (e) => {
        if (isDown) { floatingGraph.style.left = (e.clientX + offset[0]) + 'px'; floatingGraph.style.top = (e.clientY + offset[1]) + 'px'; }
    });
    
    document.getElementById('graphToggleBtn')?.addEventListener('click', () => floatingGraph.classList.toggle('hidden'));
    document.getElementById('hideGraphBtn')?.addEventListener('click', () => floatingGraph.classList.add('hidden'));
    document.getElementById('clearGraphBtn')?.addEventListener('click', () => { graphData = []; updateGraph(0,0); });
    
    drawGraph();
}

function drawGraph() {
    const canvas = document.getElementById('profitChart');
    if(!canvas) return;
    if(profitChart) profitChart.destroy();
    
    const labels = graphData.map((_, i) => i);
    const data = graphData.reduce((acc, curr) => {
        const last = acc.length > 0 ? acc[acc.length-1] : 0;
        acc.push(last + curr.profit);
        return acc;
    }, []);
    
    const color = (data[data.length-1] >= 0) ? '#22c55e' : '#ef4444';
    
    profitChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color + '33',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: '#2c4051' } } },
            animation: false
        }
    });

    let totalWager = graphData.reduce((a,b) => a + b.wager, 0);
    let totalProfit = data.length > 0 ? data[data.length-1] : 0;
    document.getElementById('graphWagered').textContent = `$${totalWager.toFixed(2)}`;
    const pEl = document.getElementById('graphProfit');
    pEl.textContent = `$${totalProfit.toFixed(2)}`;
    pEl.style.color = totalProfit >= 0 ? '#22c55e' : '#ef4444';
}

// --- GAME LOADER ---
async function loadGame(name) {
    if(window.crashLoop) cancelAnimationFrame(window.crashLoop);
    if(window.plinkoLoop) cancelAnimationFrame(window.plinkoLoop);
    
    const res = await fetch(`${name}.html`);
    if(!res.ok) return;
    gameArea.innerHTML = await res.text();
    
    setTimeout(() => {
        if(name === 'slots') initSlots();
        if(name === 'scratch') initScratch();
        if(name === 'blackjack') initBlackjack();
        if(name === 'mines') initMines();
        if(name === 'crash') initCrash();
        if(name === 'plinko') initPlinko();
        if(name === 'dice') initDice();
        if(name === 'limbo') initLimbo();
        if(name === 'cases') initCases();
    }, 50);
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-game="${name}"]`)?.classList.add('active');
}

/* ================= GAME LOGIC ================= */

// --- 1. CASES (Stake/CSGO Style) ---
function initCases() {
    const strip = document.getElementById('casesStrip');
    const btn = document.getElementById('playCasesButton');
    const resDiv = document.getElementById('casesResult');
    
    // Generate weights
    const items = [
        { val: 1.1, color: 'blue', prob: 0.7 },
        { val: 1.5, color: 'blue', prob: 0.7 },
        { val: 2.0, color: 'purple', prob: 0.2 },
        { val: 5.0, color: 'purple', prob: 0.2 },
        { val: 10, color: 'red', prob: 0.09 },
        { val: 50, color: 'red', prob: 0.09 },
        { val: 100, color: 'gold', prob: 0.01 }
    ];
    
    function getRandomItem() {
        const r = Math.random();
        if(r < 0.7) return items[Math.floor(Math.random()*2)]; // Blue
        if(r < 0.9) return items[Math.floor(Math.random()*2) + 2]; // Purple
        if(r < 0.99) return items[Math.floor(Math.random()*2) + 4]; // Red
        return items[6]; // Gold
    }
    
    function createCard(item) {
        const div = document.createElement('div');
        div.className = `case-item ${item.color}`;
        // Using generic icon for now
        div.innerHTML = `<i class="fas fa-cube text-white text-2xl"></i><span class="val">${item.val}x</span>`;
        return div;
    }
    
    btn.onclick = () => {
        const bet = parseFloat(document.getElementById('casesBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        btn.disabled = true;
        resDiv.innerHTML = '<div class="text-gray-500">Rolling...</div>';
        
        // 1. Determine Result
        const resultItem = getRandomItem();
        
        // 2. Build Strip
        strip.innerHTML = '';
        strip.style.transition = 'none';
        strip.style.transform = 'translateX(0px)';
        
        const cardWidth = 104; // 100px width + 4px margin
        const resultIndex = 75;
        const totalCards = 100;
        
        for(let i=0; i<totalCards; i++) {
            if(i === resultIndex) {
                const el = createCard(resultItem);
                el.id = 'winningCard'; // Tag for later
                strip.appendChild(el);
            }
            else strip.appendChild(createCard(getRandomItem()));
        }
        
        // Force reflow
        strip.offsetHeight;
        
        // 3. Animate
        const viewWidth = strip.parentElement.offsetWidth;
        const targetX = (viewWidth / 2) - (resultIndex * cardWidth) - (cardWidth / 2);
        const randomOffset = Math.floor(Math.random() * 80) - 40;
        
        strip.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.10, 1)'; 
        strip.style.transform = `translateX(${targetX + randomOffset}px)`;
        
        setTimeout(() => {
            const win = bet * resultItem.val;
            balance += win; updateBalanceDisplay();
            updateGraph(bet, win - bet);
            
            const winnerEl = document.getElementById('winningCard');
            if(winnerEl) winnerEl.classList.add('winning-item');
            
            resDiv.innerHTML = `<div class="text-2xl font-bold" style="color:${resultItem.color==='gold'?'#fbbf24':resultItem.color==='red'?'#ef4444':'#ffffff'}">YOU WON ${resultItem.val}x ($${win.toFixed(2)})</div>`;
            btn.disabled = false;
        }, 4000);
    };
}

// --- 2. PLINKO (Physics + Walls) ---
function initPlinko() {
    const canvas = document.getElementById('plinkoCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('plinkoRows');
    const riskInput = document.getElementById('plinkoRisk');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    const GRAVITY = 0.25;
    const BALL_RADIUS = 5;
    const PIN_RADIUS = 3;
    
    let balls = [];
    let pins = [];
    let multipliers = [];
    
    function createBoard() {
        pins = [];
        const rows = parseInt(rowsInput.value);
        const padding = 20;
        const gap = (width - (padding*2)) / (rows + 2);
        const startY = 50;
        
        for(let r=0; r<rows; r++) {
            const pinsInRow = r + 3;
            const rowWidth = (pinsInRow - 1) * gap;
            const xStart = (width - rowWidth) / 2;
            for(let c=0; c<pinsInRow; c++) {
                pins.push({ x: xStart + c*gap, y: startY + r*gap });
            }
        }
        
        const container = document.getElementById('plinkoMultipliers');
        container.innerHTML = '';
        multipliers = getPlinkoMultipliers(rows, riskInput.value);
        
        multipliers.forEach(m => {
            const el = document.createElement('div');
            el.className = 'plinko-bucket';
            el.textContent = `${m}x`;
            el.style.backgroundColor = getPlinkoColor(m);
            el.style.width = `${gap - 4}px`; 
            container.appendChild(el);
        });
    }
    
    function getPlinkoMultipliers(rows, risk) {
        const count = rows + 1;
        const center = Math.floor(count/2);
        const arr = [];
        const riskFactor = risk === 'high' ? 0.3 : risk === 'medium' ? 0.1 : 0.05;
        const base = risk === 'high' ? 0.2 : 0.5;
        
        for(let i=0; i<count; i++) {
            const dist = Math.abs(i - center);
            let val = base + (Math.pow(dist, risk === 'high' ? 2.5 : 2) * riskFactor);
            arr.push(parseFloat(val.toFixed(1)));
        }
        return arr;
    }

    function loop() {
        ctx.clearRect(0,0,width,height);
        
        ctx.fillStyle = 'white';
        pins.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, PIN_RADIUS, 0, Math.PI*2); ctx.fill();
        });
        
        balls.forEach((b, i) => {
            b.vy += GRAVITY;
            b.x += b.vx;
            b.y += b.vy;
            
            // Pin Collision
            pins.forEach(p => {
                const dx = b.x - p.x;
                const dy = b.y - p.y;
                const distSq = dx*dx + dy*dy;
                const minDist = BALL_RADIUS + PIN_RADIUS;
                
                if(distSq < minDist*minDist) {
                    const dist = Math.sqrt(distSq);
                    const nx = dx/dist;
                    const ny = dy/dist;
                    const dot = b.vx*nx + b.vy*ny;
                    b.vx -= 2*dot*nx; b.vy -= 2*dot*ny;
                    b.vx += (Math.random()-0.5) * 0.5;
                    b.vy *= 0.6; 
                    b.x += nx * (minDist - dist); b.y += ny * (minDist - dist);
                }
            });

            // **FIX: Wall Boundaries**
            if (b.x < BALL_RADIUS) {
                b.x = BALL_RADIUS;
                b.vx *= -0.5;
            } else if (b.x > width - BALL_RADIUS) {
                b.x = width - BALL_RADIUS;
                b.vx *= -0.5;
            }
            
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI*2); ctx.fill();
            
            if(b.y > height - 30) {
                balls.splice(i, 1);
                const bucketWidth = width / multipliers.length;
                let idx = Math.floor(b.x / bucketWidth);
                if(idx < 0) idx = 0;
                if(idx >= multipliers.length) idx = multipliers.length - 1;
                
                const buckets = document.querySelectorAll('.plinko-bucket');
                if(buckets[idx]) {
                    buckets[idx].classList.add('hit');
                    setTimeout(()=>buckets[idx].classList.remove('hit'), 200);
                }
                
                const win = b.bet * multipliers[idx];
                balance += win; updateBalanceDisplay();
                if(win > b.bet) updateGraph(b.bet, win-b.bet); else updateGraph(b.bet, -b.bet);
            }
        });
        window.plinkoLoop = requestAnimationFrame(loop);
    }
    
    createBoard();
    rowsInput.onchange = createBoard;
    riskInput.onchange = createBoard;
    loop();
    
    document.getElementById('playPlinkoButton').onclick = () => {
        const bet = parseFloat(document.getElementById('plinkoBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        balls.push({ x: width/2 + (Math.random()*4-2), y: 20, vx: 0, vy: 0, bet: bet });
    };
}
function getPlinkoColor(val) {
    if(val >= 20) return '#ef4444';
    if(val >= 5) return '#f97316';
    if(val >= 1.5) return '#eab308';
    return '#3a5063';
}

// --- 3. BLACKJACK (Controls Fix) ---
function initBlackjack() {
    let deck=[], hands=[], dealerHand={cards:[]}, activeHandIndex=0;
    const els = {
        deal: document.getElementById('blackjackDealButton'),
        hit: document.getElementById('blackjackHit'),
        stand: document.getElementById('blackjackStand'),
        double: document.getElementById('blackjackDouble'),
        pHand: document.getElementById('blackjackPlayerHand'),
        dHand: document.getElementById('blackjackDealerHand'),
        res: document.getElementById('blackjackResult'),
        controls: document.getElementById('blackjackActionControls'),
        betInput: document.getElementById('blackjackBetAmount')
    };

    function createDeck() {
        const suits = ['♥','♦','♣','♠'];
        const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        deck = [];
        for(let s of suits) for(let r of ranks) deck.push({s, r, v: parseInt(r)||(['J','Q','K'].includes(r)?10:11)});
        deck.sort(() => Math.random()-.5);
    }
    function draw() { return deck.pop(); }

    function render() {
        // Dealer
        els.dHand.innerHTML = '';
        const dWrap = document.createElement('div'); dWrap.className = 'hand-wrapper';
        const dCards = document.createElement('div'); dCards.className = 'hand-cards';
        dealerHand.cards.forEach(c => {
            const el = document.createElement('div');
            if(c.h) { el.className = 'card'; el.innerHTML = '<div style="width:100%;height:100%;background:#3a5063;border-radius:4px"></div>'; }
            else { el.className = `card ${['♥','♦'].includes(c.s)?'red':'black'}`; el.innerHTML = `<div>${c.r}</div><div style="font-size:1.5rem">${c.s}</div><div>${c.r}</div>`; }
            dCards.appendChild(el);
        });
        const dScore = document.createElement('div'); dScore.className='score-bubble'; 
        dScore.textContent = dealerHand.cards.some(c=>c.h) ? dealerHand.cards[0].v : getScore(dealerHand.cards);
        dWrap.append(dScore, dCards); els.dHand.appendChild(dWrap);

        // Player
        els.pHand.innerHTML = '';
        hands.forEach((h, i) => {
            const wrap = document.createElement('div'); wrap.className = `hand-wrapper ${i===activeHandIndex?'hand-active':''}`;
            const cards = document.createElement('div'); cards.className = 'hand-cards';
            h.cards.forEach(c => {
                const el = document.createElement('div'); el.className = `card ${['♥','♦'].includes(c.s)?'red':'black'}`;
                el.innerHTML = `<div>${c.r}</div><div style="font-size:1.5rem">${c.s}</div><div>${c.r}</div>`;
                cards.appendChild(el);
            });
            const score = document.createElement('div'); score.className='score-bubble'; score.textContent = getScore(h.cards);
            wrap.append(score, cards); els.pHand.appendChild(wrap);
        });
    }

    els.deal.onclick = () => {
        const bet = parseFloat(els.betInput.value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        createDeck();
        dealerHand = { cards: [] };
        hands = [{ cards: [], bet: bet, done: false }];
        activeHandIndex = 0;
        
        hands[0].cards.push(draw());
        dealerHand.cards.push(draw());
        hands[0].cards.push(draw());
        dealerHand.cards.push({ ...draw(), h: true });
        
        // **FIX: Hide Deal button, Show Actions, Disable Input**
        els.deal.classList.add('hidden');
        els.controls.classList.remove('hidden');
        els.betInput.disabled = true;
        els.res.innerHTML = '';
        render(); checkAuto();
    };

    function checkAuto() {
        const score = getScore(hands[activeHandIndex].cards);
        if(score === 21) stand();
        else els.double.disabled = (hands[activeHandIndex].cards.length !== 2 || balance < hands[activeHandIndex].bet);
    }

    els.hit.onclick = () => {
        hands[activeHandIndex].cards.push(draw());
        render();
        if(getScore(hands[activeHandIndex].cards) > 21) stand();
        else els.double.disabled = true;
    };
    
    els.stand.onclick = stand;
    els.double.onclick = () => {
        const h = hands[activeHandIndex];
        if(balance < h.bet) return;
        balance -= h.bet; updateBalanceDisplay();
        h.bet *= 2; h.cards.push(draw()); render(); stand();
    };

    function stand() {
        hands[activeHandIndex].done = true;
        if(activeHandIndex < hands.length - 1) { activeHandIndex++; render(); checkAuto(); }
        else playDealer();
    }

    function playDealer() {
        dealerHand.cards.forEach(c => c.h = false);
        render();
        const int = setInterval(() => {
            if(getScore(dealerHand.cards) < 17) { dealerHand.cards.push(draw()); render(); }
            else { clearInterval(int); settle(); }
        }, 800);
    }

    function settle() {
        const dScore = getScore(dealerHand.cards);
        let tot = 0;
        hands.forEach(h => {
            const pScore = getScore(h.cards);
            let win = 0;
            if(pScore > 21) win = 0;
            else if(dScore > 21 || pScore > dScore) win = (pScore===21 && h.cards.length===2) ? h.bet*2.5 : h.bet*2;
            else if(pScore === dScore) win = h.bet;
            tot += win;
            if(win > h.bet) updateGraph(h.bet, win-h.bet); else if(win===0) updateGraph(h.bet, -h.bet);
        });
        if(tot > 0) { balance += tot; updateBalanceDisplay(); els.res.innerHTML = `<div class="text-stake-green text-5xl font-black drop-shadow-lg">WON $${tot}</div>`; }
        else els.res.innerHTML = `<div class="text-stake-red text-5xl font-black drop-shadow-lg">DEALER WINS</div>`;
        
        // **FIX: Show Deal button, Hide Actions, Enable Input**
        els.controls.classList.add('hidden');
        els.deal.classList.remove('hidden');
        els.betInput.disabled = false;
    }

    function getScore(cards) {
        let s = cards.reduce((a,c) => a + c.v, 0);
        let aces = cards.filter(c => c.r === 'A').length;
        while(s > 21 && aces > 0) { s -= 10; aces--; }
        return s;
    }
}

// --- 4. DICE (Flip + Bar Fix) ---
function initDice() {
    const slider = document.getElementById('diceSlider');
    const handle = document.getElementById('diceHandle');
    const bar = document.getElementById('diceWinBar');
    const flipBtn = document.getElementById('diceFlipButton');
    const modeText = document.getElementById('diceModeText');
    
    let isRollOver = true;
    
    flipBtn.onclick = () => {
        isRollOver = !isRollOver;
        modeText.textContent = isRollOver ? "Roll Over" : "Roll Under";
        update();
    };
    
    function update() {
        const val = parseFloat(slider.value);
        handle.style.left = `${val}%`;
        handle.innerHTML = val;
        
        // **FIX: Bar Direction based on Mode**
        if(isRollOver) {
            bar.style.left = `${val}%`;
            bar.style.width = `${100 - val}%`;
            bar.style.borderRadius = "0 30px 30px 0";
        } else {
            bar.style.left = '0%';
            bar.style.width = `${val}%`;
            bar.style.borderRadius = "30px 0 0 30px";
        }
        
        const chance = isRollOver ? (100 - val) : val;
        document.getElementById('diceChanceDisplay').textContent = chance + '%';
        // Avoid division by zero
        const safeChance = Math.max(0.01, chance);
        document.getElementById('diceMultiplierDisplay').textContent = (99/safeChance).toFixed(4) + 'x';
    }
    slider.oninput = update; update();
    
    document.getElementById('playDiceButton').onclick = () => {
        const bet = parseFloat(document.getElementById('diceBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        const target = parseFloat(slider.value);
        const res = Math.random() * 100;
        // **FIX: Win logic based on Mode**
        const win = isRollOver ? (res > target) : (res < target);
        const chance = isRollOver ? (100 - target) : target;
        
        const marker = document.getElementById('diceResultMarker');
        const text = document.getElementById('diceResultText');
        
        marker.classList.remove('hidden', 'win', 'loss');
        marker.style.left = `${res}%`;
        
        setTimeout(() => {
            marker.classList.add(win ? 'win' : 'loss');
            text.textContent = res.toFixed(2);
            text.style.color = win ? '#00e701' : '#ef4444';
            text.style.transform = 'scale(1.2)';
            
            if(win) {
                const profit = bet * (99/Math.max(0.01, chance));
                balance += profit; updateBalanceDisplay();
                updateGraph(bet, profit-bet);
            } else updateGraph(bet, -bet);
            
            setTimeout(() => text.style.transform = 'scale(1)', 500);
        }, 300);
    };
}

// --- 5. MINES (Standard) ---
function initMines() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        const t = document.createElement('button'); t.className='mines-tile'; t.dataset.idx=i; grid.appendChild(t);
    }
    let active=false, mines=[], bet=0, found=0;
    
    document.getElementById('playMinesButton').onclick = () => {
        if(active) return;
        bet = parseFloat(document.getElementById('minesBetAmount').value);
        if(bet>balance) return;
        balance-=bet; updateBalanceDisplay();
        active=true; mines = Array(25).fill(0).map((_,i)=>i).sort(()=>Math.random()-.5).slice(0, parseInt(document.getElementById('minesCount').value));
        found=0;
        document.getElementById('playMinesButton').classList.add('hidden');
        document.getElementById('cashoutMinesButton').classList.remove('hidden');
        document.getElementById('cashoutMinesButton').textContent = `Cashout $${bet.toFixed(2)}`;
        document.querySelectorAll('.mines-tile').forEach(t => { t.className='mines-tile'; t.innerHTML=''; t.disabled=false; t.onclick=()=>hit(t); });
    };
    
    function hit(t) {
        if(!active) return;
        const idx = parseInt(t.dataset.idx);
        if(mines.includes(idx)) {
            t.classList.add('mine'); t.innerHTML = '<i class="fas fa-bomb"></i>';
            active=false; updateGraph(bet, -bet); reveal();
        } else {
            t.classList.add('gem'); t.innerHTML = '<i class="fas fa-gem"></i>'; t.disabled=true;
            found++;
            let m = 1; for(let i=0; i<found; i++) m *= (25-mines.length-i)/(25-i); m = 0.99/m;
            document.getElementById('cashoutMinesButton').textContent = `Cashout $${(bet*m).toFixed(2)}`;
            if(found === 25 - mines.length) cashout();
        }
    }
    
    document.getElementById('cashoutMinesButton').onclick = cashout;
    function cashout() {
        if(!active) return;
        let m = 1; for(let i=0; i<found; i++) m *= (25-mines.length-i)/(25-i); m = 0.99/m;
        const win = bet*m;
        balance+=win; updateBalanceDisplay(); updateGraph(bet, win-bet);
        active=false; reveal();
    }
    
    function reveal() {
        document.getElementById('playMinesButton').classList.remove('hidden');
        document.getElementById('cashoutMinesButton').classList.add('hidden');
        document.querySelectorAll('.mines-tile').forEach(t => {
            t.disabled=true;
            const idx = parseInt(t.dataset.idx);
            if(mines.includes(idx) && !t.classList.contains('mine')) { t.classList.add('revealed-mine'); t.innerHTML='<i class="fas fa-bomb"></i>'; }
            else if(!mines.includes(idx) && !t.classList.contains('gem')) { t.classList.add('revealed-safe'); t.innerHTML='<i class="fas fa-gem"></i>'; }
        });
    }
}

// --- 6. SCRATCH ---
function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('buyScratchButton');
    canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight;
    let drawing=false, prize=0, bet=0, scratched=0;
    
    function reset() {
        ctx.fillStyle='#9ca3af'; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle='#6b7280'; for(let i=0; i<20; i++) ctx.fillText('$$$', Math.random()*canvas.width, Math.random()*canvas.height);
    } reset();
    
    btn.onclick = () => {
        bet = parseFloat(document.getElementById('scratchBetAmount').value);
        if(bet>balance) return;
        balance-=bet; updateBalanceDisplay();
        prize = Math.random() > 0.65 ? bet * 5 : 0;
        document.getElementById('scratchPrizeText').textContent = prize > 0 ? `$${prize}` : 'No Win';
        document.getElementById('scratchPrizeText').className = `absolute inset-0 flex items-center justify-center text-5xl font-black z-0 ${prize>0?'text-stake-green':'text-gray-400'}`;
        reset(); scratched=0; btn.disabled=true;
    };
    
    canvas.onmousemove = (e) => {
        if(!drawing) return;
        const r = canvas.getBoundingClientRect();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(e.clientX-r.left, e.clientY-r.top, 30, 0, Math.PI*2); ctx.fill();
        scratched += 100;
    };
    canvas.onmousedown=()=>drawing=true;
    canvas.onmouseup=() => {
        drawing=false;
        if(scratched > 2000 && btn.disabled) {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            if(prize>0) { balance+=prize; updateBalanceDisplay(); updateGraph(bet, prize-bet); } else updateGraph(bet, -bet);
            btn.disabled=false;
        }
    };
}

// --- 7. SLOTS ---
function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    const reels = Array.from(document.querySelectorAll('.reel'));
    const sym = ['🍒','🍋','🍊','🍉','💎'];
    
    btn.onclick = async () => {
        const bet = parseFloat(document.getElementById('slotsBetAmount').value);
        if(bet>balance) return;
        balance-=bet; updateBalanceDisplay(); btn.disabled=true;
        reels.forEach(r => r.classList.add('spinning'));
        const res = [0,0,0].map(()=>sym[Math.floor(Math.random()*sym.length)]);
        for(let i=0; i<3; i++) {
            await new Promise(r=>setTimeout(r, 500));
            reels[i].classList.remove('spinning'); reels[i].textContent = res[i];
        }
        let win = 0;
        if(res[0]===res[1] && res[1]===res[2]) win = bet * (res[0]==='💎'?50:20);
        else if(res[0]===res[1] || res[1]===res[2]) win = bet * 2;
        
        if(win>0) { balance+=win; updateBalanceDisplay(); updateGraph(bet, win-bet); document.getElementById('slotsResult').innerHTML=`<span class="text-stake-green">WIN $${win}</span>`; }
        else { updateGraph(bet, -bet); document.getElementById('slotsResult').innerHTML='<span class="text-gray-500">Loss</span>'; }
        btn.disabled=false;
    };
}

// --- 8. LIMBO ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    const resDiv = document.getElementById('limboResult');
    btn.onclick = () => {
        const bet = parseFloat(document.getElementById('limboBetAmount').value);
        const target = parseFloat(document.getElementById('limboTargetMultiplier').value);
        if(bet>balance) return;
        balance-=bet; updateBalanceDisplay(); btn.disabled=true;
        
        let val = 1.00;
        const end = 0.99/(1-Math.random());
        const t = setInterval(() => {
            val += val * 0.1;
            if(val >= end) {
                clearInterval(t);
                const win = end >= target;
                resDiv.innerHTML = `<span style="font-size:5rem;font-weight:900;color:${win?'#00e701':'#ef4444'}">${end.toFixed(2)}x</span>`;
                if(win) { const p = bet*target; balance+=p; updateBalanceDisplay(); updateGraph(bet, p-bet); }
                else updateGraph(bet, -bet);
                btn.disabled=false;
            } else resDiv.innerHTML = `<span style="font-size:4rem;font-weight:900;color:#6b7280">${val.toFixed(2)}x</span>`;
        }, 50);
    };
}

// --- 9. CRASH ---
function initCrash() {
    const canvas = document.getElementById('crashGameCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('playCrashButton');
    canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight;
    
    let state='IDLE', mult=1, crash=0, start=0, bet=0, cashed=false;
    
    btn.onclick = () => {
        if(state==='IDLE') {
            bet = parseFloat(document.getElementById('crashBetAmount').value);
            if(bet>balance) return;
            balance-=bet; updateBalanceDisplay();
            state='RUNNING'; start=Date.now(); cashed=false;
            crash = 0.99 / (1-Math.random());
            btn.textContent = 'CASHOUT'; btn.style.backgroundColor = '#eab308';
            loop();
        } else if(state==='RUNNING' && !cashed) {
            const win = bet*mult; balance+=win; updateBalanceDisplay(); updateGraph(bet, win-bet);
            cashed=true; btn.textContent='CASHED'; btn.disabled=true;
        }
    };
    
    function loop() {
        if(state!=='RUNNING') return;
        const t = (Date.now()-start)/1000;
        mult = 1 + (t*t*0.1);
        
        ctx.fillStyle='#0f212e'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.beginPath(); ctx.strokeStyle='white'; ctx.lineWidth=5;
        ctx.moveTo(0, canvas.height);
        ctx.quadraticCurveTo(canvas.width*0.5, canvas.height, canvas.width*((mult-1)/10), canvas.height - (canvas.height*((mult-1)/5)));
        ctx.stroke();
        
        document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size:4rem;font-weight:900;color:white">${mult.toFixed(2)}x</div>`;
        
        if(mult >= crash) {
            state='CRASHED';
            document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size:4rem;font-weight:900;color:#ef4444">CRASH @ ${crash.toFixed(2)}x</div>`;
            if(!cashed) updateGraph(bet, -bet);
            btn.disabled=true; btn.style.backgroundColor='#ef4444'; btn.textContent='CRASHED';
            setTimeout(() => {
                state='IDLE'; btn.disabled=false; btn.textContent='PLACE BET'; btn.style.backgroundColor='#00e701';
                ctx.clearRect(0,0,canvas.width,canvas.height);
                document.getElementById('crashGameDisplay').innerHTML='';
            }, 3000);
        } else requestAnimationFrame(loop);
    }
}
