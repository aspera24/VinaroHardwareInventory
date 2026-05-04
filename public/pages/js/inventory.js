async function loadItems() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();
  const admin = localStorage.getItem("fullName");

  const table = document.getElementById("itemsTable");
  table.innerHTML = items.map(item => `
  <tr>
    <td>${item.name}</td>
    <td>${item.quantity}</td>
    <td>${item.available}</td>
    <td>${item.created_by_name == admin ? "You" : item.created_by_name}</td>
    <td>
      <button class="small" onclick="deleteItem(${item.id})">Delete</button>
    </td>
  </tr>
`).join("");
}

async function addItem() {
  const nameInput = document.getElementById("itemName");
  const qtyInput = document.getElementById("itemQty");

  const name = nameInput.value.trim();
  const quantity = parseInt(qtyInput.value);

  // reset styles
  nameInput.style.border = "";
  qtyInput.style.border = "";

  nameInput.addEventListener("input", () => {
    nameInput.style.border = "";
  });

  qtyInput.addEventListener("input", () => {
    qtyInput.style.border = "";
  });

  if (!name) {
    nameInput.style.border = "2px solid red";
    return;
  }

  if (!quantity || quantity <= 0) {
    qtyInput.style.border = "2px solid red";
    return;
  }

  await fetch("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, quantity })
  });

  loadItems();

  nameInput.value = "";
  qtyInput.value = "";
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addItem();
  }
});

async function deleteItem(id) {
  await fetch(`/items/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  loadItems();
}

loadItems();