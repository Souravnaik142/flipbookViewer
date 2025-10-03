let pdfDoc = null,
    currentPage = 1,
    totalPages = 0,
    scale = 1.3,
    soundOn = true;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");

const pageFlip = new St.PageFlip(flipbook, {
  width: 400,
  height: 550,
  size: "stretch",
  minWidth: 315,
  maxWidth: 1000,
  minHeight: 400,
  maxHeight: 1350,
  maxShadowOpacity: 0.5,
  showCover: false,
  mobileScrollSupport: true
});

// Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

function renderPages() {
  for (let i = 1; i <= totalPages; i++) {
    let pageCanvas = document.createElement("canvas");
    pageCanvas.className = "pdf-page";

    let wrapper = document.createElement("div");
    wrapper.className = "page";
    wrapper.appendChild(pageCanvas);

    pageFlip.loadFromHTML([wrapper]);  // Add page to flipbook
    renderPage(i, pageCanvas);
  }
  updatePageInfo();
}

function renderPage(num, canvas) {
  pdfDoc.getPage(num).then(page => {
    let viewport = page.getViewport({ scale: scale });
    let ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    let renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

// Events
pageFlip.on("flip", (e) => {
  currentPage = e.data + 1;
  updatePageInfo();
  if (soundOn) flipSound.play();
});

function updatePageInfo() {
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
}

// Controls
document.getElementById("prevPage").addEventListener("click", () => pageFlip.flipPrev());
document.getElementById("nextPage").addEventListener("click", () => pageFlip.flipNext());

document.getElementById("zoomIn").addEventListener("click", () => {
  scale += 0.2;
  rerender();
});
document.getElementById("zoomOut").addEventListener("click", () => {
  if (scale > 0.6) {
    scale -= 0.2;
    rerender();
  }
});
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

function rerender() {
  flipbook.innerHTML = "";
  pageFlip.clear();
  renderPages();
}
