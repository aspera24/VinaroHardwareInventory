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
  const input = document.getElementById("itemName");
  const name = input.value.trim();

  // CHECK IF EMPTY BEFORE REQUEST
  if (!name) {
    document.getElementById("itemName").style.border = "2px solid red";
    return;
  }

  await fetch("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name })
  });

  loadItems();

  // clear input
  input.value = "";
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