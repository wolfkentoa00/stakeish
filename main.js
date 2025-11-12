// --- Application State ---
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;

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
    if (type === 'error') {
        messageBox.classList.remove('bg-green-600');
        messageBox.classList.add('bg-red-600');
    } else if (type === 'success') {
        messageBox.classList.remove('bg-red-600');
        messageBox.classList.add('bg-green-600');
    }
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
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

// --- Game Navigation Logic ---

async function loadGame(gameName) {
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
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    loadGame('limbo');

    walletButton.addEventListener('click', toggleModal);
    closeModal.addEventListener('click', toggleModal);
    depositButton.addEventListener('click', depositMoney);
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const gameName = e.currentTarget.getAttribute('data-game');
            loadGame(gameName);
        });
    });
});

// ------------------------------------
// --- GAME LOGIC ---
// ------------------------------------

// --- Limbo Logic ---
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
    } else {
        resultDiv.innerHTML = `<p class="text-5xl font-bold text-red-500">${crash}x</p><p class="mt-2">Lost $${bet.toFixed(2)}.</p>`;
    }
    updateBalanceDisplay();
    btn.disabled = false;
}

// --- Slots Logic ---
const slotsSymbols = ['🍒', '🍋', '🍊', '🍉', '🔔', '🍀', '💎'];
const slotsPayouts = { '💎': {3:50}, '🍀': {3:20}, '🔔': {3:15}, '🍉': {3:10}, '🍊': {3:5}, '🍋': {3:3}, '🍒': {3:2, 2:0.5} };

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

    const spin = setInterval(() => {
        reelContainer.innerHTML = `
            <div class="reel p-4 spinning">${slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)]}</div>
            <div class="reel p-4 spinning">${slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)]}</div>
            <div class="reel p-4 spinning">${slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)]}</div>
        `;
    }, 100);

    await new Promise(r => setTimeout(r, 1500));
    clearInterval(spin);

    const final = [
        slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)],
        slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)],
        slotsSymbols[Math.floor(Math.random()*slotsSymbols.length)]
    ];

    reelContainer.innerHTML = final.map(s => `<div class="reel p-4">${s}</div>`).join('');

    let win = 0;
    const counts = {};
    final.forEach(s => counts[s] = (counts[s]||0)+1);

    if (final[0] === final[1] && final[1] === final[2]) {
        if (slotsPayouts[final[0]]?.[3]) win = bet * slotsPayouts[final[0]][3];
    } else if (counts['🍒'] === 2) {
        win = bet * slotsPayouts['🍒'][2];
    }

    if (win > 0) {
        balance += win;
        resultDiv.textContent = `You won $${win.toFixed(2)}!`;
        resultDiv.classList.add('text-green-400');
    } else {
        resultDiv.textContent = `You lost $${bet.toFixed(2)}.`;
        resultDiv.classList.add('text-red-500');
    }
    updateBalanceDisplay();
    btn.disabled = false;
}

// --- Blackjack Logic ---
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
    el.className = `card ${color} bg-white rounded-lg w-[70px] h-[100px] flex items-center justify-center relative shadow-md border border-gray-200 text-xl font-bold`;
    
    if (card.hidden) {
        el.className += " bg-blue-500";
        el.innerHTML = ""; 
    } else {
        el.innerHTML = `<span class="absolute top-1 left-1 text-sm">${card.rank}</span>${card.suit}<span class="absolute bottom-1 right-1 text-sm transform rotate-180">${card.rank}</span>`;
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
    dealerDiv.innerHTML = ''; playerDiv.innerHTML = '';
    
    bjState.dealer.forEach(c => dealerDiv.appendChild(createCardEl(c)));
    bjState.hands[bjState.activeHand].forEach(c => playerDiv.appendChild(createCardEl(c)));

    document.getElementById('blackjackDealerScore').textContent = `Score: ${getHandVal(bjState.dealer)}`;
    document.getElementById('blackjackPlayerScore').textContent = `Score: ${getHandVal(bjState.hands[bjState.activeHand])}`;
}

async function dealBlackjack() {
    const betInput = document.getElementById('blackjackBetAmount');
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid bet.", 'error'); return; }
    
    balance -= bet;
    updateBalanceDisplay();
    
    bjState = {
        deck: getDeck(),
        dealer: [],
        hands: [[]],
        bet: bet,
        activeHand: 0,
        status: 'playing'
    };
    
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push(bjState.deck.pop());
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push({ ...bjState.deck.pop(), hidden: true });
    
    document.getElementById('blackjackBetControls').classList.add('hidden');
    document.getElementById('blackjackActionControls').classList.remove('hidden');
    document.getElementById('blackjackResult').textContent = '';
    
    renderBJ();
    checkBJTurn();
}

function bjHit() {
    bjState.hands[bjState.activeHand].push(bjState.deck.pop());
    renderBJ();
    if (getHandVal(bjState.hands[bjState.activeHand]) > 21) {
        endBJRound("Bust!");
    }
}

function bjStand() {
    bjDealerPlay();
}

function bjDouble() {
    if (balance < bjState.bet) return;
    balance -= bjState.bet;
    bjState.bet *= 2;
    updateBalanceDisplay();
    bjState.hands[bjState.activeHand].push(bjState.deck.pop());
    renderBJ();
    if (getHandVal(bjState.hands[bjState.activeHand]) > 21) endBJRound("Bust!");
    else bjDealerPlay();
}

function bjSplit() {
    // Simplified split for brevity: just duplicates bet and card
    if (balance < bjState.bet) return;
    showMessage("Split feature coming soon!", 'success');
}

async function bjDealerPlay() {
    bjState.dealer[1].hidden = false;
    renderBJ();
    
    while (getHandVal(bjState.dealer) < 17) {
        await new Promise(r => setTimeout(r, 500));
        bjState.dealer.push(bjState.deck.pop());
        renderBJ();
    }
    
    const pVal = getHandVal(bjState.hands[bjState.activeHand]);
    const dVal = getHandVal(bjState.dealer);
    
    if (dVal > 21 || pVal > dVal) {
        balance += bjState.bet * 2;
        endBJRound("You Win!");
    } else if (pVal === dVal) {
        balance += bjState.bet;
        endBJRound("Push");
    } else {
        endBJRound("Dealer Wins");
    }
    updateBalanceDisplay();
}

function endBJRound(msg) {
    document.getElementById('blackjackResult').textContent = msg;
    document.getElementById('blackjackBetControls').classList.remove('hidden');
    document.getElementById('blackjackActionControls').classList.add('hidden');
}

// --- Scratch Off Logic ---
let scratchState = { prize: 0, isRevealed: false, isDrawing: false };

function initScratch() {
    const btn = document.getElementById('buyScratchButton');
    const canvas = document.getElementById('scratchCanvas');
    if (!btn || !canvas) return;

    const ctx = canvas.getContext('2d');

    btn.addEventListener('click', () => buyScratchTicket(ctx, canvas));
    
    // Mouse Events
    canvas.addEventListener('mousedown', (e) => startScratch(e, ctx, canvas));
    canvas.addEventListener('mousemove', (e) => doScratch(e, ctx, canvas));
    canvas.addEventListener('mouseup', () => stopScratch(ctx, canvas));
    canvas.addEventListener('mouseout', () => stopScratch(ctx, canvas));
    
    // Touch Events
    canvas.addEventListener('touchstart', (e) => startScratch(e, ctx, canvas), {passive: false});
    canvas.addEventListener('touchmove', (e) => doScratch(e, ctx, canvas), {passive: false});
    canvas.addEventListener('touchend', () => stopScratch(ctx, canvas));
}

function buyScratchTicket(ctx, canvas) {
    const betInput = document.getElementById('scratchBetAmount');
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid amount", 'error'); return; }
    
    balance -= bet;
    updateBalanceDisplay();
    
    document.getElementById('buyScratchButton').disabled = true;
    document.getElementById('scratchInstructions').classList.add('hidden');
    document.getElementById('scratchResult').textContent = '';
    
    // Reset State
    scratchState.isRevealed = false;
    scratchState.prize = (Math.random() < 0.3) ? bet * 2 : 0; // 30% win rate example
    
    // Setup Prize Text
    const prizeDiv = document.getElementById('scratchPrize');
    prizeDiv.textContent = scratchState.prize > 0 ? `$${scratchState.prize.toFixed(2)}` : "$0.00";
    prizeDiv.classList.remove('hidden');
    
    // Setup Canvas
    canvas.classList.remove('hidden');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a5063'; // The scratch cover color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startScratch(e, ctx, canvas) {
    if (scratchState.isRevealed) return;
    e.preventDefault();
    scratchState.isDrawing = true;
    doScratch(e, ctx, canvas);
}

function doScratch(e, ctx, canvas) {
    if (!scratchState.isDrawing || scratchState.isRevealed) return;
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    // Adjust for canvas scaling if CSS width != attribute width
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 20, 0, Math.PI * 2);
    ctx.fill();
}

function stopScratch(ctx, canvas) {
    if (!scratchState.isDrawing) return;
    scratchState.isDrawing = false;
    checkScratchWin(ctx, canvas);
}

function checkScratchWin(ctx, canvas) {
    if (scratchState.isRevealed) return;
    
    // Check how much is cleared
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] === 0) cleared++;
    }
    
    if (cleared / (canvas.width * canvas.height) > 0.4) { // Win if 40% cleared
        scratchState.isRevealed = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear all
        
        const resDiv = document.getElementById('scratchResult');
        if (scratchState.prize > 0) {
            balance += scratchState.prize;
            resDiv.textContent = `You Won $${scratchState.prize.toFixed(2)}!`;
            resDiv.className = "text-center mt-6 text-2xl font-bold text-green-400";
        } else {
            resDiv.textContent = "Better luck next time.";
            resDiv.className = "text-center mt-6 text-2xl font-bold text-red-500";
        }
        updateBalanceDisplay();
        
        setTimeout(() => {
            document.getElementById('buyScratchButton').disabled = false;
            canvas.classList.add('hidden');
            document.getElementById('scratchPrize').classList.add('hidden');
            document.getElementById('scratchInstructions').classList.remove('hidden');
        }, 2000);
    }
}
