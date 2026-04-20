document.addEventListener("DOMContentLoaded", () => {
    const burgerBtn = document.getElementById("burgerBtn");
    const navMenu = document.getElementById("navMenu");

    if (burgerBtn && navMenu) {
        burgerBtn.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    // Close menu when a link is clicked
    document.querySelectorAll(".nav-menu a").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
        });
    });
});