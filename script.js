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

const pdfUrl = "yourcourse.pdf"; // ⚠️ Replace with your PDF

async function loadPDF() {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Wrap in a page div
    pages.push(`<div class="page"><img src="${canvas.toDataURL()}"></div>`);
  }

  // ✅ Load all pages at once
  pageFlip.loadFromHTML(pages);

  // ✅ Bind navigation after pages exist
  document.getElementById("prevPage").onclick = () => pageFlip.flipPrev();
  document.getElementById("nextPage").onclick = () => pageFlip.flipNext();

  pageFlip.on("flip", e => {
    document.getElementById("pageInfo").textContent = 
      `${e.data + 1} / ${pageFlip.getPageCount()}`;
    flipSound.currentTime = 0;
    flipSound.play();
  });

  // Show initial page count
  document.getElementById("pageInfo").textContent = `1 / ${pdf.numPages}`;
}

loadPDF();
