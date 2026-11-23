const SUPABASE_URL = "https://fxstvcrnacuqtygstwon.supabase.co";
const SUPABASE_KEY = "sb_publishable_d5VC54uY5MEjOs2I_7SwtQ_g5VhRW9C";
const TABLE_URL = SUPABASE_URL + "/rest/v1/sensor_readings";
const metricMap = {
  temperature: ["temperatureValue", "temperatureSource", "°C"],
  humidity: ["humidityValue", "humiditySource", "%"],
  light: ["lightValue", "lightSource", "lx"],
  light_level: ["lightValue", "lightSource", "lx"],
  distance: ["distanceValue", "distanceSource", "cm"]
};

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
updateClock();
setInterval(updateClock, 15000);

function setConnection(connected, message) {
  document.getElementById("connectionText").textContent = message;
  document.getElementById("dbStatus").textContent = connected ? "CONNECTED" : "WAITING";
  document.getElementById("dbIndicator").classList.toggle("ok", connected);
  document.querySelector(".pulse").style.background = connected ? "var(--mint)" : "var(--amber)";
}
function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : "—";
}
async function loadReadings() {
  try {
    const response = await fetch(TABLE_URL + "?select=id,created_at,sensor_name,sensor_type,sensor_value,unit&order=created_at.desc&limit=100", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Supabase " + response.status);
    const rows = await response.json();
    const latest = {};
    rows.forEach(row => {
      const type = String(row.sensor_type || "").toLowerCase();
      if (metricMap[type] && !latest[type]) latest[type] = row;
    });
    Object.entries(metricMap).forEach(([type, ids]) => {
      if (type === "light") return;
      const row = latest[type] || (type === "light_level" ? latest.light : null);
      if (!row) return;
      document.getElementById(ids[0]).textContent = fmt(row.sensor_value);
      document.getElementById(ids[1]).textContent = (row.sensor_name || "Sensor") + " · " + new Date(row.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    });
    if (latest.light) {
      document.getElementById("lightValue").textContent = fmt(latest.light.sensor_value);
      document.getElementById("lightSource").textContent = (latest.light.sensor_name || "Sensor") + " · Latest";
    } else if (latest.light_level) {
      document.getElementById("lightValue").textContent = fmt(latest.light_level.sensor_value);
      document.getElementById("lightSource").textContent = (latest.light_level.sensor_name || "Sensor") + " · Latest";
    }
    setConnection(true, "SENSOR DATABASE ONLINE");
    document.getElementById("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  } catch (error) {
    console.error(error);
    setConnection(false, "SENSOR DATABASE OFFLINE");
    document.getElementById("lastUpdated").textContent = "No live connection";
  }
}
document.getElementById("refreshButton").addEventListener("click", loadReadings);
loadReadings();
setInterval(loadReadings, 10000);

// These controls currently update the tablet interface only. ESP32 command transport
// (for example, a secure control endpoint or MQTT broker) can be connected next.
document.querySelectorAll(".toggle").forEach(button => {
  button.addEventListener("click", () => {
    const room = button.dataset.light;
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.querySelector("b").textContent = on ? "ON" : "OFF";
    document.getElementById(room + "State").textContent = on ? "LIGHT ON" : "LIGHT OFF";
    button.closest(".room-card").classList.toggle("is-on", on);
  });
});
document.querySelectorAll(".fan-speed").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".fan-speed").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    const speed = Number(button.dataset.speed);
    document.getElementById("fanStatus").textContent = ["OFF","LOW","MEDIUM","HIGH"][speed];
    document.getElementById("fanVisual").classList.toggle("spinning", speed > 0);
  });
});
function setDoor(open) {
  document.getElementById("doorStatus").textContent = open ? "OPEN" : "CLOSED";
  document.getElementById("doorGraphic").classList.toggle("open", open);
  document.getElementById("openDoor").classList.toggle("active", open);
  document.getElementById("closeDoor").classList.toggle("active", !open);
}
document.getElementById("openDoor").addEventListener("click", () => setDoor(true));
document.getElementById("closeDoor").addEventListener("click", () => setDoor(false));
