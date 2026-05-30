// GLOBAL STATE
let selectedBorrowers = new Set();
let isEditMode = false;

// DASHBOARD
async function loadDashboard() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();

  let total = 0;
  let borrowed = 0;
  let available = 0;

  items.forEach(i => {
    total += Number(i.quantity);
    borrowed += Number(i.borrowed_count || 0);
    available += Number(i.available || 0);
  });

  animateNumber("total", Number(total).toLocaleString());
  animateNumber("borrowed", Number(borrowed).toLocaleString());
  animateNumber("available", Number(available).toLocaleString());
}

// NUMBER ANIMATION
function animateNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  let start = 0;
  const duration = 800;
  const step = Math.ceil(value / (duration / 16));

  const counter = setInterval(() => {
    start += step;

    if (start >= value) {
      el.textContent = value;
      clearInterval(counter);
    } else {
      el.textContent = start;
    }
  }, 16);
}

async function loadReminderCount() {

  const res = await fetch("/reminders", {
    credentials: "include"
  });

  const reminders = await res.json();

  const today = new Date();

  const todayStr = today.toISOString().slice(0, 10);
  const todayDay = today.toLocaleString("en-US", { weekday: "long" });
  const todayMonthDay = today.getDate();

  let count = 0;

  reminders.forEach(r => {

    let show = false;

    if (r.status === "completed") return;

    if (r.reminder_type === "daily") {
      show = true;
    }

    else if (r.reminder_type === "weekly") {
      show = r.week_day === todayDay;
    }

    else if (r.reminder_type === "monthly") {
      show = Number(r.month_day) === todayMonthDay;
    }

    else if (r.reminder_type === "one_time") {
      show = r.start_date === todayStr;
    }

    else if (r.reminder_type === "date_range") {
      show =
        r.start_date <= todayStr &&
        r.end_date >= todayStr;
    }

    if (show) count++;
  });

  document.getElementById("reminderCount").textContent = count;
}


window.borrowerTable = null;

async function loadBorrowersTable() {

  const aB = document.getElementById("addBtn");
  aB.disabled = true;

  const res = await fetch("/borrower", {
    credentials: "include"
  });

  const borrowers = await res.json();

  const rows = borrowers.map(b => {

    return [

      `<img src="${b.profile || '/graphics/default_profile.png'}" class="tableProfile">`,
      `<strong>${b.name}</strong>`,
      b.contact || "-",
      formatDate(b.created_at),
      `
        <div class="actionWrapper">

          <button class="actionBtn"
            onclick="toggleBorrowerMenu(event, ${b.id})">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>

          <div class="popoverMenu" id="menu-${b.id}">

            <button onclick="editBorrower(${b.id})">
              <i class="fa-solid fa-pen"></i>
              Edit
            </button>

            <button class="delete"
              onclick="deleteBorrower(${b.id})">
              <i class="fa-solid fa-trash"></i>
              Delete
            </button>

          </div>

        </div>
      `
    ];
  });



  // INIT ONLY ONCE
  if (!window.borrowerTable) {
    window.borrowerTable = $("#borrowerTableUI").DataTable({
      pageLength: 6,
      lengthMenu: [6, 10, 15, 20],
      responsive: true,
      autoWidth: false,
      language: {
        emptyTable: "No borrowers added yet"
      },
      columnDefs: [
        { orderable: false, targets: [0, 4] }
      ]
    });
  }

  // update data ONLY
  window.borrowerTable.clear();
  window.borrowerTable.rows.add(rows);
  window.borrowerTable.columns.adjust().draw(false);
  await finishLoading();
  aB.disabled = false;
}


// TOGGLE MENU
function toggleBorrowerMenu(event, id) {

  event.stopPropagation();

  // close all first
  document.querySelectorAll(".popoverMenu")
    .forEach(menu => {
      menu.classList.remove("show");
    });

  const menu = document.getElementById(`menu-${id}`);

  if (menu) {
    menu.classList.toggle("show");
  }
}

// CLOSE WHEN CLICK OUTSIDE
document.addEventListener("click", () => {
  document.querySelectorAll(".popoverMenu")
    .forEach(menu => {
      menu.classList.remove("show");
    });
});


async function editBorrower(id) {

  const res = await fetch(`/borrower/${id}`, {
    credentials: "include"
  });

  const borrower = await res.json();

  document.getElementById("bName").value =
    borrower.name || "";

  document.getElementById("bContact").value =
    borrower.contact || "";

  document.getElementById("profilePreview").src =
    borrower.profile || "/graphics/default_profile.png";

  document.getElementById("bName").dataset.id = id;

  document.getElementById("modalTitle").textContent =
    "EDIT BORROWER";

  openBorrowerModal();
}

async function deleteBorrower(id) {

  const confirmDelete = confirm(
    "Are you sure you want to remove this borrower?"
  );

  if (!confirmDelete) return;

  const res = await fetch("/borrower/delete", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ids: [id] })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message);
    return;
  }

  await loadBorrowersTable();
  await finishLoading();
}






// open file picker
function triggerFile() {
  document.getElementById("bProfile").click();
}

// preview image
const profileInput = document.getElementById("bProfile");

if (profileInput) {
  profileInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      document.getElementById("profilePreview").src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}



function openBorrowerModal() {
  const modal = document.getElementById("borrowerModal");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  const nameInput = document.getElementById("bName");
  nameInput.style.border = "1px solid #ccc";
  isBorrowerModalOpen = true;
  finishLoading();
}

function clearBorrowerForm() {
  document.getElementById("bName").value = "";
  document.getElementById("bContact").value = "";
  document.getElementById("bProfile").value = "";

  document.getElementById("profilePreview").src = "/graphics/default_profile.png";

  const nameInput = document.getElementById("bName");
  delete nameInput.dataset.id;
}

const adminName = localStorage.getItem("fullName").split(" ")[0];


// OPEN MODAL
const modal = document.getElementById("borrowerModal");
const addBtn = document.getElementById("addBtn");


addBtn?.addEventListener("click", () => {
  isEditMode = false;

  document.getElementById("modalTitle").textContent = "ADD BORROWER";

  openBorrowerModal();
  clearBorrowerForm();
});

// CLOSE MODAL
function closeModal() {
  document.getElementById("borrowerModal").style.display = "none";
  document.body.style.overflow = "";
  const nameInput = document.getElementById("bName");
  nameInput.style.border = "1px solid #ccc";
  isBorrowerModalOpen = false;
  clearBorrowerForm();
  isEditMode = false;


  document.getElementById("modalTitle").textContent = "ADD BORROWER";
}


let isBorrowerModalOpen = false;
let isSavingBorrower = false;

document.addEventListener("keydown", function (e) {

  if (!isBorrowerModalOpen) return;

  if (e.key === "Enter") {
    e.preventDefault();

    if (!isSavingBorrower) {
      saveBorrower();
    }
  }
});

// SAVE BORROWER (ADD + UPDATE)
async function saveBorrower() {

  if (isSavingBorrower) return;

  const btn = document.getElementById("saveBorrowerBtn");
  const icon = document.getElementById("saveBorrowerIcon");

  const nameInput = document.getElementById("bName");
  const contactInput = document.getElementById("bContact");
  const fileInput = document.getElementById("bProfile");

  nameInput.disabled = true;
  contactInput.disabled = true;
  fileInput.disabled = true;

  const name = nameInput.value.trim();
  const contact = contactInput.value;
  const file = fileInput.files[0];

  const id = nameInput.dataset.id;

  // VALIDATION
  if (!name) {
    nameInput.style.border = "2px solid red";
    return;
  }

  isSavingBorrower = true;

  // LOADING UI
  btn.disabled = true;
  icon.className = "fa-solid fa-spinner fa-spin";

  try {

    const formData = new FormData();
    formData.append("name", name);
    formData.append("contact", contact);

    if (file) {
      formData.append("profile", file);
    }

    let res;

    if (id) {
      formData.append("id", id);

      res = await fetch("/borrower/update", {
        method: "POST",
        credentials: "include",
        body: formData
      });
    } else {
      res = await fetch("/borrowers", {
        method: "POST",
        credentials: "include",
        body: formData
      });
    }

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Something went wrong!");
      return;
    }

    await loadBorrowersTable();
    await closeModal();
    await resetBorrowerForm();
    await finishLoading();

  } finally {

    // RESTORE UI
    isSavingBorrower = false;
    btn.disabled = false;
    icon.className = "fa-solid fa-floppy-disk";
    nameInput.disabled = false;
    contactInput.disabled = false;
    fileInput.disabled = false;
  }
}


// RESET FORM + EDIT STATE
function resetBorrowerForm() {
  const nameInput = document.getElementById("bName");
  const contactInput = document.getElementById("bContact");
  const fileInput = document.getElementById("bProfile");
  const img = document.getElementById("profilePreview");

  nameInput.value = "";
  contactInput.value = "";
  fileInput.value = "";

  img.src = "";

  delete nameInput.dataset.id;

  selectedBorrowers.clear();

}

// LOAD LOGS
window.table = null;

async function loadLogs() {
  const res = await fetch("/return_logs", { credentials: "include" });
  const logs = await res.json();

  const rows = logs.map((log, index) => [
    "", // placeholder for numbering
    `${log.item_name ?? "Unknown Item"} <span class="qty">x${log.quantity ?? 1}</span>`,
    log.borrower ?? "-",
    datetimeformat(log.date_borrowed),
    datetimeformat(log.date_returned),
    `
      <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
        ${log.date_returned ? "Returned" : "Borrowed"}
      </span>
      <span class="void" onclick="voidReturn(${log.id})">
        Void
      </span>
    `
  ]);

  // INIT DATA TABLE ONCE
  if (!window.table) {
    window.table = $("#logsTableUI").DataTable({
      pageLength: 10,
      lengthMenu: [10, 15, 20, 25],
      responsive: true,
      autoWidth: false,
      columnDefs: [
        { width: "40px", targets: 0 }, // FIRST COLUMN
        { orderable: false, targets: 4 }
      ],
      rowCallback: function (row, data, displayIndex) {
        const pageInfo = this.api().page.info();
        const index = pageInfo.start + displayIndex + 1;

        $('td:eq(0)', row).html(index + ".");
      }
    });
  }

  // REFRESH DATA PROPERLY
  window.table.clear();
  window.table.rows.add(rows);
  window.table.draw(false);
}

async function loadBorrowedLogs() {
  const res = await fetch("/borrow_logs", { credentials: "include" });
  const logs = await res.json();

  loadAlerts(logs);
}


async function voidReturn(id) {
  const confirmVoid = confirm("Did you accidentally make a mistake with this return?");
  if (!confirmVoid) return;

  const res = await fetch(`/void_return/${id}`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Wala madayon ug void ang return.");
    return;
  }

  await loadLogs();
  await loadDashboard();
  await loadBorrowedLogs();
  finishLoading();
}


// LOAD ALERTS
function loadAlerts(logs) {

  const container = document.getElementById("alerts");
  if (!container) return;

  container.innerHTML = "";

  const now = new Date();
  const overdue = logs.filter(l => {

    if (!l.date_returned && l.date_borrowed) {

      const borrowDate = new Date(l.date_borrowed);

      if (isNaN(borrowDate.getTime())) return false;

      // SAME DAY END TIME = 11:59:59 PM
      const endOfDay = new Date(borrowDate);

      endOfDay.setHours(23, 59, 59, 999);

      // OVERDUE IF CURRENT TIME PASSED END OF DAY
      return now > endOfDay;
    }

    return false;
  });

  if (overdue.length === 0) {
    container.innerHTML = `
      <div class="alert yellow">
        No overdue item 🎉
      </div>
    `;
    return;
  }

  overdue.forEach((item, index) => {

    const borrowDate = new Date(item.date_borrowed);

    const endOfDay = new Date(borrowDate);
    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = now - endOfDay;

    const diffHours = Math.floor(
      diffMs / (1000 * 60 * 60)
    );

    container.innerHTML += `
      <div class="alert red">

        <span class="alertNumber">
          ${index + 1}
        </span>

        ${item.item_name} has not been returned yet
        (Borrower: <span>${item.borrower}</span>) 
        (Overdue for ${diffHours} hour${diffHours !== 1 ? "s" : ""})

      </div>
    `;
  });
}

// LOAD REMINDERS
async function loadDashboardReminders() {

  const res = await fetch("/reminders", {
    credentials: "include"
  });

  const reminders = await res.json();

  const container = document.getElementById("reminderList");

  container.innerHTML = "";

  // FILTER FIRST
  const todayReminders = reminders.filter(r => isDueToday(r));

  if (todayReminders.length === 0) {
    container.innerHTML = `
      <div class="alert yellow">
        No reminder for today 🎉
      </div>`;
    return;
  }

  // LIMIT 5 AFTER FILTER
  todayReminders.slice(0, 5).forEach(reminder => {

    container.innerHTML += `
      <div class="reminderCard urgent">
        <div class="reminderTop">
          <h5>${reminder.title}</h5>
          <span class="remSession">${formatReminderType(reminder)}</span>
        </div>
        <p class="desc">${reminder.description || ""}</p>
          <button class="complete" onclick="markComplete(${reminder.id})">
            <i class="fa-solid fa-check"></i>
          </button>
      </div>
    `;
  });
}

async function markComplete(id) {
  if (confirm("Are you done with this reminder?")) {

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


    await fetch(`/reminders/complete/${id}`, {
      method: "PUT",
      credentials: "include"
    });

    await loadDashboardReminders();
  }
}

function isDueToday(reminder) {

  const today = new Date();

  const todayStr = today.toISOString().slice(0, 10);
  const todayDay = today.toLocaleString("en-US", { weekday: "long" });
  const todayDate = today.getDate();

  // ❗ if already completed today → HIDE
  if (reminder.status === "completed") return false;

  // ONE TIME
  if (reminder.reminder_type === "one_time") {
    return reminder.start_date === todayStr;
  }

  // DAILY
  if (reminder.reminder_type === "daily") {
    return true;
  }

  // WEEKLY
  if (reminder.reminder_type === "weekly") {
    return reminder.week_day === todayDay;
  }

  // MONTHLY
  if (reminder.reminder_type === "monthly") {
    return parseInt(reminder.month_day) === todayDate;
  }

  // DATE RANGE
  if (reminder.reminder_type === "date_range") {
    return (
      reminder.start_date <= todayStr &&
      reminder.end_date >= todayStr
    );
  }

  return false;
}

function formatReminderType(reminder) {

  const time = reminder.reminder_time
    ? formatTime(reminder.reminder_time)
    : "";

  switch (reminder.reminder_type) {

    case "daily":
      return `Daily • ${time}`;

    case "weekly":
      return `Every ${reminder.week_day} • ${time}`;

    case "monthly":
      return `Every Month (${reminder.month_day}) • ${time}`;

    case "date_range":
      return `
        ${formatDate(reminder.start_date)}
        to
        ${formatDate(reminder.end_date)}
      `;

    default:
      return `
        ${formatDate(reminder.start_date)}
        •
        ${time}
      `;
  }
}

function formatDate(dateStr) {

  if (!dateStr) return "";

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

}

function formatTime(timeStr) {

  if (!timeStr) return "";

  const [hour, minute] = timeStr.split(":");

  const date = new Date();

  date.setHours(hour);
  date.setMinutes(minute);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

}


// DATE FORMAT
function datetimeformat(datetime) {
  if (!datetime) return "-";

  const date = new Date(datetime);

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long"
  });

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric"
  });

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  return `<span class="dstrong">(${weekday})</span> ${formattedDate} at ${time}`;
}




// INIT
async function init() {

  try {

    await Promise.all([
      loadBorrowersTable(),
      loadLogs(),
      loadBorrowedLogs(),
      loadDashboardReminders(),
      loadReminderCount(),
      loadDashboard(),

    ]);

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

  } catch (err) {

    console.error(err);

  } finally {

    await finishLoading();

  }
}

init();