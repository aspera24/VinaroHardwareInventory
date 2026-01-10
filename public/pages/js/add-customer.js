(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".main");
    main.style.display = "none"; // hide main while loading

    // show loading initially
    loading.style.display = "flex";
    

    // hide loading after 2 seconds (or whatever delay)
    setTimeout(() => {
        loading.style.display = "none";
        main.style.display = "block"; // show main
    }, 2000); // 2000ms = 2 seconds
})();
