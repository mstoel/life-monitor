const SUPABASE_URL = "https://fxstvcrnacuqtygstwon.supabase.co";
const SUPABASE_KEY = "sb_publishable_d5VC54uY5MEjOs2I_7SwtQ_g5VhRW9C";
const TABLE_URL = SUPABASE_URL + "/rest/v1/sensor_readings";

const metricIds = {
  temperature: "temperatureValue",
  humidity: "humidityValue",
  light: "lightValue",
  light_level: "lightValue",
  distance: "distanceValue"
};

const unitFallbacks = {
  temperature: "°C",
  humidity: "%",
  light: "lx",
  light_level: "lx",
  distance: "cm"
};

function setConnection(message, connected) {
  const pill = document.querySelector(".demo-pill");
  if (pill) {
    pill.innerHTML = "<i></i> " + message;
    pill.classList.toggle("connected-pill", !!connected);
  }
  const noticeTitle = document.querySelector(".notice strong");
  const noticeText = document.querySelector(".notice p");
  const noticeTag = document.querySelector(".notice-tag");
  if (noticeTitle) noticeTitle.textContent = connected ? "Supabase connected" : "Connecting to Supabase";
  if (noticeText) noticeText.textContent = connected
    ? "The dashboard is reading sensor data from your Supabase database. ESP32 devices can send readings here next."
    : message;
  if (noticeTag) noticeTag.textContent = connected ? "DATABASE" : "CONNECTING";
  const liveLabel = document.querySelector(".live-label");
  if (liveLabel) liveLabel.innerHTML = "<i></i> " + (connected ? "DATABASE LINK" : "WAITING");
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}

function prettySensor(type) {
  const names = {
    temperature: "Temperature",
    humidity: "Humidity",
    light: "Light level",
    light_level: "Light level",
    distance: "Distance"
  };
  return names[type] || (type || "Sensor").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function updateMetric(type, row) {
  const id = metricIds[type];
  if (!id) return;
  const value = Number(row.sensor_value);
  if (!Number.isFinite(value)) return;
  const valueNode = document.getElementById(id);
  if (valueNode) valueNode.textContent = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const card = valueNode && valueNode.closest(".metric-card");
  const unitNode = card && card.querySelector(".metric-value small");
  if (unitNode) unitNode.textContent = row.unit || unitFallbacks[type] || "";
  const deviceNode = card && card.querySelector(".metric-footer span");
  if (deviceNode && row.sensor_name) deviceNode.textContent = row.sensor_name + " · Latest reading";
}

function drawTemperatureChart(rows) {
  const temps = rows.filter(row => String(row.sensor_type || "").toLowerCase() === "temperature" && Number.isFinite(Number(row.sensor_value))).slice(0, 12).reverse();
  if (!temps.length) return;
  const values = temps.map(row => Number(row.sensor_value));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const width = 760, height = 195;
  const points = values.map((value, index) => {
    const x = index * width / Math.max(1, values.length - 1);
    const y = height - ((value - min) / Math.max(1, max - min)) * height;
    return [x, y];
  });
  const line = points.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  document.getElementById("chartLine").setAttribute("d", line);
  document.getElementById("chartArea").setAttribute("d", line + " L " + width + " " + height + " L 0 " + height + " Z");
  const last = points[points.length - 1];
  document.getElementById("chartPoint").setAttribute("cx", last[0]);
  document.getElementById("chartPoint").setAttribute("cy", last[1]);
  document.getElementById("chartCurrent").textContent = values[values.length - 1].toFixed(1) + (temps[temps.length - 1].unit || "°C");
  document.getElementById("chartLabels").innerHTML = temps.map(row => "<span>" + formatTime(row.created_at) + "</span>").join("");
}

function renderRows(rows) {
  const body = document.getElementById("readingsTable");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5">No sensor readings yet. Add a test reading in Supabase to see it here.</td></tr>';
    document.querySelector(".table-count").textContent = "0 RECORDS";
    return;
  }
  body.innerHTML = rows.slice(0, 8).map(row => {
    const type = String(row.sensor_type || "").toLowerCase();
    const unit = row.unit || unitFallbacks[type] || "";
    const value = Number(row.sensor_value);
    const displayValue = Number.isFinite(value) ? (Number.isInteger(value) ? value : value.toFixed(1)) : row.sensor_value;
    return '<tr><td><span class="table-sensor">' + prettySensor(type) + '</span></td><td>' + (row.sensor_name || "Unknown device") + '</td><td><strong>' + displayValue + " " + unit + '</strong></td><td>' + formatTime(row.created_at) + '</td><td><span class="normal-status">Received</span></td></tr>';
  }).join("");
  document.querySelector(".table-count").textContent = rows.length + " RECORDS";
}

async function loadReadings() {
  try {
    const response = await fetch(TABLE_URL + "?select=id,created_at,sensor_name,sensor_type,sensor_value,unit&order=created_at.desc&limit=50", {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY
      },
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error("Supabase returned " + response.status + ": " + detail);
    }
    const rows = await response.json();
    setConnection("SUPABASE CONNECTED", true);
    if (!rows.length) {
      ["temperatureValue", "humidityValue", "lightValue", "distanceValue"].forEach(id => document.getElementById(id).textContent = "—");
      document.getElementById("chartCurrent").textContent = "Waiting for data";
      document.getElementById("chartLine").setAttribute("d", "");
      document.getElementById("chartArea").setAttribute("d", "");
      document.getElementById("chartLabels").innerHTML = "";
      renderRows([]);
      document.getElementById("lastUpdated").textContent = "database connected";
      return;
    }
    const latestByType = {};
    rows.forEach(row => {
      const type = String(row.sensor_type || "").toLowerCase();
      if (metricIds[type] && !latestByType[type]) latestByType[type] = row;
    });
    Object.entries(latestByType).forEach(([type, row]) => updateMetric(type, row));
    drawTemperatureChart(rows);
    renderRows(rows);
    document.getElementById("lastUpdated").textContent = "just now";
  } catch (error) {
    console.error(error);
    setConnection("CONNECTION ISSUE", false);
    const noticeText = document.querySelector(".notice p");
    if (noticeText) noticeText.textContent = error.message + " Check the table name, column names and public SELECT policy.";
  }
}

document.getElementById("refreshButton").addEventListener("click", loadReadings);
loadReadings();
setInterval(loadReadings, 10000);
