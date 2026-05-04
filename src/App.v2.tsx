import React, { useRef, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { generateStickerSet } from './lib/gemini';
import { COLORS, FONTS } from './constants/sticker';
import { useGallery } from './hooks/useGallery';
import { useGenerationLimit } from './hooks/useGenerationLimit';
import { normalizeStickerText, splitStickerText } from './utils/text';
import { downloadDataUrl } from './utils/imageExport';
import { FontPicker } from './components/sticker/FontPicker';
import { ColorPicker } from './components/sticker/ColorPicker';
import { ExportPanel } from './components/sticker/ExportPanel';

type Tab = 'generate' | 'edit' | 'saved';

function drawStickerToCanvas(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  text: string,
  font: string,
  color: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.onload = async () => {
    if ('fonts' in document) {
      await (document as any).fonts.ready;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imageSize = 220;
    const x = (canvas.width - imageSize) / 2;
    const y = 8;
    ctx.drawImage(img, x, y, imageSize, imageSize);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const lines = splitStickerText(text).filter(Boolean);
    if (lines.length > 0) {
      const fontSize = lines.length === 1 ? 34 : 28;
      ctx.font = `bold ${fontSize}px ${font}, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.strokeStyle = color === '#FFFFFF' ? '#000000' : '#FFFFFF';
      ctx.lineWidth = 6;
      const startY = lines.length === 1 ? 244 : 232;
      lines.forEach((line, index) => {
        const lineY = startY + index * 34;
        ctx.strokeText(line, canvas.width / 2, lineY);
        ctx.fillText(line, canvas.width / 2, lineY);
      });
    }
  };
  img.src = imageSrc;
}

function StickerCanvas({
  image,
  text,
  font,
  color,
  onSave,
}: {
  image: string;
  text: string;
  font: string;
  color: string;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current || !image) return;
    drawStickerToCanvas(canvasRef.current, image, text, font, color);
  }, [image, text, font, color]);

  return (
    <div className="space-y-3">
      <div className="canvas-container w-[320px] h-[270px] mx-auto bg-white">
        <canvas ref={canvasRef} width={320} height={270} className="w-full h-full" />
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-1 py-0.5 rounded">
          320x270
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!canvasRef.current) return;
          onSave(canvasRef.current.toDataURL('image/png'));
        }}
        className="w-full py-3 rounded-2xl bg-green-600 text-white font-bold shadow-lg shadow-green-100 active:scale-95"
      >
        スタンプに追加
      </button>
    </div>
  );
}

export default function AppV2() {
  const [tab, setTab] = useState<Tab>('generate');
  const [prompt, setPrompt] = useState('');
  const [variations, setVariations] = useState('');
  const [loading, setLoading] = useState(false);
  const [chars, setChars] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickerText, setStickerText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].family);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { gallery, addGalleryItem, deleteGalleryItem } = useGallery();
  const { count, limit, canGenerate, consumeGeneration } = useGenerationLimit();

  const generate = async (countToGenerate: number) => {
    if (!prompt.trim()) return;
    if (!canGenerate) {
      alert('無料生成は3回までです。作成済み画像の文字入れ・保存・申請準備は引き続き使えます。');
      return;
    }

    const customExpressions = variations.trim()
      ? variations.split(/[、,]+/).map((item) => item.trim()).filter(Boolean)
      : undefined;

    if (!consumeGeneration()) return;

    setLoading(true);
    try {
      const results = await generateStickerSet(
        prompt,
        customExpressions ? customExpressions.length : countToGenerate,
        refImage || undefined,
        customExpressions,
      );
      setChars((prev) => [...results, ...prev]);
      setSelectedImage(results[0]);
      setTab('edit');
      setPrompt('');
      setVariations('');
      setRefImage(null);
    } catch (error: any) {
      alert(error?.message || '生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const saveSticker = (dataUrl: string) => {
    addGalleryItem(dataUrl);
    setTab('saved');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black tracking-tight">Your Stamps v2</div>
            <div className="text-[11px] text-slate-500">申請前の下ごしらえツール</div>
          </div>
          <a
            href="/line-sticker-guide.html"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm"
          >
            申請ガイド
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <nav className="grid grid-cols-3 gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-minimal">
          {[
            ['generate', '生成'],
            ['edit', '文字入れ'],
            ['saved', '保存済み'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as Tab)}
              className={`py-2 rounded-xl text-sm font-bold ${tab === key ? 'bg-green-600 text-white' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'generate' && (
          <section className="bg-white rounded-[28px] border border-slate-100 shadow-strong p-5 space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black">キャラを生成</h1>
              <p className="text-sm text-slate-500">無料生成 {Math.min(count, limit)}/{limit} 回</p>
            </div>

            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="例: 白いくま、ゆるい猫、箱を持つモンスター"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-green-500"
            />
            <input
              value={variations}
              onChange={(event) => setVariations(event.target.value)}
              placeholder="表情指定：例) 喜ぶ, あやまる, 眠い"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-green-500 text-sm"
            />

            {refImage ? (
              <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-green-500 relative">
                <img src={refImage} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setRefImage(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full px-2">×</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold flex items-center justify-center gap-2"
              >
                <ImageIcon size={18} /> 参考画像を使う
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (readerEvent) => setRefImage(readerEvent.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => generate(1)}
                disabled={loading || !prompt.trim()}
                className="py-3 rounded-2xl bg-white border border-slate-200 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} 1つ生成
              </button>
              <button
                type="button"
                onClick={() => generate(4)}
                disabled={loading || !prompt.trim()}
                className="py-3 rounded-2xl bg-green-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} 4表情
              </button>
            </div>

            {chars.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold mb-2">生成履歴</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {chars.map((img, index) => (
                    <button
                      key={`${img.slice(0, 16)}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedImage(img);
                        setTab('edit');
                      }}
                      className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 bg-white"
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'edit' && (
          <section className="bg-white rounded-[28px] border border-slate-100 shadow-strong p-5 space-y-4">
            {selectedImage ? (
              <>
                <StickerCanvas image={selectedImage} text={stickerText} font={selectedFont} color={selectedColor} onSave={saveSticker} />
                <textarea
                  value={stickerText}
                  onChange={(event) => setStickerText(normalizeStickerText(event.target.value))}
                  placeholder="文字入力（2行まで）"
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-green-500 text-sm resize-none"
                />
                <p className="text-[11px] text-slate-400">改行は2行まで。長すぎる文字は少し短くしてね。</p>
                <FontPicker value={selectedFont} onChange={(font) => setSelectedFont(font)} />
                <ColorPicker value={selectedColor} onChange={setSelectedColor} />
              </>
            ) : (
              <div className="text-center py-12 space-y-3">
                <div className="text-slate-400">先にキャラを生成してください。</div>
                <button type="button" onClick={() => setTab('generate')} className="px-4 py-2 rounded-full bg-green-600 text-white font-bold text-sm">
                  生成へ
                </button>
              </div>
            )}
          </section>
        )}

        {tab === 'saved' && (
          <section className="space-y-4">
            <ExportPanel gallery={gallery} />
            {gallery.length === 0 ? (
              <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center text-slate-400">
                まだ保存済みスタンプがありません。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {gallery.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-3 shadow-minimal space-y-2">
                    <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
                      <img src={item.data} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">{String(index + 1).padStart(2, '0')}.png</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDataUrl(item.data, `${String(index + 1).padStart(2, '0')}.png`)}
                        className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGalleryItem(item.id)}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
