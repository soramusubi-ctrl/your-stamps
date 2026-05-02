import React from 'react';
import { BookOpen, Check, Info } from 'lucide-react';

const applicationSteps = [
  {
    title: 'LINE Creators Marketにログイン',
    desc: 'ブラウザでLINE Creators Marketを開き、LINEアカウントでログインします。はじめてなら、画面の案内に沿ってクリエイター登録をします。',
    hint: 'ここは「販売する人の名前」を作る入口です。公開してよい名前を使いましょう。',
  },
  {
    title: '新規登録から「スタンプ」を選ぶ',
    desc: '管理画面に入ったら「新規登録」を押します。種類を選ぶ画面では「スタンプ」を選びます。',
    hint: '絵文字や着せかえではなく、今回は「スタンプ」です。',
  },
  {
    title: 'スタンプ情報を入力する',
    desc: 'タイトル、説明文、クリエイター名、コピーライトなどを入力します。販売ページに出る情報なので、読む人に伝わる短い言葉にします。',
    hint: '例: 夫婦や家族のやりとりで使いやすい、やさしい連絡スタンプです。',
  },
  {
    title: '画像をアップロードする',
    desc: 'メイン画像1枚、スタンプ画像8枚・16枚・24枚・32枚・40枚のどれか、トークルームタブ画像1枚をアップロードします。最初は8枚か16枚が作りやすいです。',
    hint: '画像はPNG形式。文字が切れていないか、小さくしても読めるか確認します。',
  },
  {
    title: 'プレビューで確認する',
    desc: '販売ページやトーク画面でどう見えるかを確認します。文字が小さい、端が切れている、白い四角が残っている場合は直します。',
    hint: 'かわいさより先に「読める・切れない・使う場面がある」を見ます。',
  },
  {
    title: '審査をリクエストする',
    desc: '入力と画像を確認したら「リクエスト」または「審査リクエスト」を押します。LINE側の審査が終わるまで待ちます。',
    hint: '承認されたあと、販売開始には「リリース」ボタンが必要な場合があります。',
  },
];

const checklist = [
  'タイトルは、誰が使うスタンプかわかる',
  '説明文は、どんな場面で使うかわかる',
  '文字がスマホ画面でも読める',
  '画像の端が切れていない',
  '背景の白四角が意図せず残っていない',
  '有名キャラ・ロゴ・商標に似すぎていない',
  'LINE公式ツールのように見える名前にしていない',
];

const examples = [
  {
    label: 'タイトル例',
    text: 'こう言ってほしかった夫婦スタンプ',
  },
  {
    label: '説明文例',
    text: '夫婦や家族のやりとりで使いやすい、やさしい連絡スタンプです。帰宅連絡、お願い、ありがとう、体調不良、限界の日の一言まで、責めずに伝えたい場面に使えます。',
  },
  {
    label: 'コピーライト例',
    text: '© Your Stamps',
  },
];

export default function ApplicationGuideView() {
  return (
    <div className="max-w-3xl mx-auto py-4 md:py-8">
      <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-strong border border-white">
        <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-xl">
            <BookOpen className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
          </div>
          はじめての申請ガイド
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6 md:mb-8">
          ここでは、作ったスタンプ画像をLINE Creators Marketに申請するときの流れを、実際の画面で出てくる項目に沿って説明します。
        </p>

        <div className="space-y-4 md:space-y-5">
          {applicationSteps.map((step, i) => (
            <div key={step.title} className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm md:text-base flex-shrink-0 shadow-lg shadow-green-100">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{step.title}</h3>
                  <p className="text-slate-600 text-xs md:text-sm mt-2 leading-relaxed">{step.desc}</p>
                  <div className="mt-3 bg-white rounded-xl border border-slate-100 px-3 py-2 text-[11px] md:text-xs text-slate-500 leading-relaxed flex gap-2">
                    <Info size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{step.hint}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {examples.map((item) => (
            <div key={item.label} className="bg-green-50 border border-green-100 rounded-2xl p-4">
              <h4 className="font-bold text-green-800 text-xs md:text-sm mb-2">{item.label}</h4>
              <p className="text-green-900 text-xs md:text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 md:p-6 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
          <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3 relative">
            <Info size={18} className="text-amber-600" />
            申請前チェック
          </h4>
          <ul className="text-xs md:text-sm text-amber-900 space-y-2 relative list-none">
            {checklist.map((text) => (
              <li key={text} className="flex items-start gap-2">
                <Check size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs md:text-sm text-slate-500 leading-relaxed">
          <strong className="text-slate-700">大事:</strong> このアプリはLINE公式ツールではありません。申請や販売は、最後にLINE Creators Market上で行います。審査通過や売上は保証されません。
        </div>
      </div>
    </div>
  );
}
