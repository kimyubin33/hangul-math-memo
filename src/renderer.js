// 한글 수식 메모 — 화면 동작
(() => {
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const preview = $('preview');
  const errorBox = $('error');
  const latexBox = $('latex');
  const toast = $('toast');
  const help = $('help');
  const pinBtn = $('btn-pin');
  const opacity = $('opacity');
  const copyButtons = [...document.querySelectorAll('.copy-btn')];
  const api = window.memo; // preload.js 에서 열어 준 기능 (브라우저에서 열면 없음)

  let latex = '';
  let copyFormat = 'inline';

  if (api && api.platform === 'darwin') $('mod-key').textContent = '⌘';

  // ── 변환 + 미리보기 ──────────────────────────────
  function update() {
    const text = input.value;
    errorBox.hidden = true;
    preview.style.opacity = '';
    latexBox.style.opacity = '';
    if (!text.trim()) {
      latex = '';
      preview.className = 'preview empty';
      preview.textContent = '여기에 수식이 보입니다';
      latexBox.textContent = '';
      setCopyEnabled(false);
      return;
    }
    try {
      latex = HangulMath.toLatex(text);
      katex.render(latex, preview, { displayMode: true, throwOnError: true, strict: 'ignore' });
      preview.className = 'preview';
      latexBox.textContent = latex;
      setCopyEnabled(true);
    } catch (err) {
      // 괄호를 아직 덜 닫은 상태일 수 있으니, 이전 미리보기는 흐리게 남겨 둡니다
      preview.className = 'preview';
      preview.style.opacity = '0.35';
      latexBox.style.opacity = '0.35';
      errorBox.textContent = friendlyError(err);
      errorBox.hidden = false;
      latex = '';
      setCopyEnabled(false);
      return;
    }
  }

  function friendlyError(err) {
    if (err instanceof HangulMath.ParseError) return err.message;
    if (err && err.name === 'ParseError') return '수식으로 바꿀 수 없는 부분이 있습니다';
    return '변환 중 문제가 생겼습니다';
  }

  function setCopyEnabled(on) {
    copyButtons.forEach((b) => { b.disabled = !on; });
  }

  // ── 복사 ──────────────────────────────────────
  function wrap(format) {
    if (format === 'block') return `$$\n${latex}\n$$`;
    if (format === 'raw') return latex;
    return `$${latex}$`;
  }
  const LABEL = { inline: '$인라인$', block: '$$블록$$', raw: 'LaTeX' };

  function copy(format) {
    if (!latex) return;
    const text = wrap(format);
    if (api) api.copy(text);
    else navigator.clipboard && navigator.clipboard.writeText(text);
    setDefaultFormat(format);
    showToast(`${LABEL[format]} 복사됨`);
  }

  function setDefaultFormat(format) {
    copyFormat = format;
    copyButtons.forEach((b) => b.classList.toggle('default', b.dataset.format === format));
    api && api.setSettings({ copyFormat: format });
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 1300);
  }

  copyButtons.forEach((b) => b.addEventListener('click', () => copy(b.dataset.format)));

  // ── 입력 ──────────────────────────────────────
  let saveTimer;
  input.addEventListener('input', (e) => {
    // 여는 괄호를 치면 닫는 괄호를 자동으로 붙임 (한글 입력기로 친 경우도 동작)
    if (e.data === '(' && input.selectionStart === input.selectionEnd) {
      const pos = input.selectionStart;
      const next = input.value[pos];
      if (!next || /[\s)\],]/.test(next)) input.setRangeText(')', pos, pos, 'start');
    }
    update();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => api && api.setSettings({ lastInput: input.value }), 400);
  });

  input.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter: 마지막으로 쓴 형식으로 복사
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      copy(copyFormat);
    }
    // 닫는 괄호가 이미 있으면 건너뛰기
    if (e.key === ')' && !e.isComposing && input.value[input.selectionStart] === ')' && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      input.selectionStart = input.selectionEnd = input.selectionStart + 1;
    }
  });

  // ── 도움말 ────────────────────────────────────
  const list = $('examples');
  HangulMath.EXAMPLES.forEach(([src, label]) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    const s = document.createElement('span'); s.className = 'ex-src'; s.textContent = src;
    const o = document.createElement('span'); o.className = 'ex-out';
    try { katex.render(HangulMath.toLatex(src), o, { strict: 'ignore' }); } catch { o.textContent = ''; }
    const l = document.createElement('span'); l.className = 'ex-label'; l.textContent = label;
    btn.append(s, o, l);
    btn.addEventListener('click', () => {
      input.value = src;
      toggleHelp(false);
      input.focus();
      input.selectionStart = input.selectionEnd = src.length;
      update();
    });
    li.append(btn);
    list.append(li);
  });

  function toggleHelp(force) {
    help.hidden = force === undefined ? !help.hidden : !force;
  }
  $('btn-help').addEventListener('click', () => toggleHelp());
  $('help-close').addEventListener('click', () => toggleHelp(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { e.preventDefault(); toggleHelp(); }
    if (e.key === 'Escape' && !help.hidden) toggleHelp(false);
  });

  // ── 창 버튼 ───────────────────────────────────
  $('btn-min').addEventListener('click', () => api && api.minimize());
  $('btn-close').addEventListener('click', () => (api ? api.close() : window.close()));
  pinBtn.addEventListener('click', async () => {
    if (!api) return;
    const pinned = await api.togglePin();
    pinBtn.setAttribute('aria-pressed', String(pinned));
    showToast(pinned ? '항상 위에 고정' : '고정 해제');
  });
  opacity.addEventListener('input', () => api && api.setOpacity(opacity.value));

  // ── 시작 ──────────────────────────────────────
  (async () => {
    if (api) {
      const s = await api.getSettings();
      input.value = s.lastInput || '';
      pinBtn.setAttribute('aria-pressed', String(!!s.pinned));
      opacity.value = s.opacity ?? 1;
      setDefaultFormat(s.copyFormat || 'inline');
      api.onFocusInput(() => { input.focus(); input.select(); });
    } else {
      setDefaultFormat('inline');
    }
    update();
    input.focus();
  })();
})();
