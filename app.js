/* ── CONFIG ──────────────────────────────────────────── */
const FRAME_COUNT   = 234;
const LERP_FACTOR   = 0.09;   // Lower = silkier scrub
const SCROLL_HEIGHT = 550;    // vh — controls how long the cinematic zone lasts

/* ── STATE ───────────────────────────────────────────── */
const images      = new Array(FRAME_COUNT);
let loadedCount   = 0;
let currentFrame  = 1;
let targetFrame   = 1;
let rafRunning    = false;

/* ── DOM REFS ────────────────────────────────────────── */
const canvas      = document.getElementById('scroll-canvas');
const ctx         = canvas.getContext('2d', { alpha: false });
const preloader   = document.getElementById('preloader');
const ringFg      = document.getElementById('ring-fg');
const pctText     = document.getElementById('pct-text');
const progressBar = document.getElementById('scroll-progress-bar');
const frameHud    = document.getElementById('frame-hud');
const hudNum      = document.getElementById('hud-num');
const soundBtn    = document.getElementById('sound-btn');
const wrapper     = document.querySelector('.scroll-experience-wrapper');
const panels      = document.querySelectorAll('.story-panel');
const navEl       = document.getElementById('main-nav');

/* ── FRAME PATH ──────────────────────────────────────── */
const framePath = (i) =>
    `frames/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;

/* ── PRELOAD ─────────────────────────────────────────── */
function preloadImages() {
    const CIRC = 283; // 2π × 45

    for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.src = framePath(i);
        img.onload  = () => onImageLoaded(i - 1, CIRC);
        img.onerror = () => onImageLoaded(i - 1, CIRC); // still count so we don't deadlock
        images[i - 1] = img;
    }
}

function onImageLoaded(idx, CIRC) {
    loadedCount++;
    const pct = loadedCount / FRAME_COUNT;
    if (ringFg)   ringFg.style.strokeDashoffset = CIRC - CIRC * pct;
    if (pctText)  pctText.textContent = Math.floor(pct * 100) + '%';

    if (loadedCount === FRAME_COUNT) onAllLoaded();
}

function onAllLoaded() {
    setTimeout(() => {
        preloader.classList.add('done');
        resizeCanvas();
        if (!rafRunning) { rafRunning = true; requestAnimationFrame(loop); }
    }, 500);
}

/* ── CANVAS RENDER ───────────────────────────────────── */
function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(Math.round(currentFrame));
}

function drawFrame(frameIdx) {
    const img = images[frameIdx - 1];
    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = canvas.width,  ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
}

/* ── MAIN RAF LOOP ───────────────────────────────────── */
function loop() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.05) {
        currentFrame += diff * LERP_FACTOR;
    } else {
        currentFrame = targetFrame;
    }

    drawFrame(Math.round(currentFrame));
    updatePanels(Math.round(currentFrame));
    updateHUD(Math.round(currentFrame));
    requestAnimationFrame(loop);
}

/* ── SCROLL HANDLER ──────────────────────────────────── */
function onScroll() {
    const scrollY      = window.scrollY;
    const wrapTop      = wrapper.offsetTop;
    const wrapH        = wrapper.offsetHeight;
    const maxScroll    = wrapH - window.innerHeight;
    const relative     = Math.max(0, Math.min(maxScroll, scrollY - wrapTop));
    const fraction     = maxScroll > 0 ? relative / maxScroll : 0;

    // Map scroll fraction → frame index
    targetFrame = Math.max(1, Math.min(FRAME_COUNT, Math.round(fraction * (FRAME_COUNT - 1)) + 1));

    // Global progress bar (entire page)
    const pageMax = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = (scrollY / pageMax * 100) + '%';

    // Nav shadow
    if (navEl) navEl.classList.toggle('scrolled', scrollY > 30);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', resizeCanvas);

/* ── STORY PANELS ────────────────────────────────────── */
const PANEL_RANGES = [
    { id: 'panel-0', start: 1,   end: 55 },
    { id: 'panel-1', start: 65,  end: 120 },
    { id: 'panel-2', start: 130, end: 185 },
    { id: 'panel-3', start: 195, end: 234 },
];

let activePanel = -1;

function updatePanels(frame) {
    let nowActive = -1;
    PANEL_RANGES.forEach((r, i) => {
        if (frame >= r.start && frame <= r.end) nowActive = i;
    });

    if (nowActive !== activePanel) {
        panels.forEach((p, i) => {
            p.classList.remove('is-active', 'is-exit');
            if (i === nowActive) {
                p.classList.add('is-active');
            } else if (i === activePanel) {
                p.classList.add('is-exit');
                setTimeout(() => p.classList.remove('is-exit'), 750);
            }
        });
        activePanel = nowActive;
    }

    // HUD visibility
    frameHud.classList.toggle('visible', frame > 1 && frame < FRAME_COUNT);
}

/* ── HUD ─────────────────────────────────────────────── */
function updateHUD(frame) {
    if (hudNum) hudNum.textContent = String(frame).padStart(3, '0');
}

/* ── SOUND (Web Audio) ───────────────────────────────── */
let audioCtx = null, gainNode = null, filterNode = null, soundOn = false;

function buildAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o1 = audioCtx.createOscillator();
        const o2 = audioCtx.createOscillator();
        filterNode = audioCtx.createBiquadFilter();
        gainNode   = audioCtx.createGain();

        o1.type = 'triangle'; o1.frequency.value = 110;
        o2.type = 'sine';     o2.frequency.value = 165;
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 400;
        filterNode.Q.value = 3;
        gainNode.gain.value = 0;

        o1.connect(filterNode); o2.connect(filterNode);
        filterNode.connect(gainNode); gainNode.connect(audioCtx.destination);
        o1.start(); o2.start();
    } catch(e) { console.warn('Audio unavailable', e); }
}

soundBtn.addEventListener('click', () => {
    buildAudio();
    if (!audioCtx) return;
    if (soundOn) {
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.25);
        soundBtn.classList.add('muted');
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        gainNode.gain.setTargetAtTime(0.18, audioCtx.currentTime, 0.5);
        soundBtn.classList.remove('muted');
    }
    soundOn = !soundOn;
});

/* ── CUSTOM CURSOR ───────────────────────────────────── */
const dot  = document.getElementById('cursor-dot');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function cursorRaf() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    if (dot)  { dot.style.left  = mx + 'px'; dot.style.top  = my + 'px'; }
    if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
    requestAnimationFrame(cursorRaf);
})();

document.querySelectorAll('button, a, .squish, .panel-cta').forEach(el => {
    el.addEventListener('mouseenter', () => ring && ring.classList.add('expanded'));
    el.addEventListener('mouseleave', () => ring && ring.classList.remove('expanded'));
});

/* ── SCROLL REVEAL (product page) ───────────────────── */
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('in');
            revealObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── EXPLORE CTA ─────────────────────────────────────── */
const exploreBtn = document.getElementById('explore-btn');
if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
        document.getElementById('product-page').scrollIntoView({ behavior: 'smooth' });
    });
}

/* ── SMOOTH ANCHOR LINKS ─────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
});

/* ── BOOT ────────────────────────────────────────────── */
window.addEventListener('load', preloadImages);

