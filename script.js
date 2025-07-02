async function autoDetectCity() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

      try {
        const res = await fetch(geoUrl);
        const data = await res.json();
        const city = data.city || data.locality || "Unknown";

        document.getElementById("cityInput").value = city;
        checkTemperature();
      } catch (error) {
        console.log("Geolocation API failed:", error);
      }
    }, () => {
      console.log("GPS location permission denied.");
    });
  } else {
    console.log("Geolocation not supported.");
  }
}

async function checkTemperature() {
  const city = document.getElementById("cityInput").value;
  const resultDiv = document.getElementById("result");

  if (!city) {
    resultDiv.innerHTML = "❌ Please enter a city name.";
    return;
  }

  const apiKey = "d57da9df1c49e04cb5913a400fda8f83";
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  resultDiv.innerHTML = "🔄 Fetching temperature...";

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("City not found");

    const data = await response.json();
    const temp = data.main.temp;
    const weather = data.weather[0].main.toLowerCase(); // like 'rain', 'clouds'
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    // ✅ Now call this AFTER defining weather
    showWeatherNotification(temp, weather, city);

    let message = "";
    let tips = "";

    if (temp >= 38) {
      message = "⚠️ <b>Extreme Heatwave Alert!</b>";
      tips = `
        <ul>
          <li>Stay indoors during peak heat (12pm–4pm)</li>
          <li>Drink plenty of water</li>
          <li>Help the elderly and kids stay cool</li>
        </ul>
      `;
    } else if (temp >= 32) {
      message = "☀️ <b>Hot Day</b>";
      tips = `
        <ul>
          <li>Use sunscreen</li>
          <li>Limit outdoor exposure</li>
        </ul>
      `;
    }

    if (weather.includes("rain")) {
      message += "<br>🌧️ <b>Rain Alert</b>";
      tips += `
        <ul>
          <li>Carry an umbrella</li>
          <li>Watch out for slippery roads</li>
        </ul>
      `;
    } else if (weather.includes("cloud")) {
      message += "<br>☁️ <b>Cloudy Weather</b>";
    } else if (weather.includes("clear")) {
      message += "<br>🌞 <b>Sunny Day</b>";
    }

    resultDiv.innerHTML = `
      <img src="${iconUrl}" alt="weather icon"><br>
      ✅ Temperature in <b>${city}</b>: <b>${temp}°C</b><br><br>
      ${message}
      <div class="tip-card">
        <strong>💡 Safety Tips:</strong>
        ${tips || "No extra tips for now. Stay safe!"}
      </div>
    `;
  } catch (error) {
    resultDiv.innerHTML = "❌ Error fetching data. City may be incorrect.";
  }
  if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: "SET_CITY",
    city: city
  });
  console.log("🌐 Posted city to Service Worker:", city);
}


}

function requestNotificationPermission() {
  const alertBtn = document.getElementById("alertButton");

  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("✅ Notifications enabled!", {
          body: "You will now receive automatic heatwave alerts.",
          icon: "icon-192.png"
        });

        alertBtn.style.display = "none";
      } else if (permission === "denied") {
        alert("❌ Notification permission denied.");
        alertBtn.style.display = "none";
      }
    });
  }
}





function showWeatherNotification(temp, weather, city) {
  if (Notification.permission !== "granted") return;

  const userType = localStorage.getItem("userType") || "general";

  let title = "🌡️ Weather Update";
  let body = `Current temperature in ${city}: ${temp}°C\n`;

  if (temp >= 38) {
    body += "🔥 Extreme heatwave!";

    if (userType === "elderly") {
      body += "\n🧓 Stay indoors and hydrated. Avoid the sun!";
    } else if (userType === "outdoor") {  // ✅ Fix here
      body += "\n👷 Limit outdoor work during peak hours!";
    } else {
      body += "\nStay hydrated and avoid going out.";
    }

  } else if (weather.includes("rain")) {
    body += "🌧️ Rain expected.\nCarry an umbrella and be cautious.";
  } else if (weather.includes("cloud")) {
    body += "☁️ Cloudy skies today.";
  } else if (weather.includes("clear")) {
    body += "☀️ Sunny day. Wear light clothing and use sunscreen.";
  }

  new Notification(title, {
    body: body,
    icon: "icon-192.png",
    badge: "icon-192.png"
  });
}



// ✅ Phase 3: Register Periodic Sync for Background Weather Notifications
if ('serviceWorker' in navigator && 'periodicSync' in navigator.serviceWorker) {
  navigator.serviceWorker.ready.then(async (registration) => {
    try {
      const tags = await registration.periodicSync.getTags();
      if (!tags.includes('weather-sync')) {
        await registration.periodicSync.register('weather-sync', {
          minInterval: 3 * 60 * 60 * 1000, // every 3 hours
        });
        console.log("✅ Weather sync registered every 3 hours");
      } else {
        console.log("🔁 Weather sync already registered");
      }
    } catch (err) {
      console.error("❌ Periodic sync registration failed:", err);
    }
  });
} else {
  console.warn("❌ Periodic background sync not supported in this browser.");
}

window.onload = () => {
  autoDetectCity();

  const alertBtn = document.getElementById("alertButton");
  const userSelectionDiv = document.getElementById("userSelection");
  const userType = localStorage.getItem("userType");

  if (Notification.permission === "granted" || Notification.permission === "denied") {
    alertBtn.style.display = "none";
  } else {
    alertBtn.style.display = "inline-block";
  }

  if (!userType) {
    userSelectionDiv.style.display = "block";
  } else {
    userSelectionDiv.style.display = "none";
  }
};

function selectUserType(type) {
  localStorage.setItem("userType", type);
  document.getElementById("userSelection").style.display = "none";
  document.getElementById("alertButton").style.display = "inline-block";
  console.log("✅ User type selected:", type);
}









