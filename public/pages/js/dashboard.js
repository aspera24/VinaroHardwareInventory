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

  animateNumber("total", total);
  animateNumber("borrowed", borrowed);
  animateNumber("available", available);
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

  if (loading) return;

  // RESET
  if (reset) {
    page = 1;
    hasMore = true;

    document.getElementById("borrower-list").innerHTML = "";
  }

  if (!hasMore) return;

  loading = true;

  try {

    const res = await fetch(
      `/borrower?page=${page}&limit=${limit}&search=${encodeURIComponent(currentSearch)}`,
      {
        credentials: "include"
      }
    );

    const data = await res.json();

    // NO MORE RESULTS
    if (data.length === 0) {
      hasMore = false;
      loading = false;
      return;
    }

    const list = document.getElementById("borrower-list");

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
        </div>
      `;

      list.appendChild(div);

    });

    // NEXT PAGE
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
    alert("Select only ONE borrower to modify.");
    return;
  }

  const id = selected[0];

  const res = await fetch(`/borrower/${id}`);
  const data = await res.json();

  isEditMode = true;

  document.getElementById("modalTitle").textContent = "MODIFY BORROWER";

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

// DELETE BORROWERS
async function deleteSelected() {
  const selected = getSelectedBorrowers();

  if (selected.length === 0) return;

  if (!confirm("Are you sure you want to delete selected borrowers?")) return;

  await fetch("/borrower/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: selected })
  });

  selectedBorrowers.clear();
  loadBorrower(true);
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

  document.getElementById("modalTitle").textContent = "ADD BORROWER";

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

  document.getElementById("modalTitle").textContent = "ADD BORROWER";
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

  // basic validation
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

  if (id) {
    formData.append("id", id);

    await fetch("/borrower/update", {
      method: "POST",
      body: formData
    });
  } else {
    await fetch("/borrowers", {
      method: "POST",
      body: formData
    });
  }

  // reset UI state after save
  closeModal();
  resetBorrowerForm();
  loadBorrower(true);
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

  // IMPORTANT: reset selection UI
  selectedBorrowers.clear();

  if (actions) {
    actions.style.display = "none";
  }

  // uncheck all checkboxes visually
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
  const confirmVoid = confirm("Are you sure you want to VOID this return?");
  if (!confirmVoid) return;

  const res = await fetch(`/void_return/${id}`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message || "Failed to void return");
    return;
  }

  await loadLogs();
  await loadDashboard();
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
      const diffDays = (Date.now() - borrowDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    }
    return false;
  });

  if (overdue.length === 0) {
    container.innerHTML = `<div class="alert yellow">No overdue items.</div>`;
    return;
  }

  overdue.forEach((item, index) => {

    const borrowDate = new Date(item.date_borrowed);

    const diffDays = Math.floor(
      (Date.now() - borrowDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dayText = diffDays === 1 ? "day" : "days";

    container.innerHTML += `
      <div class="alert red">

        <span class="alertNumber">
          ${index + 1}
        </span>

        ${item.item_name} is overdue 
        (Borrower: <span>${item.borrower}</span>) 
        (${diffDays} ${dayText} na ang nilabay)

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

  const container =
    document.getElementById("reminderList");

  container.innerHTML = "";

  reminders.slice(0, 5).forEach(reminder => {

    container.innerHTML += `
      <div class="reminderCard urgent">
        <div class="reminderTop">
          <h4>${reminder.title}</h4>
          <span>
            ${formatReminderType(reminder)}
          </span>
        </div>
        <p>${reminder.description || ""}</p>
        <div class="reminderBottom">
          <small>
            Created by
            ${reminder.admin_name || "Admin"}
          </small>
        </div>
      </div>
    `;

  });

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

  return `<strong>(${weekday})</strong> ${formattedDate} at ${time}`;
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
loadDashboard();
loadBorrower(true);
loadLogs();
loadBorrowedLogs();
loadDashboardReminders();