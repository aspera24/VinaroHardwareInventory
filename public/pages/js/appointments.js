(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainAppoint");

    const filterStatus = document.getElementById("filterStatus");
    const deleteAllBtn = document.getElementById("deleteAllBtn");
    let customerCount = document.getElementById("customerCount");

    const socket = window.socket;

    socket.off("appointmentsData");
    socket.off("appointmentUpdate");

    const screenshotBtn = document.getElementById("screenshotTable");

    screenshotBtn.addEventListener("click", () => {

        html2canvas(document.querySelector(".mainCard")).then(canvas => {

            const link = document.createElement("a");
            link.download = "appointments.jpg";
            link.href = canvas.toDataURL();

            link.click();

        });

    });


    main.style.display = "none";
    loading.style.display = "flex";

    /* ================= DATATABLE INIT ================= */

    const table = $('#appTable').dataTable({
        pageLength: 10,
        ordering: true,
        searching: true,
        columnDefs: [
            { targets: 6, orderable: false } // actions column
        ],
        language: {
            emptyTable: "No appointments found"
        }
    });

    /* ================= POPULATE TABLE ================= */

    function populateTable(data) {

        const api = table.api(); // kuhaon ang API instance

        api.clear();

        data.forEach(a => {
            api.row.add([
                a.name,
                a.purpose,
                formatDate(a.date),
                formatTime(a.time),
                a.status,
                a.note || "NA",
                `
            <img title="Profile" class="viewBtn" data-id="${a.id}" src="../graphics/detail.svg"/>
            <img title="Update" class="editBtn" data-id="${a.id}" src="../graphics/update.svg"/>
            <img title="Delete" class="deleteBtn" data-id="${a.id}" src="../graphics/delete.svg"/>
            `
            ]);
        });

        api.draw();

        let cusCount = api.rows({ filter: 'applied' }).count();

        customerCount.textContent = `${cusCount} ${cusCount <= 1 ? "client" : "clients"}`;
    }

    /* ================= SOCKET ================= */

    socket.emit("getAppointments");

    socket.on("appointmentsData", (data) => {
        allData = data || [];
        populateTable(allData);

        loading.style.display = "none";
        main.style.display = "flex";
    });

    socket.on("appointmentUpdate", () => {
        socket.emit("getAppointments");
    });


    // filterStatus.addEventListener("change", function () {
    //     const val = this.value;
    //     table.column(4).search(val).draw(); // Status column
    // });

    filterStatus.addEventListener("change", function () {
        const val = this.value;

        table.api().column(4).search(val).draw(); // Status column
    });

    /* ================= ACTION BUTTONS ================= */

    $('#appTable tbody').on('click', 'img', function () {
        const id = this.dataset.id;

        if (this.classList.contains("viewBtn")) {

            window.location.href = `/profile.html?id=${id}`;
            router();
        }

        if (this.classList.contains("editBtn")) {
            window.history.pushState({}, "", `/page/appointments/update?id=${id}`);
            router();
        }

        if (this.classList.contains("deleteBtn")) {
            if (confirm("Are you sure you want to delete this appointment?")) {
                socket.emit("deleteAppointment", id);
            }
        }
    });

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
        });
    }

    function formatTime(timeStr) {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
    }

})();
