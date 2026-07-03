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

  // File drop + name display + validation
  const ALLOWED_RESUME = /\.(pdf|doc|docx)$/i;
  const MAX_RESUME_BYTES = 3 * 1024 * 1024; // 3 MB

  const drop = document.querySelector('.file-drop');
  if (drop) {
    const input = drop.querySelector('input[type=file]');
    const name = drop.querySelector('.file-name');

    const setFile = (file) => {
      if (!ALLOWED_RESUME.test(file.name)) {
        name.textContent = '';
        input.value = '';
        alert('Please upload a PDF, DOC, or DOCX file.');
        return;
      }
      if (file.size > MAX_RESUME_BYTES) {
        name.textContent = '';
        input.value = '';
        alert('Resume must be 3 MB or smaller.');
        return;
      }
      name.textContent = file.name;
    };

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('drag');
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        setFile(input.files[0]);
      }
    });
    input.addEventListener('change', () => {
      if (input.files.length) setFile(input.files[0]);
    });
  }

  // Read a File as base64 (without the "data:...;base64," prefix)
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

  // Application form -> POST /api/apply (sends email with resume attached)
  const applyForm = document.querySelector('#apply-form');
  if (applyForm) {
    applyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const banner = document.querySelector('#apply-success');
      const submitBtn = applyForm.querySelector('button[type=submit]');
      const fd = new FormData(applyForm);
      const fileInput = applyForm.querySelector('input[type=file]');

      const showBanner = (msg, isError) => {
        if (!banner) return;
        banner.textContent = msg;
        banner.classList.add('show');
        banner.classList.toggle('error', !!isError);
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };

      // Client-side validation
      if (!fd.get('name') || !fd.get('email') || !fd.get('position')) {
        showBanner('Please fill in your name, email, and position.', true);
        return;
      }
      if (!fileInput || !fileInput.files.length) {
        showBanner('Please attach your resume (PDF, DOC, or DOCX).', true);
        return;
      }
      const file = fileInput.files[0];
      if (!ALLOWED_RESUME.test(file.name)) {
        showBanner('Resume must be a PDF, DOC, or DOCX file.', true);
        return;
      }
      if (file.size > MAX_RESUME_BYTES) {
        showBanner('Resume must be 3 MB or smaller.', true);
        return;
      }

      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Submitting…';

      try {
        const resumeContent = await fileToBase64(file);
        const resp = await fetch('/api/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fd.get('name'),
            email: fd.get('email'),
            phone: fd.get('phone') || '',
            position: fd.get('position'),
            linkedin: fd.get('linkedin') || '',
            portfolio: fd.get('portfolio') || '',
            coverLetter: fd.get('coverLetter') || '',
            resumeName: file.name,
            resumeContent,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

        showBanner('Application submitted! Check your inbox for a confirmation email.', false);
        applyForm.reset();
        const fileNameEl = document.querySelector('.file-drop .file-name');
        if (fileNameEl) fileNameEl.textContent = '';
      } catch (err) {
        showBanner(err.message || 'Something went wrong. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
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
      window.location.href = `mailto:support@pureaistudio.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const banner = document.querySelector('#contact-success');
      if (banner) banner.classList.add('show');
    });
  }

  // Current year in footer
  const y = document.querySelector('#year');
  if (y) y.textContent = new Date().getFullYear();
});
