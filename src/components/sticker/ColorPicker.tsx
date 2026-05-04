import { COLORS } from '../../constants/sticker';

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-slate-500">文字色</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`文字色 ${color}`}
            onClick={() => onChange(color)}
            className={`w-9 h-9 rounded-full border-2 flex-shrink-0 shadow-sm transition-all ${
              value === color ? 'border-green-500 scale-110' : 'border-slate-200'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        白文字は黒フチ、黒文字は白フチで読みやすくなります。
      </p>
    </div>
  );
}
