// Firebase Config
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

// Elements
const loginOverlay = document.getElementById("loginOverlay");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");
const flipbook = document.getElementById("flipbook");

let pdfDoc = null, totalPages = 0, pageFlip = null, scale = 1.2, soundOn = true;
let currentUser = null;
let paidUser = false;

// ✅ Load users.json
async function loadUsers() {
  const res = await fetch("users.json");
  return res.json();
}

// ✅ Login
loginBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});

// ✅ Signup (optional)
signupBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});

// ✅ Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// ✅ Firebase Auth State
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    loginOverlay.style.display = "none";
    welcomeUser.textContent = `Welcome, ${user.email.split("@")[0]}`;
    logoutBtn.style.display = "inline-block";

    // 🔹 Check paid status from users.json
    const users = await loadUsers();
    const found = users.find(u => u.email === user.email);
    paidUser = found ? found.paid : false;

    loadPDF();
  } else {
    currentUser = null;
    loginOverlay.style.display = "flex";
    welcomeUser.textContent = "";
    logoutBtn.style.display = "none";
  }
});

// ✅ Load PDF
function loadPDF() {
  pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = paidUser ? pdf.numPages : Math.min(10, pdf.numPages);
    renderPages();
  });
}

// ✅ Render Pages
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
  }

  // 🔒 If not paid, add locked page
  if (!paidUser) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:20px;">
        🔒 Purchase required to view more pages!
      </div>`;
    pages.push(wrapper);
  }

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    showCover: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);
}

// ✅ Render PDF page
function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport }).promise;
  });
}
