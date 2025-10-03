// PDF.js setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

const url = 'yourcourse.pdf';  // PDF file
let pdfDoc = null;
let scale = 1.5;  // Default zoom
const flipSound = document.getElementById("flipSound");

// Load PDF
pdfjsLib.getDocument(url).promise.then(function(pdf) {
  pdfDoc = pdf;
  document.getElementById("pageIndicator").textContent = `Page 1 / ${pdfDoc.numPages}`;
  loadPages();
});

function loadPages() {
  const flipbook = document.getElementById('flipbook');

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageDiv = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.id = 'page' + i;
    pageDiv.appendChild(canvas);
    flipbook.appendChild(pageDiv);

    renderPage(i, canvas);
  }

  // Hide loader when pages ready
  document.getElementById("loadingOverlay").style.display = "none";

  // Initialize Turn.js
  $('#flipbook').turn({
    width: 1000,
    height: 650,
    autoCenter: true,
    display: 'double',
    gradients: true,
    acceleration: true,
    when: {
      turning: function(event, page) {
        flipSound.currentTime = 0;
        flipSound.play();
        updatePageIndicator(page);
      }
    }
  });

  // Navigation
  $("#prev").click(() => $("#flipbook").turn("previous"));
  $("#next").click(() => $("#flipbook").turn("next"));

  // Zoom
  $("#zoomIn").click(() => zoomBook(1.2));
  $("#zoomOut").click(() => zoomBook(0.8));

  // Fullscreen
  $("#fullscreen").click(() => toggleFullscreen());

  // Page Jump
  $("#jumpBtn").click(() => {
    const pageNum = parseInt($("#pageJump").val());
    if (pageNum >= 1 && pageNum <= pdfDoc.numPages) {
      $("#flipbook").turn("page", pageNum);
    }
  });
}

function renderPage(num, canvas) {
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: scale });
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: context,
      viewport: viewport
    });
  });
}

// Update Page Indicator
function updatePageIndicator(currentPage) {
  document.getElementById("pageIndicator").textContent =
    `Page ${currentPage} / ${pdfDoc.numPages}`;
}

// Zoom function
function zoomBook(factor) {
  scale *= factor;
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const canvas = document.getElementById('page' + i);
    renderPage(i, canvas);
  }
}

// Fullscreen toggle
function toggleFullscreen() {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => {
      alert(`Error attempting fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}
