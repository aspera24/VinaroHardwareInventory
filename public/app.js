let dashboard = document.getElementById('dashboard');
let add_customer = document.getElementById('add_customer');
let appointments = document.getElementById('appointments');


let menuItems = [dashboard, add_customer, appointments];

function setActive(page) {
    // Remove highlight from all
    menuItems.forEach(item => {
        item.style.background = "transparent";
    });

    // Apply highlight to selected page
    if (page === 'dashboard') dashboard.style.background = "#485161";
    if (page === 'add-customer') add_customer.style.background = "#485161";
    if (page === 'appointments') appointments.style.background = "#485161";
}

function loadPage(page) {
    fetch(`/pages/html/${page}.html`)
        .then(res => res.text())
        .then(html => {

            let main = document.getElementById("main-content");
            main.innerHTML = html;

            // Remove old script
            let old = document.getElementById('page-script');
            if (old) old.remove();

            // Load new page script
            let script = document.createElement("script");
            script.src = `/pages/js/${page}.js`;
            script.id = "page-script";
            document.body.appendChild(script);
        });

    setActive(page);
}






let validRoutes = ["dashboard", "add-customer", "appointments"];

function router() {
    if (location.hash) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Hashes are not allowed. Use /page/dashboard, /page/add-customer, or /page/appointments.</p>
        `;
        menuItems.forEach(item => item.style.background = "transparent");
        return;
    }

    // Getting path after /page/
    let path = location.pathname.replace("/page/", "");

    if (path === "" || path === "/") path = "dashboard"; // default page

    // Check if path is valid
    if (!validRoutes.includes(path)) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Invalid route. Please use /page/dashboard, /page/add-customer, or /page/appointments.</p>
        `;
        menuItems.forEach(item => item.style.background = "transparent");
        return;
    }

    // Load page if valid
    loadPage(path);
    setActive(path);
}




function navigate(page) {
    if (!validRoutes.includes(page)) {
        alert("Invalid route!");
        return;
    }
    history.pushState({}, "", "/page/" + page);
    router();
}




window.addEventListener("load", router);
window.addEventListener("popstate", router);

