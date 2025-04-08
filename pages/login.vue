<template>
  <div class="flex flex-col justify-center items-center h-screen bg-gray-100">
    <div class="bg-white p-8 rounded shadow max-w-sm w-full">
      <img src="public/logo.png" alt="">

      <h1 class="text-2xl font-bold mb-6 text-center">Log In</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block mb-1 text-gray-700 font-medium">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label for="password" class="block mb-1 text-gray-700 font-medium">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

        <div>
          <button
            type="submit"
            class="w-full py-2 px-4 rounded border-2 border-orange-500 bg-transparent text-black hover:bg-orange-700 hover:text-white hover:scale-110 cursor-pointer"
          >
            Login
          </button>

          <p class="text-xs pa-5">Don't have an account?</p>
          <NuxtLink to="/signup">
            <button
              type="button"
              class="w-full py-1 px-2 rounded bg-transparent text-black hover:text-orange-500 cursor-pointer"
            >
              Sign Up
            </button>
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNuxtApp } from '#app'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

const { $auth, $db } = useNuxtApp()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const handleLogin = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword($auth, email.value, password.value)
    const user = userCredential.user

    const userDocRef = doc($db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      console.log('User data:', userDoc.data())
    } else {
      console.warn('No user data found! Creating a default profile...')

      await setDoc(userDocRef, {
        email: user.email,
        createdAt: new Date()
      })
    }

    router.push('/home')
  } catch (error) {
    console.error('Login error:', error.message)
    if (error.code === 'permission-denied') {
      errorMessage.value = "You don't have permission to access this data."
    } else {
      errorMessage.value = error.message
    }
  }
}
</script>
