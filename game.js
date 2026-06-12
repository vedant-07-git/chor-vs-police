/* =========================================================
   CHOR VS POLICE — GAME LOGIC
   Organized in clearly-labeled sections so it's easy to
   extend later (new obstacle types, power-ups, levels...).
   ========================================================= */

(() => {
  'use strict';

  /* ======================================================
     1. CONFIGURATION — tweak these to rebalance the game
     ====================================================== */
  const CONFIG = {
    MAX_LEVEL: 6,                 // reach this level to win the game
    BASE_LEVEL_TIME: 30,          // seconds available on level 1
    MIN_LEVEL_TIME: 16,           // timer never drops below this
    LEVEL_TIME_STEP: 2,           // seconds removed per level

    POLICE_MIN_SPEED: 1,
    POLICE_MAX_SPEED: 9,
    POLICE_ACCEL: 9,              // units/sec^2 while accelerating
    POLICE_FRICTION: 6,           // units/sec^2 natural slow-down

    BOOST_BONUS: 3.5,             // extra speed while boosting
    BOOST_DURATION: 1.3,          // seconds
    BOOST_COOLDOWN: 4,            // seconds before boost can be used again

    THIEF_BASE_SPEED: 2.5,        // thief speed at level 1
    THIEF_LEVEL_STEP: 0.8,        // extra base speed per level
    THIEF_RAMP_RATE: 0.18,        // how fast thief speeds up during a level
    THIEF_RAMP_CAP: 2.5,          // max extra speed gained from ramping

    GAP_START: 60,                // starting gap (0-100 scale) each level
    GAP_SCALE: 4,                 // how fast the gap closes per speed unit
    CATCH_THRESHOLD: 4,           // gap value that counts as "caught"

    POLICE_LEFT_PCT: 9,           // fixed horizontal position of police (%)
    THIEF_MIN_PCT: 14,            // thief position when gap is 0
    THIEF_MAX_PCT: 90,            // thief position when gap is 100

    OBSTACLE_MIN_GAP: 1.4,        // seconds between obstacle spawns (min)
    OBSTACLE_MAX_GAP: 3.0,
    COIN_MIN_GAP: 1.8,
    COIN_MAX_GAP: 3.6,

    OBSTACLE_HIT_SLOWDOWN: 0.45,  // multiply police speed on hit
    OBSTACLE_STUN_TIME: 1.1,      // seconds of reduced max speed after hit
    COIN_BONUS: 15,
    CATCH_BASE_SCORE: 50,
    CATCH_LEVEL_BONUS: 10,

    SCROLL_SCALE: 6,              // visual road scroll speed multiplier
  };

  const OBSTACLE_EMOJIS = ['🚧', '🪨', '🛢️', '🐾'];
  const COIN_EMOJI = '🪙';

  /* ======================================================
     2. DOM REFERENCES
     ====================================================== */
  const dom = {
    gameArea: document.getElementById('gameArea'),
    sceneryTrack: document.getElementById('sceneryTrack'),
    roadTrack: document.getElementById('roadTrack'),
    itemsLayer: document.getElementById('itemsLayer'),
    thief: document.getElementById('thief'),
    police: document.getElementById('police'),
    flash: document.getElementById('flash'),

    scoreValue: document.getElementById('scoreValue'),
    levelValue: document.getElementById('levelValue'),
    timerValue: document.getElementById('timerValue'),
    highScoreValue: document.getElementById('highScoreValue'),
    timerStat: document.querySelector('.stat--timer'),

    gapFill: document.getElementById('gapFill'),
    gapMarker: document.getElementById('gapMarker'),
    policeSpeedFill: document.getElementById('policeSpeedFill'),
    thiefSpeedFill: document.getElementById('thiefSpeedFill'),

    startScreen: document.getElementById('startScreen'),
    pauseScreen: document.getElementById('pauseScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    victoryScreen: document.getElementById('victoryScreen'),
    levelToast: document.getElementById('levelToast'),
    levelToastText: document.getElementById('levelToastText'),

    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    finalHigh: document.getElementById('finalHigh'),
    gameOverText: document.getElementById('gameOverText'),
    victoryScore: document.getElementById('victoryScore'),
    victoryHigh: document.getElementById('victoryHigh'),

    startBtn: document.getElementById('startBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    restartBtn: document.getElementById('restartBtn'),
    restartFromPauseBtn: document.getElementById('restartFromPauseBtn'),
    restartFromGameOverBtn: document.getElementById('restartFromGameOverBtn'),
    restartFromVictoryBtn: document.getElementById('restartFromVictoryBtn'),
    muteBtn: document.getElementById('muteBtn'),

    slowBtn: document.getElementById('slowBtn'),
    fastBtn: document.getElementById('fastBtn'),
    boostBtn: document.getElementById('boostBtn'),
  };

  /* ======================================================
     3. PERSISTENT HIGH SCORE (with safe fallback)
     ====================================================== */
  const Storage = {
    key: 'chorVsPoliceHighScore',
    memoryFallback: 0,

    get() {
      try {
        const v = localStorage.getItem(this.key);
        return v ? parseInt(v, 10) || 0 : 0;
      } catch (e) {
        return this.memoryFallback;
      }
    },

    set(value) {
      try {
        localStorage.setItem(this.key, String(value));
      } catch (e) {
        this.memoryFallback = value;
      }
    },
  };

  /* ======================================================
     4. AUDIO — tiny synthesized sound effects
     ====================================================== */
  const Audio = {
    ctx: null,
    muted: false,

    ensureCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    tone(freq, duration, type = 'sine', volume = 0.2, delay = 0) {
      if (this.muted) return;
      this.ensureCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(this.ctx.destination);
      const startAt = this.ctx.currentTime + delay;
      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    },

    siren() {
      // two-tone alternating siren, classic police sound
      this.tone(880, 0.25, 'sawtooth', 0.12, 0);
      this.tone(660, 0.25, 'sawtooth', 0.12, 0.25);
      this.tone(880, 0.25, 'sawtooth', 0.12, 0.5);
    },

    catchSound() {
      // happy rising arpeggio
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.15, i * 0.08));
    },

    coinSound() {
      this.tone(988, 0.08, 'square', 0.12, 0);
      this.tone(1318, 0.12, 'square', 0.12, 0.06);
    },

    crashSound() {
      this.tone(140, 0.25, 'sawtooth', 0.18, 0);
      this.tone(90, 0.3, 'square', 0.15, 0.05);
    },

    boostSound() {
      this.tone(440, 0.1, 'sawtooth', 0.1, 0);
      this.tone(880, 0.15, 'sawtooth', 0.1, 0.08);
    },

    gameOverSound() {
      [392, 349, 294, 220].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.15, i * 0.18));
    },

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    },
  };

  /* ======================================================
     5. GAME STATE
     ====================================================== */
  const state = {
    mode: 'idle',          // idle | playing | paused | gameover | victory
    score: 0,
    level: 1,
    timer: CONFIG.BASE_LEVEL_TIME,

    policeSpeed: CONFIG.POLICE_MIN_SPEED + 1,
    thiefSpeed: CONFIG.THIEF_BASE_SPEED,
    gap: CONFIG.GAP_START,
    levelElapsed: 0,

    keys: { up: false, down: false },
    boostActive: false,
    boostTimeLeft: 0,
    boostCooldownLeft: 0,
    stunTimeLeft: 0,

    scrollOffset: 0,        // accumulated road scroll (px)
    items: [],              // active obstacles & coins
    nextObstacleIn: 1.5,
    nextCoinIn: 2,

    lastTimestamp: null,
    rafId: null,
    sirenTimer: 0,
  };

  /* ======================================================
     6. UTILITIES
     ====================================================== */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  function levelTime(level) {
    return Math.max(CONFIG.MIN_LEVEL_TIME, CONFIG.BASE_LEVEL_TIME - (level - 1) * CONFIG.LEVEL_TIME_STEP);
  }

  function thiefBaseSpeed(level) {
    return CONFIG.THIEF_BASE_SPEED + (level - 1) * CONFIG.THIEF_LEVEL_STEP;
  }

  /* ======================================================
     7. INPUT HANDLING
     ====================================================== */
  function setKey(name, value) {
    state.keys[name] = value;
  }

  function tryBoost() {
    if (state.mode !== 'playing') return;
    if (state.boostCooldownLeft > 0 || state.boostActive) return;
    state.boostActive = true;
    state.boostTimeLeft = CONFIG.BOOST_DURATION;
    dom.police.classList.add('boosting');
    Audio.boostSound();
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKey('up', true);
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        setKey('down', true);
        e.preventDefault();
        break;
      case 'Space':
        tryBoost();
        e.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKey('up', false);
        break;
      case 'KeyS':
      case 'ArrowDown':
        setKey('down', false);
        break;
    }
  });

  // Touch / on-screen buttons (also work with mouse for desktop)
  function bindHoldButton(el, onPress, onRelease) {
    const press = (e) => { e.preventDefault(); el.classList.add('pressed'); onPress(); };
    const release = (e) => { e.preventDefault(); el.classList.remove('pressed'); onRelease && onRelease(); };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
  }

  bindHoldButton(dom.fastBtn, () => setKey('up', true), () => setKey('up', false));
  bindHoldButton(dom.slowBtn, () => setKey('down', true), () => setKey('down', false));
  bindHoldButton(dom.boostBtn, () => tryBoost());

  /* ======================================================
     8. ITEM SPAWNING (obstacles & coins)
     ====================================================== */
  function spawnItem(type) {
    const el = document.createElement('div');
    el.className = `item item--${type}`;
    el.textContent = type === 'coin'
      ? COIN_EMOJI
      : OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];

    // Vertical position: keep items on the road area (lower half)
    const topPct = rand(58, 82);
    el.style.top = `${topPct}%`;
    el.style.left = '104%';

    dom.itemsLayer.appendChild(el);

    state.items.push({
      type,
      el,
      x: 104,        // percent across the game area
      collected: false,
    });
  }

  function clearItems() {
    state.items.forEach((item) => item.el.remove());
    state.items = [];
  }

  /* ======================================================
     9. CORE UPDATE LOOP
     ====================================================== */
  function update(dt) {
    updatePoliceSpeed(dt);
    updateThiefSpeed(dt);
    updateGap(dt);
    updateTimer(dt);
    updateScrolling(dt);
    updateItems(dt);
    updateBoostAndStun(dt);
  }

  function updatePoliceSpeed(dt) {
    const effectiveMax = state.stunTimeLeft > 0
      ? CONFIG.POLICE_MAX_SPEED * 0.55
      : CONFIG.POLICE_MAX_SPEED;

    if (state.keys.up) {
      state.policeSpeed += CONFIG.POLICE_ACCEL * dt;
    } else if (state.keys.down) {
      state.policeSpeed -= CONFIG.POLICE_ACCEL * dt;
    } else {
      // natural friction pulls speed toward a comfortable cruising speed
      const cruise = (CONFIG.POLICE_MIN_SPEED + effectiveMax) / 2.4;
      if (state.policeSpeed > cruise) {
        state.policeSpeed -= CONFIG.POLICE_FRICTION * dt;
        state.policeSpeed = Math.max(state.policeSpeed, cruise);
      } else if (state.policeSpeed < cruise) {
        state.policeSpeed += CONFIG.POLICE_FRICTION * 0.5 * dt;
        state.policeSpeed = Math.min(state.policeSpeed, cruise);
      }
    }

    state.policeSpeed = clamp(state.policeSpeed, CONFIG.POLICE_MIN_SPEED, effectiveMax);
  }

  function updateThiefSpeed(dt) {
    state.levelElapsed += dt;
    const ramp = Math.min(state.levelElapsed * CONFIG.THIEF_RAMP_RATE, CONFIG.THIEF_RAMP_CAP);
    state.thiefSpeed = thiefBaseSpeed(state.level) + ramp;
  }

  function updateGap(dt) {
    let displaySpeed = state.policeSpeed;
    if (state.boostActive) displaySpeed += CONFIG.BOOST_BONUS;

    state.gap += (state.thiefSpeed - displaySpeed) * dt * CONFIG.GAP_SCALE;
    state.gap = clamp(state.gap, 0, 100);

    if (state.gap <= CONFIG.CATCH_THRESHOLD) {
      handleCatch();
    }
  }

  function updateTimer(dt) {
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 0;
      handleTimeUp();
    }
  }

  function updateScrolling(dt) {
    let speed = state.policeSpeed;
    if (state.boostActive) speed += CONFIG.BOOST_BONUS;
    state.scrollOffset += speed * dt * CONFIG.SCROLL_SCALE;

    // Road dashes scroll fast; scenery scrolls slower for a parallax feel
    dom.roadTrack.style.transform = `translateX(${-(state.scrollOffset % 200)}%)`;
    dom.sceneryTrack.style.transform = `translateX(${-(state.scrollOffset * 0.35 % 100)}%)`;
  }

  function updateItems(dt) {
    let speed = state.policeSpeed;
    if (state.boostActive) speed += CONFIG.BOOST_BONUS;
    const moveAmount = speed * dt * 3.2; // percent per second, scaled

    // Spawn timers
    state.nextObstacleIn -= dt;
    if (state.nextObstacleIn <= 0) {
      spawnItem('obstacle');
      state.nextObstacleIn = rand(CONFIG.OBSTACLE_MIN_GAP, CONFIG.OBSTACLE_MAX_GAP);
    }

    state.nextCoinIn -= dt;
    if (state.nextCoinIn <= 0) {
      spawnItem('coin');
      state.nextCoinIn = rand(CONFIG.COIN_MIN_GAP, CONFIG.COIN_MAX_GAP);
    }

    // Move & collide
    const policeCenter = CONFIG.POLICE_LEFT_PCT + 4; // approx center of car emoji
    for (let i = state.items.length - 1; i >= 0; i--) {
      const item = state.items[i];
      item.x -= moveAmount;
      item.el.style.left = `${item.x}%`;

      if (!item.collected && Math.abs(item.x - policeCenter) < 5) {
        if (item.type === 'obstacle') {
          handleObstacleHit(item);
        } else {
          handleCoinCollected(item);
        }
      }

      if (item.x < -10) {
        item.el.remove();
        state.items.splice(i, 1);
      }
    }
  }

  function updateBoostAndStun(dt) {
    if (state.boostActive) {
      state.boostTimeLeft -= dt;
      if (state.boostTimeLeft <= 0) {
        state.boostActive = false;
        state.boostCooldownLeft = CONFIG.BOOST_COOLDOWN;
        dom.police.classList.remove('boosting');
      }
    } else if (state.boostCooldownLeft > 0) {
      state.boostCooldownLeft -= dt;
    }

    if (state.stunTimeLeft > 0) {
      state.stunTimeLeft -= dt;
    }
  }

  /* ======================================================
     10. EVENT HANDLERS (catch, hit, coin, time up)
     ====================================================== */
  function handleObstacleHit(item) {
    item.collected = true;
    item.el.remove();
    state.items.splice(state.items.indexOf(item), 1);

    state.policeSpeed *= CONFIG.OBSTACLE_HIT_SLOWDOWN;
    state.stunTimeLeft = CONFIG.OBSTACLE_STUN_TIME;

    dom.police.classList.remove('hit');
    void dom.police.offsetWidth; // restart animation
    dom.police.classList.add('hit');

    flashScreen('hit-flash');
    Audio.crashSound();
  }

  function handleCoinCollected(item) {
    item.collected = true;
    item.el.remove();
    state.items.splice(state.items.indexOf(item), 1);

    state.score += CONFIG.COIN_BONUS;
    Audio.coinSound();
    updateHud();
  }

  function handleCatch() {
    if (state.mode !== 'playing') return;

    state.score += CONFIG.CATCH_BASE_SCORE + state.level * CONFIG.CATCH_LEVEL_BONUS;
    Audio.catchSound();
    flashScreen('catch-flash');

    dom.thief.classList.add('caught');

    if (state.level >= CONFIG.MAX_LEVEL) {
      stopLoop();
      setTimeout(() => showVictory(), 500);
      return;
    }

    state.level += 1;
    showLevelToast(`🎉 Caught! Level ${state.level}`);

    setTimeout(() => {
      dom.thief.classList.remove('caught');
      startLevel(false);
    }, 550);

    // Pause the gap-closing briefly during the catch animation
    state.mode = 'levelTransition';
    setTimeout(() => { if (state.mode === 'levelTransition') state.mode = 'playing'; }, 600);
  }

  function handleTimeUp() {
    if (state.mode !== 'playing') return;
    stopLoop();
    Audio.gameOverSound();
    showGameOver();
  }

  function flashScreen(className) {
    dom.flash.classList.remove('hit-flash', 'catch-flash');
    void dom.flash.offsetWidth;
    dom.flash.classList.add(className);
  }

  function showLevelToast(text) {
    dom.levelToastText.textContent = text;
    dom.levelToast.classList.remove('hidden');
    void dom.levelToast.offsetWidth;
    dom.levelToast.style.animation = 'none';
    void dom.levelToast.offsetWidth;
    dom.levelToast.style.animation = '';
    setTimeout(() => dom.levelToast.classList.add('hidden'), 1600);
  }

  /* ======================================================
     11. RENDERING
     ====================================================== */
  function render() {
    // Thief horizontal position based on gap
    const thiefPct = CONFIG.THIEF_MIN_PCT + (state.gap / 100) * (CONFIG.THIEF_MAX_PCT - CONFIG.THIEF_MIN_PCT);
    dom.thief.style.left = `${thiefPct}%`;
    dom.police.style.left = `${CONFIG.POLICE_LEFT_PCT}%`;

    // Gap meter: fill shrinks as gap closes (full = thief far away)
    dom.gapFill.style.transform = `scaleX(${state.gap / 100})`;
    dom.gapMarker.style.left = `calc(${state.gap}% - 2px)`;

    // Speed gauges
    const policeMax = CONFIG.POLICE_MAX_SPEED + CONFIG.BOOST_BONUS;
    const policeDisplaySpeed = state.policeSpeed + (state.boostActive ? CONFIG.BOOST_BONUS : 0);
    dom.policeSpeedFill.style.width = `${clamp((policeDisplaySpeed / policeMax) * 100, 0, 100)}%`;

    const thiefMax = thiefBaseSpeed(CONFIG.MAX_LEVEL) + CONFIG.THIEF_RAMP_CAP;
    dom.thiefSpeedFill.style.width = `${clamp((state.thiefSpeed / thiefMax) * 100, 0, 100)}%`;

    updateHud();
  }

  function updateHud() {
    dom.scoreValue.textContent = state.score;
    dom.levelValue.textContent = state.level;
    dom.timerValue.textContent = Math.ceil(state.timer);
    dom.highScoreValue.textContent = Storage.get();

    if (state.timer <= 8) {
      dom.timerStat.classList.add('low-time');
    } else {
      dom.timerStat.classList.remove('low-time');
    }
  }

  /* ======================================================
     12. GAME LOOP
     ====================================================== */
  function loop(timestamp) {
    if (state.lastTimestamp === null) state.lastTimestamp = timestamp;
    let dt = (timestamp - state.lastTimestamp) / 1000;
    dt = Math.min(dt, 0.05); // clamp to avoid huge jumps after tab-switch
    state.lastTimestamp = timestamp;

    if (state.mode === 'playing' || state.mode === 'levelTransition') {
      if (state.mode === 'playing') update(dt);
      else {
        // During the brief catch animation, keep visuals/timers moving
        // but don't allow a re-catch or new gap closure.
        updateTimer(dt);
        updateScrolling(dt);
      }
      render();

      // Occasional siren flavor sound while chasing
      state.sirenTimer -= dt;
      if (state.sirenTimer <= 0) {
        state.sirenTimer = rand(6, 11);
        Audio.siren();
      }
    }

    state.rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (state.rafId === null) {
      state.lastTimestamp = null;
      state.rafId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  /* ======================================================
     13. GAME FLOW (start, level, pause, restart, end)
     ====================================================== */
  function startLevel(resetScore) {
    state.gap = CONFIG.GAP_START;
    state.timer = levelTime(state.level);
    state.levelElapsed = 0;
    state.thiefSpeed = thiefBaseSpeed(state.level);
    state.boostActive = false;
    state.boostTimeLeft = 0;
    state.boostCooldownLeft = 0;
    state.stunTimeLeft = 0;
    state.policeSpeed = CONFIG.POLICE_MIN_SPEED + 1;
    state.nextObstacleIn = rand(CONFIG.OBSTACLE_MIN_GAP, CONFIG.OBSTACLE_MAX_GAP);
    state.nextCoinIn = rand(CONFIG.COIN_MIN_GAP, CONFIG.COIN_MAX_GAP);
    state.sirenTimer = rand(2, 5);
    clearItems();
    dom.police.classList.remove('boosting', 'hit');

    if (resetScore) {
      state.score = 0;
      state.level = 1;
      state.timer = levelTime(1);
    }

    updateHud();
    render();
  }

  function startGame() {
    Audio.ensureCtx();
    hideAllOverlays();
    state.mode = 'playing';
    state.score = 0;
    state.level = 1;
    startLevel(false);
    Audio.siren();
    startLoop();
  }

  function restartGame() {
    stopLoop();
    hideAllOverlays();
    state.mode = 'playing';
    startLevel(true);
    startLoop();
  }

  function pauseGame() {
    if (state.mode !== 'playing' && state.mode !== 'levelTransition') return;
    state.mode = 'paused';
    dom.pauseScreen.classList.remove('hidden');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    state.lastTimestamp = null;
    dom.pauseScreen.classList.add('hidden');
  }

  function showGameOver() {
    state.mode = 'gameover';
    const high = Math.max(Storage.get(), state.score);
    Storage.set(high);

    dom.finalScore.textContent = state.score;
    dom.finalLevel.textContent = state.level;
    dom.finalHigh.textContent = high;
    dom.gameOverText.textContent = state.gap > 50
      ? "The thief vanished into the distance!"
      : "So close! The thief slipped away just in time.";

    dom.gameOverScreen.classList.remove('hidden');
    updateHud();
  }

  function showVictory() {
    state.mode = 'victory';
    const high = Math.max(Storage.get(), state.score);
    Storage.set(high);

    dom.victoryScore.textContent = state.score;
    dom.victoryHigh.textContent = high;
    dom.victoryScreen.classList.remove('hidden');
    updateHud();
  }

  function hideAllOverlays() {
    [dom.startScreen, dom.pauseScreen, dom.gameOverScreen, dom.victoryScreen]
      .forEach((el) => el.classList.add('hidden'));
    dom.levelToast.classList.add('hidden');
  }

  /* ======================================================
     14. BUTTON BINDINGS
     ====================================================== */
  dom.startBtn.addEventListener('click', startGame);
  dom.pauseBtn.addEventListener('click', () => {
    if (state.mode === 'paused') resumeGame();
    else pauseGame();
  });
  dom.resumeBtn.addEventListener('click', resumeGame);
  dom.restartBtn.addEventListener('click', restartGame);
  dom.restartFromPauseBtn.addEventListener('click', restartGame);
  dom.restartFromGameOverBtn.addEventListener('click', restartGame);
  dom.restartFromVictoryBtn.addEventListener('click', restartGame);

  dom.muteBtn.addEventListener('click', () => {
    const muted = Audio.toggleMute();
    dom.muteBtn.textContent = muted ? '🔇' : '🔊';
  });

  /* ======================================================
     15. INIT
     ====================================================== */
  function init() {
    dom.highScoreValue.textContent = Storage.get();
    state.level = 1;
    state.timer = levelTime(1);
    updateHud();
    render();
  }

  init();
})();
