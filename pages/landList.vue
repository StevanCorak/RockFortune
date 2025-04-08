<template>
  
  <div class="p-6 lg:p-8 max-w-7xl mx-auto"> <h1 class="text-3xl text-center font-bold mb-8 text-gray-800 border-b pb-4">Available Lands</h1> 
    <div class="text-right text-sm text-gray-600 mb-6">
  <strong>Account Balance:</strong>
  <span v-if="wallet !== null">${{ wallet.toLocaleString() }}</span>
  <span v-else>Loading...</span>
</div>

    <div v-if="loading" class="text-center text-gray-500 py-10">
    
      <p>Loading available lands...</p> </div>

    <div v-else-if="lands.length === 0" class="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
      <p>No lands currently available for purchase.</p> </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"> <div
        v-for="land in lands"
        :key="land.id"
        class="bg-white rounded-xl shadow-md hover:shadow-xl transition duration-300 ease-in-out overflow-hidden flex flex-col"
        >
        <div class="p-6"> <h2 class="text-2xl font-semibold text-orange-600 mb-4">{{ land.name }}</h2> <div class="space-y-2 text-sm text-gray-700 mb-5"> 
          <p><strong class="font-medium text-gray-900">Owner Contact:</strong> {{ land.owner }}</p>
          <p><strong class="font-medium text-gray-900">Type:</strong> {{ land.type }}</p>
            <p><strong class="font-medium text-gray-900">Dominant Mineral:</strong> {{ land.mineral }} </p> <p><strong class="font-medium text-gray-900">Forested:</strong>
              <span :class="land.forested ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                {{ land.forested ? 'Yes' : 'No' }}
              </span> </p>
            <p><strong class="font-medium text-gray-900">Weather:</strong> {{ land.weather }}</p>
            <p><strong class="font-medium text-gray-900">Size:</strong> {{ land.size }} acres</p>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 space-y-2"> <p class="text-lg font-semibold text-gray-800">
               <strong class="font-medium text-gray-900">Cost:</strong> ${{ land.cost.toLocaleString() }} </p>
             <p class="text-base text-gray-600">
               <strong class="font-medium text-gray-700">Est. Rent:</strong> ${{ land.rent.toLocaleString() }} / mo </p>
          </div>
        </div>

        <div class="mt-auto p-4 bg-gray-50"> <button
            @click="buyLand(land.id)"
            class="w-full bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-200 ease-in-out"
            >
            Purchase Land
          </button>
        </div>
      </div>
    </div>

    <div v-if="message" class="mt-8 p-4 bg-green-100 border border-green-300 text-green-800 rounded-md text-center">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore'

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
  owner?: string
}

const auth = getAuth()
const db = getFirestore()

const lands = ref<any[]>([])
const loading = ref(true)
const message = ref('')
const userEmail = ref('')
const wallet = ref<number | null>(null)

const fetchLands = async () => {
  const snapshot = await getDocs(collection(db, 'landmarks'))

  lands.value = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Land))
    .filter(land => !land.owner || land.owner !== userEmail.value)

  loading.value = false
}

const buyLand = async (landId: string) => {
  if (!userEmail.value) {
    message.value = 'You must be signed in to buy land.'
    return
  }

  try {
    const landRef = doc(db, 'landmarks', landId)
    const landSnap = await getDoc(landRef)

    if (!landSnap.exists()) {
      message.value = 'Land not found.'
      return
    }

    const landData = landSnap.data() as Land
    const landCost = landData.cost

    const user = auth.currentUser
    if (!user) {
      message.value = 'You must be signed in to buy land.'
      return
    }

    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    const userData = userSnap.data()

    if (!userData || typeof userData.wallet !== 'number') {
      message.value = 'Unable to retrieve your wallet information.'
      return
    }

    const currentBalance = userData.wallet

    if (currentBalance < landCost) {
      message.value = 'Insufficient balance to purchase this land.'
      return
    }

    await updateDoc(landRef, {
      owner: userEmail.value
    })

    await updateDoc(userRef, {
      wallet: currentBalance - landCost
    })

    wallet.value = currentBalance - landCost

    message.value = 'Land purchased successfully!'
    await fetchLands()
  } catch (error) {
    console.error('Error purchasing land:', error)
    message.value = 'An error occurred while trying to purchase the land.'
  }
}


onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
  if (user) {
    userEmail.value = user.email || ''

    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const userData = userSnap.data()
      wallet.value = userData.wallet || 0
    }

    await fetchLands()
  } else {
    userEmail.value = ''
    wallet.value = null
    await fetchLands()
    loading.value = false
  }
})
})
</script>
