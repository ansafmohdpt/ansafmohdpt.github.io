// ============================================================
// PORTFOLIO — Stacking-card scroll engine
//
// BEHAVIOUR:
//  1. Each card is position:sticky top:0, clipped to viewport.
//  2. If a card's content is taller than the viewport, scrolling
//     translates card-inner upward to reveal overflow content.
//  3. AFTER all content is revealed, the card stays stuck for
//     one more viewport-height of scroll — during this phase
//     the NEXT card (higher z-index) slides in from the bottom
//     and covers the current card.
//  4. Nav dot clicks jump to wrapper top so the card snaps to
//     the top of the screen.
//
// Wrapper height formula:
//   vh + overflowH + vh   (last card: vh + overflowH)
//       ↑ content     ↑ transition period
// ============================================================

// Disable automatic browser scroll restoration so page always loads at top
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ── Resume download (keeps file path off the status bar) ──────────────
function triggerResumeDownload(e) {
    e.preventDefault();
    const a = document.createElement('a');
    a.href = 'assets/updated%20resume/Ansaf_Muhammed_PT_Java_Resume.pdf';
    a.download = 'Ansaf_Muhammed_PT_Java_Resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
document.querySelectorAll('.btn-download-resume, .floating-resume-btn')
    .forEach(el => el.addEventListener('click', triggerResumeDownload));

document.addEventListener('DOMContentLoaded', () => {

    const wrappers = Array.from(document.querySelectorAll('.card-wrapper'));
    const navDots = Array.from(document.querySelectorAll('.nav-dot'));
    const scrollHint = document.getElementById('scrollHint');
    const heroCta = document.querySelector('.hero-cta');
    const floatingResumeBtn = document.getElementById('floatingResumeBtn');

    let metrics = [];   // cached per-wrapper layout info

    // ── Helpers ───────────────────────────────────────────────────
    function getDocumentTop(el) {
        let top = 0;
        let cur = el;
        while (cur && cur !== document.documentElement) {
            top += cur.offsetTop;
            cur = cur.offsetParent;
        }
        return top;
    }

    // ── Layout — measure & size wrappers ──────────────────────────
    function layout() {
        const vh = window.innerHeight;

        // Pass 1: reset transforms, measure content, set wrapper heights and negative margins
        wrappers.forEach((wrapper, i) => {
            const inner = wrapper.querySelector('.card-inner');
            inner.style.transform = '';

            const contentH = inner.scrollHeight;
            const overflowH = Math.max(0, contentH - vh);
            const isLast = (i === wrappers.length - 1);

            // vh           → card fills the viewport
            // overflowH    → scroll space to reveal overflow content
            // vh (non-last) → transition: card stays stuck while next slides in
            const wrapperH = vh + overflowH + (isLast ? 0 : vh);
            wrapper.style.height = wrapperH + 'px';

            // To make the next card overlap the transition space instead of pushing the current card up,
            // we pull every card up by 1 vh (except the first one).
            if (i > 0) {
                wrapper.style.marginTop = `-${vh}px`;
            }
        });

        // Pass 2: cache absolute tops (heights affect subsequent offsets)
        metrics = wrappers.map((wrapper, i) => {
            const inner = wrapper.querySelector('.card-inner');
            const contentH = inner.scrollHeight;
            const vh2 = window.innerHeight;
            const overflowH = Math.max(0, contentH - vh2);
            const isLast = (i === wrappers.length - 1);

            return {
                wrapperTop: getDocumentTop(wrapper),
                contentH,
                overflowH,
                isLast,
            };
        });
    }

    layout();

    // Re-measure after fonts & full page load (affects text heights)
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { layout(); onScrollUpdate(); });
    }
    window.addEventListener('load', () => { layout(); onScrollUpdate(); });
    window.addEventListener('resize', () => { layout(); onScrollUpdate(); });

    // ── Stat Counter Animation ─────────────────────────────────────
    function animateCounters(counter) {
        if (counter.dataset.animated) return;
        counter.dataset.animated = "true";

        const target = +counter.getAttribute('data-target');
        const suffix = counter.getAttribute('data-suffix') || '';
        const duration = 1000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentCount = Math.floor(progress * target);

            counter.innerText = currentCount + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.innerText = target + suffix;
            }
        }
        requestAnimationFrame(update);
    }

    // ── Reveal animations ─────────────────────────────────────────
    document.querySelectorAll(
        '.about-grid, .timeline, .education-grid, .volunteer-section, ' +
        '.contact-links, .section-header, .projects-grid, .achievements-list, .stat-card'
    ).forEach(el => el.classList.add('reveal'));

    document.querySelectorAll(
        '.certs-grid, .skills-grid, .volunteer-grid, .hero-socials'
    ).forEach(el => {
        el.classList.add('reveal-stagger');
        el.classList.remove('reveal');
    });

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('stat-card')) {
                    const counter = entry.target.querySelector('.stat-number');
                    if (counter) animateCounters(counter);
                }
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
        revealObserver.observe(el);
    });

    // ── Main scroll handler ───────────────────────────────────────
    function onScrollUpdate() {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;
        let activeIndex = 0;

        wrappers.forEach((wrapper, i) => {
            const m = metrics[i];
            const inner = wrapper.querySelector('.card-inner');
            const card = wrapper.querySelector('.card');

            // How far we've scrolled past this wrapper's top
            const scrolledIn = scrollY - m.wrapperTop;

            // Light up the nav dot as soon as the card is 40% into the viewport,
            // which also fixes fractional-pixel rounding errors on click-to-scroll.
            if (scrolledIn > -vh * 0.4) {
                activeIndex = i;
            }

            if (scrolledIn >= 0) {

                // Phase 1: Inner-scroll — translate content up to reveal overflow
                const translateY = Math.min(scrolledIn, m.overflowH);
                inner.style.transform = `translateY(-${translateY}px)`;

                // Phase 2: Transition — content fully revealed, next card slides in
                const postOverflow = scrolledIn - m.overflowH;
                if (postOverflow > 0) {
                    const progress = Math.min(postOverflow / vh, 1);
                    // Dim + slightly scale down for depth effect
                    card.style.filter = `brightness(${1 - progress * 0.45})`;
                    card.style.transform = `scale(${1 - progress * 0.03})`;
                } else {
                    card.style.filter = '';
                    card.style.transform = '';
                }
            } else {
                // Card not yet reached — clean state
                inner.style.transform = '';
                card.style.filter = '';
                card.style.transform = '';
            }
        });

        // Active nav dot
        navDots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));

        // Scroll hint fade
        if (scrollHint) {
            scrollHint.classList.toggle('hidden', scrollY > 60);
        }

        // ── Reveal animations inside overflowing cards ─────────────
        // IntersectionObserver tracks layout positions, not CSS transforms.
        // When card-inner scrolls via translateY, elements below the fold
        // become visually visible but the observer never fires for them.
        // Fix: once a card starts its inner-scroll phase, mark all its
        // unrevealed elements as visible so stagger animations play.
        wrappers.forEach((wrapper, i) => {
            if ((scrollY - metrics[i].wrapperTop) > 0) {
                wrapper.querySelectorAll('.reveal:not(.visible), .reveal-stagger:not(.visible)')
                    .forEach(el => {
                        el.classList.add('visible');
                        if (el.classList.contains('stat-card')) {
                            const counter = el.querySelector('.stat-number');
                            if (counter) animateCounters(counter);
                        }
                    });
            }
        });

        // ── Resume button: hero ↔ floating transition ──────────────
        // Home card (index 0) has no overflow, so transition phase
        // begins immediately: progress = scrolledIn / vh (0 → 1).
        // Update floating resume button visibility and expanded state
        if (heroCta && floatingResumeBtn && metrics[0]) {
            const homeScrolledIn = scrollY - metrics[0].wrapperTop;
            const progress = Math.max(0, Math.min(1, homeScrolledIn / window.innerHeight));

            // Hero button: visible at home, fades out 10%→50% of transition
            const heroOpacity = Math.max(0, Math.min(1, 1 - (progress - 0.1) / 0.4));
            heroCta.style.opacity = heroOpacity.toFixed(3);

            // Floating button: fades in 35%→75% of transition
            const floatOpacity = Math.max(0, Math.min(1, (progress - 0.35) / 0.4));
            floatingResumeBtn.style.opacity = floatOpacity.toFixed(3);
            floatingResumeBtn.style.pointerEvents = floatOpacity > 0.01 ? 'auto' : 'none';

            // Expand resume button on the last card (Contact)
            const isContactActive = (activeIndex === wrappers.length - 1);
            floatingResumeBtn.classList.toggle('expanded', isContactActive);
        }

    }

    // ── Contact Modal Logic ─────────────────────────────────────────
    const modalOverlay = document.getElementById('contactModalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');
    const modalPrimaryBtn = document.getElementById('modalPrimaryBtn');
    const modalCopyBtn = document.getElementById('modalCopyBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const toastMsg = document.getElementById('toastMsg');

    const contactActions = {
        email: {
            title: 'Email Ansaf',
            sub: 'ansafdev01@gmail.com',
            primaryText: 'Open Mail App',
            primaryIcon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
            action: () => window.location.href = 'mailto:ansafdev01@gmail.com',
            copyValue: 'ansafdev01@gmail.com'
        },
        phone: {
            title: 'Call Ansaf',
            sub: '+91 9074849016',
            primaryText: 'Make a Call',
            primaryIcon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
            action: () => window.location.href = 'tel:+919074849016',
            copyValue: '+919074849016'
        }
    };

    let currentAction = null;

    function showToast(text) {
        toastMsg.innerText = text;
        toastMsg.classList.add('active');
        setTimeout(() => toastMsg.classList.remove('active'), 2500);
    }

    function openModal(type, e) {
        e.preventDefault();
        currentAction = contactActions[type];
        modalTitle.innerText = currentAction.title;
        modalSub.innerText = currentAction.sub;
        modalPrimaryBtn.innerHTML = `${currentAction.primaryIcon} <span>${currentAction.primaryText}</span>`;
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    document.getElementById('contactEmail')?.addEventListener('click', (e) => openModal('email', e));
    document.getElementById('contactPhone')?.addEventListener('click', (e) => openModal('phone', e));
    modalCloseBtn?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    modalPrimaryBtn?.addEventListener('click', () => {
        currentAction.action();
        closeModal();
    });

    modalCopyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(currentAction.copyValue).then(() => {
            showToast('Copied to clipboard!');
            closeModal();
        });
    });

    // Throttle with rAF
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => { onScrollUpdate(); ticking = false; });
            ticking = true;
        }
    }, { passive: true });

    onScrollUpdate(); // initial paint

    // ── Nav dot clicks ────────────────────────────────────────────
    // Scroll to wrapper top → card snaps to top of screen
    navDots.forEach((dot, i) => {
        dot.addEventListener('click', e => {
            e.preventDefault();
            if (metrics[i]) {
                window.scrollTo({ top: metrics[i].wrapperTop, behavior: 'smooth' });
            }
        });
    });

    // ── Mobile touch: tap nav to expand labels, tap dot to navigate ──
    const navDotsEl = document.getElementById('navDots');
    if (navDotsEl) {
        navDotsEl.addEventListener('touchstart', e => {
            const dot = e.target.closest('.nav-dot');
            if (!navDotsEl.classList.contains('touch-open')) {
                // First tap: just open — don't navigate yet
                e.preventDefault();
                navDotsEl.classList.add('touch-open');
            } else if (dot) {
                // Nav already open + user tapped a dot: navigate then close
                const i = navDots.indexOf(dot);
                if (i !== -1 && metrics[i]) {
                    window.scrollTo({ top: metrics[i].wrapperTop, behavior: 'smooth' });
                }
                navDotsEl.classList.remove('touch-open');
                e.preventDefault();
            }
        }, { passive: false });

        // Tap anywhere outside the nav closes it
        document.addEventListener('touchstart', e => {
            if (!navDotsEl.contains(e.target)) {
                navDotsEl.classList.remove('touch-open');
            }
        }, { passive: true });
    }

});
