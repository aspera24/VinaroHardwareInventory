(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainAppoint");
    const tbody = document.getElementById("appointmentList");

    const searchInput = document.getElementById("searchName");
    const filterDate = document.getElementById("filterDate");
    const filterStatus = document.getElementById("filterStatus");
    const pageLimitSelect = document.getElementById("pageLimit");

    const customerCount = document.getElementById("customerCount");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");

    const deleteAllBtn = document.getElementById("deleteAllBtn");

    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let pageLimit = 10;

    main.style.display = "none";
    loading.style.display = "flex";

    const socket = window.socket;
    socket.emit("getAppointments");

    socket.on("appointmentsData", (data) => {
        allData = data || [];
        applyFilters();
        loading.style.display = "none";
        main.style.display = "flex";
    });

    socket.on("appointmentUpdate", () => {
        socket.emit("getAppointments");
    });

    /* ================= FILTERS ================= */

    searchInput.addEventListener("input", applyFilters);
    filterDate.addEventListener("change", applyFilters);
    filterStatus.addEventListener("change", applyFilters);

    pageLimitSelect.addEventListener("change", () => {
        pageLimit = parseInt(pageLimitSelect.value);
        currentPage = 1;
        renderTable();
    });

    function applyFilters() {
        const search = searchInput.value.toLowerCase();
        const date = filterDate.value;
        const status = filterStatus.value;

        filteredData = allData.filter(a => {
            const matchName = a.name.toLowerCase().includes(search);
            const matchStatus = status ? a.status === status : true;
            const matchDate = date ? formatDateInput(a.date) === date : true;

            return matchName && matchStatus && matchDate;
        });


        currentPage = 1;
        renderTable();
    }

    /* ================= RENDER ================= */

    function renderTable() {
        tbody.innerHTML = "";

        const start = (currentPage - 1) * pageLimit;
        const end = start + pageLimit;
        const pageData = filteredData.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">No appointments found</td>
                </tr>
            `;
        } else {
            let html = "";
            pageData.forEach(a => {
                html += `
                    <tr>
                        <td>${a.name}</td>
                        <td>${a.purpose}</td>
                        <td>${formatDate(a.date)}</td>
                        <td>${formatTime(a.time)}</td>
                        <td>${a.status}</td>
                        <td>${a.note ? a.note : "NA"}</td>
                        <td>
                            <button class="viewBtn" data-id="${a.id}">View</button>
                            <button class="editBtn" data-id="${a.id}">Update</button>
                            <button class="deleteBtn" data-id="${a.id}">Delete</button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        }

        // count label
        customerCount.textContent = `Total: ${filteredData.length}`;

        // pagination info
        const totalPages = Math.ceil(filteredData.length / pageLimit) || 1;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    /* ================= PAGINATION ================= */

    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(filteredData.length / pageLimit);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    /* ================= ACTION BUTTONS ================= */

    tbody.addEventListener("click", (e) => {
        const id = e.target.dataset.id;

        if (e.target.classList.contains("viewBtn")) {
            viewAppointment(id);
        }

        if (e.target.classList.contains("editBtn")) {
            updateAppointment(id);
        }

        if (e.target.classList.contains("deleteBtn")) {
            deleteAppointment(id);
        }
    });

    function viewAppointment(id) {
        socket.emit("getSingleAppointment", id);
    }

    function updateAppointment(id) {
        window.location.href = `edit-appointment.html?id=${id}`;
    }

    function deleteAppointment(id) {
        if (confirm("Are you sure you want to delete this appointment?")) {
            socket.emit("deleteAppointment", id);
        }
    }

    deleteAllBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete ALL appointments?")) {
            socket.emit("deleteAllAppointments");
        }
    });

    /* ================= FORMATTERS ================= */

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    }

    function formatDateInput(dateStr) {
        // const d = new Date(dateStr);
        // return d.toISOString().split("T")[0];
        return dateStr.substring(0, 10);
    }

    function formatTime(timeStr) {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
    }

})();
