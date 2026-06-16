const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const landingForm = document.getElementById("landing-form");
if (landingForm) {
  landingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("landing-url");
    const query = input?.value.trim() ?? "";
    const target = query
      ? `/download/index.html?q=${encodeURIComponent(query)}`
      : "/download/index.html";
    window.location.href = target;
  });
}
