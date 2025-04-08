import { defineNuxtPlugin } from '#app'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7nCo9czvscjB-FCaKJRVdpClKq-Hagy0",
  authDomain: "rockfortune-a204e.firebaseapp.com",
  projectId: "rockfortune-a204e",
  storageBucket: "rockfortune-a204e.firebasestorage.app",
  messagingSenderId: "1032399358666",
  appId: "1:1032399358666:web:7e9d4c10b00cb4e74a4233",
  measurementId: "G-YSRQ9SJNBP"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
let analytics = null

if (process.client) {
  analytics = getAnalytics(app) // Only initialize analytics on the client side
}

// Provide Firebase services globally in Nuxt
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('auth', auth)
  nuxtApp.provide('db', db)
  nuxtApp.provide('analytics', analytics)
})
