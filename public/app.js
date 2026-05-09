if (window.location.pathname.startsWith("/auth")) {
    console.log("Auth page detected, skipping app.js");
} else {
    const appContent = document.getElementById("appContent");
    appContent.innerHTML = "Loading...";

    async function checkSession() {
        try {
            const res = await fetch("/auth/check", {
                credentials: "include"
            });

            if (!res.ok) return false;

            const data = await res.json();
            return data.authenticated; // true or false

        } catch {
            return false;
        }
    }

    // VALID PAGES
    const validPages = ["dashboard", "inventory", "borrow", "reminder", "logs"];

    // SPA ROUTER CORE
    async function loadPage(page, addToHistory = true) {
        // CHECK SESSION FIRST
        const isLoggedIn = await checkSession();

        if (!isLoggedIn && !window.location.pathname.startsWith("/auth")) {
            location.href = "/auth";
            return;
        }

        // VALIDATION
        if (!validPages.includes(page)) {
            appContent.innerHTML = "<h2>404 - Page Not Found</h2>";
            return;
        }

        try {
            const res = await fetch(`/pages/html/${page}.html`);
            const html = await res.text();

            appContent.innerHTML = html;

            loadScript(page);

            if (addToHistory) {
                const username = window.location.pathname.split("/")[1];
                history.pushState({}, "", `/${username}/page/${page}`);
            }

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
        const browserTitle = document.getElementById("browser-title");
        document.querySelectorAll(".sidebar a").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.page === page);
            browserTitle.textContent = "BorrowTrack - " + capitalizeWords(page);
        });
    }

    function capitalizeWords(str) {
        return str
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    document.querySelectorAll(".sidebar a").forEach(link => {
        const page = link.dataset.page;
        const username = window.location.pathname.split("/")[1];

        link.href = `/${username}/page/${page}`;
    });

    const logo = document.getElementById("logoLink");
    if (logo) {
        const username = window.location.pathname.split("/")[1];
        logo.href = `/${username}/page/dashboard`;
    }

    // NAVIGATION (CLICK)
    window.navigate = function (page, btn) {
        loadPage(page, true);
    };

    // BACK / FORWARD SUPPORT
    window.onpopstate = async () => {
        const isLoggedIn = await checkSession();

        if (!isLoggedIn) {
            location.href = "/auth";
            return;
        }

        const path = window.location.pathname.split("/").pop();
        const page = validPages.includes(path) ? path : "";

        loadPage(page, false);
    };

    // INITIAL LOAD (DEEP LINK)
    window.onload = async () => {
        const isLoggedIn = await checkSession();

        if (!isLoggedIn) {
            location.href = "/auth";
            return;
        }

        const path = window.location.pathname.split("/").pop();

        const page = validPages.includes(path) ? path : "";

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

    function logout() {
        if (confirm("Do you want to logout?")) {
            return window.location.href = "/logout";
        }
    }

    // run on load
    window.addEventListener("load", handleSidebarResize);

    // run every resize
    window.addEventListener("resize", handleSidebarResize);

}