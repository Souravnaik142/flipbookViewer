const flipbook = document.getElementById("flipbook");
const zoomWrapper = document.getElementById("zoomWrapper");
const resetBtn = document.getElementById("resetView");
const flipSound = document.getElementById("flipSound");

// Loader
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
  }, 1000);
});

// Init PageFlip
const pageFlip = new St.PageFlip(flipbook, {
  width: 600,
  height: 800,
  size: "stretch",
  minWidth: 300,
  maxWidth: 1200,
  minHeight: 400,
  maxHeight: 1600,
  maxShadowOpacity: 0.5,
  showCover: true,
  mobileScrollSupport: false
});

// PDF.js
const pdfUrl = "yourcourse.pdf"; // ⚠️ must be in same folder as index.html

async function loadPDF() {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

  // Make container for page elements
  const pageNodes = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Build real DOM element
    const pageDiv = document.createElement("div");
    pageDiv.classList.add("page");

    const img = document.createElement("img");
    img.src = canvas.toDataURL();

    pageDiv.appendChild(img);
    pageNodes.push(pageDiv);
  }

  // ✅ Load DOM nodes into PageFlip
  pageFlip.loadFromHTML(pageNodes);

  // ✅ Now bind nav
  document.getElementById("prevPage").onclick = () => pageFlip.flipPrev();
  document.getElementById("nextPage").onclick = () => pageFlip.flipNext();

  pageFlip.on("flip", e => {
    document.getElementById("pageInfo").textContent =
      `${e.data + 1} / ${pageFlip.getPageCount()}`;
    flipSound.currentTime = 0;
    flipSound.play();
  });

  // Set initial info
  document.getElementById("pageInfo").textContent = `1 / ${pdf.numPages}`;
}

loadPDF();
