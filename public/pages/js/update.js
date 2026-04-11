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
    const created_at = document.getElementById("created_at");
    const updated_at = document.getElementById("updated_at");
    const btnText = form.querySelector(".btn-text");
    const loader = form.querySelector(".btn-loader");


    if (!id) {
        alert("No appointment ID found.");
        return;
    }


    let originalData = {};

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
            created_at.textContent = data.created_at ? formatDateTime(data.created_at) : "";
            updated_at.textContent = data.updated_at ? formatDateTime(data.updated_at) : "";

            originalData = {
                contact: contact.value,
                purpose: purpose.value,
                date: date.value,
                time: time.value,
                status: status.value,
                note: note.value
            };


        } catch (err) {
            console.error(err);
            alert("Failed to load data");
        }
    }

    loadData();

    function formatDateTime(dateStr) {
        const d = new Date(dateStr);

        const date = d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const time = d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        return `${date} | ${time}`;
    }


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

        const isSame = JSON.stringify(updatedData) === JSON.stringify(originalData);

        if (isSame) {
            alert("No changes detected.");
            return;
        }

        // 🔥 START LOADING
        updateBtn.disabled = true;
        btnText.textContent = "Updating...";
        loader.style.display = "inline-block";

        try {
            const res = await fetch(`/${admin}/page/appointments/update-data/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            const result = await res.json();

            if (res.ok) {
                const userID = localStorage.getItem("id");

                fetch(`/${admin}/page/appointments/log-change/${id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userID,
                        oldData: originalData,
                        newData: updatedData
                    })
                });

                btnText.textContent = "Updated ✔";
                loader.style.display = "none";

                setTimeout(() => {
                    localStorage.setItem("appointmentUpdated", result.message);
                    window.history.pushState({}, "", `/${admin}/page/appointments`);
                    router();
                }, 800);

            } else {
                btnText.textContent = "Failed !";

                setTimeout(() => {
                    updateBtn.disabled = false;
                    btnText.textContent = "Update";
                    loader.style.display = "none";
                }, 1500);
            }

        } catch (err) {
            console.error(err);

            btnText.textContent = "Error !";

            setTimeout(() => {
                updateBtn.disabled = false;
                btnText.textContent = "Update";
                loader.style.display = "none";
            }, 1500);
        }
    });

    /* ================= BACK BUTTON ================= */
    // Back button
    backBtn.addEventListener("click", () => {
        window.history.pushState({}, "", `/${admin}/page/appointments`);
        router();
    });


})();