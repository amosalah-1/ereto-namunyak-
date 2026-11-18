/**
 * Ereto Namunyak CBO - GSAP Animations & ScrollTrigger Integrations
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger if available
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // 1. Hero Content Smooth Entrance
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
  
  if (document.querySelector('.hero-badge')) {
    heroTl.from('.hero-badge', { y: -20, opacity: 0, duration: 0.6 })
          .from('.hero-title', { y: 30, opacity: 0, duration: 0.8 }, '-=0.3')
          .from('.hero-desc', { y: 20, opacity: 0, duration: 0.7 }, '-=0.4')
          .from('.hero-actions', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
          .from('.hero-impact-pill', { scale: 0.9, opacity: 0, duration: 0.5 }, '-=0.3');
  }

  // 2. Animated Numerical Counters (35,000+, 480+, 350+, etc.)
  function initCounters() {
    const statElements = document.querySelectorAll('.stat-number');
    statElements.forEach(el => {
      const rawText = el.getAttribute('data-target') || el.innerText;
      const numMatch = rawText.match(/\d+/g);
      if (!numMatch) return;

      const targetValue = parseInt(numMatch.join(''), 10);
      const suffix = rawText.replace(/[0-9,]/g, '');

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.fromTo(el, 
              { innerText: 0 },
              {
                innerText: targetValue,
                duration: 2.2,
                ease: 'power2.out',
                snap: { innerText: 1 },
                onUpdate: function() {
                  el.innerText = Math.floor(el.innerText).toLocaleString() + suffix;
                }
              }
            );
          }
        });
      }
    });
  }
  initCounters();

  // Expose re-init for dynamic content
  window.initGsapCounters = initCounters;

  // 3. Staggered Scroll Triggers for Elements
  if (typeof ScrollTrigger !== 'undefined') {
    // Project Cards
    gsap.utils.toArray('.project-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 40,
        opacity: 0,
        duration: 0.7,
        delay: (i % 3) * 0.15,
        ease: 'power2.out'
      });
    });

    // Pillar Cards
    gsap.utils.toArray('.pillar-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 35,
        opacity: 0,
        duration: 0.6,
        delay: (i % 3) * 0.12,
        ease: 'power2.out'
      });
    });

    // Team Cards
    gsap.utils.toArray('.team-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: 40,
        opacity: 0,
        duration: 0.6,
        delay: (i % 4) * 0.1,
        ease: 'power2.out'
      });
    });
  }
});
