
// ————————————————
// PALETTE
// ————————————————
const PALETTE = [
  '#ff8906','#f25f4c','#e53170','#a846a0',
  '#2cb67d','#3da9fc','#7f5af0','#ffd803',
  '#fc5c7d','#00c9a7','#ff6b6b','#4ecdc4',
  '#45b7d1','#96e6a1','#d4a1f5','#ffb347',
];

// ————————————————
// STATE
// ————————————————
let options = [
  { text: 'Pizza 🍕',   color: PALETTE[0] },
  { text: 'Sushi 🍣',   color: PALETTE[1] },
  { text: 'Tacos 🌮',   color: PALETTE[2] },
  { text: 'Burger 🍔',  color: PALETTE[3] },
  { text: 'Pasta 🍝',   color: PALETTE[4] },
];
let spinning = false;
let currentAngle = 0;     // radians, canvas rotation
let animFrame = null;
let highlightedIndex = -1;

// ————————————————
// CANVAS SETUP
// ————————————————
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

function getCanvasSize() {
  return window.innerWidth <= 480 ? 300 : 380;
}

function resizeCanvas() {
  const size = getCanvasSize();
  canvas.width = size;
  canvas.height = size;
  const wrapper = document.getElementById('wheelWrapper');
  wrapper.style.width = size + 'px';
  wrapper.style.height = size + 'px';
  drawWheel();
}

// ————————————————
// DRAW WHEEL
// ————————————————
function drawWheel() {
  const size = canvas.width;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 6;
  ctx.clearRect(0, 0, size, size);

  if (options.length === 0) {
    // Empty state
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#221f35';
    ctx.fill();
    ctx.strokeStyle = '#2e2b47';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#a7a9be';
    ctx.font = `bold ${size * 0.065}px Nunito`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add options', cx, cy - 12);
    ctx.fillText('to start!', cx, cy + 14);
    ctx.restore();
    return;
  }

  const n = options.length;
  const sliceAngle = (Math.PI * 2) / n;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentAngle);

  options.forEach((opt, i) => {
    const start = i * sliceAngle - Math.PI / 2;
    const end   = start + sliceAngle;
    const mid   = start + sliceAngle / 2;

    // Slice
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();

    // If highlighted, brighten
    if (i === highlightedIndex) {
      ctx.fillStyle = lightenColor(opt.color, 30);
    } else {
      ctx.fillStyle = opt.color;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.rotate(mid);
    const textR = r * 0.6;
    ctx.translate(textR, 0);
    ctx.rotate(Math.PI / 2);

    const fontSize = Math.max(11, Math.min(16, r * 0.08 * (16 / Math.max(opt.text.length, 6))));
    ctx.font = `bold ${fontSize}px Nunito`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;

    // Wrap long text
    const maxW = r * 0.55;
    wrapText(ctx, opt.text, 0, 0, maxW, fontSize * 1.3);
    ctx.restore();
  });

  ctx.restore();

  // Outer ring glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,137,6,0.25)';
  ctx.lineWidth = 8;
  ctx.shadowColor = 'rgba(255,137,6,0.4)';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineH));
}

function lightenColor(hex, amt) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0xff) + amt);
  const b = Math.min(255, (num & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

// ————————————————
// SPIN LOGIC
// ————————————————
function getWinnerIndex() {
  // Pointer is at right (3 o'clock). With currentAngle rotation:
  // pointer angle in wheel coords = -currentAngle mod 2π
  const n = options.length;
  const sliceAngle = (Math.PI * 2) / n;
  // First slice starts at -π/2 (12 o'clock), pointer is at 0 (3 o'clock)
  // Effective pointer position in wheel frame:
  let a = (Math.PI / 2 - currentAngle) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return Math.floor(a / sliceAngle) % n;
}

function spin() {
  if (spinning || options.length < 2) {
    if (options.length < 2) {
      document.getElementById('spinBtn').classList.add('shake');
      setTimeout(() => document.getElementById('spinBtn').classList.remove('shake'), 450);
      playTone(200, 'sawtooth', 0.3);
    }
    return;
  }
  spinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('resultBanner').classList.remove('show');
  highlightedIndex = -1;

  const totalRotation = (Math.PI * 2) * (6 + Math.random() * 6); // 6–12 full turns
  const duration = 3500 + Math.random() * 1200;
  const startAngle = currentAngle;
  const targetAngle = startAngle + totalRotation;
  const startTime = performance.now();

  // Sound
  startSpinSound();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    currentAngle = startAngle + totalRotation * easeOut(t);
    drawWheel();

    // Tick sound on each new slice
    tickCheck(t);

    if (t < 1) {
      animFrame = requestAnimationFrame(animate);
    } else {
      currentAngle = targetAngle;
      spinning = false;
      stopSpinSound();
      const winner = getWinnerIndex();
      highlightedIndex = winner;
      drawWheel();
      showResult(winner);
      document.getElementById('spinBtn').disabled = false;
      launchConfetti();
      playWinSound();
    }
  }
  requestAnimationFrame(animate);
}

// Tick tracking
let lastTickSlice = -1;
function tickCheck(t) {
  const idx = getWinnerIndex();
  if (idx !== lastTickSlice) {
    lastTickSlice = idx;
    if (t < 0.92) playTick(t);
  }
}

// ————————————————
// SOUND ENGINE
// ————————————————
let audioCtx = null;
let spinOscillator = null;
let spinGain = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTick(progress) {
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    const speed = 1 - progress;
    osc.frequency.value = 400 + speed * 600;
    osc.type = 'triangle';
    g.gain.setValueAtTime(0.15 + speed * 0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.06);
  } catch(e){}
}

function startSpinSound() {
  try {
    const ac = getAudioCtx();
    spinOscillator = ac.createOscillator();
    spinGain = ac.createGain();
    spinOscillator.connect(spinGain);
    spinGain.connect(ac.destination);
    spinOscillator.type = 'sine';
    spinOscillator.frequency.setValueAtTime(80, ac.currentTime);
    spinGain.gain.setValueAtTime(0.0, ac.currentTime);
    spinGain.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.3);
    spinOscillator.start();
  } catch(e){}
}

function stopSpinSound() {
  try {
    if (spinOscillator) {
      spinGain.gain.setValueAtTime(spinGain.gain.value, audioCtx.currentTime);
      spinGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      spinOscillator.stop(audioCtx.currentTime + 0.3);
      spinOscillator = null;
    }
  } catch(e){}
}

function playTone(freq, type, vol) {
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    osc.start(); osc.stop(ac.currentTime + 0.4);
  } catch(e){}
}

function playWinSound() {
  try {
    const ac = getAudioCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.frequency.value = f;
      osc.type = 'triangle';
      const t = ac.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.5);
    });
  } catch(e){}
}

function playAddSound() {
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.1);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.start(); osc.stop(ac.currentTime + 0.25);
  } catch(e){}
}

// ————————————————
// RESULT BANNER
// ————————————————
function showResult(index) {
  const opt = options[index];
  document.getElementById('winnerText').textContent = opt.text;
  document.getElementById('resultBanner').classList.add('show');
}

// ————————————————
// CONFETTI
// ————————————————
const confCanvas = document.getElementById('confetti-canvas');
const confCtx = confCanvas.getContext('2d');
let confParticles = [];

function launchConfetti() {
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
  confParticles = [];
  for (let i = 0; i < 120; i++) {
    confParticles.push({
      x: Math.random() * confCanvas.width,
      y: -10 - Math.random() * 100,
      r: 5 + Math.random() * 6,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      speed: 3 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
      vx: (Math.random() - 0.5) * 3,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  animateConfetti();
}

function animateConfetti() {
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  confParticles = confParticles.filter(p => p.y < confCanvas.height + 20);
  if (confParticles.length === 0) return;

  confParticles.forEach(p => {
    p.y += p.speed;
    p.x += p.vx;
    p.angle += p.spin;
    confCtx.save();
    confCtx.translate(p.x, p.y);
    confCtx.rotate(p.angle);
    confCtx.fillStyle = p.color;
    confCtx.globalAlpha = 0.85;
    if (p.shape === 'rect') {
      confCtx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
    } else {
      confCtx.beginPath();
      confCtx.arc(0, 0, p.r/2, 0, Math.PI*2);
      confCtx.fill();
    }
    confCtx.restore();
  });
  requestAnimationFrame(animateConfetti);
}

// ————————————————
// OPTIONS MANAGEMENT
// ————————————————
function nextColor() {
  return PALETTE[options.length % PALETTE.length];
}

function addOption(text) {
  text = text.trim();
  if (!text) return;
  if (options.find(o => o.text.toLowerCase() === text.toLowerCase())) return;
  options.push({ text, color: nextColor() });
  renderList();
  drawWheel();
  playAddSound();
}

function removeOption(index) {
  options.splice(index, 1);
  highlightedIndex = -1;
  renderList();
  drawWheel();
  document.getElementById('resultBanner').classList.remove('show');
  playTone(350, 'sine', 0.1);
}

function renderList() {
  const list = document.getElementById('optionsList');
  document.getElementById('countBadge').textContent = options.length;

  if (options.length === 0) {
    list.innerHTML = '<div class="empty-note">Add some options above to get started! ✨</div>';
    return;
  }

  list.innerHTML = '';
  options.forEach((opt, i) => {
    const item = document.createElement('div');
    item.className = 'option-item' + (i === highlightedIndex ? ' highlighted' : '');
    item.innerHTML = `
      <div class="color-dot" style="background:${opt.color};color:${opt.color}"></div>
      <span class="option-text">${escapeHtml(opt.text)}</span>
      <button class="del-btn" data-index="${i}" title="Remove">✕</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => removeOption(parseInt(btn.dataset.index)));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ————————————————
// EVENTS
// ————————————————
document.getElementById('spinBtn').addEventListener('click', spin);
document.getElementById('hubBtn').addEventListener('click', spin);

document.getElementById('addBtn').addEventListener('click', () => {
  const inp = document.getElementById('optionInput');
  addOption(inp.value);
  inp.value = '';
  inp.focus();
});

document.getElementById('optionInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const inp = document.getElementById('optionInput');
    addOption(inp.value);
    inp.value = '';
  }
});

window.addEventListener('resize', resizeCanvas);

// ————————————————
// INIT
// ————————————————
resizeCanvas();
renderList();
