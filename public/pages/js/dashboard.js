async function loadDashboard() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();

  document.getElementById("total").textContent = items.length;
  document.getElementById("borrowed").textContent =
    items.filter(i => i.status === "borrowed").length;
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
}

function logout() {
  window.location.href = "/logout";
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
loadLogs();