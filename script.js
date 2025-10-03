let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = localStorage.getItem("soundOn") !== "false",
    pageFlip = null,
    lastPage = parseInt(localStorage.getItem("lastPage")) || 1;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const navbar = document.getElementById("navbar");

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages into flipbook
async function renderPages() {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    loaderText.textContent = `Loading page ${i} of ${totalPages}...`;
  }

  // Reset container
  flipbook.innerHTML = "";

  // Destroy previous instance if exists
  if (pageFlip) {
    pageFlip.destroy();
  }

  // ✅ Init PageFlip
  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    minWidth: 315,
    maxWidth: 2000,
    minHeight: 400,
    maxHeight: 2000,
    maxShadowOpacity: 0.5,
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);

  // Show loader fade out
  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => { loader.style.display = "none"; }, 800);
  }

  // Resume popup if lastPage exists
  if (lastPage > 1) {
    showResumePopup();
  } else {
    pageFlip.turnToPage(0);
    updatePageInfo(1);
  }

  pageFlip.on("flip", (e) => {
    const currentPage = e.data + 1;
    updatePageInfo(currentPage);
    localStorage.setItem("lastPage", currentPage);
    if (soundOn) flipSound.play();
    showNavbar();
  });
}

// ✅ Render single page
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    return page.render({ canvasContext: ctx, viewport: viewport }).promise;
  });
}

// ✅ Update page info
function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// ✅ Navigation
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
  showNavbar();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
  showNavbar();
});

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("soundOn", soundOn);
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});
document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";

// ✅ Auto-hide navbar
let hideTimeout;
function showNavbar() {
  navbar.classList.remove("hidden");
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    navbar.classList.add("hidden");
  }, 3000);
}
document.addEventListener("mousemove", showNavbar);
document.addEventListener("keydown", showNavbar);

// ✅ Resume popup logic
function showResumePopup() {
  const popup = document.getElementById("resumePopup");
  popup.classList.add("active");

  document.getElementById("resumeYes").onclick = () => {
    popup.classList.remove("active");
    pageFlip.turnToPage(lastPage - 1);
    updatePageInfo(lastPage);
  };
  document.getElementById("resumeNo").onclick = () => {
    popup.classList.remove("active");
    pageFlip.turnToPage(0);
    updatePageInfo(1);
  };
}

// ✅ Keyboard navigation (arrows)
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") {
    pageFlip.flipPrev();
    showNavbar();
  } else if (e.key === "ArrowRight") {
    pageFlip.flipNext();
    showNavbar();
  }
});
