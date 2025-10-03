let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = localStorage.getItem("soundOn") !== "false", // remember state
    pageFlip = null;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");

// ✅ Show loader at startup
window.addEventListener("load", () => {
  loader.classList.add("active");
});

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages
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

  // Reset
  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  // ✅ Init PageFlip
  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    minWidth: 315,
    maxWidth: 1200,
    minHeight: 400,
    maxHeight: 1600,
    maxShadowOpacity: 0.5,
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);

  // ✅ Resume popup
  let savedPage = parseInt(localStorage.getItem("lastPage")) || 1;
  if (savedPage > 1) {
    const resumePopup = document.getElementById("resumePopup");
    const resumeText = document.getElementById("resumeText");
    resumeText.textContent = `Continue where you left off? (Page ${savedPage})`;
    resumePopup.classList.add("active");

    document.getElementById("resumeYes").onclick = () => {
      pageFlip.turnToPage(savedPage - 1);
      updatePageInfo(savedPage);
      closeResumePopup();
    };
    document.getElementById("resumeNo").onclick = () => {
      localStorage.removeItem("lastPage");
      pageFlip.turnToPage(0);
      updatePageInfo(1);
      closeResumePopup();
    };
  } else {
    pageFlip.turnToPage(0);
    updatePageInfo(1);
  }

  // ✅ On flip
  pageFlip.on("flip", (e) => {
    const currentPage = e.data + 1;
    updatePageInfo(currentPage);
    localStorage.setItem("lastPage", currentPage);
    if (soundOn) flipSound.play();
    showNavbar();
  });

  // ✅ Fade out loader once
  if (!loader.classList.contains("fade-out")) {
    loader.classList.remove("active");
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.style.display = "none";
    }, 800);
  }
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
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// ✅ Sound toggle (remember state)
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("soundOn", soundOn);
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});
document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";

// ✅ Navbar auto-hide
let hideNavbarTimeout;
function showNavbar() {
  const navbar = document.querySelector(".navbar");
  navbar.classList.remove("hidden");
  clearTimeout(hideNavbarTimeout);
  hideNavbarTimeout = setTimeout(() => {
    navbar.classList.add("hidden");
  }, 3000);
}
showNavbar();
document.addEventListener("mousemove", showNavbar);
document.addEventListener("keydown", showNavbar);

// ✅ Close resume popup helper
function closeResumePopup() {
  const resumePopup = document.getElementById("resumePopup");
  resumePopup.classList.remove("active");
  setTimeout(() => {
    resumePopup.style.display = "none";
  }, 400);
}
