// mendgroup.co.za - the page works without this file; it only adds the phone
// menu and sends the contact form without leaving the page.

// ----- Phone menu -----
const menuBtn = document.querySelector('.menu-btn');
const nav = document.getElementById('site-nav');

function setMenu(open) {
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuBtn.innerHTML = open ? '&#10005;' : '&#9776;';
}

if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
}

// ----- Anchor scrolling below the sticky header -----
document.documentElement.style.scrollPaddingTop = '72px';

// ----- Contact form, sent through FormSubmit; falls back to the mail app -----
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to send');
      status.textContent = 'Message sent. We\'ll get back to you as soon as we can.';
      status.className = 'form-status success';
      contactForm.reset();
    } catch (err) {
      const d = new FormData(contactForm);
      const subject = encodeURIComponent('Website enquiry: ' + d.get('service'));
      const body = encodeURIComponent(
        'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\nNeed: ' + d.get('service') + '\n\n' + d.get('message')
      );
      window.location.href = 'mailto:info@mendgroup.co.za?subject=' + subject + '&body=' + body;
      status.textContent = 'Opening your email app instead. You can also email info@mendgroup.co.za directly.';
      status.className = 'form-status error';
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  });
}
