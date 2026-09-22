// Elements
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const elements = {
    playerNameInput: document.getElementById('player-name'),
    startBtn: document.getElementById('start-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    homeBtn: document.getElementById('home-btn'),
    soundToggle: document.getElementById('sound-toggle'),
    soundIconOn: document.querySelector('.sound-icon-on'),
    soundIconOff: document.querySelector('.sound-icon-off'),
    
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    combo: document.getElementById('combo'),
    playArea: document.getElementById('play-area'),
    comboMessage: document.getElementById('combo-message'),
    
    endPlayerName: document.getElementById('end-player-name'),
    finalScore: document.getElementById('final-score'),
    finalAccuracy: document.getElementById('final-accuracy'),
    highestCombo: document.getElementById('highest-combo')
};

// Game State
let state = {
    playerName: 'Player',
    score: 0,
    timeRemaining: 30.0,
    combo: 0,
    highestCombo: 0,
    hits: 0,
    misses: 0,
    isPlaying: false,
    soundEnabled: true,
    targetSpawnTimeout: null,
    gameLoop: null,
    lastTime: 0,
    activeTargets: new Set()
};

// Target Types Config
const targetTypes = [
    { type: 'normal', points: 1, probability: 60, size: 50, duration: 2000 },
    { type: 'small', points: 3, probability: 20, size: 30, duration: 1500 },
    { type: 'moving', points: 5, probability: 10, size: 45, duration: 2500 },
    { type: 'bomb', points: -3, probability: 10, size: 50, duration: 2000 }
];

// Audio System (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!state.soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'hit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'combo') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'over') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(100, now + 1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    }
}

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Game Logic
function initGame() {
    state.playerName = elements.playerNameInput.value.trim() || 'Player';
    state.score = 0;
    state.timeRemaining = 30.0;
    state.combo = 0;
    state.highestCombo = 0;
    state.hits = 0;
    state.misses = 0;
    state.isPlaying = true;
    state.activeTargets.clear();
    
    elements.playArea.innerHTML = '';
    elements.timer.classList.remove('warning');
    
    updateHUD();
    switchScreen('game');
    
    state.lastTime = performance.now();
    state.gameLoop = requestAnimationFrame(gameLoop);
    scheduleNextSpawn();
}

function endGame() {
    state.isPlaying = false;
    cancelAnimationFrame(state.gameLoop);
    clearTimeout(state.targetSpawnTimeout);
    
    // Clear all targets
    elements.playArea.innerHTML = '';
    
    // Calculate stats
    const totalAttempts = state.hits + state.misses;
    const accuracy = totalAttempts > 0 ? Math.round((state.hits / totalAttempts) * 100) : 0;
    
    elements.endPlayerName.innerText = state.playerName;
    elements.finalScore.innerText = state.score;
    elements.finalAccuracy.innerText = `${accuracy}%`;
    elements.highestCombo.innerText = `x${state.highestCombo}`;
    
    playSound('over');
    switchScreen('end');
}

function gameLoop(currentTime) {
    if (!state.isPlaying) return;
    
    const dt = (currentTime - state.lastTime) / 1000;
    state.lastTime = currentTime;
    
    state.timeRemaining -= dt;
    
    if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        updateHUD();
        endGame();
        return;
    }
    
    if (state.timeRemaining <= 5) {
        elements.timer.classList.add('warning');
    }
    
    // Update moving targets
    updateMovingTargets(dt);
    
    updateHUD();
    state.gameLoop = requestAnimationFrame(gameLoop);
}

function updateHUD() {
    elements.score.innerText = state.score;
    elements.timer.innerText = state.timeRemaining.toFixed(1);
    
    let comboMultiplier = 1;
    if (state.combo >= 10) comboMultiplier = 3;
    else if (state.combo >= 5) comboMultiplier = 2;
    
    elements.combo.innerText = `x${comboMultiplier} (${state.combo})`;
    
    if (comboMultiplier > 1) {
        elements.combo.style.color = '#f59e0b';
    } else {
        elements.combo.style.color = 'inherit';
    }
}

// Target Spawning
function getRandomTargetType() {
    const rand = Math.random() * 100;
    let cum = 0;
    for (let t of targetTypes) {
        cum += t.probability;
        if (rand <= cum) return t;
    }
    return targetTypes[0];
}

function scheduleNextSpawn() {
    if (!state.isPlaying) return;
    
    spawnTarget();
    
    // Spawn rate increases as time goes down
    const progress = 1 - (state.timeRemaining / 30); // 0 to 1
    const baseDelay = 800;
    const minDelay = 300;
    const delay = Math.max(minDelay, baseDelay - (progress * 500));
    
    state.targetSpawnTimeout = setTimeout(scheduleNextSpawn, delay + Math.random() * 200);
}

function spawnTarget() {
    const typeDef = getRandomTargetType();
    const target = document.createElement('div');
    
    target.classList.add('target', `target-type-${typeDef.type}`);
    
    // Position
    const areaRect = elements.playArea.getBoundingClientRect();
    const margin = typeDef.size;
    const maxX = areaRect.width - margin;
    const maxY = areaRect.height - margin;
    
    const x = margin / 2 + Math.random() * (maxX - margin);
    const y = margin / 2 + Math.random() * (maxY - margin);
    
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    
    // For moving targets
    if (typeDef.type === 'moving') {
        target.dataset.vx = (Math.random() - 0.5) * 300; // pixels per second
        target.dataset.vy = (Math.random() - 0.5) * 300;
    }
    
    // Interaction
    // Handle both touch and click
    const handleHit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (target.dataset.clicked) return;
        target.dataset.clicked = true;
        hitTarget(target, typeDef, e.clientX, e.clientY);
    };
    
    target.addEventListener('mousedown', handleHit);
    target.addEventListener('touchstart', handleHit, { passive: false });
    
    elements.playArea.appendChild(target);
    state.activeTargets.add(target);
    
    // Animate in
    requestAnimationFrame(() => {
        target.classList.add('active');
    });
    
    // Auto despawn
    const speedMultiplier = 1 + (1 - (state.timeRemaining / 30)) * 0.5; // Up to 50% faster
    const duration = typeDef.duration / speedMultiplier;
    
    target.despawnTimeout = setTimeout(() => {
        if (!target.dataset.clicked) {
            missTarget(target, typeDef.type);
        }
    }, duration);
}

function updateMovingTargets(dt) {
    const areaRect = elements.playArea.getBoundingClientRect();
    
    state.activeTargets.forEach(target => {
        if (target.classList.contains('target-type-moving')) {
            let x = parseFloat(target.style.left);
            let y = parseFloat(target.style.top);
            let vx = parseFloat(target.dataset.vx);
            let vy = parseFloat(target.dataset.vy);
            
            x += vx * dt;
            y += vy * dt;
            
            // Bounce
            const size = 45 / 2; // half size
            if (x <= size || x >= areaRect.width - size) {
                vx *= -1;
                target.dataset.vx = vx;
                x = Math.max(size, Math.min(x, areaRect.width - size));
            }
            if (y <= size || y >= areaRect.height - size) {
                vy *= -1;
                target.dataset.vy = vy;
                y = Math.max(size, Math.min(y, areaRect.height - size));
            }
            
            target.style.left = `${x}px`;
            target.style.top = `${y}px`;
        }
    });
}

function showFloatingText(x, y, text, isPositive) {
    const el = document.createElement('div');
    el.className = `floating-text ${isPositive ? 'pts-plus' : 'pts-minus'}`;
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    elements.playArea.appendChild(el);
    
    setTimeout(() => el.remove(), 800);
}

function showComboMessage(multiplier) {
    elements.comboMessage.innerText = `Combo x${multiplier}!`;
    elements.comboMessage.classList.remove('hidden');
    elements.comboMessage.style.animation = 'none';
    elements.comboMessage.offsetHeight; // trigger reflow
    elements.comboMessage.style.animation = 'popInAndOut 1.5s ease-in-out forwards';
    
    setTimeout(() => {
        elements.comboMessage.classList.add('hidden');
    }, 1500);
}

function hitTarget(target, typeDef, clientX, clientY) {
    clearTimeout(target.despawnTimeout);
    
    // Transform coordinates to playArea relative
    const rect = elements.playArea.getBoundingClientRect();
    let x, y;
    if (clientX && clientY) {
        x = clientX - rect.left;
        y = clientY - rect.top;
    } else {
        x = parseFloat(target.style.left);
        y = parseFloat(target.style.top);
    }
    
    if (typeDef.type === 'bomb') {
        state.score += typeDef.points; // negative points
        state.combo = 0;
        playSound('bomb');
        showFloatingText(x, y, typeDef.points, false);
    } else {
        state.hits++;
        state.combo++;
        if (state.combo > state.highestCombo) state.highestCombo = state.combo;
        
        let comboMultiplier = 1;
        if (state.combo >= 10) comboMultiplier = 3;
        else if (state.combo >= 5) comboMultiplier = 2;
        
        const earnedPoints = typeDef.points * comboMultiplier;
        state.score += earnedPoints;
        
        playSound('hit');
        showFloatingText(x, y, `+${earnedPoints}`, true);
        
        // Combo milestones
        if (state.combo === 5) {
            showComboMessage(2);
            playSound('combo');
        } else if (state.combo === 10) {
            showComboMessage(3);
            playSound('combo');
        }
    }
    
    removeTarget(target);
}

function missTarget(target, type) {
    if (type !== 'bomb') {
        state.misses++;
        state.combo = 0;
    }
    removeTarget(target);
}

function removeTarget(target) {
    target.classList.remove('active');
    target.classList.add('shrinking');
    state.activeTargets.delete(target);
    
    setTimeout(() => {
        if (target.parentNode) {
            target.parentNode.removeChild(target);
        }
    }, 150);
}

// Miss click on play area (not a target)
elements.playArea.addEventListener('mousedown', (e) => {
    if (e.target === elements.playArea) {
        state.combo = 0;
        updateHUD();
    }
});

// Sound Toggle
function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
        elements.soundIconOn.style.display = 'block';
        elements.soundIconOff.style.display = 'none';
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } else {
        elements.soundIconOn.style.display = 'none';
        elements.soundIconOff.style.display = 'block';
    }
}

// Event Listeners
elements.startBtn.addEventListener('click', initGame);
elements.playAgainBtn.addEventListener('click', initGame);
elements.homeBtn.addEventListener('click', () => switchScreen('start'));
elements.soundToggle.addEventListener('click', toggleSound);

// Prevent default touch behaviors like pull-to-refresh
document.addEventListener('touchmove', function (e) {
    if (state.isPlaying) {
        e.preventDefault();
    }
}, { passive: false });
