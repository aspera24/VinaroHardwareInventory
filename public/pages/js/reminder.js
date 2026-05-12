let currentFilter = "all";

function setFilter(filter) {
    currentFilter = filter;
    setActiveTab(filter);
    loadReminders();
}

function setActiveTab(filter) {
    const buttons = document.querySelectorAll(".reminderTab");

    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
}


function formatReminderType(reminder) {
    switch (reminder.reminder_type) {
        case "daily":
            return `Daily • ${formatTime(reminder.reminder_time || "")}`;
        case "weekly":
            return `${reminder.week_day || ""} • ${formatTime(reminder.reminder_time || "")}`;
        case "monthly":
            return `Every ${reminder.month_day || ""}`;
        case "date_range":
            return `${reminder.start_date || ""} - ${reminder.end_date || ""}`;
        default:
            return reminder.start_date || "One Time";
    }
}





async function loadReminders() {

    let hasShown = false;

    const res = await fetch("/reminders", {
        credentials: "include"
    });

    const reminders = await res.json();

    const list = document.getElementById("reminderList");
    list.innerHTML = "";

    const now = new Date();
    const today = new Date();

    const todayStr = today.toISOString().split("T")[0];
    const todayDay = today.toLocaleString("en-US", { weekday: "long" });
    const todayMonthDay = today.getDate();

    let todayCount = 0;
    let upcoming = 0;
    let overdue = 0;

    reminders.forEach(reminder => {

        const start = reminder.start_date ? new Date(reminder.start_date) : null;

        let show = false;

        // TODAY LOGIC
        if (currentFilter === "today") {

            if (reminder.reminder_type === "daily") {
                show = true;
            }

            else if (reminder.reminder_type === "weekly") {
                show = reminder.week_day === todayDay;
            }

            else if (reminder.reminder_type === "monthly") {
                show = Number(reminder.month_day) === todayMonthDay;
            }

            else if (reminder.reminder_type === "one_time") {
                show = reminder.start_date === todayStr;
            }

            else if (reminder.reminder_type === "date_range") {
                const s = new Date(reminder.start_date);
                const e = new Date(reminder.end_date);
                show = today >= s && today <= e;
            }
        }

        else if (currentFilter === "weekly") {
            show = reminder.reminder_type === "weekly";
        }

        else if (currentFilter === "monthly") {
            show = reminder.reminder_type === "monthly";
        }

        else if (currentFilter === "overdue") {
            show = start && start < now;
        }

        else if (currentFilter === "completed") {
            show = reminder.status === "completed";
        }

        else {
            show = true;
        }

        if (currentFilter !== "completed" && reminder.status === "completed") {
            show = false;
        }

        // ===== STATS (SINGLE SOURCE OF TRUTH) =====

        if (reminder.reminder_type === "daily") {
            todayCount++;
        }

        else if (reminder.reminder_type === "weekly" && reminder.week_day === todayDay) {
            todayCount++;
        }

        else if (reminder.reminder_type === "monthly" && Number(reminder.month_day) === todayMonthDay) {
            todayCount++;
        }

        else if (reminder.reminder_type === "one_time" && reminder.start_date === todayStr) {
            todayCount++;
        }

        else if (reminder.reminder_type === "date_range") {
            const s = new Date(reminder.start_date);
            const e = new Date(reminder.end_date);
            if (today >= s && today <= e) todayCount++;
        }

        // UPCOMING / OVERDUE
        if (start) {
            if (start > now) upcoming++;
            else if (start < now) overdue++;
        }

        if (!show) return;

        hasShown = true;

        list.innerHTML += `
        <div class="reminderCard">
            <div class="reminderTop">
                <h4>${reminder.title}</h4>
                <span>${formatReminderType(reminder)}</span>
            </div>

            <p>${reminder.description || "No description"}</p>

            <div class="reminderBottom">
                <small>Created by ${reminder.admin_name || "Admin"}</small>

                <div>
                    <button onclick="markComplete(${reminder.id})">Done</button>
                    <button onclick="deleteReminder(${reminder.id})">Delete</button>
                </div>
            </div>
        </div>
    `;
    });

    if (!hasShown) {
        list.innerHTML = `
            <div class="emptyState">
                <p>No reminders found for "${currentFilter}"</p>
            </div>
        `;
    }

    document.getElementById("todayCount").textContent = todayCount;
    document.getElementById("upcomingCount").textContent = upcoming;
    document.getElementById("overdueCount").textContent = overdue;
}

async function markComplete(id) {

    // STEP 1: create log first
    await fetch(`/reminders/generate-log`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            reminder_id: id,
            occurrence_date: new Date().toISOString().slice(0, 10)
        })
    });

    // STEP 2: mark complete
    await fetch(`/reminders/complete/${id}`, {
        method: "PUT",
        credentials: "include"
    });

    loadReminders();
}

function generateTodayLog(reminder) {
    const today = new Date().toISOString().slice(0, 10);

    return fetch(`/reminders/generate-log`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            reminder_id: reminder.id,
            occurrence_date: today
        })
    });
}

function formatTime(time) {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${h}:${minute} ${ampm}`;
}

async function deleteReminder(id) {
    const confirmDelete = confirm("Delete this reminder?");
    if (!confirmDelete) return;
    await fetch(`/reminders/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    loadReminders();
}

async function saveReminder() {

    const type = document.getElementById("rType").value;

    const data = {
        title: document.getElementById("rTitle").value,
        description: document.getElementById("rDescription").value,
        reminder_type: type,

        start_date:
            type === "date_range"
                ? document.getElementById("rRangeStart").value
                : document.getElementById("rStartDate").value,

        end_date:
            type === "date_range"
                ? document.getElementById("rRangeEnd").value
                : null,

        reminder_time: document.getElementById("rTime").value,
        week_day: document.getElementById("rWeekDay").value,
        month_day: document.getElementById("rMonthDay").value
    };

    await fetch("/reminders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data)
    });

    closeReminderModal();
    loadReminders();
}



// OPEN REMINDER MODAL
function openReminderModal() {
    document.getElementById("reminderModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

// CLOSE REMINDER MODAL
function closeReminderModal() {
    document.getElementById("reminderModal").style.display = "none";
    document.body.style.overflow = "";
}

setActiveTab("all");
loadReminders();