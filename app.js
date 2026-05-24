/* ══════════════════════════════════════════════════════
   AMULSPRAY ROSE — app.js  v3.0
   Complete rewrite: fixed scroll scrubbing, preloader,
   panels, cursor, reveal, audio
══════════════════════════════════════════════════════ */

'use strict';

/* ── CONFIG ─────────────────────────────────────────── */
const FRAME_COUNT   = 234;
const LERP_FACTOR   = 0.08;   // smoothness (lower = silkier)

/* ── STATE ──────────────────────────────────────────── */
const images    = new Array(FRAME_COUNT);
let loadedCount = 0;
let currentFrame = 1;
let targetFrame  = 1;
let rafId        = null;

/* ── DOM ────────────────────────────────────────────── */
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

/* ── FRAME PATH ─────────────────────────────────────── */
const framePath = i =>
  `frames/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;

/* ══════════════════════════════════════════════════════
   PRELOAD
══════════════════════════════════════════════════════ */
function preloadImages() {
  const CIRC = 283;

  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = 'async';
    images[i - 1] = img;
    img.onload  = () => tick(CIRC);
    img.onerror = () => tick(CIRC);
    img.src = framePath(i);
  }
}

function tick(CIRC) {
  loadedCount++;
  const pct = loadedCount / FRAME_COUNT;
  const offset = CIRC - CIRC * pct;
  if (ringFg)  ringFg.style.strokeDashoffset = offset;
  if (pctText) pctText.textContent = Math.floor(pct * 100) + '%';

  if (loadedCount === FRAME_COUNT) onAllLoaded();
}

function onAllLoaded() {
  // Short pause so user sees 100%
  setTimeout(() => {
    preloader.classList.add('done');
    resizeCanvas();
    startLoop();
    // Draw first frame immediately
    drawFrame(1);
  }, 600);
}

/* ══════════════════════════════════════════════════════
   CANVAS
══════════════════════════════════════════════════════ */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  drawFrame(Math.round(currentFrame));
}

function drawFrame(idx) {
  const i = Math.max(1, Math.min(FRAME_COUNT, idx));
  const img = images[i - 1];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cw = canvas.width,  ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;

  // Cover fit
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ══════════════════════════════════════════════════════
   RAF LOOP
══════════════════════════════════════════════════════ */
function startLoop() {
  if (rafId) return;
  function loop() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.04) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    const rounded = Math.round(currentFrame);
    drawFrame(rounded);
    updatePanels(rounded);
    updateHUD(rounded);

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

/* ══════════════════════════════════════════════════════
   SCROLL
══════════════════════════════════════════════════════ */
function onScroll() {
  const scrollY   = window.scrollY;
  const wrapTop   = wrapper.offsetTop;
  const wrapH     = wrapper.offsetHeight;
  const maxScroll = wrapH - window.innerHeight;
  const relative  = Math.max(0, Math.min(maxScroll, scrollY - wrapTop));
  const fraction  = maxScroll > 0 ? relative / maxScroll : 0;

  targetFrame = Math.max(1, Math.min(FRAME_COUNT,
    Math.round(fraction * (FRAME_COUNT - 1)) + 1));

  // Progress bar
  const pageMax = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.width = (scrollY / pageMax * 100) + '%';

  // Nav
  if (navEl) navEl.classList.toggle('scrolled', scrollY > 50);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', resizeCanvas);

/* ══════════════════════════════════════════════════════
   STORY PANELS
══════════════════════════════════════════════════════ */
const PANEL_RANGES = [
  { el: document.getElementById('panel-0'), start: 1,   end: 58  },
  { el: document.getElementById('panel-1'), start: 68,  end: 122 },
  { el: document.getElementById('panel-2'), start: 132, end: 188 },
  { el: document.getElementById('panel-3'), start: 198, end: 234 },
];

let activePanel = -1;

function updatePanels(frame) {
  let nowActive = -1;
  PANEL_RANGES.forEach((r, i) => {
    if (frame >= r.start && frame <= r.end) nowActive = i;
  });

  if (nowActive !== activePanel) {
    PANEL_RANGES.forEach((r, i) => {
      if (!r.el) return;
      r.el.classList.remove('is-active', 'is-exit');
      if (i === nowActive) {
        r.el.classList.add('is-active');
      } else if (i === activePanel) {
        r.el.classList.add('is-exit');
        const el = r.el;
        setTimeout(() => el.classList.remove('is-exit'), 700);
      }
    });
    activePanel = nowActive;
  }

  // HUD visibility
  if (frameHud) {
    frameHud.classList.toggle('visible', frame > 1 && frame < FRAME_COUNT);
  }
}

/* ══════════════════════════════════════════════════════
   HUD
══════════════════════════════════════════════════════ */
function updateHUD(frame) {
  if (hudNum) hudNum.textContent = String(frame).padStart(3, '0');
}

/* ══════════════════════════════════════════════════════
   SOUND (Web Audio)
══════════════════════════════════════════════════════ */
let audioCtx = null, gainNode = null, soundOn = false;

function buildAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    gainNode = audioCtx.createGain();

    o1.type = 'triangle'; o1.frequency.value = 110;
    o2.type = 'sine';     o2.frequency.value = 164.8;
    filter.type = 'lowpass'; filter.frequency.value = 380; filter.Q.value = 4;
    gainNode.gain.value = 0;

    o1.connect(filter); o2.connect(filter);
    filter.connect(gainNode); gainNode.connect(audioCtx.destination);
    o1.start(); o2.start();
  } catch(e) { console.warn('Web Audio unavailable', e); }
}

if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    buildAudio();
    if (!audioCtx) return;
    if (soundOn) {
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
      soundBtn.classList.add('muted');
    } else {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      gainNode.gain.setTargetAtTime(0.15, audioCtx.currentTime, 0.5);
      soundBtn.classList.remove('muted');
    }
    soundOn = !soundOn;
  });
}

/* ══════════════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════════════ */
const dot  = document.getElementById('cursor-dot');
const ring = document.getElementById('cursor-ring');

let mx = window.innerWidth / 2, my = window.innerHeight / 2;
let rx = mx, ry = my;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
});

document.addEventListener('mousedown', () => ring?.classList.add('clicking'));
document.addEventListener('mouseup',   () => ring?.classList.remove('clicking'));

(function cursorLoop() {
  rx += (mx - rx) * 0.14;
  ry += (my - ry) * 0.14;
  if (dot)  { dot.style.left  = mx + 'px'; dot.style.top  = my + 'px'; }
  if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
  requestAnimationFrame(cursorLoop);
})();

document.querySelectorAll('a, button, .panel-cta').forEach(el => {
  el.addEventListener('mouseenter', () => ring?.classList.add('hovered'));
  el.addEventListener('mouseleave', () => ring?.classList.remove('hovered'));
});

/* ══════════════════════════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
══════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ══════════════════════════════════════════════════════
   EXPLORE CTA → smooth scroll to product page
══════════════════════════════════════════════════════ */
const exploreBtn = document.getElementById('explore-btn');
if (exploreBtn) {
  exploreBtn.addEventListener('click', () => {
    const pp = document.getElementById('product-page');
    if (pp) pp.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ══════════════════════════════════════════════════════
   SMOOTH ANCHOR LINKS
══════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const tgt = document.querySelector(a.getAttribute('href'));
    if (tgt) { e.preventDefault(); tgt.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ══════════════════════════════════════════════════════
   ANIMATED COUNTER (stats section)
══════════════════════════════════════════════════════ */
function animateCounter(el, target, suffix = '', duration = 1600) {
  let start = null;
  const isFloat = String(target).includes('.');
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = isFloat
      ? (target * ease).toFixed(1)
      : Math.round(target * ease);
    el.textContent = val + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const val = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, val, suffix);
      counterObs.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
window.addEventListener('load', preloadImages);
