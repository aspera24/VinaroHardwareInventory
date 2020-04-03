const appContent = document.getElementById("appContent");
appContent.innerHTML = "Loading...";

// VALID PAGES
const validPages = ["dashboard", "inventory", "borrow", "logs"];

// SPA ROUTER CORE
async function loadPage(page, addToHistory = true) {
    try {
        const res = await fetch(`/pages/html/${page}.html`);
        const html = await res.text();

        appContent.innerHTML = html;

        // load JS of page
        loadScript(page);

        // update URL without reload
        if (addToHistory) {
            const username = window.location.pathname.split("/")[1];
            history.pushState({}, "", `/${username}/page/${page}`);
        }

        // highlight active button
        setActiveByPage(page);

    } catch (err) {
        appContent.innerHTML = "<h2>404 - Page Not Found</h2>";
    }
}

// LOAD PAGE JS FILES
function loadScript(page) {
    const oldScript = document.getElementById("pageScript");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = `/pages/js/${page}.js`;
    script.id = "pageScript";

    script.onerror = () => {
        console.error("Failed to load JS for:", page);
    };

    document.body.appendChild(script);
}

// SIDEBAR ACTIVE STATE
function setActiveByPage(page) {
    document.querySelectorAll(".sidebar button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === page);
    });
}

// NAVIGATION (CLICK)
window.navigate = function (page, btn) {
    loadPage(page, true);
};

// BACK / FORWARD SUPPORT
window.onpopstate = () => {
    const path = window.location.pathname.split("/").pop();

    const page = validPages.includes(path) ? path : "dashboard";
    loadPage(page, false);
};

// INITIAL LOAD (DEEP LINK)
window.onload = () => {
    const path = window.location.pathname.split("/").pop();

    const page = validPages.includes(path) ? path : "dashboard";

    loadPage(page, false);
};

/* =========================
   GLOBAL HELPERS
========================= */
window.API = "";

window.formatDate = function (date) {
    return new Date(date).toLocaleString();
};


const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const menu = document.querySelector(".menuBtn");

function handleSidebarResize() {
    if (window.innerWidth <= 1040) {
        sidebar.classList.add("hide"); // auto hide
        content.classList.add("slide");
        menu.classList.remove("hide");
    } else {
        sidebar.classList.remove("hide"); // auto show
        content.classList.remove("slide");
        menu.classList.add("hide");
    }
}

function toggleSidebar() {
    sidebar.classList.toggle("hide");
    content.classList.toggle("slide");
}

// run on load
window.addEventListener("load", handleSidebarResize);

// run every resize
window.addEventListener("resize", handleSidebarResize);