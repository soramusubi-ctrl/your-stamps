/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Type, 
  Eye, 
  Download, 
  BookOpen, 
  Plus, 
  Loader2, 
  Trash2, 
  Check, 
  ChevronRight,
  Info,
  Layers,
  Image as ImageIcon,
  Library,
  X
} from 'lucide-react';
import { generateCharacterImage, generateStickerSet } from './lib/gemini.ts';

// --- Types ---

interface StickerState {
  id: string;
  imageData: string; // Base64
  text: string;
  font: string;
  color: string;
  position: { x: number; y: number };
}

// --- Constants ---

const FONTS = [
  { name: 'まる', family: '"M PLUS Rounded 1c"', fontVar: 'var(--font-rounded)' },
  { name: 'ロック', family: '"RocknRoll One"', fontVar: 'var(--font-rock)' },
  { name: 'ポップ', family: '"Hachi Maru Pop"', fontVar: 'var(--font-hachi)' },
  { name: 'キウイ', family: '"Kiwi Maru"', fontVar: 'var(--font-kiwi)' },
  { name: 'ドット', family: '"DotGothic16"', fontVar: 'var(--font-dot)' },
  { name: 'カイセイ', family: '"Kaisei Decol"', fontVar: 'var(--font-kaisei)' },
  { name: 'ゴシック', family: '"Sawarabi Gothic"', fontVar: 'var(--font-gothic)' },
];

const COLORS = [
  '#000000', '#FFFFFF', '#FF4D4D', '#4DFF4D', '#4D4DFF', '#FFFF4D', '#FF4DFF', '#4DFFFF'
];

// --- Components ---

const CanvasEditor = ({ 
  image, 
  text, 
  font, 
  color, 
  onSave,
  onReset 
}: { 
  image: string; 
  text: string; 
  font: string; 
  color: string; 
  onSave: (dataUrl: string) => void;
  onReset: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textPos, setTextPos] = useState({ x: 160, y: 240 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = image;
    img.onload = async () => {
      // Ensure font is loaded
      if ('fonts' in document) {
        await (document as any).fonts.ready;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image (scale down to fit 270 height while maintaining aspect)
      // Original is 1:1 (320x320) but canvas is 320x270.
      // We'll scale it to stay centered.
      const scale = 220 / 320;
      const x = (320 - 320 * scale) / 2;
      const y = 10;
      ctx.drawImage(img, x, y, 320 * scale, 320 * scale);

      // Background removal (white to transparent)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 245 && data[i+1] > 245 && data[i+2] > 245) {
          data[i+3] = 0; 
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw text
      if (text) {
        // Redraw again slightly later to handle potential font loading delay if the promise wasn't enough
        ctx.font = `bold 36px ${font}, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.strokeStyle = color === '#FFFFFF' ? '#000000' : '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.strokeText(text, textPos.x, textPos.y);
        ctx.fillText(text, textPos.x, textPos.y);
      }
    };
  }, [image, text, font, color, textPos]);

  const handleExport = () => {
    if (!canvasRef.current) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="canvas-container w-[320px] h-[270px] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-gray-200 sticker-shadow">
        <canvas 
          ref={canvasRef} 
          width={320} 
          height={270} 
          className="w-full h-full"
        />
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-1 py-0.5 rounded">
          320x270
        </div>
      </div>
      
      <div className="flex gap-2 w-full">
        <button 
          onClick={onReset}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={18} />
          リセット
        </button>
        <button 
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          スタンプに追加
        </button>
      </div>
    </div>
  );
};

const GuideView = () => {
  const steps = [
    { title: "スタンプ情報の登録", desc: "LINE Creators Marketにログインし、新規作成をクリックします。" },
    { title: "画像のアップロード", desc: "メイン画像(1枚)、スタンプ画像(8,16,24,32,40枚)、トークルームタブ画像(1枚)を用意します。" },
    { title: "販売情報の入力", desc: "タイトル、説明文、クリエイター名などを入力します。" },
    { title: "審査のリクエスト", desc: "全て入力したら「リクエスト」ボタンを押して審査を待ちます。" },
    { title: "リリース・販売開始", desc: "承認されたら「リリース」ボタンを押して販売ページを公開します。" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8">
      <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-strong border border-white">
        <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-xl">
            <BookOpen className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
          </div>
          LINEスタンプ申請ガイド
        </h2>
        
        <div className="space-y-4 md:space-y-6 relative">
          <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-slate-100 hidden sm:block"></div>
          
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 items-start relative bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm md:text-base flex-shrink-0 z-10 shadow-lg shadow-green-100">
                {i + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{step.title}</h3>
                <p className="text-slate-500 text-xs md:text-sm mt-1.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 md:mt-10 p-5 md:p-6 bg-green-50 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/20 rounded-full -mr-12 -mt-12"></div>
          <h4 className="font-bold text-green-800 flex items-center gap-2 mb-3 relative">
            <Info size={18} className="text-green-600" />
            制作上の注意点
          </h4>
          <ul className="text-xs md:text-sm text-green-800 space-y-2 relative list-none">
            {[
              "背景は必ず透過(Transparent)にしてください。",
              "画像の周囲には10px程度の余白が必要です。",
              "偶数サイズ(px)で作成する必要があります。",
              "著作権や公序良俗に反する内容はNGです。"
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-2">
                <Check size={12} className="text-green-500 flex-shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const MyGalleryView = ({ items, onDelete }: { items: {id: string, data: string, date: string}[], onDelete: (id: string) => void }) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-4 md:py-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-xl">
            <Library className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
          </div>
          マイスタンプ
        </h2>
        <span className="bg-slate-100 text-slate-500 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-12 md:p-20 rounded-[32px] border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-6 bg-slate-50 rounded-full text-slate-300">
            <Plus size={48} />
          </div>
          <h3 className="font-bold text-slate-400">まだスタンプがありません</h3>
          <p className="text-slate-400 text-sm max-w-xs">「作成」タブでスタンプを作成して保存すると、ここに表示されます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-3 rounded-2xl shadow-minimal border border-slate-100 group relative"
            >
              <div className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
                <img src={item.data} alt="Saved Sticker" className="w-full h-full object-contain" />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `stampai-${item.id}.png`;
                    link.href = item.data;
                    link.click();
                  }}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 transition-colors"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-green-500 text-[8px] text-white font-bold px-1.5 py-0.5 rounded shadow-sm">
                  SAVED
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'character' | 'text' | 'preview' | 'guide' | 'my-stickers'>('character');
  const [chars, setChars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [variations, setVariations] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Editor State
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [stickerText, setStickerText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].family);
  const [selectedFontVar, setSelectedFontVar] = useState(FONTS[0].fontVar);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  // Final Stickers (Work in Progress set)
  const [finalStickers, setFinalStickers] = useState<string[]>([]);
  
  // Persistent Gallery
  const [gallery, setGallery] = useState<{id: string, data: string, date: string}[]>([]);

  // Persistence logic
  useEffect(() => {
    const saved = localStorage.getItem('stampai_gallery');
    if (saved) {
      try {
        setGallery(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load gallery", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('stampai_gallery', JSON.stringify(gallery));
  }, [gallery]);

  const handleGenerate = async (count: number = 1) => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      // Split variations by comma if provided
      const customExpr = variations.trim() 
        ? variations.split(/[、,]+/).map(v => v.trim()) 
        : undefined;

      const results = await generateStickerSet(
        prompt, 
        customExpr ? customExpr.length : count, 
        refImage || undefined,
        customExpr
      );

      setChars(prev => [...results, ...prev]);
      
      // If single and no custom variations, go to editor.
      if (count === 1 && !customExpr) {
        setSelectedImg(results[0]);
        setActiveTab('text');
      }
      
      setPrompt('');
      setVariations('');
      setRefImage(null);
    } catch (e: any) {
      const msg = e?.message || "生成に失敗しました。";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveSticker = (dataUrl: string) => {
    setFinalStickers(prev => [dataUrl, ...prev].slice(0, 4));
    // Also save to permanent gallery
    const newItem = {
      id: Math.random().toString(36).substring(7),
      data: dataUrl,
      date: new Date().toISOString()
    };
    setGallery(prev => [newItem, ...prev]);
    setActiveTab('preview');
  };

  const deleteFromGallery = (id: string) => {
    setGallery(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden font-sans text-slate-800 bg-slate-50">
      {/* Navigation: Side Rail (Desktop) / Bottom Nav (Mobile) */}
      <aside className="fixed bottom-0 left-0 w-full md:relative md:w-20 bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center py-2 md:py-6 gap-2 md:gap-8 flex-shrink-0 z-50">
        <div className="hidden md:flex w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-4">SL</div>
        
        <NavRailButton 
          active={activeTab === 'character'} 
          onClick={() => setActiveTab('character')} 
          icon={<Sparkles size={20} />} 
          label="キャラ" 
        />
        <NavRailButton 
          active={activeTab === 'text'} 
          onClick={() => setActiveTab('text')} 
          icon={<Type size={20} />} 
          label="作成" 
        />
        <NavRailButton 
          active={activeTab === 'preview'} 
          onClick={() => setActiveTab('preview')} 
          icon={<Eye size={20} />} 
          label="確認" 
        />
        <NavRailButton 
          active={activeTab === 'my-stickers'} 
          onClick={() => setActiveTab('my-stickers')} 
          icon={<Library size={20} />} 
          label="保存済み" 
        />
        <NavRailButton 
          active={activeTab === 'guide'} 
          onClick={() => setActiveTab('guide')} 
          icon={<BookOpen size={20} />} 
          label="手順" 
          className="md:mt-auto"
        />
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <h1 className="text-sm md:text-lg font-semibold flex items-center gap-1 md:gap-2">
            <span className="text-slate-400 hidden sm:inline">StampAI /</span> 
            {activeTab === 'character' ? 'キャラ生成' : 
             activeTab === 'text' ? '編集' : 
             activeTab === 'preview' ? '確認' : 
             activeTab === 'my-stickers' ? '保存済み' : '手順'}
          </h1>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="hidden sm:block px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">下書き</button>
            <button 
              onClick={() => {
                if (finalStickers.length > 0) {
                  setActiveTab('preview');
                } else {
                  alert("保存するスタンプがありません");
                }
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-[#06C755] hover:bg-[#05b04a] text-white text-xs md:text-sm font-bold rounded-lg shadow-md transition-all active:scale-95"
            >
              保存
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 p-4 md:p-8 flex justify-center bg-slate-100 relative overflow-y-auto">
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <AnimatePresence mode="wait">
              {activeTab === 'character' && (
                <motion.div 
                  key="character"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-lg my-auto"
                >
                  <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-strong border border-white space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl md:text-2xl font-bold">キャラを生成</h2>
                      <p className="text-xs md:text-sm text-slate-500">どんなキャラクターが欲しいですか？</p>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="例: 白いくま"
                        className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 focus:border-green-500 focus:bg-white outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />
                    </div>

                    <div className="relative">
                      <input 
                        type="text" 
                        value={variations}
                        onChange={(e) => setVariations(e.target.value)}
                        placeholder="バリエーション指定：例) 寝てる, 喜ぶ (任意)"
                        className="w-full px-4 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl bg-slate-50 border border-slate-100 focus:border-green-500 focus:bg-white outline-none transition-all text-xs md:text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate(variations ? undefined : 1)}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-1 px-1 flex items-center gap-1">
                        <Info size={10} /> カンマ区切りで複数の表情を入力できます
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {refImage ? (
                        <div className="relative w-32 h-32 mx-auto border-2 border-green-500 rounded-xl overflow-hidden shadow-md">
                          <img src={refImage} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setRefImage(null)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-green-600 hover:border-green-200 transition-all text-sm font-bold"
                        >
                          <ImageIcon size={18} />
                          画像を参考にする (オプション)
                        </button>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setRefImage(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleGenerate(1)}
                        disabled={loading || !prompt.trim()}
                        className="w-full py-3 md:py-4 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        1つ生成
                      </button>
                      <button 
                        onClick={() => handleGenerate(4)}
                        disabled={loading || !prompt.trim()}
                        className="w-full py-3 md:py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl md:rounded-2xl transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <Layers size={18} />}
                        4表情セット生成
                      </button>
                    </div>
                    
                    {chars.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">生成履歴</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {chars.map((img, i) => (
                            <button 
                              key={i} 
                              onClick={() => { setSelectedImg(img); setActiveTab('text'); }}
                              className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border border-slate-100 flex-shrink-0"
                            >
                              <img src={img} alt="History" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'text' && (
                <motion.div 
                  key="text"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="relative flex flex-col items-center py-4 my-auto"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-white rounded-[32px] md:rounded-[40px] shadow-strong relative flex items-center justify-center overflow-hidden border-[6px] md:border-[8px] border-white">
                      {selectedImg ? (
                        <CanvasSticker 
                          image={selectedImg} 
                          text={stickerText} 
                          font={selectedFont} 
                          color={selectedColor}
                          onSave={saveSticker}
                          onReset={() => { setStickerText(''); setSelectedFont(FONTS[0].family); setSelectedFontVar(FONTS[0].fontVar); }}
                        />
                      ) : (
                        <div className="text-center p-8 space-y-4">
                          <Plus size={32} className="mx-auto text-slate-300" />
                          <p className="text-slate-400 text-sm">生成から開始してね</p>
                          <button onClick={() => setActiveTab('character')} className="text-green-600 font-bold text-xs">生成へ</button>
                        </div>
                      )}
                    </div>

                    <div className="md:hidden w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                      <input 
                        type="text" 
                        value={stickerText}
                        onChange={(e) => setStickerText(e.target.value)}
                        placeholder="文字入力"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      />
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide py-1">
                        {FONTS.map((f) => (
                          <button 
                            key={f.name}
                            onClick={() => { setSelectedFont(f.family); setSelectedFontVar(f.fontVar); }}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-xl border transition-all ${selectedFont === f.family ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-100' : 'bg-white text-slate-400 border-slate-200'}`}
                          >
                            <span style={{ fontFamily: f.fontVar }} className={`text-sm font-bold ${selectedFont === f.family ? 'text-white' : 'text-slate-800'}`}>あ</span>
                            <span className="text-[9px] font-bold uppercase truncate w-full text-center">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Preview Badge */}
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 md:px-6 md:py-4 rounded-2xl md:rounded-3xl border border-white shadow-strong flex items-center gap-3 md:gap-4">
                      <p className="hidden sm:block text-[10px] uppercase tracking-wider font-bold text-slate-400">Preview</p>
                      <div className="flex gap-1.5 md:gap-2">
                         {finalStickers.map((s, i) => (
                           <div key={i} className="w-8 h-8 md:w-12 md:h-12 bg-white border border-slate-100 rounded-lg md:rounded-xl overflow-hidden shadow-sm">
                             <img src={s} className="w-full h-full object-contain" />
                           </div>
                         ))}
                         {Array.from({ length: 4 - finalStickers.length }).map((_, i) => (
                           <div key={i} className="w-8 h-8 md:w-12 md:h-12 border border-dashed border-slate-200 rounded-lg md:rounded-xl flex items-center justify-center text-slate-300 text-[10px]">
                             +
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preview' && (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="w-full max-w-lg md:max-w-2xl py-2 md:py-10"
                >
                   <div className="bg-[#8BA2BF] p-4 md:p-8 rounded-[40px] md:rounded-[60px] shadow-strong border-[8px] md:border-[16px] border-[#7388A1] relative">
                      <div className="absolute top-2 md:top-4 left-0 w-full px-4 md:px-8 flex justify-between items-center text-[#7388A1] brightness-150 text-[10px] font-bold uppercase tracking-widest opacity-60">
                        <span>Preview</span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        </div>
                      </div>
                      
                      <div className="space-y-4 md:space-y-6 mt-6 md:mt-8 min-h-[300px] md:min-h-[400px]">
                        {finalStickers.length > 0 ? (
                          <div className="flex flex-col gap-4">
                            {finalStickers.map((s, i) => (
                              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                <motion.div 
                                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="bg-white/90 p-0.5 md:p-1 rounded-xl md:rounded-2xl shadow-minimal relative group"
                                >
                                  <img src={s} alt="Sticker" className="w-32 md:w-48 h-auto" />
                                  <button 
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.download = `sticker-${i+1}.png`;
                                      link.href = s;
                                      link.click();
                                    }}
                                    className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-green-500 text-white p-1.5 md:p-2.5 rounded-full shadow-lg shadow-green-200"
                                  >
                                    <Download size={14} className="md:w-[18px] md:h-[18px]" />
                                  </button>
                                </motion.div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-4 text-white/40 h-[300px] md:h-[400px]">
                            <Eye size={48} />
                            <p className="text-sm font-bold">まだありません</p>
                          </div>
                        )}
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'guide' && (
                <motion.div 
                  key="guide"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="w-full"
                >
                  <GuideView />
                </motion.div>
              )}

              {activeTab === 'my-stickers' && (
                <motion.div 
                  key="my-stickers"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full"
                >
                  <MyGalleryView items={gallery} onDelete={deleteFromGallery} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panels (Hidden on Mobile) */}
          <aside className="hidden md:flex w-80 bg-white border-l border-slate-200 flex-col flex-shrink-0">
            {activeTab === 'text' ? (
              <>
                <div className="flex border-b border-slate-100">
                  <button className="flex-1 py-4 text-xs font-bold text-green-600 border-b-2 border-green-500">テキスト</button>
                  <button className="flex-1 py-4 text-xs font-bold text-slate-400">装飾</button>
                </div>

                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">スタンプ文字入力</label>
                    <input 
                      type="text" 
                      value={stickerText}
                      onChange={(e) => setStickerText(e.target.value)}
                      placeholder="お疲れ様！"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:border-green-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">フォント選択</label>
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {FONTS.map((f) => (
                        <button 
                          key={f.name}
                          onClick={() => { setSelectedFont(f.family); setSelectedFontVar(f.fontVar); }}
                          className={`w-full p-4 text-left rounded-xl border transition-all flex items-center justify-between group ${selectedFont === f.family ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase">{f.name}</span>
                            <span style={{ fontFamily: f.fontVar }} className="text-lg font-bold text-slate-800 leading-none">あいうえお</span>
                          </div>
                          {selectedFont === f.family && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">文字色</label>
                    <div className="flex flex-wrap gap-2.5">
                      {COLORS.map((c) => (
                        <button 
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${selectedColor === c ? 'border-green-500' : 'border-transparent shadow-sm'}`}
                          style={{ backgroundColor: c }}
                        >
                          {selectedColor === c && <Check size={14} className={c === '#FFFFFF' ? 'text-black' : 'text-white'} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                     <div className="flex items-center gap-2 mb-2">
                       <Info size={14} className="text-blue-500" />
                       <span className="text-xs font-bold text-blue-700">スタンプ追加の流れ</span>
                     </div>
                     <p className="text-[11px] text-blue-600 leading-relaxed">
                       編集が終わったら中央下の「スタンプに追加」を押して保存してください。最大4つまで登録できます。
                     </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                <Layers size={48} className="text-slate-300" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Panel Contextual</p>
                <p className="text-xs text-slate-400">現在地に合わせて<br/>メニューが表示されます</p>
              </div>
            )}

            {/* Layer List Mock for Text Tab */}
            {activeTab === 'text' && (
              <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">Layers</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-100 shadow-sm">
                    <Type size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold truncate">TEXT: {stickerText || '...'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/50 rounded border border-slate-100 opacity-60">
                    <Sparkles size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold">CHARACTER BODY</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function NavRailButton({ active, onClick, icon, label, className = "" }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`nav-rail-item group ${className}`}
    >
      <div className={`nav-rail-icon ${active ? 'active' : 'group-hover:bg-green-50 group-hover:text-green-600'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
      {active && <motion.div layoutId="nav-pill" className="absolute left-0 w-1 h-8 bg-green-500 rounded-r-full" />}
    </button>
  );
}

// Rename editor component for clarity
const CanvasSticker = CanvasEditor;
