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

// ── Contact Modal — see contact-modal.js ─────────────────────

function emailTour(name, desc, address) {
    openContactModal(`Enquiry about ${name}`, tourEmailMessage(name, desc, address));
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
                <button class="btn btn-primary tour-book-btn" onclick="event.stopPropagation(); bookSingle('${place.id}', '${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 80)}', '${place.address || ''}')"><i class="fab fa-whatsapp"></i> Book Tour</button>
                <button class="tour-email-btn" title="Email Andy about this tour" onclick="event.stopPropagation(); emailTour('${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 120)}', '${(place.address || '').replace(/'/g, "\\'")}')"><i class="fas fa-envelope"></i> Email Andy</button>
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
            <div class="booking-bar-actions">
                <button class="btn btn-outline booking-bar-email" onclick="emailSelected()">
                    <i class="fas fa-envelope"></i> Email Andy
                </button>
                <button class="btn btn-primary booking-bar-cta" onclick="bookSelected()">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            </div>
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

function emailSelected() {
    if (!selectedPlaces.size) return;
    const count = selectedPlaces.size;
    const list  = [...selectedPlaces.values()].map((n, i) => `${i + 1}. 📍 ${n}`).join('\n');
    const subject = `Tour Enquiry — ${count} Destination${count > 1 ? 's' : ''}`;
    const message = `Hi Andy! 👋\n\nI'd like to book tours to the following destinations in Ghana:\n\n${list}\n\nPlease let me know your availability and pricing.\n\nThank you!`;
    openContactModal(subject, message);
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

let galleryImages = []; // populated by renderGallery for lightbox use

async function renderGallery() {
    const gallery = document.getElementById('expedition-gallery');
    if (!gallery) return;

    const paths = await fetchImages('gallery');
    const images = paths.filter(p => !p.endsWith('.mp4') && !p.endsWith('.mov'));

    galleryImages = images.map(src => {
        const filename = src.split('/').pop();
        const meta     = GALLERY_META[filename] || { tag: 'On the Road', label: 'Ghana with Andy' };
        return { src, ...meta };
    });

    gallery.innerHTML = galleryImages.map((item, i) => {
        const size = SIZES[i % SIZES.length];
        return `
        <div class="gallery-item${size ? ' ' + size : ''}" data-index="${i}" onclick="openGalleryLightbox(${i})" role="button" tabindex="0" aria-label="View ${item.label}">
            <img src="${item.src}" alt="${item.label}" loading="lazy">
            <div class="gallery-caption">
                <span class="gallery-tag">${item.tag}</span>
                <span class="gallery-label">${item.label}</span>
            </div>
            <div class="gallery-expand-icon"><i class="fas fa-expand-alt"></i></div>
        </div>`;
    }).join('');
}

// ── Gallery Lightbox ──────────────────────────────────────────

let lightboxIndex = 0;

function openGalleryLightbox(index) {
    lightboxIndex = index;
    const lb = document.getElementById('gallery-lightbox');
    if (!lb) return;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateLightboxSlide();
}

function closeGalleryLightbox() {
    const lb = document.getElementById('gallery-lightbox');
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
}

function updateLightboxSlide() {
    const item = galleryImages[lightboxIndex];
    if (!item) return;
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    img.src = item.src;
    img.alt = item.label;
    cap.innerHTML = `<span class="lightbox-tag">${item.tag}</span><span class="lightbox-label">${item.label}</span>`;
    document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${galleryImages.length}`;
}

function lightboxNav(dir) {
    lightboxIndex = (lightboxIndex + dir + galleryImages.length) % galleryImages.length;
    updateLightboxSlide();
}

function initGalleryLightbox() {
    document.getElementById('lightbox-close')?.addEventListener('click', closeGalleryLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', () => lightboxNav(-1));
    document.getElementById('lightbox-next')?.addEventListener('click', () => lightboxNav(1));

    document.getElementById('gallery-lightbox')?.addEventListener('click', e => {
        if (e.target === document.getElementById('gallery-lightbox')) closeGalleryLightbox();
    });

    document.addEventListener('keydown', e => {
        const lb = document.getElementById('gallery-lightbox');
        if (!lb?.classList.contains('open')) return;
        if (e.key === 'Escape')      closeGalleryLightbox();
        if (e.key === 'ArrowLeft')   lightboxNav(-1);
        if (e.key === 'ArrowRight')  lightboxNav(1);
    });
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
    const video       = document.getElementById('expedition-video');
    const overlay     = document.getElementById('video-overlay');
    const centerBtn   = document.getElementById('video-play-btn');
    const ctrlPlayBtn = document.getElementById('video-ctrl-play');
    const seekBar     = document.getElementById('video-seek');
    const timeCurrent = document.getElementById('video-time-current');
    const timeDuration= document.getElementById('video-time-duration');
    const wrap        = document.getElementById('video-wrap');
    if (!video || !overlay || !wrap) return;

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function setPlayIcon(playing) {
        const icon = playing ? 'pause' : 'play';
        if (centerBtn)   centerBtn.innerHTML  = `<i class="fas fa-${icon}"></i>`;
        if (ctrlPlayBtn) ctrlPlayBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    function toggleVideoPlay() {
        if (video.paused || video.ended) {
            video.play();
            overlay.classList.add('hidden');
        } else {
            video.pause();
        }
    }

    overlay.addEventListener('click', toggleVideoPlay);
    video.addEventListener('click', toggleVideoPlay);
    if (ctrlPlayBtn) ctrlPlayBtn.addEventListener('click', toggleVideoPlay);

    video.addEventListener('play',  () => setPlayIcon(true));
    video.addEventListener('pause', () => { setPlayIcon(false); overlay.classList.remove('hidden'); });
    video.addEventListener('ended', () => {
        overlay.classList.remove('hidden');
        if (centerBtn)   centerBtn.innerHTML  = '<i class="fas fa-redo"></i>';
        if (ctrlPlayBtn) ctrlPlayBtn.innerHTML = '<i class="fas fa-redo"></i>';
    });

    // Seek bar — update position as video plays
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        if (seekBar) seekBar.value = pct;
        if (timeCurrent) timeCurrent.textContent = formatTime(video.currentTime);
    });

    video.addEventListener('loadedmetadata', () => {
        if (timeDuration) timeDuration.textContent = formatTime(video.duration);
    });

    if (seekBar) {
        seekBar.addEventListener('input', () => {
            if (video.duration) video.currentTime = (seekBar.value / 100) * video.duration;
        });
    }

    // Keyboard play/pause — works in normal view and fullscreen
    document.addEventListener('keydown', e => {
        if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
        if ((e.key === ' ' || e.key === 'k' || e.key === 'K') && document.fullscreenElement) {
            e.preventDefault();
            toggleVideoPlay();
        }
    });

    const expandBtn = document.getElementById('video-expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen || wrap.mozRequestFullScreen;
                req.call(wrap);
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
            }
        });

        const onFullscreenChange = () => {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            wrap.classList.toggle('is-fullscreen', isFs);
            expandBtn.innerHTML = isFs
                ? '<i class="fas fa-compress"></i>'
                : '<i class="fas fa-expand"></i>';
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
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
            const href = a.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ── Contact Modal Init ────────────────────────────────────────


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
    initGalleryLightbox();
});
