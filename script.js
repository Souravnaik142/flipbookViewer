let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null; // global

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages into flipbook
async function renderPages() {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    loaderText.textContent = `Loading page ${i} of ${totalPages}...`;
  }

  // Reset container
  flipbook.innerHTML = "";

  // Destroy previous instance if exists
  if (pageFlip) {
    pageFlip.destroy();
  }

  // ✅ Init PageFlip
  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    minWidth: 315,
    maxWidth: 1200,
    minHeight: 400,
    maxHeight: 1600,
    maxShadowOpacity: 0.5,
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    if (soundOn) {
      flipSound.currentTime = 0; // prevent overlap
      flipSound.play();
    }
  });

  // Fade out loader (only once)
  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.style.display = "none";
    }, 800);
  }
}

// ✅ Render single page
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    return page.render({ canvasContext: ctx, viewport: viewport }).promise;
  });
}

// ✅ Update page info
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// ✅ Navigation (buttons)
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

// ✅ Fullscreen (button)
document.getElementById("fullscreen").addEventListener("click", () => {
  toggleFullscreen();
});

// ✅ Sound toggle (button)
document.getElementById("soundToggle").addEventListener("click", () => {
  toggleSound();
});

// === Keyboard Controls ===
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;

  switch (e.key) {
    case "ArrowLeft":
      pageFlip.flipPrev();
      break;
    case "ArrowRight":
      pageFlip.flipNext();
      break;
    case "f": case "F":
      toggleFullscreen();
      break;
    case "m": case "M":
      toggleSound();
      break;
    case " ": // Spacebar for next page
      e.preventDefault();
      pageFlip.flipNext();
      break;
  }
});

// ✅ Helpers
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
}
