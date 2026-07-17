document.addEventListener('DOMContentLoaded', () => {
  const beltGrid = document.querySelector('.belt-grid');
  const beltItems = typeof belts === 'undefined' ? [] : belts;
  const trialForm = document.querySelector('#trialForm');
  const beltScroll = document.querySelector('.belt-scroll');
  const lightbox = document.querySelector('#albumLightbox');

  initAlbumLightbox(lightbox);

  if (beltGrid && Array.isArray(beltItems)) {
    beltItems.forEach((belt) => {
      const card = document.createElement('article');
      const mainColor = belt.colors[0];
      const stripeColor = belt.colors[1] || 'transparent';
      const isBlack = mainColor.toLowerCase() === '#111111';

      card.className = `belt-card${isBlack ? ' belt-card--black' : ''}${belt.highlight ? ' belt-card--highlight' : ''}${belt.historical ? ' belt-card--historical' : ''}`;
      card.style.setProperty('--belt-main', mainColor);
      card.style.setProperty('--belt-stripe', stripeColor);

      card.innerHTML = `
        <div class="belt-card__belt" aria-hidden="true">${belt.japanese ? `<span>${belt.japanese}</span>` : ''}</div>
        <h3 class="belt-card__title">${belt.kyu} — ${belt.name}</h3>
        <div class="belt-card__motto">${belt.motto}</div>
        <div class="belt-card__time">Срок: ${belt.months}</div>
        <blockquote class="belt-card__quote">${belt.quote}</blockquote>
        <p class="belt-card__text">${belt.text}</p>
      `;

      beltGrid.appendChild(card);
    });
  }

  if (beltScroll && Array.isArray(beltItems) && beltItems.length > 0) {
    initBeltScroll(beltScroll, beltItems);
  }

  if (!trialForm) {
    return;
  }

  const phoneInput = trialForm.elements.phone;
  const successBox = document.querySelector('#trialSuccess');
  const consentError = trialForm.querySelector('.trial-form__error--consent');

  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  trialForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(trialForm);

    const formData = new FormData(trialForm);
    const request = {
      id: Date.now(),
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      group: String(formData.get('group') || '').trim(),
      day: String(formData.get('day') || '').trim(),
      comment: String(formData.get('comment') || '').trim(),
      createdAt: new Date().toISOString()
    };

    const errors = validateTrialRequest(request, trialForm.elements.consent.checked);

    if (Object.keys(errors).length > 0) {
      showFormErrors(trialForm, errors, consentError);
      return;
    }

    const submitButton = trialForm.querySelector('.trial-form__submit');
    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = 'ОТПРАВЛЯЕМ...';
    successBox.hidden = true;

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: request.name,
          phone: request.phone,
          group: request.group,
          day: request.day,
          comment: request.comment || 'Не указан',
        }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const savedRequests = readSavedRequests();
      savedRequests.push(request);
      localStorage.setItem('katsuroTrialRequests', JSON.stringify(savedRequests));

      trialForm.reset();
      successBox.classList.remove('trial-form__success--error');
      successBox.hidden = false;
      successBox.textContent = `${request.name}, заявка отправлена. Мы свяжемся с вами для подтверждения тренировки.`;

      window.setTimeout(() => {
        successBox.hidden = true;
      }, 7000);
    } catch (error) {
      successBox.classList.add('trial-form__success--error');
      successBox.hidden = false;
      successBox.textContent = 'Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
});

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
  const normalized = digits.startsWith('7') ? digits : `7${digits}`;
  const part1 = normalized.slice(1, 4);
  const part2 = normalized.slice(4, 7);
  const part3 = normalized.slice(7, 9);
  const part4 = normalized.slice(9, 11);

  let result = '+7';

  if (part1) result += ` (${part1}`;
  if (part1.length === 3) result += ')';
  if (part2) result += ` ${part2}`;
  if (part3) result += `-${part3}`;
  if (part4) result += `-${part4}`;

  return result;
}

function validateTrialRequest(request, hasConsent) {
  const errors = {};
  const phoneDigits = request.phone.replace(/\D/g, '');

  if (request.name.length < 2) {
    errors.name = 'Введите имя не короче 2 символов.';
  }

  if (phoneDigits.length !== 11) {
    errors.phone = 'Введите телефон в формате +7 (999) 999-99-99.';
  }

  if (!request.group) {
    errors.group = 'Выберите группу.';
  }

  if (!request.day) {
    errors.day = 'Выберите день тренировки.';
  }

  if (!hasConsent) {
    errors.consent = 'Подтвердите согласие на обработку контактных данных.';
  }

  return errors;
}

function clearFormErrors(form) {
  form.querySelectorAll('.trial-form__field').forEach((field) => {
    field.classList.remove('is-invalid');
    const error = field.querySelector('.trial-form__error');
    if (error) error.textContent = '';
  });

  const consentError = form.querySelector('.trial-form__error--consent');
  if (consentError) consentError.textContent = '';
}

function showFormErrors(form, errors, consentError) {
  Object.entries(errors).forEach(([name, message]) => {
    if (name === 'consent') {
      consentError.textContent = message;
      return;
    }

    const control = form.elements[name];
    const field = control.closest('.trial-form__field');
    const error = field.querySelector('.trial-form__error');

    field.classList.add('is-invalid');
    error.textContent = message;
  });
}

function readSavedRequests() {
  try {
    const saved = JSON.parse(localStorage.getItem('katsuroTrialRequests') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function initBeltScroll(widget, beltItems) {
  const track = widget.querySelector('.belt-scroll__track');
  const thumb = widget.querySelector('.belt-scroll__thumb');
  const label = widget.querySelector('.belt-scroll__label');
  const stripe = widget.querySelector('.belt-scroll__stripe');
  const dots = widget.querySelectorAll('.belt-scroll__dot');

  const sections = Array.from(dots).map(dot => {
    const id = dot.dataset.section;
    return { dot, el: document.getElementById(id) };
  }).filter(s => s.el);

  // Position dots evenly on track
  const trackH = track.offsetHeight;
  sections.forEach((s, i) => {
    const pct = sections.length > 1 ? i / (sections.length - 1) : 0.5;
    s.dot.style.top = `${pct * 100}%`;
  });

  // Click on dot → scroll to section
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = dot.dataset.section;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Click on track → scroll to position
  track.addEventListener('click', (e) => {
    if (e.target.closest('.belt-scroll__dot')) return;
    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const pct = Math.max(0, Math.min(1, clickY / rect.height));
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll * pct, behavior: 'smooth' });
  });

  function update() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll <= 0 ? 0 : window.scrollY / maxScroll;
    const trackRange = track.offsetHeight - thumb.offsetHeight;
    const beltIndex = Math.min(beltItems.length - 1, Math.floor(progress * beltItems.length));
    const belt = beltItems[beltIndex];
    const mainColor = belt.colors[0];
    const stripeColor = belt.colors[1] || 'transparent';

    thumb.style.setProperty('--scroll-progress', `${trackRange * progress}px`);
    thumb.style.setProperty('--scroll-belt-main', mainColor);
    stripe.style.setProperty('--scroll-belt-stripe', stripeColor);
    label.textContent = belt.kyu;

    // Highlight active section dot
    let activeIdx = 0;
    for (let i = sections.length - 1; i >= 0; i--) {
      const rect = sections[i].el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.4) {
        activeIdx = i;
        break;
      }
    }
    sections.forEach((s, i) => {
      s.dot.classList.toggle('is-active', i === activeIdx);
    });
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    // Re-position dots on resize
    sections.forEach((s, i) => {
      const pct = sections.length > 1 ? i / (sections.length - 1) : 0.5;
      s.dot.style.top = `${pct * 100}%`;
    });
    update();
  });
}

/* ALBUM LIGHTBOX */
const albumData = {
  competitions: {
    title: 'Соревнования',
    photos: [
      { src: 'images/sorevnovania.webp', caption: 'каратэ' },
      { src: 'images/sorevnovania0.webp', caption: '' },
      { src: 'images/sorevnovania1.webp', caption: '' },
      { src: 'images/sorevnovania2.webp', caption: '' },
      { src: 'images/sorevnovania3.webp', caption: '' },
      { src: 'images/sorevnovania4.webp', caption: '' },
      { src: 'images/sorevnovania5.webp', caption: '' },
      { src: 'images/sorevnovania6.webp', caption: '' },
      { src: 'images/sorevnovania7.webp', caption: '' },
      { src: 'images/sorevnovania8.webp', caption: '' },
      { src: 'images/sorevnovania9.webp', caption: '' },
      { src: 'images/sorevnovania10.webp', caption: '' },
      { src: 'images/sorevnovania11.webp', caption: '' },
      { src: 'images/sorevnovania12.webp', caption: '' },
      { src: 'images/sorevnovania13.webp', caption: '' },
      { src: 'images/sorevnovania14.webp', caption: '' }
    ]
  },
  seminars: {
    title: 'Сборы и семинары',
    photos: [
      { src: 'images/Sbori.webp', caption: 'Тренировочный сбор' },
      { src: 'images/Sbori0.webp', caption: '' }
         ]
  },
  gto: {
    title: 'ГТО и ОФП',
     photos: [
      { src: 'images/GTO.webp', caption: 'ГТО' },
      { src: 'images/GTO0.webp', caption: '' },
      { src: 'images/GTO1.webp', caption: '' }
    ]
  },
  club: {
    title: 'Жизнь клуба',
     photos: [
      { src: 'images/ycheniki.webp', caption: 'Ученики' },
      { src: 'images/ycheniki0.webp', caption: '' }
    ]
  }
};

function initAlbumLightbox(lightbox) {
  if (!lightbox) return;

  const backdrop = lightbox.querySelector('.lightbox__backdrop');
  const closeBtn = lightbox.querySelector('.lightbox__close');
  const titleEl = lightbox.querySelector('#lightboxTitle');
  const gridEl = lightbox.querySelector('#lightboxGrid');
  const viewer = document.getElementById('photoViewer');
  const viewerImg = document.getElementById('photoViewerImg');
  const viewerCaption = document.getElementById('photoViewerCaption');
  const viewerCounter = document.getElementById('photoViewerCounter');
  const viewerPrev = viewer.querySelector('.photo-viewer__btn--prev');
  const viewerNext = viewer.querySelector('.photo-viewer__btn--next');
  const viewerClose = viewer.querySelector('.photo-viewer__close');
  const viewerBackdrop = viewer.querySelector('.photo-viewer__backdrop');

  let currentPhotos = [];
  let currentIndex = 0;

  function openAlbum(albumKey) {
    const album = albumData[albumKey];
    if (!album) return;

    currentPhotos = album.photos;
    titleEl.textContent = album.title;

    gridEl.innerHTML = album.photos.map((p, i) =>
      `<div class="lightbox__item" data-photo-index="${i}">
        <img src="${p.src}" alt="${p.caption}" loading="lazy" decoding="async">
        <div class="lightbox__item-caption"><span>${p.caption}</span></div>
      </div>`
    ).join('');

    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openPhoto(index) {
    if (index < 0 || index >= currentPhotos.length) return;
    currentIndex = index;
    const photo = currentPhotos[index];

    viewerImg.style.opacity = '0';
    viewerImg.src = photo.src;
    viewerImg.alt = photo.caption;
    viewerCaption.textContent = photo.caption;
    viewerCounter.textContent = `${index + 1} / ${currentPhotos.length}`;

    viewerImg.onload = () => { viewerImg.style.opacity = '1'; };

    viewer.setAttribute('aria-hidden', 'false');
    lightbox.setAttribute('aria-hidden', 'true');

    preloadAdjacent(index);
  }

  function closeViewer() {
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.src = '';
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeAll() {
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.src = '';
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function preloadAdjacent(index) {
    [index - 1, index + 1].forEach(i => {
      if (i >= 0 && i < currentPhotos.length) {
        const img = new Image();
        img.src = currentPhotos[i].src;
      }
    });
  }

  function showPrev() {
    if (currentIndex > 0) openPhoto(currentIndex - 1);
  }

  function showNext() {
    if (currentIndex < currentPhotos.length - 1) openPhoto(currentIndex + 1);
  }

  // Album click
  document.querySelectorAll('[data-album]').forEach(btn => {
    btn.addEventListener('click', () => openAlbum(btn.dataset.album));
  });

  // Photo click (delegation)
  gridEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-photo-index]');
    if (item) openPhoto(Number(item.dataset.photoIndex));
  });

  // Viewer controls
  viewerPrev.addEventListener('click', showPrev);
  viewerNext.addEventListener('click', showNext);
  viewerClose.addEventListener('click', closeViewer);
  viewerBackdrop.addEventListener('click', closeViewer);

  // Album close
  closeBtn.addEventListener('click', closeLightbox);
  backdrop.addEventListener('click', closeLightbox);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const viewerOpen = viewer.getAttribute('aria-hidden') === 'false';
    const lightboxOpen = lightbox.getAttribute('aria-hidden') === 'false';

    if (viewerOpen) {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    } else if (lightboxOpen) {
      if (e.key === 'Escape') closeLightbox();
    }
  });

  // Touch swipe
  let touchStartX = 0;
  viewer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  viewer.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? showPrev() : showNext();
    }
  }, { passive: true });
}
