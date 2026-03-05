let dashboard = document.getElementById('dashboard');
let add_customer = document.getElementById('add_customer');
let appointments = document.getElementById('appointments');
let settings = document.getElementById('settings');
let browserTitle = document.getElementById('browserTitle');
window.socket = io();

let lastScrollTop = 0;
const mainContent = document.getElementById("main-content");

mainContent.addEventListener("scroll", () => {
    let st = mainContent.scrollTop;

    if (st > lastScrollTop) {
        // scrolling DOWN
        document.body.classList.add("hide-browser-bar");
    } else {
        // scrolling UP
        document.body.classList.remove("hide-browser-bar");
    }

    lastScrollTop = st <= 0 ? 0 : st;
});



const toggleBtn = document.getElementById("nav-toggle");
const container = document.querySelector(".container");

function updateNavByScreen() {
    if (window.innerWidth <= 1200) {
        container.classList.add("nav-hidden");
    } else {
        container.classList.remove("nav-hidden");
    }

    updateToggleIcon();
}

function updateToggleIcon() {
    toggleBtn.innerHTML = container.classList.contains("nav-hidden")
        ? '<i class="fa-solid fa-chevron-right"></i>'
        : '<i class="fa-solid fa-chevron-left"></i>';
}

// Initial check
updateNavByScreen();

// On resize
window.addEventListener("resize", updateNavByScreen);

// Toggle click
toggleBtn.addEventListener("click", () => {
    container.classList.toggle("nav-hidden");
    updateToggleIcon();
});





let menuItems = [dashboard, add_customer, appointments, settings];

function setActive(page) {
    // Remove highlight from all
    menuItems.forEach(item => {
        item.style.background = "transparent";
    });

    const appName = "Customer Service";
    var pageName = page.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-");

    // Apply highlight to selected page
    if (page === 'dashboard') {
        dashboard.style.background = "#485161";
        browserTitle.textContent = `${appName} - ${pageName}`;
    } else if (page === 'add-customer') {
        add_customer.style.background = "#485161";
        browserTitle.textContent = `${appName} - ${pageName}`;
    } else if (page === 'appointments') {
        appointments.style.background = "#485161";
        browserTitle.textContent = `${appName} - ${pageName}`;
    } else if (page === 'settings') {
        settings.style.background = "#485161";
        browserTitle.textContent = `${appName} - ${pageName}`;
    }
}

function loadPage(page) {
    // Update button states
    // updateButtonState(page);

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

let validRoutes = ["dashboard", "add-customer", "appointments", "profile", "settings", "update"];

function router() {

    if (location.hash) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Hashes are not allowed.</p>
        `;
        return;
    }

    let fullPath = location.pathname.replace("/page/", "");
    let segments = fullPath.split("/");
    let path = segments.pop();

    if (!path) path = "dashboard";

    if (!validRoutes.includes(path)) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Invalid route.</p>
        `;
        return;
    }
    loadPage(path);

    // highlight only main menu
    if (path === "profile" || path === "update") {
        setActive("appointments");
    } else {
        setActive(path);
    }
}





function navigate(page) {
    if (!validRoutes.includes(page)) {
        alert("Invalid route!");
        return;
    }

    window.location.href = "/page/" + page;
}




window.addEventListener("load", router);
window.addEventListener("popstate", router);

