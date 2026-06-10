async function loadBorrowPage() {
  const itemsRes = await fetch("/items", { credentials: "include" });
  const items = await itemsRes.json();

  const select = document.getElementById("itemSelect");

  select.innerHTML = items
    .filter(i => (i.quantity - i.borrowed_count) > 0)
    .map(i => {
      const available = i.quantity - i.borrowed_count;
      return `<option value="${i.id}">
      ${i.name} <span>(${available} in stock)</span>
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
    alert("Complete of fields");
    return;
  }

  if (!selectedBorrowerId) {
    alert("Please select borrower from suggestion list");
    return;
  }

  console.log("BORROW SUBMIT:", {
    item_id,
    borrower,
    selectedBorrowerId
  });

  await fetch("/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      item_id,
      borrower,
      borrower_id: selectedBorrowerId,
      qty
    })
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
  const item_id = document.getElementById("modalItemSelect").value;
  const qty = document.getElementById("modalQty").value;
  const date = document.getElementById("modalDate").value;

  if (!borrower || !qty || !date) {
    alert("Complete all fields");
    return;
  }

  if (!selectedBorrowerId) {
    alert("Please select a valid borrower from suggestions");
    return;
  }

  console.log("MODAL SAVE:", {
    borrower,
    selectedBorrowerId
  });

  await fetch(`/borrow_logs/${editItemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      borrower,
      item_id,
      quantity: qty,
      date_borrowed: date,
      borrower_id: selectedBorrowerId
    })
  });

  
  await loadBorrowPage();
  await closeItemModal();
  await finishLoading();
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

  suggestEl.innerHTML = data.map(b => {
    const firstName = b.name.split(" ")[0]; 

    return `
      <a onclick="selectBorrower('${b.name}', '${b.id}', '${inputEl.id}', '${suggestEl.id}')">
        ${firstName}
      </a>
    `;
  }).join("");

  await finishLoading();
}

// MAIN
document.getElementById("borrower").addEventListener("input", function () {
  searchBorrower(this, document.getElementById("suggestBox"));
  selectedBorrowerId = null;
});

// MODAL
document.getElementById("modalBorrower").addEventListener("input", function () {
  searchBorrower(this, document.getElementById("modalSuggestBox"));
  selectedBorrowerId = null;
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

  // CLEAR SUGGESTIONS
  const suggestBox = document.getElementById("modalSuggestBox");
  if (suggestBox) suggestBox.innerHTML = "";

  editItemId = null;
  selectedBorrowerId = null;
}

function openItemModal() {
  document.getElementById("itemModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

let selectedBorrowerId = null;

function selectBorrower(name, id, inputId, suggestId) {
  document.getElementById(inputId).value = name;
  document.getElementById(suggestId).innerHTML = "";

  selectedBorrowerId = Number(id);

  console.log("SELECTED BORROWER:", selectedBorrowerId);
}


document.getElementById("modalItemSelect").addEventListener("change", () => {
  document.getElementById("modalQty").value = "";
});

let editItemId = null;

async function modifyItem(id) {

  try {

    const res = await fetch(`/borrowedItem/${id}`);
    const item = await res.json();

    editItemId = id;

    // LOAD ITEMS
    const itemsRes = await fetch("/items", {
      credentials: "include"
    });

    const items = await itemsRes.json();

    const modalSelect = document.getElementById("modalItemSelect");

    modalSelect.innerHTML = items.map(i => {

      const available = i.quantity - i.borrowed_count;

      return `
        <option value="${i.id}">
          ${i.name} (${available} in stock)
        </option>
      `;

    }).join("");

    // SET SELECTED ITEM
    modalSelect.value = item.item_id;

    // OTHER VALUES
    document.getElementById("modalBorrower").value = item.borrower;
    selectedBorrowerId = item.borrower_id;

    document.getElementById("modalQty").value = item.quantity;

    // FORMAT DATE
    const dt = new Date(item.date_borrowed);

    const pad = n => String(n).padStart(2, "0");

    const localDatetime =
      dt.getFullYear() + "-" +
      pad(dt.getMonth() + 1) + "-" +
      pad(dt.getDate()) + "T" +
      pad(dt.getHours()) + ":" +
      pad(dt.getMinutes());

    document.getElementById("modalDate").value = localDatetime;

    openItemModal();
    finishLoading();

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

  await loadBorrowPage();
  finishLoading();
}




let borrowTable = null;

async function loadLogs() {
  const res = await fetch("/borrow_logs", { credentials: "include" });
  const logs = await res.json();

  const rows = logs.map((log, index) => [
    "", // placeholder for numbering
    `${log.item_name} <span class="qty">x${log.quantity}</span>`,
    log.borrower,
    datetimeformat(log.date_borrowed),
    `
    <span class="status ${log.date_returned ? 'returned' : 'borrowed'}">
      ${log.date_returned ? "Returned" : "Borrowed"}
    </span>
  `,
    !log.date_returned ? `
    <button class="small modify" onclick="modifyItem(${log.id})">Modify</button>
    <button class="small" onclick="returnItem(${log.id}, '${log.borrower}')">Return</button>
    <button class="small delete" onclick="deleteBorrowedItem(${log.id}, '${log.borrower}')">Delete</button>
  ` : ""
  ]);

  // INIT FIRST TIME
  if (!borrowTable) {
    borrowTable = $("#borrowTableUI").DataTable({
      pageLength: 10,
      lengthMenu: [10, 15, 20, 25],
      responsive: true,
      autoWidth: false,
      columnDefs: [
        { width: "40px", targets: 0 }, // FIRST COLUMN
        { orderable: false, targets: 5 }
      ],
      rowCallback: function (row, data, displayIndex) {
        const pageInfo = this.api().page.info();
        const index = pageInfo.start + displayIndex + 1;

        $('td:eq(0)', row).html(index + ".");
      }
    });
  }

  // REFRESH DATA
  borrowTable.clear();
  borrowTable.rows.add(rows);
  borrowTable.draw();
}

async function deleteBorrowedItem(id, borrower) {
  const confirmDelete = confirm(`Delete record of ${borrower}?`);
  if (!confirmDelete) return;

  await fetch(`/borrow_logs/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  loadBorrowPage(); // reload table + dropdown
}

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

  return `<span class="bstrong">(${weekday})</span> ${formattedDate} at ${time}`;
}





async function init() {
  try {

    await loadBorrowPage();

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

  } catch (err) {

    console.error(err);

  } finally {

    finishLoading();

  }
}

init();