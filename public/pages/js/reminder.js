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

    const res = await fetch("/reminders", {
        credentials: "include"
    });

    const reminders = await res.json();

    const list = document.getElementById("reminderList");

    list.innerHTML = "";

    const now = new Date();

    // ADD THESE
    let today = 0;
    let upcoming = 0;
    let overdue = 0;

    reminders.forEach(reminder => {

        const typeText = formatReminderType(reminder);

        const start = reminder.start_date ? new Date(reminder.start_date) : null;

        if (reminder.reminder_type === "one_time") {
            today++;
        } else if (start && start > now) {
            upcoming++;
        } else {
            overdue++;
        }

        list.innerHTML += `
      <div class="reminderCard">
        <div class="reminderTop">
          <h4>${reminder.title}</h4>
          <span>${typeText}</span>
        </div>

        <p>${reminder.description || "No description"}</p>

        <div class="reminderBottom">
          <small>Created by ${reminder.admin_name || "Admin"}</small>

          <div>
            <button onclick="deleteReminder(${reminder.id})">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
    });

    document.getElementById("todayCount").textContent = today;
    document.getElementById("upcomingCount").textContent = upcoming;
    document.getElementById("overdueCount").textContent = overdue;
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

function handleReminderType() {
    const type = document.getElementById("rType").value;
    const weekDayGroup = document.getElementById("weekDayGroup");
    const monthDayGroup = document.getElementById("monthDayGroup");
    const singleDateGroup = document.getElementById("singleDateGroup");
    const dateRangeGroup = document.getElementById("dateRangeGroup");

    // RESET
    weekDayGroup.style.display = "none";
    monthDayGroup.style.display = "none";
    singleDateGroup.style.display = "none";
    dateRangeGroup.style.display = "none";

    // SHOW NEEDED INPUTS ONLY
    if (type === "one_time") {
        singleDateGroup.style.display = "block";
    }
    else if (type === "weekly") {
        weekDayGroup.style.display = "block";
    }

    else if (type === "monthly") {
        monthDayGroup.style.display = "block";
    }
    else if (type === "date_range") {
        dateRangeGroup.style.display = "grid";
    }
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


loadReminders();
handleReminderType();