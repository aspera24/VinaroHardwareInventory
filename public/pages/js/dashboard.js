(function () {

  const loading = document.getElementById("dashboard-loading");
  const dashboardWrapper = document.querySelector(".dashboard-wrapper");
  dashboardWrapper.style.display = "none";
  loading.style.display = "flex";

  const socket = window.socket;


  const msgBox = document.getElementById("msgBox");
  const msgTitle = document.getElementById("msgTitle");
  const msgText = document.getElementById("msgText");
  const msgBtns = document.getElementById("msgBtns");
  const msgOk = document.getElementById("msgOk");
  const msgCancel = document.getElementById("msgCancel");
  const msgSuccess = document.getElementById("msgSuccess");
  const successTitle = document.getElementById("successTitle");
  const successText = document.getElementById("successText");


  function showMsg(title, text, confirmFn = null) {

    msgTitle.innerText = title;
    msgText.innerText = text;

    msgBox.style.display = "flex";

    if (confirmFn) {
      msgBtns.style.display = "block";

      msgOk.onclick = () => {
        msgBox.style.display = "none";
        confirmFn();
      };

      msgCancel.onclick = () => {
        msgBox.style.display = "none";
      };

    } else {

      msgBtns.style.display = "none";

      setTimeout(() => {
        msgBox.style.display = "none";
      }, 3000);
    }
  }

  function showSuccess(title, text) {

    successTitle.innerText = title;
    successText.innerText = text;

    // show animation
    msgSuccess.classList.add("show");

    // auto hide
    setTimeout(() => {
      msgSuccess.classList.remove("show");
    }, 3000);

  }


  var total_customers = document.getElementById("total-customers");
  var total_appointments = document.getElementById("total-appointments");
  var upcoming_today = document.getElementById("upcoming-today");
  var pending_appointments = document.getElementById("pending-appointments");

  const yearFilter = document.getElementById("yearFilter");
  const monthFilter = document.getElementById("monthFilter");
  const weekFilter = document.getElementById("weekFilter");



  function generateChartData(values) {
    const year = parseInt(yearFilter.value);
    const month = parseInt(monthFilter.value); // 1–12
    const weekNum = parseInt(weekFilter.value);

    const startDay = (weekNum - 1) * 7 + 1;
    const monthEnd = new Date(year, month, 0).getDate();

    const labels = [];
    const data = [];

    values.forEach((val, index) => {
      const dayNumber = startDay + index;
      if (dayNumber > monthEnd) return;

      const dateObj = new Date(year, month - 1, dayNumber);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

      labels.push(`${dayNumber} (${dayName})`);
      data.push(typeof val === "number" ? val : 0);
    });

    return { labels, data };
  }



  const ctx = document.getElementById("appointmentsChart").getContext("2d");

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Number of Clients",
        data: [],
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        borderWidth: 2,
        backgroundColor: "rgba(118, 0, 0, 0.25)",
        borderColor: "#760000",
        backgroundColor: "#ffbb0029",
        borderColor: "#ffa600",
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // IMPORTANT: no lag
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed.y;
              return `${value} ${value <= 1 ? 'client' : 'clients'}`;
            }
          }
        }
      },
      scales: {
        x: {
          offset: true,
          title: { display: true, text: "Days of Week", color: "black" },
          ticks: {
            color: "black"
          },
          grid: {
            color: "#ffffff"   // grid color sa X axis
          }
        },
        y: {
          title: { display: true, text: "Number of Clients", color: "black" },
          beginAtZero: true,
          ticks: {
            color: "black"
          },
          grid: {
            color: "#f3f3f3"   // grid color sa X axis
          }
        }
      }
    }
  });



  const cTypeBtn = document.getElementById("cType");

  cTypeBtn.addEventListener("click", () => {

    let nextType = cTypeBtn.dataset.type; // next chart type

    // apply chart type
    chart.config.type = nextType;
    chart.update("none");

    // toggle next type
    let newNextType = nextType === "line" ? "bar" : "line";

    // change image to show next chart
    cTypeBtn.src = `/graphics/${newNextType}.svg`;
    cTypeBtn.dataset.type = newNextType;

  });

  socket.off("dashboardStats");
  socket.off("dashboardChart");
  socket.off("filterOptions");
  socket.off("databaseUpdated");
  socket.off("statDetailsPaginated");
  socket.off("recentAppointments");


  // ================= DASHBOARD DATA =================
  socket.on("dashboardStats", stats => {
    total_customers.innerText = (stats?.totalClients ?? 0) || 0;
    total_appointments.innerText = (stats?.totalAppointments ?? 0) || 0;
    upcoming_today.innerText = (stats?.upcomingToday ?? 0) || 0;
    pending_appointments.innerText = (stats?.pendingApproval ?? 0) || 0;
  });




  socket.on("dashboardChart", data => {
    const { labels, data: chartData } = generateChartData(data.weekData);

    chart.data.labels = labels;
    chart.data.datasets[0].data = chartData;

    chart.update("none"); // no animation = smooth
  });





  // ================= FILTERS =================
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let cachedFilters = null;
  let updatingFilters = false;
  let autoWeekSet = false;


  // ================= HANDLE FILTER OPTIONS FROM SERVER =================
  socket.on("filterOptions", filters => {
    cachedFilters = filters;
    updatingFilters = true;

    const prevYear = yearFilter.value;
    const prevMonth = monthFilter.value;
    const prevWeek = weekFilter.value;

    const title = document.getElementById("chartLabel");
    title.textContent = `Appointments – ${monthNames[prevMonth - 1]} ${prevYear} | Week ${weekFilter.value}`;


    loadYears(filters, prevYear);
    loadMonths(filters, yearFilter.value, prevMonth);
    loadWeeks(filters, yearFilter.value, monthFilter.value, prevWeek);
    setCurrentWeekIfApplicable(yearFilter.value, monthFilter.value);


    updatingFilters = false;

    requestChartUpdate();
  });



  function loadYears(filters, prevYear = null) {
    const years = filters.years;

    // Skip updating if options already match
    const optionsMatch = Array.from(yearFilter.options).map(o => Number(o.value)).join(",") === years.join(",");
    if (optionsMatch) return;

    yearFilter.innerHTML = "";
    years.forEach(y => {
      yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });

    yearFilter.value = prevYear && years.includes(Number(prevYear))
      ? prevYear
      : years[0];
  }






  function loadMonths(filters, year, prevMonth = null) {
    // Only update if the selected month doesn't exist
    const currentMonth = monthFilter.value;
    const monthsForYear = filters.months[year];

    // Skip updating if the options already match
    const optionsMatch = Array.from(monthFilter.options).map(o => Number(o.value)).join(",") === monthsForYear.join(",");
    if (optionsMatch) return;

    monthFilter.innerHTML = "";
    monthsForYear.forEach(m => {
      monthFilter.innerHTML += `<option value="${m}">${monthNames[m - 1]}</option>`;
    });

    monthFilter.value = prevMonth && monthsForYear.includes(Number(prevMonth))
      ? prevMonth
      : monthsForYear[monthsForYear.length - 1];
  }


  // ================= LOAD WEEKS =================
  function loadWeeks(filters, year, month, prevWeek = null) {
    const monthEnd = new Date(year, month, 0).getDate();
    const totalWeeks = Math.ceil(monthEnd / 7);

    const weekOptions = [];
    for (let w = 1; w <= totalWeeks; w++) {
      const start = (w - 1) * 7 + 1;
      const end = w === totalWeeks ? monthEnd : w * 7;
      weekOptions.push(`${w}`);
    }

    // Skip update if options already match
    const currentOptions = Array.from(weekFilter.options).map(o => o.value);
    if (currentOptions.join(",") === weekOptions.join(",")) {
      // just preserve previous selection
      if (prevWeek && weekOptions.includes(prevWeek.toString())) {
        weekFilter.value = prevWeek;
      }
      return;
    }

    // Rebuild options
    weekFilter.innerHTML = "";
    weekOptions.forEach(w => {
      const start = (w - 1) * 7 + 1;
      const end = w == totalWeeks ? monthEnd : w * 7;
      weekFilter.innerHTML += `<option value="${w}">Day ${start}-${end}</option>`;
    });

    // Restore previous selection if valid
    if (prevWeek && prevWeek <= totalWeeks) weekFilter.value = prevWeek;
  }


  function setCurrentWeekIfApplicable(year, month) {
    if (autoWeekSet) return;

    const today = new Date();

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    if (Number(year) === currentYear && Number(month) === currentMonth) {
      const currentWeek = Math.ceil(currentDay / 7);

      const options = Array.from(weekFilter.options).map(o => Number(o.value));
      if (options.includes(currentWeek)) {
        weekFilter.value = currentWeek;
        autoWeekSet = true;
      }
    }
  }



  // ================= REQUEST CHART UPDATE =================
  function requestChartUpdate() {
    socket.emit("filterDashboard", {
      year: yearFilter.value,
      month: monthFilter.value,
      week: weekFilter.value
    });
  }

  // ================= EVENT LISTENERS =================
  yearFilter.addEventListener("change", () => {
    if (updatingFilters) return; // Ignore programmatic changes
    loadMonths(cachedFilters, yearFilter.value);
    requestChartUpdate();
  });

  monthFilter.addEventListener("change", () => {
    if (updatingFilters) return;
    loadWeeks(cachedFilters, yearFilter.value, monthFilter.value);
    requestChartUpdate();
  });

  weekFilter.addEventListener("change", () => {
    if (updatingFilters) return;
    requestChartUpdate();
  });



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
  const modalSearch = document.getElementById("modal-search");
  const modalStatus = document.getElementById("modal-status-filter");




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
      limit: modalLimit,
      search: modalSearch.value,
      status: modalStatus.value
    });
  }



  socket.on("statDetailsPaginated", ({ title, rows, total, type }) => {
    const txtLabel = document.getElementById("txtLabel");
    const modalPagination = document.getElementById("modal-pagination");
    modalTotal = total;

    modalStatus.style.display =
      type === "total-appointments" ? "inline-block" : "none";

    if (!rows.length) {
      txtLabel.textContent = title;
      modalBody.innerHTML = `<p class='noData'>No data</p>`;
      modalPagination.style.display = 'none';
      return;
    }

    modalPagination.style.display = 'flex';
    const hasDate = rows[0].appointment_date;
    const hasStatus = rows[0].status;

    console.log(rows);


    txtLabel.textContent = title;

    modalBody.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          ${hasDate ? "<th>Date</th>" : ""}
          ${hasStatus ? "<th>Status</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td onclick="window.location='/profile.html?id=${r.id}'">${r.name}</td>
            ${hasDate ? `<td>${new Date(r.appointment_date).toLocaleDateString("en-CA")}</td>` : ""}
            ${hasStatus ? `<td>${r.status}</td>` : ""}
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

  modalSearch.addEventListener("input", () => {
    modalPage = 1;
    loadModalData();
  });

  modalStatus.addEventListener("change", () => {
    modalPage = 1;
    loadModalData();
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



  function loadRecentAppointments() {
    socket.emit("getRecentAppointments");
  }

  const table = $('#recentTable').dataTable({
    pageLength: 10,
    ordering: true,
    searching: true,
    columnDefs: [
      { targets: 2, orderable: false } // actions column
    ],
    language: {
      emptyTable: "No appointments found"
    }
  });


  socket.on("recentAppointments", rows => {

    const api1 = table.api();

    api1.clear();

    rows.forEach(a => {
      api1.row.add([
        a.customer,
        new Date(a.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        `<span class="status ${a.status}">
        ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}✔</span>
       <a href="/page/dashboard/update-status:${a.id}" id="void" class="void-btn" data-id="${a.id}">
        Void
       </a>`
      ]);
    });

    api1.draw();

  });




  $('#recentTable tbody').on('click', '.void-btn', async function (e) {

    e.preventDefault();

    const id = $(this).data("id");
    console.log("Appointment ID:", id);

    showMsg(
      "Warning",
      "Are you sure you want to void this appointment?",
      async () => {
        try {
          const res = await fetch(`/page/dashboard/update-status/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "pending" })
          });

          const result = await res.json();

          if (res.ok) {
            // Separate success message
            showSuccess("Success", "Appointment voided successfully");

            socket.emit("getRecentAppointments");
          } else {
            showMsg("Error", result.message);
          }

        } catch (err) {
          showMsg("Error", "Server error");
        }
      }
    );
  });


  /* INITIAL LOAD */
  loadRecentAppointments();

  loading.style.display = "none";
  dashboardWrapper.style.display = "block";


})();

function isOnline() {
  return navigator.onLine;
}