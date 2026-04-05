/* ============================================================
   expedition.js — Destination Detail Page
   ============================================================ */

const placeId = new URLSearchParams(window.location.search).get('id');

if (!placeId) {
    window.location.href = 'index.html#tours';
}

function stars(rating) {
    if (!rating) return '';
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '<i class="fas fa-star"></i>'.repeat(full)
         + (half ? '<i class="fas fa-star-half-alt"></i>' : '')
         + '<i class="far fa-star"></i>'.repeat(empty);
}

async function loadPlace() {
    try {
        const res   = await fetch(`/api/places/${placeId}`);
        const place = await res.json();

        // Page title
        document.title = `${place.name} | DriveWithAndy`;

        // Hero background (first photo)
        const hero = document.getElementById('exp-hero');
        if (place.photos?.[0]) {
            hero.style.backgroundImage = `url('${place.photos[0].url}')`;
        }

        // Hero meta
        document.getElementById('exp-hero-meta').innerHTML = `
            ${place.type ? `<span class="section-eyebrow" style="color:var(--heritage-gold)">${place.type}</span>` : ''}
            <h1 class="exp-title">${place.name}</h1>
            ${place.rating ? `
            <div class="exp-hero-rating">
                ${stars(place.rating)}
                <span>${place.rating.toFixed(1)} · ${place.ratingCount?.toLocaleString() || ''} reviews</span>
            </div>` : ''}
        `;

        // About
        document.getElementById('exp-about').innerHTML = place.summary
            ? `<h2 class="exp-section-title">About ${place.name}</h2><p class="exp-summary">${place.summary}</p>`
            : `<h2 class="exp-section-title">About ${place.name}</h2><p class="exp-summary">One of Ghana's most remarkable destinations, waiting to be explored with a knowledgeable local guide.</p>`;

        // Photos
        const photosEl = document.getElementById('exp-photos');
        if (place.photos?.length) {
            const photos = place.photos;
            photosEl.innerHTML = photos.map((p, i) => `
                <div class="exp-photo-item${i === 0 ? ' featured' : ''}" data-index="${i}" onclick="openLightbox(${i})">
                    <img src="${i === 0 ? p.url : p.thumbUrl}" alt="${place.name}" loading="lazy">
                    <div class="exp-photo-expand"><i class="fas fa-expand-alt"></i></div>
                    ${p.authorName ? `<span class="exp-photo-credit">© ${p.authorName}</span>` : ''}
                </div>
            `).join('');
            initLightbox(photos, place.name);
        } else {
            photosEl.parentElement.style.display = 'none';
        }

        // Reviews
        if (place.reviews?.length) {
            document.getElementById('exp-reviews-section').style.display = 'block';
            document.getElementById('exp-reviews').innerHTML = place.reviews.map(r => `
                <div class="exp-review">
                    <div class="exp-review-header">
                        <strong>${r.author}</strong>
                        <span class="exp-review-stars">${stars(r.rating)}</span>
                    </div>
                    <p>${r.text}</p>
                </div>
            `).join('');
        }

        // Sidebar name
        document.getElementById('sidebar-name').textContent = place.name;

        // WhatsApp CTA with place name
        document.getElementById('sidebar-whatsapp').href =
            `https://wa.me/233542108051?text=Hi%20Andy!%20I'm%20interested%20in%20visiting%20${encodeURIComponent(place.name)}`;

        // Email CTA pre-filled with place details
        document.getElementById('sidebar-email')?.addEventListener('click', () => {
            openContactModal(
                `Enquiry about ${place.name}`,
                tourEmailMessage(place.name, place.summary?.slice(0, 120) || '', place.address || '')
            );
        });

        // Address
        if (place.address) {
            const el = document.getElementById('exp-address');
            el.style.display = 'flex';
            el.querySelector('span').textContent = place.address;
        }

        // Open status
        if (place.openNow !== null) {
            const el = document.getElementById('exp-open-status');
            el.style.display = 'flex';
            el.querySelector('span').innerHTML = place.openNow
                ? '<span style="color:#2e7d32">Open Now</span>'
                : '<span style="color:#c62828">Closed Now</span>';
        }

        // Rating
        if (place.rating) {
            const el = document.getElementById('exp-rating-row');
            el.style.display = 'flex';
            el.querySelector('span').textContent =
                `${place.rating.toFixed(1)} / 5  (${place.ratingCount?.toLocaleString() || ''} reviews)`;
        }

        // Website
        if (place.website) {
            const row  = document.getElementById('exp-website-row');
            const link = document.getElementById('exp-website-link');
            row.style.display = 'flex';
            link.href = place.website;
        }

        // Opening hours
        if (place.weekdayDescriptions?.length) {
            document.getElementById('exp-hours').style.display = 'block';
            document.getElementById('exp-hours-list').innerHTML =
                place.weekdayDescriptions.map(d => `<li>${d}</li>`).join('');
        }

        // Map
        if (place.location) {
            const mapWrap = document.getElementById('exp-map-wrap');
            const mapEl   = document.getElementById('exp-map');
            mapWrap.style.display = 'block';
            mapEl.src = `https://www.google.com/maps/embed/v1/place?key=${window.__GOOGLE_KEY__}&q=${encodeURIComponent(place.name + ' Ghana')}&zoom=13`;
        }

    } catch (err) {
        console.error('Failed to load place:', err);
        document.getElementById('exp-hero-meta').innerHTML =
            `<h1 class="exp-title">Destination not found</h1>
             <a href="index.html#tours" class="btn btn-secondary" style="margin-top:1rem">Back to Tours</a>`;
    }
}

// ── Lightbox ──────────────────────────────────────────────────

let lightboxPhotos = [];
let lightboxIndex  = 0;

function initLightbox(photos, placeName) {
    lightboxPhotos = photos;

    // Build lightbox DOM once
    if (document.getElementById('lightbox')) return;

    const lb = document.createElement('div');
    lb.id        = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
        <div class="lightbox-backdrop" onclick="closeLightbox()"></div>
        <button class="lightbox-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>
        <button class="lightbox-prev" onclick="lightboxNav(-1)"><i class="fas fa-chevron-left"></i></button>
        <button class="lightbox-next" onclick="lightboxNav(1)"><i class="fas fa-chevron-right"></i></button>
        <div class="lightbox-content">
            <div class="lightbox-img-wrap">
                <div class="lightbox-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>
                <img id="lightbox-img" src="" alt="${placeName}">
            </div>
            <div class="lightbox-meta">
                <span id="lightbox-counter"></span>
                <span id="lightbox-credit"></span>
            </div>
        </div>`;
    document.body.appendChild(lb);

    document.addEventListener('keydown', e => {
        if (!document.getElementById('lightbox')?.classList.contains('open')) return;
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowLeft')   lightboxNav(-1);
        if (e.key === 'ArrowRight')  lightboxNav(1);
    });
}

function openLightbox(index) {
    lightboxIndex = index;
    const lb = document.getElementById('lightbox');
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    showLightboxSlide();
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
}

function lightboxNav(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
    showLightboxSlide();
}

function showLightboxSlide() {
    const photo   = lightboxPhotos[lightboxIndex];
    const img     = document.getElementById('lightbox-img');
    const spinner = img.previousElementSibling;
    const counter = document.getElementById('lightbox-counter');
    const credit  = document.getElementById('lightbox-credit');

    img.style.opacity = '0';
    spinner.style.display = 'block';

    img.onload = () => {
        spinner.style.display = 'none';
        img.style.opacity = '1';
    };
    img.src = photo.url;

    counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
    credit.textContent  = photo.authorName ? `© ${photo.authorName}` : '';
}

// ── Contact Modal — see contact-modal.js ─────────────────────

// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initContactModal();
    try {
        const cfg = await fetch('/api/places/config').then(r => r.json());
        window.__GOOGLE_KEY__ = cfg.mapsKey;
    } catch (_) {}
    loadPlace();
});
