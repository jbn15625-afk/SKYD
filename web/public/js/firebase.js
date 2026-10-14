import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbwm7AKaqZKWd5UbLNLO2aO_gBmvtVua0",
  authDomain: "skyd-415bc.firebaseapp.com",
  databaseURL: "https://skyd-415bc-default-rtdb.firebaseio.com",
  projectId: "skyd-415bc",
  storageBucket: "skyd-415bc.firebasestorage.app",
  messagingSenderId: "966624727102",
  appId: "1:966624727102:web:96d02db29d41e8687fc16f",
  measurementId: "G-FW3VFSVE4X"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
