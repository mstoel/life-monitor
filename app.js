const sample = {
  "1H": { values:[27.2,27.8,27.5,28.1,28.4,28.0,28.7,29.1,28.8,29.4,29.2,29.5], labels:["09:00","09:05","09:10","09:15","09:20","09:25","09:30"] },
  "24H": { values:[26.1,26.5,27.4,27.0,28.2,29.1,28.6,29.5,30.0,29.4,28.9,29.5], labels:["00:00","04:00","08:00","12:00","16:00","20:00","Now"] },
  "7D": { values:[27.0,28.2,27.8,29.1,28.7,30.0,29.5,28.9,29.4,29.0,29.8,29.5], labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }
};

function drawChart(range="1H") {
  const values = sample[range].values;
  const min = 26, max = 32, width = 760, height = 195;
  const points = values.map((value,index) => {
    const x = index * width / (values.length - 1);
    const y = height - ((value - min) / (max - min)) * height;
    return [x,y];
  });
  const line = points.map((p,i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + " L " + width + " " + height + " L 0 " + height + " Z";
  document.getElementById("chartLine").setAttribute("d",line);
  document.getElementById("chartArea").setAttribute("d",area);
  const last = points[points.length-1];
  document.getElementById("chartPoint").setAttribute("cx",last[0]);
  document.getElementById("chartPoint").setAttribute("cy",last[1]);
  document.getElementById("chartLabels").innerHTML = sample[range].labels.map(label=>"<span>"+label+"</span>").join("");
  document.getElementById("chartCurrent").textContent = values[values.length-1].toFixed(1)+"°C";
}

document.querySelectorAll(".range-tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".range-tab").forEach(item=>item.classList.remove("active"));
    button.classList.add("active");
    drawChart(button.dataset.range);
  });
});

document.getElementById("refreshButton").addEventListener("click", () => {
  // Demo mode: nudge the sample values slightly to make the refresh interaction visible.
  const temperature = (29.3 + Math.random() * 0.6).toFixed(1);
  const humidity = Math.round(62 + Math.random() * 4);
  const light = Math.round(700 + Math.random() * 55);
  const distance = Math.round(39 + Math.random() * 7);
  document.getElementById("temperatureValue").textContent = temperature;
  document.getElementById("humidityValue").textContent = humidity;
  document.getElementById("lightValue").textContent = light;
  document.getElementById("distanceValue").textContent = distance;
  document.getElementById("chartCurrent").textContent = temperature + "°C";
  document.getElementById("lastUpdated").textContent = "just now";
  const firstRow = document.querySelector("#readingsTable tr");
  firstRow.querySelector("td:nth-child(3) strong").textContent = temperature + " °C";
  firstRow.querySelector("td:nth-child(4)").textContent = "Just now";
});

drawChart();
