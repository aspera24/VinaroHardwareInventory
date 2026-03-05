(function () {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const form = document.getElementById("updateForm");
    const backBtn = document.getElementById("backBtn");

    const client_name = document.getElementById("name");
    const purpose = document.getElementById("purpose");
    const date = document.getElementById("date");
    const time = document.getElementById("time");
    const status = document.getElementById("status");
    const note = document.getElementById("note");

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
            purpose.value = data.purpose || "";
            date.value = data.appointment_date ? data.appointment_date.split("T")[0] : "";
            time.value = data.appointment_time ? data.appointment_time.slice(0, 5) : "";
            status.value = data.status || "";
            note.value = data.note || "";

        } catch (err) {
            console.error(err);
            alert("Failed to load data");
        }
    }
    loadData();

    /* ================= UPDATE ================= */

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updatedData = {
            name: name.value,
            purpose: purpose.value,
            date: date.value,
            time: time.value,
            status: status.value,
            note: note.value
        };

        try {
            const res = await fetch(`/page/update-appointment/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message);
                window.history.pushState({}, "", "/page/appointments");
                router();
            } else {
                alert(result.message);
            }

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });

    /* ================= BACK BUTTON ================= */

    backBtn.addEventListener("click", () => {
        window.history.pushState({}, "", "/page/appointments");
        router();
    });

})();