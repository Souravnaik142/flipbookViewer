const flipbook = document.getElementById("flipbook");
const zoomWrapper = document.getElementById("zoomWrapper");
const flipSound = document.getElementById("flipSound");
const loader = document.getElementById("loader");

let currentScale = 1;
let minScale = 1;
let maxScale = 2.5;
let panX = 0, panY = 0;
let isDragging = false, startX = 0, startY = 0;
let velocityX = 0, velocityY = 0;
let lastTime = 0;

// Apply zoom + pan transform
function applyTransform() {
  zoomWrapper.style.transform =
    `translate(${panX}px, ${panY}px) scale(${currentScale})`;
}

// Clamp pan boundaries
function clampPan() {
  const maxPanX = (currentScale - 1) * window.innerWidth / 2;
  const maxPanY = (currentScale - 1) * window.innerHeight / 2;
  panX = Math.min(Math.max(panX, -maxPanX), maxPanX);
  panY = Math.min(Math.max(panY, -maxPanY), maxPanY);
}

// Animate momentum after drag release
function animateMomentum(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 16;
  lastTime = timestamp;

  panX += velocityX * dt;
  panY += velocityY * dt;
  velocityX *= 0.9;
  velocityY *= 0.9;

  clampPan();
  applyTransform();

  if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
    requestAnimationFrame(animateMomentum);
  }
}

// Zoom handler
function applyZoom(scale, centerX = window.innerWidth/2, centerY = window.innerHeight/2) {
  const oldScale = currentScale;
  currentScale = Math.min(Math.max(scale, minScale), maxScale);

  const dx = centerX - window.innerWidth/2;
  const dy = centerY - window.innerHeight/2;
  panX -= dx * (currentScale - oldScale) / currentScale;
  panY -= dy * (currentScale - oldScale) / currentScale;

  if (currentScale === 1) { panX = 0; panY = 0; velocityX = 0; velocityY = 0; }
  clampPan();
  applyTransform();
}

// Wheel zoom (desktop)
zoomWrapper.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  applyZoom(currentScale + delta, e.clientX, e.clientY);
});

// Pinch + drag (mobile)
let startDist = 0;
zoomWrapper.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    startDist = Math.sqrt(dx * dx + dy * dy);
  } else if (e.touches.length === 1 && currentScale > 1) {
    isDragging = true;
    startX = e.touches[0].clientX - panX;
    startY = e.touches[0].clientY - panY;
    velocityX = velocityY = 0;
  }
});
zoomWrapper.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.sqrt(dx * dx + dy * dy);
    const scaleChange = (newDist - startDist) / 200;
    applyZoom(currentScale + scaleChange);
    startDist = newDist;
  } else if (isDragging && e.touches.length === 1) {
    e.preventDefault();
    const newX = e.touches[0].clientX - startX;
    const newY = e.touches[0].clientY - startY;
    velocityX = newX - panX;
    velocityY = newY - panY;
    panX = newX;
    panY = newY;
    clampPan();
    applyTransform();
  }
});
zoomWrapper.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false;
    requestAnimationFrame(animateMomentum);
  }
});

// Mouse drag (desktop pan)
zoomWrapper.addEventListener("mousedown", (e) => {
  if (currentScale > 1) {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    velocityX = velocityY = 0;
    lastTime = 0;
  }
});
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const newX = e.clientX - startX;
    const newY = e.clientY - startY;
    velocityX = newX - panX;
    velocityY = newY - panY;
    panX = newX;
    panY = newY;
    clampPan();
    applyTransform();
  }
});
window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    requestAnimationFrame(animateMomentum);
  }
});

// Double-click/tap reset
zoomWrapper.addEventListener("dblclick", () => applyZoom(1));

// Init PageFlip
const pageFlip = new St.PageFlip(flipbook, {
  width: 600,
  height: 800,
  size: "stretch",
  minWidth: 300,
  maxWidth: 2000,
  minHeight: 400,
  maxHeight: 3000,
  maxShadowOpacity: 0.5,
  showCover: false,
  mobileScrollSupport: false
});

const pdfUrl = "yourcourse.pdf";

// Render page
async function renderPage(page, containerWidth, containerHeight) {
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    containerWidth / viewport.width,
    containerHeight / viewport.height
  );
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  return canvas.toDataURL();
}

// Load PDF
async function loadPDF() {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const imgData = await renderPage(page, 600, 800);
    pages.push(`<div class="page"><img src="${imgData}"></div>`);
  }
  pageFlip.loadFromHTML(pages);

  document.getElementById("prevPage").onclick = () => pageFlip.flipPrev();
  document.getElementById("nextPage").onclick = () => pageFlip.flipNext();
  document.getElementById("resetView").onclick = () => applyZoom(1);

  pageFlip.on("flip", (e) => {
    document.getElementById("pageInfo").textContent =
      `${e.data + 1} / ${pageFlip.getPageCount()}`;
    flipSound.currentTime = 0;
    flipSound.play();
  });

  document.getElementById("pageInfo").textContent = `1 / ${pdf.numPages}`;
  loader.style.display = "none";
}
loadPDF();

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  switch (e.key) {
    case "ArrowLeft": pageFlip.flipPrev(); break;
    case "ArrowRight": pageFlip.flipNext(); break;
    case "+": case "=": applyZoom(currentScale + 0.1); break;
    case "-": applyZoom(currentScale - 0.1); break;
    case "0": applyZoom(1); break;
    case "Escape": helpOverlay.style.display = "none"; break;
  }
});

// Help overlay
const helpOverlay = document.getElementById("helpOverlay");
const closeHelp = document.getElementById("closeHelp");
const helpBtn = document.getElementById("helpBtn");

closeHelp.addEventListener("click", () => {
  helpOverlay.style.display = "none";
});
helpBtn.addEventListener("click", () => {
  helpOverlay.style.display = "flex";
});
