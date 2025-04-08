<template>
  <div class="flex flex-col justify-center items-center h-screen bg-gray-100 rounded-2xl">
    <div class="bg-white p-8 rounded shadow max-w-sm w-full">
      <h1 class="text-2xl font-bold mb-6 text-center">Sign Up</h1>
      <img src="/logo.png" alt="logo" class="mx-auto mb-4" />
      <form @submit.prevent="handleSignup" class="space-y-4">
        <div>
          <label for="firstName" class="block mb-1 font-medium text-gray-700">First Name</label>
          <input
            id="firstName"
            v-model="firstName"
            type="text"
            required
            @blur="touched.firstName = true"
            :class="inputClass(firstName, touched.firstName)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label for="lastName" class="block mb-1 font-medium text-gray-700">Last Name</label>
          <input
            id="lastName"
            v-model="lastName"
            type="text"
            required
            @blur="touched.lastName = true"
            :class="inputClass(lastName, touched.lastName)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label for="email" class="block mb-1 font-medium text-gray-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            @blur="touched.email = true"
            :class="inputClass(email, touched.email, isValidEmail)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label for="phone" class="block mb-1 font-medium text-gray-700">Phone Number</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            required
            @blur="touched.phone = true"
            :class="inputClass(phone, touched.phone, isValidPhone)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label for="password" class="block mb-1 font-medium text-gray-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            @blur="touched.password = true"
            :class="inputClass(password, touched.password, isValidPassword)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label for="confirmPassword" class="block mb-1 font-medium text-gray-700">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            @blur="touched.confirmPassword = true"
            :class="inputClass(confirmPassword, touched.confirmPassword, passwordsMatch)"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <button
          type="submit"
          class="w-full py-2 px-4 rounded border-2 border-orange-500 bg-transparent text-black hover:bg-orange-700 hover:text-white hover:scale-110 cursor-pointer"
        >
          Sign Up
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNuxtApp, useRouter } from '#app'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const { $auth } = useNuxtApp()
const router = useRouter() 

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')

const touched = ref({
  firstName: false,
  lastName: false,
  email: false,
  phone: false,
  password: false,
  confirmPassword: false
})

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidPhone = (value) => /^[0-9]{10,15}$/.test(value)
const isValidPassword = (value) => /\d/.test(value) && value.length > 6
const passwordsMatch = () => password.value === confirmPassword.value

const inputClass = (value, isTouched, validator = (v) => v.length > 0) => {
  return isTouched && !validator(value)
    ? 'border-pink-500 text-pink-600'
    : 'border-gray-300'
}

const handleSignup = async () => {
  if (!isValidEmail(email.value)) {
    alert("Please enter a valid email address.")
    return
  }

  if (!passwordsMatch()) {
    alert("Passwords do not match.")
    return
  }

  try {
    console.log("Signing up with:", email.value)
    const userCredential = await createUserWithEmailAndPassword(
      $auth,
      email.value.trim(),
      password.value
    )

    const user = userCredential.user
    const db = getFirestore()

    await setDoc(doc(db, 'users', user.uid), {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      createdAt: new Date()
    })

    alert('Registration successful!')
    router.push('/home') 

  } catch (error) {
    console.error("Error signing up:", error.message)
    alert("Signup failed: " + error.message)
  }
}
</script>
