const flipbook = document.getElementById("flipbook");
const zoomWrapper = document.getElementById("zoomWrapper");
const resetBtn = document.getElementById("resetView");
const flipSound = document.getElementById("flipSound");

// Loader
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
  }, 1000);
});

// Init PageFlip
const pageFlip = new St.PageFlip(flipbook, {
  width: 600,
  height: 800,
  size: "stretch",
  minWidth: 300,
  maxWidth: 1200,
  minHeight: 400,
  maxHeight: 1600,
  maxShadowOpacity: 0.5,
  showCover: true,
  mobileScrollSupport: false
});

const pdfUrl = "yourcourse.pdf"; // replace with your file
pdfjsLib.getDocument(pdfUrl).promise.then(async (pdf) => {
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    pageFlip.loadFromHTML([`<div class="page"><img src="${canvas.toDataURL()}"></div>`], true);
  }

  document.getElementById("pageInfo").textContent = `1 / ${pdf.numPages}`;
});

// Nav
document.getElementById("prevPage").onclick = () => pageFlip.flipPrev();
document.getElementById("nextPage").onclick = () => pageFlip.flipNext();
document.getElementById("fullscreen").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
};
document.getElementById("soundToggle").onclick = () => {
  flipSound.muted = !flipSound.muted;
};
pageFlip.on("flip", e => {
  document.getElementById("pageInfo").textContent = `${e.data + 1} / ${pageFlip.getPageCount()}`;
  flipSound.currentTime = 0;
  flipSound.play();
});

// --- Zoom, Pan, Reset ---
let zoomLevel = 1, startDistance = 0, offsetX = 0, offsetY = 0;
let startX, startY, isDragging = false;
let velocityX = 0, velocityY = 0, momentumId;
let resetHideTimeout;

function clampOffsets() {
  const wrapperWidth = zoomWrapper.offsetWidth;
  const wrapperHeight = zoomWrapper.offsetHeight;
  const bookWidth = flipbook.offsetWidth * zoomLevel;
  const bookHeight = flipbook.offsetHeight * zoomLevel;

  const maxX = Math.max(0, (bookWidth - wrapperWidth) / 2);
  const maxY = Math.max(0, (bookHeight - wrapperHeight) / 2);

  offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
  offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
}

function applyTransform() {
  clampOffsets();
  flipbook.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
}

function showResetBtn() {
  resetBtn.classList.add("visible");
  clearTimeout(resetHideTimeout);
  resetHideTimeout = setTimeout(() => resetBtn.classList.remove("visible"), 3000);
}

function setZoom(scale) {
  zoomLevel = Math.min(Math.max(scale, 0.5), 3);
  if (zoomLevel <= 1) {
    offsetX = offsetY = 0;
    resetBtn.classList.remove("visible");
    clearTimeout(resetHideTimeout);
  } else {
    showResetBtn();
  }
  applyTransform();
}

resetBtn.addEventListener("click", () => {
  zoomLevel = 1; offsetX = 0; offsetY = 0;
  resetBtn.classList.remove("visible");
  clearTimeout(resetHideTimeout);
  applyTransform();
});

// Momentum
function applyMomentum() {
  if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
    offsetX += velocityX; offsetY += velocityY;
    velocityX *= 0.95; velocityY *= 0.95;
    applyTransform();
    momentumId = requestAnimationFrame(applyMomentum);
  } else cancelAnimationFrame(momentumId);
}

// Mouse drag
zoomWrapper.addEventListener("mousedown", e => {
  if (zoomLevel > 1) {
    isDragging = true;
    startX = e.pageX - offsetX; startY = e.pageY - offsetY;
    velocityX = velocityY = 0;
    cancelAnimationFrame(momentumId);
    flipbook.classList.add("dragging"); showResetBtn();
  }
});
window.addEventListener("mousemove", e => {
  if (isDragging) {
    const newX = e.pageX - startX, newY = e.pageY - startY;
    velocityX = newX - offsetX; velocityY = newY - offsetY;
    offsetX = newX; offsetY = newY;
    applyTransform();
  }
});
window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false; flipbook.classList.remove("dragging"); applyMomentum();
  }
});

// Touch pinch + pan
zoomWrapper.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    startDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
  } else if (e.touches.length === 1 && zoomLevel > 1) {
    isDragging = true;
    startX = e.touches[0].pageX - offsetX; startY = e.touches[0].pageY - offsetY;
    velocityX = velocityY = 0; cancelAnimationFrame(momentumId);
    flipbook.classList.add("dragging"); showResetBtn();
  }
}, { passive: false });

zoomWrapper.addEventListener("touchmove", e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const newDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    setZoom(zoomLevel * (newDistance / startDistance));
    startDistance = newDistance;
  } else if (e.touches.length === 1 && isDragging) {
    e.preventDefault();
    const newX = e.touches[0].pageX - startX, newY = e.touches[0].pageY - startY;
    velocityX = newX - offsetX; velocityY = newY - offsetY;
    offsetX = newX; offsetY = newY;
    applyTransform();
  }
}, { passive: false });

zoomWrapper.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false; flipbook.classList.remove("dragging"); applyMomentum();
  }
});

// Double click zoom toggle
zoomWrapper.addEventListener("dblclick", e => {
  e.preventDefault();
  if (zoomLevel > 1.5) setZoom(1);
  else setZoom(2);
});

// Double tap mobile
let lastTap = 0;
zoomWrapper.addEventListener("touchend", e => {
  const now = Date.now();
  if (now - lastTap < 300) {
    e.preventDefault();
    if (zoomLevel > 1.5) setZoom(1);
    else setZoom(2);
  }
  lastTap = now;
});

// Double right-click = reset
let rightClickTime = 0;
zoomWrapper.addEventListener("contextmenu", e => {
  e.preventDefault();
  const now = Date.now();
  if (now - rightClickTime < 300) {
    zoomLevel = 1; offsetX = offsetY = 0;
    resetBtn.classList.remove("visible");
    clearTimeout(resetHideTimeout);
    applyTransform();
  }
  rightClickTime = now;
});

// Keyboard shortcuts
document.addEventListener("keydown", e => {
  switch (e.key) {
    case "+": case "=": setZoom(zoomLevel + 0.1); break;
    case "-": setZoom(zoomLevel - 0.1); break;
    case "0": setZoom(1); break;
    case "ArrowLeft": document.getElementById("prevPage").click(); break;
    case "ArrowRight": document.getElementById("nextPage").click(); break;
  }
});

// Trackpad swipe gestures
let swipeStartX = 0, swipeStartY = 0, swipeStartTime = 0;
zoomWrapper.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeStartTime = Date.now();
  }
}, { passive: true });

zoomWrapper.addEventListener("touchend", e => {
  if (e.changedTouches.length === 1) {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    const dt = Date.now() - swipeStartTime;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50 && dt < 500) {
      if (dx < 0) document.getElementById("nextPage").click();
      else document.getElementById("prevPage").click();
    }
  }
}, { passive: true });
