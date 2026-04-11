(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainAppoint");

    const filterStatus = document.getElementById("filterStatus");
    const customerCount = document.getElementById("customerCount");
    const applyBtn = document.getElementById("applyBtn");
    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

    const socket = window.socket;

    socket.off("appointmentsData");
    socket.off("appointmentUpdate");

    const msgBox = document.getElementById("msgBox");
    const msgTitle = document.getElementById("msgTitle");
    const msgText = document.getElementById("msgText");
    const msgBtns = document.getElementById("msgBtns");
    const msgOk = document.getElementById("msgOk");
    const msgCancel = document.getElementById("msgCancel");
    const msgSuccess = document.getElementById("msgSuccess");
    const successTitle = document.getElementById("successTitle");
    const successText = document.getElementById("successText");

    const userID = localStorage.getItem("id");

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

    function toggleBulkActions() {
        const checked = document.querySelectorAll('.checkBox:checked');
        const tableCont = document.querySelector('.tableCont');

        if (checked.length > 0) {
            tableCont.style.display = "flex";

            tableCont.querySelector("p").textContent =
                `${checked.length} selected`;
        } else {
            tableCont.style.display = "none";
        }
    }


    // FOR CHECKBOX LISTENER
    document.getElementById("selectAll").addEventListener("change", function () {
        const checked = this.checked;
        document.querySelectorAll(".checkBox").forEach(cb => {
            cb.checked = checked;
        });
        toggleBulkActions();
    });

    $('#appTable tbody').on('change', '.checkBox', function () {
        toggleBulkActions();
    });

    // FOR DELETE BUTTON
    deleteSelectedBtn.addEventListener("click", () => {
        const checked = document.querySelectorAll(".checkBox:checked");
        const ids = Array.from(checked).map(cb => cb.dataset.id);

        if (ids.length === 0) {
            showMsg("Warning", "Please select at least one appointment");
            return;
        }

        showMsg(
            "Confirm Delete",
            `Delete ${ids.length} selected appointment(s)?`,
            () => {
                socket.emit("deleteSelectedAppointments", ids, userID);
            }
        );
    });


    // FOR MARK BUTTON
    applyBtn.addEventListener("click", () => {
        const newStatus = "Completed";

        if (!newStatus) {
            showMsg("Warning", "Please select a status first");
            return;
        }

        const checked = document.querySelectorAll(".checkBox:checked");
        const ids = Array.from(checked).map(cb => cb.dataset.id);

        if (ids.length === 0) {
            showMsg("Warning", "Please select at least one appointment");
            return;
        }

        showMsg(
            "Confirm Update",
            `Update ${ids.length} selected appointment(s) to "${newStatus}"?`,
            () => {
                socket.emit("updateSelectedStatus", { ids, status: newStatus.toLowerCase(), userID });
            }
        );
    });

    socket.on("allStatusUpdated", (status) => {
        showSuccess("Success", `Appointments updated to ${status}`);
        document.querySelectorAll(".checkBox").forEach(cb => {
            cb.checked = false;
        });

        const selectAll = document.getElementById("selectAll");
        if (selectAll) selectAll.checked = false;

        toggleBulkActions();
    });


    socket.on("deleteSuccess", (count) => {
        showSuccess("Success", `${count} appointment(s) deleted successfully`);
        socket.emit("getAppointments");
    });

    socket.on("selectedAppointmentsDeleted", () => {
        showSuccess("Success", "All selected appointments deleted successfully");
        socket.emit("getAppointments");
    });


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

        const api = table.api(); //getting the API instance

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
                <div class="actionWrap">
                    <img title="Profile" class="viewBtn" data-id="${a.id}" src="/graphics/detail.svg"/>
                    <img title="Update" class="editBtn" data-id="${a.id}" src="/graphics/update.svg"/>
                    <input class="checkBox" type="checkbox" data-id="${a.id}"/>
                </div>
                `
            ]);
        });

        api.draw();
        toggleBulkActions();

        let cusCount = api.rows({ filter: 'applied' }).count();

        customerCount.textContent = `${cusCount} ${cusCount <= 1 ? "client" : "clients"}`;
    }

    /* ================= SOCKET ================= */

    socket.emit("getAppointments", userID);

    socket.on("appointmentsData", (data) => {
        allData = data || [];
        populateTable(allData);

        loading.style.display = "none";
        main.style.display = "flex";

        const updatedMsg = localStorage.getItem("appointmentUpdated");
        if (updatedMsg) {
            showSuccess("Success", updatedMsg);
            localStorage.removeItem("appointmentUpdated");
        }
    });

    socket.on("appointmentUpdate", () => {
        socket.emit("getAppointments");
    });


    filterStatus.addEventListener("change", function () {
        const val = this.value;

        table.api().column(4).search(val).draw(); // Status column
    });

    /* ================= ACTION BUTTONS ================= */

    const admin = getAdminPath();

    $('#appTable tbody').on('click', 'img', function () {
        const id = this.dataset.id;

        if (this.classList.contains("viewBtn")) {
            localStorage.setItem("subPage", "appointments");
            window.location.href = `/${admin}/profile?id=${id}`;
            router();
        }

        if (this.classList.contains("editBtn")) {
            // get the logged-in admin from URL
            history.pushState({}, "", `/${admin}/page/appointments/update?id=${id}`);
            router();
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
