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


const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("lifeMonitorTheme") || "light";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  document.getElementById("themeIcon").textContent = dark ? "☀" : "☾";
  document.getElementById("themeLabel").textContent = dark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#09111f" : "#f1f5f7");
}
applyTheme(savedTheme);
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("lifeMonitorTheme", next);
  applyTheme(next);
  addActivity("Changed to " + next + " mode");
});

function addActivity(message) {
  const list = document.getElementById("activityList");
  if (!list) return;
  const entry = document.createElement("div");
  entry.className = "activity-entry";
  const dot = document.createElement("span");
  dot.className = "activity-dot";
  const label = document.createElement("span");
  label.textContent = message;
  const time = document.createElement("b");
  time.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  entry.append(dot, label, time);
  list.prepend(entry);
  while (list.children.length > 5) list.lastElementChild.remove();
}

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
document.getElementById("refreshButton").addEventListener("click", () => { loadReadings(); addActivity("Sensor readings refreshed"); });
loadReadings();
setInterval(loadReadings, 10000);

// These controls currently update the tablet interface only. ESP32 command transport
// (for example, a secure control endpoint or MQTT broker) can be connected next.
const roomModes = {living:"auto", bedroom:"auto", kitchen:"auto"};
let masterActive = true;
function setRoomLight(room,on,log=true){
  const button=document.querySelector('.toggle[data-light="'+room+'"]');
  if(!button)return;
  button.setAttribute("aria-pressed",String(on));
  button.querySelector(".toggle-label").textContent=on?"ON":"OFF";
  document.getElementById(room+"State").textContent=on?"LIGHT ON":"LIGHT OFF";
  button.closest(".room-card").classList.toggle("is-on",on);
  if(log)addActivity(room.charAt(0).toUpperCase()+room.slice(1)+" light turned "+(on?"ON":"OFF"));
}
document.querySelectorAll(".toggle").forEach(button=>{
  button.addEventListener("click",()=>{
    const room=button.dataset.light;
    if(!masterActive||roomModes[room]!=="manual")return;
    setRoomLight(room,button.getAttribute("aria-pressed")!=="true");
  });
});
document.querySelectorAll(".mode-button").forEach(button=>{
  button.addEventListener("click",()=>{
    if(!masterActive)return;
    const room=button.dataset.room, mode=button.dataset.mode;
    roomModes[room]=mode;
    document.querySelectorAll('.mode-button[data-room="'+room+'"]').forEach(b=>b.classList.toggle("active",b===button));
    addActivity(room.charAt(0).toUpperCase()+room.slice(1)+" lighting set to "+mode.toUpperCase());
  });
});
const masterButton=document.getElementById("masterPower");
masterButton.addEventListener("click",()=>{
  masterActive=!masterActive;
  masterButton.setAttribute("aria-pressed",String(masterActive));
  document.getElementById("masterLabel").textContent=masterActive?"MASTER ON":"MASTER OFF";
  document.getElementById("masterStatus").textContent=masterActive?"ACTIVE":"ALL OFF";
  document.querySelectorAll(".room-card").forEach(card=>card.classList.toggle("master-disabled",!masterActive));
  if(!masterActive){
    ["living","bedroom","kitchen"].forEach(room=>setRoomLight(room,false,false));
    document.querySelectorAll(".mode-button").forEach(b=>b.disabled=true);
    document.querySelectorAll(".toggle").forEach(b=>b.disabled=true);
    document.querySelectorAll(".fan-speed").forEach(b=>b.classList.toggle("selected",b.dataset.speed==="0"));
    document.getElementById("fanStatus").textContent="OFF";
    document.getElementById("fanVisual").classList.remove("spinning");
    addActivity("MASTER OFF — all lights and fan switched off");
  }else{
    document.querySelectorAll(".mode-button,.toggle,.fan-speed").forEach(b=>b.disabled=false);
    addActivity("MASTER ON — house controls reactivated");
  }
});
document.querySelectorAll(".fan-speed").forEach(button => {
  button.addEventListener("click", () => {
    if(!masterActive)return;
    document.querySelectorAll(".fan-speed").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    const speed = Number(button.dataset.speed);
    document.getElementById("fanStatus").textContent = ["OFF","LOW","MEDIUM","HIGH"][speed];
    document.getElementById("fanVisual").classList.toggle("spinning", speed > 0);
    addActivity("Fan set to " + ["OFF","LOW","MEDIUM","HIGH"][speed]);
  });
});
function setDoor(open) {
  document.getElementById("doorStatus").textContent = open ? "OPEN" : "CLOSED";
  document.getElementById("doorGraphic").classList.toggle("open", open);
  document.getElementById("openDoor").classList.toggle("active", open);
  document.getElementById("closeDoor").classList.toggle("active", !open);
  addActivity("Front door " + (open ? "opened" : "closed"));
}
document.getElementById("openDoor").addEventListener("click", () => { if(masterActive)setDoor(true); });
document.getElementById("closeDoor").addEventListener("click", () => { if(masterActive)setDoor(false); });
