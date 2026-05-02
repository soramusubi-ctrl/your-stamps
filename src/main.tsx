import {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ApplicationGuideView from './components/ApplicationGuideView.tsx';
import './index.css';

function Root() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <App />
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="fixed right-4 bottom-20 md:bottom-4 z-[80] rounded-full bg-green-600 px-4 py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 active:scale-95"
        aria-label="申請ガイドを開く"
      >
        申請ガイド
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <div className="sticky top-3 z-[110] flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-lg transition hover:bg-slate-100"
              >
                閉じる
              </button>
            </div>
            <ApplicationGuideView />
          </div>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
