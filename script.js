let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const thumbnailStrip = document.getElementById("thumbnailStrip");
const thumbToggle = document.getElementById("thumbToggle");

// ✅ Body is focusable
document.body.setAttribute("tabindex", "0");
document.body.focus();

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages
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

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

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
    highlightThumbnail(e.data + 1);

    if (soundOn) {
      flipSound.currentTime = 0;
      flipSound.play();
    }
  });

  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.style.display = "none", 800);
  }
}

// ✅ Render one page
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    return page.render({ canvasContext: ctx, viewport }).promise;
  });
}

// ✅ Page info
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// ✅ Thumbnails
function createThumbnail(pageNum) {
  pdfDoc.getPage(pageNum).then(page => {
    const viewport = page.getViewport({ scale: 0.2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
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
    thumbnailStrip.scrollBy({ left: offset, behavior: "smooth" });
  }
}

// ✅ Navigation buttons
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
  restoreFocus();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
  restoreFocus();
});

// ✅ Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    flipbook.requestFullscreen().then(() => {
      flipbook.setAttribute("tabindex", "0");
      flipbook.focus();   // focus flipbook in fullscreen
    });
  } else {
    document.exitFullscreen().then(() => {
      document.body.focus(); // restore body focus
    });
  }
}
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);

// ✅ Sound
function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
}
document.getElementById("soundToggle").addEventListener("click", toggleSound);

// ✅ Thumbnail toggle
thumbToggle.addEventListener("click", () => {
  thumbnailStrip.classList.toggle("hidden");
  thumbToggle.textContent = thumbnailStrip.classList.contains("hidden") ? "📕" : "📚";
  restoreFocus();
});

// ✅ Keyboard navigation (bind to document for fullscreen)
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;

  switch (e.key) {
    case "ArrowLeft": pageFlip.flipPrev(); break;
    case "ArrowRight": pageFlip.flipNext(); break;
    case "+": case "=": scale += 0.2; renderPages(); break;
    case "-": if (scale > 0.6) { scale -= 0.2; renderPages(); } break;
    case "f": case "F": toggleFullscreen(); break;
    case "m": case "M": toggleSound(); break;
    case "t": case "T": thumbToggle.click(); break;
  }
});

// ✅ Ensure focus after UI clicks
function restoreFocus() {
  setTimeout(() => {
    if (document.fullscreenElement) {
      flipbook.focus();
    } else {
      document.body.focus();
    }
  }, 50);
}

document.querySelectorAll("button, #thumbnailStrip img").forEach(el => {
  el.addEventListener("click", restoreFocus);
});

// ✅ Resize
window.addEventListener("resize", () => {
  if (pageFlip) pageFlip.updateFromHtml();
});
