// ページ全体の対話機能
//  1. ダークモード切替（localStorage 永続化 + prefers-color-scheme 反映）
//  2. SVG クリック → モーダル拡大（<dialog> ベース、ESC / 背景 / × で閉じる）

(function () {
  /* ===== 1. theme toggle ===== */
  const html  = document.documentElement;
  const btn   = document.getElementById('theme-toggle');
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  const KEY   = 'explainer-theme';

  const applyTheme = (theme) => {
    html.setAttribute('data-theme', theme);
    if (icon)  icon.textContent  = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  };
  const stored = (() => { try { return localStorage.getItem(KEY); } catch (e) { return null; } })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored || (prefersDark ? 'dark' : 'light'));
  if (btn) {
    btn.addEventListener('click', () => {
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ===== 2. SVG zoom dialog ===== */
  const svgs = document.querySelectorAll('.diagram svg');
  if (svgs.length === 0) return;

  // ダイアログ要素を一度だけ生成
  const dialog = document.createElement('dialog');
  dialog.className = 'svg-zoom';
  dialog.innerHTML = `
    <button class="svg-zoom-close" type="button" aria-label="閉じる">×</button>
    <div class="svg-zoom-body"></div>
    <span class="svg-zoom-hint">ESC または背景クリックで閉じる</span>
  `;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('.svg-zoom-body');

  // 各 SVG にクリックで開くハンドラを付与
  svgs.forEach((svg) => {
    svg.setAttribute('role', 'button');
    svg.setAttribute('tabindex', '0');
    const open = () => {
      body.innerHTML = '';
      body.appendChild(svg.cloneNode(true));
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    };
    svg.addEventListener('click', open);
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  // 閉じる処理
  dialog.querySelector('.svg-zoom-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    // ダイアログ自身の領域外（backdrop 領域）をクリックで閉じる
    if (e.target === dialog) dialog.close();
  });
})();
