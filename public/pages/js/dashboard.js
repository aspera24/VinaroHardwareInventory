// GLOBAL STATE
let page = 1;
const limit = 6;
let loading = false;
let hasMore = true;
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

  page++;
  loading = false;
}


// BORROWER LIST EVENTS
const borrowerList = document.getElementById("borrower-list");

if (borrowerList) {
  borrowerList.addEventListener("change", (e) => {
    if (e.target.classList.contains("borrower-checkbox")) {
      handleSelection(e.target);
    }
  });

  borrowerList.addEventListener("scroll", () => {
    if (
      borrowerList.scrollTop + borrowerList.clientHeight >= borrowerList.scrollHeight - 10
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

  document.getElementById("modalTitle").textContent = "Modify Borrower";

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

  document.getElementById("modalTitle").textContent = "Add Borrower";

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

  document.getElementById("modalTitle").textContent = "Add Borrower";
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

  const tbody = document.getElementById("logsTable");
  if (!tbody) return;

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>
        ${log.item_name ?? "Unknown Item"} 
        <span class="qty">x${log.quantity ?? 1}</span>
      </td>
      <td>${log.borrower ?? "-"}</td>
      <td>${datetimeformat(log.date_borrowed)}</td>
      <td>
        <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
          ${log.date_returned ? "Returned" : "Borrowed"}
        </span>
        <span class="void ${log.id}">
          Void
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

// LOAD ALERTS
function loadAlerts(logs) {
  const container = document.getElementById("alerts");
  if (!container) return;

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