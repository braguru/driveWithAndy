/* ============================================================
   contact-modal.js — Shared contact modal logic
   Loaded by index.html and expedition.html
   ============================================================ */

const GENERAL_SUBJECT = 'General Tour Enquiry';
const GENERAL_MESSAGE = `Hi Andy! 👋\n\nI'm interested in booking a tour with DriveWithAndy and would like to know more about your services and availability.\n\nPlease let me know how we can get started.\n\nThank you!`;

// Page-specific context for the floating button (overridden by expedition.js after place loads)
let _floatSubject = GENERAL_SUBJECT;
let _floatMessage = GENERAL_MESSAGE;

function setContactModalContext(subject, message) {
    _floatSubject = subject;
    _floatMessage = message;
}

function tourEmailMessage(name, desc, address) {
    return `Hi Andy! 👋\n\nI'd like to book a tour to:\n\n📍 ${name}\n${desc ? desc + '\n' : ''}${address ? `📌 ${address}\n` : ''}\nPlease let me know your availability and pricing.\n\nThank you!`;
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
    if (!data.name)    { document.getElementById('cf-name').classList.add('error');    hasError = true; }
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
    document.getElementById('email-float-btn')?.addEventListener('click', () => openContactModal(_floatSubject, _floatMessage));
    document.getElementById('contact-form').addEventListener('submit', e => {
        e.preventDefault();
        submitContactForm();
    });

    // index.html-specific triggers (silently ignored on other pages)
    document.getElementById('contact-nav-trigger')?.addEventListener('click', e => {
        e.preventDefault(); openContactModal();
    });
    document.getElementById('contact-footer-trigger')?.addEventListener('click', e => {
        e.preventDefault(); openContactModal();
    });
}
