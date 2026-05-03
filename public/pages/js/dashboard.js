// DASHBOARD
async function loadDashboard() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();

  const total = items.length;
  const borrowed = items.filter(i => i.status === "borrowed").length;
  const available = total - borrowed;

  animateNumber("total", total);
  animateNumber("borrowed", borrowed);
  animateNumber("available", available);
}

// ANIMATION
function animateNumber(id, value) {
  const el = document.getElementById(id);
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

// BORROWER
let page = 1;
const limit = 6;
let loading = false;
let hasMore = true;

async function loadBorrower(reset = false) {
  if (loading) return;

  if (reset) {
    page = 1;
    hasMore = true;
    document.getElementById("borrower-list").innerHTML = "";
  }

  if (!hasMore) return;

  loading = true;

  const res = await fetch(`/borrower?page=${page}&limit=${limit}`, {
    credentials: "include"
  });

  const data = await res.json();

  if (data.length === 0) {
    hasMore = false;
    loading = false;
    return;
  }

  const list = document.getElementById("borrower-list");

  list.innerHTML += data.map(b => `
    <div class="blist">
      <img src="${b.profile || ''}">
      <div class="borrower-item">
        <p class="bname"><strong>${b.name}</strong></p>
        <p class="bcontact">${b.contact || ""}</p>
      </div>
    </div>
  `).join("");

  page++;
  loading = false;
}

// INFINITE SCROLL BORROWER 
const borrowerList = document.getElementById("borrower-list");

borrowerList.addEventListener("scroll", () => {
  if (
    borrowerList.scrollTop + borrowerList.clientHeight >= borrowerList.scrollHeight - 10
  ) {
    loadBorrower();
  }
});

// MODAL
const modal = document.getElementById("borrowerModal");
const addBtn = document.getElementById("addBtn");

addBtn.addEventListener("click", () => {
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
});

function closeModal() {
  modal.style.display = "none";
  document.body.style.overflow = "";
}

// SAVE BORROWER
async function saveBorrower() {
  const name = document.getElementById("bName").value;
  const contact = document.getElementById("bContact").value;
  const file = document.getElementById("bProfile").files[0];

  const formData = new FormData();
  formData.append("name", name);
  formData.append("contact", contact);
  formData.append("profile", file);

  await fetch("/borrowers", {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  closeModal();

  loadBorrower(true);
}

// LOGS 
window.table = null;

async function loadLogs() {
  const res = await fetch("/logs", { credentials: "include" });
  const logs = await res.json();

  const tbody = document.getElementById("logsTable");
  if (!tbody) return;

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${log.item_name ?? "Unknown Item"}</td>
      <td>${log.borrower ?? "-"}</td>
      <td>${datetimeformat(log.date_borrowed)}</td>
      <td>
        <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
          ${log.date_returned ? "Returned" : "Borrowed"}
        </span>
      </td>
    </tr>
  `).join("");

  if (!window.table) {
    if ($.fn.DataTable.isDataTable("#logsTableUI")) {
      $("#logsTableUI").DataTable().destroy();
    }

    window.table = $("#logsTableUI").DataTable({
      pageLength: 10,
      lengthMenu: [10, 15, 20, 25],
      responsive: true
    });
  } else {
    window.table.destroy();
    window.table = $("#logsTableUI").DataTable();
  }

  loadAlerts(logs);
}

// ALERT
function loadAlerts(logs) {
  const container = document.getElementById("alerts");
  container.innerHTML = "";

  const now = new Date();

  const overdue = logs.filter(l => {
    if (!l.date_returned) {
      const borrowDate = new Date(l.date_borrowed);
      const diffDays = (now - borrowDate) / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    }
    return false;
  });

  if (overdue.length === 0) {
    container.innerHTML = `<div class="alert yellow">No overdue items.</div>`;
    return;
  }

  overdue.forEach(item => {
    container.innerHTML += `
      <div class="alert red">
        ${item.item_name} is overdue (Borrower: ${item.borrower})
      </div>
    `;
  });
}

// DATE FORMAT
function datetimeformat(datetime) {
  if (!datetime) return "-";

  return new Date(datetime).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

// INIT
loadDashboard();
loadBorrower(true);
loadLogs();