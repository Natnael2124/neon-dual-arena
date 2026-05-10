/* ============================================
   NEON DUEL ARENA — Game Engine
   ============================================ */

// ==========================================
// AUDIO ENGINE (Web Audio API Synth)
// ==========================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    play(type, freq, duration, vol = 0.15) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    shoot() { this.play('square', 600, 0.1, 0.08); }
    hit() { this.play('sawtooth', 200, 0.2, 0.12); }
    explosion() {
        this.play('sawtooth', 100, 0.4, 0.15);
        setTimeout(() => this.play('square', 60, 0.3, 0.1), 50);
    }
    powerup() {
        this.play('sine', 500, 0.1, 0.1);
        setTimeout(() => this.play('sine', 700, 0.1, 0.1), 80);
        setTimeout(() => this.play('sine', 900, 0.15, 0.1), 160);
    }
    shield() { this.play('triangle', 800, 0.15, 0.08); }
    dash() { this.play('sine', 400, 0.15, 0.08); }
    roundWin() {
        [0, 100, 200, 300, 400].forEach((d, i) => {
            setTimeout(() => this.play('sine', 400 + i * 100, 0.2, 0.1), d);
        });
    }
    countdown() { this.play('sine', 440, 0.15, 0.08); }
    go() { this.play('sine', 880, 0.3, 0.12); }
}

const audio = new AudioEngine();

// ==========================================
// SETTINGS
// ==========================================
const settings = {
    roundsToWin: 5,
    arenaSize: 1,      // 0=small, 1=medium, 2=large
    powerupFreq: 1,    // 0=rare, 1=normal, 2=frequent
    sound: true,
    arenaSizeNames: ['Small', 'Medium', 'Large'],
    powerupFreqNames: ['Rare', 'Normal', 'Frequent'],
    powerupIntervals: [8000, 5000, 3000],
};

// Player names
let playerNames = ['Player 1', 'Player 2'];

// ==========================================
// RANKING SYSTEM (localStorage)
// ==========================================
const RANKINGS_KEY = 'neonDuelRankings';

function loadRankings() {
    try {
        const data = localStorage.getItem(RANKINGS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function saveRankings(rankings) {
    try {
        localStorage.setItem(RANKINGS_KEY, JSON.stringify(rankings));
    } catch (e) { /* ignore */ }
}

function updatePlayerRanking(name, isWinner) {
    const rankings = loadRankings();
    const key = name.toLowerCase().trim();
    if (!key) return;
    if (!rankings[key]) {
        rankings[key] = { name: name, wins: 0, losses: 0, games: 0 };
    }
    rankings[key].name = name; // Keep latest casing
    rankings[key].games++;
    if (isWinner) rankings[key].wins++;
    else rankings[key].losses++;
    saveRankings(rankings);
    return rankings[key];
}

function getRankedPlayers() {
    const rankings = loadRankings();
    return Object.values(rankings).sort((a, b) => {
        // Sort by wins, then win rate, then fewer losses
        if (b.wins !== a.wins) return b.wins - a.wins;
        const wrA = a.games > 0 ? a.wins / a.games : 0;
        const wrB = b.games > 0 ? b.wins / b.games : 0;
        if (wrB !== wrA) return wrB - wrA;
        return a.losses - b.losses;
    });
}

function clearRankings() {
    localStorage.removeItem(RANKINGS_KEY);
}

// ==========================================
// CHARACTER FACE DRAWING
// ==========================================
function drawCharacterFace(canvas, color, colorDim, isWinner) {
    const ctx2 = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx2.clearRect(0, 0, w, h);

    // Background circle
    const bgGrad = ctx2.createRadialGradient(cx, cy, 10, cx, cy, 46);
    bgGrad.addColorStop(0, 'rgba(30, 30, 60, 1)');
    bgGrad.addColorStop(1, 'rgba(10, 10, 25, 1)');
    ctx2.beginPath();
    ctx2.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx2.fillStyle = bgGrad;
    ctx2.fill();

    // Glow ring
    ctx2.beginPath();
    ctx2.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 2;
    ctx2.globalAlpha = 0.6;
    ctx2.stroke();
    ctx2.globalAlpha = 1;

    // Ship (character) in the center
    ctx2.save();
    ctx2.translate(cx, cy);

    // Ship body (facing right)
    ctx2.beginPath();
    ctx2.moveTo(22, 0);
    ctx2.lineTo(-14, -14);
    ctx2.lineTo(-6, 0);
    ctx2.lineTo(-14, 14);
    ctx2.closePath();
    const shipGrad = ctx2.createLinearGradient(-14, 0, 22, 0);
    shipGrad.addColorStop(0, colorDim);
    shipGrad.addColorStop(1, color);
    ctx2.fillStyle = shipGrad;
    ctx2.fill();
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 1.5;
    ctx2.stroke();

    // Eyes (two small dots)
    ctx2.fillStyle = '#ffffff';
    ctx2.beginPath();
    ctx2.arc(6, -5, 3, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(6, 5, 3, 0, Math.PI * 2);
    ctx2.fill();

    // Pupils
    ctx2.fillStyle = isWinner ? color : '#ff3355';
    ctx2.beginPath();
    ctx2.arc(7.5, -5, 1.5, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(7.5, 5, 1.5, 0, Math.PI * 2);
    ctx2.fill();

    // Expression
    if (isWinner) {
        // Happy mouth (smile)
        ctx2.beginPath();
        ctx2.arc(2, 2, 6, 0.2, Math.PI - 0.2);
        ctx2.strokeStyle = '#ffffff';
        ctx2.lineWidth = 1.5;
        ctx2.stroke();
    } else {
        // Sad mouth
        ctx2.beginPath();
        ctx2.arc(2, 10, 5, Math.PI + 0.3, -0.3);
        ctx2.strokeStyle = '#ff3355';
        ctx2.lineWidth = 1.5;
        ctx2.stroke();

        // X eyes for loser
        ctx2.strokeStyle = '#ff3355';
        ctx2.lineWidth = 1.5;
        // Left X
        ctx2.beginPath();
        ctx2.moveTo(4, -7); ctx2.lineTo(9, -3);
        ctx2.moveTo(9, -7); ctx2.lineTo(4, -3);
        ctx2.stroke();
        // Right X
        ctx2.beginPath();
        ctx2.moveTo(4, 3); ctx2.lineTo(9, 7);
        ctx2.moveTo(9, 3); ctx2.lineTo(4, 7);
        ctx2.stroke();
    }

    // Engine glow for winner
    if (isWinner) {
        ctx2.beginPath();
        ctx2.moveTo(-8, -4);
        ctx2.lineTo(-18, 0);
        ctx2.lineTo(-8, 4);
        ctx2.fillStyle = color;
        ctx2.globalAlpha = 0.6;
        ctx2.fill();
        ctx2.globalAlpha = 1;
    }

    ctx2.restore();
}

function drawMiniAvatar(canvas, color, colorDim) {
    const ctx2 = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx2.clearRect(0, 0, w, h);

    // Background
    ctx2.beginPath();
    ctx2.arc(cx, cy, w/2 - 1, 0, Math.PI * 2);
    ctx2.fillStyle = 'rgba(15, 15, 35, 1)';
    ctx2.fill();
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 1.5;
    ctx2.globalAlpha = 0.5;
    ctx2.stroke();
    ctx2.globalAlpha = 1;

    // Mini ship
    ctx2.save();
    ctx2.translate(cx, cy);
    const s = 0.55;
    ctx2.beginPath();
    ctx2.moveTo(12*s, 0);
    ctx2.lineTo(-8*s, -8*s);
    ctx2.lineTo(-3*s, 0);
    ctx2.lineTo(-8*s, 8*s);
    ctx2.closePath();
    ctx2.fillStyle = color;
    ctx2.fill();
    ctx2.restore();
}

// ==========================================
// GAME STATE
// ==========================================
let gameState = {
    phase: 'menu', // menu, countdown, playing, roundEnd, paused, victory
    round: 1,
    scores: [0, 0],
    stats: { p1Shots: 0, p2Shots: 0, p1Hits: 0, p2Hits: 0 },
    roundTimer: 120,
    lastTimerTick: 0,
    countdownValue: 3,
    countdownStart: 0,
};

let players = [];
let bullets = [];
let powerups = [];
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let lastPowerupSpawn = 0;
let keys = {};
let animId = null;
let lastTime = 0;
let arena = { x: 0, y: 0, w: 0, h: 0 };

// ==========================================
// BACKGROUND STARS
// ==========================================
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
let stars = [];

function initBgStars() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            r: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            alpha: Math.random() * 0.6 + 0.2,
            twinkle: Math.random() * 0.02 + 0.005,
            twinkleDir: Math.random() > 0.5 ? 1 : -1,
        });
    }
}

function drawBgStars() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (const s of stars) {
        s.alpha += s.twinkle * s.twinkleDir;
        if (s.alpha > 0.8 || s.alpha < 0.1) s.twinkleDir *= -1;
        s.y += s.speed;
        if (s.y > bgCanvas.height + 5) { s.y = -5; s.x = Math.random() * bgCanvas.width; }
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(200, 210, 255, ${s.alpha})`;
        bgCtx.fill();
    }
    requestAnimationFrame(drawBgStars);
}

initBgStars();
drawBgStars();
window.addEventListener('resize', () => {
    initBgStars();
    if (gameCanvas) {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        updateArena();
    }
});

// ==========================================
// GAME CANVAS
// ==========================================
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');

// ==========================================
// PLAYER CLASS
// ==========================================
class Player {
    constructor(id, x, y, color, colorDim, glowColor) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 18;
        this.color = color;
        this.colorDim = colorDim;
        this.glowColor = glowColor;
        this.angle = id === 0 ? 0 : Math.PI;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 280;
        this.baseSpeed = 280;
        this.shootCooldown = 0;
        this.shootRate = 0.25; // seconds between shots
        this.baseShootRate = 0.25;
        this.shieldCooldown = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.tripleShot = false;
        this.tripleShotTimer = 0;
        this.rapidFire = false;
        this.rapidFireTimer = 0;
        this.speedBoost = false;
        this.speedBoostTimer = 0;
        this.invulnerable = 0;
        this.trail = [];
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.speed = this.baseSpeed;
        this.shootCooldown = 0;
        this.shootRate = this.baseShootRate;
        this.shieldCooldown = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.tripleShot = false;
        this.tripleShotTimer = 0;
        this.rapidFire = false;
        this.rapidFireTimer = 0;
        this.speedBoost = false;
        this.speedBoostTimer = 0;
        this.invulnerable = 1.5;
        this.trail = [];
        this.angle = this.id === 0 ? 0 : Math.PI;
    }

    update(dt) {
        // Power-up timers
        if (this.tripleShotTimer > 0) {
            this.tripleShotTimer -= dt;
            if (this.tripleShotTimer <= 0) this.tripleShot = false;
        }
        if (this.rapidFireTimer > 0) {
            this.rapidFireTimer -= dt;
            if (this.rapidFireTimer <= 0) { this.rapidFire = false; this.shootRate = this.baseShootRate; }
        }
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) { this.speedBoost = false; this.speed = this.baseSpeed; }
        }

        // Shield timer
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.shieldActive = false;
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

        // Dash timer
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) this.isDashing = false;
        }
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        // Cooldowns
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.invulnerable > 0) this.invulnerable -= dt;

        // Movement
        let moveSpeed = this.isDashing ? this.speed * 3 : this.speed;
        this.x += this.vx * moveSpeed * dt;
        this.y += this.vy * moveSpeed * dt;

        // Arena bounds
        this.x = Math.max(arena.x + this.radius, Math.min(arena.x + arena.w - this.radius, this.x));
        this.y = Math.max(arena.y + this.radius, Math.min(arena.y + arena.h - this.radius, this.y));

        // Trail
        if (this.isDashing || Math.abs(this.vx) > 0 || Math.abs(this.vy) > 0) {
            this.trail.push({ x: this.x, y: this.y, alpha: 0.6, r: this.radius * 0.7 });
        }
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= dt * 2.5;
            this.trail[i].r -= dt * 15;
            if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
        }

        // Calculate angle towards movement direction
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            const targetAngle = Math.atan2(this.vy, this.vx);
            let diff = targetAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.angle += diff * Math.min(1, dt * 12);
        }
    }

    shoot() {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = this.shootRate;
        audio.shoot();
        gameState.stats[this.id === 0 ? 'p1Shots' : 'p2Shots']++;

        const spawnBullet = (angleOffset) => {
            const angle = this.angle + angleOffset;
            bullets.push({
                x: this.x + Math.cos(angle) * (this.radius + 8),
                y: this.y + Math.sin(angle) * (this.radius + 8),
                vx: Math.cos(angle) * 550,
                vy: Math.sin(angle) * 550,
                owner: this.id,
                radius: 4,
                life: 2,
                color: this.color,
                glowColor: this.glowColor,
            });
        };

        spawnBullet(0);
        if (this.tripleShot) {
            spawnBullet(-0.25);
            spawnBullet(0.25);
        }
    }

    activateShield() {
        if (this.shieldCooldown > 0 || this.shieldActive) return;
        this.shieldActive = true;
        this.shieldTimer = 1.5;
        this.shieldCooldown = 6;
        audio.shield();
    }

    activateDash() {
        if (this.dashCooldown > 0 || this.isDashing) return;
        if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) return;
        this.isDashing = true;
        this.dashTimer = 0.15;
        this.dashCooldown = 3;
        audio.dash();
        // Spawn dash particles
        for (let i = 0; i < 8; i++) {
            particles.push(createParticle(this.x, this.y, this.color, 0.5));
        }
    }

    draw() {
        // Trail
        for (const t of this.trail) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, Math.max(1, t.r), 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace(')', `, ${t.alpha * 0.3})`).replace('rgb', 'rgba');
            ctx.fill();
        }

        // Invulnerability blink
        if (this.invulnerable > 0 && Math.sin(this.invulnerable * 20) > 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Glow
        const gradient = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, this.radius * 2.5);
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ship body
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius + 6, 0);
        ctx.lineTo(-this.radius + 2, -this.radius + 2);
        ctx.lineTo(-this.radius + 8, 0);
        ctx.lineTo(-this.radius + 2, this.radius - 2);
        ctx.closePath();

        const shipGrad = ctx.createLinearGradient(-this.radius, 0, this.radius, 0);
        shipGrad.addColorStop(0, this.colorDim);
        shipGrad.addColorStop(1, this.color);
        ctx.fillStyle = shipGrad;
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Engine glow
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            ctx.beginPath();
            ctx.moveTo(-this.radius + 5, -5);
            ctx.lineTo(-this.radius - 6 - Math.random() * 6, 0);
            ctx.lineTo(-this.radius + 5, 5);
            ctx.fillStyle = this.isDashing ? '#ffffff' : this.color;
            ctx.globalAlpha = 0.5 + Math.random() * 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Shield
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
            ctx.stroke();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Power-up indicators
        let indicators = [];
        if (this.tripleShot) indicators.push({ label: '3x', color: '#ffd700' });
        if (this.rapidFire) indicators.push({ label: 'RF', color: '#ff00e5' });
        if (this.speedBoost) indicators.push({ label: 'SP', color: '#00f0ff' });

        indicators.forEach((ind, i) => {
            const yOff = this.y - this.radius - 18 - i * 14;
            ctx.font = '700 9px Orbitron';
            ctx.fillStyle = ind.color;
            ctx.textAlign = 'center';
            ctx.fillText(ind.label, this.x, yOff);
        });
    }
}

// ==========================================
// PARTICLES
// ==========================================
function createParticle(x, y, color, life = 0.6) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 200;
    return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: 1.5 + Math.random() * 3,
        color,
    };
}

function spawnExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x, y, color, 0.4 + Math.random() * 0.5));
    }
}

function spawnHitSparks(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(createParticle(x, y, color, 0.2 + Math.random() * 0.2));
    }
}

// ==========================================
// POWER-UPS
// ==========================================
const POWERUP_TYPES = [
    { type: 'speed',     label: '⚡', color: '#00f0ff', bg: 'rgba(0,240,255,0.15)' },
    { type: 'rapidFire', label: '🔥', color: '#ff00e5', bg: 'rgba(255,0,229,0.15)' },
    { type: 'triple',    label: '✦',  color: '#ffd700', bg: 'rgba(255,215,0,0.15)' },
    { type: 'health',    label: '♥',  color: '#00ff88', bg: 'rgba(0,255,136,0.15)' },
];

function spawnPowerup() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const margin = 60;
    powerups.push({
        x: arena.x + margin + Math.random() * (arena.w - margin * 2),
        y: arena.y + margin + Math.random() * (arena.h - margin * 2),
        radius: 14,
        type: type.type,
        label: type.label,
        color: type.color,
        bg: type.bg,
        life: 10,
        bobPhase: Math.random() * Math.PI * 2,
    });
}

function applyPowerup(player, type) {
    audio.powerup();
    const pName = player.id === 0 ? 'P1' : 'P2';
    let msg = '';
    switch (type) {
        case 'speed':
            player.speedBoost = true;
            player.speed = player.baseSpeed * 1.5;
            player.speedBoostTimer = 6;
            msg = `${pName}: SPEED BOOST!`;
            break;
        case 'rapidFire':
            player.rapidFire = true;
            player.shootRate = player.baseShootRate * 0.4;
            player.rapidFireTimer = 5;
            msg = `${pName}: RAPID FIRE!`;
            break;
        case 'triple':
            player.tripleShot = true;
            player.tripleShotTimer = 6;
            msg = `${pName}: TRIPLE SHOT!`;
            break;
        case 'health':
            player.hp = Math.min(player.maxHp, player.hp + 30);
            msg = `${pName}: +30 HP!`;
            break;
    }
    showToast(msg, player.color);
}

function showToast(msg, color) {
    const toast = document.createElement('div');
    toast.className = 'powerup-toast';
    toast.textContent = msg;
    toast.style.background = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
    toast.style.border = `1px solid ${color}`;
    toast.style.color = color;
    toast.style.boxShadow = `0 0 20px ${color}40`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ==========================================
// INPUT HANDLING
// ==========================================
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Escape') {
        if (gameState.phase === 'playing') {
            gameState.phase = 'paused';
            document.getElementById('pauseOverlay').classList.remove('hidden');
        } else if (gameState.phase === 'paused') {
            resumeGame();
        }
    }
    // Prevent default browser behavior for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'NumpadEnter', 'Slash'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (['Enter', 'NumpadEnter', 'Space', 'Slash'].includes(e.code)) {
        e.preventDefault();
    }
});

function handleInput(dt) {
    if (gameState.phase !== 'playing') return;

    // Player 1: WASD + Space(shoot) + Q(shield) + E(dash)
    const p1 = players[0];
    p1.vx = 0;
    p1.vy = 0;
    if (keys['KeyW'] || keys['KeyW']) p1.vy = -1;
    if (keys['KeyS']) p1.vy = 1;
    if (keys['KeyA']) p1.vx = -1;
    if (keys['KeyD']) p1.vx = 1;
    // Normalize
    if (p1.vx !== 0 && p1.vy !== 0) {
        const len = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
        p1.vx /= len;
        p1.vy /= len;
    }
    if (keys['Space']) p1.shoot();
    if (keys['KeyQ']) p1.activateShield();
    if (keys['KeyE']) p1.activateDash();

    // Player 2: Arrows + Enter(shoot) + ShiftRight(shield) + Slash(dash)
    const p2 = players[1];
    p2.vx = 0;
    p2.vy = 0;
    if (keys['ArrowUp']) p2.vy = -1;
    if (keys['ArrowDown']) p2.vy = 1;
    if (keys['ArrowLeft']) p2.vx = -1;
    if (keys['ArrowRight']) p2.vx = 1;
    if (p2.vx !== 0 && p2.vy !== 0) {
        const len = Math.sqrt(p2.vx * p2.vx + p2.vy * p2.vy);
        p2.vx /= len;
        p2.vy /= len;
    }
    if (keys['Enter'] || keys['NumpadEnter']) p2.shoot();
    if (keys['ShiftRight']) p2.activateShield();
    if (keys['Slash']) p2.activateDash();
}

// ==========================================
// COLLISION DETECTION
// ==========================================
function circleCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < a.radius + b.radius;
}

function handleCollisions() {
    // Bullets vs Players
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (const p of players) {
            if (b.owner === p.id) continue;
            if (p.invulnerable > 0) continue;

            const hitRadius = p.shieldActive ? p.radius + 12 : p.radius;
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < hitRadius + b.radius) {
                if (p.shieldActive) {
                    // Deflect
                    spawnHitSparks(b.x, b.y, p.color);
                    audio.shield();
                    bullets.splice(i, 1);
                } else {
                    // Hit!
                    const damage = 12;
                    p.hp -= damage;
                    spawnHitSparks(b.x, b.y, '#ffffff');
                    addScreenShake(4);
                    audio.hit();
                    gameState.stats[b.owner === 0 ? 'p1Hits' : 'p2Hits']++;

                    if (p.hp <= 0) {
                        p.hp = 0;
                        spawnExplosion(p.x, p.y, p.color, 40);
                        addScreenShake(12);
                        audio.explosion();
                        endRound(b.owner);
                    }
                    bullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // Players vs Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pw = powerups[i];
        for (const p of players) {
            if (circleCollision(p, pw)) {
                applyPowerup(p, pw.type);
                spawnExplosion(pw.x, pw.y, pw.color, 12);
                powerups.splice(i, 1);
                break;
            }
        }
    }

    // Player vs Player collision (push apart)
    const p1 = players[0], p2 = players[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = p1.radius + p2.radius;
    if (dist < minDist && dist > 0) {
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        p1.x -= nx * overlap;
        p1.y -= ny * overlap;
        p2.x += nx * overlap;
        p2.y += ny * overlap;
    }
}

// ==========================================
// SCREEN SHAKE
// ==========================================
function addScreenShake(intensity) {
    screenShake.intensity = Math.max(screenShake.intensity, intensity);
}

function updateScreenShake(dt) {
    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.intensity -= dt * 60;
        if (screenShake.intensity < 0) screenShake.intensity = 0;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
    }
}

// ==========================================
// ARENA
// ==========================================
function updateArena() {
    const sizes = [0.65, 0.8, 0.92];
    const scale = sizes[settings.arenaSize];
    const w = gameCanvas.width * scale;
    const h = gameCanvas.height * scale;
    arena.x = (gameCanvas.width - w) / 2;
    arena.y = (gameCanvas.height - h) / 2;
    arena.w = w;
    arena.h = h;
}

function drawArena() {
    // Dark background
    ctx.fillStyle = 'rgba(5, 5, 15, 0.95)';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Arena border glow
    ctx.save();
    ctx.shadowColor = '#4444ff';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = 'rgba(80, 80, 200, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
    ctx.shadowBlur = 0;

    // Grid lines inside arena
    ctx.strokeStyle = 'rgba(60, 60, 120, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = arena.x + gridSize; x < arena.x + arena.w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, arena.y);
        ctx.lineTo(x, arena.y + arena.h);
        ctx.stroke();
    }
    for (let y = arena.y + gridSize; y < arena.y + arena.h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(arena.x, y);
        ctx.lineTo(arena.x + arena.w, y);
        ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(100, 100, 200, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(gameCanvas.width / 2, arena.y);
    ctx.lineTo(gameCanvas.width / 2, arena.y + arena.h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(gameCanvas.width / 2, gameCanvas.height / 2, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 100, 200, 0.1)';
    ctx.stroke();

    ctx.restore();
}

// ==========================================
// DRAWING
// ==========================================
function drawBullets() {
    for (const b of bullets) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        // Bullet trail
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = b.radius * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawPowerups() {
    const time = Date.now() * 0.003;
    for (const pw of powerups) {
        const bob = Math.sin(time + pw.bobPhase) * 4;

        ctx.save();
        ctx.translate(pw.x, pw.y + bob);

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(0, 0, pw.radius + 6 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = pw.color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Background circle
        ctx.beginPath();
        ctx.arc(0, 0, pw.radius, 0, Math.PI * 2);
        ctx.fillStyle = pw.bg;
        ctx.fill();
        ctx.strokeStyle = pw.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon
        ctx.font = '14px sans-serif';
        ctx.fillStyle = pw.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pw.label, 0, 1);

        ctx.restore();
    }
}

// ==========================================
// UPDATE LOOP
// ==========================================
function update(dt) {
    handleInput(dt);

    for (const p of players) p.update(dt);

    // Move bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        // Remove if out of arena or expired
        if (b.life <= 0 || b.x < arena.x - 20 || b.x > arena.x + arena.w + 20 ||
            b.y < arena.y - 20 || b.y > arena.y + arena.h + 20) {
            bullets.splice(i, 1);
        }
    }

    // Move particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Powerup lifetime
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].life -= dt;
        if (powerups[i].life <= 0) powerups.splice(i, 1);
    }

    // Spawn powerups
    const now = Date.now();
    if (now - lastPowerupSpawn > settings.powerupIntervals[settings.powerupFreq] && powerups.length < 3) {
        spawnPowerup();
        lastPowerupSpawn = now;
    }

    handleCollisions();
    updateScreenShake(dt);

    // Round timer
    if (now - gameState.lastTimerTick >= 1000) {
        gameState.roundTimer--;
        gameState.lastTimerTick = now;
        if (gameState.roundTimer <= 0) {
            // Time's up — player with more HP wins
            const winner = players[0].hp >= players[1].hp ? 0 : 1;
            endRound(winner);
        }
    }

    updateHUD();
}

function draw() {
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    drawArena();
    drawPowerups();
    drawBullets();
    for (const p of players) p.draw();
    drawParticles();

    ctx.restore();
}

// ==========================================
// HUD UPDATE
// ==========================================
function updateHUD() {
    const p1 = players[0], p2 = players[1];

    document.getElementById('p1HpBar').style.width = `${(p1.hp / p1.maxHp) * 100}%`;
    document.getElementById('p2HpBar').style.width = `${(p2.hp / p2.maxHp) * 100}%`;
    document.getElementById('p1HpText').textContent = Math.ceil(p1.hp);
    document.getElementById('p2HpText').textContent = Math.ceil(p2.hp);

    // HP bar color when low
    const p1Bar = document.getElementById('p1HpBar');
    const p2Bar = document.getElementById('p2HpBar');
    if (p1.hp < 30) p1Bar.style.background = 'linear-gradient(90deg, #ff3355, #ff6644)';
    else p1Bar.style.background = '';
    if (p2.hp < 30) p2Bar.style.background = 'linear-gradient(90deg, #ff6644, #ff3355)';
    else p2Bar.style.background = '';

    document.getElementById('scoreP1').textContent = gameState.scores[0];
    document.getElementById('scoreP2').textContent = gameState.scores[1];
    document.getElementById('roundText').textContent = `ROUND ${gameState.round}`;

    const mins = Math.floor(gameState.roundTimer / 60);
    const secs = gameState.roundTimer % 60;
    const timerEl = document.getElementById('timerText');
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (gameState.roundTimer <= 10) timerEl.style.color = '#ff3355';
    else timerEl.style.color = '';

    // Ability cooldowns
    const p1Shield = document.getElementById('p1ShieldCd');
    const p1Dash = document.getElementById('p1DashCd');
    const p2Shield = document.getElementById('p2ShieldCd');
    const p2Dash = document.getElementById('p2DashCd');

    p1Shield.className = 'ability-icon ' + (p1.shieldCooldown <= 0 ? 'ready' : 'on-cooldown');
    p1Dash.className = 'ability-icon ' + (p1.dashCooldown <= 0 ? 'ready' : 'on-cooldown');
    p2Shield.className = 'ability-icon ' + (p2.shieldCooldown <= 0 ? 'ready' : 'on-cooldown');
    p2Dash.className = 'ability-icon ' + (p2.dashCooldown <= 0 ? 'ready' : 'on-cooldown');
}

// ==========================================
// GAME FLOW
// ==========================================
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showMenu() {
    gameState.phase = 'menu';
    if (animId) cancelAnimationFrame(animId);
    switchScreen('menuScreen');
}

function showHowTo() {
    switchScreen('howToScreen');
}

function showSettings() {
    switchScreen('settingsScreen');
}

function changeSetting(key, dir) {
    switch (key) {
        case 'rounds':
            settings.roundsToWin = Math.max(1, Math.min(10, settings.roundsToWin + dir));
            document.getElementById('settingRounds').textContent = settings.roundsToWin;
            break;
        case 'arena':
            settings.arenaSize = Math.max(0, Math.min(2, settings.arenaSize + dir));
            document.getElementById('settingArena').textContent = settings.arenaSizeNames[settings.arenaSize];
            break;
        case 'powerups':
            settings.powerupFreq = Math.max(0, Math.min(2, settings.powerupFreq + dir));
            document.getElementById('settingPowerups').textContent = settings.powerupFreqNames[settings.powerupFreq];
            break;
        case 'sound':
            settings.sound = !settings.sound;
            audio.enabled = settings.sound;
            document.getElementById('settingSoundBtn').textContent = settings.sound ? 'ON' : 'OFF';
            break;
    }
}

function startGame() {
    // Remove focus from any button so Enter key doesn't re-trigger it
    if (document.activeElement) document.activeElement.blur();
    audio.init();

    // Read player names
    const n1 = document.getElementById('p1Name').value.trim();
    const n2 = document.getElementById('p2Name').value.trim();
    playerNames[0] = n1 || 'Player 1';
    playerNames[1] = n2 || 'Player 2';

    // Update HUD names
    document.querySelector('.hud-p1 .hud-name').textContent = playerNames[0].toUpperCase();
    document.querySelector('.hud-p2 .hud-name').textContent = playerNames[1].toUpperCase();

    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
    updateArena();

    gameState.round = 1;
    gameState.scores = [0, 0];
    gameState.stats = { p1Shots: 0, p2Shots: 0, p1Hits: 0, p2Hits: 0 };

    players = [
        new Player(0, arena.x + 100, gameCanvas.height / 2, '#00f0ff', '#006680', 'rgba(0, 240, 255, 0.3)'),
        new Player(1, arena.x + arena.w - 100, gameCanvas.height / 2, '#ff00e5', '#800073', 'rgba(255, 0, 229, 0.3)'),
    ];

    switchScreen('gameScreen');
    startRound();
}

function startRound() {
    bullets = [];
    powerups = [];
    particles = [];
    screenShake = { x: 0, y: 0, intensity: 0 };
    lastPowerupSpawn = Date.now() + 3000;
    gameState.roundTimer = 120;
    gameState.lastTimerTick = Date.now();

    players[0].reset(arena.x + 100, gameCanvas.height / 2);
    players[1].reset(arena.x + arena.w - 100, gameCanvas.height / 2);

    // Countdown
    gameState.phase = 'countdown';
    gameState.countdownValue = 3;
    gameState.countdownStart = Date.now();

    const overlay = document.getElementById('roundOverlay');
    const announce = document.getElementById('roundAnnounce');
    overlay.classList.remove('hidden', 'fade-out');
    announce.textContent = `ROUND ${gameState.round}`;

    if (animId) cancelAnimationFrame(animId);
    lastTime = performance.now();
    gameLoop(lastTime);

    // Countdown sequence
    setTimeout(() => {
        announce.textContent = '3';
        audio.countdown();
    }, 800);
    setTimeout(() => {
        announce.textContent = '2';
        audio.countdown();
    }, 1600);
    setTimeout(() => {
        announce.textContent = '1';
        audio.countdown();
    }, 2400);
    setTimeout(() => {
        announce.textContent = 'FIGHT!';
        audio.go();
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.classList.add('hidden'), 500);
        gameState.phase = 'playing';
    }, 3200);
}

function endRound(winnerId) {
    gameState.phase = 'roundEnd';
    gameState.scores[winnerId]++;
    audio.roundWin();

    const overlay = document.getElementById('roundOverlay');
    const announce = document.getElementById('roundAnnounce');
    overlay.classList.remove('hidden', 'fade-out');
    announce.textContent = `PLAYER ${winnerId + 1} WINS!`;

    // Check for match win
    if (gameState.scores[winnerId] >= settings.roundsToWin) {
        setTimeout(() => showVictory(winnerId), 2000);
    } else {
        gameState.round++;
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.classList.add('hidden');
                startRound();
            }, 500);
        }, 2000);
    }
}

function showVictory(winnerId) {
    gameState.phase = 'victory';
    if (animId) cancelAnimationFrame(animId);

    const loserId = winnerId === 0 ? 1 : 0;
    const winnerName = playerNames[winnerId];
    const loserName = playerNames[loserId];

    // Update rankings
    const winnerStats = updatePlayerRanking(winnerName, true);
    updatePlayerRanking(loserName, false);

    // Draw character faces
    const p1Canvas = document.getElementById('p1FaceCanvas');
    const p2Canvas = document.getElementById('p2FaceCanvas');
    drawCharacterFace(p1Canvas, '#00f0ff', '#006680', winnerId === 0);
    drawCharacterFace(p2Canvas, '#ff00e5', '#800073', winnerId === 1);

    // Set winner/loser classes
    const p1Face = document.getElementById('victoryP1Face');
    const p2Face = document.getElementById('victoryP2Face');
    p1Face.className = 'victory-face p1-face ' + (winnerId === 0 ? 'winner' : 'loser');
    p2Face.className = 'victory-face p2-face ' + (winnerId === 1 ? 'winner' : 'loser');

    // Set names and scores
    document.getElementById('victoryP1Name').textContent = playerNames[0];
    document.getElementById('victoryP2Name').textContent = playerNames[1];
    document.getElementById('victoryP1Score').textContent = gameState.scores[0];
    document.getElementById('victoryP2Score').textContent = gameState.scores[1];

    // Title
    const title = document.getElementById('victoryTitle');
    title.textContent = `${winnerName.toUpperCase()} WINS!`;

    // Rank update text
    const rankUpdate = document.getElementById('victoryRankUpdate');
    if (winnerStats) {
        rankUpdate.textContent = `⭐ ${winnerStats.wins} total wins · ${winnerStats.games} games played`;
    } else {
        rankUpdate.textContent = '';
    }

    // Compact stats
    const stats = document.getElementById('victoryStats');
    const accuracy1 = gameState.stats.p1Shots > 0 
        ? Math.round((gameState.stats.p1Hits / gameState.stats.p1Shots) * 100) : 0;
    const accuracy2 = gameState.stats.p2Shots > 0 
        ? Math.round((gameState.stats.p2Hits / gameState.stats.p2Shots) * 100) : 0;

    stats.innerHTML = `
        <div class="stat-card">
            <div class="stat-value" style="color:#00f0ff">${gameState.stats.p1Shots}</div>
            <div class="stat-label">SHOTS</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:#00f0ff">${accuracy1}%</div>
            <div class="stat-label">ACCURACY</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:#ff00e5">${gameState.stats.p2Shots}</div>
            <div class="stat-label">SHOTS</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color:#ff00e5">${accuracy2}%</div>
            <div class="stat-label">ACCURACY</div>
        </div>
    `;

    switchScreen('victoryScreen');
}

function resumeGame() {
    document.getElementById('pauseOverlay').classList.add('hidden');
    gameState.phase = 'playing';
    lastTime = performance.now();
}

function quitToMenu() {
    document.getElementById('pauseOverlay').classList.add('hidden');
    showMenu();
}

// ==========================================
// GAME LOOP
// ==========================================
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (gameState.phase === 'playing') {
        update(dt);
    } else if (gameState.phase === 'countdown' || gameState.phase === 'roundEnd') {
        // Still render but no gameplay
        updateScreenShake(dt);
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    if (gameState.phase !== 'menu' && gameState.phase !== 'victory') {
        draw();
    }

    if (gameState.phase !== 'menu' && gameState.phase !== 'victory') {
        animId = requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// LEADERBOARD
// ==========================================
function showLeaderboard() {
    const content = document.getElementById('leaderboardContent');
    const ranked = getRankedPlayers();

    if (ranked.length === 0) {
        content.innerHTML = '<div class="lb-empty">No battles yet! Play a game to see rankings here.</div>';
    } else {
        let html = '';
        ranked.forEach((p, i) => {
            const rank = i + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
            const rowClass = rank === 1 ? 'gold-rank' : rank === 2 ? 'silver-rank' : rank === 3 ? 'bronze-rank' : '';
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const winRate = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;

            // Create mini avatar canvas
            const avatarId = `lb-avatar-${i}`;

            html += `
                <div class="lb-row ${rowClass}">
                    <div class="lb-rank ${rankClass}">${medal}</div>
                    <canvas class="lb-avatar" id="${avatarId}" width="36" height="36"></canvas>
                    <div class="lb-info">
                        <div class="lb-name">${p.name}</div>
                        <div class="lb-record">${p.wins}W - ${p.losses}L · ${p.games} games</div>
                    </div>
                    <div class="lb-winrate">${winRate}%</div>
                </div>
            `;
        });
        html += '<button class="lb-clear-btn" onclick="clearLeaderboard()">🗑️ CLEAR DATA</button>';
        content.innerHTML = html;

        // Draw mini avatars
        ranked.forEach((p, i) => {
            const canvas = document.getElementById(`lb-avatar-${i}`);
            if (canvas) {
                // Assign color based on common usage, or cycle colors
                const colors = [
                    ['#00f0ff', '#006680'],
                    ['#ff00e5', '#800073'],
                    ['#ffd700', '#997a00'],
                    ['#00ff88', '#009950'],
                    ['#ff6644', '#993d29'],
                    ['#aa77ff', '#6644aa'],
                ];
                const c = colors[i % colors.length];
                drawMiniAvatar(canvas, c[0], c[1]);
            }
        });
    }

    switchScreen('leaderboardScreen');
}

function clearLeaderboard() {
    if (confirm('Clear all leaderboard data?')) {
        clearRankings();
        showLeaderboard();
    }
}

// ==========================================
// EXPOSE FUNCTIONS TO HTML
// ==========================================
window.startGame = startGame;
window.showMenu = showMenu;
window.showHowTo = showHowTo;
window.showSettings = showSettings;
window.changeSetting = changeSetting;
window.resumeGame = resumeGame;
window.quitToMenu = quitToMenu;
window.showLeaderboard = showLeaderboard;
window.clearLeaderboard = clearLeaderboard;
