let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null,
    currentPageNum = 1,
    hasOpenedOnce = false;

// ✅ Book configuration
const bookConfig = {
  title: "My Course Book",
  author: "John Doe",
  frontCoverColors: ["#222", "#444"],
  backCoverColors: ["#111", "#333"],
  backMessage: "Thanks for reading",
  frontCoverImage: null,   // e.g. "cover.jpg"
  backCoverImage: null     // e.g. "back.jpg"
};

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");

// ✅ Load PDF
pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
  pdfDoc = pdf;
  totalPages = pdf.numPages;
  renderPages();
});

// ✅ Render all pages
async function renderPages() {
  const pages = [];

  // ✅ Add Front Cover
  const cover = document.createElement("div");
  cover.className = "page cover-page";
  if (bookConfig.frontCoverImage) {
    cover.style.background = `url('${bookConfig.frontCoverImage}') center/cover no-repeat`;
  } else {
    cover.style.background = `linear-gradient(135deg, ${bookConfig.frontCoverColors[0]}, ${bookConfig.frontCoverColors[1]})`;
  }
  cover.innerHTML = `
    <div class="cover-content">
      <h1>${bookConfig.title}</h1>
      <p>by ${bookConfig.author}</p>
    </div>
  `;
  pages.push(cover);

  // ✅ Render first 2 PDF pages (quick start)
  for (let i = 1; i <= Math.min(2, totalPages); i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";
    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);
    await renderPage(i, canvas);
    pages.push(wrapper);
    loaderText.textContent = `Loading page ${i} of ${totalPages}...`;
  }

  // Init PageFlip
  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

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
    flippingTime: 1000, // smoother
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    currentPageNum = e.data + 1;
    updatePageInfo(currentPageNum);
    if (soundOn) flipSound.play();
  });

  // ✅ Intro animation only once
  if (!hasOpenedOnce) {
    hasOpenedOnce = true;
    setTimeout(() => {
      pageFlip.flipNext();
      setTimeout(() => pageFlip.flipPrev(), 1200);
    }, 600);
  }

  // Fade out loader
  loader.classList.add("fade-out");
  setTimeout(() => { loader.style.display = "none"; }, 800);

  // ✅ Background rendering
  const bgLoader = document.getElementById("bgLoader");
  bgLoader.style.display = "block";

  setTimeout(async () => {
    for (let i = 3; i <= totalPages; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "page";
      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page";
      wrapper.appendChild(canvas);
      await renderPage(i, canvas);
      pageFlip.loadFromHTML([wrapper], "end");
      bgLoader.textContent = `Loading page ${i} / ${totalPages}`;
    }

    // ✅ Add Back Cover
    const backCover = document.createElement("div");
    backCover.className = "page back-cover-page";
    if (bookConfig.backCoverImage) {
      backCover.style.background = `url('${bookConfig.backCoverImage}') center/cover no-repeat`;
    } else {
      backCover.style.background = `linear-gradient(135deg, ${bookConfig.backCoverColors[0]}, ${bookConfig.backCoverColors[1]})`;
    }
    backCover.innerHTML = `
      <div class="cover-content">
        <h2>The End</h2>
        <p>${bookConfig.backMessage}</p>
      </div>
    `;
    pageFlip.loadFromHTML([backCover], "end");

    bgLoader.style.display = "none";
  }, 100);
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

// ✅ Go To Page
function goToPage(pageNum) {
  if (pageNum >= 1 && pageNum <= totalPages) {
    const sheetIndex = (pageNum % 2 === 0) ? pageNum - 1 : pageNum - 2;
    pageFlip.turnToPage(sheetIndex < 0 ? 0 : sheetIndex);
    currentPageNum = pageNum;
    updatePageInfo(currentPageNum);
    document.getElementById("gotoPage").value = "";
  }
}
document.getElementById("gotoBtn").addEventListener("click", () => {
  const pageNum = parseInt(document.getElementById("gotoPage").value, 10);
  goToPage(pageNum);
});
document.getElementById("gotoPage").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const pageNum = parseInt(e.target.value, 10);
    goToPage(pageNum);
  }
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
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Keyboard support
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight" || e.key === " ") pageFlip.flipNext();
  if (e.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
});
