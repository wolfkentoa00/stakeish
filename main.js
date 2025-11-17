// --- Application State ---
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;
// NEW: Graph data state
let graphData = JSON.parse(localStorage.getItem('stakeishGraphData')) || [];
let profitChart = null; // Instance of the Chart.js chart
// NEW: Crash game state
let crashState = {
    status: 'idle', // idle, betting, waiting, running, crashed
    bet: 0,
    autoCashout: 0,
    startTime: 0,
    crashPoint: 1,
    loopId: null,
    timeToNext: 0,
    playerStatus: 'idle', // idle, bet_placed, cashed_out
};


// --- DOM Elements (Global) ---
const balanceDisplay = document.getElementById('balanceDisplay');
const walletButton = document.getElementById('walletButton');
const depositModal = document.getElementById('depositModal');
const closeModal = document.getElementById('closeModal');
const depositButton = document.getElementById('depositButton');
const depositAmountInput = document.getElementById('depositAmount');

const navButtons = document.querySelectorAll('.nav-item');
const gameArea = document.getElementById('game-area');

const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

// NEW: Graph Modal Elements
const graphButton = document.getElementById('graphButton');
const graphModal = document.getElementById('graphModal');
const closeGraphModal = document.getElementById('closeGraphModal');
const clearGraphButton = document.getElementById('clearGraphButton');
const graphModalCanvas = document.getElementById('graphModalCanvas');
const graphTotalWagered = document.getElementById('graphTotalWagered');
const graphTotalProfit = document.getElementById('graphTotalProfit');


// --- Utility Functions (Global) ---

function updateBalanceDisplay() {
    balanceDisplay.textContent = balance.toFixed(2);
    localStorage.setItem('stakeishBalance', balance);
}

function modifyBet(inputId, modifier) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let currentValue = parseFloat(input.value);
    if (isNaN(currentValue)) currentValue = 0;

    if (modifier === 'max') {
        input.value = Math.max(0, Math.floor(balance));
    } else {
        let newValue = currentValue * modifier;
        if (newValue < 1 && modifier < 1) newValue = 1;
        input.value = Math.max(0, Math.floor(newValue));
    }
}
window.modifyBet = modifyBet;

function showMessage(message, type = 'error') {
    messageText.textContent = message;
    messageBox.classList.remove('hidden', 'bg-red-600', 'bg-green-600');
    
    if (type === 'error') {
        messageBox.classList.add('bg-red-600');
    } else if (type === 'success') {
        messageBox.classList.add('bg-green-600');
    }
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
}

// --- NEW: Graph Data Function ---
/**
 * Records a game's result for the profit graph.
 * This MUST be called by every game function on completion.
 * @param {number} wagered The amount bet.
 * @param {number} profit The net profit (winnings - wagered).
 */
function updateGraphData(wagered, profit) {
    graphData.push({
        wagered: parseFloat(wagered),
        profit: parseFloat(profit),
        timestamp: new Date().toISOString()
    });
    // Keep history to a reasonable length (e.g., last 500 bets)
    if (graphData.length > 500) {
        graphData.shift();
    }
    localStorage.setItem('stakeishGraphData', JSON.stringify(graphData));
    
    // If graph is open, update it
    if (!graphModal.classList.contains('hidden')) {
        renderProfitGraph();
    }
}


// --- Modal Logic ---

function toggleModal() {
    depositModal.classList.toggle('hidden');
}

function depositMoney() {
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid amount.", 'error');
        return;
    }
    balance += amount;
    updateBalanceDisplay();
    toggleModal();
    showMessage(`$${amount.toFixed(2)} added to your balance!`, 'success');
    depositAmountInput.value = "1000";
}

// --- NEW: Graph Modal Logic ---

function toggleGraphModal() {
    const isHidden = graphModal.classList.toggle('hidden');
    if (!isHidden) {
        renderProfitGraph();
    }
}

function clearGraphData() {
    graphData = [];
    localStorage.removeItem('stakeishGraphData');
    renderProfitGraph();
}

function renderProfitGraph() {
    if (!graphModalCanvas) return;
    const ctx = graphModalCanvas.getContext('2d');
    
    // Destroy old chart if it exists
    if (profitChart) {
        profitChart.destroy();
    }

    // Process data
    let cumulativeProfit = 0;
    let totalWagered = 0;
    const dataPoints = [];
    const labels = [];
    
    graphData.forEach((bet, index) => {
        cumulativeProfit += bet.profit;
        totalWagered += bet.wagered;
        dataPoints.push(cumulativeProfit);
        labels.push(index + 1); // Bet #
    });

    // Update stats
    graphTotalWagered.textContent = `$${totalWagered.toFixed(2)}`;
    graphTotalProfit.textContent = `$${cumulativeProfit.toFixed(2)}`;
    
    const graphColor = cumulativeProfit >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'; // Green / Red
    const graphFill = cumulativeProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';

    graphTotalProfit.className = `text-xl font-bold ${cumulativeProfit >= 0 ? 'text-green-400' : 'text-red-500'}`;

    // Create new chart
    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Profit',
                data: dataPoints,
                borderColor: graphColor,
                backgroundColor: graphFill,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: false, // Hide x-axis labels
                },
                y: {
                    ticks: {
                        color: '#9ca3af' // Grid line/text color
                    },
                    grid: {
                        color: '#3a5063'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Hide legend
                }
            }
        }
    });
}


// --- Game Navigation Logic ---

async function loadGame(gameName) {
    // NEW: Stop any running game loops
    if (crashState.loopId) {
        cancelAnimationFrame(crashState.loopId);
        crashState.loopId = null;
    }
    crashState.status = 'idle'; // Reset status on game change
    crashState.playerStatus = 'idle';


    navButtons.forEach(button => {
        if (button.dataset.game === gameName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    try {
        // FIXED: Relative path only. Looks in the current folder.
        const response = await fetch(`${gameName}.html`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${gameName}.html`);
        }
        gameArea.innerHTML = await response.text();
        
        initGame(gameName);

    } catch (error) {
        console.error(error);
        gameArea.innerHTML = `<p class="text-2xl text-red-500">Error: Could not load game.</p>`;
    }
}

function initGame(gameName) {
    switch (gameName) {
        case 'limbo': initLimbo(); break;
        case 'blackjack': initBlackjack(); break;
        case 'slots': initSlots(); break;
        case 'scratch': initScratch(); break;
        case 'mines': initMines(); break;
        case 'crash': initCrash(); break; // Added Crash
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    loadGame('crash'); // Default game

    walletButton.addEventListener('click', toggleModal);
    closeModal.addEventListener('click', toggleModal);
    depositButton.addEventListener('click', depositMoney);
    
    // NEW: Graph modal listeners
    graphButton.addEventListener('click', toggleGraphModal);
    closeGraphModal.addEventListener('click', toggleGraphModal);
    clearGraphButton.addEventListener('click', clearGraphData);
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Find the closest button with data-game
            const targetButton = e.target.closest('[data-game]');
            if (targetButton && !targetButton.disabled) {
                const gameName = targetButton.getAttribute('data-game');
                loadGame(gameName);
            }
        });
    });
});

// ------------------------------------
// --- GAME LOGIC ---
// ------------------------------------

// --- Limbo Logic (UPDATED) ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    if(btn) btn.addEventListener('click', playLimbo);
}

function getLimboCrashPoint() {
    if (Math.random() < 0.01) return '0.00';
    const houseEdgePercent = 1;
    const r = Math.random();
    const crashPoint = (100 - houseEdgePercent) / (100 - r * 100);
    return (Math.floor(crashPoint * 100) / 100).toFixed(2);
}

async function playLimbo() {
    const betInput = document.getElementById('limboBetAmount');
    const multInput = document.getElementById('limboTargetMultiplier');
    const resultDiv = document.getElementById('limboResult');
    const btn = document.getElementById('playLimboButton');

    const bet = parseFloat(betInput.value);
    const target = parseFloat(multInput.value);

    if (isNaN(bet) || bet <= 0) { showMessage("Invalid bet.", 'error'); return; }
    if (isNaN(target) || target < 1.01) { showMessage("Multiplier must be > 1.01x.", 'error'); return; }
    if (bet > balance) { showMessage("Insufficient funds.", 'error'); return; }

    btn.disabled = true;
    balance -= bet;
    updateBalanceDisplay();
    
    resultDiv.innerHTML = `<p class="text-5xl font-bold text-gray-400" id="limboCounter">1.00x</p>`;
    
    let start = Date.now();
    const interval = setInterval(() => {
        if (Date.now() - start > 1500) { clearInterval(interval); return; }
        document.getElementById('limboCounter').textContent = `${(1 + Math.random()*9).toFixed(2)}x`;
    }, 50);

    await new Promise(r => setTimeout(r, 1500));
    clearInterval(interval);

    const crash = getLimboCrashPoint();
    if (parseFloat(crash) >= target) {
        const win = bet * target;
        balance += win;
        resultDiv.innerHTML = `<p class="text-5xl font-bold text-green-400">${crash}x</p><p class="mt-2">Won $${win.toFixed(2)}!</p>`;
        // NEW: Update graph
        updateGraphData(bet, win - bet);
    } else {
        resultDiv.innerHTML = `<p class="text-5xl font-bold text-red-500">${crash}x</p><p class="mt-2">Lost $${bet.toFixed(2)}.</p>`;
        // NEW: Update graph
        updateGraphData(bet, -bet);
    }
    updateBalanceDisplay();
    btn.disabled = false;
}

// --- Slots Logic (UPDATED) ---
const slotsSymbols = {
    '🍒': 10, '🍋': 8, '🍊': 7, '🍉': 6, '🔔': 5, '🍀': 4, '💎': 2, '⭐': 3
};
const slotsPayouts = {
    '💎': { 3: 100 }, '🍀': { 3: 50 }, '🔔': { 3: 25 }, '🍉': { 3: 15 },
    '🍊': { 3: 10 }, '🍋': { 3: 5 }, '🍒': { 3: 10, 2: 3, 1: 1 },
};
const slotsPool = [];
for (const [symbol, weight] of Object.entries(slotsSymbols)) {
    for (let i = 0; i < weight; i++) slotsPool.push(symbol);
}

function getSlotSpin() {
    return slotsPool[Math.floor(Math.random() * slotsPool.length)];
}

function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    if(btn) btn.addEventListener('click', playSlots);
}

async function playSlots() {
    const betInput = document.getElementById('slotsBetAmount');
    const btn = document.getElementById('playSlotsButton');
    const reelContainer = document.getElementById('slotsReels');
    const resultDiv = document.getElementById('slotsResult');

    const bet = parseFloat(betInput.value);

    if (isNaN(bet) || bet <= 0) { showMessage("Invalid bet.", 'error'); return; }
    if (bet > balance) { showMessage("Insufficient funds.", 'error'); return; }

    btn.disabled = true;
    balance -= bet;
    updateBalanceDisplay();
    
    resultDiv.innerHTML = '<span class="animate-pulse text-gray-400">Spinning...</span>';
    resultDiv.className = "text-center mt-6 text-2xl font-bold"; 

    const spinInterval = setInterval(() => {
        reelContainer.innerHTML = `
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
        `;
    }, 100);

    await new Promise(r => setTimeout(r, 1500));
    clearInterval(spinInterval);

    const finalReels = [getSlotSpin(), getSlotSpin(), getSlotSpin()];
    reelContainer.innerHTML = finalReels.map(s => `<div class="reel p-4">${s}</div>`).join('');

    // Calculate Winnings
    let win = 0;
    const symbolCounts = {};
    let nonWildSymbol = finalReels.find(s => s !== '⭐');
    
    finalReels.forEach(s => {
        const symbolToCount = (s === '⭐' && nonWildSymbol) ? nonWildSymbol : s;
        symbolCounts[symbolToCount] = (symbolCounts[symbolToCount] || 0) + 1;
    });

    for (const [symbol, payouts] of Object.entries(slotsPayouts).reverse()) {
        if (symbolCounts[symbol]) {
            if (symbolCounts[symbol] === 3 && payouts[3]) { win = bet * payouts[3]; break; }
            else if (symbolCounts[symbol] === 2 && payouts[2]) { win = bet * payouts[2]; break; }
            else if (symbolCounts[symbol] === 1 && payouts[1]) { win = bet * payouts[1]; break; }
        }
    }

    // Display Result
    if (win > 0) {
        balance += win;
        resultDiv.textContent = `You won $${win.toFixed(2)}!`;
        resultDiv.classList.add('text-green-400');
        // NEW: Update graph
        updateGraphData(bet, win - bet);
    } else {
        resultDiv.textContent = `You lost $${bet.toFixed(2)}.`;
        resultDiv.classList.add('text-red-500');
        // NEW: Update graph
        updateGraphData(bet, -bet);
    }
    updateBalanceDisplay();
    btn.disabled = false;
}

// --- Blackjack Logic (UPDATED) ---
let bjState = { deck: [], hands: [], dealer: [], bet: 0, activeHand: 0, status: 'betting' };
const SUITS = ['♥', '♦', '♠', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function initBlackjack() {
    const dealBtn = document.getElementById('blackjackDealButton');
    if(dealBtn) {
        dealBtn.addEventListener('click', dealBlackjack);
        document.getElementById('blackjackHit').addEventListener('click', bjHit);
        document.getElementById('blackjackStand').addEventListener('click', bjStand);
        document.getElementById('blackjackDouble').addEventListener('click', bjDouble);
        document.getElementById('blackjackSplit').addEventListener('click', bjSplit);
    }
}

function createCardEl(card) {
    const el = document.createElement('div');
    const color = (card.suit === '♥' || card.suit === '♦') ? 'text-red-500' : 'text-gray-900';
    el.className = `card ${color} bg-white rounded-lg w-[60px] h-[90px] sm:w-[70px] sm:h-[100px] flex flex-col items-center justify-between p-1 shadow-md border border-gray-200 text-xl font-bold select-none`;
    
    if (card.hidden) {
        el.className = "bg-blue-800 rounded-lg w-[60px] h-[90px] sm:w-[70px] sm:h-[100px] border-2 border-white shadow-md";
        el.innerHTML = ""; 
    } else {
        const top = document.createElement('div');
        top.className = "self-start text-sm leading-none";
        top.innerHTML = `${card.rank}<br>${card.suit}`;
        el.appendChild(top);
        const center = document.createElement('div');
        center.className = "text-2xl";
        center.innerHTML = card.suit;
        el.appendChild(center);
        const bot = document.createElement('div');
        bot.className = "self-end text-sm leading-none transform rotate-180";
        bot.innerHTML = `${card.rank}<br>${card.suit}`;
        el.appendChild(bot);
    }
    return el;
}

function getDeck() {
    let deck = [];
    for (let s of SUITS) for (let r of RANKS) {
        let val = parseInt(r);
        if (['J','Q','K'].includes(r)) val = 10;
        if (r === 'A') val = 11;
        deck.push({ suit: s, rank: r, value: val });
    }
    return deck.sort(() => Math.random() - 0.5);
}

function getHandVal(hand) {
    let val = hand.reduce((a, c) => a + (c.hidden ? 0 : c.value), 0);
    let aces = hand.filter(c => c.rank === 'A' && !c.hidden).length;
    while (val > 21 && aces > 0) { val -= 10; aces--; }
    return val;
}

function renderBJ() {
    const dealerDiv = document.getElementById('blackjackDealerHand');
    const playerDiv = document.getElementById('blackjackPlayerHand');
    dealerDiv.innerHTML = '';
    dealerDiv.className = "flex justify-center gap-2";
    bjState.dealer.forEach(c => dealerDiv.appendChild(createCardEl(c)));
    document.getElementById('blackjackDealerScore').textContent = `Score: ${getHandVal(bjState.dealer)}`;
    playerDiv.innerHTML = '';
    const handsContainer = document.createElement('div');
    handsContainer.className = "flex flex-wrap justify-center gap-8";
    bjState.hands.forEach((hand, index) => {
        const handWrapper = document.createElement('div');
        const isActive = index === bjState.activeHand && bjState.status === 'playing';
        handWrapper.className = `flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-900/40 ring-2 ring-blue-400 scale-105 shadow-lg' : 'opacity-70 grayscale-[0.3]'}`;
        const scoreLabel = document.createElement('div');
        scoreLabel.className = "text-xs text-gray-300 mb-2 font-mono";
        scoreLabel.textContent = `Hand ${index + 1}: ${getHandVal(hand)}`;
        handWrapper.appendChild(scoreLabel);
        const cardsRow = document.createElement('div');
        cardsRow.className = "flex gap-2";
        hand.forEach(c => cardsRow.appendChild(createCardEl(c)));
        handWrapper.appendChild(cardsRow);
        handsContainer.appendChild(handWrapper);
    });
    playerDiv.appendChild(handsContainer);
    if (bjState.status === 'playing') {
        document.getElementById('blackjackPlayerScore').textContent = `Playing Hand ${bjState.activeHand + 1}...`;
    } else {
        document.getElementById('blackjackPlayerScore').textContent = "Round Over";
    }
}

async function dealBlackjack() {
    const betInput = document.getElementById('blackjackBetAmount');
    const bet = parseFloat(betInput.value);
    if (isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid bet.", 'error'); return; }
    
    balance -= bet;
    updateBalanceDisplay();
    
    bjState = {
        deck: getDeck(), dealer: [], hands: [[]], bet: bet, activeHand: 0, status: 'playing'
    };
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push(bjState.deck.pop());
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push({ ...bjState.deck.pop(), hidden: true });
    
    document.getElementById('blackjackBetControls').classList.add('hidden');
    document.getElementById('blackjackActionControls').classList.remove('hidden');
    document.getElementById('blackjackResult').textContent = '';
    checkSplitAvailable();
    renderBJ();
    checkBJTurn();
}

function checkSplitAvailable() {
    const splitBtn = document.getElementById('blackjackSplit');
    const currentHand = bjState.hands[bjState.activeHand];
    if (currentHand.length === 2 && currentHand[0].value === currentHand[1].value && balance >= bjState.bet) {
        splitBtn.disabled = false;
        splitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        splitBtn.disabled = true;
        splitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function bjHit() {
    bjState.hands[bjState.activeHand].push(bjState.deck.pop());
    renderBJ();
    if (getHandVal(bjState.hands[bjState.activeHand]) > 21) {
        handleNextHandOrDealer();
    } else {
        document.getElementById('blackjackSplit').disabled = true;
        document.getElementById('blackjackSplit').classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function bjStand() {
    handleNextHandOrDealer();
}

function bjDouble() {
    if (balance < bjState.bet) { showMessage("Not enough balance to double.", 'error'); return; }
    balance -= bjState.bet;
    updateBalanceDisplay();
    bjState.hands[bjState.activeHand].isDoubled = true;
    bjState.hands[bjState.activeHand].push(bjState.deck.pop());
    renderBJ();
    handleNextHandOrDealer();
}

function bjSplit() {
    const currentHand = bjState.hands[bjState.activeHand];
    if (currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value) return;
    if (balance < bjState.bet) { showMessage("Insufficient funds to split.", 'error'); return; }
    balance -= bjState.bet;
    updateBalanceDisplay();
    const cardToMove = currentHand.pop();
    const newHand = [cardToMove];
    bjState.hands.push(newHand);
    currentHand.push(bjState.deck.pop());
    newHand.push(bjState.deck.pop());
    renderBJ();
    checkSplitAvailable();
}

function handleNextHandOrDealer() {
    if (bjState.activeHand < bjState.hands.length - 1) {
        bjState.activeHand++;
        renderBJ();
        checkSplitAvailable();
    } else {
        bjDealerPlay();
    }
}

async function bjDealerPlay() {
    bjState.status = 'finished';
    bjState.dealer[1].hidden = false;
    renderBJ();
    while (getHandVal(bjState.dealer) < 17) {
        await new Promise(r => setTimeout(r, 600));
        bjState.dealer.push(bjState.deck.pop());
        renderBJ();
    }
    calculateWinnings();
}

function calculateWinnings() {
    const dVal = getHandVal(bjState.dealer);
    let totalWin = 0;
    let totalWagered = 0; // NEW
    let resultMsg = [];

    bjState.hands.forEach((hand, index) => {
        const pVal = getHandVal(hand);
        let currentBet = bjState.bet;
        if (hand.isDoubled) currentBet *= 2;
        
        totalWagered += currentBet; // NEW: Track total wager
        
        let outcome = "";
        if (pVal > 21) {
            outcome = "Bust";
        } else if (dVal > 21 || pVal > dVal) {
            totalWin += currentBet * 2;
            outcome = "Win";
        } else if (pVal === dVal) {
            totalWin += currentBet;
            outcome = "Push";
        } else {
            outcome = "Lose";
        }
        resultMsg.push(`Hand ${index + 1}: ${outcome}`);
    });

    if (totalWin > 0) {
        balance += totalWin;
        updateBalanceDisplay();
    }

    // NEW: Update graph data
    const profit = totalWin - totalWagered;
    updateGraphData(totalWagered, profit);

    const resultEl = document.getElementById('blackjackResult');
    resultEl.innerHTML = resultMsg.join(' | ');
    if (profit > 0) {
        resultEl.className = "text-center text-2xl font-bold my-4 h-8 text-green-400";
    } else if (profit < 0) {
        resultEl.className = "text-center text-2xl font-bold my-4 h-8 text-red-500";
    } else {
        resultEl.className = "text-center text-2xl font-bold my-4 h-8 text-gray-300";
    }

    document.getElementById('blackjackBetControls').classList.remove('hidden');
    document.getElementById('blackjackActionControls').classList.add('hidden');
}

function checkBJTurn() {
    const pVal = getHandVal(bjState.hands[bjState.activeHand]);
    if (pVal === 21) {
        handleNextHandOrDealer();
    }
}

// --- Scratch Off Logic (UPDATED) ---
let scratchState = { 
    prize: 0, 
    bet: 0, // NEW
    isRevealed: false, 
    isDrawing: false,
    ctx: null,
    canvas: null
};

function initScratch() {
    const btn = document.getElementById('buyScratchButton');
    const canvas = document.getElementById('scratchCanvas');
    if (!btn || !canvas) return;

    scratchState.canvas = canvas;
    scratchState.ctx = canvas.getContext('2d', { willReadFrequently: true }); // Required for getImageData
    scratchState.canvas.style.visibility = 'hidden';
    document.getElementById('scratchInstructions').style.visibility = 'visible';
    btn.addEventListener('click', buyScratchTicket);
    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('mousemove', doScratch);
    canvas.addEventListener('mouseup', stopScratch);
    canvas.addEventListener('mouseout', stopScratch);
    canvas.addEventListener('touchstart', startScratch, {passive: false});
    canvas.addEventListener('touchmove', doScratch, {passive: false});
    canvas.addEventListener('touchend', stopScratch);
}

function buyScratchTicket() {
    const betInput = document.getElementById('scratchBetAmount');
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0 || bet > balance) { 
        showMessage("Invalid ticket price.", 'error'); 
        return; 
    }
    
    balance -= bet;
    updateBalanceDisplay();
    
    document.getElementById('buyScratchButton').disabled = true;
    document.getElementById('scratchInstructions').style.visibility = 'hidden';
    document.getElementById('scratchResult').textContent = '';
    
    // Reset State
    scratchState.isRevealed = false;
    scratchState.isDrawing = false;
    scratchState.bet = bet; // NEW: Store the bet
    
    const rand = Math.random();
    if (rand < 0.1) { scratchState.prize = bet * 5; }
    else if (rand < 0.3) { scratchState.prize = bet * 2; }
    else { scratchState.prize = 0; }

    const ctx = scratchState.ctx;
    const canvas = scratchState.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = scratchState.prize > 0 ? '#fde047' : '#9ca3af';
    ctx.font = 'bold 48px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const prizeText = scratchState.prize > 0 ? `$${scratchState.prize.toFixed(2)}` : "No Win";
    ctx.fillText(prizeText, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#3a5063';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.style.visibility = 'visible';
}

function getScratchPos(e) {
    const canvas = scratchState.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function startScratch(e) {
    if (scratchState.isRevealed) return;
    e.preventDefault();
    scratchState.isDrawing = true;
    const pos = getScratchPos(e);
    scratch(pos.x, pos.y);
}

function doScratch(e) {
    if (!scratchState.isDrawing || scratchState.isRevealed) return;
    e.preventDefault();
    const pos = getScratchPos(e);
    scratch(pos.x, pos.y);
}

function stopScratch() {
    if (!scratchState.isDrawing) return;
    scratchState.isDrawing = false;
    checkScratchWin();
}

function scratch(x, y) {
    const ctx = scratchState.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

function checkScratchWin() {
    if (scratchState.isRevealed) return;
    const ctx = scratchState.ctx;
    const canvas = scratchState.canvas;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    const totalPixels = canvas.width * canvas.height;
    
    for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] === 0) cleared++;
    }
    
    if (cleared / totalPixels > 0.3) { 
        scratchState.isRevealed = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = scratchState.prize > 0 ? '#fde047' : '#9ca3af';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const prizeText = scratchState.prize > 0 ? `$${scratchState.prize.toFixed(2)}` : "No Win";
        ctx.fillText(prizeText, canvas.width / 2, canvas.height / 2);
        
        const resDiv = document.getElementById('scratchResult');
        // NEW: Update graph data
        const profit = scratchState.prize - scratchState.bet;
        updateGraphData(scratchState.bet, profit);
        
        if (scratchState.prize > 0) {
            balance += scratchState.prize;
            resDiv.textContent = `You Won $${scratchState.prize.toFixed(2)}!`;
            resDiv.className = "text-center mt-6 text-2xl font-bold text-green-400";
        } else {
            resDiv.textContent = "Better luck next time.";
            resDiv.className = "text-center mt-6 text-2xl font-bold text-red-500";
        }
        updateBalanceDisplay();
        setTimeout(resetScratchCard, 2000);
    }
}

function resetScratchCard() {
    if (scratchState.canvas) {
        scratchState.canvas.style.visibility = 'hidden';
        scratchState.ctx.clearRect(0, 0, scratchState.canvas.width, scratchState.canvas.height);
    }
    document.getElementById('buyScratchButton').disabled = false;
    document.getElementById('scratchInstructions').style.visibility = 'visible';
    document.getElementById('scratchResult').textContent = '';
}


// --- Mines Logic (UPDATED) ---
let minesState = {
    grid: [], revealed: [], bet: 0, minesCount: 0, gemsFound: 0,
    totalGems: 0, currentMultiplier: 1, nextMultiplier: 1, active: false
};
const MINES_GRID_SIZE = 25;

function initMines() {
    const gridContainer = document.getElementById('minesGrid');
    gridContainer.innerHTML = '';
    for (let i = 0; i < MINES_GRID_SIZE; i++) {
        const tile = document.createElement('button');
        tile.className = 'mines-tile';
        tile.dataset.index = i;
        tile.disabled = true;
        tile.addEventListener('click', () => onMinesTileClick(i));
        gridContainer.appendChild(tile);
    }
    document.getElementById('playMinesButton').addEventListener('click', startMines);
    document.getElementById('cashoutMinesButton').addEventListener('click', cashoutMines);
}

function startMines() {
    if (minesState.active) {
        showMessage("Game is already in progress.", 'error'); return;
    }
    const betInput = document.getElementById('minesBetAmount');
    const minesInput = document.getElementById('minesCount');
    const bet = parseFloat(betInput.value);
    const minesCount = parseInt(minesInput.value);
    
    if (isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid bet.", 'error'); return; }
    if (isNaN(minesCount) || minesCount < 3 || minesCount > 24) { showMessage("Mines must be between 3 and 24.", 'error'); return; }

    balance -= bet;
    updateBalanceDisplay();
    
    minesState = {
        grid: [], revealed: new Array(MINES_GRID_SIZE).fill(false), bet: bet,
        minesCount: minesCount, gemsFound: 0, totalGems: MINES_GRID_SIZE - minesCount,
        currentMultiplier: 1, active: true
    };
    
    const grid = new Array(MINES_GRID_SIZE).fill('gem');
    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
        const index = Math.floor(Math.random() * MINES_GRID_SIZE);
        if (grid[index] === 'gem') {
            grid[index] = 'mine';
            minesPlaced++;
        }
    }
    minesState.grid = grid;
    
    document.getElementById('playMinesButton').classList.add('hidden');
    document.getElementById('cashoutMinesButton').classList.remove('hidden');
    document.getElementById('cashoutMinesButton').disabled = true;
    document.getElementById('cashoutMinesButton').textContent = 'Cashout $0.00';
    document.getElementById('minesBetAmount').disabled = true;
    document.getElementById('minesCount').disabled = true;
    document.getElementById('minesResult').textContent = '';
    
    const tiles = document.querySelectorAll('.mines-tile');
    tiles.forEach(tile => {
        tile.disabled = false;
        tile.innerHTML = '';
        tile.classList.remove('gem', 'mine');
    });
    minesState.nextMultiplier = calculateMinesMultiplier(1, minesCount); // Calculate for first gem
    updateMinesDisplay();
}

function onMinesTileClick(index) {
    if (!minesState.active || minesState.revealed[index]) return;
    
    minesState.revealed[index] = true;
    const tile = document.querySelector(`.mines-tile[data-index='${index}']`);
    tile.disabled = true;

    if (minesState.grid[index] === 'mine') {
        tile.classList.add('mine');
        tile.innerHTML = '<i class="fas fa-bomb"></i>';
        endMinesGame(false); // false = loss
    } else {
        tile.classList.add('gem');
        tile.innerHTML = '<i class="fas fa-gem"></i>';
        minesState.gemsFound++;
        minesState.currentMultiplier = minesState.nextMultiplier;
        minesState.nextMultiplier = calculateMinesMultiplier(minesState.gemsFound + 1, minesState.minesCount);
        
        document.getElementById('cashoutMinesButton').disabled = false;
        const cashoutAmount = (minesState.bet * minesState.currentMultiplier).toFixed(2);
        document.getElementById('cashoutMinesButton').textContent = `Cashout $${cashoutAmount}`;
        updateMinesDisplay();
        
        if (minesState.gemsFound === minesState.totalGems) {
            endMinesGame(true);
        }
    }
}

function cashoutMines() {
    if (!minesState.active || minesState.gemsFound === 0) return;
    
    const winnings = minesState.bet * minesState.currentMultiplier;
    balance += winnings;
    updateBalanceDisplay();
    showMessage(`Cashed out $${winnings.toFixed(2)}!`, 'success');
    
    // NEW: Update graph
    updateGraphData(minesState.bet, winnings - minesState.bet);
    
    endMinesGame(true);
}

function endMinesGame(didWin) {
    if (!minesState.active) return; // Prevent double-ending
    
    minesState.active = false;
    const resDiv = document.getElementById('minesResult');
    
    if (didWin) {
        resDiv.textContent = `You won!`;
        resDiv.className = "text-center mt-6 text-2xl font-bold text-green-400";
        // Win by cashout is handled in cashoutMines()
        // This handles winning by finding all gems
        if (minesState.gemsFound === minesState.totalGems) {
            const winnings = minesState.bet * minesState.currentMultiplier;
            balance += winnings; // This was missing if you won by finding all gems
            updateBalanceDisplay();
            updateGraphData(minesState.bet, winnings - minesState.bet);
        }
    } else {
        resDiv.textContent = 'You hit a mine!';
        resDiv.className = "text-center mt-6 text-2xl font-bold text-red-500";
        // NEW: Update graph
        updateGraphData(minesState.bet, -minesState.bet);
    }
    
    const tiles = document.querySelectorAll('.mines-tile');
    tiles.forEach((tile, i) => {
        tile.disabled = true;
        if (!minesState.revealed[i]) {
            if (minesState.grid[i] === 'mine') {
                tile.classList.add('mine');
                tile.innerHTML = '<i class="fas fa-bomb"></i>';
            } else {
                tile.classList.add('gem');
                tile.innerHTML = '<i class="fas fa-gem"></i>';
            }
        }
    });
    
    document.getElementById('playMinesButton').classList.remove('hidden');
    document.getElementById('cashoutMinesButton').classList.add('hidden');
    document.getElementById('minesBetAmount').disabled = false;
    document.getElementById('minesCount').disabled = false;
}

function updateMinesDisplay() {
    document.getElementById('minesGemsFound').textContent = minesState.gemsFound;
    document.getElementById('minesNextMultiplier').textContent = `${minesState.nextMultiplier.toFixed(2)}x`;
}

function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - i + 1) / i;
    }
    return Math.round(res); // Fix floating point issues
}

function calculateMinesMultiplier(gemsToFind, minesCount) {
    const houseEdge = 0.99;
    const totalTiles = MINES_GRID_SIZE;
    const totalGems = totalTiles - minesCount;
    if (gemsToFind > totalGems) return minesState.currentMultiplier; // No more gems
    
    const c1 = combinations(totalTiles, gemsToFind);
    const c2 = combinations(totalGems, gemsToFind);
    if (c2 === 0) return 1;
    return (houseEdge * c1 / c2) || 1;
}


// --- NEW: Crash Game Logic ---
let crashGameElements = {};

function initCrash() {
    // Get elements
    crashGameElements = {
        betInput: document.getElementById('crashBetAmount'),
        autoCashoutInput: document.getElementById('crashAutoCashout'),
        playButton: document.getElementById('playCrashButton'),
        canvas: document.getElementById('crashGameCanvas'),
        display: document.getElementById('crashGameDisplay'),
    };
    crashGameElements.ctx = crashGameElements.canvas.getContext('2d');
    
    // Add listeners
    crashGameElements.playButton.addEventListener('click', onCrashPlayClick);

    // Resize canvas to fit container
    resizeCrashCanvas();
    window.addEventListener('resize', resizeCrashCanvas);
    
    // Start the game loop
    if (!crashState.loopId) {
        runCrashGame();
    }
}

function resizeCrashCanvas() {
    if (!crashGameElements.canvas) return;
    const canvas = crashGameElements.canvas;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function onCrashPlayClick() {
    // --- Case 1: Player wants to cash out ---
    if (crashState.status === 'running' && crashState.playerStatus === 'bet_placed') {
        const currentMultiplier = getCrashMultiplier(Date.now() - crashState.startTime);
        const win = crashState.bet * currentMultiplier;
        
        balance += win;
        updateBalanceDisplay();
        showMessage(`Cashed out at ${currentMultiplier.toFixed(2)}x for $${win.toFixed(2)}!`, 'success');
        
        // Update graph
        updateGraphData(crashState.bet, win - crashState.bet);
        
        crashState.playerStatus = 'cashed_out';
        updateCrashButton(true); // Update button, keep it disabled
        return;
    }
    
    // --- Case 2: Player wants to place a bet ---
    if (crashState.playerStatus === 'idle' || crashState.playerStatus === 'ended') {
        const bet = parseFloat(crashGameElements.betInput.value);
        const autoCashout = parseFloat(crashGameElements.autoCashoutInput.value) || 0;
        
        if (isNaN(bet) || bet <= 0) { showMessage("Invalid bet.", 'error'); return; }
        if (bet > balance) { showMessage("Insufficient funds.", 'error'); return; }
        
        balance -= bet;
        updateBalanceDisplay();
        
        crashState.bet = bet;
        crashState.autoCashout = autoCashout;
        crashState.playerStatus = 'bet_placed';
        
        updateCrashButton();
    }
}

function getCrashPoint() {
    // Stake's formula (simplified for 1% edge)
    const e = 2**-52;
    const h = Math.floor(Math.random() * (e**-1));
    const crash = Math.floor(100 * (1 - h * e) / (1 - h * e * 0.99)) / 100;
    return Math.max(1, crash);
}

function getCrashMultiplier(ms) {
    // Exponential growth
    // 1.00x at 0ms, ~2.00x at 5000ms
    const c = 0.000138629;
    return Math.pow(Math.E, c * ms);
}

function runCrashGame() {
    const now = Date.now();
    
    // --- State: IDLE ---
    // This is the initial state on load
    if (crashState.status === 'idle') {
        crashState.status = 'waiting';
        crashState.timeToNext = now + 5000; // 5s countdown
        crashState.playerStatus = 'idle'; // Allow betting
    }
    
    // --- State: WAITING ---
    // Countdown to next round
    if (crashState.status === 'waiting') {
        const timeLeft = (crashState.timeToNext - now) / 1000;
        if (timeLeft <= 0) {
            // Start the run
            crashState.status = 'running';
            crashState.startTime = now;
            crashState.crashPoint = getCrashPoint();
        } else {
            // Draw countdown
            drawCrashDisplay(`Starting in ${timeLeft.toFixed(1)}s`, 'gray-400', '5xl');
            updateCrashButton();
        }
    }
    
    // --- State: RUNNING ---
    // Multiplier is increasing
    if (crashState.status === 'running') {
        const elapsed = now - crashState.startTime;
        const currentMultiplier = getCrashMultiplier(elapsed);
        
        // Check for crash
        if (currentMultiplier >= crashState.crashPoint) {
            crashState.status = 'crashed';
            crashState.timeToNext = now + 4000; // 4s display
            
            // Check if player lost
            if (crashState.playerStatus === 'bet_placed') {
                crashState.playerStatus = 'ended'; // Mark as ended
                // Graph loss
                updateGraphData(crashState.bet, -crashState.bet);
                showMessage(`You missed the cashout! Crashed @ ${crashState.crashPoint.toFixed(2)}x`, 'error');
            }
        } else {
            // Still running
            drawCrashDisplay(`${currentMultiplier.toFixed(2)}x`, 'white', '7xl', currentMultiplier);
            
            // Check for auto-cashout
            if (crashState.playerStatus === 'bet_placed' && crashState.autoCashout >= 1.01 && currentMultiplier >= crashState.autoCashout) {
                onCrashPlayClick(); // Trigger a cashout
            }
            updateCrashButton();
        }
    }
    
    // --- State: CRASHED ---
    // Show crash point
    if (crashState.status === 'crashed') {
        drawCrashDisplay(`Crashed @ ${crashState.crashPoint.toFixed(2)}x`, 'red-500', '6xl');
        updateCrashButton(true); // Disable button
        
        if (now >= crashState.timeToNext) {
            crashState.status = 'waiting';
            crashState.timeToNext = now + 5000; // 5s countdown
            crashState.playerStatus = 'idle'; // Allow betting for next round
            crashState.bet = 0;
            crashState.autoCashout = 0;
        }
    }

    crashState.loopId = requestAnimationFrame(runCrashGame);
}

function updateCrashButton(forceDisable = false) {
    const btn = crashGameElements.playButton;
    if (!btn) return;
    
    btn.disabled = forceDisable;
    
    // Player has cashed out
    if (crashState.playerStatus === 'cashed_out') {
        btn.disabled = true;
        btn.textContent = 'Cashed Out!';
        btn.classList.remove('btn-bet', 'bg-yellow-500', 'bg-red-600');
        btn.classList.add('btn-bet-mod', 'bg-green-600');
    }
    // Player's bet is active and game is running
    else if (crashState.status === 'running' && crashState.playerStatus === 'bet_placed') {
        btn.disabled = false;
        const currentMultiplier = getCrashMultiplier(Date.now() - crashState.startTime);
        btn.textContent = `Cashout $${(crashState.bet * currentMultiplier).toFixed(2)}`;
        btn.classList.remove('btn-bet', 'btn-bet-mod');
        btn.classList.add('bg-yellow-500', 'hover:bg-yellow-400', 'text-black', 'font-bold');
    }
    // Player has placed a bet, but game is waiting
    else if (crashState.status === 'waiting' && crashState.playerStatus === 'bet_placed') {
        btn.disabled = true;
        btn.textContent = 'Waiting for round...';
        btn.classList.remove('btn-bet', 'bg-yellow-500');
        btn.classList.add('btn-bet-mod');
    }
    // Default state: Place Bet
    else {
        btn.disabled = forceDisable;
        btn.textContent = 'Place Bet';
        btn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'text-black', 'font-bold', 'btn-bet-mod', 'bg-green-600');
        btn.classList.add('btn-bet');
    }
}

function drawCrashDisplay(text, color = 'white', size = '5xl', multiplier = 0) {
    const { display, canvas, ctx } = crashGameElements;
    if (!display || !canvas || !ctx) return;
    
    // 1. Update text
    display.innerHTML = `<div class="text-${size} font-bold text-${color} transition-colors duration-150">${text}</div>`;
    
    // 2. Draw graph line
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (crashState.status === 'running') {
        const elapsed = Date.now() - crashState.startTime;
        
        ctx.beginPath();
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 4;
        ctx.moveTo(0, canvas.height);
        
        for (let t = 0; t < elapsed; t += 50) {
            const mult = getCrashMultiplier(t);
            // Scale time to x-axis (e.g., 10 seconds = full width)
            const x = (t / 10000) * canvas.width;
            // Scale multiplier to y-axis (e.g., 10x = full height)
            const y = canvas.height - ((mult - 1) / 9) * canvas.height;
            
            if (x > canvas.width || y < 0) break;
            ctx.lineTo(x, y);
        }
        
        // Draw last point
        const x = (elapsed / 10000) * canvas.width;
        const y = canvas.height - ((multiplier - 1) / 9) * canvas.height;
        ctx.lineTo(x, y);
        
        ctx.stroke();
    }
}
