(function () {
    const loading = document.getElementById("loading");

    loading.style.display = "flex";

    setInterval(loading.style.display = "none", 12000);

})();