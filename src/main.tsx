import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function Root() {
  return (
    <>
      <App />
      <a
        href="/line-sticker-guide.html"
        target="_blank"
        rel="noreferrer"
        className="fixed right-4 bottom-20 md:bottom-4 z-[80] rounded-full bg-green-600 px-4 py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 active:scale-95"
        aria-label="詳しい申請ガイドを開く"
      >
        申請ガイド
      </a>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
