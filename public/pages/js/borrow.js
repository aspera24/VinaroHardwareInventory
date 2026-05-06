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



async function saveItem() {
  const borrower = document.getElementById("modalBorrower").value;
  const qty = document.getElementById("modalQty").value;
  const date = document.getElementById("modalDate").value;

  if (!borrower || !qty || !date) {
    alert("Complete all fields");
    return;
  }

  await fetch(`/borrow_logs/${editItemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      borrower,
      quantity: qty,
      date_borrowed: date
    })
  });

  closeItemModal();
  loadBorrowPage();
}

async function searchBorrower(inputEl, suggestEl) {
  const query = inputEl.value;

  if (!query) {
    suggestEl.innerHTML = "";
    return;
  }

  const res = await fetch(`/borrower-search?search=${query}`, {
    credentials: "include"
  });

  const data = await res.json();

  suggestEl.innerHTML = data.map(b => `
    <a onclick="selectBorrower('${b.name}', '${inputEl.id}', '${suggestEl.id}')">
      ${b.name}
    </a>
  `).join("");
}

// MAIN
document.getElementById("borrower").addEventListener("input", function () {
  searchBorrower(this, document.getElementById("suggestBox"));
});

// MODAL
document.getElementById("modalBorrower").addEventListener("input", function () {
  searchBorrower(this, document.getElementById("modalSuggestBox"));
});

function closeItemModal() {
  document.getElementById("itemModal").style.display = "none";
  document.body.style.overflow = "";

  clearItemForm();
}

function clearItemForm() {
  const borrower = document.getElementById("modalBorrower");
  const qty = document.getElementById("modalQty");
  const date = document.getElementById("modalDate");

  if (borrower) borrower.value = "";
  if (qty) qty.value = "";
  if (date) date.value = "";

  editItemId = null;
}

function openItemModal() {
  document.getElementById("itemModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function selectBorrower(name, inputId, suggestId) {
  document.getElementById(inputId).value = name;
  document.getElementById(suggestId).innerHTML = "";
}

let editItemId = null;

async function modifyItem(id) {
  try {
    const res = await fetch(`/borrowedItem/${id}`);
    const item = await res.json();

    editItemId = id;

    // SET VALUES
    document.getElementById("modalBorrower").value = item.borrower;
    document.getElementById("modalQty").value = item.quantity;

    // FORMAT DATE FOR INPUT
    const dt = new Date(item.date_borrowed);
    const formatted = dt.toISOString().slice(0, 16);
    document.getElementById("modalDate").value = formatted;

    openItemModal();

  } catch (err) {
    console.error(err);
  }
}


async function returnItem(id, borrower) {
  const confirmReturn = confirm(`Click OK if ${borrower} return the item`);

  if (!confirmReturn) return;

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
    !log.date_returned ? `<button class="small modify" onclick="modifyItem(${log.id})">Modify</button> 
    <button class="small" onclick="returnItem(${log.id}, '${log.borrower}')">Return</button>` : ""
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

loadBorrowPage();
