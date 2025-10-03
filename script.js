const url = 'yourcourse.pdf'; // PDF file in main folder
let pdfDoc = null;
let currentPage = 0;
const flipbook = document.getElementById('flipbook');
const thumbnailsContainer = document.getElementById('thumbnails');
const loader = document.getElementById('loader');
const pageNumber = document.getElementById('page-number');
let doublePage = false;
const flipSound = new Audio('page-flip.wav'); // optional WAV sound

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = 'none';

  for (let i = 0; i < pdf.numPages; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page');
    pageDiv.style.zIndex = pdf.numPages - i;

    // Front + back
    const front = document.createElement('div');
    front.classList.add('front');
    const back = document.createElement('div');
    back.classList.add('back');
    pageDiv.appendChild(front);
    pageDiv.appendChild(back);

    flipbook.appendChild(pageDiv);

    pdf.getPage(i + 1).then(page => {
      const canvas = document.createElement('canvas');
      front.appendChild(canvas);   // ✅ canvas only on front side
      const ctx = canvas.getContext('2d');

      const viewport = page.getViewport({ scale: 1 });
      renderPageCanvas(page, canvas, viewport);

      // Thumbnails
      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      const thumbScale = 100 / viewport.width;
      thumbCanvas.width = viewport.width * thumbScale;
      thumbCanvas.height = viewport.height * thumbScale;
      page.render({ canvasContext: thumbCtx, viewport: page.getViewport({ scale: thumbScale }) });
      thumbCanvas.classList.add('thumbnail');
      if (i === 0) thumbCanvas.classList.add('active');
      thumbnailsContainer.appendChild(thumbCanvas);
      thumbCanvas.addEventListener('click', () => goToPage(i));
    });
  }
  updatePageNumber();
  window.addEventListener('resize', () => updatePageSizes());
});

// Render PDF page into canvas
function renderPageCanvas(pdfPage, canvas, viewport){
  const flipbookWidth = flipbook.clientWidth;
  const flipbookHeight = flipbook.clientHeight;
  let scale;
  if(doublePage){
    scale = Math.min((flipbookWidth/2)/viewport.width, flipbookHeight/viewport.height)*2;
  } else {
    scale = Math.min(flipbookWidth/viewport.width, flipbookHeight/viewport.height)*2;
  }

  const scaledViewport = pdfPage.getViewport({ scale });
  const ratio = window.devicePixelRatio || 1;
  canvas.width = scaledViewport.width * ratio;
  canvas.height = scaledViewport.height * ratio;
  canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
  pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport });
}

// Update all page sizes (responsive)
function updatePageSizes(){
  const allPages = document.querySelectorAll('.page');
  allPages.forEach((page, i)=>{
    const canvas = page.querySelector('.front canvas');
    if(!canvas) return;
    pdfDoc.getPage(i+1).then(pdfPage=>{
      renderPageCanvas(pdfPage, canvas, pdfPage.getViewport({ scale:1 }));
    });
  });
}

// Controls
const pages = ()=>document.querySelectorAll('.page');
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

// Navigate pages
function goToPage(pageIndex){
  const allPages = pages();
  if(pageIndex<0 || pageIndex>=allPages.length) return;
  flipSound.play();

  allPages.forEach((p,i)=>{
    let flip = i < pageIndex;
    // First page always on right in double mode
    if(doublePage && i === 0) flip = false;
    p.classList.toggle('flipped', flip);
  });

  currentPage = pageIndex;
  document.querySelectorAll('.thumbnail').forEach((thumb,i)=>thumb.classList.toggle('active', i===pageIndex));
  updatePageNumber();
}

function updatePageNumber(){
  if(!pdfDoc) return;
  pageNumber.textContent = `${currentPage+1} / ${pdfDoc.numPages}`;
}

// Keyboard navigation
document.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight') goToPage(currentPage+1);
  if(e.key==='ArrowLeft') goToPage(currentPage-1);
});

// Swipe navigation for mobile
let startX=0;
flipbook.addEventListener('touchstart', e=>startX=e.touches[0].clientX);
flipbook.addEventListener('touchend', e=>{
  const endX=e.changedTouches[0].clientX;
  if(endX-startX>50) goToPage(currentPage-1);
  if(startX-endX>50) goToPage(currentPage+1);
});
