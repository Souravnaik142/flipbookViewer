const url = "yourcourse.pdf";

let pdfDoc = null,
    currentPage = 1,
    scale = 1.5,
    doublePage = false;

const flipbook = document.getElementById("flipbook");
const pageNum = document.getElementById("page-number");
const loader = document.getElementById("loader");

// Sounds
const flipSound = new Audio('page-flip.wav');
flipSound.volume = 0.3;

const backgroundMusic = new Audio('background.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;
let musicPlaying = false;

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = "none";
  render();
});

// Render page to fit panel
async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
const pageContainerWidth = doublePage ? flipbook.clientWidth / 2 : flipbook.clientWidth;
const pageContainerHeight = flipbook.clientHeight;

  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(pageContainerWidth / viewport.width, pageContainerHeight / viewport.height);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width * scale;
  canvas.height = viewport.height * scale;

  const renderContext = {
    canvasContext: ctx,
    viewport: page.getViewport({ scale })
  };
  await page.render(renderContext).promise;
  return canvas;
}

function createPageDiv(canvas) {
  const pageDiv = document.createElement("div");
  pageDiv.className = "page";
  pageDiv.appendChild(canvas);
  return pageDiv;
}

function flipPage(forward = true) {
  flipSound.currentTime = 0;
  flipSound.play();

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
    flipbook.appendChild(createPageDiv(leftCanvas));

    if(currentPage + 1 <= pdfDoc.numPages) {
      const rightCanvas = await renderPage(currentPage+1);
      flipbook.appendChild(createPageDiv(rightCanvas));
    }
    flipbook.style.flexDirection = "row";
  } else {
    const canvas = await renderPage(currentPage);
    flipbook.appendChild(createPageDiv(canvas));
    flipbook.style.flexDirection = "column";
  }

  pageNum.textContent = `${currentPage} / ${pdfDoc.numPages}`;
}

// Toolbar
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

// Music toggle
document.getElementById("musicToggle").addEventListener("click", () => {
  if(musicPlaying) {
    backgroundMusic.pause();
    musicPlaying = false;
    document.getElementById("musicToggle").style.opacity = 0.6;
  } else {
    backgroundMusic.play();
    musicPlaying = true;
    document.getElementById("musicToggle").style.opacity = 1;
  }
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

// Re-render on window resize
window.addEventListener('resize', () => render());

// Optional: auto-play music
window.addEventListener('load', () => {
  backgroundMusic.play().then(()=> {
    musicPlaying = true;
    document.getElementById("musicToggle").style.opacity = 1;
  }).catch(err=>{});
});
