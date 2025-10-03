const url = "yourcourse.pdf"; // your PDF file

let pdfDoc = null,
    currentPage = 1,
    scale = 1.5,
    doublePage = false;

const flipbook = document.getElementById("flipbook");
const pageNum = document.getElementById("page-number");
const loader = document.getElementById("loader");

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = "none";
  render();
});

// Render single page with high resolution
async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const containerWidth = flipbook.clientWidth / (doublePage ? 2 : 1);
  const viewport = page.getViewport({ scale: 1 });
  const pageScale = containerWidth / viewport.width;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width * pageScale;
  canvas.height = viewport.height * pageScale;

  const renderContext = {
    canvasContext: ctx,
    viewport: page.getViewport({ scale: pageScale })
  };
  await page.render(renderContext).promise;
  return canvas;
}

// Create page div
function createPageDiv(canvas) {
  const pageDiv = document.createElement("div");
  pageDiv.className = "page";
  pageDiv.appendChild(canvas);
  return pageDiv;
}

// Animate page flip
function flipPage(forward = true) {
  const pages = flipbook.querySelectorAll(".page");
  if(forward) pages[0]?.classList.add("flip-forward");
  else pages[pages.length-1]?.classList.add("flip-back");
  setTimeout(render, 400);
}

// Render flipbook
async function render() {
  flipbook.innerHTML = "";

  if(doublePage && currentPage > 1) {
    const leftCanvas = await renderPage(currentPage);
    const leftDiv = createPageDiv(leftCanvas);
    flipbook.appendChild(leftDiv);

    if(currentPage + 1 <= pdfDoc.numPages) {
      const rightCanvas = await renderPage(currentPage+1);
      const rightDiv = createPageDiv(rightCanvas);
      flipbook.appendChild(rightDiv);
    }
    flipbook.style.flexDirection = "row";
  } else {
    const canvas = await renderPage(currentPage);
    const pageDiv = createPageDiv(canvas);
    flipbook.appendChild(pageDiv);
    flipbook.style.flexDirection = "column";
  }

  pageNum.textContent = `${currentPage} / ${pdfDoc.numPages}`;
}

// Toolbar buttons
document.getElementById("prev").addEventListener("click", ()=>{
  if(currentPage <=1) return;
  currentPage = doublePage && currentPage>2 ? currentPage-2 : currentPage-1;
  flipPage(false);
});
document.getElementById("next").addEventListener("click", ()=>{
  if(currentPage >= pdfDoc.numPages) return;
  currentPage = doublePage ? currentPage+2 : currentPage+1;
  flipPage(true);
});
document.getElementById("zoom").addEventListener("click", ()=>{
  scale += 0.2;
  flipbook.style.transform = `scale(${scale/1.5})`;
  setTimeout(render,400);
});
document.getElementById("fullscreen").addEventListener("click", ()=>{
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});
document.getElementById("doublePage").addEventListener("change", e=>{
  doublePage = e.target.checked;
  render();
});

// Swipe support
let touchStartX=0, touchEndX=0;
flipbook.addEventListener("touchstart", e=> touchStartX=e.changedTouches[0].screenX);
flipbook.addEventListener("touchend", e=>{
  touchEndX=e.changedTouches[0].screenX;
  const distance = touchEndX - touchStartX;
  if(distance>50 && currentPage>1){
    currentPage = doublePage && currentPage>2 ? currentPage-2 : currentPage-1;
    flipPage(false);
  } else if(distance<-50 && currentPage<pdfDoc.numPages){
    currentPage = doublePage ? currentPage+2 : currentPage+1;
    flipPage(true);
  }
});
