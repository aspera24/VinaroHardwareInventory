let dashboard = document.getElementById('dashboard');
let add_customer = document.getElementById('add_customer');
let appointments = document.getElementById('appointments');
let settings = document.getElementById('settings');
let browserTitle = document.getElementById('browserTitle');
let webName = document.getElementById('webName');
window.socket = io();

function getAdminPath() {
    const parts = location.pathname.split("/");
    // example: ["", "admin-rodel", "page", "dashboard"]
    return parts[1];
}

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

    var pageName = page.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("-");
    const linearBg = "linear-gradient(45deg, #485161 50%, #6f7989 50%)";

    // Apply highlight to selected page
    if (page === 'dashboard' || page === 'webName') {
        dashboard.style.background = linearBg;
        browserTitle.textContent = `${pageName}`;
    } else if (page === 'add-customer') {
        add_customer.style.background = linearBg;
        browserTitle.textContent = `${pageName}`;
    } else if (page === 'appointments') {
        appointments.style.background = linearBg;
        browserTitle.textContent = `${pageName}`;
    } else if (page === 'settings') {
        settings.style.background = linearBg;
        browserTitle.textContent = `${pageName}`;
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
    const parts = location.pathname.split("/");
    const pageIndex = parts.indexOf("page");
    const mainRoute = pageIndex !== -1 ? parts[pageIndex + 1] : "dashboard";
    const segments = parts.slice(pageIndex + 1);

    // --- SETTINGS ROUTE ---
    if (mainRoute === "settings") {
        loadPage("settings");
        setActive("settings");

        const tab = segments[1] || "modify-account";

        setTimeout(() => {
            updateSettingsLinks(); // update URLs for tabs
            const link = document.querySelector(`.settings-menu a[data-page="${tab}"]`);
            if (link) link.click();
        }, 50);

        return;
    }

    // --- APPOINTMENTS UPDATE / PROFILE ROUTES ---
    let page = mainRoute;

    if (mainRoute === "appointments") {
        if (segments[1] === "update") {
            page = "update";
            // Optional: handle query params
            const searchParams = new URLSearchParams(window.location.search);
            const id = searchParams.get("id");
            // now you can pass `id` to your update page JS
            setTimeout(() => {
                if (window.loadUpdatePage) window.loadUpdatePage(id);
            }, 50);
        }

        if (segments[1] === "profile") {
            page = "profile";
        }
    }

    if (!validRoutes.includes(page)) {
        document.getElementById("main-content").innerHTML = `
            <h2 style="color:red;">400 Bad Request</h2>
            <p>Invalid route.</p>
        `;
        return;
    }

    loadPage(page);

    if (page === "profile" || page === "update") {
        setActive("appointments");
    } else {
        setActive(page);
    }
}

function updateMenuLinks() {

    const admin = getAdminPath();

    dashboard.href = `/${admin}/page/dashboard`;
    add_customer.href = `/${admin}/page/add-customer`;
    appointments.href = `/${admin}/page/appointments`;
    settings.href = `/${admin}/page/settings`;

}

updateMenuLinks();


function updateSettingsLinks() {
    const admin = getAdminPath();

    const links = document.querySelectorAll(".settings-menu a");

    links.forEach(link => {

        const page = link.dataset.page;

        link.href = `/${admin}/page/settings/${page}`;

        link.addEventListener("click", e => {
            e.preventDefault();

            history.pushState({}, "", `/${admin}/page/settings/${page}`);

            activateSettingsTab(page);
        });

    });
}


function navigate(page) {

    if (!validRoutes.includes(page)) {
        alert("Invalid route!");
        return;
    }

    const adminPath = getAdminPath();

    window.location.href = `/${adminPath}/page/${page}`;
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

    