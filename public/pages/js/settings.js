(function (){
    const loading = document.getElementById("loading");
    const main = document.querySelector(".mainSettings");
    main.style.display = "none"; // hide mainSettings while loading

    loading.style.display = "none";
    main.style.display = "block";
})();