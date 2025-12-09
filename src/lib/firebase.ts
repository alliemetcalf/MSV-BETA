import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCG29EhICnZf3cjUYq4Hvn2q45ENB2rpQ",
  authDomain: "msv-beta.firebaseapp.com",
  projectId: "msv-beta",
  storageBucket: "msv-beta.firebasestorage.app",
  messagingSenderId: "614074080882",
  appId: "1:614074080882:web:1e1984151011c1323d2ceb",
  measurementId: "G-6L55TC2D5Y"
};


// Initialize Firebase for client-side
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
