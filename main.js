// --- Application State ---
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;

// --- DOM Elements (Global) ---
let balanceDisplay, walletButton, depositModal, closeModal, depositButton, depositAmountInput;
let navButtons, gameArea, messageBox, messageText;

// --- Utility Functions (Global) ---
function updateBalanceDisplay() {
    if (!balanceDisplay) balanceDisplay = document.getElementById('balanceDisplay');
    if (balanceDisplay) {
        balanceDisplay.textContent = balance.toFixed(2);
    }
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
window.modifyBet = modifyBet; // Make global

function showMessage(message, type = 'error') {
    if (!messageBox) messageBox = document.getElementById('messageBox');
    if (!messageText) messageText = document.getElementById('messageText');
    if (messageBox && messageText) {
        messageText.textContent = message;
        messageBox.classList.remove('bg-green-600', 'bg-red-600');
        if (type === 'error') {
            messageBox.classList.add('bg-red-600');
        } else if (type === 'success') {
            messageBox.classList.add('bg-green-600');
        }
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 3000);
    }
}

// --- Modal Logic ---
function toggleModal() {
    if (!depositModal) depositModal = document.getElementById('depositModal');
    if (depositModal) {
        depositModal.classList.toggle('hidden');
    }
}

function depositMoney() {
    if (!depositAmountInput) depositAmountInput = document.getElementById('depositAmount');
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
    // Removed poker-related leave logic

    if (!navButtons) navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.game === gameName);
    });

    try {
        // This is the fix for the GitHub pages loading issue
        const response = await fetch(`${gameName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load ${gameName}.html`);
        }
        if (!gameArea) gameArea = document.getElementById('game-area');
        gameArea.innerHTML = await response.text();
        initGame(gameName);
    } catch (error) {
        console.error(error);
        if (!gameArea) gameArea = document.getElementById('game-area');
        gameArea.innerHTML = `<p class="text-2xl text-red-500">Error: Could not load game.</p>`;
    }
}

function initGame(gameName) {
    switch (gameName) {
        case 'limbo': initLimbo(); break;
        case 'blackjack': initBlackjack(); break;
        case 'slots': initSlots(); break;
        case 'scratch': initScratch(); break;
        // Removed 'poker' case
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialize all DOM element variables
    balanceDisplay = document.getElementById('balanceDisplay');
    walletButton = document.getElementById('walletButton');
    depositModal = document.getElementById('depositModal');
    closeModal = document.getElementById('closeModal');
    depositButton = document.getElementById('depositButton');
    depositAmountInput = document.getElementById('depositAmount');
    navButtons = document.querySelectorAll('.nav-item');
    gameArea = document.getElementById('game-area');
    messageBox = document.getElementById('messageBox');
    messageText = document.getElementById('messageText');

    updateBalanceDisplay();
    loadGame('limbo'); // Load default game

    // Attach listeners
    if (walletButton) walletButton.addEventListener('click', toggleModal);
    if (closeModal) closeModal.addEventListener('click', toggleModal);
    if (depositButton) depositButton.addEventListener('click', depositMoney);
    
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const gameName = e.currentTarget.getAttribute('data-game');
            if (gameName) loadGame(gameName);
        });
    });
});


// ------------------------------------
// --- ALL GAME LOGIC BELOW ---
// ------------------------------------

// --- Limbo Game Logic ---
function initLimbo() {
    const btn = document.getElementById('playLimboButton');
    if(btn) btn.addEventListener('click', playLimbo);
}
function getLimboCrashPoint() {
    if (Math.random() < 0.01) return '0.00';
    const r = Math.random();
    return (Math.floor((99 / (100 - r * 100)) * 100) / 100).toFixed(2);
}
async function playLimbo() {
    const betInput = document.getElementById('limboBetAmount');
    const multInput = document.getElementById('limboTargetMultiplier');
    const resultDiv = document.getElementById('limboResult');
    const btn = document.getElementById('playLimboButton');
    const bet = parseFloat(betInput.value);
    const target = parseFloat(multInput.value);
    if (isNaN(bet) || bet <= 0 || isNaN(target) || target < 1.01 || bet > balance) {
        showMessage("Invalid bet or target.", 'error'); return;
    }
    btn.disabled = true;
    balance -= bet;
    updateBalanceDisplay();
    resultDiv.innerHTML = `<p class="text-5xl font-bold text-gray-400" id="limboCounter">1.00x</p>`;
    const counter = document.getElementById('limboCounter');
    let start = Date.now();
    const anim = setInterval(() => {
        if (Date.now() - start > 1500) { clearInterval(anim); return; }
        if (counter) counter.textContent = `${(1 + Math.random()*9).toFixed(2)}x`;
    }, 50);
    await new Promise(r => setTimeout(r, 1500));
    clearInterval(anim);
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

// --- Slots Game Logic ---
const slotsSymbols = ['🍒', '🍋', '🍊', '🍉', '🔔', '🍀', '💎'];
const slotsPayouts = {'💎': {3:50}, '🍀': {3:20}, '🔔': {3:15}, '🍉': {3:10}, '🍊': {3:5}, '🍋': {3:3}, '🍒': {3:2, 2:0.5}};
function initSlots() {
    const btn = document.getElementById('playSlotsButton');
    if(btn) btn.addEventListener('click', playSlots);
}
function getRandomSymbol() { return slotsSymbols[Math.floor(Math.random() * slotsSymbols.length)]; }
async function playSlots() {
    const betInput = document.getElementById('slotsBetAmount');
    const btn = document.getElementById('playSlotsButton');
    const reelsDiv = document.getElementById('slotsReels');
    const resultDiv = document.getElementById('slotsResult');
    const bet = parseFloat(betInput.value);
    if (isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid bet.", 'error'); return; }
    btn.disabled = true;
    balance -= bet;
    updateBalanceDisplay();
    resultDiv.innerHTML = '<span class="animate-pulse text-gray-400">Spinning...</span>';
    resultDiv.classList.remove('text-green-400', 'text-red-500');
    const spin = setInterval(() => {
        if (reelsDiv) reelsDiv.innerHTML = [1,2,3].map(() => `<div class="reel p-4 spinning">${getRandomSymbol()}</div>`).join('');
    }, 100);
    await new Promise(r => setTimeout(r, 1500));
    clearInterval(spin);
    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    if (reelsDiv) reelsDiv.innerHTML = finalReels.map(s => `<div class="reel p-4">${s}</div>`).join('');
    let win = 0; const counts = {}; finalReels.forEach(s => counts[s] = (counts[s]||0)+1);
    if (finalReels[0]===finalReels[1] && finalReels[1]===finalReels[2]) {
        win = (slotsPayouts[finalReels[0]]?.[3] || 0) * bet;
    } else if (counts['🍒'] === 2) {
        win = (slotsPayouts['🍒']?.[2] || 0) * bet;
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

// --- Blackjack Game Logic ---
const bjState = {deck:[], hands:[], dealer:[], bet:0, active:0, status:'betting'};
const BJ_SUITS = ['♥', '♦', '♠', '♣'];
const BJ_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
function initBlackjack() {
    const btn = document.getElementById('blackjackDealButton');
    if(btn) {
        btn.addEventListener('click', dealBlackjack);
        document.getElementById('blackjackHit').addEventListener('click', blackjackHit);
        document.getElementById('blackjackStand').addEventListener('click', blackjackStand);
        document.getElementById('blackjackDouble').addEventListener('click', blackjackDouble);
        document.getElementById('blackjackSplit').addEventListener('click', () => showMessage('Split not implemented.'));
    }
}
function createCardEl(c){
    const el = document.createElement('div');
    el.className = `card ${(c.suit==='♥'||c.suit==='♦')?'red':'black'}`;
    if(c.hidden) el.classList.add('card-back');
    else el.innerHTML = `<span class="card-suit-top">${c.rank}${c.suit}</span><span>${c.suit}</span><span class="card-suit-bottom">${c.rank}${c.suit}</span>`;
    return el;
}
function createDeck(){
    let d=[]; for(let s of BJ_SUITS) for(let r of BJ_RANKS) {
        let v=parseInt(r); if(r==='A')v=11; else if('JQK'.includes(r))v=10; d.push({suit:s,rank:r,value:v});
    } return d.sort(()=>Math.random()-0.5);
}
function calcHandVal(h) {
    let v=0, aces=0; for(let c of h) if(!c.hidden){ v+=c.value; if(c.rank==='A')aces++; }
    while(v>21&&aces>0){ v-=10; aces--; } return v;
}
function renderBJ() {
    const dealerHandEl = document.getElementById('blackjackDealerHand');
    const playerHandEl = document.getElementById('blackjackPlayerHand');
    if (dealerHandEl) {
        dealerHandEl.innerHTML = '';
        bjState.dealer.forEach(c => dealerHandEl.appendChild(createCardEl(c)));
    }
    if (playerHandEl) {
        playerHandEl.innerHTML = '';
        bjState.hands[bjState.active].forEach(c => playerHandEl.appendChild(createCardEl(c)));
    }
    let dScore = calcHandVal(bjState.dealer);
    let pScore = calcHandVal(bjState.hands[bjState.active]);
    const dealerScoreEl = document.getElementById('blackjackDealerScore');
    const playerScoreEl = document.getElementById('blackjackPlayerScore');
    if (dealerScoreEl) dealerScoreEl.textContent = `Score: ${dScore}`;
    if (playerScoreEl) playerScoreEl.textContent = `Score: ${pScore}`;
    const doubleBtn = document.getElementById('blackjackDouble');
    if (doubleBtn) doubleBtn.disabled = !(bjState.hands[bjState.active].length === 2 && balance >= bjState.bet);
}
function dealBlackjack() {
    const bet = parseFloat(document.getElementById('blackjackBetAmount').value);
    if(isNaN(bet)||bet<=0||bet>balance){ showMessage("Invalid bet.", 'error'); return; }
    balance -= bet; updateBalanceDisplay();
    bjState = {deck:createDeck(), hands:[[]], dealer:[], bet:bet, active:0, status:'playing'};
    bjState.hands[0].push(bjState.deck.pop()); bjState.dealer.push(bjState.deck.pop());
    bjState.hands[0].push(bjState.deck.pop()); bjState.dealer.push({...bjState.deck.pop(),hidden:true});
    document.getElementById('blackjackBetControls').classList.add('hidden');
    document.getElementById('blackjackActionControls').classList.remove('hidden');
    document.getElementById('blackjackResult').textContent = '';
    renderBJ();
    if(calcHandVal(bjState.hands[0]) === 21) {
        bjState.dealer[1].hidden = false; renderBJ();
        let dVal = calcHandVal(bjState.dealer);
        if(dVal === 21) { showMessage("Push!"); balance += bet; }
        else { showMessage("Blackjack!"); balance += bet * 2.5; }
        endBJRound();
    }
}
function blackjackHit() {
    bjState.hands[bjState.active].push(bjState.deck.pop()); renderBJ();
    if(calcHandVal(bjState.hands[bjState.active]) > 21) {
        showMessage("Bust!"); endBJRound();
    }
}
function blackjackStand() { dealerTurn(); }
function blackjackDouble() {
    if(balance < bjState.bet) { showMessage("Not enough funds.", 'error'); return; }
    balance -= bjState.bet; bjState.bet *= 2; updateBalanceDisplay();
    bjState.hands[bjState.active].push(bjState.deck.pop()); renderBJ();
    if(calcHandVal(bjState.hands[bjState.active]) > 21) { showMessage("Bust!"); endBJRound(); }
    else dealerTurn();
}
async function dealerTurn() {
    bjState.dealer[1].hidden = false; renderBJ();
    let dVal = calcHandVal(bjState.dealer);
    while(dVal < 17) {
        await new Promise(r => setTimeout(r, 500));
        bjState.dealer.push(bjState.deck.pop()); renderBJ(); dVal = calcHandVal(bjState.dealer);
    }
    let pVal = calcHandVal(bjState.hands[bjState.active]);
    if(dVal > 21) { showMessage("Dealer Busts! You Win!"); balance += bjState.bet * 2; }
    else if(pVal > dVal) { showMessage("You Win!"); balance += bjState.bet * 2; }
    else if(pVal === dVal) { showMessage("Push!"); balance += bjState.bet; }
    else { showMessage("Dealer Wins."); }
    endBJRound();
}
function endBJRound() {
    updateBalanceDisplay();
    document.getElementById('blackjackBetControls').classList.remove('hidden');
    document.getElementById('blackjackActionControls').classList.add('hidden');
    bjState.status = 'betting';
}

// --- Scratch Off Logic ---
let scratchCard = { prize: 0, bet: 0, isRevealed: false };
let isScratching = false;
function initScratch() {
    const btn = document.getElementById('buyScratchButton');
    const canvas = document.getElementById('scratchCanvas');
    if(!btn || !canvas) return;
    const ctx = canvas.getContext('2d');
    btn.addEventListener('click', () => buyScratchTicket(ctx, canvas));
    const start = (e) => { e.preventDefault(); isScratching = true; scratch(e, ctx, canvas); };
    const end = (e) => { e.preventDefault(); if(isScratching) stopScratching(ctx, canvas); isScratching = false; };
    const move = (e) => { e.preventDefault(); if(isScratching) scratch(e, ctx, canvas); };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseout', end);
    canvas.addEventListener('touchstart', start, {passive:false});
    canvas.addEventListener('touchmove', move, {passive:false});
    canvas.addEventListener('touchend', end);
}
function buyScratchTicket(ctx, canvas) {
    const bet = parseFloat(document.getElementById('scratchBetAmount').value);
    if(isNaN(bet) || bet <= 0 || bet > balance) { showMessage("Invalid bet.", 'error'); return; }
    balance -= bet; updateBalanceDisplay();
    document.getElementById('buyScratchButton').disabled = true;
    document.getElementById('scratchInstructions').classList.add('hidden');
    document.getElementById('scratchResult').textContent = '';
    let r = Math.random();
    if (r < 0.1) scratchCard.prize = bet * 10;
    else if (r < 0.25) scratchCard.prize = bet * 2;
    else if (r < 0.5) scratchCard.prize = bet * 1;
    else scratchCard.prize = 0;
    scratchCard.bet = bet; scratchCard.isRevealed = false;
    const prizeEl = document.getElementById('scratchPrize');
    prizeEl.textContent = `$${scratchCard.prize.toFixed(2)}`;
    prizeEl.classList.remove('hidden');
    canvas.classList.remove('hidden');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a5063';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function getScratchPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}
function scratch(e, scratchCtx, scratchCanvas) {
    if (!isScratching || scratchCard.isRevealed) return;
    const pos = getScratchPos(e, scratchCanvas);
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
    scratchCtx.fill();
}
function stopScratching(scratchCtx, scratchCanvas) {
    if (!scratchCard.isRevealed) {
        const d = scratchCtx.getImageData(0,0,scratchCanvas.width,scratchCanvas.height).data;
        let cleared = 0;
        for(let i=3; i<d.length; i+=4) if(d[i]===0) cleared++;
        if(cleared / (scratchCanvas.width*scratchCanvas.height) > 0.6) {
            revealScratchCard(scratchCtx, scratchCanvas);
        }
    }
}
function revealScratchCard(scratchCtx, scratchCanvas) {
    scratchCard.isRevealed = true;
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    const res = document.getElementById('scratchResult');
    if (scratchCard.prize > 0) {
        res.textContent = `You won $${scratchCard.prize.toFixed(2)}!`;
        res.classList.add('text-green-400');
        balance += scratchCard.prize;
    } else {
        res.textContent = 'You won $0.00.';
        res.classList.add('text-red-500');
    }
    updateBalanceDisplay();
    document.getElementById('buyScratchButton').disabled = false;
    setTimeout(() => {
        document.getElementById('scratchPrize').classList.add('hidden');
        scratchCanvas.classList.add('hidden');
        document.getElementById('scratchInstructions').classList.remove('hidden');
        if (res) {
            res.textContent = '';
            res.classList.remove('text-green-400', 'text-red-500');
        }
    }, 3000);
}

// --- POKER LOGIC REMOVED ---
