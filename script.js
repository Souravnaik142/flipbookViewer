const url = 'yourcourse.pdf'; // PDF in the same folder
let pdfDoc = null;
let currentPage = 0;
const flipbook = document.getElementById('flipbook');
const thumbnailsContainer = document.getElementById('thumbnails');
const loader = document.getElementById('loader');
const pageNumber = document.getElementById('page-number');
let doublePage = false;
const flipSound = new Audio('page-flip.wav'); // optional

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

// Load PDF
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  loader.style.display = 'none';

  for (let i = 0; i < pdf.numPages; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page');
    pageDiv.style.zIndex = pdf.numPages - i;
    flipbook.appendChild(pageDiv);

    pdf.getPage(i + 1).then(page => {
      const canvas = document.createElement('canvas');
      pageDiv.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      const viewport = page.getViewport({ scale:1 });
      const containerWidth = flipbook.clientWidth;
      const containerHeight = flipbook.clientHeight;

      let scale;
      if(doublePage){
        scale = Math.min((containerWidth/2)/viewport.width, containerHeight/viewport.height)*2;
      } else {
        scale = Math.min(containerWidth/viewport.width, containerHeight/viewport.height)*2;
      }

      const scaledViewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      canvas.width = scaledViewport.width * ratio;
      canvas.height = scaledViewport.height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      page.render({ canvasContext: ctx, viewport: scaledViewport });
      canvas.style.width='100%'; canvas.style.height='100%';

      // Thumbnails
      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      const thumbScale = 100 / viewport.width;
      thumbCanvas.width = viewport.width * thumbScale;
      thumbCanvas.height = viewport.height * thumbScale;
      page.render({ canvasContext: thumbCtx, viewport: page.getViewport({ scale: thumbScale }) });
      thumbCanvas.classList.add('thumbnail');
      if(i===0) thumbCanvas.classList.add('active');
      thumbnailsContainer.appendChild(thumbCanvas);
      thumbCanvas.addEventListener('click', ()=>goToPage(i));
    });
  }
  updatePageNumber();
});

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
  goToPage(currentPage);
});

function goToPage(pageIndex){
  const allPages = pages();
  if(pageIndex<0 || pageIndex>=allPages.length) return;
  flipSound.play();

  allPages.forEach((p,i)=>p.classList.toggle('flipped', i<pageIndex));
  currentPage = pageIndex;

  document.querySelectorAll('.thumbnail').forEach((thumb,i)=>thumb.classList.toggle('active', i===pageIndex));
  updatePageNumber();
}

function updatePageNumber(){
  if(!pdfDoc) return;
  pageNumber.textContent = `${currentPage+1} / ${pdfDoc.numPages}`;
}

// Keyboard
document.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight') goToPage(currentPage+1);
  if(e.key==='ArrowLeft') goToPage(currentPage-1);
});

// Swipe
let startX=0;
flipbook.addEventListener('touchstart', e=>startX=e.touches[0].clientX);
flipbook.addEventListener('touchend', e=>{
  const endX=e.changedTouches[0].clientX;
  if(endX-startX>50) goToPage(currentPage-1);
  if(startX-endX>50) goToPage(currentPage+1);
});
