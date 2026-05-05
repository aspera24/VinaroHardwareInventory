let itemsTable = null;

async function loadItems() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();
  const admin = localStorage.getItem("fullName");

  const rows = items.map(item => [
    item.name,
    item.quantity,
    item.available,
    `<span class="peso">₱</span> ${item.item_price ? item.item_price : "0.00"} each`,
    item.created_by_name == admin ? "You" : item.created_by_name,
    `
      <button class="small modify" onclick="modifyItem(${item.id})">Modify</button>
      <button class="small" onclick="deleteItem(${item.id}, '${item.name}')">Delete</button>
    `
  ]);

  if (!itemsTable) {
    // FIRST INIT
    itemsTable = $("#itemsTableUI").DataTable({
      pageLength: 10,
      lengthMenu: [10, 15, 20, 25],
      responsive: true,
      columnDefs: [
        { orderable: false, targets: 5 }
      ]
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
}

function closeItemModal() {
  document.getElementById("itemModal").style.display = "none";
  document.body.style.overflow = "";

  clearItemForm();
}

function clearItemForm() {
  document.getElementById("itemName").value = "";
  document.getElementById("itemQty").value = "";
  document.getElementById("itemPrice").value = "";
  editItemId = null;
}

async function saveItem() {
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

  if (editItemId) {
    // UPDATE
    await fetch(`/items/${editItemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, quantity, price })
    });
  } else {
    // ADD
    await fetch("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, quantity, price })
    });
  }

  closeItemModal();
  loadItems();
}


async function modifyItem(id) {
  try {
    const res = await fetch(`/items/${id}`);

    if (!res.ok) {
      throw new Error("Item not found");
    }

    const item = await res.json();

    editItemId = id;

    document.getElementById("modalTitle").textContent = "Modify Item";
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.quantity;
    document.getElementById("itemPrice").value = item.item_price || 0;

    openItemModal();

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

  await fetch(`/items/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  loadItems();
}

loadItems();