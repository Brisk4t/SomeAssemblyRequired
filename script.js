const shots = Array.from(document.querySelectorAll('.shot'));
const stories = Array.from(document.querySelectorAll('.story-card'));
const cameraLabel = document.getElementById('cameraLabel');
const cameraFeed = document.getElementById('cameraFeed');
const cameraStatus = document.getElementById('cameraStatus');
const progressBar = document.getElementById('progressBar');

function activateScene(index) {
  shots.forEach((shot, shotIndex) => {
    shot.classList.toggle('active', shotIndex === index);
  });

  stories.forEach((story, storyIndex) => {
    const active = storyIndex === index;
    story.dataset.active = active ? 'true' : 'false';
    story.style.opacity = active ? '1' : '0.72';
  });

  cameraLabel.textContent = `Scene ${String(index + 1).padStart(2, '0')}`;
  progressBar.style.width = `${Math.max(20, ((index + 1) / shots.length) * 100)}%`;
}

const observer = new IntersectionObserver(
  (entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      .slice(0, 1)
      .forEach((entry) => activateScene(Number(entry.target.dataset.index)));
  },
  {
    threshold: [0.35, 0.5, 0.7, 0.85],
    rootMargin: '-20% 0px -40% 0px',
  }
);

stories.forEach((story) => observer.observe(story));
activateScene(0);

async function startCamera() {
  if (!cameraFeed || !navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'Camera unavailable';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 1440 },
      },
      audio: false,
    });

    cameraFeed.srcObject = stream;
    cameraStatus.textContent = 'Camera live';
  } catch (error) {
    cameraStatus.textContent = 'Camera blocked';
    cameraFeed.style.display = 'none';
  }
}

document.getElementById('themeButton')?.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
});

startCamera();
