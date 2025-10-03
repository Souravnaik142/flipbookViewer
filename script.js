const url = "physics.pdf";

let pdfDoc = null,
    currentPage = 1,
    scale = 1.4,
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

// Render a page
function renderPage(num, sideBySide=false) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale });
    const a4Ratio = 297/210;
    const width = 600;
    const height = width * a4Ratio;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    const renderContext = {
      canvasContext: ctx,
      viewport: page.getViewport({ scale: width/viewport.width })
    };
    page.render(renderContext);

    flipbook.appendChild(canvas);
  });
}

// Render Flipbook
function render() {
  flipbook.innerHTML = "";

  if(doublePage && currentPage>1) {
    // Dual pages
    renderPage(currentPage,true);
    if(currentPage+1<=pdfDoc.numPages) renderPage(currentPage+1,true);
    flipbook.style.flexDirection = "row";
  } else {
    // Single page
    renderPage(currentPage,false);
    flipbook.style.flexDirection = "column";
  }

  pageNum.textContent = `${currentPage} / ${pdfDoc.numPages}`;
}

// Buttons
document.getElementById("prev").addEventListener("click", () => {
  if(currentPage<=1) return;
  currentPage = doublePage && currentPage>2 ? currentPage-2 : currentPage-1;
  render();
});

document.getElementById("next").addEventListener("click", () => {
  if(currentPage>=pdfDoc.numPages) return;
  currentPage = doublePage ? currentPage+2 : currentPage+1;
  render();
});

document.getElementById("zoom").addEventListener("click", () => {
  scale += 0.2;
  flipbook.style.transform = `scale(${scale/1.4})`;
  setTimeout(render,400);
});

document.getElementById("fullscreen").addEventListener("click", () => {
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

document.getElementById("doublePage").addEventListener("change", (e)=>{
  doublePage = e.target.checked;
  render();
});

// Swipe support
let touchStartX=0, touchEndX=0;
flipbook.addEventListener("touchstart", e=> touchStartX = e.changedTouches[0].screenX);
flipbook.addEventListener("touchend", e=>{
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});
function handleSwipe(){
  const distance = touchEndX-touchStartX;
  if(distance>50 && currentPage>1){
    currentPage = doublePage && currentPage>2 ? currentPage-2 : currentPage-1;
    render();
  } else if(distance<-50 && currentPage<pdfDoc.numPages){
    currentPage = doublePage ? currentPage+2 : currentPage+1;
    render();
  }
}
