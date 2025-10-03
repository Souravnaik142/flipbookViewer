// ----- Globals -----
let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null,
    highlightLayer = null;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const thumbnailBar = document.getElementById("thumbnailBar");
const thumbToggle = document.getElementById("thumbToggle");

// ----- Load PDF -----
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
}).catch(err => {
  loaderText.textContent = "Failed to load PDF. Check yourcourse.pdf exists.";
  console.error(err);
});

// ----- Render pages + thumbnails -----
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

  // Attach pages to flipbook
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

  // Hide loader
  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => (loader.style.display = "none"), 800);
  }

  // Initialize thumbnail toggle label depending on width
  if (window.innerWidth <= 768) {
    thumbnailBar.classList.add("hidden");
    thumbToggle.textContent = "📖 Show Thumbnails";
  } else {
    thumbnailBar.classList.remove("hidden");
    thumbToggle.textContent = "📕 Hide Thumbnails";
  }
}

// ----- Render a single PDF page into canvas -----
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport }).promise;
  });
}

// ----- Update page counter -----
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// ----- Navigation buttons -----
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

// ----- Fullscreen & Sound buttons -----
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);
document.getElementById("soundToggle").addEventListener("click", toggleSound);

// ----- Go To Page -----
document.getElementById("gotoPage").addEventListener("change", (e) => {
  const pageNum = parseInt(e.target.value, 10);
  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
    pageFlip.turnToPage(pageNum - 1);
    highlightThumbnail(pageNum);
  }
  e.target.value = "";
});

// ----- Search w/ highlights (jumps to first matching page) -----
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const resultPage = await searchInPDF(query);
  if (resultPage) {
    pageFlip.turnToPage(resultPage - 1);
    highlightThumbnail(resultPage);

    // Render highlights on that page
    const page = await pdfDoc.getPage(resultPage);
    await highlightMatches(page, query.toLowerCase());
  } else {
    alert("No matches found.");
  }
});

// Basic search that returns first matching page
async function searchInPDF(query) {
  query = query.toLowerCase();
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map(item => item.str.toLowerCase());
    if (strings.some(str => str.includes(query))) {
      return i;
    }
  }
  return null;
}

// Highlight matches on a given page (yellow translucent rectangles)
async function highlightMatches(page, query) {
  // clear previous highlights
  if (highlightLayer) highlightLayer.remove();

  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();

  // find the canvas for this page (canvas order matches PDF pages)
  // flipbook may contain canvases in the DOM for each page wrapper
  const canvases = flipbook.querySelectorAll("canvas");
  const canvas = canvases[page.pageNumber - 1];
  if (!canvas) return;

  const wrapper = canvas.parentElement;
  wrapper.style.position = "relative";

  // create overlay
  highlightLayer = document.createElement("div");
  highlightLayer.style.position = "absolute";
  highlightLayer.style.top = "0";
  highlightLayer.style.left = "0";
  highlightLayer.style.width = canvas.width + "px";
  highlightLayer.style.height = canvas.height + "px";
  highlightLayer.style.pointerEvents = "none";
  wrapper.appendChild(highlightLayer);

  // iterate text items and draw rectangles if they include query
  textContent.items.forEach(item => {
    const text = item.str.toLowerCase();
    if (text.includes(query)) {
      // Compute transform to get coordinates on the rendered canvas
      const tx = pdfjsLib.Util.transform(
        viewport.transform,
        item.transform
      );

      // tx[4], tx[5] are x,y in PDF units; item.width approximates width in text space
      const x = tx[4];
      const y = tx[5];
      const fontHeight = item.height || 10;
      const width = (item.width || (text.length * 6)) * viewport.scale;
      const height = fontHeight * viewport.scale;

      const highlight = document.createElement("div");
      highlight.style.position = "absolute";
      // PDF.js uses a coordinate system with origin at bottom-left for transform,
      // the text's y coordinate needs adjustment to top-left canvas coords.
      highlight.style.left = `${x}px`;
      highlight.style.top = `${canvas.height - y - height}px`;
      highlight.style.width = `${width}px`;
      highlight.style.height = `${height}px`;
      highlight.style.backgroundColor = "rgba(255, 255, 0, 0.45)";
      highlightLayer.appendChild(highlight);
    }
  });
}

// ----- Thumbnails: create + click handler (auto-hide on mobile) -----
function createThumbnail(pageNum) {
  pdfDoc.getPage(pageNum).then((page) => {
    const thumbScale = 0.15;
    const viewport = page.getViewport({ scale: thumbScale });
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

        // Auto-hide on mobile after selecting
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

// Highlight + auto-scroll thumbnail into view
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

// ----- Thumbnail drag/wheel behavior -----
// drag-to-scroll (mouse)
let isDown = false, startX = 0, scrollLeft = 0;
thumbnailBar.addEventListener("mousedown", (e) => {
  isDown = true;
  thumbnailBar.classList.add("dragging");
  startX = e.pageX - thumbnailBar.offsetLeft;
  scrollLeft = thumbnailBar.scrollLeft;
});
thumbnailBar.addEventListener("mouseleave", () => {
  isDown = false;
  thumbnailBar.classList.remove("dragging");
});
thumbnailBar.addEventListener("mouseup", () => {
  isDown = false;
  thumbnailBar.classList.remove("dragging");
});
thumbnailBar.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - thumbnailBar.offsetLeft;
  const walk = (x - startX) * 2; // scroll speed
  thumbnailBar.scrollLeft = scrollLeft - walk;
});

// touch drag
thumbnailBar.addEventListener("touchstart", (e) => {
  isDown = true;
  startX = e.touches[0].pageX - thumbnailBar.offsetLeft;
  scrollLeft = thumbnailBar.scrollLeft;
});
thumbnailBar.addEventListener("touchend", () => { isDown = false; });
thumbnailBar.addEventListener("touchmove", (e) => {
  if (!isDown) return;
  const x = e.touches[0].pageX - thumbnailBar.offsetLeft;
  const walk = (x - startX) * 2;
  thumbnailBar.scrollLeft = scrollLeft - walk;
});

// mouse wheel to scroll horizontally (fix for laptop/desktop)
thumbnailBar.addEventListener("wheel", (e) => {
  if (!e.deltaY && !e.deltaX) return;
  e.preventDefault();
  thumbnailBar.scrollLeft += e.deltaY; // wheel scroll moves horizontally
});

// ----- Thumbnail toggle (desktop + mobile) -----
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

// ----- Keyboard controls -----
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

// ----- Helpers -----
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
