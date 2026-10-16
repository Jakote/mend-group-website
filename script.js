// ===== Mobile Navigation =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-links');
const overlay = document.querySelector('.mobile-overlay');

function openMenu() {
  navMenu.classList.add('mobile-open');
  overlay.classList.add('active');
  hamburger.innerHTML = '&#10005;';
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  navMenu.classList.remove('mobile-open');
  overlay.classList.remove('active');
  hamburger.innerHTML = '&#9776;';
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  navMenu.classList.contains('mobile-open') ? closeMenu() : openMenu();
});

overlay.addEventListener('click', closeMenu);

navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// ===== Navbar Scroll Effect =====
const nav = document.querySelector('nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// ===== Scroll Reveal =====
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// ===== More Services Toggle =====
const moreToggle = document.getElementById('moreServicesToggle');
const moreContent = document.getElementById('moreServicesContent');

if (moreToggle && moreContent) {
  moreToggle.addEventListener('click', () => {
    moreToggle.classList.toggle('active');
    moreContent.classList.toggle('open');
    const span = moreToggle.querySelector('span');
    if (moreContent.classList.contains('open')) {
      span.textContent = 'Show fewer services';
    } else {
      span.textContent = 'More services we offer';
    }
  });
}

// ===== Contact Form — AJAX via FormSubmit.co =====
// The form's action is FormSubmit's normal endpoint, so it still works without
// JavaScript. With JavaScript we post to the /ajax/ endpoint instead, which answers
// with JSON ({"success": "true"|"false", "message": ...}). Only a success answer
// counts as sent: an HTTP 200 alone is not proof the message was accepted.
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  const status = document.getElementById('formStatus');
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const ajaxUrl = contactForm.action.replace('://formsubmit.co/', '://formsubmit.co/ajax/');

  const showStatus = (kind, text, mailto) => {
    status.className = 'form-status ' + kind;
    status.textContent = text;
    if (mailto) {
      status.append(' ');
      const link = document.createElement('a');
      link.href = mailto;
      link.textContent = 'Send it by email instead';
      status.append(link);
      status.append('.');
    }
  };

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Sending...';
    submitBtn.disabled = true;
    status.className = 'form-status';

    const formData = new FormData(contactForm);
    let sent = false;

    try {
      const response = await fetch(ajaxUrl, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      sent = response.ok && String(data.success) === 'true';
    } catch (err) {
      sent = false;
    }

    if (sent) {
      showStatus('success', "Message sent. We'll get back to you as soon as we can.");
      contactForm.reset();
    } else {
      const subject = encodeURIComponent('Website Enquiry: ' + (formData.get('service') || ''));
      const body = encodeURIComponent(
        'Name: ' + formData.get('name') + '\nEmail: ' + formData.get('email') +
        '\nService: ' + formData.get('service') + '\n\n' + formData.get('message')
      );
      showStatus('error', 'Your message could not be sent from the form.',
        'mailto:info@mendgroup.co.za?subject=' + subject + '&body=' + body);
    }

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  });
}

// ===== Smooth Anchor Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const navHeight = document.querySelector('nav').offsetHeight;
      const targetPosition = target.offsetTop - navHeight - 20;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  });
});
