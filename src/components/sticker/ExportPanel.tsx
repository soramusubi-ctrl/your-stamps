import type { GalleryItem } from '../../types/sticker';
import { downloadMainImage, downloadTabImage } from '../../utils/imageExport';

type ExportPanelProps = {
  gallery: GalleryItem[];
};

export function ExportPanel({ gallery }: ExportPanelProps) {
  const latest = gallery[0];

  const handleMain = async () => {
    if (!latest?.data) {
      alert('保存済みスタンプがありません。先にスタンプを保存してください。');
      return;
    }
    await downloadMainImage(latest.data);
  };

  const handleTab = async () => {
    if (!latest?.data) {
      alert('保存済みスタンプがありません。先にスタンプを保存してください。');
      return;
    }
    await downloadTabImage(latest.data);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-minimal">
      <div className="font-bold text-slate-900 mb-1">申請用画像を書き出し</div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        保存済みの最新スタンプから、LINE申請用の main.png と tab.png を作ります。
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleMain}
          className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold shadow-sm active:scale-95"
        >
          main.png 生成
        </button>
        <button
          type="button"
          onClick={handleTab}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm active:scale-95"
        >
          tab.png 生成
        </button>
      </div>
    </div>
  );
}
