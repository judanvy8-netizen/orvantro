'use strict';
// Both languages remain readable without JavaScript; the choice is session-only
// No language sniffing, cookies, storage writes or language-related network calls
(() => {
  document.querySelectorAll('.translation').forEach(en => {
    if (en.tagName === 'P') {
      const previous = en.previousElementSibling;
      if (previous && previous.tagName === 'P') previous.classList.add('locale-ko');
      return;
    }
    const ko = document.createElement('span');
    ko.className = 'locale-ko';
    while (en.previousSibling) ko.prepend(en.previousSibling);
    en.before(ko);
  });
  const choices = [...document.querySelectorAll('[data-language-choice]')];
  const localized = [...document.querySelectorAll('[data-ko], [data-en], [data-ko-placeholder], [data-en-placeholder], [data-ko-aria-label], [data-en-aria-label]')];
  // Retain original attribute values when only the alternate language is supplied
  localized.forEach(element => {
    for (const attr of ['placeholder', 'aria-label']) {
      if (element.hasAttribute('data-en-' + attr) && !element.hasAttribute('data-ko-' + attr)) {
        element.setAttribute('data-ko-' + attr, element.getAttribute(attr) || '');
      }
    }
  });
  function choose(language) {
    if (language !== 'ko' && language !== 'en') return;
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language;
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.languageChoice === language)));
    localized.forEach(element => {
      if (element.hasAttribute('data-' + language)) element.textContent = element.getAttribute('data-' + language);
      for (const attr of ['placeholder', 'aria-label']) {
        if (element.hasAttribute('data-' + language + '-' + attr)) element.setAttribute(attr, element.getAttribute('data-' + language + '-' + attr));
      }
    });
    window.dispatchEvent(new CustomEvent('orvantro-language-change', { detail: { language } }));
  }
  choices.forEach(button => button.addEventListener('click', () => choose(button.dataset.languageChoice)));
  choose('ko');
})();
