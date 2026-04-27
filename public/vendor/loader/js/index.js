gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, ScrambleTextPlugin);

const smoother = ScrollSmoother.create({
  smooth: 1,
  normalizeScroll: true,
});

const textElements = document.querySelectorAll('.el');
const logoEl = document.querySelector('.logo__title');
const progressLockup = document.querySelector('.progress-lockup');
const progressBar = document.querySelector('.progress__bar');
const loaderStatusEl = document.querySelector('[data-loader-status]');
const logoText = logoEl.textContent;
const params = new URLSearchParams(window.location.search);
const isSequenceLoader = params.get('sequence') === '1';

let autoTween;
let progressTween;
const autoState = { progress: 0 };
const loaderState = { progress: 0 };

textElements.forEach((el) => {
  el.dataset.text = el.textContent;
});
logoEl.dataset.text = logoText;

function resetTextElements() {
  textElements.forEach((el) => {
    gsap.set(el, {
      clearProps: 'transform,opacity,filter',
    });
  });
}

function initFlips() {
  resetTextElements();

  textElements.forEach((el) => {
    const originalClass = [...el.classList].find((c) => c.startsWith('pos-'));
    const targetClass = el.dataset.altPos;
    const flipEase = el.dataset.flipEase || 'expo.inOut';

    el.classList.add(targetClass);
    el.classList.remove(originalClass);

    const flipState = Flip.getState(el, {
      props: 'opacity, filter, width',
    });

    el.classList.add(originalClass);
    el.classList.remove(targetClass);

    Flip.to(flipState, {
      ease: flipEase,
      scrollTrigger: {
        trigger: el,
        start: 'clamp(bottom bottom-=10%)',
        end: 'clamp(center center)',
        scrub: true,
      },
    });

    Flip.from(flipState, {
      ease: flipEase,
      scrollTrigger: {
        trigger: el,
        start: 'clamp(center center)',
        end: 'clamp(top top)',
        scrub: true,
      },
    });
  });
}

const scrambleChars = 'upperAndLowerCase';

function scramble(el, { duration, revealDelay = 0 } = {}) {
  const text = el.dataset.text ?? el.textContent;
  const finalDuration =
    duration ??
    (el.dataset.scrambleDuration ? parseFloat(el.dataset.scrambleDuration) : 1);

  gsap.killTweensOf(el);

  gsap.fromTo(
    el,
    { scrambleText: { text: '', chars: '' } },
    {
      scrambleText: {
        text,
        chars: scrambleChars,
        revealDelay,
      },
      duration: finalDuration,
    }
  );
}

function initScramble() {
  killScrambleTriggers();

  textElements.forEach((el) => {
    ScrollTrigger.create({
      id: 'scramble',
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => scramble(el),
      onEnterBack: () => scramble(el),
    });
  });

  scramble(logoEl, { revealDelay: 0.5 });
}

function killScrambleTriggers() {
  ScrollTrigger.getAll().forEach((st) => {
    if (st.vars.id === 'scramble') {
      st.kill();
    }
  });
}

function maxScroll() {
  return (
    ScrollTrigger.maxScroll(window) ||
    document.documentElement.scrollHeight - window.innerHeight
  );
}

function updateAutoScroll() {
  const scrollY = autoState.progress * maxScroll();

  smoother.scrollTop(scrollY);
}

function renderProgressBar(progress) {
  gsap.set(progressBar, {
    scaleX: Math.min(1, Math.max(0, Number(progress) || 0)),
  });
}

function initProgressBar() {
  if (progressTween) return;

  syncProgressWidth();
  gsap.set(progressBar, { scaleX: 0 });

  if (isSequenceLoader) {
    loaderState.progress = 0;
    progressTween = gsap.to(loaderState, {
      progress: 0.86,
      duration: 8,
      ease: 'power2.out',
      onUpdate: () => renderProgressBar(loaderState.progress),
    });
    return;
  }

  progressTween = gsap.to(progressBar, {
    scaleX: 1,
    duration: 6.5,
    ease: 'none',
  });
}

function setProgressBar(progress, duration = 0.35) {
  const nextProgress = Math.min(1, Math.max(0, Number(progress) || 0));

  loaderState.progress = Math.max(loaderState.progress, nextProgress);
  gsap.to(progressBar, {
    scaleX: loaderState.progress,
    duration,
    ease: 'power2.out',
    overwrite: true,
  });
}

function completeProgressBar() {
  progressTween?.kill();
  setProgressBar(1, 0.55);
}

function syncProgressWidth() {
  const width = logoEl.getBoundingClientRect().width;
  const visualWidth = width;

  if (visualWidth > 0) {
    progressLockup.style.width = `${visualWidth}px`;
  }
}

function initAutoPlayback() {
  autoTween?.kill();
  autoState.progress = 0;
  smoother.scrollTop(0);
  initProgressBar();

  autoTween = gsap.to(autoState, {
    progress: 1,
    duration: 13,
    ease: 'none',
    repeat: -1,
    onUpdate: updateAutoScroll,
    onRepeat: () => {
      autoState.progress = 0;
      smoother.scrollTop(0);
      scramble(logoEl, { revealDelay: 0.25 });
    },
  });
}

function blockUserScroll(event) {
  event.preventDefault();
}

function blockScrollKeys(event) {
  const blockedKeys = [
    ' ',
    'ArrowDown',
    'ArrowUp',
    'ArrowLeft',
    'ArrowRight',
    'PageDown',
    'PageUp',
    'Home',
    'End',
  ];

  if (blockedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

window.addEventListener('wheel', blockUserScroll, {
  passive: false,
  capture: true,
});
window.addEventListener('touchmove', blockUserScroll, {
  passive: false,
  capture: true,
});
window.addEventListener('keydown', blockScrollKeys, {
  passive: false,
  capture: true,
});

window.addEventListener('message', (event) => {
  const type = event.data?.type;
  const status = typeof event.data?.status === 'string' ? event.data.status : '';

  if (status && loaderStatusEl) {
    loaderStatusEl.textContent = status;
  }

  if (type === 'sequence:loaderProgress') {
    setProgressBar(event.data.progress);
  }

  if (type === 'sequence:loaderComplete') {
    completeProgressBar();
  }
});

window.addEventListener('resize', () => {
  syncProgressWidth();
  ScrollTrigger.refresh(true);
  initFlips();
  initScramble();
  initAutoPlayback();
});

if (document.fonts) {
  document.fonts.ready.then(syncProgressWidth);
}

initFlips();
initScramble();
ScrollTrigger.refresh();
initAutoPlayback();
