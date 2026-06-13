if (window.location.pathname.startsWith("/auth")) {
    console.log("Auth page detected, skipping app.js");
} else {
    document.getElementById("adminName").addEventListener("click", () => {
        openAccountModal();
    });

    async function openAccountModal() {

        document.getElementById("accountModal").classList.add("show");

        try {

            const id = localStorage.getItem("id");

            const res = await fetch(`/admin/${id}`);
            const data = await res.json();

            document.getElementById("accountFullName").value = data.fullName;
            document.getElementById("accountUsername").value = data.username;
            document.getElementById("accountPassword").value = "";

        } catch (err) {
            console.error(err);
            alert("Failed to load account");
        }

    }

    function closeAccountModal() {
        document.getElementById("accountModal").classList.remove("show");
    }

    window.saveAccountSettings = async function () {

        const id = localStorage.getItem("id");

        const full_name =
            document.getElementById("accountFullName").value.trim();

        const username =
            document.getElementById("accountUsername").value.trim();

        const password =
            document.getElementById("accountPassword").value.trim();

        try {

            const res = await fetch(`/admin/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name,
                    username,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            localStorage.setItem("fullName", full_name);

            document.getElementById("adminName").textContent =
                "Hi, " + full_name.split(" ")[0] + "!";

            alert("Account updated");

            closeAccountModal();

        } catch (err) {

            console.error(err);
            alert(err.message);

        }

    }



    const loader = document.getElementById("topLoader");

    let loaderInterval;
    let pageLoading = false;

    function startLoading() {

        clearInterval(loaderInterval);

        loader.style.opacity = "1";
        loader.style.width = "0%";

        let width = 0;

        loaderInterval = setInterval(() => {
            
            if (width < 90) {

                // dynamic speed
                if (width < 30) {
                    width += 10;
                } else if (width < 60) {
                    width += 4;
                } else {
                    width += 1;
                }

                loader.style.width = width + "%";
            }

        }, 200);
    }

    function finishLoading() {

        clearInterval(loaderInterval);

        loader.style.width = "100%";

        requestAnimationFrame(() => {

            loader.style.opacity = "0";

            setTimeout(() => {
                loader.style.width = "0%";
            }, 150);

        });
    }


    const originalFetch = window.fetch;

    window.fetch = async (...args) => {

        startLoading();

        try {

            const response = await originalFetch(...args);

            return response;

        } catch (err) {

            throw err;

        }
    };


    const appContent = document.getElementById("appContent");
    appContent.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i> Loading...
    `;

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

    const adminName = document.getElementById("adminName");
    adminName.textContent = "Hi, " + localStorage.getItem("fullName").split(" ")[0] + "!";

    // VALID PAGES
    const validPages = ["dashboard", "inventory", "borrow", "reminder", "order", "logs"];

    // SPA ROUTER CORE
    async function loadPage(page, addToHistory = true) {

        pageLoading = true;

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

            await loadScript(page);

            pageLoading = false;

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

        return new Promise((resolve, reject) => {

            const oldScript = document.getElementById("pageScript");

            if (oldScript) oldScript.remove();

            const script = document.createElement("script");

            script.src = `/pages/js/${page}.js`;
            script.id = "pageScript";

            script.onload = () => {
                resolve();
            };

            script.onerror = () => {
                reject("Failed to load JS");
            };

            document.body.appendChild(script);

        });
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

    window.startLoading = startLoading;
    window.finishLoading = finishLoading;

}