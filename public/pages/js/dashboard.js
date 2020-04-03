async function loadDashboard() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();

  const total = items.length;
  const borrowed = items.filter(i => i.status === "borrowed").length;
  const available = total - borrowed;

  // document.getElementById("total").textContent = total;
  // document.getElementById("borrowed").textContent = borrowed;
  // document.getElementById("available").textContent = available;

  animateNumber("total", total);
  animateNumber("borrowed", borrowed);
  animateNumber("available", available);
}


async function loadBorrower() {
  const borrowerList = document.getElementById("borrower-list");

  const res = await fetch("/borrower", { credentials: "include" });
  const borrowers = await res.json();

  // clear first
  borrowerList.innerHTML = "";

  // check if empty
  if (borrowers.length === 0) {
    borrowerList.innerHTML = "<p>No borrowers found</p>";
    return;
  }

  borrowerList.innerHTML = borrowers.map(b => `
    <div class="blist">
      <img src="${b.profile}">
      <div class="borrower-item">
        <p class="bname"><strong>${b.name}</strong></p>
        <p class="bcontact">${b.contact || ""}</p>
      </div>
    </div>
  `).join("");

  console.log(borrowers);
}



function animateNumber(id, value) {
  let el = document.getElementById(id);
  let start = 0;
  let end = value;

  let duration = 800;
  let step = Math.ceil(end / (duration / 16));

  let counter = setInterval(() => {
    start += step;
    if (start >= end) {
      el.textContent = end;
      clearInterval(counter);
    } else {
      el.textContent = start;
    }
  }, 16);
}


window.table = null;

async function loadLogs() {
  const res = await fetch("/logs", { credentials: "include" });
  const logs = await res.json();

  const tbody = document.getElementById("logsTable");

  if (!tbody) return; // IMPORTANT FIX

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



function loadAlerts(logs) {
  const container = document.getElementById("alerts");
  container.innerHTML = "";

  const now = new Date();

  const overdue = logs.filter(l => {
    if (!l.date_returned) {
      const borrowDate = new Date(l.date_borrowed);
      const diffDays = (now - borrowDate) / (1000 * 60 * 60 * 24);
      return diffDays > 3; // example: 3 days overdue
    }
    return false;
  });

  if (overdue.length === 0) {
    container.innerHTML = `<div class="alert yellow">No overdue items 🎉</div>`;
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


loadDashboard();
loadBorrower();
loadLogs();
