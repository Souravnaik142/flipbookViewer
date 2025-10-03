const url = 'yourcourse.pdf';  // PDF file name
let pdfDoc = null;
let scale = 1.5;  // Zoom level
const flipSound = document.getElementById("flipSound");

// Load PDF
pdfjsLib.getDocument(url).promise.then(function(pdf) {
  pdfDoc = pdf;
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

  // Initialize Turn.js (double-page view, curl effect)
  $('#flipbook').turn({
    width: 1000,
    height: 650,
    autoCenter: true,
    display: 'double',   // two pages like a book
    gradients: true,
    acceleration: true,
    when: {
      turning: function() {
        flipSound.currentTime = 0;
        flipSound.play();
      }
    }
  });

  // Navigation
  $("#prev").click(() => $("#flipbook").turn("previous"));
  $("#next").click(() => $("#flipbook").turn("next"));

  // Zoom In/Out
  $("#zoomIn").click(() => zoomBook(1.2));
  $("#zoomOut").click(() => zoomBook(0.8));

  // Fullscreen
  $("#fullscreen").click(() => toggleFullscreen());
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
