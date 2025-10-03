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
const thumbnailBar = document.getElementById("thumbnailBar");
const thumbToggle = document.getElementById("thumbToggle");

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages into flipbook & thumbnails
async function renderPages() {
  const pages = [];
  thumbnailBar.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    if (i === 1) wrapper.setAttribute("data-page-type", "cover");
    if (i === totalPages) wrapper.setAttribute("data-page-type", "backCover");

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    loaderText.textContent = `Loading page ${i} of ${totalPages}...`;

    createThumbnail(i);
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
    const current = e.data + 1;
    updatePageInfo(current);
    highlightThumbnail(current);
    if (soundOn) {
      flipSound.currentTime = 0;
      flipSound.play();
    }
  });

  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => (loader.style.display = "none"), 800);
  }
}

// ✅ Render single page
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport }).promise;
  });
}

// ✅ Update page info
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// ✅ Navigation
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

// ✅ Keyboard controls
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  switch (e.key) {
    case "ArrowLeft": pageFlip.flipPrev(); break;
    case "ArrowRight": pageFlip.flipNext(); break;
    case "f": case "F": toggleFullscreen(); break;
    case "m": case "M": toggleSound(); break;
    case " ": e.preventDefault(); pageFlip.flipNext(); break;
  }
});

// ✅ Toggle thumbnails
thumbToggle.addEventListener("click", () => {
  const isHidden = thumbnailBar.classList.contains("hidden") || !thumbnailBar.classList.contains("show");
  if (isHidden) {
    thumbnailBar.classList.remove("hidden");
    thumbnailBar.classList.add("show");
    thumbToggle.textContent = "📕 Hide Thumbnails";
  } else {
    thumbnailBar.classList.add("hidden");
    thumbnailBar.classList.remove("show");
    thumbToggle.textContent = "📖 Show Thumbnails";
  }
});

// ✅ Create thumbnail
function createThumbnail(pageNum) {
  pdfDoc.getPage(pageNum).then((page) => {
    const viewport = page.getViewport({ scale: 0.15 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      const thumbWrapper = document.createElement("div");
      thumbWrapper.className = "thumbnail";
      thumbWrapper.appendChild(canvas);

      thumbWrapper.addEventListener("click", () => {
        pageFlip.turnToPage(pageNum - 1);
        highlightThumbnail(pageNum);

        // ✅ Auto-hide on mobile
        if (window.innerWidth <= 768) {
          thumbnailBar.classList.add("hidden");
          thumbnailBar.classList.remove("show");
          thumbToggle.textContent = "📖 Show Thumbnails";
        }
      });

      thumbnailBar.appendChild(thumbWrapper);
      if (pageNum === 1) highlightThumbnail(1);
    });
  });
}

// ✅ Highlight + auto-scroll
function highlightThumbnail(pageNum) {
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumb, i) => {
    const isActive = i === pageNum - 1;
    thumb.classList.toggle("active", isActive);
    if (isActive) {
      thumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });
}

// ✅ Drag/Swipe thumbnail bar
let isDown = false, startX, scrollLeft;
thumbnailBar.addEventListener("mousedown", (e) => {
  isDown = true;
  startX = e.pageX - thumbnailBar.offsetLeft;
  scrollLeft = thumbnailBar.scrollLeft;
});
thumbnailBar.addEventListener("mouseleave", () => (isDown = false));
thumbnailBar.addEventListener("mouseup", () => (isDown = false));
thumbnailBar.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - thumbnailBar.offsetLeft;
  thumbnailBar.scrollLeft = scrollLeft - (x - startX) * 2;
});
thumbnailBar.addEventListener("touchstart", (e) => {
  isDown = true;
  startX = e.touches[0].pageX - thumbnailBar.offsetLeft;
  scrollLeft = thumbnailBar.scrollLeft;
});
thumbnailBar.addEventListener("touchend", () => (isDown = false));
thumbnailBar.addEventListener("touchmove", (e) => {
  if (!isDown) return;
  const x = e.touches[0].pageX - thumbnailBar.offsetLeft;
  thumbnailBar.scrollLeft = scrollLeft - (x - startX) * 2;
});

// ✅ Helpers
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}
function toggleSound() {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
}
