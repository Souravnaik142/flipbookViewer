// ✅ Firebase Config
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

let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    pageFlip = null,
    isPaidUser = false;

// Elements
const authContainer = document.getElementById("authContainer");
const viewer = document.getElementById("viewer");
const errorMsg = document.getElementById("errorMsg");
const flipbook = document.getElementById("flipbook");
const flipSound = document.getElementById("flipSound");
const pageInfo = document.getElementById("pageInfo");

// ✅ Signup
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("✅ Signup successful! Please login.");
  } catch (err) {
    errorMsg.textContent = "❌ " + err.message;
  }
});

// ✅ Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await auth.signInWithEmailAndPassword(email, password);

    // Check JSON for paid status
    fetch("users.json")
      .then(res => res.json())
      .then(users => {
        isPaidUser = users[email] && users[email].paid === true;

        authContainer.style.display = "none";
        viewer.style.display = "block";

        loadPDF();
      });
  } catch (err) {
    errorMsg.textContent = "❌ " + err.message;
  }
});

// ✅ Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  viewer.style.display = "none";
  authContainer.style.display = "block";
});

// ✅ Load PDF
function loadPDF() {
  pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    renderPages();
  });
}

// ✅ Render Pages
async function renderPages() {
  const pages = [];
  const maxPages = isPaidUser ? totalPages : 10;

  for (let i = 1; i <= maxPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);
  }

  flipbook.innerHTML = "";

  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    showCover: true,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    flipSound.play();
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
  pageInfo.textContent = `${pageNum} / ${isPaidUser ? totalPages : 10}`;
}

// ✅ Navigation
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});
