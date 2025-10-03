/* ----- Config & DOM ----- */
let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null;

const viewer = document.getElementById("viewerContainer");
const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const thumbnailStrip = document.getElementById("thumbnailStrip");
const thumbToggle = document.getElementById("thumbToggle");

/* make viewer focusable & grab focus initially */
viewer.setAttribute("tabindex", "0");
viewer.focus();

/* ----- Load PDF ----- */
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
}).catch(err => {
  console.error("PDF load error:", err);
  loaderText.textContent = "Failed to load PDF.";
});

/* ----- Render pages & thumbnails ----- */
async function renderPages() {
  const pages = [];
  thumbnailStrip.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    createThumbnail(i);
    loaderText.textContent = `Loading page ${i} of ${totalPages}...`;
  }

  // Initialize PageFlip
  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500, height: 700, size: "stretch",
    minWidth: 315, maxWidth: 1200, minHeight: 400, maxHeight: 1600,
    maxShadowOpacity: 0.5, showCover: true, useMouseEvents: true, mobileScrollSupport: true
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    highlightThumbnail(e.data + 1);
    if (soundOn) {
      flipSound.currentTime = 0;
      flipSound.play();
    }
  });

  // hide loader
  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.style.display = "none", 600);
  }

  // ensure viewer has focus
  restoreFocus();
}

function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport: viewport }).promise;
  });
}

/* ----- UI helpers ----- */
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

function createThumbnail(pageNum) {
  pdfDoc.getPage(pageNum).then((page) => {
    const viewport = page.getViewport({ scale: 0.2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
      const img = document.createElement("img");
      img.src = canvas.toDataURL();
      img.dataset.page = pageNum;

      img.addEventListener("click", () => {
        if (pageFlip) pageFlip.flip(pageNum - 1);
        restoreFocus();
      });

      thumbnailStrip.appendChild(img);
      if (pageNum === 1) img.classList.add("active");
    });
  });
}

function highlightThumbnail(pageNum) {
  const thumbs = thumbnailStrip.querySelectorAll("img");
  thumbs.forEach(img => img.classList.remove("active"));
  const active = thumbnailStrip.querySelector(`img[data-page="${pageNum}"]`);
  if (active) {
    active.classList.add("active");
    const stripRect = thumbnailStrip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset = activeRect.left - stripRect.left - (stripRect.width / 2) + (activeRect.width / 2);
    thumbnailStrip.scrollBy({ left: offset, behavior: 'smooth' });
  }
}

/* ----- Navigation buttons ----- */
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
  restoreFocus();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
  restoreFocus();
});

/* ----- Fullscreen: request fullscreen on the entire viewer container ----- */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // request fullscreen on the viewer so navbar + flipbook + thumbnails are included
    viewer.requestFullscreen().then(() => {
      // make viewer focusable and focus it
      viewer.setAttribute("tabindex", "0");
      viewer.focus();
    }).catch(err => {
      console.warn("Fullscreen request failed:", err);
    });
  } else {
    document.exitFullscreen().then(() => {
      document.body.focus();
    }).catch(err => {
      console.warn("Exit fullscreen failed:", err);
    });
  }
}
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);

/* ----- Sound toggle ----- */
function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  restoreFocus();
}
document.getElementById("soundToggle").addEventListener("click", toggleSound);

/* ----- Thumbnails toggle ----- */
thumbToggle.addEventListener("click", () => {
  thumbnailStrip.classList.toggle("hidden");
  thumbToggle.textContent = thumbnailStrip.classList.contains("hidden") ? "📕" : "📚";
  restoreFocus();
});

/* ----- Keyboard handling ----- */
/* Use document so it also fires reliably when viewer is fullscreen */
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;

  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); pageFlip.flipPrev(); break;
    case "ArrowRight": e.preventDefault(); pageFlip.flipNext(); break;
    case "+": case "=": scale += 0.2; renderPages(); break;
    case "-": if (scale > 0.6) { scale -= 0.2; renderPages(); } break;
    case "f": case "F": toggleFullscreen(); break;
    case "m": case "M": toggleSound(); break;
    case "t": case "T": thumbToggle.click(); break;
  }
});

/* Prevent the thumbnail strip from consuming arrow keys (scrolling) */
thumbnailStrip.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
});

/* ----- Focus utilities ----- */
function restoreFocus() {
  setTimeout(() => {
    // If we're fullscreen, focus the viewer container (so keys work)
    if (document.fullscreenElement === viewer) {
      viewer.focus();
    } else {
      // otherwise focus body, or viewer - both work
      document.body.focus();
    }
  }, 40);
}

/* Ensure clicks inside viewer focus it (useful for pointer events) */
viewer.addEventListener("pointerdown", () => viewer.focus());

/* After any UI control click, re-focus appropriately */
document.querySelectorAll("button, #thumbnailStrip img").forEach(el => {
  el.addEventListener("click", restoreFocus);
});

/* Handle fullscreen change events to keep proper focus */
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === viewer) {
    viewer.setAttribute("tabindex", "0");
    viewer.focus();
  } else {
    document.body.focus();
  }
});

/* ----- Resize handling ----- */
window.addEventListener("resize", () => {
  if (pageFlip) pageFlip.updateFromHtml();
});
