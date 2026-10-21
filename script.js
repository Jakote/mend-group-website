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
// The form's action is FormSubmit's normal endpoint, so it still works without
// JavaScript. With JavaScript we post to the /ajax/ endpoint instead, which answers
// with JSON ({"success": "true"|"false", "message": ...}). Only a success answer
// counts as sent: the normal endpoint returns HTTP 200 with an HTML page even when
// it has not accepted the message, so a 200 alone is not proof of delivery.
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
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    status.className = 'form-status';
    status.textContent = '';

    const d = new FormData(contactForm);
    let sent = false;
    try {
      const response = await fetch(ajaxUrl, {
        method: 'POST',
        body: d,
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      sent = response.ok && String(data.success) === 'true';
    } catch (err) {
      sent = false;
    }

    if (sent) {
      showStatus('success', 'Message sent. We\'ll get back to you as soon as we can.');
      contactForm.reset();
    } else {
      // Keep what the visitor typed, and offer their mail app rather than jumping to it.
      const subject = encodeURIComponent('Website enquiry: ' + (d.get('service') || ''));
      const body = encodeURIComponent(
        'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\nNeed: ' + d.get('service') + '\n\n' + d.get('message')
      );
      showStatus('error', 'Your message could not be sent from the form.',
        'mailto:info@mendgroup.co.za?subject=' + subject + '&body=' + body);
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  });
}
