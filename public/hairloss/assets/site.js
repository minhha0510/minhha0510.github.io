document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const wordmark = document.querySelector(".wordmark");
const navToggle = document.querySelector(".nav-toggle");
const navigation = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

const closeNavigation = () => {
  navToggle?.setAttribute("aria-expanded", "false");
  navigation?.classList.remove("is-open");
};

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navigation?.classList.toggle("is-open", !isOpen);
});

navLinks.forEach((link) => link.addEventListener("click", closeNavigation));
wordmark?.addEventListener("click", closeNavigation);

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = document.querySelectorAll("[data-reveal]");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  revealTargets.forEach((target) => observer.observe(target));
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
