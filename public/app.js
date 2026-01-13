let dashboard = document.getElementById('dashboard');
let add_customer = document.getElementById('add_customer');
let appointments = document.getElementById('appointments');
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





let menuItems = [dashboard, add_customer, appointments];

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




// function updateButtonState(activePage) {
//     menuItems.forEach(item => {
//         // Identify which button corresponds to which page
//         let page = item.id === 'dashboard' ? 'dashboard' :
//             item.id === 'add_customer' ? 'add-customer' :
//                 item.id === 'appointments' ? 'appointments' : '';

//         if (page === activePage) {
//             item.disabled = true; // disable current page button
//             item.style.pointerEvents = "none";
//         } else {
//             item.disabled = false; // enable other buttons
//             item.style.pointerEvents = "auto";
//         }
//     });
// }



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

    window.location.href = "/page/" + page;
    // history.pushState({}, "", "/page/" + page);
    // router();
}




window.addEventListener("load", router);
window.addEventListener("popstate", router);

