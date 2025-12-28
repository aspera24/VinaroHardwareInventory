(function () {
  if (!isOnline()) {
    alert("No internet connection. Please try again later.");
    return;
  }

  const loading = document.getElementById("dashboard-loading");

  loading.style.display = "flex";

  const socket = io();

  var total_customers = document.getElementById("total-customers");
  var total_appointments = document.getElementById("total-appointments");
  var upcoming_today = document.getElementById("upcoming-today");
  var pending_appointments = document.getElementById("pending-appointments");

  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");
  const weekFilter = document.getElementById("weekFilter");


  function generateDataPoints(values) {
    const year = parseInt(yearFilter.value);
    const month = parseInt(monthFilter.value); // 1–12
    const weekNum = parseInt(weekFilter.value);

    const startDay = (weekNum - 1) * 7 + 1;
    const monthEnd = new Date(year, month, 0).getDate();

    return values.map((val, index) => {
      const dayNumber = startDay + index;

      if (dayNumber > monthEnd) return null;

      const dateObj = new Date(year, month - 1, dayNumber);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

      return {
        label: `${dayNumber} (${dayName})`,
        y: typeof val === "number" ? val : 0
      };


    }).filter(dp => dp !== null); // remove nulls


  }




  // Initialize chart with dummy data
  const chart = new CanvasJS.Chart("appointmentsChart", {
    animationEnabled: true,
    backgroundColor: "transparent",
    axisX: {
      title: "Day of Week",
      labelFontSize: 12,
      labelFontColor: "#000000ff",
      tickThickness: 20,
      lineThickness: 1,
    },
    axisY: { title: "Number of Customers", includeZero: true },
    data: [{
      type: "splineArea",
      lineThickness: 2,
      markerSize: 6,
      color: "#760000ff",
      labelFontColor: "#000000ff",
      fillOpacity: 0.5,
      dataPoints: generateDataPoints([0, 0, 0, 0, 0, 0, 0])
    }]
  });


  socket.off("dashboardStats");
  socket.off("dashboardChart");
  socket.off("filterOptions");
  socket.off("databaseUpdated");
  socket.off("statDetailsPaginated");
  socket.off("recentAppointments");


  // ================= DASHBOARD DATA =================
  socket.on("dashboardStats", stats => {
    total_customers.innerText = stats.totalCustomers;
    total_appointments.innerText = stats.totalAppointments;
    upcoming_today.innerText = stats.upcomingToday;
    pending_appointments.innerText = stats.pendingApproval;
  });



  socket.on("dashboardChart", data => {
    chart.options.animationEnabled = true;
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

    const prevYear = yearFilter.value;
    const prevMonth = monthFilter.value;
    const prevWeek = weekFilter.value;

    yearFilter.innerHTML = "";

    filters.years.forEach(y => {
      yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });

    if (prevYear && filters.years.includes(Number(prevYear))) {
      yearFilter.value = prevYear;
    } else {
      yearFilter.value = filters.years[0];
    }

    loadMonths(filters, yearFilter.value, prevMonth);

    // 🔥 restore week AFTER everything
    if (prevWeek) weekFilter.value = prevWeek;

    requestChartUpdate();
  });



  function loadMonths(filters, year, prevMonth = null) {
    const prevWeek = weekFilter.value;

    monthFilter.innerHTML = "";

    if (!filters.months[year]) return;

    filters.months[year].forEach(m => {
      monthFilter.innerHTML += `<option value="${m}">${monthNames[m - 1]}</option>`;
    });

    if (prevMonth && filters.months[year].includes(Number(prevMonth))) {
      monthFilter.value = prevMonth;
    } else {
      const months = filters.months[year];
      monthFilter.value = months[months.length - 1];
    }

    loadWeeks(filters, year, monthFilter.value, prevWeek);
  }



  function loadWeeks(filters, year, month, prevWeek = null) {
    weekFilter.innerHTML = "";

    const monthEnd = new Date(year, month, 0).getDate();
    const totalWeeks = Math.ceil(monthEnd / 7);

    for (let w = 1; w <= totalWeeks; w++) {
      const start = (w - 1) * 7 + 1;
      const end = w === totalWeeks ? monthEnd : w * 7;
      weekFilter.innerHTML += `<option value="${w}">Week ${start}-${end}</option>`;
    }

    // PRESERVE WEEK SELECTION
    if (prevWeek && prevWeek <= totalWeeks) {
      weekFilter.value = prevWeek;
    }
  }



  socket.on("databaseUpdated", () => {
    // refresh stats
    socket.emit("filterDashboard", {
      year: yearFilter.value,
      month: monthFilter.value,
      week: weekFilter.value
    });

    // refresh recent table
    loadRecentAppointments();
  });


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

  let modalPage = 1;
  let modalLimit = 5;
  let modalTotal = 0;
  let modalType = null;

  const modalPrev = document.getElementById("modal-prev");
  const modalNext = document.getElementById("modal-next");
  const modalPageInfo = document.getElementById("modal-page-info");
  const modalLimitSelect = document.getElementById("modal-limit");


  cards.forEach(card => {
    card.addEventListener("click", () => {
      modalType = card.classList[1];
      modalPage = 1;

      modalBody.innerHTML = `<div class="loader"></div><p>Loading...</p>`;
      modal.style.display = "flex";

      loadModalData();
    });
  });

  function loadModalData() {
    socket.emit("getStatDetailsPaginated", {
      type: modalType,
      page: modalPage,
      limit: modalLimit
    });
  }


  socket.on("statDetailsPaginated", ({ title, rows, total }) => {
    modalTotal = total;

    if (!rows.length) {
      modalBody.innerHTML = `<h3>${title}</h3><p>No data</p>`;
      return;
    }

    // Detect columns dynamically
    const hasName = rows[0].name || rows[0].customer;
    const hasDate = rows[0].appointment_date;

    modalBody.innerHTML = `
    <h3>${title}</h3>

    <table class="table">
      <thead>
        <tr>
          ${hasName ? "<th>Name</th>" : ""}
          ${hasDate ? "<th>Date</th>" : ""}
        </tr>
      </thead>

      <tbody>
        ${rows.map(r => `
          <tr>
            ${hasName ? `<td>${r.name || r.customer}</td>` : ""}
            ${hasDate ? `<td>${r.appointment_date.slice(0, 10)}</td>` : ""}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

    const totalPages = Math.ceil(total / modalLimit);
    modalPageInfo.textContent = `Page ${modalPage} of ${totalPages}`;

    modalPrev.disabled = modalPage === 1;
    modalNext.disabled = modalPage === totalPages;
  });


  modalPrev.addEventListener("click", () => {
    if (modalPage > 1) {
      modalPage--;
      loadModalData();
    }
  });

  modalNext.addEventListener("click", () => {
    const totalPages = Math.ceil(modalTotal / modalLimit);
    if (modalPage < totalPages) {
      modalPage++;
      loadModalData();
    }
  });

  modalLimitSelect.addEventListener("change", () => {
    modalLimit = parseInt(modalLimitSelect.value);
    modalPage = 1;
    loadModalData();
  });




  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });




  const recentTable = document.getElementById("recent-appointments");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const pageLimitSelect = document.getElementById("pageLimit");

  let currentPage = 1;
  let limit = 5;
  let totalRows = 0;

  function loadRecentAppointments() {
    socket.emit("getRecentAppointments", {
      page: currentPage,
      limit
    });
  }

  socket.on("recentAppointments", data => {
    const { rows, total } = data;
    totalRows = total;

    recentTable.innerHTML = "";

    if (!rows.length) {
      recentTable.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;">No recent appointments</td>
      </tr>`;
      return;
    }

    rows.forEach(r => {
      recentTable.innerHTML += `
      <tr>
        <td>${r.customer}</td>
        <td>${new Date(r.date).toISOString().slice(0, 10)}</td>
        <td>
          <span class="status ${r.status}">
            ${r.status}
          </span>
        </td>
      </tr>
    `;
    });

    const totalPages = Math.ceil(totalRows / limit);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  });

  /* EVENTS */
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadRecentAppointments();
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(totalRows / limit);
    if (currentPage < totalPages) {
      currentPage++;
      loadRecentAppointments();
    }
  });

  pageLimitSelect.addEventListener("change", () => {
    limit = parseInt(pageLimitSelect.value);
    currentPage = 1;
    loadRecentAppointments();
  });

  /* INITIAL LOAD */
  loadRecentAppointments();

  loading.style.display = "none";



})();

function isOnline() {
  return navigator.onLine;
}