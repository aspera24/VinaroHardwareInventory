// GLOBAL STATE
let page = 1;
const limit = 6;
let loading = false;
let hasMore = true;
let selectedBorrowers = new Set();
let isEditMode = false;
let currentSearch = "";

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

// LOAD BORROWERS (INFINITE SCROLL)
async function loadBorrower(reset = false) {

  const list = document.getElementById("borrower-list");

  if (reset) {
    page = 1;
    hasMore = true;
    loading = false;
    list.innerHTML = "";
    list.scrollTop = 0;
  }

  if (loading || !hasMore) return;

  loading = true;

  try {
    const res = await fetch(
      `/borrower?page=${page}&limit=${limit}&search=${encodeURIComponent(currentSearch)}&t=${Date.now()}`,
      {
        credentials: "include",
        cache: "no-store"
      }
    );

    const data = await res.json();

    if (data.length === 0) {
      hasMore = false;
      loading = false;
      return;
    }

    data.forEach(b => {
      const div = document.createElement("div");
      div.className = "blist";

      const isChecked = selectedBorrowers.has(String(b.id));

      div.innerHTML = `
        <input type="checkbox"
          class="borrower-checkbox"
          data-id="${b.id}"
          ${isChecked ? "checked" : ""}>

        <img src="${b.profile || '/graphics/default_profile.png'}"
          onerror="this.src='/graphics/default_profile.png'">

        <div class="borrower-item">
          <p class="bname"><strong>${b.name}</strong></p>
          <p class="bcontact">${b.contact || ""}</p>
          <p class="bcreatedat">${formatDate(b.created_at)}</p>
        </div>
      `;

      list.appendChild(div);
    });

    page++;

  } catch (err) {
    console.error(err);
  }

  loading = false;
}



// BORROWER LIST EVENTS
const borrowerList = document.getElementById("borrower-list");

if (borrowerList) {
  // CHECKBOX
  borrowerList.addEventListener("change", (e) => {
    if (e.target.classList.contains("borrower-checkbox")) {
      handleSelection(e.target);
    }
  });

  // INFINITE SCROLL
  borrowerList.addEventListener("scroll", () => {
    if (
      borrowerList.scrollTop + borrowerList.clientHeight >=
      borrowerList.scrollHeight - 10
    ) {
      loadBorrower();
    }
  });
}



// HANDLE CHECKBOX SELECTION
function handleSelection(checkbox) {
  const id = checkbox.dataset.id;

  if (checkbox.checked) {
    selectedBorrowers.add(id);
  } else {
    selectedBorrowers.delete(id);
  }

  const actions = document.getElementById("borrower-actions");

  if (actions) {
    // always based on Set, not DOM
    actions.style.display = selectedBorrowers.size > 0 ? "block" : "none";
  }
}


// open file picker
function triggerFile() {
  document.getElementById("bProfile").click();
}

// preview image
document.getElementById("bProfile").addEventListener("change", function () {
  const file = this.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    document.getElementById("profilePreview").src = e.target.result;
  };

  reader.readAsDataURL(file);
});



// GET SELECTED BORROWERS
function getSelectedBorrowers() {
  return Array.from(selectedBorrowers);
}

// MODIFY BORROWER
async function modifySelected() {
  const selected = getSelectedBorrowers();

  if (selected.length !== 1) {
    alert("Pili lang ug usa ka manghulamay nga imong tarungon.");
    return;
  }

  const id = selected[0];

  const res = await fetch(`/borrower/${id}`);
  const data = await res.json();

  isEditMode = true;

  document.getElementById("modalTitle").textContent = "TARUNGON ANG MANGHULAMAY";

  document.getElementById("bName").value = data.name;
  document.getElementById("bContact").value = data.contact;
  document.getElementById("bName").dataset.id = data.id;

  document.getElementById("profilePreview").src = data.profile || "/graphics/default_profile.png";

  openBorrowerModal();
}

function openBorrowerModal() {
  const modal = document.getElementById("borrowerModal");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
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

// DELETE BORROWERS
async function deleteSelected() {
  const selected = getSelectedBorrowers();

  if (selected.length === 0) return;

  if (!confirm("Sure baka nga tangtangon ni nga manghulamay?")) return;

  const res = await fetch("/borrower/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: selected })
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Delete failed");
    return;
  }

  // optional: sync UI better
  if (data.deletedIds) {
    data.deletedIds.forEach(id => {
      const el = document.querySelector(
        `.borrower-checkbox[data-id="${id}"]`
      );
      if (el) el.closest(".blist")?.remove();
    });
  }

  selectedBorrowers.clear();
  resetBorrowerForm();
}

// OPEN MODAL
const modal = document.getElementById("borrowerModal");
const addBtn = document.getElementById("addBtn");

if (addBtn && modal) {
  addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });
}

addBtn?.addEventListener("click", () => {
  isEditMode = false;

  document.getElementById("modalTitle").textContent = "MAGPUNO UG MANGHULAMAY";

  openBorrowerModal();
  clearBorrowerForm();
});

// CLOSE MODAL
function closeModal() {
  const actions = document.getElementById("borrower-actions");
  if (actions) {
    actions.style.display = selectedBorrowers.size > 0 ? "block" : "none";
  }
  document.getElementById("borrowerModal").style.display = "none";
  document.body.style.overflow = "";

  clearBorrowerForm();
  isEditMode = false;

  document.getElementById("modalTitle").textContent = "MAGPUNO UG MANGHULAMAY";
}

// SAVE BORROWER (ADD + UPDATE)
async function saveBorrower() {
  const nameInput = document.getElementById("bName");
  const contactInput = document.getElementById("bContact");
  const fileInput = document.getElementById("bProfile");

  const name = nameInput.value.trim();
  const contact = contactInput.value;
  const file = fileInput.files[0];

  const id = nameInput.dataset.id;

  // VALIDATION
  if (!name) {
    nameInput.style.border = "2px solid red";
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("contact", contact);

  if (file) {
    formData.append("profile", file);
  }

  let res;

  // ADD or UPDATE
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

  // IMPORTANT: check success
  if (!data.success) {
    alert(data.message || "Naay bati nga nahitabo!");
    return;
  }


  // UI RESET
  closeModal();
  resetBorrowerForm();
  await loadBorrower(true);
}



// RESET FORM + EDIT STATE
function resetBorrowerForm() {
  const nameInput = document.getElementById("bName");
  const contactInput = document.getElementById("bContact");
  const fileInput = document.getElementById("bProfile");
  const img = document.getElementById("profilePreview");
  const actions = document.getElementById("borrower-actions");

  nameInput.value = "";
  contactInput.value = "";
  fileInput.value = "";

  img.src = "";

  delete nameInput.dataset.id;

  selectedBorrowers.clear();

  if (actions) {
    actions.style.display = "none";
  }

  document.querySelectorAll(".borrower-checkbox").forEach(cb => {
    cb.checked = false;
  });
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
  const confirmVoid = confirm("Nasayop raba ka ani nga return?");
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
        Wala pay overdue nga item.
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

        ${item.item_name} wala pa ma uli
        (Borrower: <span>${item.borrower}</span>) 
        (Overdue na for ${diffHours} hour${diffHours !== 1 ? "s" : ""})

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
        No reminders for today 🎉
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
          <button class="small" onclick="markComplete(${reminder.id})">
            <i class="fa-solid fa-check"></i>
          </button>
      </div>
    `;
  });
}

async function markComplete(id) {
  if (confirm("Humana naba ka'g buhat ani nga reminder?")) {
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

    loadDashboardReminders();
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

// SEARCH UI
const searchCont = document.getElementById("searchCont");
const btn = document.getElementById("searchBtn");
const input = document.getElementById("searchInput");


// OPEN SEARCH
if (btn) {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    input.classList.add("active");
    input.focus();
  });
}


// CLOSE SEARCH WHEN CLICK OUTSIDE
document.addEventListener("click", (e) => {
  if (!searchCont.contains(e.target)) {
    input.classList.remove("active");
  }
});


// SEARCH INPUT
if (input) {
  input.addEventListener("input", () => {
    currentSearch = input.value.trim();
    loadBorrower(true);
  });
}

// INIT
async function init() {
  loadDashboard();
  await loadBorrower(true);
  loadLogs();
  loadBorrowedLogs();
  loadDashboardReminders();
}

init();