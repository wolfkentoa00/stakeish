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
window.modifyBet = modifyBet; // Expose to HTML

function updateGraph(wager, profit) {
    graphData.push({ wager, profit, total: balance });
    if(graphData.length > 50) graphData.shift(); // Keep last 50
    localStorage.setItem('stakeishGraphData', JSON.stringify(graphData));
    drawGraph();
}

// --- GRAPH WIDGET ---
function initGraph() {
    // Drag Logic
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
                backgroundColor: color + '33', // Transparent fill
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

    // Update stats text
    let totalWager = graphData.reduce((a,b) => a + b.wager, 0);
    let totalProfit = data.length > 0 ? data[data.length-1] : 0;
    document.getElementById('graphWagered').textContent = `$${totalWager.toFixed(2)}`;
    const pEl = document.getElementById('graphProfit');
    pEl.textContent = `$${totalProfit.toFixed(2)}`;
    pEl.style.color = totalProfit >= 0 ? '#22c55e' : '#ef4444';
}

// --- GAME LOADER ---
async function loadGame(name) {
    // Cleanup running loops
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
    
    // Highlight nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-game="${name}"]`)?.classList.add('active');
}


/* ================= GAME LOGIC ================= */

// --- 1. SLOTS (Fixed Spinning) ---
function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    const reels = [document.getElementById('slotsReels').children[0], document.getElementById('slotsReels').children[1], document.getElementById('slotsReels').children[2]];
    const symbols = ['🍒','🍋','🍊','🍉','🍇','💎'];
    
    btn.addEventListener('click', async () => {
        const bet = parseFloat(document.getElementById('slotsBetAmount').value);
        if(bet > balance || bet <= 0) return alert('Invalid Bet');
        
        balance -= bet;
        updateBalanceDisplay();
        btn.disabled = true;
        document.getElementById('slotsResult').textContent = '';
        
        // Spin Animation
        reels.forEach(r => r.classList.add('spinning'));
        let outcome = [0,0,0].map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        // Stop reels one by one
        for(let i=0; i<3; i++) {
            await new Promise(r => setTimeout(r, 500));
            reels[i].classList.remove('spinning');
            reels[i].textContent = outcome[i];
        }
        
        // Win Logic
        let winMult = 0;
        if(outcome[0] == outcome[1] && outcome[1] == outcome[2]) winMult = 20; // 3 match
        else if(outcome[0] == outcome[1] || outcome[1] == outcome[2]) winMult = 2; // 2 match
        
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

// --- 2. SCRATCH (Fixed Canvas) ---
function initScratch() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('buyScratchButton');
    const coverColor = '#3a5063';
    let isScratching = false;
    
    // Setup Canvas
    ctx.fillStyle = coverColor;
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    btn.addEventListener('click', () => {
        const bet = parseFloat(document.getElementById('scratchBetAmount').value);
        if(bet > balance) return alert('No funds');
        
        balance -= bet;
        updateBalanceDisplay();
        btn.disabled = true;
        
        // Reset & Draw Prize UNDER the canvas (visually, handled by clearing)
        // Actually easier: We just clear pixels. The result text is a div behind the canvas?
        // No, let's draw the result text on the canvas first, save data, fill over it? 
        // Simpler: Text is in HTML behind canvas. Canvas is absolute on top.
        
        // Create result Text element behind canvas if not exists
        let resText = document.getElementById('scratchPrizeText');
        if(!resText) {
            resText = document.createElement('div');
            resText.id = 'scratchPrizeText';
            resText.className = 'absolute inset-0 flex items-center justify-center text-3xl font-bold';
            resText.style.zIndex = '0'; 
            canvas.parentElement.insertBefore(resText, canvas);
        }
        
        // Determine Win
        const win = Math.random() > 0.6 ? bet * 3 : 0;
        resText.textContent = win > 0 ? `$${win}` : 'No Win';
        resText.style.color = win > 0 ? '#22c55e' : '#9ca3af';
        
        // Reset Canvas Cover
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = coverColor;
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        // Scratch Logic
        const scratchMove = (e) => {
            if(!isScratching) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            
            // Scale for canvas resolution vs css size
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x * scaleX, y * scaleY, 20, 0, Math.PI*2);
            ctx.fill();
        };
        
        canvas.onmousedown = () => isScratching = true;
        canvas.onmouseup = () => {
            isScratching = false;
            // Check clear percent? simplified: just payout after 3s
        };
        canvas.onmousemove = scratchMove;
        
        // Auto-finish after few seconds
        setTimeout(() => {
            ctx.clearRect(0,0,canvas.width, canvas.height); // Reveal all
            balance += win;
            updateBalanceDisplay();
            updateGraph(bet, win - bet);
            btn.disabled = false;
        }, 3000);
    });
}

// --- 3. PLINKO (Fixed Physics & Layout) ---
function initPlinko() {
    const canvas = document.getElementById('plinkoCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('plinkoRows');
    const riskInput = document.getElementById('plinkoRisk');
    
    // Resize for high-DPI
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 500; // Fixed height
    
    let balls = [];
    let pins = [];
    
    function drawBoard() {
        const rows = parseInt(rowsInput.value);
        pins = [];
        const gap = canvas.width / (rows + 2);
        
        // Generate Pins (Pyramid)
        for(let r=2; r < rows + 2; r++) {
            for(let c=0; c <= r; c++) {
                const x = (canvas.width/2) - (r * gap / 2) + (c * gap);
                const y = r * 30; // Vertical spacing
                pins.push({x, y});
            }
        }
        
        // Update Buckets HTML
        const bucketContainer = document.getElementById('plinkoMultipliers');
        bucketContainer.innerHTML = '';
        const multipliers = getPlinkoMultipliers(rows, riskInput.value);
        
        multipliers.forEach(m => {
            const b = document.createElement('div');
            b.className = 'plinko-bucket';
            b.style.backgroundColor = m >= 10 ? '#ef4444' : m > 1 ? '#fbbf24' : '#3a5063';
            b.textContent = m + 'x';
            b.style.width = `${(canvas.width / multipliers.length) - 4}px`; // Fit width
            bucketContainer.appendChild(b);
        });
    }
    
    rowsInput.addEventListener('change', drawBoard);
    riskInput.addEventListener('change', drawBoard);
    drawBoard(); // Init
    
    // Loop
    function loop() {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        pins.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); });
        
        balls.forEach((b, i) => {
            b.y += b.vy; b.x += b.vx; b.vy += 0.5; // Gravity
            
            // Simple collision
            pins.forEach(p => {
                const dx = b.x - p.x; const dy = b.y - p.y;
                if(Math.sqrt(dx*dx + dy*dy) < 8) {
                    b.y -= 5; b.vy *= -0.5;
                    b.vx += (Math.random() - 0.5) * 2; // Jitter
                }
            });
            
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
            
            if(b.y > canvas.height) {
                balls.splice(i, 1);
                // Calculate payout (simplified: random bucket based on risk)
                finishPlinko(b.bet);
            }
        });
        window.plinkoLoop = requestAnimationFrame(loop);
    }
    loop();
    
    document.getElementById('playPlinkoButton').addEventListener('click', () => {
        const bet = parseFloat(document.getElementById('plinkoBetAmount').value);
        if(bet > balance) return;
        balance -= bet; updateBalanceDisplay();
        balls.push({x: canvas.width/2, y: 10, vx: 0, vy: 0, bet: bet});
    });
}

function finishPlinko(bet) {
    // Provably fair simulation: Result follows bell curve
    // Simplified: Weighted random
    const mults = getPlinkoMultipliers(parseInt(document.getElementById('plinkoRows').value), document.getElementById('plinkoRisk').value);
    
    // Weight center heavy
    const center = Math.floor(mults.length / 2);
    const idx = Math.floor(Math.abs(Math.random() - Math.random()) * mults.length); 
    // Crude distribution ^
    
    const finalMult = mults[idx] || mults[center];
    const win = bet * finalMult;
    balance += win;
    updateBalanceDisplay();
    updateGraph(bet, win - bet);
}

function getPlinkoMultipliers(rows, risk) {
    // Placeholder configs
    if(risk === 'high') return Array(rows+1).fill(0).map((_,i) => (i===0 || i===rows) ? 29 : 0.2);
    return Array(rows+1).fill(0).map((_,i) => (i===0 || i===rows) ? 5.6 : 1.1);
}

// --- 4. CRASH (Fixed Reset & Math) ---
function initCrash() {
    const canvas = document.getElementById('crashGameCanvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('playCrashButton');
    
    // Resize
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    
    let state = 'IDLE'; // IDLE, RUNNING, CRASHED
    let multiplier = 1.00;
    let crashPoint = 0;
    let startTime = 0;
    let bet = 0;
    let cashedOut = false;
    
    btn.addEventListener('click', () => {
        if (state === 'IDLE') {
            // Start Game
            bet = parseFloat(document.getElementById('crashBetAmount').value);
            if(bet > balance || bet <= 0) return;
            balance -= bet; updateBalanceDisplay();
            
            // Provably fair-ish math (1% House Edge)
            // crashPoint = 0.99 / (1 - Math.random());
            crashPoint = 0.99 / (1 - Math.random());
            if(crashPoint > 50) crashPoint = 50; // Cap for visual sanity
            
            state = 'RUNNING';
            startTime = Date.now();
            cashedOut = false;
            btn.textContent = 'CASHOUT';
            btn.style.backgroundColor = '#fbbf24'; // Yellow
            btn.style.color = 'black';
            
            loop();
        } 
        else if (state === 'RUNNING' && !cashedOut) {
            // Cashout
            const win = bet * multiplier;
            balance += win; updateBalanceDisplay();
            updateGraph(bet, win - bet);
            cashedOut = true;
            btn.textContent = 'CASHED OUT';
            btn.disabled = true;
        }
    });
    
    function loop() {
        if (state !== 'RUNNING') return;
        
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        multiplier = 1 + (elapsed * elapsed * 0.1); // Slow exponential
        
        // Draw Graph
        ctx.fillStyle = '#0f212e'; ctx.fillRect(0,0,canvas.width, canvas.height);
        
        // Line
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.moveTo(0, canvas.height);
        const x = (multiplier - 1) / 10 * canvas.width; // Scale horizontal
        const y = canvas.height - ((multiplier - 1) / 5 * canvas.height); // Scale vertical
        ctx.quadraticCurveTo(x/2, canvas.height, x, y);
        ctx.stroke();
        
        // Text
        document.getElementById('crashGameDisplay').innerHTML = `<div style="font-size: 4rem; font-weight: bold;">${multiplier.toFixed(2)}x</div>`;
        
        if (multiplier >= crashPoint) {
            crash();
        } else {
            window.crashLoop = requestAnimationFrame(loop);
        }
    }
    
    function crash() {
        state = 'CRASHED';
        document.getElementById('crashGameDisplay').innerHTML = `<div style="color: #ef4444; font-size: 4rem; font-weight: bold;">CRASHED @ ${crashPoint.toFixed(2)}x</div>`;
        
        if(!cashedOut) updateGraph(bet, -bet);
        
        btn.disabled = true;
        btn.textContent = 'CRASHED';
        btn.style.backgroundColor = '#ef4444';
        btn.style.color = 'white';
        
        // Auto Reset
        setTimeout(() => {
            state = 'IDLE';
            btn.disabled = false;
            btn.textContent = 'PLACE BET';
            btn.style.backgroundColor = '#00e701';
            btn.style.color = '#0f212e';
            ctx.clearRect(0,0,canvas.width, canvas.height);
            document.getElementById('crashGameDisplay').innerHTML = '';
        }, 3000);
    }
}

// --- 5. BLACKJACK (Restored Logic) ---
function initBlackjack() {
    let deck = [], playerHand = [], dealerHand = [], bet = 0;
    
    const dealBtn = document.getElementById('blackjackDealButton');
    const hitBtn = document.getElementById('blackjackHit');
    const standBtn = document.getElementById('blackjackStand');
    const controls = document.getElementById('blackjackActionControls');
    const betControls = document.getElementById('blackjackBetControls');
    
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
        el.innerHTML = hidden ? '?' : `${card.rank}<br><span style="font-size:1.5rem">${card.suit}</span>`;
        if(hidden) { el.style.background = '#3a5063'; el.style.color = 'transparent'; el.id = 'bjHiddenCard'; }
        handDiv.appendChild(el);
        return card;
    }
    
    dealBtn.addEventListener('click', () => {
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
        dealerHand.push(drawCard(document.getElementById('blackjackDealerHand'), true)); // Hidden
        
        betControls.classList.add('hidden');
        controls.classList.remove('hidden');
        
        checkScore();
    });
    
    hitBtn.addEventListener('click', () => {
        playerHand.push(drawCard(document.getElementById('blackjackPlayerHand')));
        if(getScore(playerHand) > 21) endRound();
    });
    
    standBtn.addEventListener('click', endRound);
    
    function getScore(hand) {
        let score = hand.reduce((a,c) => a + c.val, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while(score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }
    
    function endRound() {
        // Reveal Dealer
        const hidden = document.getElementById('bjHiddenCard');
        if(hidden) {
            hidden.style.background = 'white';
            hidden.style.color = ['♥','♦'].includes(dealerHand[1].suit) ? '#dc2626' : '#1f2937';
            hidden.innerHTML = `${dealerHand[1].rank}<br><span style="font-size:1.5rem">${dealerHand[1].suit}</span>`;
        }
        
        let pScore = getScore(playerHand);
        let dScore = getScore(dealerHand);
        
        // Dealer plays
        while(dScore < 17 && pScore <= 21) {
            dealerHand.push(drawCard(document.getElementById('blackjackDealerHand')));
            dScore = getScore(dealerHand);
        }
        
        let win = 0;
        const resDiv = document.getElementById('blackjackResult');
        
        if(pScore > 21) resDiv.textContent = "BUST";
        else if(dScore > 21 || pScore > dScore) { win = bet * 2; resDiv.textContent = "WIN"; resDiv.style.color = "#22c55e"; }
        else if(pScore === dScore) { win = bet; resDiv.textContent = "PUSH"; resDiv.style.color = "white"; }
        else { resDiv.textContent = "LOSE"; resDiv.style.color = "#ef4444"; }
        
        balance += win; updateBalanceDisplay();
        updateGraph(bet, win - bet);
        
        betControls.classList.remove('hidden');
        controls.classList.add('hidden');
    }
}

// --- 6. MINES (Fixed Grid & Exploit) ---
function initMines() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = ''; // Clear old
    
    // Create Tiles
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
    
    document.getElementById('playMinesButton').addEventListener('click', () => {
        if(active) return;
        bet = parseFloat(document.getElementById('minesBetAmount').value);
        const mineCount = parseInt(document.getElementById('minesCount').value);
        if(bet > balance) return;
        
        balance -= bet; updateBalanceDisplay();
        active = true;
        mines = Array(25).fill(0).map((_,i) => i).sort(() => Math.random()-0.5).slice(0, mineCount);
        multiplier = 1.0;
        
        // UI Lock
        document.getElementById('playMinesButton').classList.add('hidden');
        document.getElementById('cashoutMinesButton').classList.remove('hidden');
        document.getElementById('minesBetAmount').disabled = true;
        document.getElementById('minesCount').disabled = true;
        
        // Reset Grid
        document.querySelectorAll('.mines-tile').forEach(t => {
            t.className = 'mines-tile';
            t.innerHTML = '';
            t.disabled = false;
            t.onclick = () => clickTile(t);
        });
    });
    
    function clickTile(tile) {
        if(!active) return;
        const idx = parseInt(tile.dataset.idx);
        tile.disabled = true;
        
        if(mines.includes(idx)) {
            // Loss
            tile.classList.add('mine');
            tile.innerHTML = '💣';
            gameOver(false);
        } else {
            // Win
            tile.classList.add('gem');
            tile.innerHTML = '💎';
            multiplier *= 1.2; // Simplified math
            document.getElementById('cashoutMinesButton').textContent = `Cashout $${(bet*multiplier).toFixed(2)}`;
        }
    }
    
    document.getElementById('cashoutMinesButton').addEventListener('click', () => {
        if(active) gameOver(true);
    });
    
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
                    t.classList.add('mine'); t.innerHTML = '💣';
                }
            });
        }
        
        document.getElementById('playMinesButton').classList.remove('hidden');
        document.getElementById('cashoutMinesButton').classList.add('hidden');
        document.getElementById('minesBetAmount').disabled = false;
        document.getElementById('minesCount').disabled = false;
    }
}

// --- 7. LIMBO (Fixed Odds & Animation) ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    const resultDiv = document.getElementById('limboResult');
    
    btn.addEventListener('click', () => {
        const bet = parseFloat(document.getElementById('limboBetAmount').value);
        const target = parseFloat(document.getElementById('limboTargetMultiplier').value);
        if(bet > balance) return;
        
        balance -= bet; updateBalanceDisplay();
        btn.disabled = true;
        
        // Count up animation
        let current = 1.00;
        const result = (0.99 / (1 - Math.random())); // Real inverse probability
        
        const interval = setInterval(() => {
            current += Math.random() * 5;
            if(current >= result) {
                current = result;
                clearInterval(interval);
                finish();
            }
            resultDiv.innerHTML = `<div style="font-size:3rem; font-weight:bold; color:#9ca3af">${current.toFixed(2)}x</div>`;
        }, 20);
        
        function finish() {
            const win = result >= target;
            const color = win ? '#22c55e' : '#ef4444';
            resultDiv.innerHTML = `<div style="font-size:3rem; font-weight:bold; color:${color}">${result.toFixed(2)}x</div>`;
            
            if(win) {
                const payout = bet * target;
                balance += payout;
                updateGraph(bet, payout - bet);
            } else {
                updateGraph(bet, -bet);
            }
            updateBalanceDisplay();
            btn.disabled = false;
        }
    });
}

// --- 8. DICE (Fixed Appearance) ---
function initDice() {
    // Placeholder logic for brevity, ensure styling matches style.css slider overrides
    const btn = document.getElementById('playDiceButton');
    if(btn) btn.addEventListener('click', () => {
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
    });
}
