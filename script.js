// robust flipbook loader + interactions
document.addEventListener("DOMContentLoaded", () => {
  // elements
  const flipbookEl = document.getElementById("flipbook");
  const loader = document.getElementById("loader");
  const loaderText = document.getElementById("loaderText");
  const errorBox = document.getElementById("errorBox");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const fullscreenBtn = document.getElementById("fullscreen");
  const soundBtn = document.getElementById("soundToggle");
  const resetBtn = document.getElementById("resetView");
  const flipSound = document.getElementById("flipSound");
  const zoomWrapper = document.getElementById("zoomWrapper");

  // PDF path — must be in same folder as index.html (case-sensitive)
  const LOCAL_PDF = "yourcourse.pdf";

  // fallback test PDF (remote) — used only if local fails
  const FALLBACK_PDF = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

  // configure pdf.js worker (CDN)
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
  } else {
    showError("pdfjsLib not found. Check that pdf.js script loaded.");
    return;
  }

  // initialize PageFlip
  const pageFlip = new St.PageFlip(flipbookEl, {
    width: 700,
    height: 900,
    size: "stretch",
    minWidth: 300,
    maxWidth: 1400,
    minHeight: 300,
    maxHeight: 2000,
    maxShadowOpacity: 0.5,
    showCover: true, // cover + spreads
    mobileScrollSupport: false
  });

  // zoom/pan state (basic)
  let zoomLevel = 1, offsetX = 0, offsetY = 0;
  let startX=0, startY=0, isDragging=false;
  let velocityX = 0, velocityY = 0, momentumId = null;
  let resetHideTimeout = null;

  // helpers
  function log(...args){ console.log("[flipbook]", ...args); }
  function showError(msg){
    console.error(msg);
    errorBox.style.display = "block";
    errorBox.textContent = msg;
    loader.style.display = "none";
  }
  function hideLoader(){
    loader.classList.add("fade-out");
    setTimeout(()=>loader.style.display="none",650);
  }
  function clampOffsets(){
    const wrapperW = zoomWrapper.clientWidth;
    const wrapperH = zoomWrapper.clientHeight;
    const bookW = flipbookEl.offsetWidth * zoomLevel;
    const bookH = flipbookEl.offsetHeight * zoomLevel;
    const maxX = Math.max(0, (bookW - wrapperW)/2);
    const maxY = Math.max(0, (bookH - wrapperH)/2);
    offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
    offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
  }
  function applyTransform(){
    clampOffsets();
    flipbookEl.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
  }
  function showResetBtn(){
    resetBtn.classList.add("visible");
    clearTimeout(resetHideTimeout);
    resetHideTimeout = setTimeout(()=>resetBtn.classList.remove("visible"), 3000);
  }
  function setZoom(scale){
    zoomLevel = Math.min(Math.max(scale, 0.5), 3);
    if (zoomLevel <= 1){
      offsetX = offsetY = 0;
      resetBtn.classList.remove("visible");
      clearTimeout(resetHideTimeout);
    } else showResetBtn();
    applyTransform();
  }

  // momentum
  function applyMomentum(){
    if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1){
      offsetX += velocityX; offsetY += velocityY;
      velocityX *= 0.92; velocityY *= 0.92;
      applyTransform();
      momentumId = requestAnimationFrame(applyMomentum);
    } else {
      cancelAnimationFrame(momentumId);
      momentumId = null;
    }
  }

  // Load PDF pages -> render -> load into PageFlip (DOM nodes)
  async function loadPdfToFlip(pdfUrl){
    try{
      log("Loading PDF:", pdfUrl);
      loaderText.textContent = `Loading pages...`;
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      const pageNodes = [];
      for (let i=1;i<=pdf.numPages;i++){
        loaderText.textContent = `Loading page ${i} of ${pdf.numPages}...`;
        const page = await pdf.getPage(i);
        // choose scale for crispness (device pixel ratio)
        const baseScale = Math.max(1.0, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: baseScale * 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        // DOM node required by PageFlip: <div class="page"><img/></div>
        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        const img = document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        img.alt = `Page ${i}`;
        pageDiv.appendChild(img);
        pageNodes.push(pageDiv);
        log(`Rendered page ${i}`);
      }

      // load the pages into PageFlip (one call)
      pageFlip.loadFromHTML(pageNodes);
      hideLoader();

      // bind navigation AFTER pages exist
      prevBtn.onclick = ()=> pageFlip.flipPrev();
      nextBtn.onclick = ()=> pageFlip.flipNext();

      pageFlip.on("flip", e => {
        const pageNum = e.data + 1;
        pageInfoEl.textContent = `${pageNum} / ${pageFlip.getPageCount()}`;
        if (!flipSound.muted) {
          try { flipSound.currentTime = 0; flipSound.play(); } catch(err){}
        }
      });

      // initial page count
      pageInfoEl.textContent = `1 / ${pageFlip.getPageCount()}`;

      log("PDF loaded into PageFlip. Pages:", pageFlip.getPageCount());
    }catch(err){
      console.error("PDF load/render error:", err);
      // if local failed, try fallback remote PDF for testing
      if (pdfUrl === LOCAL_PDF){
        showError(`Failed to load "${LOCAL_PDF}". Trying fallback test PDF...`);
        setTimeout(()=>{ loadPdfToFlip(FALLBACK_PDF); }, 700);
      } else {
        showError("Failed to load PDF. Open browser console to see details.");
      }
    }
  }

  // start load (local pdf)
  loadPdfToFlip(LOCAL_PDF);

  // Fullscreen button
  fullscreenBtn.addEventListener("click", ()=>{
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  });

  // sound toggle
  soundBtn.addEventListener("click", ()=>{
    flipSound.muted = !flipSound.muted;
    soundBtn.textContent = flipSound.muted ? "🔇" : "🔊";
  });

  // Reset view
  resetBtn.addEventListener("click", ()=>{
    zoomLevel = 1; offsetX = 0; offsetY = 0;
    resetBtn.classList.remove("visible"); clearTimeout(resetHideTimeout);
    applyTransform();
  });

  // Wheel zoom (Ctrl + wheel) for desktop
  zoomWrapper.addEventListener("wheel", (e)=>{
    if (e.ctrlKey){
      e.preventDefault();
      setZoom(zoomLevel + (e.deltaY < 0 ? 0.08 : -0.08));
    }
  }, { passive:false });

  // Mouse drag pan (desktop)
  zoomWrapper.addEventListener("mousedown", (e)=>{
    if (zoomLevel > 1){
      isDragging = true;
      startX = e.pageX - offsetX; startY = e.pageY - offsetY;
      velocityX = velocityY = 0;
      if (momentumId){ cancelAnimationFrame(momentumId); momentumId = null; }
      flipbookEl.classList.add("dragging"); showResetBtn();
    }
  });
  window.addEventListener("mousemove", (e)=>{
    if (!isDragging) return;
    const newX = e.pageX - startX, newY = e.pageY - startY;
    velocityX = newX - offsetX; velocityY = newY - offsetY;
    offsetX = newX; offsetY = newY; applyTransform();
  });
  window.addEventListener("mouseup", ()=>{
    if (!isDragging) return;
    isDragging = false; flipbookEl.classList.remove("dragging"); applyMomentum();
  });

  // Touch handlers: pinch zoom, pan, double-tap
  let lastTap = 0, startDistance = 0;
  zoomWrapper.addEventListener("touchstart", (e)=>{
    if (e.touches.length === 2){
      // pinch start
      startDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    } else if (e.touches.length === 1 && zoomLevel > 1){
      isDragging = true;
      startX = e.touches[0].pageX - offsetX; startY = e.touches[0].pageY - offsetY;
      velocityX = velocityY = 0;
      if (momentumId){ cancelAnimationFrame(momentumId); momentumId = null; }
      flipbookEl.classList.add("dragging"); showResetBtn();
    }
  }, { passive:false });

  zoomWrapper.addEventListener("touchmove", (e)=>{
    if (e.touches.length === 2){
      e.preventDefault();
      const newDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const factor = newDistance / startDistance;
      setZoom(zoomLevel * factor);
      startDistance = newDistance;
    } else if (e.touches.length === 1 && isDragging){
      e.preventDefault();
      const newX = e.touches[0].pageX - startX, newY = e.touches[0].pageY - startY;
      velocityX = newX - offsetX; velocityY = newY - offsetY;
      offsetX = newX; offsetY = newY;
      applyTransform();
    }
  }, { passive:false });

  zoomWrapper.addEventListener("touchend", (e)=>{
    if (isDragging){
      isDragging = false; flipbookEl.classList.remove("dragging"); applyMomentum();
    }
    // double-tap detection
    const now = Date.now();
    if (now - lastTap < 300){
      // double-tap -> toggle zoom
      if (zoomLevel > 1.5) setZoom(1);
      else setZoom(2);
    }
    lastTap = now;
  });

  // double-click (desktop) zoom toggle
  zoomWrapper.addEventListener("dblclick", (e)=>{
    e.preventDefault();
    if (zoomLevel > 1.5) setZoom(1);
    else {
      setZoom(2);
      // center roughly on click
      offsetX = (zoomWrapper.clientWidth/2) - e.offsetX;
      offsetY = (zoomWrapper.clientHeight/2) - e.offsetY;
      applyTransform();
    }
  });

  // double right-click to reset
  let rightClickTime = 0;
  zoomWrapper.addEventListener("contextmenu", (e)=>{
    e.preventDefault();
    const now = Date.now();
    if (now - rightClickTime < 300){
      zoomLevel = 1; offsetX = offsetY = 0; resetBtn.classList.remove("visible"); clearTimeout(resetHideTimeout);
      applyTransform();
    }
    rightClickTime = now;
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e)=>{
    if (e.key === "+" || e.key === "=") setZoom(zoomLevel + 0.1);
    if (e.key === "-") setZoom(zoomLevel - 0.1);
    if (e.key === "0") setZoom(1);
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  });

  // small swipe -> flip pages (touch)
  let swipeStartX = 0, swipeStartY = 0, swipeStartTime = 0;
  zoomWrapper.addEventListener("touchstart", (e)=>{
    if (e.touches.length === 1){
      swipeStartX = e.touches[0].clientX; swipeStartY = e.touches[0].clientY; swipeStartTime = Date.now();
    }
  }, { passive:true });

  zoomWrapper.addEventListener("touchend", (e)=>{
    if (e.changedTouches.length === 1){
      const dx = e.changedTouches[0].clientX - swipeStartX;
      const dy = e.changedTouches[0].clientY - swipeStartY;
      const dt = Date.now() - swipeStartTime;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 60 && dt < 450 && zoomLevel <= 1){
        if (dx < 0) nextBtn.click(); else prevBtn.click();
      }
    }
  }, { passive:true });

}); // DOMContentLoaded end
