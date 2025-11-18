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
    loadGame('crash'); // Default game
    initGraph();
    
    // Global Button Handlers
    document.getElementById('walletButton')?.addEventListener('click', () => document.getElementById('depositModal').classList.remove('hidden'));
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('depositModal').classList.add('hidden'));
    document.getElementById('depositButton')?.addEventListener('click', () => {
        const amt = parseFloat(document.getElementById('depositAmount').value);
        if (amt > 0) { balance += amt; updateBalanceDisplay(); document.getElementById('depositModal').classList.add('hidden'); }
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => loadGame(btn.dataset.game));
    });
});

// --- SHARED UTILS ---
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

// --- GRAPH WIDGET ---
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
    
    // Init specific game logic
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

// --- 1. MINES (Perfect Squares) ---
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
        
        document.getElementById('minesNextMultiplier').textContent = calculateMinesMultiplier(1, mineCount).toFixed(2) + 'x';
        document.getElementById('minesGemsFound').textContent = '0';
        
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
            
            // Update Multiplier
            let gemsFound = parseInt(document.getElementById('minesGemsFound').textContent) + 1;
            document.getElementById('minesGemsFound').textContent = gemsFound;
            
            multiplier = calculateMinesMultiplier(gemsFound, parseInt(document.getElementById('minesCount').value));
            document.getElementById('minesNextMultiplier').textContent = calculateMinesMultiplier(gemsFound + 1, parseInt(document.getElementById('minesCount').value)).toFixed(2) + 'x';
            
            document.getElementById('cashoutMinesButton').textContent = `Cashout $${(bet*multiplier).toFixed(2)}`;
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
            // Reveal mines
            document.querySelectorAll('.mines-tile').forEach(t => {
                if(mines.includes(parseInt(t.dataset.idx))) { 
                    t.classList.add('mine'); t.innerHTML = '<i class="fas fa-bomb"></i>'; 
                } else {
                    t.style.opacity = '0.5';
                }
            });
        }
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

// --- 2. BLACKJACK (Score & Layout) ---
function initBlackjack() {
    let deck = [], playerHand = [], dealerHand = [], bet = 0;
    
    const dealBtn = document.getElementById('blackjackDealButton');
    const hitBtn = document.getElementById('blackjackHit');
    const standBtn = document.getElementById('blackjackStand');
    const pScoreEl = document.getElementById('playerScore');
    const dScoreEl = document.getElementById('dealerScore');
    const resultEl = document.getElementById('blackjackResult');
    
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
    
    function drawCard(handDiv, hidden = false) {
        const card = deck.pop();
        const el = document.createElement('div');
        el.className = `card ${['♥','♦'].includes(card.suit) ? 'red' : 'black'}`;
        el.innerHTML = hidden ? '<div style="width:100%;height:100%;background:#3a5063;border-radius:4px;background-image:repeating-linear-gradient(45deg, #3a5063 0, #3a5063 10px, #2c4051 10px, #2c4051 20px);"></div>' : `<div>${card.rank}</div><div style="font-size:2rem">${card.suit}</div><div>${card.rank}</div>`;
        if(hidden) el.id = 'bjHiddenCard';
        handDiv.appendChild(el);
        return card;
    }
    
    function updateScores(hideDealer = true) {
        const pVal = getScore(playerHand);
        let dVal = getScore(dealerHand);
        
        pScoreEl.textContent = pVal;
        pScoreEl.classList.remove('hidden');
        
        if (hideDealer) {
            // Calculate score of visible card only
            let visibleVal = dealerHand[0].val;
            dScoreEl.textContent = visibleVal;
        } else {
            dScoreEl.textContent = dVal;
        }
        dScoreEl.classList.remove('hidden');
    }
    
    dealBtn.onclick = () => {
        bet = parseFloat(document.getElementById('blackjackBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        createDeck();
        playerHand = []; dealerHand = [];
        document.getElementById('blackjackPlayerHand').innerHTML = '';
        document.getElementById('blackjackDealerHand').innerHTML = '';
        resultEl.textContent = '';
        
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        dealerHand.push(drawCard(document.getElementById('blackjackDealerHand')));
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        dealerHand.push(drawCard(document.getElementById('blackjackDealerHand'), true));
        
        document.getElementById('blackjackBetControls').classList.add('hidden');
        document.getElementById('blackjackActionControls').classList.remove('hidden');
        
        updateScores(true);
        
        if(getScore(playerHand) === 21) endRound();
    };
    
    hitBtn.onclick = () => {
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        updateScores(true);
        if(getScore(playerHand) > 21) endRound();
    };
    
    standBtn.onclick = endRound;
    
    function getScore(hand) {
        let score = hand.reduce((a,c) => a + c.val, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while(score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }
    
    function endRound() {
        const hidden = document.getElementById('bjHiddenCard');
        if(hidden) {
            const c = dealerHand[1];
            hidden.className = `card ${['♥','♦'].includes(c.suit) ? 'red' : 'black'}`;
            hidden.innerHTML = `<div>${c.rank}</div><div style="font-size:2rem">${c.suit}</div><div>${c.rank}</div>`;
        }
        
        let pScore = getScore(playerHand);
        let dScore = getScore(dealerHand);
        
        while(dScore < 17 && pScore <= 21) {
            dealerHand.push(drawCard(document.getElementById('blackjackDealerHand')));
            dScore = getScore(dealerHand);
        }
        updateScores(false);
        
        let win = 0;
        if(pScore > 21) { resultEl.textContent = "BUST"; resultEl.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black z-20 text-red-500 drop-shadow-lg"; }
        else if(dScore > 21 || pScore > dScore) { 
            win = bet * 2; 
            if(pScore === 21 && playerHand.length === 2) win = bet * 2.5; // Blackjack
            resultEl.textContent = "WIN"; resultEl.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black z-20 text-green-500 drop-shadow-lg"; 
        }
        else if(pScore === dScore) { win = bet; resultEl.textContent = "PUSH"; resultEl.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black z-20 text-gray-300 drop-shadow-lg"; }
        else { resultEl.textContent = "LOSE"; resultEl.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black z-20 text-red-500 drop-shadow-lg"; }
        
        if(win > 0) { balance += win; updateBalanceDisplay(); updateGraph(bet, win - bet); }
        else updateGraph(bet, -bet);
        
        document.getElementById('blackjackBetControls').classList.remove('hidden');
        document.getElementById('blackjackActionControls').classList.add('hidden');
    }
}

// --- 3. DICE (Redesigned Slider) ---
function initDice() {
    const slider = document.getElementById('diceSlider');
    const handle = document.getElementById('diceHandle');
    const winBar = document.getElementById('diceWinBar');
    const betBtn = document.getElementById('playDiceButton');
    
    const updateUI = () => {
        const val = slider.value;
        // Handle moves with the value
        handle.style.left = `calc(${val}% - 28px)`;
        // Win bar is the space to the right? No, normally Over means right side is green.
        // Stake style: if "Roll Over 50", then 50-100 is green.
        winBar.style.width = `${100 - val}%`;
        winBar.style.left = `${val}%`;
        handle.textContent = val;
        
        const chance = 100 - val;
        document.getElementById('diceChanceDisplay').textContent = chance + '%';
        document.getElementById('diceMultiplierDisplay').textContent = (99 / chance).toFixed(4) + 'x';
    };
    
    slider.oninput = updateUI;
    updateUI();
    
    betBtn.onclick = () => {
        const bet = parseFloat(document.getElementById('diceBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        betBtn.disabled = true;
        slider.disabled = true;
        
        const result = Math.random() * 100;
        const target = parseFloat(slider.value);
        const win = result > target;
        const mult = 99 / (100 - target);
        
        // Animate Result Marker
        const marker = document.getElementById('diceResultMarker');
        const text = document.getElementById('diceResultText');
        marker.classList.remove('hidden', 'win', 'loss');
        marker.style.left = '0%';
        
        // Animation
        setTimeout(() => {
            marker.style.left = `${result}%`;
            marker.className = win ? 'win' : 'loss';
            
            text.textContent = result.toFixed(2);
            text.style.color = win ? '#00e701' : '#ef4444';
            text.style.opacity = 1;
            text.style.transform = 'scale(1.2)';
            
            if(win) {
                const payout = bet * mult;
                balance += payout; updateBalanceDisplay();
                updateGraph(bet, payout - bet);
            } else {
                updateGraph(bet, -bet);
            }
            
            setTimeout(() => {
                betBtn.disabled = false;
                slider.disabled = false;
                text.style.transform = 'scale(1)';
            }, 1000);
        }, 100);
    };
}

// --- 4. PLINKO (Fixed Pins & Physics) ---
function initPlinko() {
    const canvas = document.getElementById('plinkoCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('plinkoRows');
    
    // Fix canvas resolution
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
        const gap = width / (rows + 1); // Adjusted gap logic
        
        // Pyramid Generation (Corrected)
        for(let r=0; r <= rows + 1; r++) { // Extra rows for visual
            const pinsInRow = r + 3; // 3 pins at top row (index 0)
            for(let c=0; c < pinsInRow; c++) {
                // Center alignment logic
                const x = (width / 2) - ((pinsInRow - 1) * gap / 2) + (c * gap);
                const y = 50 + r * 40; 
                pins.push({x, y});
            }
        }
        
        // Update Multipliers HTML
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
    
    // Loop
    function loop() {
        ctx.clearRect(0,0, width, height);
        ctx.fillStyle = 'white';
        pins.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); });
        
        balls.forEach((b, i) => {
            b.vy += 0.5; b.y += b.vy; b.x += b.vx; // Gravity
            
            // Collision
            pins.forEach(p => {
                const dx = b.x - p.x, dy = b.y - p.y;
                if (dx*dx + dy*dy < 100) { // Hit radius
                    b.y = p.y - 10;
                    b.vy *= -0.5;
                    b.vx += (Math.random() - 0.5) * 4; // Stronger random bounce
                    // Physics bias to make distribution work
                    if(Math.abs(b.vx) < 0.5) b.vx = (Math.random() > 0.5 ? 1 : -1);
                }
            });
            
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fill();
            
            if(b.y > height - 10) {
                balls.splice(i, 1);
                // Visual Logic for landing
                const cols = parseInt(rowsInput.value) + 1;
                const bucketW = width / cols;
                const idx = Math.floor(b.x / bucketW);
                const mults = getPlinkoMultipliers(parseInt(rowsInput.value), document.getElementById('plinkoRisk').value);
                
                // Clamp index
                let safeIdx = Math.max(0, Math.min(idx, mults.length - 1));
                
                const buckets = document.querySelectorAll('.plinko-bucket');
                if(buckets[safeIdx]) {
                    buckets[safeIdx].classList.add('hit');
                    setTimeout(()=>buckets[safeIdx].classList.remove('hit'), 150);
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
        // Drop ball exactly center with tiny jitter to hit top pin
        balls.push({x: width/2 + (Math.random()-0.5), y: 10, vx: 0, vy: 0, bet});
    };
}
function getPlinkoColor(val) {
    if(val >= 100) return '#b91c1c'; 
    if(val >= 20) return '#ef4444'; 
    if(val >= 4) return '#f97316'; 
    if(val >= 1.5) return '#eab308'; 
    return '#3a5063';
}
function getPlinkoMultipliers(rows, risk) {
    // Simple array generation for demo
    const mid = Math.floor((rows + 1)/2);
    let arr = [];
    for(let i=0; i<=rows; i++) {
        const dist = Math.abs(i - mid);
        let val = 1;
        if(risk === 'high') val = Math.pow(dist, 2.5) * 0.2 + 0.2;
        else val = Math.pow(dist, 1.5) * 0.3 + 0.5;
        if(val < 0.2) val = 0.2;
        arr.push(parseFloat(val.toFixed(1)));
    }
    return arr;
}

// --- 5. LIMBO (Rapid Flash) ---
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
        let duration = 1000; // 1 second flash
        let start = Date.now();
        
        const interval = setInterval(() => {
            // Flash Random Numbers
            resDiv.textContent = (Math.random() * 100).toFixed(2) + 'x';
            resDiv.style.color = '#9ca3af';
            
            if(Date.now() - start > duration) {
                clearInterval(interval);
                resDiv.textContent = result.toFixed(2) + 'x';
                const win = result >= target;
                resDiv.style.color = win ? '#00e701' : '#ef4444';
                resDiv.style.textShadow = win ? '0 0 20px rgba(0,231,1,0.5)' : 'none';
                
                if(win) {
                    const payout = bet * target;
                    balance += payout; updateBalanceDisplay();
                    updateGraph(bet, payout - bet);
                } else {
                    updateGraph(bet, -bet);
                }
                btn.disabled = false;
            }
        }, 50);
    };
}

// --- 6. SCRATCH (Canvas Remake) ---
function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('buyScratchButton');
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    
    // Fill silver
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    // Add pattern
    ctx.fillStyle = '#6b7280';
    for(let i=0; i<200; i++) ctx.fillText('STAKEISH', Math.random()*canvas.width, Math.random()*canvas.height);
    
    let isDrawing = false;
    let prize = 0;
    
    btn.onclick = () => {
        const bet = parseFloat(document.getElementById('scratchBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        
        prize = Math.random() > 0.6 ? bet * 5 : 0;
        document.getElementById('scratchPrizeText').textContent = prize > 0 ? `$${prize}` : 'Try Again';
        document.getElementById('scratchPrizeText').className = `absolute inset-0 flex items-center justify-center text-4xl font-black z-0 ${prize > 0 ? 'text-stake-green' : 'text-gray-500'}`;
        
        // Reset Canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        btn.disabled = true;
    };
    
    function scratch(e) {
        if(!isDrawing) return;
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI*2);
        ctx.fill();
    }
    
    canvas.onmousedown = () => isDrawing = true;
    canvas.onmouseup = () => {
        isDrawing = false;
        // Auto reveal after scratch
        setTimeout(() => {
            ctx.clearRect(0,0,canvas.width, canvas.height);
            if(btn.disabled) { // Only pay once
                if(prize > 0) { balance += prize; updateBalanceDisplay(); updateGraph(10, prize-10); }
                else updateGraph(10, -10);
                btn.disabled = false;
            }
        }, 1000);
    };
    canvas.onmousemove = scratch;
}

// --- 7. SLOTS (Synced) ---
function initSlots() {
    // Keep existing logic but update timing
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
        
        // Logic check
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

// --- 8. CRASH (No Changes needed, works) ---
function initCrash() { /* Same as before */ 
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
            if(crashPoint > 50) crashPoint = 50;
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
