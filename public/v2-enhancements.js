(() => {
  const STORAGE_LIMIT_KEY = 'your_stamps_generation_count_v2';
  const GALLERY_KEY = 'stampai_gallery';
  const FREE_LIMIT = 3;
  const COLORS = ['#000000', '#FFFFFF', '#FF4D4D', '#4DFF4D', '#4D4DFF', '#FFFF4D', '#FF4DFF', '#4DFFFF'];

  const getCount = () => Number(localStorage.getItem(STORAGE_LIMIT_KEY) || '0');
  const setCount = (value) => localStorage.setItem(STORAGE_LIMIT_KEY, String(value));

  const normalizeTwoLines = (value) => {
    const lines = String(value || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .slice(0, 2)
      .map((line) => line.slice(0, 18));
    return lines.join('\n');
  };

  const downloadDataUrl = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const exportResized = async (src, width, height, filename) => {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const padding = width === 240 ? 16 : 4;
    const targetW = width - padding * 2;
    const targetH = height - padding * 2;
    const scale = Math.min(targetW / img.width, targetH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (width - drawW) / 2;
    const y = (height - drawH) / 2;

    ctx.drawImage(img, x, y, drawW, drawH);
    downloadDataUrl(canvas.toDataURL('image/png'), filename);
  };

  const getGallery = () => {
    try {
      return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const isGenerateButton = (button) => {
    const text = button.textContent || '';
    return text.includes('生成') && (text.includes('1つ') || text.includes('4表情'));
  };

  const enhanceGenerateButtons = () => {
    const buttons = [...document.querySelectorAll('button')].filter(isGenerateButton);
    buttons.forEach((button) => {
      if (button.dataset.v2LimitReady === 'true') return;
      button.dataset.v2LimitReady = 'true';

      button.addEventListener('click', (event) => {
        const count = getCount();
        if (count >= FREE_LIMIT) {
          event.preventDefault();
          event.stopPropagation();
          alert('無料生成は3回までです。作成済み画像の文字入れ・保存・申請準備は引き続き使えます。');
          return false;
        }
        setCount(count + 1);
        setTimeout(updateLimitBadge, 0);
      }, true);
    });
  };

  const updateLimitBadge = () => {
    const characterHeading = [...document.querySelectorAll('h2')].find((el) => (el.textContent || '').includes('キャラを生成'));
    if (!characterHeading) return;
    const card = characterHeading.closest('.bg-white');
    if (!card || card.querySelector('[data-v2-limit-badge]')) return;

    const badge = document.createElement('div');
    badge.dataset.v2LimitBadge = 'true';
    badge.style.cssText = 'margin-top:8px;padding:8px 10px;border-radius:14px;background:#ecfdf5;border:1px solid #bbf7d0;color:#047857;font-size:12px;font-weight:700;text-align:center;';
    const render = () => {
      const count = getCount();
      badge.textContent = `無料生成 ${Math.min(count, FREE_LIMIT)}/${FREE_LIMIT} 回`;
    };
    render();
    characterHeading.parentElement?.appendChild(badge);
  };

  const clickExistingColorControl = (color) => {
    const buttons = [...document.querySelectorAll('button')];
    const target = buttons.find((button) => {
      const style = button.getAttribute('style') || '';
      const aria = button.getAttribute('aria-label') || '';
      const title = button.getAttribute('title') || '';
      return style.includes(color) || aria.includes(color) || title.includes(color);
    });

    if (target) {
      target.click();
      return true;
    }

    return false;
  };

  const injectMobileColorControls = () => {
    const input = document.querySelector('input[placeholder="文字入力（2行まで）"], input[placeholder="文字入力"]');
    if (!input) return;

    const panel = input.closest('.bg-white');
    if (!panel || panel.querySelector('[data-v2-mobile-colors]')) return;

    const wrapper = document.createElement('div');
    wrapper.dataset.v2MobileColors = 'true';
    wrapper.style.cssText = 'padding-top:4px;';
    wrapper.innerHTML = `
      <div style="font-size:11px;color:#64748b;font-weight:800;margin-bottom:8px;">文字色</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
        ${COLORS.map((color) => `
          <button
            type="button"
            data-v2-color="${color}"
            aria-label="文字色 ${color}"
            style="width:34px;height:34px;flex:0 0 auto;border-radius:999px;border:2px solid #e2e8f0;background:${color};box-shadow:0 2px 6px rgba(15,23,42,.12);"
          ></button>
        `).join('')}
      </div>
      <p style="font-size:10px;color:#94a3b8;margin-top:6px;line-height:1.5;">白文字は黒フチ、黒文字は白フチで見やすくなります。</p>
    `;

    const fontRow = panel.querySelector('.overflow-x-auto');
    if (fontRow) {
      fontRow.insertAdjacentElement('afterend', wrapper);
    } else {
      input.insertAdjacentElement('afterend', wrapper);
    }

    wrapper.querySelectorAll('[data-v2-color]').forEach((button) => {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-v2-color');
        const ok = clickExistingColorControl(color);
        if (!ok) {
          window.__yourStampsPendingColor = color;
          alert('この画面では色ボタンの連動に失敗しました。PC表示の色選択か、次の本体修正版で反映します。');
        }
      });
    });
  };

  const enhanceTextInput = () => {
    const input = document.querySelector('input[placeholder="文字入力"]');
    if (input && input.dataset.v2TwoLineReady !== 'true') {
      input.dataset.v2TwoLineReady = 'true';
      input.setAttribute('maxlength', '37');
      input.setAttribute('placeholder', '文字入力（2行まで）');

      const hint = document.createElement('p');
      hint.textContent = '改行は2行まで。長すぎる文字は少し短くしてね。';
      hint.style.cssText = 'font-size:11px;color:#64748b;margin-top:6px;line-height:1.5;';
      input.insertAdjacentElement('afterend', hint);

      input.addEventListener('input', () => {
        const next = normalizeTwoLines(input.value);
        if (input.value !== next) {
          input.value = next;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    injectMobileColorControls();
  };

  const injectExportPanel = () => {
    if (document.querySelector('[data-v2-export-panel]')) return;

    const savedHeading = [...document.querySelectorAll('h2')].find((el) => (el.textContent || '').includes('マイスタンプ'));
    if (!savedHeading) return;

    const panel = document.createElement('div');
    panel.dataset.v2ExportPanel = 'true';
    panel.style.cssText = 'background:white;border:1px solid #e2e8f0;border-radius:18px;padding:14px;margin:0 0 16px;box-shadow:0 4px 12px rgba(15,23,42,.05);';
    panel.innerHTML = `
      <div style="font-weight:800;color:#0f172a;margin-bottom:6px;">申請用画像を書き出し</div>
      <p style="font-size:12px;color:#64748b;margin:0 0 10px;line-height:1.6;">保存済みの最新スタンプから、main.png と tab.png を作ります。</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button data-v2-main style="padding:10px 12px;border-radius:12px;background:#16a34a;color:white;font-weight:800;font-size:12px;border:none;">main.png 生成</button>
        <button data-v2-tab style="padding:10px 12px;border-radius:12px;background:#0f172a;color:white;font-weight:800;font-size:12px;border:none;">tab.png 生成</button>
      </div>
    `;

    savedHeading.closest('div')?.insertAdjacentElement('afterend', panel);

    panel.querySelector('[data-v2-main]')?.addEventListener('click', async () => {
      const latest = getGallery()[0];
      if (!latest?.data) return alert('保存済みスタンプがありません。先にスタンプを保存してください。');
      await exportResized(latest.data, 240, 240, 'main.png');
    });

    panel.querySelector('[data-v2-tab]')?.addEventListener('click', async () => {
      const latest = getGallery()[0];
      if (!latest?.data) return alert('保存済みスタンプがありません。先にスタンプを保存してください。');
      await exportResized(latest.data, 96, 74, 'tab.png');
    });
  };

  const enhance = () => {
    enhanceGenerateButtons();
    updateLimitBadge();
    enhanceTextInput();
    injectExportPanel();
  };

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', enhance);
  setInterval(enhance, 1200);
})();
