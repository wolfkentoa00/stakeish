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
        case 'mines': initMines(); break; // Added Mines
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    loadGame('limbo'); // Default game

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

// --- Limbo Logic (Unchanged) ---
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

// --- Slots Logic (Overhauled) ---
const slotsSymbols = {
    '🍒': 10, // Cherry (common)
    '🍋': 8,
    '🍊': 7,
    '🍉': 6,
    '🔔': 5,
    '🍀': 4,
    '💎': 2, // Diamond (rare)
    '⭐': 3  // Wild (uncommon)
};

// Payouts: [Symbol, Count] -> Multiplier
const slotsPayouts = {
    '💎': { 3: 100 },
    '🍀': { 3: 50 },
    '🔔': { 3: 25 },
    '🍉': { 3: 15 },
    '🍊': { 3: 10 },
    '🍋': { 3: 5 },
    '🍒': { 3: 10, 2: 3, 1: 1 }, // Cherries pay for 1, 2, or 3
};

// Create a weighted pool for more "natural" spinning
const slotsPool = [];
for (const [symbol, weight] of Object.entries(slotsSymbols)) {
    for (let i = 0; i < weight; i++) {
        slotsPool.push(symbol);
    }
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

    // Animate spinning
    const spinInterval = setInterval(() => {
        reelContainer.innerHTML = `
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
            <div class="reel p-4 spinning">${getSlotSpin()}</div>
        `;
    }, 100);

    await new Promise(r => setTimeout(r, 1500));
    clearInterval(spinInterval);

    // Get final result
    const finalReels = [getSlotSpin(), getSlotSpin(), getSlotSpin()];
    reelContainer.innerHTML = finalReels.map(s => `<div class="reel p-4">${s}</div>`).join('');

    // --- Calculate Winnings ---
    let win = 0;
    
    // Replace wilds ('⭐') for win calculation.
    // This simple logic checks for the best 3-of-a-kind.
    // A more complex system would check all combinations.
    const symbolCounts = {};
    let nonWildSymbol = finalReels.find(s => s !== '⭐');
    
    // Count symbols
    finalReels.forEach(s => {
        const symbolToCount = (s === '⭐' && nonWildSymbol) ? nonWildSymbol : s;
        symbolCounts[symbolToCount] = (symbolCounts[symbolToCount] || 0) + 1;
    });

    // Check payouts from highest to lowest
    let winFound = false;
    for (const [symbol, payouts] of Object.entries(slotsPayouts).reverse()) { // Check rare ones first
        if (symbolCounts[symbol]) {
            if (symbolCounts[symbol] === 3 && payouts[3]) {
                win = bet * payouts[3];
                winFound = true;
                break;
            } else if (symbolCounts[symbol] === 2 && payouts[2]) {
                win = bet * payouts[2];
                winFound = true;
                break;
            } else if (symbolCounts[symbol] === 1 && payouts[1]) {
                win = bet * payouts[1];
                winFound = true;
                break;
            }
        }
    }

    // --- Display Result ---
    if (win > 0) {
        balance += win;
        resultDiv.textContent = `You won $${win.toFixed(2)}!`;
        resultDiv.classList.add('text-green-400');
        resultDiv.classList.remove('text-red-500');
    } else {
        resultDiv.textContent = `You lost $${bet.toFixed(2)}.`;
        resultDiv.classList.add('text-red-500');
        resultDiv.classList.remove('text-green-400');
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
    // Removed absolute/relative logic inside card to make them stack nicely in flex
    el.className = `card ${color} bg-white rounded-lg w-[60px] h-[90px] sm:w-[70px] sm:h-[100px] flex flex-col items-center justify-between p-1 shadow-md border border-gray-200 text-xl font-bold select-none`;
    
    if (card.hidden) {
        el.className = "bg-blue-800 rounded-lg w-[60px] h-[90px] sm:w-[70px] sm:h-[100px] border-2 border-white shadow-md"; // Simple card back
        el.innerHTML = ""; 
    } else {
        // Top Left
        const top = document.createElement('div');
        top.className = "self-start text-sm leading-none";
        top.innerHTML = `${card.rank}<br>${card.suit}`;
        el.appendChild(top);

        // Center Suit
        const center = document.createElement('div');
        center.className = "text-2xl";
        center.innerHTML = card.suit;
        el.appendChild(center);

        // Bottom Right (Rotated)
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
    
    // --- Render Dealer ---
    dealerDiv.innerHTML = '';
    dealerDiv.className = "flex justify-center gap-2"; // Center cards
    bjState.dealer.forEach(c => dealerDiv.appendChild(createCardEl(c)));
    document.getElementById('blackjackDealerScore').textContent = `Score: ${getHandVal(bjState.dealer)}`;

    // --- Render Player (Handles Splits) ---
    playerDiv.innerHTML = '';
    
    // Create a container for all hands
    const handsContainer = document.createElement('div');
    handsContainer.className = "flex flex-wrap justify-center gap-8"; // Gap between split hands

    bjState.hands.forEach((hand, index) => {
        const handWrapper = document.createElement('div');
        const isActive = index === bjState.activeHand && bjState.status === 'playing';
        
        // Visual styling for Active vs Inactive hands
        handWrapper.className = `flex flex-col items-center p-3 rounded-xl transition-all duration-300 ${
            isActive ? 'bg-blue-900/40 ring-2 ring-blue-400 scale-105 shadow-lg' : 'opacity-70 grayscale-[0.3]'
        }`;

        // Score label for this specific hand
        const scoreLabel = document.createElement('div');
        scoreLabel.className = "text-xs text-gray-300 mb-2 font-mono";
        scoreLabel.textContent = `Hand ${index + 1}: ${getHandVal(hand)}`;
        handWrapper.appendChild(scoreLabel);

        // Cards container
        const cardsRow = document.createElement('div');
        cardsRow.className = "flex gap-2";
        hand.forEach(c => cardsRow.appendChild(createCardEl(c)));
        handWrapper.appendChild(cardsRow);

        handsContainer.appendChild(handWrapper);
    });

    playerDiv.appendChild(handsContainer);
    
    // Update global score text to show active hand info or "Wait"
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
        deck: getDeck(),
        dealer: [],
        hands: [[]], // Array of hands (starts with 1)
        bet: bet,
        activeHand: 0,
        status: 'playing'
    };
    
    // Initial Deal
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push(bjState.deck.pop());
    bjState.hands[0].push(bjState.deck.pop());
    bjState.dealer.push({ ...bjState.deck.pop(), hidden: true });
    
    document.getElementById('blackjackBetControls').classList.add('hidden');
    document.getElementById('blackjackActionControls').classList.remove('hidden');
    document.getElementById('blackjackResult').textContent = '';
    
    // Enable split button only if valid
    checkSplitAvailable();
    
    renderBJ();
    checkBJTurn();
}

function checkSplitAvailable() {
    const splitBtn = document.getElementById('blackjackSplit');
    const currentHand = bjState.hands[bjState.activeHand];
    
    // Can split if: 2 cards, Same Value (e.g. 10 & K, or 8 & 8), and enough balance
    if (currentHand.length === 2 && 
        currentHand[0].value === currentHand[1].value && 
        balance >= bjState.bet) {
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
        // If bust, move to next hand immediately
        handleNextHandOrDealer();
    } else {
        // Turn continues, check split button availability again (disable it after hitting)
        checkSplitAvailable(); 
        // Actually, you can usually only split on the first 2 cards, so disable it:
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
    
    // Double current hand's bet tracking? 
    // For simplicity, we assume uniform bets, but to be accurate we'd need an array of bets.
    // We will just add the extra win payout at the end.
    bjState.hands[bjState.activeHand].isDoubled = true;

    bjState.hands[bjState.activeHand].push(bjState.deck.pop());
    renderBJ();
    
    handleNextHandOrDealer();
}

function bjSplit() {
    // 1. Validate
    const currentHand = bjState.hands[bjState.activeHand];
    if (currentHand.length !== 2 || currentHand[0].value !== currentHand[1].value) return;
    if (balance < bjState.bet) { showMessage("Insufficient funds to split.", 'error'); return; }

    // 2. Pay for split
    balance -= bjState.bet;
    updateBalanceDisplay();

    // 3. Create new hand
    const cardToMove = currentHand.pop();
    const newHand = [cardToMove];
    
    // Add to state
    bjState.hands.push(newHand);

    // 4. Deal 1 card to BOTH hands immediately
    currentHand.push(bjState.deck.pop());
    newHand.push(bjState.deck.pop());

    // 5. Update UI
    renderBJ();
    checkSplitAvailable(); // Check if the FIRST hand can be split again (optional, usually max 3 splits)
}

function handleNextHandOrDealer() {
    // Check if there are more hands to play
    if (bjState.activeHand < bjState.hands.length - 1) {
        bjState.activeHand++;
        renderBJ();
        checkSplitAvailable(); // Check if the NEW hand can be split
    } else {
        // All hands played, dealer's turn
        bjDealerPlay();
    }
}

async function bjDealerPlay() {
    bjState.status = 'finished';
    bjState.dealer[1].hidden = false;
    renderBJ();
    
    // Dealer hits on soft 17 logic or just < 17
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
    let resultMsg = [];

    bjState.hands.forEach((hand, index) => {
        const pVal = getHandVal(hand);
        let currentBet = bjState.bet;
        if (hand.isDoubled) currentBet *= 2;

        let outcome = "";

        if (pVal > 21) {
            outcome = "Bust";
        } else if (dVal > 21 || pVal > dVal) {
            totalWin += currentBet * 2; // Return bet + profit
            outcome = "Win";
        } else if (pVal === dVal) {
            totalWin += currentBet; // Return bet
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

    // Determine final message color based on net result
    const resultEl = document.getElementById('blackjackResult');
    resultEl.innerHTML = resultMsg.join(' | ');
    
    if (totalWin > (bjState.bet * bjState.hands.length)) {
        resultEl.className = "text-center text-2xl font-bold my-4 h-8 text-green-400";
    } else if (totalWin === 0) {
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

// --- Scratch Off Logic (Remade) ---
let scratchState = { 
    prize: 0, 
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
    scratchState.ctx = canvas.getContext('2d');
    
    // Set initial state: canvas hidden, instructions visible
    scratchState.canvas.style.visibility = 'hidden';
    document.getElementById('scratchInstructions').style.visibility = 'visible';

    btn.addEventListener('click', buyScratchTicket);
    
    // Mouse Events
    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('mousemove', doScratch);
    canvas.addEventListener('mouseup', stopScratch);
    canvas.addEventListener('mouseout', stopScratch);
    
    // Touch Events
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
    
    // Determine prize
    const rand = Math.random();
    if (rand < 0.1) { // 10% chance for 5x
        scratchState.prize = bet * 5;
    } else if (rand < 0.3) { // 20% chance for 2x
        scratchState.prize = bet * 2;
    } else {
        scratchState.prize = 0;
    }

    // --- Draw on Canvas ---
    const ctx = scratchState.ctx;
    const canvas = scratchState.canvas;
    
    // 1. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw the prize text underneath
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = scratchState.prize > 0 ? '#fde047' : '#9ca3af'; // Yellow or Gray
    ctx.font = 'bold 48px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const prizeText = scratchState.prize > 0 ? `$${scratchState.prize.toFixed(2)}` : "No Win";
    ctx.fillText(prizeText, canvas.width / 2, canvas.height / 2);
    
    // 3. Draw the scratchable cover on top
    ctx.fillStyle = '#3a5063'; // The scratch cover color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Make canvas visible
    canvas.style.visibility = 'visible';
}

function getScratchPos(e) {
    const canvas = scratchState.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
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
    checkScratchWin(); // Check win condition after user stops drawing
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
    
    // Check how much is cleared
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    const totalPixels = canvas.width * canvas.height;
    
    for (let i = 3; i < imgData.length; i += 4) { // Check alpha channel
        if (imgData[i] === 0) {
            cleared++;
        }
    }
    
    // If >30% is cleared, reveal all
    if (cleared / totalPixels > 0.3) { 
        scratchState.isRevealed = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear all
        
        // Redraw prize text so it stays
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = scratchState.prize > 0 ? '#fde047' : '#9ca3af';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const prizeText = scratchState.prize > 0 ? `$${scratchState.prize.toFixed(2)}` : "No Win";
        ctx.fillText(prizeText, canvas.width / 2, canvas.height / 2);
        
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


// --- Mines Logic (New Game) ---
let minesState = {
    grid: [], // 25 elements: 'gem' or 'mine'
    revealed: [], // 25 elements: true or false
    bet: 0,
    minesCount: 0,
    gemsFound: 0,
    totalGems: 0,
    currentMultiplier: 1,
    nextMultiplier: 1,
    active: false
};

const MINES_GRID_SIZE = 25;

function initMines() {
    // Populate grid with initial tiles
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
        showMessage("Game is already in progress. Cash out or hit a mine.", 'error');
        return;
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
        grid: [],
        revealed: new Array(MINES_GRID_SIZE).fill(false),
        bet: bet,
        minesCount: minesCount,
        gemsFound: 0,
        totalGems: MINES_GRID_SIZE - minesCount,
        currentMultiplier: 1,
        active: true
    };
    
    // Generate grid
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
    
    // Update UI
    document.getElementById('playMinesButton').classList.add('hidden');
    document.getElementById('cashoutMinesButton').classList.remove('hidden');
    document.getElementById('cashoutMinesButton').disabled = true;
    document.getElementById('cashoutMinesButton').textContent = 'Cashout $0.00';
    document.getElementById('minesBetAmount').disabled = true;
    document.getElementById('minesCount').disabled = true;
    document.getElementById('minesResult').textContent = '';
    
    // Reset tiles
    const tiles = document.querySelectorAll('.mines-tile');
    tiles.forEach(tile => {
        tile.disabled = false;
        tile.innerHTML = '';
        tile.classList.remove('gem', 'mine');
    });

    updateMinesDisplay();
}

function onMinesTileClick(index) {
    if (!minesState.active || minesState.revealed[index]) return;
    
    minesState.revealed[index] = true;
    const tile = document.querySelector(`.mines-tile[data-index='${index}']`);
    tile.disabled = true;

    if (minesState.grid[index] === 'mine') {
        // --- GAME OVER ---
        tile.classList.add('mine');
        tile.innerHTML = '<i class="fas fa-bomb"></i>';
        endMinesGame(false); // false = loss
    } else {
        // --- FOUND GEM ---
        tile.classList.add('gem');
        tile.innerHTML = '<i class="fas fa-gem"></i>';
        minesState.gemsFound++;
        
        // Update multipliers
        minesState.currentMultiplier = minesState.nextMultiplier;
        minesState.nextMultiplier = calculateMinesMultiplier(minesState.gemsFound + 1, minesState.minesCount);
        
        document.getElementById('cashoutMinesButton').disabled = false;
        const cashoutAmount = (minesState.bet * minesState.currentMultiplier).toFixed(2);
        document.getElementById('cashoutMinesButton').textContent = `Cashout $${cashoutAmount}`;
        
        updateMinesDisplay();
        
        // Check for win (all gems found)
        if (minesState.gemsFound === minesState.totalGems) {
            endMinesGame(true); // true = win
        }
    }
}

function cashoutMines() {
    if (!minesState.active || minesState.gemsFound === 0) return;
    
    const winnings = minesState.bet * minesState.currentMultiplier;
    balance += winnings;
    updateBalanceDisplay();
    showMessage(`Cashed out $${winnings.toFixed(2)}!`, 'success');
    
    endMimesGame(true); // true = win (by cashing out)
}

function endMinesGame(didWin) {
    minesState.active = false;
    
    // Show result message
    const resDiv = document.getElementById('minesResult');
    if (didWin) {
        resDiv.textContent = `You won!`;
        resDiv.className = "text-center mt-6 text-2xl font-bold text-green-400";
    } else {
        resDiv.textContent = 'You hit a mine!';
        resDiv.className = "text-center mt-6 text-2xl font-bold text-red-500";
    }
    
    // Reveal all tiles
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
    
    // Reset controls
    document.getElementById('playMinesButton').classList.remove('hidden');
    document.getElementById('cashoutMinesButton').classList.add('hidden');
    document.getElementById('minesBetAmount').disabled = false;
    document.getElementById('minesCount').disabled = false;
}

function updateMinesDisplay() {
    document.getElementById('minesGemsFound').textContent = minesState.gemsFound;
    document.getElementById('minesNextMultiplier').textContent = `${minesState.nextMultiplier.toFixed(2)}x`;
}

// Binomial Coefficient: nCr = n! / (r! * (n-r)!)
function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - i + 1) / i;
    }
    return res;
}

// Stake's Mines Multiplier Formula (approximate)
// 0.99 (house edge) * C(25, gems) / C(25-mines, gems)
function calculateMinesMultiplier(gemsToFind, minesCount) {
    const houseEdge = 0.99;
    const totalTiles = MINES_GRID_SIZE;
    const totalGems = totalTiles - minesCount;
    
    const c1 = combinations(totalTiles, gemsToFind);
    const c2 = combinations(totalGems, gemsToFind);
    
    if (c2 === 0) return 1; // Avoid division by zero
    
    return (houseEdge * c1 / c2) || 1;
}
