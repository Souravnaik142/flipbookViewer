const url = "physics.pdf"; // keep PDF in same folder

let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;
let doublePage = false;

const flipbook = document.getElementById("flipbook");
const pageNumEl = document.getElementById("page-number");
const loader = document.getElementById("loader");

// Render a page into a canvas
function renderPage(num, container) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;

    canvas.width = viewport.width * ratio;
    canvas.height = viewport.height * ratio;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    page.render({ canvasContext: context, viewport });

    container.appendChild(canvas);
  });
}

// Render the flipbook (single or double view)
function renderFlipbook() {
  flipbook.innerHTML = "";

  if (doublePage) {
    let leftPage = currentPage;
    if (leftPage % 2 === 1) leftPage--; // even page left

    [leftPage, leftPage + 1].forEach(p => {
      if (p >= 1 && p <= pdfDoc.numPages) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        renderPage(p, pageDiv);
        flipbook.appendChild(pageDiv);
      }
    });
  } else {
    const pageDiv = document.createElement("div");
    pageDiv.className = "page";
    renderPage(currentPage, pageDiv);
    flipbook.appendChild(pageDiv);
  }

  pageNumEl.textContent = `${currentPage} / ${pdfDoc.numPages}`;
}

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = "none";
  renderFlipbook();
});

// Buttons
document.getElementById("prev").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderFlipbook();
  }
});

document.getElementById("next").addEventListener("click", () => {
  if (currentPage < pdfDoc.numPages) {
    currentPage++;
    renderFlipbook();
  }
});

document.getElementById("zoom").addEventListener("click", () => {
  scale += 0.25;
  renderFlipbook();
});

document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

document.getElementById("doublePage").addEventListener("change", (e) => {
  doublePage = e.target.checked;
  renderFlipbook();
});

// ✅ Swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

flipbook.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

flipbook.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  const minSwipe = 50; // px threshold

  if (swipeDistance > minSwipe && currentPage > 1) {
    currentPage--;
    renderFlipbook();
  } else if (swipeDistance < -minSwipe && currentPage < pdfDoc.numPages) {
    currentPage++;
    renderFlipbook();
  }
}
