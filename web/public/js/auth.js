import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const form = document.getElementById("authForm");
const title = document.getElementById("formTitle");
const description = document.getElementById("formDescription");
const submitButton = document.getElementById("submitButton");
const switchText = document.getElementById("switchText");
const switchMode = document.getElementById("switchMode");
const message = document.getElementById("authMessage");
const password = document.getElementById("password");

let isRegistering = false;

switchMode.addEventListener("click", () => {
  isRegistering = !isRegistering;
  message.textContent = "";

  title.textContent = isRegistering ? "إنشاء حساب جديد" : "تسجيل الدخول";
  description.textContent = isRegistering
    ? "أنشئ حسابك وابدأ رحلتك مع Animerc."
    : "سجّل دخولك للعودة إلى عالمك المفضل.";

  submitButton.textContent = isRegistering ? "إنشاء الحساب" : "تسجيل الدخول";
  switchText.textContent = isRegistering ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟";
  switchMode.textContent = isRegistering ? "تسجيل الدخول" : "إنشاء حساب";

  password.autocomplete = isRegistering ? "new-password" : "current-password";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const passwordValue = password.value;

  message.textContent = "جارٍ المعالجة...";
  message.style.color = "#A3A3A3";
  submitButton.disabled = true;

  try {
    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, passwordValue);
      message.textContent = "تم إنشاء حسابك بنجاح!";
    } else {
      await signInWithEmailAndPassword(auth, email, passwordValue);
      message.textContent = "تم تسجيل الدخول بنجاح!";
    }

    message.style.color = "#38B879";
    window.location.href = "index.html";
  } catch (error) {
    const errors = {
      "auth/email-already-in-use": "هذا البريد مسجل بالفعل. حاول تسجيل الدخول.",
      "auth/invalid-email": "يرجى إدخال بريد إلكتروني صحيح.",
      "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "auth/weak-password": "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",
      "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت.",
      "auth/too-many-requests": "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.",
      "auth/operation-not-allowed": "فعّل تسجيل الدخول بالبريد وكلمة المرور من Firebase Console.",
      "auth/unauthorized-domain": "هذا النطاق غير مسموح. أضفه إلى Authorized domains في إعدادات Authentication."
    };

    message.style.color = "#F06464";
    message.textContent = errors[error.code] || `حدث خطأ: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});
