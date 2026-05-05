async function loadBorrowPage() {
  const itemsRes = await fetch("/items", { credentials: "include" });
  const items = await itemsRes.json();

  const select = document.getElementById("itemSelect");

  select.innerHTML = items
    .filter(i => (i.quantity - i.borrowed_count) > 0)
    .map(i => {
      const available = i.quantity - i.borrowed_count;
      return `<option value="${i.id}">
      ${i.name} (${available} in stock)
    </option>`;
    })
    .join("");

  if (select.options.length === 0) {
    select.innerHTML = `<option disabled>No items available</option>`;
  }

  await loadLogs(); // IMPORTANT
}

async function borrowItem() {
  const itemSelect = document.getElementById("itemSelect");
  const borrowerInput = document.getElementById("borrower");
  const qtyInput = document.getElementById("borrowQty");

  const item_id = itemSelect.value;
  const borrower = borrowerInput.value;
  const qty = Number(qtyInput.value);

  // basic validation
  if (!item_id || !borrower || !qty) {
    alert("Complete all fields");
    return;
  }

  await fetch("/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ item_id, borrower, qty })
  });

  // CLEAR FORM
  borrowerInput.value = "";
  qtyInput.value = "";
  itemSelect.selectedIndex = 0;
  document.getElementById("suggestBox").innerHTML = "";

  // reload data
  loadBorrowPage();
}


document.getElementById("borrower").addEventListener("input", async function () {
  const query = this.value;

  if (!query) {
    document.getElementById("suggestBox").innerHTML = "";
    return;
  }

  const res = await fetch(`/borrower-search?search=${query}`, { credentials: "include" });
  const data = await res.json();

  document.getElementById("suggestBox").innerHTML = data.map(b => `
        <a onclick="selectBorrower('${b.name}')">
            ${b.name.split(" ")[0]}
        </a>
    `).join("");
});



function selectBorrower(name) {
  document.getElementById("borrower").value = name;
  document.getElementById("suggestBox").innerHTML = "";
}


async function returnItem(id) {
  await fetch(`/return/${id}`, {
    method: "POST",
    credentials: "include"
  });

  loadBorrowPage();
}




let borrowTable = null;

async function loadLogs() {
  const res = await fetch("/borrow_logs", { credentials: "include" });
  const logs = await res.json();

  const rows = logs.map(log => [
    `${log.item_name} <span class="qty">x${log.quantity}</span>`,
    log.borrower,
    datetimeformat(log.date_borrowed),
    `
      <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
        ${log.date_returned ? "Returned" : "Borrowed"}
      </span>
    `,
    !log.date_returned
      ? `<button class="small" onclick="returnItem(${log.id})">Return</button>`
      : ""
  ]);

  // INIT FIRST TIME
  if (!borrowTable) {
    borrowTable = $("#borrowTableUI").DataTable({
      pageLength: 10,
      lengthMenu: [10, 15, 20, 25],
      responsive: true,
      columnDefs: [
        { orderable: false, targets: 4 }
      ]
    });
  }

  // REFRESH DATA
  borrowTable.clear();
  borrowTable.rows.add(rows);
  borrowTable.draw();
}

function datetimeformat(date) {
  return date ? new Date(date).toLocaleString() : "-";
}

loadBorrowPage();
