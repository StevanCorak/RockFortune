<template>
  <div class="p-8 max-w-lg tetx-center mx-auto bg-white rounded-2xl shadow-lg">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">💳 Wallet</h2>

    <div v-if="!cardConfirmed" class="space-y-4">
      <input
        v-model="card.number"
        placeholder="Card Number"
        class="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div class="flex space-x-4">
        <input
          v-model="card.expiry"
          placeholder="MM/YY"
          class="w-1/2 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          v-model="card.cvc"
          placeholder="CVC"
          class="w-1/2 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        @click="confirmCard"
        class="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition font-semibold"
      >
        Confirm Card
      </button>
    </div>

    <div v-else class="mt-6 space-y-5">
      <p class="text-green-600 font-medium flex items-center gap-2">
        <span>✅</span> Card confirmed
      </p>
      <div class="bg-gray-50 p-4 rounded-lg shadow-inner">
        <p class="text-gray-700">
          Wallet Balance:
          <span class="font-bold text-lg text-gray-900">€{{ balance }}</span>
        </p>
      </div>
      <input
        type="number"
        v-model.number="amount"
        placeholder="Enter amount"
        class="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        @click="addMoney"
        class="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition font-semibold"
      >
        Add Money
      </button>
      <p v-if="message" class="text-green-600 font-medium">{{ message }}</p>
    </div>
  </div>
</template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { getAuth, onAuthStateChanged } from 'firebase/auth'
  import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore'
  
  const auth = getAuth()
  const db = getFirestore()
  
  const card = ref({ number: '', expiry: '', cvc: '' })
  const cardConfirmed = ref(false)
  const amount = ref<number>(0)
  const balance = ref<number>(0)
  const message = ref('')
  const currentUserId = ref<string | null>(null)
  
  const confirmCard = () => {
    if (card.value.number && card.value.expiry && card.value.cvc) {
      cardConfirmed.value = true
    }
  }
  
  const fetchBalance = async () => {
    if (!currentUserId.value) return
    const userDoc = doc(db, 'users', currentUserId.value)
    const userSnap = await getDoc(userDoc)
    if (userSnap.exists()) {
      balance.value = userSnap.data().wallet || 0
    }
  }
  
  const addMoney = async () => {
    if (!currentUserId.value) return
    const userDocRef = doc(db, 'users', currentUserId.value)
    const userSnap = await getDoc(userDocRef)
    if (!userSnap.exists()) return
  
    const currentWallet = userSnap.data().wallet || 0
    const newBalance = currentWallet + amount.value
  
    await updateDoc(userDocRef, {
      wallet: newBalance
    })
  
    balance.value = newBalance
    message.value = `Added €${amount.value} to your wallet!`
    amount.value = 0
  }
  
  onMounted(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUserId.value = user.uid
        await fetchBalance()
      }
    })
  })
  </script>
  