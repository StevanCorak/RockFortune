<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue"; 
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css"; 
import { collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore"; 
import { onAuthStateChanged } from "firebase/auth";
import { useNuxtApp } from "#app"; 

const { $db, $auth } = useNuxtApp();


const landmarks = ref([]); 
let map = null; 
const markers = ref({}); 
const showModal = ref(false);
const newLandmark = ref({ 
  name: "",
  type: "",
  mineral: "",
  percentage: 0, 
  forested: false,
  cost: 0,
  rent: 0,
  weather: "",
  size: 500, 
  
});
let pendingLandmark = null; 
let currentUser = ref(null); 


let mapLoaded = ref(false);
let authReady = ref(false); 
let listenerActive = ref(false); 
let unsubscribe = null;

const placeLandmark = (landmarkData, docId) => {
  if (!map || !mapLoaded.value) {
    console.warn(`placeLandmark skipped: Map not ready. ID: ${docId}`);
    return;
  }
  if (typeof landmarkData.lng !== 'number' || typeof landmarkData.lat !== 'number') {
    console.error(`Invalid coordinates for landmark ${docId}: Lng=${landmarkData.lng}, Lat=${landmarkData.lat}`);
    return;
  }

  console.log(`Attempting to place/update marker & polygon: ${docId} at [${landmarkData.lng}, ${landmarkData.lat}] with size ${landmarkData.size || 'default'}m`);

  const sourceId = `polygon-source-${docId}`;
  const layerId = `polygon-layer-${docId}`;

  if (markers.value[docId]) {
      try { markers.value[docId].marker.remove(); } catch(e) { console.warn(`Minor issue removing old marker for ${docId}`, e)}
      if (map.getLayer(layerId)) {
          try { map.removeLayer(layerId); } catch(e) { console.warn(`Minor issue removing old layer ${layerId}`, e)}
      }
      if (map.getSource(sourceId)) {
           try { map.removeSource(sourceId); } catch(e) { console.warn(`Minor issue removing old source ${sourceId}`, e)}
      }
      delete markers.value[docId]; 
      console.log(`Removed existing marker/polygon for update: ${docId}`);
  }


  try {
    const popupContent = `
      <div style="font-family: sans-serif; font-size: 0.9em;">
        <h3 style="margin: 0 0 5px 0; font-size: 1.1em;">${landmarkData.name || 'Unnamed'}</h3>
        <p style="margin: 2px 0;"><strong>Owner:</strong> ${landmarkData.owner || 'N/A'}</p>
        <p style="margin: 2px 0;"><strong>Type:</strong> ${landmarkData.type || 'N/A'}</p>
        <p style="margin: 2px 0;"><strong>Mineral:</strong> ${landmarkData.mineral || 'N/A'}</p>
        <p style="margin: 2px 0;"><strong>Forested:</strong> ${landmarkData.forested ? 'Yes' : 'No'}</p>
        <p style="margin: 2px 0;"><strong>Size:</strong> ${landmarkData.size || 'N/A'} m²</p>
        <p style="margin: 2px 0;"><strong>Value:</strong> $${landmarkData.cost || 0}</p>
        <p style="margin: 2px 0;"><strong>Rent:</strong> $${landmarkData.rent || 0}</p>
      </div>
    `;
    const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
        .setHTML(popupContent);

    const marker = new maplibregl.Marker() 
      .setLngLat([landmarkData.lng, landmarkData.lat])
      .setPopup(popup) 
      .addTo(map);

    const sizeMeters = typeof landmarkData.size === 'number' && landmarkData.size > 0 ? landmarkData.size : 10; 
    const sizeDegrees = sizeMeters / 111320 / 2; 

    const lng = landmarkData.lng;
    const lat = landmarkData.lat;

    const polygonCoords = [
        [lng - sizeDegrees, lat - sizeDegrees], 
        [lng + sizeDegrees, lat - sizeDegrees], 
        [lng + sizeDegrees, lat + sizeDegrees], 
        [lng - sizeDegrees, lat + sizeDegrees], 
        [lng - sizeDegrees, lat - sizeDegrees], 
    ];

    map.addSource(sourceId, {
        type: "geojson",
        data: {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [polygonCoords],
            },
            properties: {} 
        },
    });

    map.addLayer({
        id: layerId,
        type: "fill", 
        source: sourceId,
        layout: {},
        paint: {
            "fill-color": "#FF0000", 
            "fill-opacity": 0.3, 
          
        },
    });

    markers.value[docId] = { marker, sourceId, layerId }; 
    console.log(`SUCCESS: Marker & Polygon added/updated for ${docId}`);

  } catch (error) {
    console.error(`Error adding/updating marker or polygon for ${docId} to map:`, error);
     if (map.getLayer(layerId)) map.removeLayer(layerId);
     if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
};

const loadLandmarks = () => {
  if (listenerActive.value) {
    console.warn("loadLandmarks: Listener already active.");
    return;
  }
  if (!mapLoaded.value || !authReady.value || !currentUser.value) {
    console.warn("loadLandmarks: Conditions not met (map loaded? auth ready? user logged in?). Retrying check soon.");
   
    return;
  }
  console.log("loadLandmarks: Setting up Firestore listener.");
  clearAllMarkers(); 
  const landmarksCol = collection($db, "landmarks");
  unsubscribe = onSnapshot(landmarksCol, (snapshot) => {
    console.log(`Firestore Listener: ${snapshot.docChanges().length} change(s) detected.`);
    snapshot.docChanges().forEach((change) => {
      const landmarkData = change.doc.data();
      const docId = change.doc.id;

      if (change.type === "added" || change.type === "modified") {
          console.log(`Firestore: ${change.type.toUpperCase()} ${docId}`, landmarkData);
          if(mapLoaded.value) {
              placeLandmark(landmarkData, docId); 
          } else {
              console.warn(`Map not ready when trying to place ${docId} from Firestore ${change.type}. Will retry on map load.`);
          }
      }
      if (change.type === "removed") {
        console.log(`Firestore: REMOVED ${docId}`);
        if (markers.value[docId] && map) { 
            const { marker, sourceId, layerId } = markers.value[docId];
            try { marker.remove(); } catch (e) { console.warn(`Minor issue removing marker ${docId}`, e)}

            
             if (map.getLayer(layerId)) {
                try { map.removeLayer(layerId); } catch (e) { console.warn(`Minor issue removing layer ${layerId}`, e)}
             }
             if (map.getSource(sourceId)) {
                try { map.removeSource(sourceId); } catch (e) { console.warn(`Minor issue removing source ${sourceId}`, e)}
             }

            delete markers.value[docId];
            console.log(`Marker and Polygon removed from map for ${docId}`);
        } else {
            console.log(`Marker/Polygon info for ${docId} not found locally or map not ready.`);
        }
      }
    });
  }, (error) => {
    console.error("Firestore listener error:", error);
    listenerActive.value = false; 
  });

  listenerActive.value = true;
  console.log("Firestore listener is now active.");
};

const clearAllMarkers = () => {
    if (!map) {
        console.log("clearAllMarkers: Map not available.");
        markers.value = {};
        return;
    }

    let markerCount = 0;
    let polygonCount = 0;

    Object.keys(markers.value).forEach(docId => {
        if (markers.value[docId]?.marker) {
            try { markers.value[docId].marker.remove(); markerCount++; } catch (e) { }
        }
    });
    markers.value = {}; 

 
    const layers = map.getStyle().layers;
    const sources = map.getStyle().sources;

    layers.forEach(layer => {
        if (layer.id.startsWith('polygon-layer-')) {
             try {
                if (map.getLayer(layer.id)) {
                    map.removeLayer(layer.id);
                    polygonCount++;
                 }
             } catch(e) {}
        }
    });

    Object.keys(sources).forEach(sourceId => {
        if (sourceId.startsWith('polygon-source-')) {
            try {
                if (map.getSource(sourceId)) { 
                    map.removeSource(sourceId);
                    
                }
            } catch(e) {}
        }
    });


  if (markerCount > 0 || polygonCount > 0) console.log(`Cleared ${markerCount} markers and ${polygonCount} polygon layers/sources.`);
};

const tryLoadLandmarks = () => {
  console.log(`tryLoadLandmarks Check: mapLoaded=${mapLoaded.value}, authReady=${authReady.value}, user=${!!currentUser.value}, listenerActive=${listenerActive.value}`);
  if (mapLoaded.value && authReady.value && currentUser.value && !listenerActive.value) {
    loadLandmarks();
  } else {
     console.log("Conditions not yet met for loading landmarks.");
  }
}


let authUnsubscribe = null; 
onMounted(() => { 
    authUnsubscribe = onAuthStateChanged($auth, (user) => {
        console.log(`Auth state changed. User: ${user ? user.email : 'null'}`);
        const wasLoggedIn = !!currentUser.value;
        currentUser.value = user;
        authReady.value = true; 

        if (!user) { 
            if (unsubscribe) { 
                console.log("User logged out. Unsubscribing Firestore listener.");
                unsubscribe(); 
                unsubscribe = null; 
            }
            listenerActive.value = false; 
            clearAllMarkers(); 
            pendingLandmark = null; 
        } else if (!wasLoggedIn) { 
            console.log("User logged in. Attempting to load landmarks...");
            tryLoadLandmarks(); 
        } else {
             console.log("Auth state changed, but user was already logged in. No landmark reload triggered by auth change.");
        }
    });
});


onMounted(() => {
  console.log("Component Mounted. Initializing Map.");
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
      console.error("Map container element '#map' not found in the DOM.");
      return;
  }

  try {
      map = new maplibregl.Map({
        container: "map", 
        style: "https://api.maptiler.com/maps/streets/style.json?key=AZ6kSBDOiLsBNMkFDVuq", 
        center: [14.815, 45.44], 
        zoom: 7, 
      });
      console.log('Map object instance created.');

      map.on('load', () => {
        console.log('Map "load" event fired.');
        mapLoaded.value = true; 
        tryLoadLandmarks(); 
      });

      map.on('error', (e) => { console.error("MapLibre Map Error:", e); });

      map.on("click", async (event) => {
          if (pendingLandmark && currentUser.value) {
            const { lng, lat } = event.lngLat;
            await saveLandmark(lng, lat); 
            
          } else if (pendingLandmark && !currentUser.value) {
            alert("You seem to have logged out. Please log in again to place the landmark.");
            pendingLandmark = null; 
            showModal.value = false; 
          } else if (!pendingLandmark && currentUser.value) {
             
          }
      });

  } catch(mapError) {
      console.error("Failed to initialize MapLibre map:", mapError);
      
  }
});

onBeforeUnmount(() => {
  console.log("Component Unmounting.");

  if (unsubscribe) {
    console.log("Unsubscribing Firestore listener.");
    unsubscribe();
    unsubscribe = null;
  }
  if (authUnsubscribe) {
      console.log("Unsubscribing Auth listener.");
      authUnsubscribe(); 
      authUnsubscribe = null;
  }
  if (map) {
    console.log("Removing map instance.");
    map.remove(); 
    map = null;
  }
  mapLoaded.value = false;
  authReady.value = false;
  listenerActive.value = false;
  markers.value = {}; 
  currentUser.value = null;
});


const openModal = () => {
  if (!currentUser.value) {
      alert("Please log in to add a landmark.");
      return;
  }
  
  newLandmark.value = {
    name: "", type: "", mineral: "", percentage: 0, forested: false,
    cost: 0, rent: 0, weather: "", size: 500, 
  };
  pendingLandmark = null; 
  showModal.value = true;
};

const submitLandmark = () => {
  if (!newLandmark.value.name) { 
    alert("Please enter a landmark name.");
    return;
  }
   if (typeof newLandmark.value.size !== 'number' || newLandmark.value.size <= 0) {
        alert("Please enter a valid positive number for the land size in meters.");
        return;
    }
  pendingLandmark = { ...newLandmark.value }; 
  showModal.value = false;
  alert("Click on the map to place your '" + newLandmark.value.name + "' landmark.");
};

const saveLandmark = async (lng, lat) => {
  if (!currentUser.value || !pendingLandmark) {
    console.error("Save aborted: No user or no pending landmark data.");
    alert("Cannot save landmark. Ensure you are logged in and have submitted the form.");
    pendingLandmark = null; 
    return;
  }
  const landmarkData = {
    ...pendingLandmark, 
    lng: lng, 
    lat: lat, 
    owner: currentUser.value.email, 
    createdAt: serverTimestamp(), 
  };

  
   if (typeof landmarkData.size !== 'number') {
       console.warn("Landmark size was not a number, setting to default 10 before saving.");
       landmarkData.size = 10;
   }

  console.log("Saving landmark to Firestore:", landmarkData);
  try {
    const docRef = await addDoc(collection($db, "landmarks"), landmarkData);
    console.log("Landmark saved successfully with ID:", docRef.id);
    alert("Landmark saved successfully! It should appear on the map shortly.");
    
  } catch (error) {
    console.error("Error saving landmark to Firestore:", error);
    alert("Error saving landmark: " + error.message);
  } finally {
    pendingLandmark = null; 
  }
};

</script>

<template>
  <div>
    <nav class="fixed w-full bg-blue-950 text-white p-4 z-10 flex justify-between">
      <div class="text-2xl font-bold">RockFortune</div>
      <ul class="flex space-x-4 text-xl">
        <NuxtLink to="/account"><li><a href="#" class="hover:underline">Account</a></li></NuxtLink>
        <NuxtLink to="/landList"><li><a href="#" class="hover:underline">Listed land</a></li></NuxtLink>
        <NuxtLink to="/wallet"><li><a href="#" class="hover:underline">Wallet</a></li></NuxtLink>
      </ul>
    </nav>

    <div id="map" class="w-screen h-screen fixed top-0 left-0 z-0"></div> <button @click="openModal" class="fixed bottom-5 right-5 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 z-10">
      Add Landmark
    </button>

    <div v-if="showModal" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
      <div class="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
        <h2 class="text-lg text-center font-bold mb-4">Add Landmark Details</h2>

        <label class="block mb-1 text-sm font-medium text-gray-700">Landmark Name</label>
        <input v-model="newLandmark.name" placeholder="e.g., Green Valley" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-1 text-sm font-medium text-gray-700">Type of Land</label>
        <input v-model="newLandmark.type" placeholder="e.g., Mountain, Plains" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-1 text-sm font-medium text-gray-700">Mineral Content</label>
        <input v-model="newLandmark.mineral" placeholder="e.g., Iron, Quartz" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-3">
          <input type="checkbox" v-model="newLandmark.forested" class="mr-2" /> Forested Area?
        </label>

         <label class="block mb-1 text-sm font-medium text-gray-700">Land Size (Square Meters)</label>
        <input v-model.number="newLandmark.size" type="number" placeholder="e.g., 500" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-1 text-sm font-medium text-gray-700">Land Sell Value ($)</label>
        <input v-model.number="newLandmark.cost" type="number" placeholder="e.g., 10000" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-1 text-sm font-medium text-gray-700">Monthly Rent ($)</label>
        <input v-model.number="newLandmark.rent" type="number" placeholder="e.g., 100" class="w-full p-2 border rounded mb-3" />

        <label class="block mb-1 text-sm font-medium text-gray-700">Weather Type</label>
        <input v-model="newLandmark.weather" placeholder="e.g., Sunny, Rainy" class="w-full p-2 border rounded mb-4" />

        <div class="flex justify-end space-x-3">
          <button @click="showModal = false; pendingLandmark = null;" class="bg-red-600   text-white px-4 py-2 rounded hover:bg-red-800">Cancel</button>
          <button @click="submitLandmark" class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">Submit & Place on Map</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
 #map {
   width: 100vw;
   height: 100vh;
   position: fixed;
   top: 0;
   left: 0;
 }



 .custom-marker {
    background-color: red;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 1px solid black;
 }
</style>