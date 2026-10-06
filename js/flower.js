/* ==========================================================================
   flower.js: plays the footer flower animation only while it's on screen
   (loops while visible, pauses when scrolled away).
   ========================================================================== */

(function () {
  const logos = document.querySelectorAll('.flower-logo');
  if (!logos.length) return;

  if (!('IntersectionObserver' in window)) {
    logos.forEach((el) => el.classList.add('is-playing'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-playing', entry.isIntersecting));
  }, { threshold: 0.3 });

  logos.forEach((el) => io.observe(el));
})();
