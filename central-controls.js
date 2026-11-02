(function (w) {
  'use strict';
  // This presentation layer preserves the collector's consent and transport API
  var labels = {
    ko: {
      'not-configured': '중앙 집계 서버 연결 전 방문 정보 전송 없음',
      'privacy-preference': '브라우저의 추적 거부 설정에 따라 수집하지 않음',
      'needs-consent': '방문 통계 수집이 꺼져 있습니다',
      'ready': '방문 통계 수집을 허용했습니다', 'sending': '방문 통계 전송 중',
      'sent': '방문 통계 수집을 허용했습니다',
      'error': '수집 결과를 확인할 수 없음 중복 방지를 위해 자동 재전송하지 않음',
      'storage-unavailable': '브라우저 저장소를 사용할 수 없어 수집하지 않음'
    },
    en: {
      'not-configured': 'Central analytics is not configured No visit data is sent',
      'privacy-preference': 'Collection is off to respect your browser privacy preference',
      'needs-consent': 'Analytics is off Allow to count this page view',
      'ready': 'Analytics is allowed', 'sending': 'Sending this page view',
      'sent': 'This page view was accepted by central analytics',
      'error': 'Collection could not be confirmed No automatic retry to avoid duplicates',
      'storage-unavailable': 'Collection is off because browser storage is unavailable'
    }
  };
  function boot() {
    var api = w.OrvantroCentral, state = document.getElementById('central-consent-status');
    var allow = document.getElementById('central-allow'), deny = document.getElementById('central-deny');
    if (!api || !state || !allow || !deny) return;
    function render() {
      var current = api.getStatus();
      var language = document.documentElement.lang === 'en' ? 'en' : 'ko';
      state.textContent = labels[language][current.status] || (language === 'en' ? 'Check analytics status' : '통계 상태 확인 필요');
      allow.textContent = language === 'en' ? 'Allow visit analytics' : '방문 통계 허용';
      deny.textContent = language === 'en' ? 'Withdraw consent' : '허용 취소';
      allow.disabled = !current.configured || current.respectsPrivacyPreference || current.consent;
      deny.disabled = !current.consent;
      allow.setAttribute('aria-pressed', String(current.consent));
    }
    allow.addEventListener('click', function () { api.setConsent(true); render(); });
    deny.addEventListener('click', function () { api.setConsent(false); render(); });
    w.addEventListener('orvantro-central-status', render);
    w.addEventListener('orvantro-language-change', render);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
