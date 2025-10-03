const url = 'yourcourse.pdf';
const flipSound = new Audio('page-flip.wav');
const flipbook = document.getElementById('flipbook');
const thumbnailsContainer = document.getElementById('thumbnails');
const loader = document.getElementById('loader');
const pageNumber = document.getElementById('page-number');

let pdfDoc = null;
let currentPage = 0;
let doublePage = false;
let navLocked = false;
const pagesCache = [];

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

// Initialize PDF Flipbook
async function init() {
  pdfDoc = await pdfjsLib.getDocument(url).promise;
  loader.style.display = 'none';

  for(let i=0; i<pdfDoc.numPages; i++){
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page');
    pageDiv.style.zIndex = pdfDoc.numPages - i;
    flipbook.appendChild(pageDiv);

    const front = document.createElement('div'); front.classList.add('front');
    const back = document.createElement('div'); back.classList.add('back');
    pageDiv.appendChild(front); pageDiv.appendChild(back);

    const canvas = document.createElement('canvas');
    front.appendChild(canvas);
    pagesCache.push({canvas, loaded:false});

    // Thumbnails
    const page = await pdfDoc.getPage(i+1);
    const thumbCanvas = document.createElement('canvas');
    const thumbCtx = thumbCanvas.getContext('2d');
    const viewport = page.getViewport({scale:0.2});
    thumbCanvas.width = viewport.width;
    thumbCanvas.height = viewport.height;
    await page.render({canvasContext: thumbCtx, viewport}).promise;

    thumbCanvas.classList.add('thumbnail');
    if(i===0) thumbCanvas.classList.add('active');
    thumbnailsContainer.appendChild(thumbCanvas);
    thumbCanvas.addEventListener('click', ()=>goToPage(i));
  }

  updatePageNumber();
  renderVisiblePages();
}

// Render a PDF page into a canvas
function renderPageCanvas(pdfPage, canvas){
  const flipbookWidth = flipbook.clientWidth;
  const flipbookHeight = flipbook.clientHeight;
  let scale;
if(doublePage){
  scale = Math.min((flipbook.clientWidth / 2) / viewport.width,
                   flipbook.clientHeight / viewport.height);
} else {
  scale = Math.min(flipbook.clientWidth / viewport.width,
                   flipbook.clientHeight / viewport.height);
}
  allPages.forEach((p, i) => {
  let flip = Math.floor(currentPage / 2) * 2 > i;
  if(i===0) flip = false; // first page always right
  p.classList.toggle('flipped', flip);
});

  const viewport = pdfPage.getViewport({scale});
  const ratio = window.devicePixelRatio || 1;
  canvas.width = viewport.width * ratio;
  canvas.height = viewport.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  pdfPage.render({canvasContext:ctx, viewport}).promise.then(()=>{});
}
// When rendering pages
allPages.forEach((p, i) => {
  if(doublePage){
    p.classList.add('double');
    if(i % 2 === 0) p.classList.add('left');
    else p.classList.add('right');
  } else {
    p.classList.remove('double', 'left', 'right');
  }
});

// Render only visible pages for performance
async function renderVisiblePages(){
  for(let i=0; i<pagesCache.length; i++){
    if(Math.abs(i-currentPage) <= 1 && !pagesCache[i].loaded){
      const page = await pdfDoc.getPage(i+1);
      renderPageCanvas(page, pagesCache[i].canvas);
      pagesCache[i].loaded = true;
    }
  }
}

// Resize canvases
function updatePageSizes(){
  for(let i=0; i<pagesCache.length; i++){
    if(pagesCache[i].loaded){
      pdfDoc.getPage(i+1).then(page=>(page, pagesCache[i].canvas));
    }
  }
}

// Navigate to a page
function goToPage(index){
  if(navLocked || index<0 || index>=pagesCache.length) return;
  navLocked = true;
  setTimeout(()=>navLocked=false,300);

  flipSound.play();
  const allPages = document.querySelectorAll('.page');
  allPages.forEach((p,i)=>{
    let flip = i<index;
    if(doublePage && i===0) flip=false;
    p.classList.toggle('flipped', flip);
  });

  currentPage = index;
  document.querySelectorAll('.thumbnail').forEach((t,i)=>t.classList.toggle('active', i===index));
  updatePageNumber();
  renderVisiblePages();
}

function updatePageNumber(){
  pageNumber.textContent = `${currentPage+1} / ${pdfDoc.numPages}`;
}

// Controls
document.getElementById('next').addEventListener('click', ()=>goToPage(currentPage+1));
document.getElementById('prev').addEventListener('click', ()=>goToPage(currentPage-1));
document.getElementById('zoom').addEventListener('click', ()=>flipbook.classList.toggle('zoomed'));
document.getElementById('fullscreen').addEventListener('click', ()=>{
  if(flipbook.requestFullscreen) flipbook.requestFullscreen();
  else if(flipbook.webkitRequestFullscreen) flipbook.webkitRequestFullscreen();
});
document.getElementById('doublePage').addEventListener('change', e=>{
  doublePage = e.target.checked;
  flipbook.classList.toggle('double', doublePage);
  updatePageSizes();
  goToPage(currentPage);
});
document.getElementById('goto').addEventListener('change', e=>{
  const val = Math.min(Math.max(1,+e.target.value), pdfDoc.numPages);
  goToPage(val-1);
});

// Keyboard
document.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight') goToPage(currentPage+1);
  if(e.key==='ArrowLeft') goToPage(currentPage-1);
});

// Touch swipe
let startX=0;
flipbook.addEventListener('touchstart', e=>startX=e.touches[0].clientX);
flipbook.addEventListener('touchend', e=>{
  const endX=e.changedTouches[0].clientX;
  if(endX-startX>50) goToPage(currentPage-1);
  if(startX-endX>50) goToPage(currentPage+1);
});

// Responsive
window.addEventListener('resize', ()=>updatePageSizes());

// Start
init();
