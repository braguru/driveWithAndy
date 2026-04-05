/* ============================================================
   DRIVEWITHANDY — app.js
   Dynamic content rendering + interactions
   ============================================================ */

// ── Global config (loaded from server) ───────────────────────
const CONFIG = { whatsapp: '' };

async function loadConfig() {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    CONFIG.whatsapp = cfg.whatsapp;

    // Update all static WhatsApp & tel links
    document.querySelectorAll('[data-wa="true"]').forEach(el => {
        el.href = `https://wa.me/${CONFIG.whatsapp}`;
    });
    document.querySelectorAll('[data-tel="true"]').forEach(el => {
        el.href = `tel:+${CONFIG.whatsapp}`;
    });
}

function waLink(message) {
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

// ── Contact Modal ─────────────────────────────────────────────

const GENERAL_SUBJECT = 'General Tour Enquiry';
const GENERAL_MESSAGE = `Hi Andy! 👋\n\nI'm interested in booking a tour with DriveWithAndy and would like to know more about your services and availability.\n\nPlease let me know how we can get started.\n\nThank you!`;

function tourEmailMessage(name, desc) {
    return `Hi Andy! 👋\n\nI'd like to book a tour to:\n\n📍 ${name}\n${desc ? desc + '\n' : ''}\nPlease let me know your availability and pricing.\n\nThank you!`;
}

function openContactModal(subject = GENERAL_SUBJECT, message = GENERAL_MESSAGE) {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;
    document.getElementById('cf-subject').value = subject;
    document.getElementById('cf-message').value = message;
    document.getElementById('contact-form').style.display = '';
    document.getElementById('contact-success').style.display = 'none';
    document.getElementById('contact-form-error').classList.remove('visible');
    document.querySelectorAll('.contact-input').forEach(i => i.classList.remove('error'));
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('cf-name')?.focus(), 300);
}

function closeContactModal() {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function emailTour(name, desc) {
    openContactModal(`Enquiry about ${name}`, tourEmailMessage(name, desc));
}

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
    let timer;

    function goTo(index) {
        slides[current].classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        syncDot(current);
    }

    function syncDot(slideIndex) {
        const dotIndex = Math.floor(slideIndex / slides.length * NUM_DOTS);
        dots.forEach((d, i) => d.classList.toggle('active', i === dotIndex));
    }

    function start() {
        timer = setInterval(() => goTo(current + 1), 7000);
    }

    // Dot click — jump to the first slide in that dot's group
    dots.forEach((dot, i) => {
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
            clearInterval(timer);
            const targetSlide = Math.floor(i / NUM_DOTS * slides.length);
            goTo(targetSlide);
            start();
        });
    });

    syncDot(0);
    start();
}

// ── Tours: state ─────────────────────────────────────────────
let allLoadedPlaces = [];   // all fetched from API
let selectedPlaces  = new Map(); // id → name
let toursOffset     = 0;
let activeFilter    = 'All';
let searchQuery     = '';
const TOURS_PAGE    = 6;

// ── Helpers ───────────────────────────────────────────────────

function renderStars(rating) {
    if (!rating) return '';
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '<span class="tour-stars">'
        + '<i class="fas fa-star"></i>'.repeat(full)
        + (half ? '<i class="fas fa-star-half-alt"></i>' : '')
        + '<i class="far fa-star"></i>'.repeat(empty)
        + ` <span class="tour-rating-val">${rating.toFixed(1)}</span>`
        + '</span>';
}

function tourCardHTML(place) {
    const imgSrc    = place.photo || 'content/expeditions/cape_coast_castle.jpg';
    const summary   = place.summary || 'An incredible destination awaiting your exploration with Andy as your guide.';
    const tag       = place.type || 'Attraction';
    const detailUrl = `expedition.html?id=${place.id}`;
    const selected  = selectedPlaces.has(place.id);

    return `
    <div class="tour-card${selected ? ' selected' : ''}"
         data-id="${place.id}" data-name="${place.name.replace(/"/g, '&quot;')}"
         data-type="${tag}" data-name-search="${place.name.toLowerCase()}"
         onclick="toggleSelectPlace(event, '${place.id}', this)">
        <div class="tour-select-badge"><i class="fas fa-check"></i></div>
        <div class="tour-image-wrapper">
            <div class="img-skeleton"></div>
            <img src="${imgSrc}" alt="${place.name}" class="tour-img img-fade" loading="lazy"
                 onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'"
                 onerror="this.src='content/expeditions/cape_coast_castle.jpg';this.classList.add('loaded');this.previousElementSibling.style.display='none'">
        </div>
        <div class="tour-details">
            <span class="tour-tag">${tag}</span>
            <h3>${place.name}</h3>
            ${place.rating ? `<div class="tour-rating">${renderStars(place.rating)} <span class="tour-rating-count">(${(place.ratingCount || 0).toLocaleString()})</span></div>` : ''}
            <p>${summary}</p>
            <div class="tour-card-actions">
                <a href="${detailUrl}" class="btn btn-outline" onclick="event.stopPropagation()">Learn More</a>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); bookSingle('${place.id}', '${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 80)}', '${place.address || ''}')">Book Tour</button>
                <button class="btn btn-glass tour-email-btn" title="Email Andy about this tour" onclick="event.stopPropagation(); emailTour('${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 120)}')"><i class="fas fa-envelope"></i></button>
            </div>
        </div>
    </div>`;
}

// ── Selection ─────────────────────────────────────────────────

function toggleSelectPlace(event, id, card) {
    // If click is on a button/link, don't toggle
    if (event.target.closest('a, button')) return;
    const name = card.dataset.name;
    if (selectedPlaces.has(id)) {
        selectedPlaces.delete(id);
        card.classList.remove('selected');
    } else {
        selectedPlaces.set(id, name);
        card.classList.add('selected');
    }
    updateBookingBar();
}

function updateBookingBar() {
    let bar = document.getElementById('booking-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'booking-bar';
        bar.className = 'booking-bar';
        document.body.appendChild(bar);
    }

    const count = selectedPlaces.size;
    if (count === 0) {
        bar.classList.remove('visible');
        document.body.classList.remove('booking-active');
        return;
    }

    bar.classList.add('visible');
    document.body.classList.add('booking-active');
    bar.innerHTML = `
        <div class="booking-bar-inner">
            <div class="booking-bar-info">
                <i class="fas fa-map-marked-alt"></i>
                <span><strong>${count}</strong> destination${count > 1 ? 's' : ''} selected</span>
                <button class="booking-bar-clear" onclick="clearSelection()">Clear</button>
            </div>
            <button class="btn btn-primary booking-bar-cta" onclick="bookSelected()">
                <i class="fab fa-whatsapp"></i> Book Selected Tours
            </button>
        </div>`;
}

function clearSelection() {
    selectedPlaces.clear();
    document.querySelectorAll('.tour-card.selected').forEach(c => c.classList.remove('selected'));
    updateBookingBar();
}

function bookSingle(id, name, summary, address) {
    const msg = `Hi Andy! 👋\n\nI'd like to book a tour to:\n\n📍 *${name}*\n${summary ? summary + '\n' : ''}${address ? `📌 ${address}\n` : ''}\nPlease let me know your availability and pricing. Thank you!`;
    window.open(waLink(msg), '_blank');
}

function bookSelected() {
    if (!selectedPlaces.size) return;
    const list = [...selectedPlaces.values()].map((n, i) => `${i + 1}. 📍 ${n}`).join('\n');
    const msg  = `Hi Andy! 👋\n\nI'd like to book tours to the following destinations in Ghana:\n\n${list}\n\nPlease let me know your availability and pricing. Thank you!`;
    window.open(waLink(msg), '_blank');
}

// ── Search & Filter ───────────────────────────────────────────

function applySearchFilter() {
    const cards = document.querySelectorAll('#tour-grid .tour-card');
    cards.forEach(card => {
        const nameMatch = !searchQuery || card.dataset.nameSearch.includes(searchQuery.toLowerCase());
        const typeMatch = activeFilter === 'All' || card.dataset.type === activeFilter;
        card.style.display = (nameMatch && typeMatch) ? '' : 'none';
    });
}

function buildFilterChips(places) {
    const types   = ['All', ...new Set(places.map(p => p.type).filter(Boolean))];
    const wrapper = document.getElementById('tour-filters');
    if (!wrapper) return;

    wrapper.innerHTML = types.map(t => `
        <button class="filter-chip${t === 'All' ? ' active' : ''}" data-type="${t}">${t}</button>
    `).join('');

    wrapper.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        activeFilter = chip.dataset.type;
        wrapper.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
        applySearchFilter();
    });
}

function initSearch() {
    const input = document.getElementById('tour-search');
    if (!input) return;
    input.addEventListener('input', e => {
        searchQuery = e.target.value.trim();
        applySearchFilter();
    });
}

// ── Render: Tours ─────────────────────────────────────────────

async function renderTours() {
    const grid = document.getElementById('tour-grid');
    const btn  = document.getElementById('view-more-tours');
    if (!grid) return;

    grid.innerHTML = Array(TOURS_PAGE).fill(0).map(() => `
        <div class="tour-card skeleton">
            <div class="tour-image-wrapper skeleton-img"></div>
            <div class="tour-details">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        </div>`).join('');

    try {
        const res  = await fetch(`/api/places/attractions?offset=0&limit=${TOURS_PAGE}`);
        const data = await res.json();

        allLoadedPlaces = data.items;
        grid.innerHTML  = data.items.map(tourCardHTML).join('');
        toursOffset     = TOURS_PAGE;

        buildFilterChips(data.items);
        initSearch();

        if (btn) {
            btn.style.display = data.hasMore ? 'inline-flex' : 'none';
            btn.innerHTML = '<i class="fas fa-compass"></i> View More Expeditions';
        }
    } catch (err) {
        console.error('Failed to load attractions:', err);
        grid.innerHTML = `<p class="error-msg">Could not load attractions. Please refresh the page.</p>`;
    }
}

async function loadMoreTours() {
    const grid = document.getElementById('tour-grid');
    const btn  = document.getElementById('view-more-tours');
    if (!grid || !btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    try {
        const res  = await fetch(`/api/places/attractions?offset=${toursOffset}&limit=${TOURS_PAGE}`);
        const data = await res.json();

        allLoadedPlaces.push(...data.items);
        data.items.forEach(p => grid.insertAdjacentHTML('beforeend', tourCardHTML(p)));
        toursOffset += TOURS_PAGE;

        // Rebuild filter chips with all loaded types
        buildFilterChips(allLoadedPlaces);
        applySearchFilter();

        btn.disabled = false;
        btn.style.display = data.hasMore ? 'inline-flex' : 'none';
        if (data.hasMore) btn.innerHTML = '<i class="fas fa-compass"></i> View More Expeditions';
    } catch (err) {
        console.error('Failed to load more:', err);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-compass"></i> View More Expeditions';
    }
}

/// ── Gallery Metadata (keyed by filename) ─────────────────────

const GALLERY_META = {
    'WhatsApp Image 2026-04-04 at 11.26.47 AM (1).jpeg': { tag: 'Cape Coast',    label: 'Andy at Cape Coast Castle' },
    'WhatsApp Image 2026-04-04 at 11.26.47 AM.jpeg':     { tag: 'Heritage',      label: 'Cape Coast Castle' },
    'WhatsApp Image 2026-04-04 at 11.26.46 AM.jpeg':     { tag: 'Group Tour',    label: 'Group Expedition' },
    'WhatsApp Image 2026-04-04 at 11.26.46 AM (1).jpeg': { tag: 'On Location',   label: 'With Guests, Central Region' },
    'WhatsApp Image 2026-04-04 at 11.26.34 AM.jpeg':     { tag: 'Safari',        label: 'Safari Excursion' },
    'WhatsApp Image 2026-04-04 at 11.26.34 AM (1).jpeg': { tag: 'Wildlife',      label: 'Wildlife Encounter' },
    'WhatsApp Image 2026-04-04 at 11.26.33 AM.jpeg':     { tag: 'Family',        label: 'Family Tour' },
    'WhatsApp Image 2026-04-04 at 11.26.33 AM (1).jpeg': { tag: 'Highlights',    label: 'Tour Moments' },
    'WhatsApp Image 2026-04-04 at 11.26.32 AM.jpeg':     { tag: 'Accra',         label: 'Heritage Walk, Accra' },
    'WhatsApp Image 2026-04-04 at 11.26.29 AM.jpeg':     { tag: 'Volta Region',  label: 'Volta River Cruise' },
    'WhatsApp Image 2026-04-04 at 11.26.29 AM (1).jpeg': { tag: 'Central Coast', label: 'Coastal Drive' },
    'WhatsApp Image 2026-04-04 at 11.26.22 AM.jpeg':     { tag: 'The Fleet',     label: "Andy's Premium 4x4" },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM.jpeg':      { tag: 'On the Road',   label: 'On the Road with Andy' },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM (1).jpeg':  { tag: 'Expedition',    label: 'Expedition Moment' },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM (2).jpeg':  { tag: 'Experience',    label: 'Tour Experience' },
    'WhatsApp Image 2026-04-04 at 2.14.40 PM.jpeg':      { tag: 'Adventure',     label: 'Ghana Adventure' },
};

// ── Render: Gallery ───────────────────────────────────────────

const SIZES = ['tall', '', 'wide', '', '', 'tall', '', 'wide', '', ''];

async function renderGallery() {
    const gallery = document.getElementById('expedition-gallery');
    if (!gallery) return;

    const paths = await fetchImages('gallery');

    // Exclude non-image files like the video
    const images = paths.filter(p => !p.endsWith('.mp4') && !p.endsWith('.mov'));

    gallery.innerHTML = images.map((src, i) => {
        const size     = SIZES[i % SIZES.length];
        const filename = src.split('/').pop();
        const meta     = GALLERY_META[filename] || { tag: 'On the Road', label: 'Ghana with Andy' };
        return `
        <div class="gallery-item${size ? ' ' + size : ''}">
            <img src="${src}" alt="${meta.label}" loading="lazy">
            <div class="gallery-caption">
                <span class="gallery-tag">${meta.tag}</span>
                <span class="gallery-label">${meta.label}</span>
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
    btn.addEventListener('click', loadMoreTours);
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

// ── Contact Modal Init ────────────────────────────────────────

async function submitContactForm() {
    const form      = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit');
    const errorEl   = document.getElementById('contact-form-error');

    errorEl.classList.remove('visible');
    form.querySelectorAll('.contact-input').forEach(i => i.classList.remove('error'));

    const data = {
        name:       document.getElementById('cf-name').value.trim(),
        email:      document.getElementById('cf-email').value.trim(),
        phone:      document.getElementById('cf-phone').value.trim(),
        country:    document.getElementById('cf-country').value.trim(),
        subject:    document.getElementById('cf-subject').value.trim(),
        travellers: document.getElementById('cf-travellers').value.trim(),
        travelDate: document.getElementById('cf-date').value.trim(),
        message:    document.getElementById('cf-message').value.trim(),
    };

    let hasError = false;
    if (!data.name)  { document.getElementById('cf-name').classList.add('error');    hasError = true; }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        document.getElementById('cf-email').classList.add('error'); hasError = true;
    }
    if (!data.subject) { document.getElementById('cf-subject').classList.add('error'); hasError = true; }
    if (!data.message) { document.getElementById('cf-message').classList.add('error'); hasError = true; }

    if (hasError) {
        errorEl.textContent = 'Please fill in all required fields.';
        errorEl.classList.add('visible');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const res  = await fetch('/api/contact', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
        });
        const json = await res.json();

        if (res.ok && json.success) {
            document.getElementById('contact-form').style.display    = 'none';
            document.getElementById('contact-success').style.display = 'block';
            setTimeout(closeContactModal, 3000);
        } else {
            throw new Error(json.error || 'Something went wrong.');
        }
    } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message <i class="fas fa-arrow-right"></i>';
    }
}

function initContactModal() {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', e => { if (e.target === overlay) closeContactModal(); });
    document.getElementById('contact-modal-close').addEventListener('click', closeContactModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContactModal(); });

    document.getElementById('contact-nav-trigger')?.addEventListener('click', e => {
        e.preventDefault();
        openContactModal();
    });

    document.getElementById('contact-footer-trigger')?.addEventListener('click', e => {
        e.preventDefault();
        openContactModal();
    });

    document.getElementById('contact-form').addEventListener('submit', e => {
        e.preventDefault();
        submitContactForm();
    });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    // Async renders
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
    initContactModal();
});
