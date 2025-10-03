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
const viewer = document.querySelector(".viewer-container");

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

    // ✅ add thumbnail
    const thumb = document.createElement("img");
    thumb.src = canvas.toDataURL("image/png");
    thumb.dataset.page = i;
    thumb.addEventListener("click", () => {
      if (pageFlip) pageFlip.flip(i - 1);
      restoreFocus();
    });
    thumbnailStrip.appendChild(thumb);

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
    if (soundOn) flipSound.play();
  });

  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => { loader.style.display = "none"; }, 800);
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

// ✅ Nav buttons
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
  restoreFocus();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
  restoreFocus();
});

// ✅ Fullscreen toggle
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    flipbook.requestFullscreen().then(() => {
      flipbook.setAttribute("tabindex", "0");
      flipbook.focus();
    });
  } else {
    document.exitFullscreen();
  }
});

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight") pageFlip.flipNext();
});

// ✅ Thumbnail toggle
thumbToggle.addEventListener("click", () => {
  const isHidden = thumbnailStrip.classList.toggle("hidden");
  thumbToggle.textContent = isHidden ? "📕" : "📚";

  if (isHidden) {
    viewer.classList.remove("show-thumbs");
  } else {
    viewer.classList.add("show-thumbs");
  }

  setTimeout(() => {
    if (pageFlip) pageFlip.updateFromHtml();
  }, 300);

  restoreFocus();
});

// ✅ Resize handler
window.addEventListener("resize", () => {
  if (pageFlip) pageFlip.updateFromHtml();
});

// ✅ Restore focus helper
function restoreFocus() {
  setTimeout(() => {
    if (document.fullscreenElement) {
      flipbook.focus();
    } else {
      document.body.focus();
    }
  }, 50);
}
