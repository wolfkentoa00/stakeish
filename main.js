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
    loadGame('crash'); // Default
    initGraph();
    
    // Global Buttons
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
                tension: 0.3,
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

// --- 1. SLOTS (Polished) ---
function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    const reels = [
        document.getElementById('slotsReels').children[0], 
        document.getElementById('slotsReels').children[1], 
        document.getElementById('slotsReels').children[2]
    ];
    const symbols = ['🍒','🍋','🍊','🍉','🍇','💎','🍀','7️⃣'];
    
    btn.addEventListener('click', async () => {
        const bet = parseFloat(document.getElementById('slotsBetAmount').value);
        if(bet > balance || bet <= 0) return alert('Invalid Bet');
        
        balance -= bet;
        updateBalanceDisplay();
        btn.disabled = true;
        document.getElementById('slotsResult').textContent = '';
        
        // Spin Animation
        reels.forEach(r => {
            r.classList.add('spinning');
            r.textContent = ''; // Clear text while spinning (handled by CSS ::after)
        });
        
        let outcome = [0,0,0].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        // Stop reels nicely
        for(let i=0; i<3; i++) {
            await new Promise(r => setTimeout(r, 400 + (i*300)));
            reels[i].classList.remove('spinning');
            reels[i].textContent = outcome[i];
            reels[i].style.transform = "scale(1.1)";
            setTimeout(() => reels[i].style.transform = "scale(1)", 100);
        }
        
        // Payouts
        let winMult = 0;
        if(outcome[0] == outcome[1] && outcome[1] == outcome[2]) {
            if(outcome[0] === '7️⃣') winMult = 100;
            else if(outcome[0] === '💎') winMult = 50;
            else winMult = 20;
        } 
        else if(outcome[0] == outcome[1] || outcome[1] == outcome[2]) winMult = 2; 
        
        const win = bet * winMult;
        balance += win;
        updateBalanceDisplay();
        updateGraph(bet, win - bet);
        
        const msg = document.getElementById('slotsResult');
        if(win > 0) { msg.textContent = `WIN: $${win.toFixed(2)}`; msg.style.color = '#22c55e'; }
        else { msg.textContent = 'Try Again'; msg.style.color = '#ef4444'; }
        
        btn.disabled = false;
    });
}

// --- 2. SCRATCH (Fixed Input Coordinates) ---
function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('buyScratchButton');
    const coverColor = '#3a5063';
    let isScratching = false;
    let ticketValue = 0;
    
    // Draw Cover
    ctx.fillStyle = coverColor;
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    btn.addEventListener('click', () => {
        const bet = parseFloat(document.getElementById('scratchBetAmount').value);
        if(bet > balance) return alert('No funds');
        
        balance -= bet;
        updateBalanceDisplay();
        btn.disabled = true;
        
        // Determine Win
        const win = Math.random() > 0.6 ? bet * (Math.floor(Math.random()*5)+2) : 0;
        ticketValue = win;
        
        // Setup Result Text Behind
        let resText = document.getElementById('scratchPrizeText');
        if(!resText) {
            resText = document.createElement('div');
            resText.id = 'scratchPrizeText';
            resText.className = 'absolute inset-0 flex items-center justify-center text-4xl font-bold pointer-events-none';
            resText.style.zIndex = '0'; 
            canvas.parentElement.insertBefore(resText, canvas);
        }
        resText.textContent = win > 0 ? `$${win}` : 'No Win';
        resText.style.color = win > 0 ? '#22c55e' : '#9ca3af';
        
        // Reset Canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = coverColor;
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        // Scratch Events
        canvas.onmousedown = () => isScratching = true;
        document.onmouseup = () => isScratching = false;
        
        canvas.onmousemove = (e) => {
            if(!isScratching) return;
            const rect = canvas.getBoundingClientRect();
            // Important: Scale mouse pos to canvas resolution
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI*2);
            ctx.fill();
        };
        
        // Auto reveal
        setTimeout(() => {
            ctx.clearRect(0,0,canvas.width, canvas.height);
            if(ticketValue > 0) {
                balance += ticketValue;
                updateGraph(bet, ticketValue - bet);
            } else {
                updateGraph(bet, -bet);
            }
            updateBalanceDisplay();
            btn.disabled = false;
        }, 3000);
    });
}

// --- 3. PLINKO (Fixed Pins, Difficulty & Colors) ---
function initPlinko() {
    const canvas = document.getElementById('plinkoCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('plinkoRows');
    const riskInput = document.getElementById('plinkoRisk');
    const startBtn = document.getElementById('playPlinkoButton');
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 500;
    
    let balls = [];
    let pins = [];
    
    // Colors for buckets (Green -> Yellow -> Orange -> Red)
    function getBucketColor(val) {
        if(val >= 100) return '#b91c1c'; // Dark Red
        if(val >= 20) return '#ef4444'; // Red
        if(val >= 5) return '#f97316'; // Orange
        if(val >= 2) return '#eab308'; // Yellow
        if(val >= 1) return '#84cc16'; // Lime
        return '#3a5063'; // Loss/Break-even
    }
    
    function drawBoard() {
        const rows = parseInt(rowsInput.value);
        pins = [];
        const gap = canvas.width / (rows + 2);
        
        // Pins (Start higher up)
        for(let r=0; r < rows; r++) {
            for(let c=0; c <= r; c++) {
                const x = (canvas.width/2) - (r * gap / 2) + (c * gap);
                const y = 50 + r * 35; // 50px top margin, 35px vertical spacing
                pins.push({x, y});
            }
        }
        
        // Buckets
        const bucketContainer = document.getElementById('plinkoMultipliers');
        bucketContainer.innerHTML = '';
        const multipliers = getPlinkoMultipliers(rows, riskInput.value);
        
        multipliers.forEach(m => {
            const b = document.createElement('div');
            b.className = 'plinko-bucket';
            b.style.backgroundColor = getBucketColor(m);
            b.textContent = m + 'x';
            b.style.width = `${(canvas.width / multipliers.length) - 2}px`; // -2 for margin
            bucketContainer.appendChild(b);
        });
    }
    
    // Event Listeners
    rowsInput.onchange = drawBoard;
    riskInput.onchange = drawBoard;
    drawBoard();
    
    // Physics Loop
    function loop() {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        
        // Draw Pins
        ctx.fillStyle = 'white';
        pins.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); });
        
        // Update Balls
        balls.forEach((b, i) => {
            b.y += b.vy; b.x += b.vx; b.vy += 0.4; // Gravity
            
            // Collision with Pins
            pins.forEach(p => {
                const dx = b.x - p.x; const dy = b.y - p.y;
                if(Math.sqrt(dx*dx + dy*dy) < 8) {
                    b.y = p.y - 8; // Snap up to avoid sticky
                    b.vy *= -0.5; // Bounce
                    b.vx += (Math.random() - 0.5) * 2; // Random bounce
                    // Bias towards center slightly
                    if(b.x < canvas.width/2) b.vx += 0.1; else b.vx -= 0.1;
                }
            });
            
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fill();
            
            // Hit Floor
            if(b.y > canvas.height - 20) {
                balls.splice(i, 1);
                // Determine visual bucket hit based on X position
                const bucketWidth = canvas.width / (parseInt(rowsInput.value) + 1);
                const bucketIndex = Math.floor(b.x / bucketWidth);
                const mults = getPlinkoMultipliers(parseInt(rowsInput.value), riskInput.value);
                
                // Safety clamp
                const idx = Math.max(0, Math.min(bucketIndex, mults.length - 1));
                const mult = mults[idx];
                
                const win = b.bet * mult;
                balance += win; updateBalanceDisplay();
                updateGraph(b.bet, win - b.bet);
                
                // Visual flash
                const buckets = document.querySelectorAll('.plinko-bucket');
                if(buckets[idx]) {
                    buckets[idx].classList.add('hit');
                    setTimeout(()=>buckets[idx].classList.remove('hit'), 200);
                }
            }
        });
        window.plinkoLoop = requestAnimationFrame(loop);
    }
    loop();
    
    startBtn.onclick = () => {
        const bet = parseFloat(document.getElementById('plinkoBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        // Drop ball with slight random X offset
        balls.push({x: canvas.width/2 + (Math.random()-0.5)*10, y: 20, vx: 0, vy: 0, bet: bet});
    };
}

function getPlinkoMultipliers(rows, risk) {
    // Simplified configs for demo
    if(risk === 'high') {
        const base = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];
        return adjustArr(base, rows + 1);
    } else if (risk === 'medium') {
        const base = [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110];
        return adjustArr(base, rows + 1);
    } else {
        const base = [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16];
        return adjustArr(base, rows + 1);
    }
}
function adjustArr(arr, targetLen) {
    // Simple resize/crop for logic
    if(arr.length === targetLen) return arr;
    if(arr.length > targetLen) {
        const diff = arr.length - targetLen;
        return arr.slice(diff/2, arr.length - diff/2);
    }
    return arr; // Should ideally interpolate
}

// --- 4. CRASH (Standard) ---
function initCrash() {
    const canvas = document.getElementById('crashGameCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('playCrashButton');
    
    // Resize
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    
    let state = 'IDLE';
    let multiplier = 1.00;
    let crashPoint = 0;
    let startTime = 0;
    let bet = 0;
    let cashedOut = false;
    
    btn.onclick = () => {
        if (state === 'IDLE') {
            bet = parseFloat(document.getElementById('crashBetAmount').value);
            if(bet > balance || bet <= 0) return;
            balance -= bet; updateBalanceDisplay();
            crashPoint = 0.99 / (1 - Math.random());
            if(crashPoint > 100) crashPoint = 100; 
            state = 'RUNNING'; startTime = Date.now(); cashedOut = false;
            btn.textContent = 'CASHOUT'; btn.style.backgroundColor = '#fbbf24'; btn.style.color = 'black';
            loop();
        } else if (state === 'RUNNING' && !cashedOut) {
            const win = bet * multiplier;
            balance += win; updateBalanceDisplay();
            updateGraph(bet, win - bet);
            cashedOut = true;
            btn.textContent = 'CASHED OUT'; btn.disabled = true;
        }
    };
    
    function loop() {
        if (state !== 'RUNNING') return;
        const elapsed = (Date.now() - startTime) / 1000; 
        multiplier = 1 + (elapsed * elapsed * 0.1); 
        
        ctx.fillStyle = '#0f212e'; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.beginPath(); ctx.strokeStyle = 'white'; ctx.lineWidth = 4;
        ctx.moveTo(0, canvas.height);
        const x = (multiplier - 1) / 10 * canvas.width;
        const y = canvas.height - ((multiplier - 1) / 5 * canvas.height);
        ctx.quadraticCurveTo(x/2, canvas.height, x, y);
        ctx.stroke();
        
        document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size: 4rem; font-weight: bold;">${multiplier.toFixed(2)}x</div>`;
        
        if (multiplier >= crashPoint) {
            state = 'CRASHED';
            document.getElementById('crashGameDisplay').innerHTML = `<div style="color: #ef4444; font-size: 4rem; font-weight: bold;">CRASHED @ ${crashPoint.toFixed(2)}x</div>`;
            if(!cashedOut) updateGraph(bet, -bet);
            btn.disabled = true; btn.textContent = 'CRASHED'; btn.style.backgroundColor = '#ef4444'; btn.style.color = 'white';
            setTimeout(() => {
                state = 'IDLE'; btn.disabled = false; btn.textContent = 'PLACE BET';
                btn.style.backgroundColor = '#00e701'; btn.style.color = '#0f212e';
                ctx.clearRect(0,0,canvas.width, canvas.height);
                document.getElementById('crashGameDisplay').innerHTML = '';
            }, 3000);
        } else {
            window.crashLoop = requestAnimationFrame(loop);
        }
    }
}

// --- 5. BLACKJACK (Full) ---
function initBlackjack() {
    let deck = [], playerHand = [], dealerHand = [], bet = 0;
    const dealBtn = document.getElementById('blackjackDealButton');
    const hitBtn = document.getElementById('blackjackHit');
    const standBtn = document.getElementById('blackjackStand');
    
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
        el.innerHTML = hidden ? '<div style="width:100%;height:100%;background:#3a5063;border-radius:4px;"></div>' : `${card.rank}<br><span style="font-size:1.5rem">${card.suit}</span>`;
        if(hidden) el.id = 'bjHiddenCard';
        handDiv.appendChild(el);
        return card;
    }
    
    dealBtn.onclick = () => {
        bet = parseFloat(document.getElementById('blackjackBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        createDeck();
        playerHand = []; dealerHand = [];
        document.getElementById('blackjackPlayerHand').innerHTML = '';
        document.getElementById('blackjackDealerHand').innerHTML = '';
        document.getElementById('blackjackResult').textContent = '';
        
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        dealerHand.push(drawCard(document.getElementById('blackjackDealerHand')));
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        dealerHand.push(drawCard(document.getElementById('blackjackDealerHand'), true));
        
        document.getElementById('blackjackBetControls').classList.add('hidden');
        document.getElementById('blackjackActionControls').classList.remove('hidden');
    };
    
    hitBtn.onclick = () => {
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
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
            hidden.innerHTML = `${c.rank}<br><span style="font-size:1.5rem">${c.suit}</span>`;
        }
        
        let pScore = getScore(playerHand);
        let dScore = getScore(dealerHand);
        
        while(dScore < 17 && pScore <= 21) {
            dealerHand.push(drawCard(document.getElementById('blackjackDealerHand')));
            dScore = getScore(dealerHand);
        }
        
        let win = 0;
        const resDiv = document.getElementById('blackjackResult');
        if(pScore > 21) { resDiv.textContent = "BUST"; resDiv.style.color = "#ef4444"; }
        else if(dScore > 21 || pScore > dScore) { win = bet * 2; resDiv.textContent = "WIN"; resDiv.style.color = "#22c55e"; }
        else if(pScore === dScore) { win = bet; resDiv.textContent = "PUSH"; resDiv.style.color = "white"; }
        else { resDiv.textContent = "LOSE"; resDiv.style.color = "#ef4444"; }
        
        if(win > 0) { balance += win; updateBalanceDisplay(); updateGraph(bet, win - bet); }
        else updateGraph(bet, -bet);
        
        document.getElementById('blackjackBetControls').classList.remove('hidden');
        document.getElementById('blackjackActionControls').classList.add('hidden');
    }
}

// --- 6. MINES (Visuals & Fix) ---
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
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        active = true;
        mines = Array(25).fill(0).map((_,i) => i).sort(() => Math.random()-0.5).slice(0, mineCount);
        multiplier = 1.0;
        
        document.getElementById('playMinesButton').classList.add('hidden');
        document.getElementById('cashoutMinesButton').classList.remove('hidden');
        document.getElementById('minesBetAmount').disabled = true;
        document.getElementById('minesCount').disabled = true;
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
            tile.classList.add('mine'); tile.innerHTML = '💣'; gameOver(false);
        } else {
            tile.classList.add('gem'); tile.innerHTML = '💎';
            multiplier *= 1.2;
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
            document.querySelectorAll('.mines-tile').forEach(t => {
                if(mines.includes(parseInt(t.dataset.idx))) { t.classList.add('mine'); t.innerHTML = '💣'; }
                else { t.style.opacity = '0.5'; }
            });
        }
        document.getElementById('playMinesButton').classList.remove('hidden');
        document.getElementById('cashoutMinesButton').classList.add('hidden');
        document.getElementById('minesBetAmount').disabled = false;
        document.getElementById('minesCount').disabled = false;
    }
}

// --- 7. LIMBO (Looping Animation) ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    const resultDiv = document.getElementById('limboResult');
    
    btn.onclick = () => {
        const bet = parseFloat(document.getElementById('limboBetAmount').value);
        const target = parseFloat(document.getElementById('limboTargetMultiplier').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        btn.disabled = true;
        
        const finalResult = (0.99 / (1 - Math.random()));
        let flashCount = 0;
        
        // Flashing Loop
        const interval = setInterval(() => {
            const rand = (Math.random() * 100).toFixed(2);
            resultDiv.innerHTML = `<div style="font-size:3rem; font-weight:bold; color:#6b7280">${rand}x</div>`;
            flashCount++;
            if(flashCount > 15) {
                clearInterval(interval);
                finish();
            }
        }, 50);
        
        function finish() {
            const win = finalResult >= target;
            const color = win ? '#22c55e' : '#ef4444';
            resultDiv.innerHTML = `<div style="font-size:4rem; font-weight:bold; color:${color}">${finalResult.toFixed(2)}x</div>`;
            if(win) {
                const payout = bet * target;
                balance += payout; updateGraph(bet, payout - bet);
            } else {
                updateGraph(bet, -bet);
            }
            updateBalanceDisplay();
            btn.disabled = false;
        }
    };
}

// --- 8. DICE ---
function initDice() {
    const btn = document.getElementById('playDiceButton');
    if(btn) btn.onclick = () => {
        const bet = parseFloat(document.getElementById('diceBetAmount').value);
        const rollOver = parseInt(document.getElementById('diceSlider').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        const result = Math.random() * 100;
        const win = result > rollOver;
        const mult = 99 / (100 - rollOver);
        
        document.getElementById('diceResultDisplay').textContent = result.toFixed(2);
        document.getElementById('diceResultDisplay').style.color = win ? '#22c55e' : 'white';
        
        if(win) { balance += bet * mult; updateGraph(bet, (bet*mult)-bet); }
        else updateGraph(bet, -bet);
        updateBalanceDisplay();
    };
}
