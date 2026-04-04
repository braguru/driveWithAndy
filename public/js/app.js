/* ============================================================
   DRIVEWITHANDY — app.js
   Dynamic content rendering + interactions
   ============================================================ */

// ── Tour Metadata (titles/descriptions keyed by filename) ────
// Images are fetched live from the server. Metadata is looked
// up by filename — any image without an entry gets a generic card.

const TOUR_META = {
    'cape_coast_castle.jpg':                          { tag: 'Top-Rated',      title: 'Cape Coast Castle',                      desc: 'A profound journey through this UNESCO World Heritage slave castle — a monument to resilience — along Ghana\'s historic Central Coast.',                                                                            cta: 'Book Journey' },
    'Elmina Castle.jpg':                              { tag: 'UNESCO Heritage', title: 'Elmina Castle',                          desc: 'The oldest European building in sub-Saharan Africa. Walk through centuries of history at this iconic fortress on Ghana\'s Central Coast.',                                                                   cta: 'Book Tour' },
    'Black Star Gate.jpg':                            { tag: 'Iconic Landmark', title: 'Black Star Gate',                        desc: 'Ghana\'s defining symbol of independence — the iconic arch at Independence Square, where the nation declared freedom to the world.',                                                                         cta: 'Book Tour' },
    'Kwame Nkrumah Memorial Park and Mausoleum.jpg':  { tag: 'Cultural Heart',  title: 'Kwame Nkrumah Memorial Park',            desc: 'Pay tribute to Ghana\'s founding father at the beautifully landscaped memorial park and mausoleum in the heart of Accra.',                                                                               cta: 'Book Tour' },
    'kakum_national_park.jpg':                        { tag: 'Adventure',       title: 'Kakum National Park',                    desc: 'Walk Ghana\'s famous 350-metre treetop canopy bridge — 40 metres above the rainforest floor — through one of West Africa\'s most biodiverse parks.',                                                      cta: 'Book Adventure' },
    'Mole National Park.jpg':                         { tag: 'Wilderness',      title: 'Mole National Park',                     desc: 'Ghana\'s largest wildlife reserve — track elephants, buffalo, antelope, and monkeys on foot or by jeep, then visit the 15th-century Larabanga Mosque.',                                                   cta: 'Book Safari' },
    'Lake Bosomtwe.jpg':                              { tag: 'Royal Heritage',  title: 'Lake Bosomtwe',                          desc: 'Ghana\'s only natural lake — a spiritually sacred crater lake near Kumasi, revered by the Ashanti people and stunning at sunrise.',                                                                       cta: 'Book Tour' },
    'independence square.jpg':                        { tag: 'Historic',        title: 'Independence Square',                    desc: 'The sweeping ceremonial square in Accra where Ghana\'s history was made — a breathtaking open-air monument to the nation\'s independence.',                                                               cta: 'Book Tour' },
    'Labadi Beach.jpg':                               { tag: 'Coastal Escape',  title: 'Labadi Beach',                           desc: 'Accra\'s most vibrant stretch of coastline — alive with music, culture, and the warm waters of the Atlantic. The perfect end to any Accra day.',                                                          cta: 'Book Escape' },
    'national_theatre.jpg':                           { tag: 'Arts & Culture',  title: 'National Theatre',                       desc: 'Ghana\'s premier arts venue — an architectural marvel hosting dance, drama, and cultural performances at the heart of Accra\'s creative scene.',                                                           cta: 'Book Tour' },
    'Maranatha Beach Camp.jpg':                       { tag: 'Beach Retreat',   title: 'Maranatha Beach Camp',                   desc: 'A serene coastal retreat along Ghana\'s scenic shoreline — ideal for relaxation, group getaways, and experiencing the Atlantic in peace.',                                                               cta: 'Book Escape' },
    'jeffrey-ofori-tOshpNl-sW4-unsplash.jpg':         { tag: 'Nature Escape',   title: 'Boti Falls',                             desc: 'Marvel at the twin cascades of Boti Falls in the Eastern Region — a lush, scenic escape perfect as a day trip from Accra.',                                                                               cta: 'Book Escape' },
    'Boti Waterfalls.avif':                           { tag: 'Waterfalls',      title: 'Boti Waterfalls',                        desc: 'A twin waterfall wonder tucked inside lush forest in the Eastern Region — one of Ghana\'s most scenic natural attractions.',                                                                             cta: 'Book Escape' },
    'Larabanga Mosque.jpg':                           { tag: 'Sacred Site',     title: 'Larabanga Mosque',                       desc: 'One of the oldest mosques in West Africa — a stunning 15th-century Sudanese-style mud mosque near Mole National Park in the Northern Region.',                                                          cta: 'Book Tour' },
    'Manhyia Palace Museum.jpeg':                     { tag: 'Royal Heritage',  title: 'Manhyia Palace Museum',                  desc: 'Step inside the seat of the Ashanti Kingdom. The Manhyia Palace Museum in Kumasi offers a rare glimpse into the royal history and traditions of the Asantehene.',                                       cta: 'Book Tour' },
    'Martyrs of the Rule of Law monument,.jpg':       { tag: 'Historic',        title: 'Martyrs of the Rule of Law Monument',    desc: 'A powerful tribute to Ghana\'s fallen judges — a solemn and important stop on any Accra heritage circuit.',                                                                                             cta: 'Book Tour' },
    'Aburi Botanical Gardens.jpg':                    { tag: 'Scenic Highlands',title: 'Aburi Botanical Gardens',                desc: 'Escape Accra\'s heat into the cool highlands of Akwapem. Stroll through the colonial-era Aburi Botanical Gardens with sweeping valley views.',                                                          cta: 'Book Escape' },
};

// First 6 filenames shown by default; rest go behind "View More"
const TOURS_VISIBLE = new Set([
    'cape_coast_castle.jpg',
    'Elmina Castle.jpg',
    'Black Star Gate.jpg',
    'Kwame Nkrumah Memorial Park and Mausoleum.jpg',
    'kakum_national_park.jpg',
    'Mole National Park.jpg',
]);

// ── Fetch helpers ─────────────────────────────────────────────

async function fetchImages(folder) {
    const res = await fetch(`/api/images/${encodeURIComponent(folder)}`);
    if (!res.ok) throw new Error(`Could not load images from ${folder}`);
    return res.json();
}

// ── Render: Hero Slides ───────────────────────────────────────

async function renderHeroSlides() {
    const container = document.getElementById('hero-slides-container');
    if (!container) return;

    const paths = await fetchImages('expeditions');

    container.innerHTML = paths.map((src, i) => `
        <div class="hero-slide${i === 0 ? ' active' : ''}" style="background-image: url('${src}')"></div>
    `).join('');

    initHeroSlider();
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    const NUM_DOTS = dots.length;
    let current = 0;

    function syncDot(slideIndex) {
        const dotIndex = Math.floor(slideIndex / slides.length * NUM_DOTS);
        dots.forEach((d, i) => d.classList.toggle('active', i === dotIndex));
    }

    syncDot(0);

    setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
        syncDot(current);
    }, 7000);
}

// ── Render: Tours ─────────────────────────────────────────────

async function renderTours() {
    const grid = document.getElementById('tour-grid');
    if (!grid) return;

    const paths = await fetchImages('expeditions');

    grid.innerHTML = paths.map(src => {
        const filename = src.split('/').pop();
        const meta     = TOUR_META[filename] || {
            tag: 'Explore', title: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            desc: 'Discover this incredible destination with Andy as your guide.',
            cta: 'Book Tour',
        };
        const hidden = !TOURS_VISIBLE.has(filename);

        return `
        <div class="tour-card${hidden ? ' hidden-tour' : ''}">
            <div class="tour-image-wrapper">
                <img src="${src}" alt="${meta.title}" class="tour-img" loading="lazy">
            </div>
            <div class="tour-details">
                <span class="tour-tag">${meta.tag}</span>
                <h3>${meta.title}</h3>
                <p>${meta.desc}</p>
                <a href="https://wa.me/233542108051" class="btn btn-secondary">${meta.cta}</a>
            </div>
        </div>`;
    }).join('');
}

// ── Render: Gallery ───────────────────────────────────────────

const SIZES = ['tall', '', 'wide', '', '', 'tall', '', 'wide', '', ''];

async function renderGallery() {
    const gallery = document.getElementById('expedition-gallery');
    if (!gallery) return;

    const paths = await fetchImages('gallery');

    // Exclude non-image files like the video
    const images = paths.filter(p => !p.endsWith('.mp4') && !p.endsWith('.mov'));

    gallery.innerHTML = images.map((src, i) => {
        const size = SIZES[i % SIZES.length];
        const name = src.split('/').pop().replace(/\.[^.]+$/, '');
        return `
        <div class="gallery-item${size ? ' ' + size : ''}">
            <img src="${src}" alt="On the Road with Andy" loading="lazy">
            <div class="gallery-caption">
                <span class="gallery-tag">On the Road</span>
                <span class="gallery-label">${name}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Render: Fleet ─────────────────────────────────────────────

async function renderFleet() {
    const slider = document.getElementById('fleet-slider');
    const dotsEl = document.getElementById('fleet-dots');
    if (!slider) return;

    const paths = await fetchImages('fleet');

    slider.innerHTML = paths.map((src, i) => `
        <div class="fleet-slide${i === 0 ? ' active' : ''}">
            <img src="${src}" alt="Fleet Vehicle ${i + 1}" loading="lazy">
        </div>
    `).join('');

    if (dotsEl) {
        dotsEl.innerHTML = paths.map((_, i) => `
            <span class="fleet-dot${i === 0 ? ' active' : ''}"></span>
        `).join('');
    }

    initFleetSlider();
}

function initFleetSlider() {
    const slides = document.querySelectorAll('.fleet-slide');
    const dots   = document.querySelectorAll('.fleet-dot');
    if (!slides.length) return;

    let current = 0;

    function goTo(index) {
        slides[current].classList.remove('active');
        dots[current]?.classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current]?.classList.add('active');
    }

    setInterval(() => goTo(current + 1), 4000);
}

// ── Video ─────────────────────────────────────────────────────

function initVideo() {
    const video   = document.getElementById('expedition-video');
    const overlay = document.getElementById('video-overlay');
    const playBtn = document.getElementById('video-play-btn');
    if (!video || !overlay) return;

    overlay.addEventListener('click', () => {
        video.play();
        overlay.classList.add('hidden');
    });

    video.addEventListener('pause', () => {
        overlay.classList.remove('hidden');
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    video.addEventListener('ended', () => {
        overlay.classList.remove('hidden');
        playBtn.innerHTML = '<i class="fas fa-redo"></i>';
    });

    video.addEventListener('click', () => {
        if (!video.paused) video.pause();
    });

    const expandBtn = document.getElementById('video-expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                (video.requestFullscreen || video.webkitRequestFullscreen || video.mozRequestFullScreen).call(video);
                expandBtn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
                expandBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                expandBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });
    }
}

// ── View More Tours ───────────────────────────────────────────

function initViewMore() {
    const btn = document.getElementById('view-more-tours');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const hidden = document.querySelectorAll('.hidden-tour');
        const isCollapsed = getComputedStyle(hidden[0]).display === 'none';

        hidden.forEach(card => {
            card.style.display = isCollapsed ? 'flex' : 'none';
        });

        btn.innerHTML = isCollapsed
            ? '<i class="fas fa-chevron-up"></i> Show Less'
            : '<i class="fas fa-compass"></i> View More Expeditions';
    });
}

// ── Sticky Header ─────────────────────────────────────────────

function initHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
}

// ── Mobile Menu ───────────────────────────────────────────────

function initMobileMenu() {
    const toggle   = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
        const open = navLinks.classList.toggle('mobile-open');
        Object.assign(navLinks.style, open ? {
            display: 'flex', flexDirection: 'column', position: 'absolute',
            top: '100%', left: '0', width: '100%',
            background: 'var(--primary)', padding: '2rem', gap: '1.25rem',
            boxShadow: '0 20px 40px rgba(3,38,7,0.3)', zIndex: '999',
        } : { display: '' });
        toggle.innerHTML = open ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });
}

// ── Smooth Scroll ─────────────────────────────────────────────

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Async renders (fetch from server)
    renderHeroSlides();
    renderTours();
    renderGallery();
    renderFleet();

    // Sync inits
    initVideo();
    initViewMore();
    initHeader();
    initMobileMenu();
    initSmoothScroll();
});
