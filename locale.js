'use strict';
// Both languages remain in the document without JavaScript. Language choice is
// session-only: no browser sniffing, cookies, local storage or network requests.
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
  function choose(language) {
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language;
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.languageChoice === language)));
  }
  choices.forEach(button => button.addEventListener('click', () => choose(button.dataset.languageChoice)));
  choose('ko');
})();
