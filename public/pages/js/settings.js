(function () {

    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainSettings");

    const adminPath = getAdminPath();

    if (!main) return;

    const settingsLinks = document.querySelectorAll(".settings-menu a");
    const settingsContent = document.getElementById("settingsContent");

    main.style.display = "none";

    function loadSettingsPage(page) {

        fetch(`/pages/settings/${page}.html`)
            .then(res => res.text())
            .then(html => {
                if (settingsContent) {
                    settingsContent.innerHTML = html;
                }
            })
            .catch(() => {
                if (settingsContent) {
                    settingsContent.innerHTML = "<p>Failed to load page</p>";
                }
            });
    }

    function activateTab(tab) {
        // remove active class
        settingsLinks.forEach(l => l.classList.remove("active"));

        // target current link
        const activeLink = document.querySelector(`.settings-menu a[data-page="${tab}"]`);

        if (activeLink) {
            activeLink.classList.add("active");
            loadSettingsPage(tab);
        }

        // reset all backgrounds
        settingsLinks.forEach(link => {
            link.style.background = "#485161";
            link.style.color = "white";
        });

        // highlight selected
        if (activeLink) {
            activeLink.style.background = "white";
            activeLink.style.color = "#485161";
        }
    }

    // Click handler for tab links
    settingsLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            // e.preventDefault();
            const page = this.dataset.page;

            // Update URL without reload
            history.pushState({ tab: page }, "", `/${adminPath}/page/settings/${page}`);

            activateTab(page);
        });
    });

    // Default tab (if no URL)
    let defaultTab = "modify-account";

    // On first load: check URL
    const segments = location.pathname.split("/");
    if (segments.length >= 5 && segments[3] === "settings") {
        const tab = segments[4];
        defaultTab = tab || defaultTab;
    }

    const username = segments[1];

    if (segments.length < 5) {
        const newUrl = `/${username}/page/settings/${defaultTab}`;

        history.replaceState({ tab: defaultTab }, "", newUrl);
    }

    activateTab(defaultTab);

    // Show main content
    if (loading) loading.style.display = "none";
    main.style.display = "block";

    // Handle back/forward buttons
    window.addEventListener("popstate", (event) => {
        const tab = (event.state && event.state.tab) || defaultTab;
        activateTab(tab);
    });

})();