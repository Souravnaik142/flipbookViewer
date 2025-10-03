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
const thumbnailStrip = document.getElementById("thumbnailStrip");
const thumbToggle = document.getElementById("thumbToggle");

// ✅ Allow body to be focusable for keyboard events
document.body.setAttribute("tabindex", "0");
document.body.focus();

// ✅ Load PDF (change file name here)
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages into flipbook
async function renderPages() {
  const pages = [];
  thumbnailStrip.innerHTML = ""; // clear old thumbnails

  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    createThumbnail(i); // make thumbnail
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

// ✅ Create thumbnail
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
      });

      thumbnailStrip.appendChild(img);
      if (pageNum === 1) img.classList.add("active");
    });
  });
}

// ✅ Highlight active thumbnail & auto-scroll
function highlightThumbnail(pageNum) {
  const thumbs = thumbnailStrip.querySelectorAll("img");
  thumbs.forEach(img => img.classList.remove("active"));

  const active = thumbnailStrip.querySelector(`img[data-page="${pageNum}"]`);
  if (active) {
    active.classList.add("active");

    // Auto-scroll center
    const stripRect = thumbnailStrip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const offset = activeRect.left - stripRect.left - (stripRect.width / 2) + (activeRect.width / 2);
    thumbnailStrip.scrollBy({ left: offset, behavior: "smooth" });
  }
}

// ✅ Navigation buttons
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", toggleSound);

// ✅ Thumbnail toggle
thumbToggle.addEventListener("click", () => {
  thumbnailStrip.classList.toggle("hidden");
  thumbToggle.textContent = thumbnailStrip.classList.contains("hidden") ? "📕" : "📚";
});

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

// ✅ Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;

  switch (e.key) {
    case "ArrowLeft":
      pageFlip.flipPrev();
      break;
    case "ArrowRight":
      pageFlip.flipNext();
      break;
    case "+":
    case "=":
      scale += 0.2;
      renderPages();
      break;
    case "-":
      if (scale > 0.6) {
        scale -= 0.2;
        renderPages();
      }
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    case "m":
    case "M":
      toggleSound();
      break;
    case "t":
    case "T":
      thumbToggle.click(); // shortcut for thumbnails toggle
      break;
  }
});

// ✅ Prevent buttons & strip from "stealing" arrow keys
document.querySelectorAll("button, #thumbnailStrip").forEach(el => {
  el.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "+", "-", "=", "f", "F", "m", "M", "t", "T"].includes(e.key)) {
      e.preventDefault();   // stop element from using it
      document.body.focus(); // restore focus
      // Re-dispatch so global listener still works
      document.dispatchEvent(new KeyboardEvent("keydown", e));
    }
  });

  // Also refocus body after any click
  el.addEventListener("click", () => {
    setTimeout(() => document.body.focus(), 50);
  });
});

// ✅ Resize handling
window.addEventListener("resize", () => {
  if (pageFlip) {
    pageFlip.updateFromHtml();
  }
});
