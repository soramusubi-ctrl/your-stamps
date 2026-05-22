(() => {
  const GALLERY_KEY = 'stampai_gallery';
  const PANEL_ID = 'one-shot-stamps-panel';

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

  const generateImages = async (prompt, referenceImageBase64, expressions) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        count: expressions.length,
        referenceImageBase64,
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

  const renderResults = (panel, plan, stickers) => {
    const resultArea = panel.querySelector('[data-oneshot-results]');
    resultArea.innerHTML = '';

    const meta = document.createElement('div');
    meta.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin:12px 0;font-size:12px;color:#475569;line-height:1.6;';
    meta.innerHTML = `
      <div style="font-weight:900;color:#0f172a;margin-bottom:4px;">申請文案</div>
      <div><b>日本語タイトル:</b> ${plan.japaneseTitle}</div>
      <div><b>日本語説明:</b> ${plan.japaneseDescription}</div>
      <div><b>English Title:</b> ${plan.englishTitle}</div>
      <div><b>English Description:</b> ${plan.englishDescription}</div>
    `;
    resultArea.appendChild(meta);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;';
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

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = '選んだものを保存済みに追加';
    saveButton.style.cssText = 'width:100%;margin-top:12px;padding:12px;border-radius:14px;background:#16a34a;color:white;font-weight:900;border:none;';
    saveButton.addEventListener('click', () => {
      const selected = [...grid.querySelectorAll('button')].map((button, index) => ({ button, index })).filter(({ button }) => button.dataset.selected === 'true').map(({ index }) => stickers[index]);
      const targets = selected.length > 0 ? selected : stickers;
      saveToGallery(targets);
      setStatus(panel, `${targets.length}個を保存済みに追加しました。保存済みタブを開いて確認してください。`);
    });
    resultArea.appendChild(saveButton);
  };

  const injectPanel = () => {
    if (document.getElementById(PANEL_ID)) return;
    const main = document.querySelector('main');
    if (!main) return;

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.style.cssText = 'background:white;border:1px solid #bbf7d0;border-radius:28px;padding:18px;box-shadow:0 10px 28px rgba(15,23,42,.08);margin-bottom:16px;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:20px;font-weight:1000;color:#0f172a;letter-spacing:-.03em;">一気に8個作る</div>
          <div style="font-size:12px;color:#64748b;line-height:1.5;">伝えたいことから、文字入りスタンプ8個と申請文案をまとめて作ります。</div>
        </div>
        <div style="font-size:11px;font-weight:900;color:#047857;background:#ecfdf5;border-radius:999px;padding:6px 10px;white-space:nowrap;">vNext</div>
      </div>
      <textarea data-oneshot-intent rows="3" placeholder="何を伝えるスタンプにする？ 例：家族にやさしくお願いしたい。ありがとう、ごめん、今日は限界、外食希望など。" style="width:100%;padding:12px;border-radius:16px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;line-height:1.6;resize:none;outline:none;"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <label style="flex:1;min-width:180px;padding:12px;border-radius:16px;border:1px dashed #bbf7d0;background:#f0fdf4;color:#047857;font-weight:900;text-align:center;font-size:13px;cursor:pointer;">
          参考画像を添付
          <input data-oneshot-file type="file" accept="image/*" style="display:none;" />
        </label>
        <button data-oneshot-run type="button" style="flex:2;min-width:180px;padding:12px;border-radius:16px;background:#16a34a;color:white;font-weight:1000;border:none;font-size:14px;">8個まとめて作る</button>
      </div>
      <div data-oneshot-file-name style="font-size:11px;color:#64748b;margin-top:6px;"></div>
      <div data-oneshot-status style="font-size:12px;color:#64748b;margin-top:10px;line-height:1.6;"></div>
      <div data-oneshot-results></div>
    `;

    main.insertBefore(panel, main.firstChild?.nextSibling || main.firstChild);

    let referenceImage = null;
    panel.querySelector('[data-oneshot-file]').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      referenceImage = await readFileAsDataUrl(file);
      panel.querySelector('[data-oneshot-file-name]').textContent = `参考画像: ${file.name}`;
    });

    panel.querySelector('[data-oneshot-run]').addEventListener('click', async () => {
      const intent = panel.querySelector('[data-oneshot-intent]').value.trim();
      if (!intent) return alert('何を伝えるスタンプにするか入力してください。');
      const button = panel.querySelector('[data-oneshot-run]');
      button.disabled = true;
      button.textContent = '作成中…';
      panel.querySelector('[data-oneshot-results]').innerHTML = '';
      try {
        setStatus(panel, '言葉と雰囲気を読み取っています…');
        const plan = await generatePlan(intent);
        setStatus(panel, '8個のスタンプ画像を生成しています…少し待ってね。');
        const expressions = plan.items.map((item) => `${item.expression}. The sticker message is: ${item.text}. Do not render text in image; text will be added later.`);
        const prompt = `${plan.stylePrompt}. User intent: ${intent}`.slice(0, 300);
        const images = await generateImages(prompt, referenceImage, expressions);
        setStatus(panel, '文字を載せて透過処理しています…');
        const stickers = await Promise.all(images.slice(0, 8).map((image, index) => composeSticker(image, plan.items[index]?.text || '')));
        renderResults(panel, plan, stickers);
        setStatus(panel, '完成。気に入ったものを選んで保存済みに追加できます。未選択なら8個全部保存します。');
      } catch (error) {
        console.error(error);
        setStatus(panel, error?.message || '作成に失敗しました。');
      } finally {
        button.disabled = false;
        button.textContent = '8個まとめて作る';
      }
    });
  };

  const observer = new MutationObserver(injectPanel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', injectPanel);
  setInterval(injectPanel, 1500);
})();
