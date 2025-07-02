// ✅ Step 1: Install and Cache Files
let savedCity = "Vijayawada"; // default fallback
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('heatwave-alert-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    })
  );
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_CITY") {
    savedCity = event.data.city;
    console.log("✅ Saved city for periodic sync:", savedCity);
  }
});

// ✅ Step 2: Serve Cached Files (Offline Support)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

// ✅ Step 3: Periodic Weather Sync (Phase 3 Magic Starts Here)
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'weather-sync') {
    event.waitUntil(
      fetch('https://api.openweathermap.org/data/2.5/weather?q=Vijayawada&appid=d57da9df1c49e04cb5913a400fda8f83&units=metric')
        .then(response => response.json())
        .then(data => {
          const temp = data.main.temp;
          const weather = data.weather[0].main.toLowerCase();
          let message = `Current temp: ${temp}°C.`;

          if (temp >= 38) message += ' 🔥 Extreme Heatwave!';
          else if (weather.includes("rain")) message += ' 🌧️ Rain expected.';
          else if (weather.includes("cloud")) message += ' ☁️ Cloudy.';
          else if (weather.includes("clear")) message += ' ☀️ Sunny.';

          self.registration.showNotification("🌡️ Auto Weather Update", {
            body: message,
            icon: "icon-192.png"
          });
        })
        .catch(err => {
          console.error("❌ Background weather fetch failed:", err);
        })
    );
  }
});

// ✅ Step 4: Fetch Weather and Show Notification
async function fetchWeatherAndNotify() {
  const city = savedCity; 

  const apiKey = 'd57da9df1c49e04cb5913a400fda8f83';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const temp = data.main.temp;
    const weather = data.weather[0].main.toLowerCase();

    let alert = '';

    if (temp >= 38) {
      alert = '🔥 Extreme heatwave! Stay indoors and hydrated.';
    } else if (weather.includes('rain')) {
      alert = '🌧️ Rain expected. Carry an umbrella!';
    } else if (weather.includes('cloud')) {
      alert = '☁️ Cloudy skies today.';
    }

    if (alert) {
      self.registration.showNotification('🌡️ Weather Alert', {
        body: `Current temp in ${city}: ${temp}°C\n${alert}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png'
      });
    }
  } catch (err) {
    console.error('❌ Weather fetch failed:', err);
  }
}

