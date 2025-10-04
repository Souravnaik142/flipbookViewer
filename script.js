import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { firebaseConfig } from "./keys.js";

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elements
const authContainer = document.getElementById("authContainer");
const viewer = document.getElementById("viewer");
const flipbook = document.getElementById("flipbook");
const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");

let pdfDoc = null, totalPages = 0, scale = 1.2, pageFlip = null, soundOn = true;

// ---------------- AUTH ---------------- //
document.getElementById("signupBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert("✅ Signed up as " + userCredential.user.email);
      authContainer.style.display = "none";
      viewer.style.display = "block";
      loadPDF();
    })
    .catch(err => alert("❌ " + err.message));
});

document.getElementById("signinBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert("✅ Welcome back " + userCredential.user.email);
      authContainer.style.display = "none";
      viewer.style.display = "block";
      loadPDF();
    })
    .catch(err => alert("❌ " + err.message));
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    authContainer.style.display = "block";
    viewer.style.display = "none";
  });
});

// ---------------- PDF + FLIPBOOK ---------------- //
function loadPDF() {
  pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    renderPages();
  });
}

async function renderPages() {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    wrapper.appendChild(canvas);
    await renderPage(i, canvas);

    pages.push(wrapper);
  }

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500, height: 700, size: "stretch",
    showCover: true, useMouseEvents: true, mobileScrollSupport: true
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    if (soundOn) flipSound.play();
  });
}

function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport: viewport }).promise;
  });
}

function updatePageInfo(pageNum) {
  pageInfo.textContent = `${pageNum} / ${totalPages}`;
}

// Controls
document.getElementById("prevPage").addEventListener("click", () => pageFlip.flipPrev());
document.getElementById("nextPage").addEventListener("click", () => pageFlip.flipNext());
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});
