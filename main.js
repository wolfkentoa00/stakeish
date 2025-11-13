// --- START: FIREBASE SDK IMPORTS ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    runTransaction 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// --- END: FIREBASE SDK IMPORTS ---


// --- START: FIREBASE CONFIG ---
// This is your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiqJrnKmZOjqpybMNxgP94XAtSj2mSu5g",
  authDomain: "stakeish-poker.firebaseapp.com",
  projectId: "stakeish-poker",
  storageBucket: "stakeish-poker.firebasestorage.app",
  messagingSenderId: "583658266654",
  appId: "1:583658266654:web:a8bec51814adda2eb30e0f",
  measurementId: "G-X49SKLK730"
};
// --- END: FIREBASE CONFIG ---


// --- Application State ---
let balance = parseFloat(localStorage.getItem('stakeishBalance')) || 1000.00;

// --- DOM Elements (Global) ---
let balanceDisplay, walletButton, depositModal, closeModal, depositButton, depositAmountInput;
let navButtons, gameArea, messageBox, messageText;

// --- Utility Functions (Global) ---
function updateBalanceDisplay() {
    if (!balanceDisplay) balanceDisplay = document.getElementById('balanceDisplay');
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
window.modifyBet = modifyBet; // Make global

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
    depositAmountInput.value = "1000";
}

// --- Game Navigation Logic ---
async function loadGame(gameName) {
    if (!navButtons) navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.game === gameName);
    });

    try {
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
        case 'poker': initPoker(); break;
    }
}

// --- Event Listeners (Global) ---
window.addEventListener('DOMContentLoaded', () => {
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
    loadGame('limbo');

    walletButton.addEventListener('click', toggleModal);
    closeModal.addEventListener('click', toggleModal);
    depositButton.addEventListener('click', depositMoney);
    
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
        reelsDiv.innerHTML = [1,2,3].map(() => `<div class="reel p-4 spinning">${getRandomSymbol()}</div>`).join('');
    }, 100);
    await new Promise(r => setTimeout(r, 1500));
    clearInterval(spin);
    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    reelsDiv.innerHTML = finalReels.map(s => `<div class="reel p-4">${s}</div>`).join('');
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
    document.getElementById('blackjackDealerHand').innerHTML = '';
    bjState.dealer.forEach(c => document.getElementById('blackjackDealerHand').appendChild(createCardEl(c)));
    document.getElementById('blackjackPlayerHand').innerHTML = '';
    bjState.hands[bjState.active].forEach(c => document.getElementById('blackjackPlayerHand').appendChild(createCardEl(c)));
    let dScore = calcHandVal(bjState.dealer);
    let pScore = calcHandVal(bjState.hands[bjState.active]);
    document.getElementById('blackjackDealerScore').textContent = `Score: ${dScore}`;
    document.getElementById('blackjackPlayerScore').textContent = `Score: ${pScore}`;
    document.getElementById('blackjackDouble').disabled = !(bjState.hands[bjState.active].length === 2 && balance >= bjState.bet);
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
        res.textContent = '';
        res.classList.remove('text-green-400', 'text-red-500');
    }, 3000);
}


// ------------------------------------
// --- POKER LOGIC (V10+ SDK) ---
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
const POKER_DB_PATH = `artifacts/${firebaseConfig.projectId}/public/data/poker`;


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
    try {
        // 1. Initialize Firebase
        // These functions were imported at the top of the file.
        fbApp = initializeApp(firebaseConfig);
        fbAuth = getAuth(fbApp);
        fbDb = getFirestore(fbApp);

        // 2. Authenticate User
        onAuthStateChanged(fbAuth, (user) => {
            if (user) {
                fbUser = user;
                fbPlayerId = user.uid;
                const userIdEl = document.getElementById('pokerUserId');
                if (userIdEl) userIdEl.textContent = fbPlayerId;
            }
        });

        await signInAnonymously(fbAuth);

        // 3. Attach Lobby Event Listeners
        document.getElementById('pokerCreateButton').addEventListener('click', pokerCreateGame);
        document.getElementById('pokerJoinButton').addEventListener('click', pokerJoinGame);
        document.getElementById('pokerLeaveButton').addEventListener('click', pokerLeaveGame);

    } catch (error) {
        console.error("Firebase init failed:", error);
        showMessage("Firebase failed to load. Poker is unavailable.", 'error');
    }
}

// --- Poker Lobby Functions ---

async function pokerCreateGame() {
    if (balance < 1000) {
        showMessage("You need $1000 to buy-in.", 'error');
        return;
    }
    balance -= 1000;
    updateBalanceDisplay();

    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameRef = doc(fbDb, POKER_DB_PATH, gameId);
    
    const player = createNewPlayer(fbPlayerId, 1000);
    const newGame = {
        gameId: gameId,
        players: { [fbPlayerId]: player },
        playerOrder: [fbPlayerId],
        seats: { [fbPlayerId]: 0 },
        status: 'waiting',
        pot: 0,
        communityCards: [],
        currentTurn: null,
        currentBet: 0,
        bigBlind: 20,
        smallBlind: 10,
        dealer: null,
        lastActionTime: Date.now(),
        log: [`Game ${gameId} created by ${fbPlayerId.substring(0,6)}.`]
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
    const gameId = document.getElementById('pokerJoinCode').value.toUpperCase();
    if (gameId.length !== 6) {
        showMessage("Invalid game code.", 'error');
        return;
    }
    
    if (balance < 1000) {
        showMessage("You need $1000 to buy-in.", 'error');
        return;
    }

    const gameRef = doc(fbDb, POKER_DB_PATH, gameId);
    
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
            
            const occupiedSeats = Object.values(gameData.seats);
            let seatIndex = 0;
            for (let i = 0; i < 6; i++) {
                if (!occupiedSeats.includes(i)) {
                    seatIndex = i;
                    break;
                }
            }
            
            // Use updateDoc with dot notation for deep updates
            await updateDoc(gameRef, {
                [`players.${fbPlayerId}`]: player,
                [`seats.${fbPlayerId}`]: seatIndex,
                playerOrder: [...gameData.playerOrder, fbPlayerId],
                log: [...gameData.log, `${fbPlayerId.substring(0,6)} joined the game.`]
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
        id: id, chips: chips, cards: [], currentBet: 0,
        status: 'active', lastAction: null
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
    if (fbGameUnsubscribe) fbGameUnsubscribe();
    fbGameUnsubscribe = null;

    if (!fbGameId || !fbPlayerId) {
        showPokerTable(false);
        return;
    }
    
    const gameRef = doc(fbDb, POKER_DB_PATH, fbGameId);
    
    try {
        // Use a transaction to safely leave the game
        await runTransaction(fbDb, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) return;
            
            let gameData = gameSnap.data();
            let player = gameData.players[fbPlayerId];
            
            if (player) {
                balance += player.chips;
                updateBalanceDisplay();
            }

            // Remove player
            delete gameData.players[fbPlayerId];
            delete gameData.seats[fbPlayerId];
            gameData.playerOrder = gameData.playerOrder.filter(id => id !== fbPlayerId);
            gameData.log = [...gameData.log, `${fbPlayerId.substring(0,6)} left the game.`];
            
            if (gameData.playerOrder.length === 0) {
                transaction.delete(gameRef); // Delete game if empty
            } else {
                if (gameData.currentTurn === fbPlayerId) {
                    gameData = advanceTurn(gameData); // Advance turn if it was ours
                }
                transaction.set(gameRef, gameData);
            }
        });
    } catch (error) {
        console.error("Error leaving game:", error);
    }
    
    fbGameId = null;
    showPokerTable(false);
}

// --- Poker Real-Time Functions ---

function subscribeToGame(gameId) {
    const gameRef = doc(fbDb, POKER_DB_PATH, gameId);
    fbGameUnsubscribe = onSnapshot(gameRef, (docSnap) => {
        if (!docSnap.exists()) {
            showMessage("Game " + gameId + " has ended.", 'success');
            if (fbGameId) pokerLeaveGame();
            return;
        }
        
        const gameData = docSnap.data();
        renderPokerGame(gameData);
        checkGameLogic(gameData);
    });
}

function renderPokerGame(gameData) {
    const { players, seats, pot, communityCards, currentTurn } = gameData;
    
    const mySeatIndex = seats[fbPlayerId];
    if (mySeatIndex === undefined) return;
    
    document.getElementById('pokerPot').textContent = `Pot: $${pot}`;
    const commCardDiv = document.getElementById('pokerCommunityCards');
    commCardDiv.innerHTML = '';
    communityCards.forEach(cardStr => commCardDiv.appendChild(renderPokerCard(cardStr)));
    
    for (let i = 0; i < 6; i++) {
        const seatEl = document.getElementById(`seat-${i}`);
        if(seatEl) {
            seatEl.innerHTML = '';
            seatEl.className = 'poker-seat';
        }
    }

    for (const playerId in players) {
        const player = players[playerId];
        const seatIndex = seats[playerId];
        let relativeSeat = (seatIndex - mySeatIndex + 6) % 6;
        const seatEl = document.getElementById(`seat-${relativeSeat}`);
        
        seatEl.innerHTML = `
            <div class="seat-name">${playerId.substring(0, 6)}...</div>
            <div class="seat-chips">$${player.chips}</div>
            <div class="seat-cards">${renderPlayerCards(player)}</div>
            <div class="seat-bet">${player.currentBet > 0 ? `$${player.currentBet}` : ''}</div>
        `;
        
        if (player.status === 'folded') seatEl.classList.add('folded');
        if (playerId === currentTurn) seatEl.classList.add('active-turn');
    }
    
    renderActionControls(gameData);
}

function renderPlayerCards(player) {
    if (player.id === fbPlayerId) {
        if (player.cards.length === 0) return '';
        return player.cards.map(renderPokerCard).map(el => el.outerHTML).join('');
    }
    if (player.status !== 'folded' && player.cards.length > 0) {
        return `<div class="poker-card-back"></div><div class="poker-card-back"></div>`;
    }
    return '';
}

function renderPokerCard(cardStr) {
    const rank = cardStr[0];
    const suit = cardStr[1];
    const suitChar = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' }[suit];
    const color = (suit === 'h' || suit === 'd') ? 'red' : 'black';
    const cardEl = document.createElement('div');
    cardEl.className = `poker-card ${color}`;
    cardEl.innerHTML = `<span class="card-rank">${rank}</span><span class="card-suit">${suitChar}</span>`;
    return cardEl;
}

function renderActionControls(gameData) {
    const { players, currentTurn, currentBet } = gameData;
    const controls = document.getElementById('pokerActionControls');
    const timer = document.getElementById('pokerTimer');

    if (currentTurn !== fbPlayerId) {
        controls.classList.add('hidden');
        timer.classList.add('hidden');
        if (fbTurnTimer) clearTimeout(fbTurnTimer);
        return;
    }
    
    controls.classList.remove('hidden');
    timer.classList.remove('hidden');

    const player = players[fbPlayerId];
    const callAmount = currentBet - player.currentBet;
    
    document.getElementById('pokerCall').textContent = callAmount > 0 ? `Call $${callAmount}` : 'Check';
    document.getElementById('pokerCheck').style.display = callAmount > 0 ? 'none' : 'inline-block';
    document.getElementById('pokerCall').style.display = callAmount > 0 ? 'inline-block' : 'none';

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
    
    document.getElementById('pokerFold').onclick = () => pokerAct('fold', gameData);
    document.getElementById('pokerCheck').onclick = () => pokerAct('check', gameData);
    document.getElementById('pokerCall').onclick = () => pokerAct('call', gameData);
    document.getElementById('pokerRaise').onclick = () => {
        pokerAct('raise', gameData, parseInt(raiseSlider.value));
    };

    if (fbTurnTimer) clearTimeout(fbTurnTimer);
    const timerBar = document.getElementById('pokerTimerBar');
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    timerBar.getBoundingClientRect(); 
    timerBar.style.transition = 'width 30s linear';
    timerBar.style.width = '0%';

    fbTurnTimer = setTimeout(() => {
        showMessage("Time's up! Auto-folding.", 'error');
        pokerAct('fold', gameData);
    }, 30000);
}

async function checkGameLogic(gameData) {
    const gameRef = doc(fbDb, POKER_DB_PATH, gameData.gameId);

    const hostId = gameData.dealer || gameData.playerOrder[0];
    if (hostId !== fbPlayerId) return; // Not our job
    
    if (gameData.status === 'waiting' && gameData.playerOrder.length >= 2) {
        let newGame = beginHand(gameData);
        await updateDoc(gameRef, newGame);
        return;
    }
    
    if (gameData.status === 'playing' && gameData.currentTurn === null) {
        let newGame = advanceBettingRound(gameData);
        await updateDoc(gameRef, newGame);
        return;
    }
    
    if (gameData.status === 'showdown') {
        await new Promise(r => setTimeout(r, 4000));
        let newGame = calculateShowdown(gameData);
        newGame = beginHand(newGame);
        await updateDoc(gameRef, newGame);
    }
}

async function pokerAct(action, gameData, amount = 0) {
    const gameRef = doc(fbDb, POKER_DB_PATH, gameData.gameId);
    if (gameData.currentTurn !== fbPlayerId) return;
    if (fbTurnTimer) clearTimeout(fbTurnTimer);
    
    let player = gameData.players[fbPlayerId];
    let pot = gameData.pot;
    let currentBet = gameData.currentBet;
    let log = gameData.log;
    let chipsToBet = 0;
    
    if (action === 'fold') {
        player.status = 'folded';
        log.push(`${player.id.substring(0,6)} folds.`);
    } else if (action === 'check') {
        player.lastAction = 'check';
        log.push(`${player.id.substring(0,6)} checks.`);
    } else if (action === 'call') {
        chipsToBet = currentBet - player.currentBet;
        if (chipsToBet > player.chips) { chipsToBet = player.chips; player.status = 'all-in'; }
        player.chips -= chipsToBet;
        player.currentBet += chipsToBet;
        pot += chipsToBet;
        player.lastAction = 'call';
        log.push(`${player.id.substring(0,6)} calls $${chipsToBet}.`);
    } else if (action === 'raise') {
        chipsToBet = amount - player.currentBet;
        if (amount >= player.chips) {
            chipsToBet = player.chips;
            amount = player.chips + player.currentBet;
            player.status = 'all-in';
        }
        player.chips -= chipsToBet;
        player.currentBet += chipsToBet;
        pot += chipsToBet;
        currentBet = player.currentBet;
        gameData.lastRaise = amount;
        player.lastAction = 'raise';
        log.push(`${player.id.substring(0,6)} raises to $${amount}.`);
    }

    gameData.players[fbPlayerId] = player;
    gameData.pot = pot;
    gameData.currentBet = currentBet;
    gameData.log = log;
    gameData = advanceTurn(gameData);
    
    await updateDoc(gameRef, gameData);
}

// --- Poker Game Engine (State Machine) ---
function beginHand(gameData) {
    let newDealerIndex = (gameData.playerOrder.indexOf(gameData.dealer) + 1) % gameData.playerOrder.length;
    gameData.dealer = gameData.playerOrder[newDealerIndex];
    let deck = getPokerDeck();
    gameData.pot = 0;
    gameData.communityCards = [];
    gameData.currentBet = gameData.bigBlind;
    
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
    
    let sbIndex = (newDealerIndex + 1) % gameData.playerOrder.length;
    let bbIndex = (newDealerIndex + 2) % gameData.playerOrder.length;
    let sbPlayer = gameData.players[gameData.playerOrder[sbIndex]];
    let bbPlayer = gameData.players[gameData.playerOrder[bbIndex]];
    let sbAmount = Math.min(gameData.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount; sbPlayer.currentBet = sbAmount;
    let bbAmount = Math.min(gameData.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount; bbPlayer.currentBet = bbAmount;
    gameData.pot = sbAmount + bbAmount;
    gameData.lastRaise = gameData.bigBlind;
    gameData.currentTurn = gameData.playerOrder[(bbIndex + 1) % gameData.playerOrder.length];
    gameData.status = 'playing';
    gameData.log = [`--- New Hand ---`, `Dealer is ${gameData.dealer.substring(0,6)}.`];
    return { ...gameData, deck: deck };
}

function advanceTurn(gameData) {
    let players = gameData.playerOrder.map(id => gameData.players[id]);
    let currentIndex = players.findIndex(p => p.id === gameData.currentTurn);
    for (let i = 1; i <= players.length; i++) {
        let nextIndex = (currentIndex + i) % players.length;
        let nextPlayer = players[nextIndex];
        if (nextPlayer.status === 'active') {
            if (nextPlayer.currentBet === gameData.currentBet && nextPlayer.lastAction !== null) {
                gameData.currentTurn = null; return gameData;
            } else {
                gameData.currentTurn = nextPlayer.id;
                gameData.lastActionTime = Date.now();
                return gameData;
            }
        }
    }
    gameData.currentTurn = null; return gameData;
}

function advanceBettingRound(gameData) {
    for (const id in gameData.players) {
        if (gameData.players[id].status === 'active') {
            gameData.players[id].lastAction = null;
        }
    }
    let dealerIndex = gameData.playerOrder.indexOf(gameData.dealer);
    gameData.currentTurn = null;
    for (let i = 1; i <= gameData.playerOrder.length; i++) {
        let p = gameData.players[gameData.playerOrder[(dealerIndex + i) % gameData.playerOrder.length]];
        if (p.status === 'active') {
            gameData.currentTurn = p.id; break;
        }
    }
    if (gameData.communityCards.length === 0) {
        gameData.communityCards = [gameData.deck.pop(), gameData.deck.pop(), gameData.deck.pop()];
        gameData.log.push(`--- Flop: ${gameData.communityCards.join(', ')} ---`);
    } else if (gameData.communityCards.length === 3) {
        gameData.communityCards.push(gameData.deck.pop());
        gameData.log.push(`--- Turn: ${gameData.communityCards[3]} ---`);
    } else if (gameData.communityCards.length === 4) {
        gameData.communityCards.push(gameData.deck.pop());
        gameData.log.push(`--- River: ${gameData.communityCards[4]} ---`);
    } else {
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
        activePlayers[0].chips += gameData.pot;
        gameData.log.push(`${activePlayers[0].id.substring(0,6)} wins $${gameData.pot}.`);
    } else {
        let hands = [];
        for (const player of activePlayers) {
            let sevenCards = [...player.cards, ...gameData.communityCards];
            let bestHand = evaluateHand(sevenCards);
            hands.push({ player, bestHand });
        }
        hands.sort((a, b) => compareHands(b.bestHand, a.bestHand));
        let winner = hands[0].player;
        winner.chips += gameData.pot;
        gameData.log.push(`${winner.id.substring(0,6)} wins $${gameData.pot} with a ${hands[0].bestHand.name}.`);
    }
    gameData.pot = 0;
    return gameData;
}

function getPokerDeck() {
    let d = [];
    for (const s of POKER_SUITS) for (const r of POKER_RANKS) d.push(r + s);
    return d.sort(() => Math.random() - 0.5);
}

// --- Hand Evaluation Logic (Simplified) ---
function evaluateHand(cards) {
    let ranks = cards.map(c => c[0]).sort();
    let suits = cards.map(c => c[1]);
    let rankCounts = {}; ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    let pairs = 0; let trips = 0;
    for (const r in rankCounts) {
        if (rankCounts[r] === 2) pairs++;
        if (rankCounts[r] === 3) trips++;
    }
    let handValue = 0; let handName = "High Card";
    if (trips === 1 && pairs >= 1) { handValue = HAND_TYPES.FULL_HOUSE; handName = "Full House"; }
    else if (trips === 1) { handValue = HAND_TYPES.THREE_OF_A_KIND; handName = "Three of a Kind"; }
    else if (pairs === 2) { handValue = HAND_TYPES.TWO_PAIR; handName = "Two Pair"; }
    else if (pairs === 1) { handValue = HAND_TYPES.PAIR; handName = "Pair"; }
    return { value: handValue, name: handName, kicker: 0 };
}
function compareHands(handA, handB) {
    return handA.value - handB.value;
}
