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
      await sendTrialRequest(trialForm.dataset.emailEndpoint, request);

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
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

async function sendTrialRequest(endpoint, request) {
  if (!endpoint) {
    throw new Error('Email endpoint is missing');
  }

  const payload = new FormData();
  payload.append('_subject', 'Новая заявка на тренировку KATSURO');
  payload.append('_template', 'table');
  payload.append('Имя', request.name);
  payload.append('Телефон', request.phone);
  payload.append('Группа', request.group);
  payload.append('День', request.day);
  payload.append('Комментарий', request.comment || 'Не указан');
  payload.append('Дата заявки', new Date(request.createdAt).toLocaleString('ru-RU'));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json'
    },
    body: payload
  });

  if (!response.ok) {
    throw new Error('Email request failed');
  }

  return response.json();
}

/* ALBUM LIGHTBOX */
const albumData = {
  competitions: {
    title: 'Соревнования',
    photos: [
      { src: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=600&fit=crop', caption: 'Чемпионат по каратэ' },
      { src: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=600&fit=crop', caption: 'Соревновательный поединок' },
      { src: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&h=600&fit=crop', caption: 'Церемония награждения' },
      { src: 'https://images.unsplash.com/photo-1571019614244-c35c1eaa800c?w=800&h=600&fit=crop', caption: 'Подготовка к бою' },
      { src: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=800&h=600&fit=crop', caption: 'Первый турнир' },
      { src: 'https://images.unsplash.com/photo-1615117950532-6b207f23bc78?w=800&h=600&fit=crop', caption: 'Победная стойка' }
    ]
  },
  seminars: {
    title: 'Сборы и семинары',
    photos: [
      { src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop', caption: 'Тренировочный сбор' },
      { src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop', caption: 'Медитация и концентрация' },
      { src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop', caption: 'Работа в паре' },
      { src: 'https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800&h=600&fit=crop', caption: 'Мастер-класс' },
      { src: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&h=600&fit=crop', caption: 'Растяжка перед тренировкой' },
      { src: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=600&fit=crop', caption: 'Командная фотография' }
    ]
  },
  gto: {
    title: 'ГТО и ОФП',
    photos: [
      { src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop', caption: 'Физическая подготовка' },
      { src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop', caption: 'Утренняя зарядка' },
      { src: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=600&fit=crop', caption: 'Упражнения на выносливость' },
      { src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop', caption: 'Сила и координация' },
      { src: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&h=600&fit=crop', caption: 'Нормативы ГТО' },
      { src: 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=800&h=600&fit=crop', caption: 'Командные эстафеты' }
    ]
  },
  club: {
    title: 'Жизнь клуба',
    photos: [
      { src: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800&h=600&fit=crop', caption: 'Наш зал' },
      { src: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&h=600&fit=crop', caption: 'Аттестация на пояс' },
      { src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop', caption: 'Тренировка младшей группы' },
      { src: 'https://images.unsplash.com/photo-1571019614244-c35c1eaa800c?w=800&h=600&fit=crop', caption: 'Праздник в клубе' },
      { src: 'https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800&h=600&fit=crop', caption: 'Командный дух' },
      { src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop', caption: 'Памятные моменты' }
    ]
  }
};

function initAlbumLightbox(lightbox) {
  if (!lightbox) return;

  const backdrop = lightbox.querySelector('.lightbox__backdrop');
  const closeBtn = lightbox.querySelector('.lightbox__close');
  const titleEl = lightbox.querySelector('#lightboxTitle');
  const gridEl = lightbox.querySelector('#lightboxGrid');

  function openAlbum(albumKey) {
    const album = albumData[albumKey];
    if (!album) return;

    titleEl.textContent = album.title;
    gridEl.innerHTML = album.photos.map(p =>
      `<div class="lightbox__item">
        <img src="${p.src}" alt="${p.caption}" loading="lazy">
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

  document.querySelectorAll('[data-album]').forEach(btn => {
    btn.addEventListener('click', () => openAlbum(btn.dataset.album));
  });

  closeBtn.addEventListener('click', closeLightbox);
  backdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.getAttribute('aria-hidden') === 'false') {
      closeLightbox();
    }
  });
}
