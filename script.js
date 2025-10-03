const url = "physics.pdf"; // PDF file

let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;
let doublePage = false;

const flipbook = document.getElementById("flipbook");
const pageNumEl = document.getElementById("page-number");
const loader = document.getElementById("loader");

// Render a page into a canvas with A4 size
function renderPage(num, container) {
  pdfDoc.getPage(num).then(page => {
    // A4 ratio viewport
    const viewport = page.getViewport({ scale });
    const a4Width = 595;  // A4 width in pt at 72dpi
    const a4Height = 842; // A4 height in pt
    const ratio = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = a4Width * ratio;
    canvas.height = a4Height * ratio;
    canvas.style.width = a4Width + "px";
    canvas.style.height = a4Height + "px";

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    page.render({
      canvasContext: context,
      viewport: page.getViewport({ scale: a4Width / viewport.width })
    });

    container.appendChild(canvas);
  });
}

// Render the flipbook
function renderFlipbook() {
  flipbook.innerHTML = "";

  if (doublePage) {
    let leftPage = currentPage;
    if (leftPage % 2 === 1) leftPage--;

    [leftPage, leftPage + 1].forEach(p => {
      if (p >= 1 && p <= pdfDoc.numPages) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page enter";
        renderPage(p, pageDiv);
        flipbook.appendChild(pageDiv);
        setTimeout(() => pageDiv.classList.add("show"), 50);
      }
    });
  } else {
    const pageDiv = document.createElement("div");
    pageDiv.className = "page enter";
    renderPage(currentPage, pageDiv);
    flipbook.appendChild(pageDiv);
    setTimeout(() => pageDiv.classList.add("show"), 50);
  }

  pageNumEl.textContent = `${currentPage} / ${pdfDoc.numPages}`;
}

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = "none";
  renderFlipbook();
});

// Controls
document.getElementById("prev").addEventListener("click", () => {
  if (currentPage > 1) { currentPage--; renderFlipbook(); }
});

document.getElementById("next").addEventListener("click", () => {
  if (currentPage < pdfDoc.numPages) { currentPage++; renderFlipbook(); }
});

document.getElementById("zoom").addEventListener("click", () => {
  scale += 0.25;
  flipbook.style.transform = `scale(${scale / 1.5})`;
  setTimeout(renderFlipbook, 400);
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

// Swipe for mobile
let touchStartX = 0, touchEndX = 0;
flipbook.addEventListener("touchstart", e => touchStartX = e.changedTouches[0].screenX);
flipbook.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  if (swipeDistance > 50 && currentPage > 1) {
    currentPage--;
    renderFlipbook();
  } else if (swipeDistance < -50 && currentPage < pdfDoc.numPages) {
    currentPage++;
    renderFlipbook();
  }
}
