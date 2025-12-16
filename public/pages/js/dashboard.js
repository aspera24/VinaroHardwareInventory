(function () {

  const socket = io();

  var total_customers = document.getElementById("total-customers");
  var total_appointments = document.getElementById("total-appointments");
  var upcoming_today = document.getElementById("upcoming-today");
  var pending_appointments = document.getElementById("pending-appointments");

  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");
  const weekFilter = document.getElementById("weekFilter");

  const daysLabel = ["(Sun)", "(Mon)", "(Tue)", "(Wed)", "(Thu)", "(Fri)", "(Sat)"];
  const numberLabel = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31",
  ]

  function generateDataPoints(values) {
    const weekNum = parseInt(weekFilter.value); 
    const start = (weekNum - 1) * 7; 
    const end = start + values.length; 
    const labels = numberLabel.slice(start, end).map((n, i) => `${n} ${daysLabel[i]}`);

    return labels.map((d, i) => ({
      label: d,
      y: typeof values[i] === 'number' ? values[i] : 0
    }));
  }


  // Initialize chart with dummy data
  const chart = new CanvasJS.Chart("appointmentsChart", {
    animationEnabled: true,
    axisX: {
      title: "Day of Week",
    },
    axisY: { title: "Number of Customers", includeZero: true },
    data: [{
      type: "splineArea",
      color: "#303641",
      fillOpacity: 0.3,
      dataPoints: generateDataPoints([0, 0, 0, 0, 0, 0, 0])
    }]
  });

  chart.render();

  // ================= DASHBOARD DATA =================
  socket.on("dashboardStats", stats => {
  total_customers.innerText = stats.totalCustomers;
  total_appointments.innerText = stats.totalAppointments;
  upcoming_today.innerText = stats.upcomingToday;
  pending_appointments.innerText = stats.pendingApproval;
});

socket.on("dashboardChart", data => {
  chart.options.data[0].dataPoints = generateDataPoints(data.weekData);
  chart.render();
});


  // ================= FILTERS =================
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let cachedFilters = null;

  socket.on("filterOptions", filters => {
    cachedFilters = filters;

    // populate years
    yearFilter.innerHTML = "";
    filters.years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);

    loadMonths(filters, yearFilter.value);
    requestChartUpdate();
  });

  function loadMonths(filters, year) {
    monthFilter.innerHTML = "";

    if (!filters.months[year]) return;

    filters.months[year].forEach(m => monthFilter.innerHTML += `<option value="${m}">${monthNames[m - 1]}</option>`);

    loadWeeks(filters, year, monthFilter.value);
  }

  function loadWeeks(filters, year, month) {
    weekFilter.innerHTML = "";

    // compute number of days in selected month
    const monthEnd = new Date(year, month, 0).getDate(); // last day of month
    const totalWeeks = Math.ceil(monthEnd / 7);

    for (let w = 1; w <= totalWeeks; w++) {
      const start = (w - 1) * 7 + 1;
      const end = w === totalWeeks ? monthEnd : w * 7;
      weekFilter.innerHTML += `<option value="${w}">Week ${start}-${end}</option>`;
    }
  }

  function requestChartUpdate() {
    socket.emit("filterDashboard", {
      year: yearFilter.value,
      month: monthFilter.value,
      week: weekFilter.value
    });
  }

  yearFilter.addEventListener("change", () => {
    loadMonths(cachedFilters, yearFilter.value);
    requestChartUpdate();
  });

  monthFilter.addEventListener("change", () => {
    loadWeeks(cachedFilters, yearFilter.value, monthFilter.value);
    requestChartUpdate();
  });

  weekFilter.addEventListener("change", requestChartUpdate);

  // ================= MODAL / CARDS =================
  let cards = document.querySelectorAll('.stat-card');
  let modal = document.getElementById('modal');
  let modalBody = document.getElementById('modal-body');
  let closeModal = document.getElementById('close-modal');

  let data = {
    'total-customer': ['Juan Dela Cruz', 'Maria Santos', 'Pedro Reyes'],
    'total-appointments': ['Appointment 1', 'Appointment 2', 'Appointment 3'],
    'upcoming-today': ['Appointment Today 1', 'Appointment Today 2'],
    'pending-approval': ['Pending 1', 'Pending 2', 'Pending 3']
  };

  cards.forEach(card => {
    card.addEventListener('click', () => {
      let id = card.classList[1];
      let items = data[id] || [];

      modalBody.innerHTML = `
        <h3>${card.querySelector('h3').innerText}</h3>
        <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
      `;
      modal.style.display = 'flex';
    });
  });

  closeModal.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target == modal) modal.style.display = 'none'; });

})();
