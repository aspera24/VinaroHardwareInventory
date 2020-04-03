async function loadLogs() {
  const res = await fetch("/logs", { credentials: "include" });
  const logs = await res.json();

  const table = document.getElementById("logsTable");

  table.innerHTML = logs.map(log => `
    <tr>
      <td>${log.item_name}</td>
      <td>${log.borrower}</td>
      <td>${datetime(log.date_borrowed)}</td>
      <td>${datetime(log.date_returned)}</td>
      <td>
        <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
          ${log.date_returned ? "Returned" : "Borrowed"}
        </span>
      </td>
    </tr>
  `).join("");
}

function datetime(date) {
  return date ? new Date(date).toLocaleString() : "-";
}

loadLogs();