let itemsTable = null;
let isItemModalOpen = false;
let isSavingItem = false;

async function loadItems() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();
  const admin = localStorage.getItem("fullName");

  const rows = items.map((item, index) => [
    "",
    item.name,
    item.quantity ? Number(item.quantity).toLocaleString() : 0,
    `<span class="stock">${item.available ? Number(item.available).toLocaleString() : 0}</span>`,
    `<span class="peso">₱</span> ${item.item_price ? Number(item.item_price).toLocaleString() + " each" : "0.00"}`,
    item.created_by_name == admin ? "You" : item.created_by_name,
    `
      <button class="small modify" onclick="modifyItem(${item.id})">Modify</button>
      <button class="small delete" onclick="deleteItem(${item.id}, '${item.name}')">Delete</button>
    `
  ]);

  if (!itemsTable) {
    // FIRST INIT
    itemsTable = $("#itemsTableUI").DataTable({
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

  // SMOOTH REFRESH
  itemsTable.clear();
  itemsTable.rows.add(rows);
  itemsTable.draw();
}

let editItemId = null;

function openItemModal() {
  document.getElementById("itemModal").style.display = "flex";
  document.body.style.overflow = "hidden";
  isItemModalOpen = true;
}

function closeItemModal() {
  document.getElementById("itemModal").style.display = "none";
  document.body.style.overflow = "";
  isItemModalOpen = false;
  resetBorders();
  clearItemForm();
}

function clearItemForm() {
  document.getElementById("itemName").value = "";
  document.getElementById("itemQty").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("modalTitle").textContent = "ADD ITEM";
  editItemId = null;
}

function resetBorders() {
  document.getElementById("itemName").style.border = "1px solid #ddd";
  document.getElementById("itemQty").style.border = "1px solid #ddd";
  document.getElementById("itemPrice").style.border = "1px solid #ddd";
}

resetBorders();

document.addEventListener("keydown", function (e) {

  // ONLY IF MODAL OPEN
  if (isItemModalOpen) {

    // ENTER = SAVE
    if (e.key === "Enter") {
      e.preventDefault();

      if (!isSavingItem) {
        saveItem();
      }
    }

    // ESC = CLOSE
    if (e.key === "Escape") {
      closeItemModal();
    }
  }

  // CTRL + N = OPEN MODAL
  if (e.ctrlKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    openItemModal();
  }

});

async function saveItem() {

  if (isSavingItem) return;

  const btn = document.getElementById("saveItemBtn");
  const icon = document.getElementById("saveItemIcon");

  const nameInput = document.getElementById("itemName");
  const qtyInput = document.getElementById("itemQty");
  const priceInput = document.getElementById("itemPrice");

  const name = nameInput.value.trim();
  const quantity = parseInt(qtyInput.value);
  const price = parseFloat(priceInput.value) || 0;

  if (!name) {
    nameInput.style.border = "2px solid red";
    return;
  }

  if (!quantity || quantity <= 0) {
    qtyInput.style.border = "2px solid red";
    return;
  }

  isSavingItem = true;

  // LOADING UI
  btn.disabled = true;
  icon.className = "fa-solid fa-spinner fa-spin";

  try {

    if (editItemId) {
      await fetch(`/items/${editItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, quantity, price })
      });
    } else {
      await fetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, quantity, price })
      });
    }

    
    await loadItems();
    await closeItemModal();
    await finishLoading();

  } finally {

    isSavingItem = false;
    btn.disabled = false;
    icon.className = "fa-solid fa-floppy-disk";
  }
}


async function modifyItem(id) {
  try {
    const res = await fetch(`/items/${id}`);

    if (!res.ok) {
      throw new Error("Item not found");
    }

    const item = await res.json();

    editItemId = id;

    document.getElementById("modalTitle").textContent = "EDIT ITEM";
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.quantity;
    document.getElementById("itemPrice").value = item.item_price || 0;

    openItemModal();
    await finishLoading();

  } catch (err) {
    console.error(err);
    alert("Failed to load item.");
  }
}



document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    openItemModal();
  }
});

async function deleteItem(id, name) {
  const confirmDelete = confirm(`Delete "${name}"?`);
  if (!confirmDelete) return;

  const res = await fetch(`/items/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message);
    await finishLoading();
    return;
  }

  await loadItems();
  await finishLoading();
}




async function init() {

  try {

    await loadItems();

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

  } catch (err) {

    console.error(err);

  } finally {

    await finishLoading();

  }
}

init();