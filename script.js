let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null,
    currentPageNum = 1;

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
    currentPageNum = e.data + 1;
    updatePageInfo(currentPageNum);
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
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

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

// ✅ Go To Page
function goToPage(pageNum) {
  if (pageNum >= 1 && pageNum <= totalPages) {
    const sheetIndex = (pageNum % 2 === 0) ? pageNum - 1 : pageNum - 2;
    pageFlip.turnToPage(sheetIndex < 0 ? 0 : sheetIndex);
    currentPageNum = pageNum;
    updatePageInfo(currentPageNum);
    document.getElementById("gotoPage").value = ""; // clear after jump
  }
}
document.getElementById("gotoBtn").addEventListener("click", () => {
  const pageNum = parseInt(document.getElementById("gotoPage").value, 10);
  goToPage(pageNum);
});
document.getElementById("gotoPage").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const pageNum = parseInt(e.target.value, 10);
    goToPage(pageNum);
  }
});

// ✅ Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;

  switch (e.key) {
    case "ArrowLeft":
      pageFlip.flipPrev();
      break;
    case "ArrowRight":
      pageFlip.flipNext();
      break;
    case "ArrowUp":
      goToPage(1);
      break;
    case "ArrowDown":
      goToPage(totalPages);
      break;
    case "f":
    case "F":
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      break;
    case "m":
    case "M":
      soundOn = !soundOn;
      document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
      break;
  }
});
