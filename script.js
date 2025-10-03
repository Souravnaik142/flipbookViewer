// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MSG_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null,
    maxAllowedPages = null;

const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");

const loginOverlay = document.getElementById("loginOverlay");
const adminOverlay = document.getElementById("adminOverlay");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");
const logoutBtn = document.getElementById("logoutBtn");
const adminBtn = document.getElementById("adminBtn");
const welcomeUser = document.getElementById("welcomeUser");

const usersList = document.getElementById("usersList");
const searchInput = document.getElementById("userSearch");
const roleFilter = document.getElementById("roleFilter");

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
  let maxPages = maxAllowedPages || totalPages;

  for (let i = 1; i <= maxPages; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    loaderText.textContent = `Loading page ${i} of ${maxPages}...`;
  }

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 600,
    height: 800,
    size: "stretch",
    minWidth: 315,
    maxWidth: 1600,
    minHeight: 400,
    maxHeight: 2000,
    maxShadowOpacity: 0.5,
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: false,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    if (soundOn) flipSound.play();
  });

  if (!loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => loader.style.display = "none", 800);
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
  pageInfo.textContent = `${pageNum} / ${maxAllowedPages || totalPages}`;
}

// ✅ Navigation
document.getElementById("prevPage").addEventListener("click", () => { if (pageFlip) pageFlip.flipPrev(); });
document.getElementById("nextPage").addEventListener("click", () => { if (pageFlip) pageFlip.flipNext(); });

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") pageFlip.flipNext();
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
});

// ✅ Auth Signup
signupBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(cred => {
      return db.collection("users").doc(cred.user.uid).set({
        email: cred.user.email,
        role: "free"
      });
    })
    .then(() => {
      authMessage.textContent = "Account created ✅ Please log in.";
      authMessage.style.color = "lime";
    })
    .catch(err => {
      authMessage.textContent = err.message;
      authMessage.style.color = "red";
    });
});

// ✅ Auth Login
loginBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => {
      authMessage.textContent = err.message;
      authMessage.style.color = "red";
    });
});

// ✅ Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    loginOverlay.style.display = "none";
    welcomeUser.textContent = `Welcome, ${user.email.split("@")[0]}`;
    logoutBtn.style.display = "inline-block";

    db.collection("users").doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const role = doc.data().role;
        if (role === "premium") maxAllowedPages = null;
        else maxAllowedPages = 10;

        loadPDF();

        // Show Admin button only for allowed email
        if (user.email === "souravnaik142@gmail.com") {
          adminBtn.style.display = "inline-block";
        }
      }
    });
  } else {
    loginOverlay.style.display = "flex";
    welcomeUser.textContent = "";
    logoutBtn.style.display = "none";
    adminBtn.style.display = "none";
  }
});

// ✅ Logout
logoutBtn.addEventListener("click", () => auth.signOut());

// ✅ Admin Panel
let unsubscribeUsers = null;
function startUserListener() {
  if (unsubscribeUsers) unsubscribeUsers();
  unsubscribeUsers = db.collection("users").onSnapshot(snapshot => {
    usersList.innerHTML = "";
    snapshot.forEach(doc => {
      const user = doc.data();

      if (searchInput.value && !user.email.toLowerCase().includes(searchInput.value.toLowerCase())) return;
      if (roleFilter.value && user.role !== roleFilter.value) return;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td><button onclick="setRole('${doc.id}','premium')">Premium</button></td>
        <td><button onclick="setRole('${doc.id}','free')">Free</button></td>
        <td><button onclick="deleteUser('${doc.id}')">❌ Delete</button></td>
      `;
      usersList.appendChild(row);
    });
  });
}

function openAdmin() {
  adminOverlay.style.display = "flex";
  startUserListener();
}
function closeAdmin() {
  adminOverlay.style.display = "none";
  if (unsubscribeUsers) unsubscribeUsers();
}
adminBtn.addEventListener("click", openAdmin);

function setRole(uid, role) {
  db.collection("users").doc(uid).update({ role });
}

function deleteUser(uid) {
  if (confirm("Are you sure you want to delete this user?")) {
    const deleteUserFn = functions.httpsCallable("deleteUserAccount");
    deleteUserFn({ uid })
      .then(result => alert("✅ " + result.data.message))
      .catch(err => alert("❌ " + err.message));
  }
}

searchInput.addEventListener("input", () => startUserListener());
roleFilter.addEventListener("change", () => startUserListener());
