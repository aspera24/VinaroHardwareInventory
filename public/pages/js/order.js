const orderTableBody = document.getElementById("orderTableBody");

const orders = [];


function openOrderModal() {
    document.getElementById("orderModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}


function closeOrderModal() {
    document.getElementById("orderModal").style.display = "none";
    document.body.style.overflow = "auto";
}


const qtyInput = document.getElementById("materialQty");
const priceInput = document.getElementById("materialPrice");
const totalInput = document.getElementById("materialTotal");


function updateTotal() {

    const qty = Number(qtyInput.value) || 0;
    const price = Number(priceInput.value) || 0;

    const total = qty * price;

    totalInput.value = `₱${total.toLocaleString()}`;
}


qtyInput.addEventListener("input", updateTotal);
priceInput.addEventListener("input", updateTotal);


function saveOrder() {

    const material = document.getElementById("materialName").value.trim();
    const category = document.getElementById("materialCategory").value;
    const unit = document.getElementById("materialUnit").value.trim();
    const qty = document.getElementById("materialQty").value;
    const price = document.getElementById("materialPrice").value;
    const supplier = document.getElementById("materialSupplier").value.trim();
    const date = document.getElementById("materialDate").value;
    const status = document.getElementById("materialStatus").value;


    if (!material || !unit || !qty || !price || !supplier || !date) {
        alert("Please fill all fields");
        return;
    }


    const total = Number(qty) * Number(price);


    const order = {
        id: Date.now(),
        material,
        category,
        unit,
        qty,
        price,
        total,
        supplier,
        date,
        status
    };


    orders.unshift(order);

    renderOrders();
    updateSummary();
    updateSupplierFilter();

    clearForm();
    closeOrderModal();
}


function renderOrders(filteredOrders = orders) {

    orderTableBody.innerHTML = "";


    filteredOrders.forEach(order => {

        let statusClass = "";

        if (order.status === "Delivered") {
            statusClass = "delivered";
        }

        if (order.status === "Pending") {
            statusClass = "pending";
        }

        if (order.status === "Cancelled") {
            statusClass = "cancelled";
        }


        orderTableBody.innerHTML += `
        <tr>
            <td>${order.material}</td>
            <td>${order.category}</td>
            <td>${order.unit}</td>
            <td>${order.qty}</td>
            <td>₱${Number(order.price).toLocaleString()}</td>
            <td>₱${Number(order.total).toLocaleString()}</td>
            <td>${order.supplier}</td>
            <td>${formatDate(order.date)}</td>
            <td>
                <span class="status ${statusClass}">
                    ${order.status}
                </span>
            </td>
            <td>
                <button class="actionBtn deleteBtn" onclick="deleteOrder(${order.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
        `;

    });

}


function deleteOrder(id) {

    const index = orders.findIndex(order => order.id === id);

    if (index !== -1) {
        orders.splice(index, 1);
    }

    renderOrders();
    updateSummary();
    updateSupplierFilter();
}


function updateSummary() {

    document.getElementById("totalOrders").textContent = orders.length;


    let totalExpenses = 0;

    orders.forEach(order => {
        totalExpenses += order.total;
    });

    document.getElementById("totalExpenses").textContent =
        `₱${totalExpenses.toLocaleString()}`;


    const uniqueSuppliers = [...new Set(orders.map(order => order.supplier))];

    document.getElementById("totalSuppliers").textContent = uniqueSuppliers.length;


    const lowStocks = orders.filter(order => Number(order.qty) <= 5);

    document.getElementById("lowStocks").textContent = lowStocks.length;
}


function clearForm() {

    document.getElementById("materialName").value = "";
    document.getElementById("materialUnit").value = "";
    document.getElementById("materialQty").value = "";
    document.getElementById("materialPrice").value = "";
    document.getElementById("materialTotal").value = "";
    document.getElementById("materialSupplier").value = "";
    document.getElementById("materialDate").value = "";
}


function formatDate(dateString) {

    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


function updateSupplierFilter() {

    const filter = document.getElementById("supplierFilter");

    const suppliers = [...new Set(orders.map(order => order.supplier))];

    filter.innerHTML = `<option value="all">All Suppliers</option>`;


    suppliers.forEach(supplier => {

        filter.innerHTML += `
        <option value="${supplier}">
            ${supplier}
        </option>
        `;

    });
}


document.getElementById("supplierFilter").addEventListener("change", function () {

    const value = this.value;

    if (value === "all") {
        renderOrders();
        return;
    }


    const filtered = orders.filter(order => order.supplier === value);

    renderOrders(filtered);
});


document.getElementById("searchInput").addEventListener("input", function () {

    const value = this.value.toLowerCase();


    const filtered = orders.filter(order =>
        order.material.toLowerCase().includes(value)
    );

    renderOrders(filtered);
});


orders.push(
    {
        id: 1,
        material: "Portland Cement",
        category: "Cement",
        unit: "bag",
        qty: 20,
        price: 285,
        total: 5700,
        supplier: "Saint John Lumber",
        date: "2026-05-28",
        status: "Delivered"
    },

    {
        id: 2,
        material: "Marine Plywood",
        category: "Wood",
        unit: "sheet",
        qty: 10,
        price: 850,
        total: 8500,
        supplier: "Cebu Lumber",
        date: "2026-05-27",
        status: "Pending"
    }
);


renderOrders();
updateSummary();
updateSupplierFilter();