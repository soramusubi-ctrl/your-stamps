(() => {
  const GALLERY_KEY = 'stampai_gallery';
  const PANEL_ID = 'one-shot-stamps-panel-v2';

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const splitText = (text) => String(text || '').replace(/\r\n/g, '\n').split('\n').slice(0, 2);

  const removeWhitePaperBackground = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      if (brightness > 246 && saturation < 18) {
        data[i + 3] = 0;
      } else if (brightness > 232 && saturation < 20) {
        data[i + 3] = Math.min(data[i + 3], Math.max(0, Math.min(255, (246 - brightness) * 12)));
      } else if (brightness > 218 && saturation < 14) {
        data[i + 3] = Math.min(data[i + 3], Math.max(24, Math.min(140, (232 - brightness) * 10)));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const composeSticker = async (imageSrc, text) => {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lines = splitText(text).filter(Boolean);
    const hasTwoLines = lines.length >= 2;
    const imageSize = hasTwoLines ? 188 : 210;
    const scale = Math.min(imageSize / img.width, imageSize / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (canvas.width - drawW) / 2;
    const y = hasTwoLines ? 2 : 6;
    ctx.drawImage(img, x, y, drawW, drawH);
    removeWhitePaperBackground(ctx, canvas.width, canvas.height);

    if (lines.length > 0) {
      const fontSize = lines.length === 1 ? 34 : 23;
      const lineHeight = lines.length === 1 ? 34 : 27;
      ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = lines.length === 1 ? 7 : 5;
      const startY = lines.length === 1 ? 236 : 214;
      lines.forEach((line, index) => {
        const lineY = startY + index * lineHeight;
        ctx.strokeText(line, canvas.width / 2, lineY);
        ctx.fillText(line, canvas.width / 2, lineY);
      });
    }

    return canvas.toDataURL('image/png');
  };

  const getGallery = () => {
    try { return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]'); }
    catch { return []; }
  };

  const saveToGallery = (dataUrlList) => {
    const now = new Date().toISOString();
    const newItems = dataUrlList.map((data, index) => ({
      id: `oneshot-${Date.now()}-${index}`,
      data,
      date: now,
    }));
    localStorage.setItem(GALLERY_KEY, JSON.stringify([...newItems, ...getGallery()]));
  };

  const generatePlan = async (intent) => {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'スタンプ案の作成に失敗しました。');
    }
    return response.json();
  };

  const generateImages = async (prompt, expressions) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        count: expressions.length,
        customExpressions: expressions,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '画像生成に失敗しました。');
    }
    const data = await response.json();
    return data.results || [];
  };

  const setStatus = (panel, message) => {
    const status = panel.querySelector('[data-oneshot-status]');
    if (status) status.textContent = message;
  };

  const setMode = (panel, mode) => {
    panel.dataset.mode = mode;
    panel.querySelectorAll('[data-mode-button]').forEach((button) => {
      const active = button.dataset.modeButton === mode;
      button.style.background = active ? '#16a34a' : '#ffffff';
      button.style.color = active ? '#ffffff' : '#475569';
      button.style.borderColor = active ? '#16a34a' : '#e2e8f0';
    });
    const fileBox = panel.querySelector('[data-file-box]');
    const aiNote = panel.querySelector('[data-ai-note]');
    if (fileBox) fileBox.style.display = mode === 'direct' ? 'block' : 'none';
    if (aiNote) aiNote.style.display = mode === 'ai' ? 'block' : 'none';
  };

  const renderResults = (panel, plan, stickers) => {
    const resultArea = panel.querySelector('[data-oneshot-results]');
    resultArea.innerHTML = '';

    const meta = document.createElement('details');
    meta.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin:12px 0;font-size:12px;color:#475569;line-height:1.6;';
    meta.innerHTML = `
      <summary style="cursor:pointer;font-weight:900;color:#0f172a;">申請文案を見る</summary>
      <div style="margin-top:8px;"><b>日本語タイトル:</b> ${plan.japaneseTitle}</div>
      <div><b>日本語説明:</b> ${plan.japaneseDescription}</div>
      <div><b>English Title:</b> ${plan.englishTitle}</div>
      <div><b>English Description:</b> ${plan.englishDescription}</div>
    `;
    resultArea.appendChild(meta);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;';
    stickers.forEach((src, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = 'border:2px solid #e2e8f0;border-radius:16px;background:white;padding:8px;text-align:left;';
      item.innerHTML = `
        <img src="${src}" style="width:100%;aspect-ratio:1/1;object-fit:contain;background:#f8fafc;border-radius:12px;" />
        <div style="font-size:11px;font-weight:900;color:#0f172a;margin-top:6px;">${String(index + 1).padStart(2, '0')}. ${plan.items[index]?.text || ''}</div>
      `;
      item.addEventListener('click', () => {
        item.dataset.selected = item.dataset.selected === 'true' ? 'false' : 'true';
        item.style.borderColor = item.dataset.selected === 'true' ? '#16a34a' : '#e2e8f0';
        item.style.background = item.dataset.selected === 'true' ? '#ecfdf5' : 'white';
      });
      grid.appendChild(item);
    });
    resultArea.appendChild(grid);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;';
    actions.innerHTML = `
      <button data-save-selected type="button" style="flex:1;min-width:180px;padding:12px;border-radius:14px;background:#16a34a;color:white;font-weight:900;border:none;">選んだものを保存</button>
      <button data-clear-results type="button" style="padding:12px;border-radius:14px;background:#f1f5f9;color:#475569;font-weight:900;border:none;">閉じる</button>
    `;
    resultArea.appendChild(actions);

    actions.querySelector('[data-save-selected]').addEventListener('click', () => {
      const selected = [...grid.querySelectorAll('button')]
        .map((button, index) => ({ button, index }))
        .filter(({ button }) => button.dataset.selected === 'true')
        .map(({ index }) => stickers[index]);
      const targets = selected.length > 0 ? selected : stickers;
      saveToGallery(targets);
      setStatus(panel, `${targets.length}個を保存済みに追加しました。保存済みタブで確認してください。`);
    });

    actions.querySelector('[data-clear-results]').addEventListener('click', () => {
      resultArea.innerHTML = '';
      setStatus(panel, '');
    });
  };

  const injectPanel = () => {
    if (document.getElementById(PANEL_ID)) return;
    const main = document.querySelector('main');
    if (!main) return;

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.dataset.mode = 'ai';
    panel.style.cssText = 'background:white;border:1px solid #bbf7d0;border-radius:24px;padding:14px;box-shadow:0 8px 24px rgba(15,23,42,.07);margin-bottom:14px;';
    panel.innerHTML = `
      <details data-oneshot-details>
        <summary style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none;">
          <div>
            <div style="font-size:18px;font-weight:1000;color:#0f172a;letter-spacing:-.03em;">申請セットを一気に作る</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">8個生成・文字入れ・透過・申請文案まで</div>
          </div>
          <div style="font-size:11px;font-weight:900;color:#047857;background:#ecfdf5;border-radius:999px;padding:6px 10px;white-space:nowrap;">開く</div>
        </summary>
        <div style="padding-top:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            <button data-mode-button="ai" type="button" style="padding:10px;border-radius:14px;border:1px solid #16a34a;background:#16a34a;color:white;font-weight:900;text-align:left;">AIで8個作る<br><span style="font-size:10px;font-weight:600;opacity:.85;">画像もそれぞれ生成</span></button>
            <button data-mode-button="direct" type="button" style="padding:10px;border-radius:14px;border:1px solid #e2e8f0;background:white;color:#475569;font-weight:900;text-align:left;">画像そのまま8個<br><span style="font-size:10px;font-weight:600;opacity:.85;">同じ絵に文字だけ変更</span></button>
          </div>
          <textarea data-oneshot-intent rows="3" placeholder="何を伝えるスタンプにする？ 例：寝る前に使う、家族にやさしくお願いする、ありがとうを多めにする" style="width:100%;padding:12px;border-radius:16px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;line-height:1.6;resize:none;outline:none;box-sizing:border-box;"></textarea>
          <div data-ai-note style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.5;">AIで8個作る場合、参考画像は使いません。別キャラ混入を避けるためです。</div>
          <div data-file-box style="display:none;margin-top:10px;">
            <label style="display:block;padding:12px;border-radius:16px;border:1px dashed #bbf7d0;background:#f0fdf4;color:#047857;font-weight:900;text-align:center;font-size:13px;cursor:pointer;">
              手描き画像・子どもの絵を選ぶ
              <input data-oneshot-file type="file" accept="image/*" style="display:none;" />
            </label>
            <div data-oneshot-file-name style="font-size:11px;color:#64748b;margin-top:6px;"></div>
          </div>
          <button data-oneshot-run type="button" style="width:100%;margin-top:10px;padding:13px;border-radius:16px;background:#16a34a;color:white;font-weight:1000;border:none;font-size:14px;">作成する</button>
          <div data-oneshot-status style="font-size:12px;color:#64748b;margin-top:10px;line-height:1.6;"></div>
          <div data-oneshot-results></div>
        </div>
      </details>
    `;

    main.insertBefore(panel, main.firstChild?.nextSibling || main.firstChild);

    let referenceImage = null;

    panel.querySelectorAll('[data-mode-button]').forEach((button) => {
      button.addEventListener('click', () => setMode(panel, button.dataset.modeButton));
    });

    panel.querySelector('[data-oneshot-file]').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      referenceImage = await readFileAsDataUrl(file);
      panel.querySelector('[data-oneshot-file-name]').textContent = `選択中: ${file.name}`;
    });

    panel.querySelector('[data-oneshot-run]').addEventListener('click', async () => {
      const intent = panel.querySelector('[data-oneshot-intent]').value.trim();
      const mode = panel.dataset.mode || 'ai';
      if (!intent) return alert('何を伝えるスタンプにするか入力してください。');
      if (mode === 'direct' && !referenceImage) return alert('画像そのままモードでは、先に画像を選んでください。');

      const button = panel.querySelector('[data-oneshot-run]');
      button.disabled = true;
      button.textContent = '作成中…';
      panel.querySelector('[data-oneshot-results]').innerHTML = '';

      try {
        setStatus(panel, '言葉を整理しています…');
        const plan = await generatePlan(intent);
        let images = [];
        if (mode === 'direct') {
          setStatus(panel, '選んだ画像に8種類の文字を載せています…');
          images = Array.from({ length: 8 }, () => referenceImage);
        } else {
          setStatus(panel, '8個の画像を生成しています…');
          const expressions = plan.items.map((item) => `${item.expression}. Do not render text in image; text will be added later.`);
          const prompt = `${plan.stylePrompt}. User intent: ${intent}`.slice(0, 300);
          images = await generateImages(prompt, expressions);
        }
        setStatus(panel, '文字入れと透過処理をしています…');
        const stickers = await Promise.all(images.slice(0, 8).map((image, index) => composeSticker(image, plan.items[index]?.text || '')));
        renderResults(panel, plan, stickers);
        setStatus(panel, '完成。使う画像を選んで保存できます。未選択なら8個全部保存します。');
      } catch (error) {
        console.error(error);
        setStatus(panel, error?.message || '作成に失敗しました。');
      } finally {
        button.disabled = false;
        button.textContent = '作成する';
      }
    });
  };

  const observer = new MutationObserver(injectPanel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', injectPanel);
  setInterval(injectPanel, 1500);
})();
