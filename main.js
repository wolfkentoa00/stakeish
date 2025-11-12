import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, runTransaction, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Application State ---
// Load balance from localStorage or default to 1000
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;

// --- CONSTANTS ---
// No more GITHUB_BASE_URL, assuming all files are local
// const GITHUB_BASE_URL = "."; // Files are in the same folder

// --- DOM Elements (Global) ---
let balanceDisplay, walletButton, depositModal, closeModal, depositButton, depositAmountInput;
let navButtons, gameArea, messageBox, messageText;

// --- Utility Functions (Global) ---

/**
 * Updates the balance display in the header and saves to localStorage
 */
function updateBalanceDisplay() {
    if (!balanceDisplay) balanceDisplay = document.getElementById('balanceDisplay');
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
    if (!messageBox) messageBox = document.getElementById('messageBox');
    if (!messageText) messageText = document.getElementById('messageText');
    
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

// --- Modal Logic ---

function toggleModal() {
    if (!depositModal) depositModal = document.getElementById('depositModal');
    depositModal.classList.toggle('hidden');
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
    depositAmountInput.value = "1000"; // Reset for next time
}

// --- Game Navigation Logic ---

/**
 * Loads a game's HTML into the game-area and initializes its scripts
 * @param {string} gameName - The name of the game (e.g., 'limbo')
 */
async function loadGame(gameName) {
    // Set active class on nav
    if (!navButtons) navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(button => {
        if (button.dataset.game === gameName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    try {
        // --- THIS IS THE UPDATED LINE ---
        // It now fetches from the root of the site.
        const response = await fetch(`${gameName}.html`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${gameName}.html`);
        }
        if (!gameArea) gameArea = document.getElementById('game-area');
        gameArea.innerHTML = await response.text();
        
        // After loading HTML, initialize the game's specific event listeners
        initGame(gameName);

    } catch (error) {
        console.error(error);
        if (!gameArea) gameArea = document.getElementById('game-area');
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
        // ADDED: Poker case
        case 'poker':
            initPoker();
            break;
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialize global DOM elements
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
    if (playLimboButton) {
        playLimboButton.addEventListener('click', playLimbo);
    }
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
        if (limboCounter) limboCounter.textContent = `${randomMultiplier.toFixed(2)}x`;
    }, 50);

    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(animationInterval);

    const crashPoint = getLimboCrashPoint();
    
    if (parseFloat(crashPoint) >= targetMultiplier) {
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
    if (playSlotsButton) {
        playSlotsButton.addEventListener('click', playSlots);
    }
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
const BJ_SUITS = ['♥', '♦', '♠', '♣'];
const BJ_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function initBlackjack() {
    const dealButton = document.getElementById('blackjackDealButton');
    if (dealButton) {
        dealButton.addEventListener('click', dealBlackjack);
        document.getElementById('blackjackHit').addEventListener('click', blackjackHit);
        document.getElementById('blackjackStand').addEventListener('click', blackjackStand);
        document.getElementById('blackjackDouble').addEventListener('click', blackjackDouble);
        document.getElementById('blackjackSplit').addEventListener('click', blackjackSplit);
    }
}

function createCardElement(card) {
    const cardEl = document.createElement('div');
    const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    cardEl.className = `card ${color}`;
    
    if (card.hidden) {
        cardEl.classList.add('card-back');
        cardEl.innerHTML = ``;
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
    for (const suit of BJ_SUITS) {
        for (const rank of BJ_RANKS) {
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
    let value = hand.reduce((acc, card) => acc + (card.hidden ? 0 : card.value), 0);
    let aces = hand.filter(card => card.rank === 'A' && !card.hidden).length;
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

    if (hand.some(c => c.rank === 'A' && !c.hidden) && score + 10 <= 21) {
        scoreText = `${score} / ${score + 10}`;
    }
    
    if (hand.some(c => c.hidden)) {
        score = calculateHandValue(hand.filter(c => !c.hidden));
        scoreText = `${score}`;
    }
    
    scoreElement.textContent = `Score: ${scoreText}`;
}


function updateBlackjackButtons() {
    const hand = bjState.playerHands[bjState.activeHandIndex];
    const canAfford = balance >= bjState.bet;
    document.getElementById('blackjackDouble').disabled = !(hand.length === 2 && canAfford);
    document.getElementById('blackjackSplit').disabled = !(hand.length === 2 && hand[0].value === hand[1].value && canAfford);
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
    
    if (playerValue === 21) {
        revealDealerHand();
        const dealerValue = calculateHandValue(bjState.dealerHand);
        if (dealerValue === 21) {
            document.getElementById('blackjackResult').textContent = 'Push! (Both have Blackjack)';
            balance += bjState.bet;
        } else {
            document.getElementById('blackjackResult').textContent = 'Blackjack! You win 1.5x!';
            balance += bjState.bet * 2.5;
        }
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
    bjState.bet *= 2; // This doubles the original bet
    updateBalanceDisplay();
    
    const hand = bjState.playerHands[bjState.activeHandIndex];
    hand.push(bjState.deck.pop());
    renderHand(hand, document.getElementById('blackjackPlayerHand'), document.getElementById('blackjackPlayerScore'));
    
    playNextHandOrDealer();
}

function blackjackSplit() {
    const hand = bjState.playerHands[bjState.activeHandIndex];
    if (balance < bjState.bet) {
        showMessage("Not enough funds to split.", 'error'); return;
    }
    
    balance -= bjState.bet;
    updateBalanceDisplay();
    
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
        // Calculate bet per hand. If doubled, it's 2x, split is 1x.
        const handBet = bjState.bet / (bjState.playerHands.length); // Simplified bet
        
        let msg = `Hand ${index + 1}: `;
        if (playerValue > 21) {
            msg += "Bust! You lose.";
        }
        else if (dealerValue > 21) { 
            msg += "Dealer Busts! You win!"; 
            totalWinnings += handBet * 2; 
        }
        else if (playerValue > dealerValue) { 
            msg += "You win!"; 
            totalWinnings += handBet * 2; 
        }
        else if (playerValue < dealerValue) {
            msg += "You lose.";
        }
        else { 
            msg += "Push!"; 
            totalWinnings += handBet; 
        }
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

    if (buyScratchButton) {
        buyScratchButton.addEventListener('click', buyScratchTicket);
    }
    
    if (scratchCanvas) {
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
    
    const prizeEl = document.getElementById('scratchPrize');
    prizeEl.textContent = `$${prize.toFixed(2)}`;
    prizeEl.classList.remove('hidden');

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
    if (!isScratching) return;
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


// ------------------------------------
// --- POKER LOGIC ---
// ------------------------------------

// Global firebase variables
let fbApp;
let fbAuth;
let fbDb;
let fbUser = null;
let fbGameUnsubscribe = null; // To stop listening to game updates
let fbGameId = null; // The ID of the game we are in
let fbPlayerId = null; // Our own user ID
let fbTurnTimer = null; // JS Timeout for the 30-second timer

// --- Hand Ranking Constants ---
const POKER_SUITS = ['s', 'h', 'd', 'c']; // spades, hearts, diamonds, clubs
const POKER_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const HAND_TYPES = {
  HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3,
  STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8, ROYAL_FLUSH: 9
};

// --- initPoker: Main setup function ---
async function initPoker() {
    // 1. Check if Firebase is available (loaded from index.html)
    // REMOVED the "typeof firebase" check, as it's no longer valid.
    
    // 2. Initialize Firebase
    // We can use the functions directly since we imported them at the top of the file.
    
    // Config values from prompt
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    if (!firebaseConfig.apiKey) {
        showMessage("Firebase config missing. Poker is unavailable.", 'error');
        // ADDED return here
        return;
    }

    fbApp = initializeApp(firebaseConfig);
    fbAuth = getAuth(fbApp);
    fbDb = getFirestore(fbApp);

    // 3. Authenticate User
    onAuthStateChanged(fbAuth, (user) => {
        if (user) {
            fbUser = user;
            fbPlayerId = user.uid;
            document.getElementById('pokerUserId').textContent = fbPlayerId;
        }
    });

    try {
        await signInAnonymously(fbAuth);
    } catch (error) {
        console.error("Firebase sign-in failed:", error);
        showMessage("Firebase sign-in failed. Cannot play poker.", 'error');
        return;
    }

    // 4. Attach Lobby Event Listeners
    document.getElementById('pokerCreateButton').addEventListener('click', pokerCreateGame);
    document.getElementById('pokerJoinButton').addEventListener('click', pokerJoinGame);
    document.getElementById('pokerLeaveButton').addEventListener('click', pokerLeaveGame);
}

// --- Poker Lobby Functions ---

async function pokerCreateGame() {
    if (balance < 1000) {
        showMessage("You need $1000 to buy-in.", 'error');
        return;
    }
    balance -= 1000;
    updateBalanceDisplay();

    // REMOVED: const { doc, setDoc, collection } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Generate a 6-char random game ID
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, gameId);
    
    const player = createNewPlayer(fbPlayerId, 1000);
    const newGame = {
        gameId: gameId,
        players: { [fbPlayerId]: player }, // Player map
        playerOrder: [fbPlayerId], // To track turns
        seats: { [fbPlayerId]: 0 }, // Map playerId to seat index
        status: 'waiting', // 'waiting', 'playing', 'showdown'
        pot: 0,
        communityCards: [],
        currentTurn: null, // PlayerId
        currentBet: 0,
        bigBlind: 20,
        smallBlind: 10,
        dealer: null, // PlayerId
        lastActionTime: Date.now(),
        log: [`Game ${gameId} created by ${fbPlayerId}.`]
    };

    try {
        await setDoc(gameRef, newGame);
        fbGameId = gameId;
        subscribeToGame(gameId);
        showPokerTable(true);
    } catch (error) {
        console.error("Error creating game:", error);
        showMessage("Could not create game. Please try again.", 'error');
        balance += 1000; // Refund
        updateBalanceDisplay();
    }
}

async function pokerJoinGame() {
    // REMOVED: const { doc, getDoc, updateDoc } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const gameId = document.getElementById('pokerJoinCode').value.toUpperCase();
    if (gameId.length !== 6) {
        showMessage("Invalid game code.", 'error');
        return;
    }
    
    if (balance < 1000) {
        showMessage("You need $1000 to buy-in.", 'error');
        return;
    }

    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, gameId);
    
    try {
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            showMessage("Game not found.", 'error');
            return;
        }

        let gameData = gameSnap.data();
        if (gameData.playerOrder.length >= 6) {
            showMessage("Game is full.", 'error');
            return;
        }
        if (gameData.players[fbPlayerId]) {
            // Already in game, just reconnecting
        } else {
            balance -= 1000;
            updateBalanceDisplay();
            
            const player = createNewPlayer(fbPlayerId, 1000);
            
            // Find an open seat
            const occupiedSeats = Object.values(gameData.seats);
            let seatIndex = 0;
            for (let i = 0; i < 6; i++) {
                if (!occupiedSeats.includes(i)) {
                    seatIndex = i;
                    break;
                }
            }
            
            await updateDoc(gameRef, {
                [`players.${fbPlayerId}`]: player,
                [`seats.${fbPlayerId}`]: seatIndex,
                playerOrder: [...gameData.playerOrder, fbPlayerId],
                log: [...gameData.log, `${fbPlayerId} joined the game.`]
            });
        }
        
        fbGameId = gameId;
        subscribeToGame(gameId);
        showPokerTable(true);

    } catch (error) {
        console.error("Error joining game:", error);
        showMessage("Could not join game. " + error.message, 'error');
    }
}

function createNewPlayer(id, chips) {
    return {
        id: id,
        chips: chips,
        cards: [], // ['As', 'Kh']
        currentBet: 0,
        status: 'active', // 'active', 'folded', 'all-in', 'out'
        lastAction: null // 'check', 'bet', 'raise', 'fold'
    };
}

function showPokerTable(show) {
    document.getElementById('pokerLobby').classList.toggle('hidden', show);
    document.getElementById('pokerTable').classList.toggle('hidden', !show);
    if (show) {
        document.getElementById('pokerGameCode').textContent = fbGameId;
    }
}

async function pokerLeaveGame() {
    // REMOVED: const { doc, runTransaction } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    if (fbGameUnsubscribe) fbGameUnsubscribe(); // Stop listening
    fbGameUnsubscribe = null;

    if (!fbGameId || !fbPlayerId) {
        showPokerTable(false);
        return;
    }
    
    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, fbGameId);
    
    try {
        await runTransaction(fbDb, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) return;
            
            let gameData = gameSnap.data();
            let player = gameData.players[fbPlayerId];
            
            if (player) {
                // Refund chips to balance
                balance += player.chips;
                updateBalanceDisplay();
            }

            // Remove player from game
            delete gameData.players[fbPlayerId];
            delete gameData.seats[fbPlayerId];
            gameData.playerOrder = gameData.playerOrder.filter(id => id !== fbPlayerId);
            gameData.log = [...gameData.log, `${fbPlayerId} left the game.`];
            
            // If last player leaves, delete game
            if (gameData.playerOrder.length === 0) {
                transaction.delete(gameRef);
            } else {
                // If it was their turn, advance turn
                if (gameData.currentTurn === fbPlayerId) {
                    gameData = advanceTurn(gameData);
                }
                transaction.set(gameRef, gameData);
            }
        });
    } catch (error) {
        console.error("Error leaving game:", error);
        // Still leave UI
    }
    
    fbGameId = null;
    showPokerTable(false);
}

// --- Poker Real-Time Functions ---

function subscribeToGame(gameId) {
    // REMOVED: const { doc, onSnapshot } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, gameId);
    fbGameUnsubscribe = onSnapshot(gameRef, (docSnap) => {
        if (!docSnap.exists()) {
            // Game was deleted (e.g., last player left)
            showMessage("Game " + gameId + " has ended.", 'success');
            pokerLeaveGame(); // This will clean up and exit
            return;
        }
        
        const gameData = docSnap.data();
        renderPokerGame(gameData); // Update UI
        checkGameLogic(gameData); // Check if we need to advance state
    });
}

/**
 * Main render function. Updates the UI based on gameData from Firestore.
 */
function renderPokerGame(gameData) {
    const { players, seats, status, pot, communityCards, currentTurn } = gameData;
    
    // Find our own seat
    const mySeatIndex = seats[fbPlayerId];
    
    // Render Pot and Community Cards
    document.getElementById('pokerPot').textContent = `Pot: $${pot}`;
    const commCardDiv = document.getElementById('pokerCommunityCards');
    commCardDiv.innerHTML = '';
    communityCards.forEach(cardStr => {
        commCardDiv.appendChild(renderPokerCard(cardStr));
    });
    
    // Clear all seats
    for (let i = 0; i < 6; i++) {
        const seatEl = document.getElementById(`seat-${i}`);
        seatEl.innerHTML = '';
        seatEl.className = 'poker-seat'; // Reset classes
    }

    // Render each player in their correct seat
    for (const playerId in players) {
        const player = players[playerId];
        const seatIndex = seats[playerId];
        
        // Relativize seat index to player's view
        // 0 is always us, 1 is next, etc.
        let relativeSeat = (seatIndex - mySeatIndex + 6) % 6;
        const seatEl = document.getElementById(`seat-${relativeSeat}`);
        
        seatEl.innerHTML = `
            <div class="seat-name">${playerId.substring(0, 6)}...</div>
            <div class="seat-chips">$${player.chips}</div>
            <div class="seat-cards">
                ${renderPlayerCards(player)}
            </div>
            <div class="seat-bet">${player.currentBet > 0 ? `$${player.currentBet}` : ''}</div>
        `;
        
        // Add status classes
        if (player.status === 'folded') seatEl.classList.add('folded');
        if (playerId === currentTurn) seatEl.classList.add('active-turn');
    }
    
    // Render Controls
    renderActionControls(gameData);
}

function renderPlayerCards(player) {
    // We are this player, show our cards
    if (player.id === fbPlayerId) {
        if (player.cards.length === 0) return '';
        return `
            ${renderPokerCard(player.cards[0]).outerHTML}
            ${renderPokerCard(player.cards[1]).outerHTML}
        `;
    }
    // Opponent, show card backs if they have cards
    if (player.status !== 'folded' && player.cards.length > 0) {
        return `
            <div class="poker-card-back"></div>
            <div class="poker-card-back"></div>
        `;
    }
    return ''; // No cards / folded
}

function renderPokerCard(cardStr) { // e.g., "As", "Th", "2c"
    const rank = cardStr[0];
    const suit = cardStr[1];
    const suitChar = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' }[suit];
    const color = (suit === 'h' || suit === 'd') ? 'red' : 'black';
    
    const cardEl = document.createElement('div');
    cardEl.className = `poker-card ${color}`;
    cardEl.innerHTML = `
        <span class="card-rank">${rank}</span>
        <span class="card-suit">${suitChar}</span>
    `;
    return cardEl;
}

function renderActionControls(gameData) {
    const { players, currentTurn, currentBet } = gameData;
    const controls = document.getElementById('pokerActionControls');
    const timer = document.getElementById('pokerTimer');

    // Not our turn
    if (currentTurn !== fbPlayerId) {
        controls.classList.add('hidden');
        timer.classList.add('hidden');
        if (fbTurnTimer) clearTimeout(fbTurnTimer);
        return;
    }
    
    // It's our turn!
    controls.classList.remove('hidden');
    timer.classList.remove('hidden');

    const player = players[fbPlayerId];
    const callAmount = currentBet - player.currentBet;
    
    document.getElementById('pokerCall').textContent = callAmount > 0 ? `Call $${callAmount}` : 'Check';
    document.getElementById('pokerCheck').style.display = callAmount > 0 ? 'none' : 'inline-block';
    document.getElementById('pokerCall').style.display = callAmount > 0 ? 'inline-block' : 'none';

    // Slider logic
    const raiseSlider = document.getElementById('pokerRaiseSlider');
    const raiseButton = document.getElementById('pokerRaise');
    const minRaise = currentBet + (currentBet - (gameData.lastRaise || gameData.bigBlind));
    const maxRaise = player.chips;
    
    raiseSlider.min = Math.min(minRaise, maxRaise);
    raiseSlider.max = maxRaise;
    raiseSlider.value = raiseSlider.min;
    raiseButton.textContent = `Raise to $${raiseSlider.min}`;
    
    raiseSlider.oninput = () => {
        raiseButton.textContent = `Raise to $${raiseSlider.value}`;
    };
    
    // Detach old listeners
    document.getElementById('pokerFold').onclick = () => pokerAct('fold', gameData);
    document.getElementById('pokerCheck').onclick = () => pokerAct('check', gameData);
    document.getElementById('pokerCall').onclick = () => pokerAct('call', gameData);
    document.getElementById('pokerRaise').onclick = () => {
        pokerAct('raise', gameData, parseInt(raiseSlider.value));
    };

    // Start 30-second timer
    if (fbTurnTimer) clearTimeout(fbTurnTimer);
    const timerBar = document.getElementById('pokerTimerBar');
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    
    // Force a reflow
    timerBar.getBoundingClientRect(); 
    
    timerBar.style.transition = 'width 30s linear';
    timerBar.style.width = '0%';

    fbTurnTimer = setTimeout(() => {
        // Auto-fold if timer runs out
        showMessage("Time's up! Auto-folding.", 'error');
        pokerAct('fold', gameData);
    }, 30000);
}

/**
 * This function is run by every client to check if the game state
 * needs to be advanced (e.g., deal flop, new hand).
 * Only the "dealer" (or host) will perform the action.
 */
async function checkGameLogic(gameData) {
    // REMOVED: const { doc, updateDoc } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, gameData.gameId);

    // Only one player (dealer) should manage game state
    // We'll use the dealer, or first player in list if no dealer
    const hostId = gameData.dealer || gameData.playerOrder[0];
    if (hostId !== fbPlayerId) return; // Not our job
    
    // 1. Start game if waiting and 2+ players
    if (gameData.status === 'waiting' && gameData.playerOrder.length >= 2) {
        let newGame = beginHand(gameData);
        await updateDoc(gameRef, newGame);
        return;
    }
    
    // 2. Check if betting round is over
    if (gameData.status === 'playing' && gameData.currentTurn === null) {
        // Everyone has acted, time to advance
        let newGame = advanceBettingRound(gameData);
        await updateDoc(gameRef, newGame);
        return;
    }
    
    // 3. Check if hand is over
    if (gameData.status === 'showdown') {
        // Calculate winner, award pot, and start next hand
        await new Promise(r => setTimeout(r, 4000)); // Pause for drama
        let newGame = calculateShowdown(gameData);
        newGame = beginHand(newGame); // Start next hand
        await updateDoc(gameRef, newGame);
    }
}

// --- Poker Player Actions ---

async function pokerAct(action, gameData, amount = 0) {
    // REMOVED: const { doc, updateDoc } = firebase.firestore;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const gameRef = doc(fbDb, `artifacts/${appId}/public/data/poker`, gameData.gameId);

    if (gameData.currentTurn !== fbPlayerId) return; // Not our turn

    if (fbTurnTimer) clearTimeout(fbTurnTimer); // Stop timer
    
    let player = gameData.players[fbPlayerId];
    let pot = gameData.pot;
    let currentBet = gameData.currentBet;
    let log = gameData.log;
    
    let chipsToBet = 0;
    
    if (action === 'fold') {
        player.status = 'folded';
        log.push(`${player.id} folds.`);
    } 
    else if (action === 'check') {
        player.lastAction = 'check';
        log.push(`${player.id} checks.`);
    }
    else if (action === 'call') {
        chipsToBet = currentBet - player.currentBet;
        if (chipsToBet > player.chips) { // All-in
            chipsToBet = player.chips;
            player.status = 'all-in';
        }
        player.chips -= chipsToBet;
        player.currentBet += chipsToBet;
        pot += chipsToBet;
        player.lastAction = 'call';
        log.push(`${player.id} calls $${chipsToBet}.`);
    }
    else if (action === 'raise') {
        chipsToBet = amount - player.currentBet;
        if (amount >= player.chips) { // All-in
            chipsToBet = player.chips;
            amount = player.chips + player.currentBet;
            player.status = 'all-in';
        }
        player.chips -= chipsToBet;
        player.currentBet += chipsToBet;
        pot += chipsToBet;
        currentBet = player.currentBet; // New high bet
        gameData.lastRaise = amount; // Store new raise amount
        player.lastAction = 'raise';
        log.push(`${player.id} raises to $${amount}.`);
    }

    // Update player and game
    gameData.players[fbPlayerId] = player;
    gameData.pot = pot;
    gameData.currentBet = currentBet;
    gameData.log = log;

    // Advance turn
    gameData = advanceTurn(gameData);
    
    // Commit update
    await updateDoc(gameRef, gameData);
}

// --- Poker Game Engine (State Machine) ---
// These functions are run by the "host" client

function beginHand(gameData) {
    // Reset players, get new dealer
    let newDealerIndex = (gameData.playerOrder.indexOf(gameData.dealer) + 1) % gameData.playerOrder.length;
    gameData.dealer = gameData.playerOrder[newDealerIndex];
    
    let deck = getPokerDeck();
    
    gameData.pot = 0;
    gameData.communityCards = [];
    gameData.currentBet = gameData.bigBlind;
    
    // Reset all players
    for (const id of gameData.playerOrder) {
        let p = gameData.players[id];
        if (p.chips > 0) {
            p.status = 'active';
            p.cards = [deck.pop(), deck.pop()];
            p.currentBet = 0;
            p.lastAction = null;
        } else {
            p.status = 'out';
        }
    }
    
    // Post blinds
    let sbIndex = (newDealerIndex + 1) % gameData.playerOrder.length;
    let bbIndex = (newDealerIndex + 2) % gameData.playerOrder.length;
    
    let sbPlayer = gameData.players[gameData.playerOrder[sbIndex]];
    let bbPlayer = gameData.players[gameData.playerOrder[bbIndex]];
    
    let sbAmount = Math.min(gameData.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    
    let bbAmount = Math.min(gameData.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    
    gameData.pot = sbAmount + bbAmount;
    gameData.lastRaise = gameData.bigBlind;
    
    // First turn is after big blind
    gameData.currentTurn = gameData.playerOrder[(bbIndex + 1) % gameData.playerOrder.length];
    gameData.status = 'playing'; // Pre-flop
    gameData.log = [`--- New Hand ---`, `Dealer is ${gameData.dealer}.`];
    
    return { ...gameData, deck: deck }; // Store deck for host
}

function advanceTurn(gameData) {
    let players = gameData.playerOrder.map(id => gameData.players[id]);
    let currentIndex = players.findIndex(p => p.id === gameData.currentTurn);
    
    for (let i = 1; i <= players.length; i++) {
        let nextIndex = (currentIndex + i) % players.length;
        let nextPlayer = players[nextIndex];
        
        // Skip folded or all-in players
        if (nextPlayer.status === 'active') {
            // Check if betting round is over
            // (Everyone has acted OR everyone has matched the bet)
            if (nextPlayer.currentBet === gameData.currentBet && nextPlayer.lastAction !== null) {
                // Round is over
                gameData.currentTurn = null;
                return gameData;
            } else {
                // This is the next player
                gameData.currentTurn = nextPlayer.id;
                gameData.lastActionTime = Date.now();
                return gameData;
            }
        }
    }
    
    // Everyone is folded or all-in
    gameData.currentTurn = null;
    return gameData;
}

function advanceBettingRound(gameData) {
    // 1. Reset player actions for next round
    for (const id in gameData.players) {
        if (gameData.players[id].status === 'active') {
            gameData.players[id].lastAction = null;
        }
    }
    
    // 2. Set turn to first active player after dealer
    let dealerIndex = gameData.playerOrder.indexOf(gameData.dealer);
    gameData.currentTurn = null;
    for (let i = 1; i <= gameData.playerOrder.length; i++) {
        let p = gameData.players[gameData.playerOrder[(dealerIndex + i) % gameData.playerOrder.length]];
        if (p.status === 'active') {
            gameData.currentTurn = p.id;
            break;
        }
    }
    
    // 3. Deal cards
    if (gameData.communityCards.length === 0) { // Pre-flop -> Flop
        gameData.communityCards = [gameData.deck.pop(), gameData.deck.pop(), gameData.deck.pop()];
        gameData.log.push(`--- Flop: ${gameData.communityCards.join(', ')} ---`);
    } else if (gameData.communityCards.length === 3) { // Flop -> Turn
        gameData.communityCards.push(gameData.deck.pop());
        gameData.log.push(`--- Turn: ${gameData.communityCards[3]} ---`);
    } else if (gameData.communityCards.length === 4) { // Turn -> River
        gameData.communityCards.push(gameData.deck.pop());
        gameData.log.push(`--- River: ${gameData.communityCards[4]} ---`);
    } else { // River -> Showdown
        gameData.status = 'showdown';
        gameData.log.push(`--- Showdown ---`);
    }
    
    return gameData;
}

function calculateShowdown(gameData) {
    let activePlayers = gameData.playerOrder
        .map(id => gameData.players[id])
        .filter(p => p.status !== 'folded' && p.status !== 'out');
        
    if (activePlayers.length === 1) {
        // Everyone else folded
        activePlayers[0].chips += gameData.pot;
        gameData.log.push(`${activePlayers[0].id} wins $${gameData.pot}.`);
    } else {
        // Hand comparison
        let hands = [];
        for (const player of activePlayers) {
            let sevenCards = [...player.cards, ...gameData.communityCards];
            let bestHand = evaluateHand(sevenCards); // This is the complex part
            hands.push({ player, bestHand });
        }
        
        // Sort by hand strength
        hands.sort((a, b) => compareHands(b.bestHand, a.bestHand));
        
        let winner = hands[0].player;
        winner.chips += gameData.pot;
        gameData.log.push(`${winner.id} wins $${gameData.pot} with a ${hands[0].bestHand.name}.`);
    }
    
    gameData.pot = 0;
    return gameData;
}

function getPokerDeck() {
    let deck = [];
    for (const suit of POKER_SUITS) {
        for (const rank of POKER_RANKS) {
            deck.push(rank + suit);
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

// --- Hand Evaluation Logic (Simplified) ---
// This is a very complex piece of logic
function evaluateHand(cards) {
    // cards is an array of 7 card strings, e.g., ["As", "Th", "2c", ...]
    
    // This logic is non-trivial. For this example, we'll
    // just do a basic pair/no-pair check.
    // A full implementation would be hundreds of lines.
    
    let ranks = cards.map(c => c[0]).sort();
    let suits = cards.map(c => c[1]);
    
    let rankCounts = {};
    for (const r of ranks) { rankCounts[r] = (rankCounts[r] || 0) + 1; }
    
    let pairs = 0;
    let trips = 0;
    for (const r in rankCounts) {
        if (rankCounts[r] === 2) pairs++;
        if (rankCounts[r] === 3) trips++;
    }
    
    let handValue = 0;
    let handName = "High Card";
    
    if (trips === 1 && pairs >= 1) {
        handValue = HAND_TYPES.FULL_HOUSE; handName = "Full House";
    } else if (trips === 1) {
        handValue = HAND_TYPES.THREE_OF_A_KIND; handName = "Three of a Kind";
    } else if (pairs === 2) {
        handValue = HAND_TYPES.TWO_PAIR; handName = "Two Pair";
    } else if (pairs === 1) {
        handValue = HAND_TYPES.PAIR; handName = "Pair";
    }
    
    // Return a comparable object
    return { value: handValue, name: handName, kicker: 0 }; // Kicker logic also needed
}

function compareHands(handA, handB) {
    return handA.value - handB.value; // Higher value wins
}
