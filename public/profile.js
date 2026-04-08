(function () {

    function getAdminPath() {
        const parts = location.pathname.split("/");
        return parts[1];
    }


    const admin = getAdminPath();
    let subPage = localStorage.getItem("subPage");

    document.addEventListener("DOMContentLoaded", () => {

        document.getElementById("backBtn")
            .addEventListener("click", () => {
                window.location.href = `/${admin}/page/${subPage}`;
                localStorage.removeItem("subPage");
            });

    });
})();
