let sensorData = [], noaaData = [], variables = [];


const variableUnits = {
  turbidity: "NTU",
  depth: "inch",
  pH: "pH",
  conductivity: "µS/cm",
  velocity : "ft/s",
  rdo: "mg/L",
};

async function loadData() {
  sensorData = await fetch("sensor_data.json").then(res => res.json());
  noaaData = await fetch("noaa_precip_data.json").then(res => res.json());
  variables = Object.keys(sensorData[0]).filter(k => !["date", "sensor_Id", "month"].includes(k));

  populateDropdowns();
  drawInitialCharts();
}

function populateDropdowns() {
  const varSelect = document.getElementById("var-select");
  const monthSelect = document.getElementById("month-select");

  if (!varSelect || !monthSelect) {
    console.error("Dropdown elements not found in HTML.");
    return;
  }

  variables.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    varSelect.appendChild(opt);
  });

  const months = [...new Set(sensorData.map(d => d.month))];
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });

  varSelect.addEventListener("change", drawSensorChart);
  monthSelect.addEventListener("change", drawGauges);
}

function drawInitialCharts() {
  Plotly.newPlot("precip-chart", [{
    x: noaaData.map(d => d.date),
    y: noaaData.map(d => d.precipitation),
    type: "scatter",
    mode: "lines",
    name: "Precipitation"
  }], {
    title: {
      text: "Daily Precipitation Over Time",
      font: { size: 22 }
    },
    xaxis: {
      title: "Date",
      tickformat: "%b %Y",
      tickangle: -45,
      gridcolor: '#e0e0e0',
      type: 'date'
    },
    yaxis: {
      title: "Precipitation (mm)",
      gridcolor: '#e0e0e0'
    },
    template: "plotly_white",
    margin: { t: 50, l: 60, r: 30, b: 80 }
  });

  drawSensorChart();
  drawGauges();
}

function drawSensorChart() {
  const selectedVar = document.getElementById("var-select").value || variables[0];
  const traces = [];
  const unit = variableUnits[selectedVar] || "";
  const yTitle = unit ? `${selectedVar} (${unit})` : selectedVar;

  const grouped = sensorData.reduce((acc, row) => {
    acc[row.sensor_Id] = acc[row.sensor_Id] || [];
    acc[row.sensor_Id].push(row);
    return acc;
  }, {});

  for (let sid in grouped) {
    const sensorRows = grouped[sid];
    const unit = variableUnits[selectedVar] || "";

    traces.push({
      x: sensorRows.map(r => r.date),
      y: sensorRows.map(r => r[selectedVar]),
      name: `Sensor ${sid}`,
      type: "scatter",
      mode: "lines",
      hovertemplate: 
        `Sensor ${sid}<br>Date: %{x}<br>${selectedVar}: %{y}${unit ? " " + unit : ""}<extra></extra>`
    });
  }

  Plotly.newPlot("sensor-chart", traces, {
    
    title: {
      text: `${selectedVar} over Time${unit ? " (" + unit + ")" : ""}`,
      font: { size: 22 }
    },
    xaxis: {
      title: "Date",
      tickformat: "%b %Y",
      showgrid: false,
      tickangle: -45,
      gridcolor: '#e0e0e0',
      rangeslider: { visible: true },
      type: 'date'
    },
    yaxis: {
        title: yTitle,
        showgrid: false,
        gridcolor: '#e0e0e0',
        autorange: true,
        fixedrange: false,  // this enables autoscaling when zooming in
        rangemode: 'normal' // optional: allow full y-axis flexibility
      },
    legend: {
        orientation: "v",     // vertical legend
        x: 1,                 // far right
        xanchor: "right",
        y: 1,                 // top
        yanchor: "top"
      }
      ,
    margin: { t: 50, l: 60, r: 30, b: 80 },
    template: "plotly_white",
    autosize: true
  },
  {
    responsive: true,
    scrollZoom: true  // ✅ enables scroll to zoom both axes
  });
}

function drawGauges() {
  const selectedVar = document.getElementById("var-select").value || variables[0];
  const selectedMonth = document.getElementById("month-select").value;
  const unit = variableUnits[selectedVar] || "";
const label = (prefix) => `${prefix} ${selectedVar}${unit ? " (" + unit + ")" : ""}`;



  const filtered = sensorData.filter(d => d.month === selectedMonth && d[selectedVar] != null);
  if (!filtered.length) return;

  const values = filtered.map(d => d[selectedVar]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const createGauge = (id, val, title) => {
    Plotly.newPlot(id, [{
      type: "indicator",
      mode: "gauge+number",
      value: val,
      title: { text: title },
      gauge: {
        axis: { range: [min, max] },
        bar: { color: "#1f77b4" }
      }
    }]);
  };

  createGauge("gauge-mean", mean, label("Mean"));
createGauge("gauge-max", max, label("Max"));
createGauge("gauge-min", min, label("Min"));
}

loadData();
