import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBCaJnrMubayJwuBtS64rBPdXmRsMv2ARw",
  authDomain: "tapago-7c380.firebaseapp.com",
  databaseURL: "https://tapago-7c380-default-rtdb.firebaseio.com",
  projectId: "tapago-7c380",
  storageBucket: "tapago-7c380.firebasestorage.app",
  messagingSenderId: "190072400240",
  appId: "1:190072400240:web:aa93ce0a862c69eec347b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Export initialized services
export { app, auth, db, storage }; 