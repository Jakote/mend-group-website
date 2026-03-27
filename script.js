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
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const status = document.getElementById('formStatus');
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = 'Sending...';
    submitBtn.disabled = true;

    try {
      const formData = new FormData(contactForm);

      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        status.textContent = 'Message sent successfully! We\'ll get back to you within 24 hours.';
        status.className = 'form-status success';
        contactForm.reset();
      } else {
        throw new Error('Failed to send');
      }
    } catch (err) {
      // Fallback to mailto
      const formData = new FormData(contactForm);
      const name = formData.get('name');
      const email = formData.get('email');
      const service = formData.get('service');
      const message = formData.get('message');

      const subject = encodeURIComponent('Website Enquiry: ' + service);
      const body = encodeURIComponent(
        'Name: ' + name + '\nEmail: ' + email + '\nService: ' + service + '\n\n' + message
      );

      window.location.href = 'mailto:info@mendgroup.co.za?subject=' + subject + '&body=' + body;

      status.textContent = 'Opening your email client as a fallback. You can also email us directly at info@mendgroup.co.za';
      status.className = 'form-status success';
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
