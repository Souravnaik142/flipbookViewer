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

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const authSection = document.getElementById("authSection");
const flipbookSection = document.getElementById("flipbookSection");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMessage = document.getElementById("authMessage");

const pageInfo = document.getElementById("pageInfo");
const flipbook = document.getElementById("flipbook");
let pdfDoc = null, totalPages = 0, currentPage = 1;
const MAX_FREE_PAGES = 10;

// Load PDF.js
const pdfUrl = "yourcourse.pdf"; // replace with your GitHub-hosted PDF

// Auth
document.getElementById("signupBtn").addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => authMessage.textContent = "✅ Signup successful!")
    .catch(err => authMessage.textContent = "❌ " + err.message);
});

document.getElementById("loginBtn").addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => {
      authMessage.textContent = "✅ Login successful!";
    })
    .catch(err => authMessage.textContent = "❌ " + err.message);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

// State listener
auth.onAuthStateChanged(user => {
  if (user) {
    authSection.style.display = "none";
    flipbookSection.style.display = "block";
    loadPdf();
  } else {
    authSection.style.display = "block";
    flipbookSection.style.display = "none";
  }
});

// Load PDF
function loadPdf() {
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    renderPage(currentPage);
  });
}

function renderPage(num) {
  if (num > MAX_FREE_PAGES) {
    flipbook.innerHTML = `<p style="color:red;">🔒 Please pay to unlock full access.</p>`;
    pageInfo.textContent = `${MAX_FREE_PAGES} / ${totalPages}`;
    return;
  }

  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({ canvasContext: ctx, viewport: viewport });

    flipbook.innerHTML = "";
    flipbook.appendChild(canvas);

    pageInfo.textContent = `${num} / ${totalPages}`;
  });
}

// Navigation
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage--;
  renderPage(currentPage);
});

document.getElementById("nextPage").addEventListener("click", () => {
  if (currentPage >= totalPages) return;
  currentPage++;
  renderPage(currentPage);
});
