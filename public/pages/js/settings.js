(function () {

    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainSettings");

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
        settingsLinks.forEach(l => l.classList.remove("active"));
        const link = document.querySelector(`.settings-menu a[data-page="${tab}"]`);
        if (link) {
            link.classList.add("active");
            loadSettingsPage(tab);
        }
    }

    // Click handler for tab links
    settingsLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const page = this.dataset.page;

            // Update URL without reload
            history.pushState({ tab: page }, "", `/:username/page/settings/${page}`);

            activateTab(page);
        });
    });

    // Default tab (if no URL)
    let defaultTab = "modify-account";

    // On first load: check URL
    const segments = location.pathname.split("/");
    if (segments.length >= 4 && segments[3] === "settings") {
        const tab = segments[3];
        defaultTab = tab || defaultTab;
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