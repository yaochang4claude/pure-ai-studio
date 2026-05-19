// Pure AI Studio — shared scripts

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Fade-in on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => io.observe(el));

  // Highlight current nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });

  // Pre-fill "Position" field on careers page from ?role= query
  const params = new URLSearchParams(location.search);
  const role = params.get('role');
  if (role) {
    const sel = document.querySelector('#position');
    if (sel) {
      // try to match an existing option; otherwise add it
      const exists = Array.from(sel.options).some(o => o.value === role);
      if (!exists) {
        const o = document.createElement('option');
        o.value = role; o.textContent = role;
        sel.appendChild(o);
      }
      sel.value = role;
      // scroll into view
      const formEl = document.querySelector('#apply');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // File drop + name display
  const drop = document.querySelector('.file-drop');
  if (drop) {
    const input = drop.querySelector('input[type=file]');
    const name = drop.querySelector('.file-name');
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('drag');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        name.textContent = input.files[0].name;
      }
    });
    input.addEventListener('change', () => {
      if (input.files.length) name.textContent = input.files[0].name;
    });
  }

  // Application form -> mailto with details (resume must be attached manually)
  const applyForm = document.querySelector('#apply-form');
  if (applyForm) {
    applyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(applyForm);
      const fullName = fd.get('name') || '';
      const email = fd.get('email') || '';
      const phone = fd.get('phone') || '';
      const position = fd.get('position') || '';
      const linkedin = fd.get('linkedin') || '';
      const portfolio = fd.get('portfolio') || '';
      const coverLetter = fd.get('coverLetter') || '';
      const fileInput = applyForm.querySelector('input[type=file]');
      const fileName = fileInput && fileInput.files.length ? fileInput.files[0].name : '(none — please attach in your email)';

      const subject = `Application — ${position} — ${fullName}`;
      const body =
`Hello Pure AI Studio team,

I'd like to apply for the following position.

Name: ${fullName}
Email: ${email}
Phone: ${phone}
Position: ${position}
LinkedIn: ${linkedin}
Portfolio: ${portfolio}
Resume file: ${fileName}

Cover letter / message:
${coverLetter}

(Please attach the resume file "${fileName}" to this email before sending.)

Best regards,
${fullName}`;

      const mailto = `mailto:yaochang_liu@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      const banner = document.querySelector('#apply-success');
      if (banner) {
        banner.classList.add('show');
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // Contact form -> mailto
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(contactForm);
      const fullName = fd.get('name') || '';
      const email = fd.get('email') || '';
      const topic = fd.get('topic') || 'General inquiry';
      const message = fd.get('message') || '';
      const subject = `[${topic}] Message from ${fullName}`;
      const body =
`Name: ${fullName}
Email: ${email}
Topic: ${topic}

${message}`;
      window.location.href = `mailto:yaochang_liu@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const banner = document.querySelector('#contact-success');
      if (banner) banner.classList.add('show');
    });
  }

  // Current year in footer
  const y = document.querySelector('#year');
  if (y) y.textContent = new Date().getFullYear();
});
