import { FONTS } from '../../constants/sticker';

type FontPickerProps = {
  value: string;
  onChange: (fontFamily: string, fontVar: string) => void;
};

export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-slate-500">フォント</div>
      <div className="flex gap-3 overflow-x-auto pb-2 py-1">
        {FONTS.map((font) => (
          <button
            key={font.name}
            type="button"
            onClick={() => onChange(font.family, font.fontVar)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-xl border transition-all ${
              value === font.family
                ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-100'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span
              style={{ fontFamily: font.fontVar }}
              className={`text-sm font-bold ${value === font.family ? 'text-white' : 'text-slate-800'}`}
            >
              あ
            </span>
            <span className="text-[9px] font-bold uppercase truncate w-full text-center">
              {font.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
