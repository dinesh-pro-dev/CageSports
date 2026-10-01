/* Shared behaviour for all pages. */
(function initReviewTicker() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;

  const rails = container.querySelector('.ticker-rails');
  const firstRail = container.querySelector('.ticker-rail');
  const firstTrack = container.querySelector('.ticker-track');
  if (!rails || !firstRail || !firstTrack) return;

  // Respect reduced motion: leave the reviews as the static grid from the markup.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = Array.from(firstTrack.children);
  if (cards.length < 2) return;

  // One rail per column (CSS shows 1 / 2 / 3 of them by breakpoint).
  // Each rail starts on a different review and runs at its own pace.
  const durations = [28, 36, 31];

  function fillTrack(track, offset) {
    track.textContent = '';
    // Two copies of the set so translateY(-50%) loops seamlessly.
    for (let copy = 0; copy < 2; copy++) {
      for (let i = 0; i < cards.length; i++) {
        const card = cards[(i + offset) % cards.length].cloneNode(true);
        if (copy === 1) card.setAttribute('aria-hidden', 'true');
        track.appendChild(card);
      }
    }
  }

  durations.forEach((seconds, index) => {
    let rail = firstRail;
    let track = firstTrack;
    if (index > 0) {
      rail = document.createElement('div');
      rail.className = 'ticker-rail';
      // Extra rails repeat the same reviews, so keep them out of the a11y tree.
      rail.setAttribute('aria-hidden', 'true');
      track = document.createElement('div');
      track.className = 'ticker-track';
      rail.appendChild(track);
      rails.appendChild(rail);
    }
    fillTrack(track, index);
    track.style.setProperty('--ticker-duration', seconds + 's');
  });

  container.classList.add('is-ticking');

  // Hover pauses via CSS; touch needs a hand.
  container.addEventListener('touchstart', () => container.classList.add('is-paused'), { passive: true });
  ['touchend', 'touchcancel'].forEach((type) => {
    container.addEventListener(type, () => container.classList.remove('is-paused'), { passive: true });
  });
})();
