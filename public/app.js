let dashboard = document.getElementById('dashboard');
let add_customer = document.getElementById('add_customer');
let appointments = document.getElementById('appointments');
let settings = document.getElementById('settings');
let browserTitle = document.getElementById('browserTitle');
let webName = document.getElementById('webName');
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
    if (window.innerWidth <= 1900) {
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





let menuItems = [webName, dashboard, add_customer, appointments, settings];

function setActive(page) {
    // Remove highlight from all
    menuItems.forEach(item => {
        item.style.background = "transparent";
    });

    const appName = "Customer Service";
    var pageName = page.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-");

    // Apply highlight to selected page
    if (page === 'dashboard' || page === 'webName') {
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

let validRoutes = ["webName", "dashboard", "add-customer", "appointments", "profile", "settings", "update"];

function router() {
    // Get the current path after "/page/"
    const fullPath = location.pathname.replace("/page/", "");
    const segments = fullPath.split("/");
    const mainRoute = segments[0]; // first part of path

    // --- SETTINGS ROUTE ---
    if (mainRoute === "settings") {
        loadPage("settings");       // Load settings.html into #main-content
        setActive("settings");      // Highlight main menu

        // Get tab from URL or default to "modify-account"
        const tab = segments[1] || "modify-account";

        // Wait a bit for settings.js to initialize, then open tab
        setTimeout(() => {
            const link = document.querySelector(`.settings-menu a[data-page="${tab}"]`);
            if (link) link.click();
        }, 50);

        return;
    }

    // --- OTHER ROUTES ---
    let page = mainRoute || "dashboard";

    // handle nested routes
    if (mainRoute === "appointments" && segments[1] === "update") {
        page = "update";
    }

    if (mainRoute === "appointments" && segments[1] === "profile") {
        page = "profile";
    }

    // If route is invalid, show error
    if (!validRoutes.includes(page)) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Invalid route.</p>
        `;
        return;
    }

    // Load the page
    loadPage(page);

    // Highlight menu
    if (page === "profile" || page === "update") {
        setActive("appointments");
    } else {
        setActive(page);
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


// --- Daily Verse ---
fetch('https://beta.ourmanna.com/api/v1/get?format=json&order=daily')
    .then(res => res.json())
    .then(data => {
        document.getElementById('g-title').innerText = data.verse.details.reference;
        document.getElementById('g-content').innerText = data.verse.details.text;
    })
    .catch(err => {
        console.error(err);
        document.getElementById('g-content').innerText = 'Failed to load verse.';
    });
