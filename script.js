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

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages
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

// ✅ Navigation
document.getElementById("prevPage").addEventListener("click", () => pageFlip?.flipPrev());
document.getElementById("nextPage").addEventListener("click", () => pageFlip?.flipNext());

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Go to page
document.getElementById("gotoBtn").addEventListener("click", () => {
  const pageNum = parseInt(document.getElementById("gotoPage").value, 10);
  if (pageNum >= 1 && pageNum <= totalPages) {
    pageFlip.turnToPage(pageNum - 1);
    updatePageInfo(pageNum);
  }
});

// ✅ Search with highlight
let highlightLayer = null;
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const resultPage = await searchInPDF(query);
  if (resultPage) {
    pageFlip.turnToPage(resultPage - 1);
    updatePageInfo(resultPage);

    const page = await pdfDoc.getPage(resultPage);
    await highlightMatches(page, query.toLowerCase());
  } else {
    alert("No matches found.");
  }
});

// ✅ Search helper
async function searchInPDF(query) {
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map(item => item.str.toLowerCase());
    if (strings.some(str => str.includes(query.toLowerCase()))) {
      return i;
    }
  }
  return null;
}

// ✅ Highlight matches
async function highlightMatches(page, query) {
  if (highlightLayer) highlightLayer.remove();

  const viewport = page.getViewport({ scale: scale });
  const textContent = await page.getTextContent();

  highlightLayer = document.createElement("div");
  highlightLayer.style.position = "absolute";
  highlightLayer.style.top = "0";
  highlightLayer.style.left = "0";
  highlightLayer.style.pointerEvents = "none";

  const canvas = flipbook.querySelectorAll("canvas")[page.pageNumber - 1];
  const wrapper = canvas.parentElement;
  wrapper.style.position = "relative";
  wrapper.appendChild(highlightLayer);

  textContent.items.forEach(item => {
    const text = item.str.toLowerCase();
    if (text.includes(query)) {
      const transform = pdfjsLib.Util.transform(
        pdfjsLib.Util.transform(viewport.transform, item.transform),
        [1, 0, 0, -1, 0, 0]
      );

      const x = transform[4];
      const y = transform[5];
      const width = item.width * viewport.scale;
      const height = item.height * viewport.scale;

      const highlight = document.createElement("div");
      highlight.style.position = "absolute";
      highlight.style.left = `${x}px`;
      highlight.style.top = `${y - height}px`;
      highlight.style.width = `${width}px`;
      highlight.style.height = `${height}px`;
      highlight.style.backgroundColor = "rgba(255, 255, 0, 0.4)";
      highlightLayer.appendChild(highlight);
    }
  });
}

// ✅ Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowRight" || e.code === "Space") pageFlip.flipNext();
  if (e.code === "ArrowLeft") pageFlip.flipPrev();
});
