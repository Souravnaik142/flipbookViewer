let pdfDoc = null,
    currentPage = 1,
    totalPages = 0,
    scale = 1.3,
    soundOn = true;

const flipbook = document.getElementById("flipbook");
const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");

// Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// Render all pages
function renderPages() {
  flipbook.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    let pageDiv = document.createElement("div");
    pageDiv.className = "page";
    let canvas = document.createElement("canvas");
    pageDiv.appendChild(canvas);
    flipbook.appendChild(pageDiv);

    renderPage(i, canvas);
  }
  updatePageInfo();
}

// Render single page
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

// Navigation
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    flipPage();
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    flipPage();
  }
});

function flipPage() {
  let pages = document.querySelectorAll(".page");
  pages.forEach((p, i) => {
    if (i < currentPage) {
      p.classList.add("flipped");
    } else {
      p.classList.remove("flipped");
    }
  });
  if (soundOn) flipSound.play();
  updatePageInfo();
}

function updatePageInfo() {
  pageInfo.textContent = `${currentPage} / ${totalPages}`;
}

// Zoom
document.getElementById("zoomIn").addEventListener("click", () => {
  scale += 0.2;
  renderPages();
});

document.getElementById("zoomOut").addEventListener("click", () => {
  if (scale > 0.6) {
    scale -= 0.2;
    renderPages();
  }
});

// Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});
