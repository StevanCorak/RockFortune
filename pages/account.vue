<template>
  <div class="p-6 md:p-8 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <div v-if="loading" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
        <p class="mt-3 text-gray-600">Loading account info...</p>
      </div>

      <div v-else>
        <div v-if="!userInfo" class="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow" role="alert">
          <strong class="font-bold">Error:</strong>
          <span class="block sm:inline"> User information could not be loaded. Please try again later.</span>
        </div>
        <h2 class="text-3xl text-center font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 ">User Inforamtion</h2>
        <div v-if="userInfo" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200 mb-10">
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">First Name</p>
            <p class="font-semibold text-slate-900 text-lg">{{ userInfo.firstName }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Name</p>
            <p class="font-semibold text-slate-900 text-lg">{{ userInfo.lastName }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
            <p class="font-medium text-slate-800 break-words">{{ userInfo.email }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
            <p class="font-medium text-slate-800">{{ userInfo.phone || 'N/A' }}</p> </div>
            <div>
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Wallet</p>
            <p class="font-medium text-slate-800">{{ userInfo.wallet || 'N/A' }}$</p> </div>
        </div>
        </div>
       

        <div v-if="userInfo"> 
          <h2 class="text-2xl text-center font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200 ">Lands Owned</h2>

          <div v-if="lands.length === 0" class="text-center bg-white p-8 rounded-lg shadow border border-gray-200">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
               <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               <path stroke-linecap="round" stroke-linejoin="round" d="M17.94 14.56a4.5 4.5 0 01-6.88 0M12 17.77a4.5 4.5 0 01-3.12-1.23" /> 
             </svg>
            <p class="text-gray-500">You currently do not own any lands, or they failed to load.</p>
             </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="land in lands"
              :key="land.id"
              class="p-6 bg-white shadow-lg rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col"
            >
              <p class="text-xl font-semibold text-orange-600 mb-4">{{ land.name }}</p>
              <div class="space-y-2 text-sm flex-grow"> 
                <div class="flex justify-between">
                  <span class="text-gray-500">Type:</span>
                  <span class="font-medium text-gray-800">{{ land.type }}</span>
                </div>
                 <div class="flex justify-between">
                  <span class="text-gray-500">Mineral:</span>
                  <span class="font-medium text-gray-800">{{ land.mineral }} </span>
                </div>
                 <div class="flex justify-between">
                  <span class="text-gray-500">Forested:</span>
                  <span :class="['font-medium', land.forested ? 'text-green-600' : 'text-red-600']">{{ land.forested ? 'Yes' : 'No' }}</span>
                </div>
                 <div class="flex justify-between">
                  <span class="text-gray-500">Weather:</span>
                  <span class="font-medium text-gray-800">{{ land.weather }}</span>
                </div>
                 <div class="flex justify-between">
                  <span class="text-gray-500">Size:</span>
                  <span class="font-medium text-gray-800">{{ land.size }} acres</span>
                </div>
              </div>
               <div class="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm"> 
                 <div class="flex justify-between">
                   <span class="text-gray-500">Purchase Cost:</span>
                   <span class="font-semibold text-blue-600">${{ land.cost.toLocaleString() }}</span> 
                 </div>
                 <div class="flex justify-between">
                   <span class="text-gray-500">Monthly Rent:</span>
                   <span class="font-semibold text-green-700">${{ land.rent.toLocaleString() }} / mo</span> 
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onAuthStateChanged, type Auth } from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  type Firestore
} from 'firebase/firestore'
import { useNuxtApp } from '#app'

// Inject Firebase from Nuxt
const { $auth, $db } = useNuxtApp()
const auth = $auth as Auth
const db = $db as Firestore

// Interfaces
interface UserInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  wallet: number
}

interface Land {
  id: string
  name: string
  type: string
  mineral: string
  percentage: number
  forested: boolean
  cost: number
  rent: number
  weather: string
  size: number
}

// Reactive state
const loading = ref(true)
const userInfo = ref<UserInfo | null>(null)
const lands = ref<Land[]>([])

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn('No user signed in.')
      loading.value = false
      return
    }

    console.log('🔐 Logged in as:', user.uid)

    try {
      const userDoc = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userDoc)

      if (userSnap.exists()) {
        userInfo.value = userSnap.data() as UserInfo
        console.log('👤 User info:', userInfo.value)

        const landmarksRef = collection(db, 'landmarks')
        const landmarksQuery = query(landmarksRef, where('owner', '==', userInfo.value.email))
        const snapshot = await getDocs(landmarksQuery)

        lands.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Land, 'id'>)
        }))

        console.log('📍 Lands found:', lands.value)
      } else {
        console.warn('No user doc found for UID:', user.uid);
        userInfo.value = null; 
      }
    } catch (err) {
      console.error('🔥 Error fetching data:', err)
       userInfo.value = null; 
       lands.value = []; 
    } finally {
      loading.value = false
    }
  })
})
</script>