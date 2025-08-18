import { initGoogleSignIn, getIdToken } from "./googleAuth.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const ADMIN_UID = "qcYSrXTaj1MZUoFsAloBwT86GNM2";

function checkAccess() {
  const user = getAuth().currentUser;
  if (!user || user.uid !== ADMIN_UID) {
    window.location.href = "/index.html";
    return;
  }
  const content = document.getElementById("adminContent");
  const signin = document.getElementById("signinButton");
  if (content) content.style.display = "";
  if (signin) signin.style.display = "none";
}

initGoogleSignIn({ onSignIn: checkAccess });

if (getIdToken()) {
  checkAccess();
}
