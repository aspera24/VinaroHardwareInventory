async function loadItems() {
  const res = await fetch("/items", { credentials: "include" });
  const items = await res.json();

  const table = document.getElementById("itemsTable");
  table.innerHTML = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>
        <span class="status ${item.status}">
          ${item.status}
        </span>
      </td>
      <td>${item.created_by_name ?? "-"}</td>
      <td>
        <button class="small" onclick="deleteItem(${item.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function addItem() {
  const name = document.getElementById("itemName").value;

  await fetch("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name })
  });

  loadItems();
}

async function deleteItem(id) {
  await fetch(`/items/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  loadItems();
}

loadItems();