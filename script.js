// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBzEhgiJXph4CbXBBwxcNU3MjDCHc0rWZo",
  authDomain: "flipbook-7540.firebaseapp.com",
  projectId: "flipbook-7540",
  storageBucket: "flipbook-7540.firebasestorage.app",
  messagingSenderId: "430421789223",
  appId: "1:430421789223:web:fdca22655543a637bf9c02",
  measurementId: "G-2T9KF0DXL5"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 🔹 Elements
const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");
const loginOverlay = document.getElementById("loginOverlay");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");

// 🔹 PDF / Flipbook
let pdfDoc = null, totalPages = 0, scale = 1.2, soundOn = true, pageFlip = null;

// ✅ Auth
loginBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});
signupBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => location.reload());
});

// ✅ Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    loginOverlay.style.display = "none";
    welcomeUser.textContent = `Welcome, ${user.email.split("@")[0]}`;
    logoutBtn.style.display = "inline-block";
    loadPDF();
  } else {
    loginOverlay.style.display = "flex";
    welcomeUser.textContent = "";
    logoutBtn.style.display = "none";
  }
});

// ✅ Load PDF
function loadPDF() {
  pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    renderPages();
  });
}

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

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    if (soundOn) flipSound.play();
  });

  loader.classList.add("fade-out");
  setTimeout(() => loader.style.display = "none", 800);
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

// ✅ Page Info
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

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Keyboard
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight") pageFlip.flipNext();
});
