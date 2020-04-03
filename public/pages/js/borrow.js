async function loadBorrowPage() {
    const itemsRes = await fetch("/items", { credentials: "include" });
    const items = await itemsRes.json();
    console.log(items);


    const select = document.getElementById("itemSelect");
    select.innerHTML = items
        .filter(i => i.status === "available")
        .map(i => `<option value="${i.id}">${i.name}</option>`)
        .join("");

    loadLogs();
    console.log(document.getElementById("itemSelect"));
}

async function borrowItem() {
    const item_id = document.getElementById("itemSelect").value;
    const borrower = document.getElementById("borrower").value;

    await fetch("/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ item_id, borrower })
    });

    loadBorrowPage();
}

async function returnItem(id) {
    await fetch(`/return/${id}`, {
        method: "POST",
        credentials: "include"
    });

    loadBorrowPage();
}

async function loadLogs() {
    const res = await fetch("/logs", { credentials: "include" });
    const logs = await res.json();

    const table = document.getElementById("borrowTable");

    table.innerHTML = logs.map(log => `
    <tr>
      <td>${log.item_name}</td>
      <td>${log.borrower}</td>
      <td>${datetimeformat(log.date_borrowed)}</td>
      <td>
        <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
          ${log.date_returned ? "Returned" : "Borrowed"}
        </span>
      </td>
      <td>
        ${!log.date_returned ? `<button class="small" onclick="returnItem(${log.id})">Return</button>` : ""}
      </td>
    </tr>
  `).join("");
}

function datetimeformat(date) {
    return date ? new Date(date).toLocaleString() : "-";
}

loadBorrowPage();
