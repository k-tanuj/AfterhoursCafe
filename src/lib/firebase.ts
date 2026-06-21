import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNGS-aBnvgSKEWgKJ9Ndj33BoOhUiBkVA",
  authDomain: "afterhours-d8849.firebaseapp.com",
  projectId: "afterhours-d8849",
  storageBucket: "afterhours-d8849.firebasestorage.app",
  messagingSenderId: "950931449580",
  appId: "1:950931449580:web:a7a7267bb76b112f3c27c9",
  measurementId: "G-ZL7SY3545M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
