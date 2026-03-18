(function () {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const form = document.getElementById("updateForm");
    const backBtn = document.getElementById("backBtn");

    const client_name = document.getElementById("name");
    const contact = document.getElementById("contact");
    const purpose = document.getElementById("purpose");
    const date = document.getElementById("date");
    const time = document.getElementById("time");
    const status = document.getElementById("status");
    const note = document.getElementById("note");
    const admin = getAdminPath();


    if (!id) {
        alert("No appointment ID found.");
        return;
    }





    /* ================= LOAD DATA ================= */

    async function loadData() {
        try {
            const res = await fetch(`/page/appointment/${id}`);
            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            // Fill fields
            client_name.textContent = data.customer_name || ""; // from join
            contact.value = data.contact || "";
            purpose.value = data.purpose || "";
            date.value = data.appointment_date ? formatDate(data.appointment_date) : "";
            time.value = data.appointment_time ? data.appointment_time.slice(0, 5) : "";
            status.value = data.status || "";
            note.value = data.note || "";

        } catch (err) {
            console.error(err);
            alert("Failed to load data");
        }
    }
    loadData();

    function formatDate(dateStr) {
        const d = new Date(dateStr);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
    /* ================= UPDATE ================= */

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updatedData = {
            contact: contact.value,
            purpose: purpose.value,
            date: date.value,
            time: time.value,
            status: status.value,
            note: note.value
        };

        try {
            const res = await fetch(`/${admin}/page/appointments/update-data/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            const result = await res.json();

            if (res.ok) {
                localStorage.setItem("appointmentUpdated", result.message);
                console.log(result.message);


                window.history.pushState({}, "", `/${admin}/page/appointments`);
                router();
            } else {
                localStorage.setItem("appointmentUpdated", result.message);
            }

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });

    /* ================= BACK BUTTON ================= */
    // Back button
    backBtn.addEventListener("click", () => {
        window.history.pushState({}, "", `/${admin}/page/appointments`);
        router();
    });


})();