(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainAppoint");
    main.style.display = "none"; // hide main while loading

    // show loading initially
    loading.style.display = "flex";

    const socket = window.socket;

    socket.emit("getAppointments");

    socket.on("appointmentsData", (data) => {

        const tbody = document.getElementById("appointmentList");
        tbody.innerHTML = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;">No appointments found</td>
                </tr>
            `;
            return;
        }

        data.forEach(a => {
            tbody.innerHTML += `
                <tr>
                    <td>${a.name}</td>
                    <td>${a.purpose}</td>
                    <td>${formatDate(a.date)}</td>
                    <td>${formatTime(a.time)}</td>
                </tr>
            `;
        });

        loading.style.display = "none";
        main.style.display = "block"; // show main
    });

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function formatTime(timeStr) {
        if (!timeStr) return "";
        return timeStr.substring(0, 5);
    }

    socket.on("databaseUpdated", () => {
        socket.emit("getAppointments");
    });
})();
