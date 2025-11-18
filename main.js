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
    loadGame('crash'); 
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
    }, 50);
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-game="${name}"]`)?.classList.add('active');
}


/* ================= GAME LOGIC ================= */

// --- 1. MINES (Reveal All on Cashout) ---
function initMines() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    for(let i=0; i<25; i++) {
        const t = document.createElement('button');
        t.className = 'mines-tile';
        t.dataset.idx = i;
        grid.appendChild(t);
    }
    
    let active = false;
    let mines = [];
    let bet = 0;
    let multiplier = 1.0;
    
    document.getElementById('playMinesButton').onclick = () => {
        if(active) return;
        bet = parseFloat(document.getElementById('minesBetAmount').value);
        const mineCount = parseInt(document.getElementById('minesCount').value);
        if(bet > balance || bet <= 0) return;
        
        balance -= bet; updateBalanceDisplay();
        active = true;
        mines = Array(25).fill(0).map((_,i) => i).sort(() => Math.random()-0.5).slice(0, mineCount);
        multiplier = 1.0;
        
        document.getElementById('playMinesButton').classList.add('hidden');
        document.getElementById('cashoutMinesButton').classList.remove('hidden');
        document.getElementById('minesBetAmount').disabled = true;
        document.getElementById('minesCount').disabled = true;
        document.getElementById('minesGemsFound').textContent = '0';
        document.getElementById('minesNextMultiplier').textContent = calculateMinesMultiplier(1, mineCount).toFixed(2) + 'x';
        document.getElementById('cashoutMinesButton').textContent = `Cashout $${(bet).toFixed(2)}`;

        document.querySelectorAll('.mines-tile').forEach(t => {
            t.className = 'mines-tile'; t.innerHTML = ''; t.disabled = false;
            t.onclick = () => clickTile(t);
        });
    };
    
    function clickTile(tile) {
        if(!active) return;
        const idx = parseInt(tile.dataset.idx);
        tile.disabled = true;
        
        if(mines.includes(idx)) {
            tile.classList.add('mine'); tile.innerHTML = '<i class="fas fa-bomb"></i>'; 
            gameOver(false);
        } else {
            tile.classList.add('gem'); tile.innerHTML = '<i class="fas fa-gem"></i>';
            
            let gemsFound = parseInt(document.getElementById('minesGemsFound').textContent) + 1;
            document.getElementById('minesGemsFound').textContent = gemsFound;
            
            multiplier = calculateMinesMultiplier(gemsFound, parseInt(document.getElementById('minesCount').value));
            document.getElementById('minesNextMultiplier').textContent = calculateMinesMultiplier(gemsFound + 1, parseInt(document.getElementById('minesCount').value)).toFixed(2) + 'x';
            
            document.getElementById('cashoutMinesButton').textContent = `Cashout $${(bet*multiplier).toFixed(2)}`;
            
            if(gemsFound === (25 - mines.length)) gameOver(true);
        }
    }
    
    document.getElementById('cashoutMinesButton').onclick = () => { if(active) gameOver(true); };
    
    function gameOver(win) {
        active = false;
        if(win) {
            const payout = bet * multiplier;
            balance += payout; updateBalanceDisplay();
            updateGraph(bet, payout - bet);
        } else {
            updateGraph(bet, -bet);
        }
        
        // REVEAL FULL BOARD logic
        document.querySelectorAll('.mines-tile').forEach(t => {
            const idx = parseInt(t.dataset.idx);
            t.disabled = true;
            // If it was already clicked (has class gem or mine), skip visual change
            if(t.classList.contains('gem') || t.classList.contains('mine')) return; 
            
            if(mines.includes(idx)) {
                // It was a mine we didn't hit
                t.classList.add('revealed-mine'); 
                t.innerHTML = '<i class="fas fa-bomb"></i>';
            } else {
                // It was a gem we didn't find
                t.classList.add('revealed-safe');
                t.innerHTML = '<i class="fas fa-gem"></i>';
            }
        });

        document.getElementById('playMinesButton').classList.remove('hidden');
        document.getElementById('cashoutMinesButton').classList.add('hidden');
        document.getElementById('minesBetAmount').disabled = false;
        document.getElementById('minesCount').disabled = false;
    }
}
function calculateMinesMultiplier(gems, mines) {
    let prob = 1;
    for(let i=0; i<gems; i++) prob *= (25 - mines - i) / (25 - i);
    return 0.99 / prob;
}

// --- 2. BLACKJACK (Multi-Hand Logic) ---
function initBlackjack() {
    let deck = [], hands = [], dealerHand = {};
    // Hands array: { cards: [], bet: number, done: boolean, doubled: boolean }
    let activeHandIndex = 0;
    
    const dealBtn = document.getElementById('blackjackDealButton');
    const hitBtn = document.getElementById('blackjackHit');
    const standBtn = document.getElementById('blackjackStand');
    const doubleBtn = document.getElementById('blackjackDouble');
    const splitBtn = document.getElementById('blackjackSplit');
    
    const pArea = document.getElementById('blackjackPlayerHand');
    const dArea = document.getElementById('blackjackDealerHand');
    const resArea = document.getElementById('blackjackResult');
    
    function createDeck() {
        const suits = ['♥','♦','♣','♠'];
        const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        deck = [];
        for(let s of suits) for(let r of ranks) {
            let val = parseInt(r) || (['J','Q','K'].includes(r) ? 10 : 11);
            deck.push({suit: s, rank: r, val: val});
        }
        deck.sort(() => Math.random() - 0.5);
    }
    
    function drawCard() { return deck.pop(); }
    
    function renderHands() {
        // Render Dealer
        dArea.innerHTML = '';
        const dHandWrapper = document.createElement('div');
        dHandWrapper.className = 'hand-wrapper';
        const dCards = document.createElement('div');
        dCards.className = 'hand-cards';
        
        dealerHand.cards.forEach((c, i) => {
            const el = document.createElement('div');
            if(c.hidden) {
                el.className = 'card'; 
                el.innerHTML = '<div style="width:100%;height:100%;background:#3a5063;border-radius:4px;"></div>';
            } else {
                el.className = `card ${['♥','♦'].includes(c.suit) ? 'red' : 'black'}`;
                el.innerHTML = `<div>${c.rank}</div><div style="font-size:1.5rem">${c.suit}</div><div>${c.rank}</div>`;
            }
            dCards.appendChild(el);
        });
        
        const dScore = document.createElement('div');
        dScore.className = 'score-bubble';
        const visibleScore = dealerHand.cards[1]?.hidden ? dealerHand.cards[0].val : getScore(dealerHand.cards);
        dScore.textContent = visibleScore;
        
        dHandWrapper.appendChild(dScore);
        dHandWrapper.appendChild(dCards);
        dArea.appendChild(dHandWrapper);

        // Render Player Hands
        pArea.innerHTML = '';
        hands.forEach((h, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'hand-wrapper ' + (idx === activeHandIndex ? 'hand-active' : '');
            
            const score = document.createElement('div');
            score.className = 'score-bubble';
            score.textContent = getScore(h.cards);
            
            const cardContainer = document.createElement('div');
            cardContainer.className = 'hand-cards';
            
            h.cards.forEach(c => {
                const el = document.createElement('div');
                el.className = `card ${['♥','♦'].includes(c.suit) ? 'red' : 'black'}`;
                el.innerHTML = `<div>${c.rank}</div><div style="font-size:1.5rem">${c.suit}</div><div>${c.rank}</div>`;
                cardContainer.appendChild(el);
            });
            
            wrapper.appendChild(score);
            wrapper.appendChild(cardContainer);
            pArea.appendChild(wrapper);
        });
    }
    
    dealBtn.onclick = () => {
        const bet = parseFloat(document.getElementById('blackjackBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        createDeck();
        dealerHand = { cards: [] };
        hands = [{ cards: [], bet: bet, done: false }];
        activeHandIndex = 0;
        
        hands[0].cards.push(drawCard());
        dealerHand.cards.push(drawCard());
        hands[0].cards.push(drawCard());
        dealerHand.cards.push({ ...drawCard(), hidden: true });
        
        document.getElementById('blackjackBetControls').classList.add('hidden');
        document.getElementById('blackjackActionControls').classList.remove('hidden');
        resArea.textContent = '';
        
        renderHands();
        checkAutoActions();
    };
    
    function checkAutoActions() {
        const h = hands[activeHandIndex];
        if(getScore(h.cards) === 21) { standHand(); return; }
        
        doubleBtn.disabled = (h.cards.length !== 2 || balance < h.bet);
        // Only split if rank matches (K & 10 don't split, K & K do)
        splitBtn.disabled = (h.cards.length !== 2 || h.cards[0].rank !== h.cards[1].rank || balance < h.bet);
    }

    hitBtn.onclick = () => {
        hands[activeHandIndex].cards.push(drawCard());
        renderHands();
        if(getScore(hands[activeHandIndex].cards) > 21) standHand();
        else checkAutoActions(); // Re-eval double ability (disabled after hit)
    };

    standBtn.onclick = standHand;
    
    doubleBtn.onclick = () => {
        const h = hands[activeHandIndex];
        if(balance < h.bet) return;
        balance -= h.bet; updateBalanceDisplay();
        h.bet *= 2;
        h.cards.push(drawCard());
        renderHands();
        standHand(); // Auto stand after double
    };
    
    splitBtn.onclick = () => {
        const h = hands[activeHandIndex];
        if(balance < h.bet) return;
        balance -= h.bet; updateBalanceDisplay();
        
        const newHand = { cards: [h.cards.pop()], bet: h.bet, done: false };
        h.cards.push(drawCard());
        newHand.cards.push(drawCard());
        
        hands.push(newHand);
        renderHands();
        checkAutoActions();
    };
    
    function standHand() {
        hands[activeHandIndex].done = true;
        if(activeHandIndex < hands.length - 1) {
            activeHandIndex++;
            renderHands();
            checkAutoActions();
        } else {
            playDealer();
        }
    }
    
    function getScore(cards) {
        let score = cards.reduce((a,c) => a + c.val, 0);
        let aces = cards.filter(c => c.rank === 'A').length;
        while(score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }
    
    function playDealer() {
        dealerHand.cards[1].hidden = false;
        renderHands();
        
        const loop = setInterval(() => {
            const dScore = getScore(dealerHand.cards);
            if(dScore < 17) {
                dealerHand.cards.push(drawCard());
                renderHands();
            } else {
                clearInterval(loop);
                settle();
            }
        }, 800);
    }
    
    function settle() {
        const dScore = getScore(dealerHand.cards);
        let totalWin = 0;
        let msg = [];
        
        hands.forEach((h, i) => {
            const pScore = getScore(h.cards);
            let win = 0;
            let res = "LOSE";
            
            if(pScore > 21) { res = "BUST"; }
            else if (dScore > 21 || pScore > dScore) {
                if(pScore === 21 && h.cards.length === 2) win = h.bet * 2.5;
                else win = h.bet * 2;
                res = "WIN";
            }
            else if (pScore === dScore) { win = h.bet; res = "PUSH"; }
            
            totalWin += win;
            if(win > h.bet) updateGraph(h.bet, win - h.bet);
            else if (win === 0) updateGraph(h.bet, -h.bet);
            
            msg.push(`Hand ${i+1}: ${res}`);
        });
        
        if(totalWin > 0) {
            balance += totalWin;
            resArea.innerHTML = `<div class="text-stake-green text-5xl font-black drop-shadow-lg">WON $${totalWin}</div>`;
        } else {
            resArea.innerHTML = `<div class="text-stake-red text-5xl font-black drop-shadow-lg">DEALER WINS</div>`;
        }
        resArea.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20";
        
        updateBalanceDisplay();
        document.getElementById('blackjackBetControls').classList.remove('hidden');
        document.getElementById('blackjackActionControls').classList.add('hidden');
    }
}

// --- 3. DICE (Responsive) ---
function initDice() {
    const slider = document.getElementById('diceSlider');
    const handle = document.getElementById('diceHandle');
    const winBar = document.getElementById('diceWinBar');
    const betBtn = document.getElementById('playDiceButton');
    
    function updateUI() {
        const val = slider.value;
        handle.style.left = `calc(${val}% - 28px)`;
        winBar.style.width = `${100 - val}%`;
        winBar.style.left = `${val}%`;
        handle.textContent = val;
        
        const chance = 100 - val;
        document.getElementById('diceChanceDisplay').textContent = chance + '%';
        document.getElementById('diceMultiplierDisplay').textContent = (99 / chance).toFixed(4) + 'x';
    }
    
    slider.oninput = updateUI; // Realtime
    updateUI();
    
    betBtn.onclick = () => {
        const bet = parseFloat(document.getElementById('diceBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        betBtn.disabled = true; slider.disabled = true;
        
        const result = Math.random() * 100;
        const target = parseFloat(slider.value);
        const win = result > target;
        const mult = 99 / (100 - target);
        
        const marker = document.getElementById('diceResultMarker');
        const text = document.getElementById('diceResultText');
        marker.classList.remove('hidden', 'win', 'loss');
        marker.style.left = '0%';
        
        setTimeout(() => {
            marker.style.left = `${result}%`;
            marker.className = win ? 'win' : 'loss';
            text.textContent = result.toFixed(2);
            text.style.color = win ? '#00e701' : '#ef4444';
            text.style.opacity = 1; text.style.transform = 'scale(1.2)';
            
            if(win) { balance += bet * mult; updateBalanceDisplay(); updateGraph(bet, (bet*mult)-bet); }
            else updateGraph(bet, -bet);
            
            setTimeout(() => {
                betBtn.disabled = false; slider.disabled = false; text.style.transform = 'scale(1)';
            }, 500);
        }, 100);
    };
}

// --- 4. PLINKO (Fixed Physics) ---
function initPlinko() {
    const canvas = document.getElementById('plinkoCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('plinkoRows');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 600 * dpr;
    ctx.scale(dpr, dpr);
    
    let balls = [], pins = [];
    const width = rect.width;
    const height = 600;
    
    function drawBoard() {
        const rows = parseInt(rowsInput.value);
        pins = [];
        const gap = width / (rows + 1);
        
        for(let r=0; r <= rows + 1; r++) { 
            const pinsInRow = r + 3; 
            for(let c=0; c < pinsInRow; c++) {
                const x = (width / 2) - ((pinsInRow - 1) * gap / 2) + (c * gap);
                const y = 50 + r * 35; 
                pins.push({x, y});
            }
        }
        
        const container = document.getElementById('plinkoMultipliers');
        container.innerHTML = '';
        const mults = getPlinkoMultipliers(rows, document.getElementById('plinkoRisk').value);
        mults.forEach(m => {
            const b = document.createElement('div');
            b.className = 'plinko-bucket';
            b.style.backgroundColor = getPlinkoColor(m);
            b.textContent = m + 'x';
            b.style.width = `${(width / mults.length) - 4}px`;
            container.appendChild(b);
        });
    }
    
    rowsInput.onchange = drawBoard;
    document.getElementById('plinkoRisk').onchange = drawBoard;
    drawBoard();
    
    function loop() {
        ctx.clearRect(0,0, width, height);
        
        // Glowing Pins
        ctx.shadowBlur = 5; ctx.shadowColor = "rgba(255,255,255,0.5)";
        ctx.fillStyle = 'white';
        pins.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); });
        ctx.shadowBlur = 0;
        
        balls.forEach((b, i) => {
            b.vy += 0.5; b.y += b.vy; b.x += b.vx;
            
            pins.forEach(p => {
                const dx = b.x - p.x, dy = b.y - p.y;
                if (dx*dx + dy*dy < 100) {
                    b.y = p.y - 10; b.vy *= -0.5;
                    b.vx += (Math.random() - 0.5) * 3; 
                }
            });
            
            ctx.shadowBlur = 10; ctx.shadowColor = "#fbbf24";
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            
            if(b.y > height - 10) {
                balls.splice(i, 1);
                const cols = parseInt(rowsInput.value) + 1;
                const idx = Math.floor(b.x / (width / cols));
                const mults = getPlinkoMultipliers(parseInt(rowsInput.value), document.getElementById('plinkoRisk').value);
                const safeIdx = Math.max(0, Math.min(idx, mults.length - 1));
                
                const buckets = document.querySelectorAll('.plinko-bucket');
                if(buckets[safeIdx]) {
                    buckets[safeIdx].classList.add('hit');
                    setTimeout(()=>buckets[safeIdx].classList.remove('hit'), 200);
                }
                
                const win = b.bet * mults[safeIdx];
                balance += win; updateBalanceDisplay();
                updateGraph(b.bet, win - b.bet);
            }
        });
        window.plinkoLoop = requestAnimationFrame(loop);
    }
    loop();
    
    document.getElementById('playPlinkoButton').onclick = () => {
        const bet = parseFloat(document.getElementById('plinkoBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        // Offset start slightly to prevent stacking/top-pin stuck
        balls.push({x: width/2 + (Math.random()*4 - 2), y: 10, vx: 0, vy: 0, bet});
    };
}
function getPlinkoColor(val) {
    if(val >= 100) return '#b91c1c'; 
    if(val >= 10) return '#ef4444'; 
    if(val >= 2) return '#f97316'; 
    if(val >= 1) return '#eab308'; 
    return '#3a5063';
}
function getPlinkoMultipliers(rows, risk) {
    let arr = [];
    const mid = Math.floor((rows+1)/2);
    for(let i=0; i<=rows; i++) {
        const dist = Math.abs(i-mid);
        let v = (risk === 'high') ? Math.pow(dist, 2.5)*0.2 : Math.pow(dist, 1.5)*0.4;
        arr.push(parseFloat(Math.max(0.2, v).toFixed(1)));
    }
    return arr;
}

// --- 5. LIMBO (Big Font) ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    const resDiv = document.getElementById('limboResult');
    
    btn.onclick = () => {
        const bet = parseFloat(document.getElementById('limboBetAmount').value);
        const target = parseFloat(document.getElementById('limboTargetMultiplier').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        btn.disabled = true;
        
        const result = 0.99 / (1 - Math.random());
        let start = Date.now();
        
        const interval = setInterval(() => {
            resDiv.innerHTML = `<span style="font-size:6rem; font-weight:900; color:#4b5563;">${(Math.random()*100).toFixed(2)}x</span>`;
            
            if(Date.now() - start > 600) {
                clearInterval(interval);
                const win = result >= target;
                resDiv.innerHTML = `<span style="font-size:8rem; font-weight:900; color:${win?'#00e701':'#ef4444'}; text-shadow: 0 0 30px ${win?'rgba(0,231,1,0.3)':'rgba(239,68,68,0.3)'}">${result.toFixed(2)}x</span>`;
                
                if(win) {
                    const payout = bet * target;
                    balance += payout; updateBalanceDisplay();
                    updateGraph(bet, payout - bet);
                } else {
                    updateGraph(bet, -bet);
                }
                btn.disabled = false;
            }
        }, 30);
    };
}

// --- 6. SCRATCH (Auto Reveal) ---
function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('buyScratchButton');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    
    let isDrawing = false;
    let prize = 0;
    let bet = 0;
    let pixelsScratched = 0;
    const totalPixels = canvas.width * canvas.height;
    
    function resetCover() {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#6b7280';
        ctx.font = '20px Arial';
        for(let i=0; i<50; i++) ctx.fillText('$$$', Math.random()*canvas.width, Math.random()*canvas.height);
    }
    resetCover();
    
    btn.onclick = () => {
        bet = parseFloat(document.getElementById('scratchBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        prize = Math.random() > 0.6 ? bet * 5 : 0;
        document.getElementById('scratchPrizeText').textContent = prize > 0 ? `$${prize}` : 'No Win';
        document.getElementById('scratchPrizeText').className = `absolute inset-0 flex items-center justify-center text-5xl font-black z-0 ${prize > 0 ? 'text-stake-green' : 'text-gray-400'}`;
        
        resetCover();
        pixelsScratched = 0;
        btn.disabled = true;
    };
    
    function scratch(e) {
        if(!isDrawing) return;
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI*2); ctx.fill();
        pixelsScratched += 1500;
    }
    
    canvas.onmousedown = () => isDrawing = true;
    canvas.onmouseup = () => {
        isDrawing = false;
        // Check progress (approx 30% revealed)
        if (pixelsScratched > totalPixels * 0.3) {
            ctx.clearRect(0,0,canvas.width, canvas.height); // Reveal all
            if(btn.disabled) { 
                if(prize > 0) { balance += prize; updateBalanceDisplay(); updateGraph(bet, prize-bet); }
                else updateGraph(bet, -bet);
                btn.disabled = false;
            }
        }
    };
    canvas.onmousemove = scratch;
}

// --- 7. SLOTS (Same as before) ---
function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    const reels = Array.from(document.querySelectorAll('.reel'));
    const symbols = ['🍒','🍋','🍊','🍉','🍇','💎'];
    
    btn.onclick = async () => {
        const bet = parseFloat(document.getElementById('slotsBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        btn.disabled = true;
        document.getElementById('slotsResult').textContent = '';
        
        reels.forEach(r => r.classList.add('spinning'));
        const outcome = [0,0,0].map(()=>symbols[Math.floor(Math.random()*symbols.length)]);
        
        for(let i=0; i<3; i++) {
            await new Promise(r => setTimeout(r, 600));
            reels[i].classList.remove('spinning');
            reels[i].textContent = outcome[i];
        }
        
        let win = 0;
        if(outcome[0] == outcome[1] && outcome[1] == outcome[2]) win = bet * 20;
        else if(outcome[0] == outcome[1] || outcome[1] == outcome[2]) win = bet * 2;
        
        const resEl = document.getElementById('slotsResult');
        if(win > 0) {
            balance += win; updateBalanceDisplay(); updateGraph(bet, win-bet);
            resEl.innerHTML = `<span class="text-stake-green">WIN $${win}</span>`;
        } else {
            updateGraph(bet, -bet);
            resEl.innerHTML = `<span class="text-gray-500">Loss</span>`;
        }
        btn.disabled = false;
    };
}

// --- 8. CRASH (Same as before) ---
function initCrash() {
    const canvas = document.getElementById('crashGameCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('playCrashButton');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    let state = 'IDLE', multiplier=1, crashPoint=0, startTime=0, bet=0, cashedOut=false;
    
    btn.onclick = () => {
        if(state === 'IDLE') {
            bet = parseFloat(document.getElementById('crashBetAmount').value);
            if(bet > balance) return;
            balance -= bet; updateBalanceDisplay();
            state = 'RUNNING'; startTime = Date.now(); cashedOut = false;
            crashPoint = 0.99 / (1-Math.random());
            btn.textContent = 'CASHOUT'; btn.style.backgroundColor = '#fbbf24';
            loop();
        } else if(state === 'RUNNING' && !cashedOut) {
            const win = bet * multiplier;
            balance += win; updateBalanceDisplay(); updateGraph(bet, win-bet);
            cashedOut = true; btn.textContent = 'CASHED'; btn.disabled = true;
        }
    };
    
    function loop() {
        if(state !== 'RUNNING') return;
        const t = (Date.now() - startTime) / 1000;
        multiplier = 1 + (t*t*0.1);
        
        ctx.fillStyle = '#0f212e'; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.beginPath(); ctx.strokeStyle = 'white'; ctx.lineWidth = 4;
        ctx.moveTo(0, canvas.height);
        const x = (multiplier-1)/10 * canvas.width;
        const y = canvas.height - ((multiplier-1)/5 * canvas.height);
        ctx.quadraticCurveTo(x/2, canvas.height, x, y);
        ctx.stroke();
        
        document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size:4rem; font-weight:900; color:white">${multiplier.toFixed(2)}x</div>`;
        
        if(multiplier >= crashPoint) {
            state = 'CRASHED';
            document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size:4rem; font-weight:900; color:#ef4444">CRASH @ ${crashPoint.toFixed(2)}x</div>`;
            if(!cashedOut) updateGraph(bet, -bet);
            btn.disabled = true; btn.textContent = 'CRASHED'; btn.style.backgroundColor = '#ef4444';
            setTimeout(()=>{
                state = 'IDLE'; btn.disabled = false; btn.textContent = 'PLACE BET'; btn.style.backgroundColor = '#00e701';
                ctx.clearRect(0,0,canvas.width, canvas.height);
                document.getElementById('crashGameDisplay').innerHTML = '';
            }, 3000);
        } else requestAnimationFrame(loop);
    }
}
