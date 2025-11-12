// --- Application State ---
// Load balance from localStorage or default to 1000
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;

// --- CONSTANTS ---
// Base URL for fetching game content

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

/**
 * Updates the balance display in the header and saves to localStorage
 */
function updateBalanceDisplay() {
    balanceDisplay.textContent = balance.toFixed(2);
    localStorage.setItem('stakeishBalance', balance);
}

/**
 * Modify bet input
 * @param {string} inputId - The ID of the bet input
 * @param {number | 'max'} modifier - The value to multiply by, or 'max'
 */
function modifyBet(inputId, modifier) {
    const input = document.getElementById(inputId);
    if (!input) return; // Guard clause
    
    let currentValue = parseFloat(input.value);
    if (isNaN(currentValue)) currentValue = 0;

    if (modifier === 'max') {
        // Don't bet more than balance
        input.value = Math.max(0, Math.floor(balance));
    } else {
        let newValue = currentValue * modifier;
        if (newValue < 1 && modifier < 1) newValue = 1; // Min bet 1
        // Ensure new value is not negative
        input.value = Math.max(0, Math.floor(newValue));
    }
}
// Make modifyBet global
window.modifyBet = modifyBet;

/**
 * Shows a message to the user (e.g., for errors)
 * @param {string} message - The text to display
 * @param {string} type - 'error' (red) or 'success' (green)
 */
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
    depositAmountInput.value = "1000"; // Reset for next time
}

// --- Game Navigation Logic ---

/**
 * Loads a game's HTML into the game-area and initializes its scripts
 * @param {string} gameName - The name of the game (e.g., 'limbo')
 */
async function loadGame(gameName) {
    // Set active class on nav
    navButtons.forEach(button => {
        if (button.dataset.game === gameName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    try {
        // --- THIS IS THE UPDATED LINE ---
       const response = await fetch(`${gameName}.html`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${gameName}.html from GitHub`);
        }
        gameArea.innerHTML = await response.text();
        
        // After loading HTML, initialize the game's specific event listeners
        initGame(gameName);

    } catch (error) {
        console.error(error);
        gameArea.innerHTML = `<p class="text-2xl text-red-500">Error: Could not load game.</p>`;
    }
}

/**
 * Attaches event listeners for the currently loaded game
 * @param {string} gameName 
 */
function initGame(gameName) {
    switch (gameName) {
        case 'limbo':
            initLimbo();
            break;
        case 'blackjack':
            initBlackjack();
            break;
        case 'slots':
            initSlots();
            break;
        case 'scratch':
            initScratch();
            break;
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    // Load Limbo by default
    loadGame('limbo');

    // Modal Listeners
    walletButton.addEventListener('click', toggleModal);
    closeModal.addEventListener('click', toggleModal);
    depositButton.addEventListener('click', depositMoney);
    
    // Navigation Listeners
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const gameName = e.currentTarget.getAttribute('data-game');
            loadGame(gameName);
        });
    });
});


// ------------------------------------
// --- GAME LOGIC ---
// (This section contains all the game logic,
// which is called by initGame() after loading)
// ------------------------------------

// --- Limbo Game Logic ---

function initLimbo() {
    const playLimboButton = document.getElementById('playLimboButton');
    playLimboButton.addEventListener('click', playLimbo);
}

function getLimboCrashPoint() {
    if (Math.random() < 0.01) return '0.00';
    const houseEdgePercent = 1;
    const r = Math.random();
    const crashPoint = (100 - houseEdgePercent) / (100 - r * 100);
    const finalCrash = Math.floor(crashPoint * 100) / 100;
    return finalCrash.toFixed(2);
}

async function playLimbo() {
    const betAmountInput = document.getElementById('limboBetAmount');
    const targetMultiplierInput = document.getElementById('limboTargetMultiplier');
    const limboResult = document.getElementById('limboResult');
    const playLimboButton = document.getElementById('playLimboButton');

    const betAmount = parseFloat(betAmountInput.value);
    const targetMultiplier = parseFloat(targetMultiplierInput.value);

    if (isNaN(betAmount) || betAmount <= 0) {
        showMessage("Please enter a valid bet amount.", 'error'); return;
    }
    if (isNaN(targetMultiplier) || targetMultiplier < 1.01) {
        showMessage("Target multiplier must be at least 1.01x.", 'error'); return;
    }
    if (betAmount > balance) {
        showMessage("You do not have enough funds for this bet.", 'error'); return;
    }

    playLimboButton.disabled = true;
    balance -= betAmount;
    updateBalanceDisplay();
    
    limboResult.innerHTML = `
        <p class="text-5xl font-bold text-gray-400" id="limboCounter">1.00x</p>
        <p class="text-xl text-gray-400 mt-2">Calculating...</p>
    `;
    const limboCounter = document.getElementById('limboCounter');

    let start = Date.now();
    let duration = 1500;
    const animationInterval = setInterval(() => {
        if (Date.now() - start > duration) {
            clearInterval(animationInterval); return;
        }
        let randomMultiplier = 1 + (Math.random() * 9);
        limboCounter.textContent = `${randomMultiplier.toFixed(2)}x`;
    }, 50);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(animationInterval);

    const crashPoint = getLimboCrashPoint();
    
    if (crashPoint >= targetMultiplier) {
        const winnings = betAmount * targetMultiplier;
        balance += winnings;
        limboResult.innerHTML = `
            <p class="text-5xl font-bold text-green-400">${crashPoint}x</p>
            <p class="text-xl text-gray-200 mt-2">You won $${winnings.toFixed(2)}!</p>
        `;
    } else {
        limboResult.innerHTML = `
            <p class="text-5xl font-bold text-red-500">${crashPoint}x</p>
            <p class="text-xl text-gray-200 mt-2">You lost $${betAmount.toFixed(2)}.</p>
        `;
    }
    updateBalanceDisplay();
    playLimboButton.disabled = false;
}

// --- Slots Game Logic ---

const slotsSymbols = ['🍒', '🍋', '🍊', '🍉', '🔔', '🍀', '💎'];
const slotsPayouts = {
    '💎': { 3: 50 }, '🍀': { 3: 20 }, '🔔': { 3: 15 },
    '🍉': { 3: 10 }, '🍊': { 3: 5 }, '🍋': { 3: 3 },
    '🍒': { 3: 2, 2: 0.5 }
};

function initSlots() {
    const playSlotsButton = document.getElementById('playSlotsButton');
    playSlotsButton.addEventListener('click', playSlots);
}

function getRandomSymbol() {
    return slotsSymbols[Math.floor(Math.random() * slotsSymbols.length)];
}

async function playSlots() {
    const slotsBetAmountInput = document.getElementById('slotsBetAmount');
    const playSlotsButton = document.getElementById('playSlotsButton');
    const slotsReelsContainer = document.getElementById('slotsReels');
    const slotsResult = document.getElementById('slotsResult');

    const betAmount = parseFloat(slotsBetAmountInput.value);

    if (isNaN(betAmount) || betAmount <= 0) {
        showMessage("Please enter a valid bet amount.", 'error'); return;
    }
    if (betAmount > balance) {
        showMessage("You do not have enough funds for this bet.", 'error'); return;
    }

    playSlotsButton.disabled = true;
    balance -= betAmount;
    updateBalanceDisplay();
    slotsResult.innerHTML = '<span class="animate-pulse text-gray-400">Spinning...</span>';
    slotsResult.classList.remove('text-green-400', 'text-red-500');

    slotsReelsContainer.innerHTML = `
        <div class="reel p-4 spinning">❓</div>
        <div class="reel p-4 spinning">❓</div>
        <div class="reel p-4 spinning">❓</div>
    `;
    const reels = slotsReelsContainer.querySelectorAll('.reel');
    
    const spinInterval = setInterval(() => {
        reels.forEach(reel => {
            reel.textContent = getRandomSymbol();
        });
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 1500));

    clearInterval(spinInterval);

    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    slotsReelsContainer.innerHTML = finalReels.map(symbol => 
        `<div class="reel p-4">${symbol}</div>`
    ).join('');

    let winnings = 0;
    const counts = {};
    finalReels.forEach(symbol => { counts[symbol] = (counts[symbol] || 0) + 1; });

    if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        const symbol = finalReels[0];
        if (slotsPayouts[symbol] && slotsPayouts[symbol][3]) {
            winnings = betAmount * slotsPayouts[symbol][3];
        }
    } else if (counts['🍒'] === 2) {
         if (slotsPayouts['🍒'] && slotsPayouts['🍒'][2]) {
            winnings = betAmount * slotsPayouts['🍒'][2];
         }
    }

    if (winnings > 0) {
        balance += winnings;
        slotsResult.textContent = `You won $${winnings.toFixed(2)}!`;
        slotsResult.classList.add('text-green-400');
    } else {
        slotsResult.textContent = `You lost $${betAmount.toFixed(2)}.`;
        slotsResult.classList.add('text-red-500');
    }
    updateBalanceDisplay();
    playSlotsButton.disabled = false;
}

// --- Blackjack Game Logic ---

const bjState = {
    deck: [], playerHands: [], dealerHand: [],
    bet: 0, activeHandIndex: 0, status: 'betting',
};
const SUITS = ['♥', '♦', '♠', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function initBlackjack() {
    document.getElementById('blackjackDealButton').addEventListener('click', dealBlackjack);
    document.getElementById('blackjackHit').addEventListener('click', blackjackHit);
    document.getElementById('blackjackStand').addEventListener('click', blackjackStand);
    document.getElementById('blackjackDouble').addEventListener('click', blackjackDouble);
    document.getElementById('blackjackSplit').addEventListener('click', blackjackSplit);
}

function createCardElement(card) {
    const cardEl = document.createElement('div');
    const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    cardEl.className = `card ${color}`;
    
    if (card.hidden) {
        cardEl.classList.add('card-back');
        cardEl.innerHTML = `
            <span class="card-suit-top"></span><span></span><span class="card-suit-bottom"></span>
        `;
    } else {
        cardEl.innerHTML = `
            <span class="card-suit-top">${card.rank}${card.suit}</span>
            <span>${card.suit}</span>
            <span class="card-suit-bottom">${card.rank}${card.suit}</span>
        `;
    }
    return cardEl;
}

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            let value = parseInt(rank);
            if (['J', 'Q', 'K'].includes(rank)) value = 10;
            if (rank === 'A') value = 11;
            deck.push({ suit, rank, value });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateHandValue(hand) {
    let value = hand.reduce((acc, card) => acc + card.value, 0);
    let aces = hand.filter(card => card.rank === 'A').length;
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

function renderHand(hand, element, scoreElement) {
    element.innerHTML = '';
    hand.forEach(card => element.appendChild(createCardElement(card)));
    
    let score = calculateHandValue(hand);
    let scoreText = score;
    if (hand.some(c => c.rank === 'A' && score + 10 <= 21)) {
         if (calculateHandValue(hand.filter(c => !c.hidden)) !== 21) {
            scoreText = `${score} / ${score - 10}`;
         }
    }
    if (hand.some(c => c.hidden)) {
        scoreText = `?`;
    }
    scoreElement.textContent = `Score: ${scoreText}`;
}

function updateBlackjackButtons() {
    const hand = bjState.playerHands[bjState.activeHandIndex];
    document.getElementById('blackjackDouble').disabled = !(hand.length === 2 && balance >= bjState.bet);
    document.getElementById('blackjackSplit').disabled = !(hand.length === 2 && hand[0].value === hand[1].value && balance >= bjState.bet);
    document.getElementById('blackjackHit').disabled = false;
    document.getElementById('blackjackStand').disabled = false;
}

async function dealBlackjack() {
    const betAmount = parseFloat(document.getElementById('blackjackBetAmount').value);
    if (isNaN(betAmount) || betAmount <= 0) {
        showMessage("Please enter a valid bet amount.", 'error'); return;
    }
    if (betAmount > balance) {
        showMessage("You do not have enough funds for this bet.", 'error'); return;
    }

    balance -= betAmount;
    updateBalanceDisplay();

    bjState.bet = betAmount;
    bjState.deck = createDeck();
    bjState.dealerHand = [bjState.deck.pop(), { ...bjState.deck.pop(), hidden: true }];
    bjState.playerHands = [[bjState.deck.pop(), bjState.deck.pop()]];
    bjState.activeHandIndex = 0;
    bjState.status = 'playing';

    document.getElementById('blackjackResult').textContent = '';
    document.getElementById('blackjackBetControls').classList.add('hidden');
    document.getElementById('blackjackActionControls').classList.remove('hidden');

    renderHand(bjState.dealerHand, document.getElementById('blackjackDealerHand'), document.getElementById('blackjackDealerScore'));
    renderHand(bjState.playerHands[0], document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
    
    updateBlackjackButtons();

    const playerValue = calculateHandValue(bjState.playerHands[0]);
    const dealerValue = calculateHandValue(bjState.dealerHand);

    if (playerValue === 21) {
        if (dealerValue === 21) {
            bjState.status = 'finished';
            document.getElementById('blackjackResult').textContent = 'Push! (Both have Blackjack)';
            balance += bjState.bet;
            revealDealerHand();
        } else {
            bjState.status = 'finished';
            document.getElementById('blackjackResult').textContent = 'Blackjack! You win 1.5x!';
            balance += bjState.bet * 2.5;
            revealDealerHand();
        }
        endBlackjackRound();
    } else if (dealerValue === 21) {
        bjState.status = 'finished';
        document.getElementById('blackjackResult').textContent = 'Dealer has Blackjack. You lose.';
        revealDealerHand();
        endBlackjackRound();
    }
}

function blackjackHit() {
    const hand = bjState.playerHands[bjState.activeHandIndex];
    hand.push(bjState.deck.pop());
    renderHand(hand, document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
    
    if (calculateHandValue(hand) > 21) {
        document.getElementById('blackjackResult').textContent = `Hand ${bjState.activeHandIndex + 1} Busts!`;
        playNextHandOrDealer();
    }
    
    document.getElementById('blackjackDouble').disabled = true;
    document.getElementById('blackjackSplit').disabled = true;
}

function blackjackStand() {
    playNextHandOrDealer();
}

function blackjackDouble() {
    if (balance < bjState.bet) {
        showMessage("Not enough funds to double down.", 'error'); return;
    }
    
    balance -= bjState.bet;
    bjState.bet *= 2;
    updateBalanceDisplay();
    
    const hand = bjState.playerHands[bjState.activeHandIndex];
    hand.push(bjState.deck.pop());
    renderHand(hand, document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
    
    playNextHandOrDealer();
}

function blackjackSplit() {
    if (balance < bjState.bet) {
        showMessage("Not enough funds to split.", 'error'); return;
    }
    
    balance -= bjState.bet;
    updateBalanceDisplay();
    
    const hand = bjState.playerHands[bjState.activeHandIndex];
    const newHand = [hand.pop()];
    hand.push(bjState.deck.pop());
    newHand.push(bjState.deck.pop());
    
    bjState.playerHands.splice(bjState.activeHandIndex + 1, 0, newHand);
    renderHand(bjState.playerHands[bjState.activeHandIndex], document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
    updateBlackjackButtons();
}

function playNextHandOrDealer() {
    if (bjState.activeHandIndex < bjState.playerHands.length - 1) {
        bjState.activeHandIndex++;
        document.getElementById('blackjackResult').textContent = `Playing Hand ${bjState.activeHandIndex + 1}...`;
        renderHand(bjState.playerHands[bjState.activeHandIndex], document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
        updateBlackjackButtons();
    } else {
        bjState.status = 'dealer';
        document.getElementById('blackjackActionControls').classList.add('hidden');
        dealerTurn();
    }
}

function revealDealerHand() {
    bjState.dealerHand.forEach(card => card.hidden = false);
    renderHand(bjState.dealerHand, document.getElementById('blackjackDealerHand'), document.getElementById('blackjackDealerScore'));
}

async function dealerTurn() {
    revealDealerHand();
    let dealerValue = calculateHandValue(bjState.dealerHand);
    
    while (dealerValue < 17) {
        await new Promise(resolve => setTimeout(resolve, 500));
        bjState.dealerHand.push(bjState.deck.pop());
        renderHand(bjState.dealerHand, document.getElementById('blackjackDealerHand'), document.getElementById('blackjackDealerScore'));
        dealerValue = calculateHandValue(bjState.dealerHand);
    }
    determineWinner();
}

function determineWinner() {
    const dealerValue = calculateHandValue(bjState.dealerHand);
    let totalWinnings = 0;
    let resultMessages = [];

    bjState.playerHands.forEach((hand, index) => {
        const playerValue = calculateHandValue(hand);
        const handBet = bjState.bet / bjState.playerHands.length;
        
        let msg = `Hand ${index + 1}: `;
        if (playerValue > 21) msg += "Bust! You lose.";
        else if (dealerValue > 21) { msg += "Dealer Busts! You win!"; totalWinnings += handBet * 2; }
        else if (playerValue > dealerValue) { msg += "You win!"; totalWinnings += handBet * 2; }
        else if (playerValue < dealerValue) msg += "You lose.";
        else { msg += "Push!"; totalWinnings += handBet; }
        resultMessages.push(msg);
    });
    
    document.getElementById('blackjackResult').innerHTML = resultMessages.join('<br>');
    balance += totalWinnings;
    updateBalanceDisplay();
    endBlackjackRound();
}

function endBlackjackRound() {
    document.getElementById('blackjackBetControls').classList.remove('hidden');
    document.getElementById('blackjackActionControls').classList.add('hidden');
    bjState.status = 'betting';
}

// --- Scratch Off Logic ---

let scratchCard = { prize: 0, bet: 0, isRevealed: false };
let isScratching = false;

function initScratch() {
    const buyScratchButton = document.getElementById('buyScratchButton');
    const scratchCanvas = document.getElementById('scratchCanvas');

    buyScratchButton.addEventListener('click', buyScratchTicket);
    
    // Need to get context *after* canvas is in DOM
    const scratchCtx = scratchCanvas.getContext('2d');

    // Attach all canvas listeners
    scratchCanvas.addEventListener('mousedown', (e) => { isScratching = true; scratch(e, scratchCtx, scratchCanvas); });
    scratchCanvas.addEventListener('mousemove', (e) => scratch(e, scratchCtx, scratchCanvas));
    scratchCanvas.addEventListener('mouseup', () => stopScratching(scratchCtx, scratchCanvas));
    scratchCanvas.addEventListener('mouseout', () => stopScratching(scratchCtx, scratchCanvas));
    scratchCanvas.addEventListener('touchstart', (e) => { isScratching = true; scratch(e, scratchCtx, scratchCanvas); }, { passive: false });
    scratchCanvas.addEventListener('touchmove', (e) => scratch(e, scratchCtx, scratchCanvas), { passive: false });
    scratchCanvas.addEventListener('touchend', () => stopScratching(scratchCtx, scratchCanvas));
    scratchCanvas.addEventListener('touchcancel', () => stopScratching(scratchCtx, scratchCanvas));
}

function buyScratchTicket() {
    const scratchBetAmountInput = document.getElementById('scratchBetAmount');
    const betAmount = parseFloat(scratchBetAmountInput.value);
    
    if (isNaN(betAmount) || betAmount <= 0) {
        showMessage("Please enter a valid ticket price.", 'error'); return;
    }
    if (betAmount > balance) {
        showMessage("You do not have enough funds for this ticket.", 'error'); return;
    }

    balance -= betAmount;
    updateBalanceDisplay();
    
    document.getElementById('buyScratchButton').disabled = true;
    document.getElementById('scratchResult').textContent = '';
    document.getElementById('scratchInstructions').classList.add('hidden');

    const r = Math.random();
    let prize = 0;
    if (r < 0.1) prize = betAmount * 10;
    else if (r < 0.25) prize = betAmount * 2;
    else if (r < 0.5) prize = betAmount * 1;
    
    scratchCard.prize = prize;
    scratchCard.bet = betAmount;
    scratchCard.isRevealed = false;
    
    document.getElementById('scratchPrize').textContent = `$${prize.toFixed(2)}`;
    document.getElementById('scratchPrize').classList.remove('hidden');

    const scratchCanvas = document.getElementById('scratchCanvas');
    const scratchCtx = scratchCanvas.getContext('2d');
    scratchCanvas.classList.remove('hidden');
    scratchCtx.globalCompositeOperation = 'source-over';
    scratchCtx.fillStyle = '#3a5063';
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
}

function scratch(e, scratchCtx, scratchCanvas) {
    if (!isScratching || scratchCard.isRevealed) return;

    e.preventDefault();
    const rect = scratchCanvas.getBoundingClientRect();
    const scaleX = scratchCanvas.width / rect.width;
    const scaleY = scratchCanvas.height / rect.height;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, 15, 0, 2 * Math.PI);
    scratchCtx.fill();
}

function stopScratching(scratchCtx, scratchCanvas) {
    isScratching = false;
    
    if (!scratchCard.isRevealed) {
        const pixelData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
        let transparentPixels = 0;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] === 0) transparentPixels++;
        }
        
        if ((transparentPixels / (scratchCanvas.width * scratchCanvas.height)) > 0.7) {
            revealScratchCard(scratchCtx, scratchCanvas);
        }
    }
}

function revealScratchCard(scratchCtx, scratchCanvas) {
    scratchCard.isRevealed = true;
    
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    
    const scratchResult = document.getElementById('scratchResult');
    if (scratchCard.prize > 0) {
        scratchResult.textContent = `You won $${scratchCard.prize.toFixed(2)}!`;
        scratchResult.classList.add('text-green-400');
        balance += scratchCard.prize;
    } else {
        scratchResult.textContent = 'You won $0.00.';
        scratchResult.classList.add('text-red-500');
    }
    
    updateBalanceDisplay();
    document.getElementById('buyScratchButton').disabled = false;
    
    setTimeout(() => {
        document.getElementById('scratchPrize').classList.add('hidden');
        scratchCanvas.classList.add('hidden');
        document.getElementById('scratchInstructions').classList.remove('hidden');
        scratchResult.textContent = '';
        scratchResult.classList.remove('text-green-400', 'text-red-500');
    }, 3000);
}
