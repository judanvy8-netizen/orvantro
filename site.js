'use strict';

// The page is usable immediately, including direct fragment links and no-JS visits
// Feedback opens the visitor's mail app; it never submits data to a web endpoint
window.orvantroSubmitFeedback = submitOrvantroFeedback;
function submitOrvantroFeedback(form) {
  const fd = new FormData(form);
  const product = fd.get('product') || 'ORVANTRO';
  const rating = fd.get('rating') || '';
  const email = fd.get('email') || '';
  const body = fd.get('body') || '';
  const subject = encodeURIComponent('[ORVANTRO 베타 피드백] ' + product + ' / ' + rating);
  const text = encodeURIComponent(
    '제품: ' + product + '\n만족도: ' + rating + '\n회신 이메일: ' + (email || '(없음)') +
    '\n\n피드백:\n' + body + '\n\n— ' + location.origin + location.pathname
  );
  window.location.href = 'mailto:orvantro@gmail.com?subject=' + subject + '&body=' + text;
  return false;
}
const feedbackForm = document.getElementById('feedback-form');
const feedbackSubmit = document.getElementById('feedback-submit');
if (feedbackForm && feedbackSubmit) feedbackSubmit.disabled = false;
if (feedbackForm) feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  submitOrvantroFeedback(event.currentTarget);
});
