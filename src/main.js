import './style.css';

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[0,17],[17,18],[18,19],[19,20],
];

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const gesturePrompt = document.getElementById('gesturePrompt');
const statusPill = document.getElementById('statusPill');
const holdBar = document.getElementById('holdBar');
const successCard = document.getElementById('successCard');
const overlayGuide = document.getElementById('overlayGuide');
const storyCards = Array.from(document.querySelectorAll('.story-card'));

const tutorialSteps = [
  {
    name: 'Open Palm',
    prompt: 'Show an open palm',
    detector: detectOpenPalm,
    guide: (w, h) => ({ x: w * 0.18, y: h * 0.16, width: w * 0.64, height: h * 0.58 }),
  },
  {
    name: 'Pinch',
    prompt: 'Pinch thumb and index',
    detector: detectPinch,
    guide: (w, h) => ({ x: w * 0.28, y: h * 0.22, width: w * 0.44, height: h * 0.42 }),
  },
  {
    name: 'Thumbs Up',
    prompt: 'Hold a thumbs up',
    detector: detectThumbsUp,
    guide: (w, h) => ({ x: w * 0.25, y: h * 0.16, width: w * 0.5, height: h * 0.62 }),
  },
];

let currentStep = 0;
let matchStart = 0;
let completed = false;

function setStep(index) {
  currentStep = Math.min(index, tutorialSteps.length - 1);
  matchStart = 0;
  const step = tutorialSteps[currentStep];
  gesturePrompt.textContent = step.prompt;
  holdBar.style.width = '0%';
  storyCards.forEach((card) => {
    card.dataset.active = Number(card.dataset.index) === currentStep ? 'true' : 'false';
  });
  overlayGuide.classList.toggle('hidden', currentStep >= tutorialSteps.length);
  if (currentStep >= tutorialSteps.length - 1) {
    overlayGuide.innerHTML = '<div class="flex items-center gap-3"><span class="material-symbols-rounded text-[18px] text-aqua">verified</span><span>Complete the final gesture to finish the sequence.</span></div>';
  }
}

// lm = array of 21 {x, y, z} landmarks, normalised 0–1
function detectOpenPalm(lm) {
  const tips = [8, 12, 16, 20];
  const extended = tips.filter((t) => lm[t].y < lm[t - 2].y).length;
  const thumbSpread = Math.hypot(lm[4].x - lm[5].x, lm[4].y - lm[5].y);
  return extended >= 3 && thumbSpread > 0.08;
}

function detectPinch(lm) {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.07;
}

function detectThumbsUp(lm) {
  const thumbUp = lm[4].y < lm[2].y - 0.04;
  const curled = [lm[8], lm[12], lm[16], lm[20]].every((t) => t.y > lm[9].y);
  return thumbUp && curled;
}

function drawHand(lm) {
  ctx.save();
  ctx.strokeStyle = 'rgba(220,231,255,0.9)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [s, e] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(lm[s].x * canvas.width, lm[s].y * canvas.height);
    ctx.lineTo(lm[e].x * canvas.width, lm[e].y * canvas.height);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGuide(step, lm) {
  const { width, height } = canvas;
  const g = step.guide(width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.strokeRect(g.x, g.y, g.width, g.height);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(g.x, g.y, g.width, g.height);
  ctx.restore();

  if (!lm) return;

  const cx = lm.reduce((s, p) => s + p.x, 0) * width / lm.length;
  const cy = lm.reduce((s, p) => s + p.y, 0) * height / lm.length;
  const inBox = cx > g.x && cx < g.x + g.width && cy > g.y && cy < g.y + g.height;

  ctx.save();
  ctx.strokeStyle = inBox ? 'rgba(200,244,238,0.95)' : 'rgba(255,217,235,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeRect(g.x, g.y, g.width, g.height);
  ctx.restore();
}

function updateStatus(text, cls) {
  statusPill.textContent = text;
  statusPill.className = `rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.24em] ${cls}`;
}

function finishTutorial() {
  completed = true;
  updateStatus('Success', 'border-aqua/40 bg-aqua/15 text-aqua/90');
  successCard.classList.remove('hidden');
  overlayGuide.classList.add('hidden');
}

function tick(lm) {
  if (completed) return;
  const step = tutorialSteps[currentStep];
  const matched = lm ? step.detector(lm) : false;
  if (matched) {
    if (!matchStart) matchStart = performance.now();
    const progress = Math.min(1, (performance.now() - matchStart) / 900);
    holdBar.style.width = `${progress * 100}%`;
    updateStatus('Matching', 'border-aqua/30 bg-aqua/10 text-aqua/90');
    if (progress >= 1) {
      if (currentStep === tutorialSteps.length - 1) finishTutorial();
      else setStep(currentStep + 1);
    }
  } else {
    matchStart = 0;
    holdBar.style.width = '0%';
    updateStatus(lm ? 'Adjust' : 'Waiting', 'border-white/10 bg-white/5 text-white/60');
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    updateStatus('Camera unavailable', 'border-rose-400/30 bg-rose-400/10 text-rose-100');
    gesturePrompt.textContent = 'Your browser cannot access the camera.';
    return;
  }

  try {
    const { HandLandmarker, FilesetResolver } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs'
    );

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );

    const detector = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    updateStatus('Waiting', 'border-white/10 bg-white/5 text-white/60');

    const loop = () => {
      canvas.width = video.videoWidth || canvas.clientWidth;
      canvas.height = video.videoHeight || canvas.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let lm = null;
      if (video.readyState >= 2) {
        try {
          const result = detector.detectForVideo(video, performance.now());
          lm = result.landmarks?.[0] ?? null;
          if (lm) drawHand(lm);
        } catch (_) {}
      }

      drawGuide(tutorialSteps[currentStep], lm);
      tick(lm);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    updateStatus('Camera blocked', 'border-rose-400/30 bg-rose-400/10 text-rose-100');
    gesturePrompt.textContent = 'Camera permission is required for gesture matching.';
  }
}

setStep(0);
startCamera();
