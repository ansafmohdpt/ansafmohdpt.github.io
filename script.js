// ============================================================
// PORTFOLIO — Scroll-driven stacking card animations
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    const cards = document.querySelectorAll('.card');
    const navDots = document.querySelectorAll('.nav-dot');
    const scrollHint = document.getElementById('scrollHint');
    const skillFills = document.querySelectorAll('.skill-fill');
    let skillsAnimated = false;

    // ---------- REVEAL ON SCROLL (IntersectionObserver) ----------
    const revealElements = document.querySelectorAll('.about-grid, .skills-grid, .timeline, .certs-grid, .education-grid, .volunteer-grid, .contact-links, .about-stats, .section-header');

    revealElements.forEach(el => {
        el.classList.add('reveal');
    });

    // Also add stagger to grid containers
    const staggerContainers = document.querySelectorAll('.certs-grid, .about-stats, .skills-grid, .volunteer-grid, .hero-socials');
    staggerContainers.forEach(el => {
        el.classList.add('reveal-stagger');
        el.classList.remove('reveal');
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        revealObserver.observe(el);
    });

    // ---------- SKILL BARS ANIMATION ----------
    const skillsSection = document.getElementById('skills');
    const skillsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !skillsAnimated) {
                skillsAnimated = true;
                skillFills.forEach((fill, i) => {
                    setTimeout(() => {
                        fill.classList.add('animate');
                    }, i * 80);
                });
            }
        });
    }, {
        threshold: 0.3
    });

    if (skillsSection) {
        skillsObserver.observe(skillsSection);
    }

    // ---------- ACTIVE NAV DOT TRACKING ----------
    const sectionIds = ['home', 'about', 'skills', 'experience', 'certifications', 'education', 'contact'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    function updateActiveNav() {
        const scrollY = window.scrollY + window.innerHeight / 2;

        let currentIndex = 0;

        sections.forEach((section, index) => {
            if (scrollY >= section.offsetTop) {
                currentIndex = index;
            }
        });

        navDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    // ---------- SCROLL HINT FADE ----------
    function handleScrollHint() {
        if (window.scrollY > 100) {
            scrollHint.classList.add('hidden');
        } else {
            scrollHint.classList.remove('hidden');
        }
    }

    // ---------- CARD SHADOW SEPARATOR ----------
    // As cards stack, add a subtle top shadow to create depth
    function updateCardDepth() {
        const scrollTop = window.scrollY;

        cards.forEach((card, index) => {
            const cardTop = card.offsetTop;
            const cardHeight = card.offsetHeight;
            const distancePastTop = scrollTop - cardTop;

            // Card is being overlapped by the next one
            if (distancePastTop > 0 && distancePastTop < cardHeight) {
                const progress = Math.min(distancePastTop / (cardHeight * 0.5), 1);
                // Scale down slightly and dim the card as it gets buried
                card.style.transform = `scale(${1 - progress * 0.03})`;
                card.style.filter = `brightness(${1 - progress * 0.25})`;
            } else if (distancePastTop <= 0) {
                card.style.transform = 'scale(1)';
                card.style.filter = 'brightness(1)';
            }
        });
    }

    // ---------- THROTTLED SCROLL HANDLER ----------
    let ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveNav();
                handleScrollHint();
                updateCardDepth();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial calls
    updateActiveNav();
    handleScrollHint();

    // ---------- SMOOTH SCROLL FOR NAV DOTS ----------
    navDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = dot.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                // With sticky positioning, we need to scroll to the element's
                // actual DOM offset, not its visual position
                const targetTop = target.offsetTop;
                window.scrollTo({
                    top: targetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

});
