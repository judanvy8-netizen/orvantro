'use strict';
window.ORVANTRO_ANALYTICS = { site: 'orvantro' };
(function () {
      let entered = false;
      let isWarping = false;
      let warpSpeed = 0.05;
      let engineReady = false;
      let stopEngine = function () {};

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mainPanel = document.getElementById('main-content');
      function revealMain() {
        document.documentElement.classList.remove('intro-active');
        mainPanel.inert = false;
        mainPanel.classList.add('visible');
        mainPanel.focus({ preventScroll: true });
        stopEngine();
      }
      document.querySelector('.skip').addEventListener('click', () => enterStudio(true));
      const introPanel = document.getElementById('intro-ui');
      introPanel.addEventListener('click', () => enterStudio());
      introPanel.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enterStudio(); }
      });

      window.enterStudio = function enterStudio(skipWarp) {
        if (entered) return;
        entered = true;

        const intro = document.getElementById('intro-ui');
        const main = document.getElementById('main-content');

        if (reduceMotion || skipWarp || !engineReady) {
          if (intro) intro.style.display = 'none';
          revealMain();
          document.body.style.overflow = 'auto';
          return;
        }

        isWarping = true;
        intro.classList.add('fade-out');
        setTimeout(() => {
          intro.style.display = 'none';
          revealMain();
          document.body.style.overflow = 'auto';
        }, 850);
      };

      function bootEngine() {
        if (reduceMotion || typeof THREE === 'undefined') {
          engineReady = false;
          return;
        }

        const canvas = document.getElementById('webgl-canvas');
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05070d, 0.012);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 9;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        let frameId = null;
        let stopped = false;
        let onMouseMove = null;
        let onResize = null;
        stopEngine = () => {
          if (stopped) return;
          stopped = true;
          engineReady = false;
          isWarping = false;
          if (frameId !== null) cancelAnimationFrame(frameId);
          if (onMouseMove) window.removeEventListener('mousemove', onMouseMove);
          if (onResize) window.removeEventListener('resize', onResize);
          scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
          });
          renderer.dispose();
          canvas.style.display = 'none';
        };
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const hyperCore = new THREE.Group();

        const dodecaMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2.2, 0),
          new THREE.MeshBasicMaterial({ color: 0x4ec1f0, wireframe: true, transparent: true, opacity: 0.4 })
        );
        const icoMesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.5, 0),
          new THREE.MeshBasicMaterial({ color: 0x1f87b8, wireframe: true, transparent: true, opacity: 0.7 })
        );
        const octaMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.8, 0),
          new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
        );

        hyperCore.add(dodecaMesh, icoMesh, octaMesh);
        scene.add(hyperCore);

        const particleCount = window.innerWidth < 700 ? 1100 : 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i += 3) {
          positions[i] = (Math.random() - 0.5) * 35;
          positions[i + 1] = (Math.random() - 0.5) * 35;
          positions[i + 2] = (Math.random() - 0.5) * 60;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
          color: 0x4ec1f0,
          size: 0.05,
          transparent: true,
          opacity: 0.75
        });
        const starField = new THREE.Points(geometry, material);
        scene.add(starField);

        let mouseX = 0;
        let mouseY = 0;
        onMouseMove = (e) => {
          mouseX = (e.clientX / window.innerWidth - 0.5) * 0.55;
          mouseY = (e.clientY / window.innerHeight - 0.5) * 0.55;
        };
        window.addEventListener('mousemove', onMouseMove, { passive: true });

        function animate() {
          if (stopped || (entered && !isWarping)) return;
          frameId = requestAnimationFrame(animate);

          dodecaMesh.rotation.x += 0.003;
          dodecaMesh.rotation.y += 0.005;
          icoMesh.rotation.x -= 0.007;
          icoMesh.rotation.z += 0.006;
          octaMesh.rotation.y += 0.012;
          octaMesh.rotation.z -= 0.008;

          if (!isWarping) {
            hyperCore.position.x += (mouseX - hyperCore.position.x) * 0.05;
            hyperCore.position.y += (-mouseY - hyperCore.position.y) * 0.05;
          } else {
            warpSpeed += 0.09;
            camera.position.z -= warpSpeed;
            hyperCore.scale.x += 0.18;
            hyperCore.scale.y += 0.18;
            material.opacity = Math.max(0, material.opacity - 0.025);
          }

          const posArray = starField.geometry.attributes.position.array;
          for (let i = 0; i < particleCount; i++) {
            const index = i * 3;
            posArray[index + 2] += isWarping ? warpSpeed * 2.2 : 0.055;
            if (posArray[index + 2] > 10) posArray[index + 2] = -50;
          }
          starField.geometry.attributes.position.needsUpdate = true;
          renderer.render(scene, camera);
        }

        animate();
        engineReady = true;

        onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
      }

      function whenReady(fn) {
        if (document.readyState === 'complete') fn();
        else window.addEventListener('load', fn);
      }

      whenReady(() => {
        if (entered) return;
        try { bootEngine(); } catch (_) { engineReady = false; }
        if (reduceMotion || !engineReady) { enterStudio(true); return; }
        document.documentElement.classList.add('intro-active');
        mainPanel.inert = true;
        introPanel.focus({ preventScroll: true });
      });
    })();

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
      window.location.href = 'mailto:judanvy8@gmail.com?subject=' + subject + '&body=' + text;
      return false;
    }

document.getElementById('feedback-form').addEventListener('submit', event => {
  event.preventDefault();
  submitOrvantroFeedback(event.currentTarget);
});
window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('analytics-toggle');
  const status = document.getElementById('analytics-status');
  const api = window.OrvantroAnalytics;
  if (!api || !api.setEnabled) { button.hidden = true; return; }
  function refresh() {
    const enabled = api.isEnabled();
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '로컬 방문 기록 끄기' : '로컬 방문 기록 켜기';
    status.textContent = enabled ? '이 브라우저에서만 기록 중입니다.' : '방문 기록이 꺼져 있습니다.';
  }
  button.addEventListener('click', () => { api.setEnabled(!api.isEnabled()); refresh(); });
  refresh();
});
