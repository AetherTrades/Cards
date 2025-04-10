// Cards/js/observer.js
import { drawCards } from "./render.js";
import { getCurrentIndex, filteredCards } from "./data.js";

let observerInstance = null; // Keep track of the observer instance

/**
 * Sets up the IntersectionObserver for infinite scrolling.
 */
export function setupObserver() {
  const sentinel = document.getElementById("loadingSentinel");
  const loadingStatus = document.getElementById("loadingStatus");

  if (!sentinel || !loadingStatus) {
    console.warn("⚠️ Loading sentinel or status element not found. Cannot set up observer.");
    return;
  }

  // Disconnect previous observer if it exists
  if (observerInstance) {
    observerInstance.disconnect();
    console.log("🔌 Disconnected previous IntersectionObserver.");
  }

  const options = {
    root: null, // Use the viewport as the root
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% of the sentinel is visible
  };

  observerInstance = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      const currentIdx = getCurrentIndex();
      if (currentIdx < filteredCards.length) {
        loadingStatus.textContent = "Loading more cards...";
        // Use requestAnimationFrame for potentially smoother loading trigger
        requestAnimationFrame(() => {
            drawCards(); // Load the next batch
        });
      } else {
        loadingStatus.textContent = "All cards loaded.";
        observerInstance?.disconnect(); // No more cards to load
        console.log("🏁 All cards loaded, observer disconnected.");
      }
    }
  }, options);

  observerInstance.observe(sentinel);
  console.log("👀 IntersectionObserver set up.");
}