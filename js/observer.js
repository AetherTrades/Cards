// js/observer.js
import { drawCards } from "./render.js";
import { getCurrentIndex, filteredCards } from "./data.js";

export function setupObserver() {
  const sentinel = document.getElementById("loadingSentinel");

  if (!sentinel) {
    console.warn("⚠️ No loading sentinel found.");
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      const current = getCurrentIndex();
      if (current < filteredCards.length) {
        drawCards();
      }
    }
  });

  observer.observe(sentinel);
}
