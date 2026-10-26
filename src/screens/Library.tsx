import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, Sparkles } from 'lucide-react';
import type { GrammarItem, KanaItem, KanjiItem, ListeningItem, ReadingPassage, VocabItem } from '../core/types.ts';
import { formatDate } from '../core/date.ts';
import {
  GRAMMAR_ITEMS,
  KANA_ITEMS,
  KANJI_ITEMS,
  LISTENING_ITEMS,
  READING_PASSAGES,
  VOCAB_ITEMS,
  CURRICULUM,
} from '../content/index.ts';
import { useActions, useApp } from '../state/store.ts';
import { navigate } from '../lib/router.ts';
import { JapaneseText } from '../ui/JapaneseText.tsx';
import { AudioButton } from '../ui/AudioButton.tsx';
import { OptionList } from '../ui/Options.tsx';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Chip, EmptyState, PageHead } from '../ui/common.tsx';

type Tab = 'kana' | 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening';

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'kana', label: 'Kana', count: KANA_ITEMS.length },
  { id: 'vocab', label: 'Kosakata', count: VOCAB_ITEMS.length },
  { id: 'kanji', label: 'Kanji', count: KANJI_ITEMS.length },
  { id: 'grammar', label: 'Grammar', count: GRAMMAR_ITEMS.length },
  { id: 'reading', label: 'Bacaan', count: READING_PASSAGES.length },
  { id: 'listening', label: 'Menyimak', count: LISTENING_ITEMS.length },
];

export function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('kana');
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return [];
    const matches: { type: Tab; id: string; primary: string; secondary: string; meaning: string }[] = [];
    for (const item of KANA_ITEMS) {
      if (`${item.kana} ${item.romaji}`.toLowerCase().includes(normalized)) {
        matches.push({ type: 'kana', id: item.id, primary: item.kana, secondary: item.romaji, meaning: item.script });
      }
    }
    for (const item of VOCAB_ITEMS) {
      if (`${item.word} ${item.reading} ${item.romaji} ${item.meaning}`.toLowerCase().includes(normalized)) {
        matches.push({ type: 'vocab', id: item.id, primary: item.word, secondary: item.reading, meaning: item.meaning });
      }
    }
    for (const item of KANJI_ITEMS) {
      if (`${item.kanji} ${item.meaning}`.toLowerCase().includes(normalized)) {
        matches.push({ type: 'kanji', id: item.id, primary: item.kanji, secondary: item.meaning, meaning: `kanji · ${item.strokes} goresan` });
      }
    }
    for (const item of GRAMMAR_ITEMS) {
      if (`${item.pattern} ${item.meaning}`.toLowerCase().includes(normalized)) {
        matches.push({ type: 'grammar', id: item.id, primary: item.pattern, secondary: item.meaning, meaning: item.formation });
      }
    }
    return matches.slice(0, 30);
  }, [normalized]);

  return (
    <>
      <TopBar meta="Perpustakaan" />
      <main className="app-main" id="main" tabIndex={-1}>
        <PageHead
          eyebrow="Referensi"
          title="Perpustakaan"
          description="Cari item, lihat konteksnya, lalu tambahkan ke review jika perlu."
        />

        <div className="lib-toolbar">
          <div className="search">
            <Search size={18} aria-hidden />
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kata, kanji, atau pola…"
              aria-label="Cari konten"
            />
          </div>
          {!normalized ? (
            <div className="tabs" role="tablist" aria-label="Jenis konten">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className="tabs__item"
                  onClick={() => setTab(item.id)}
                >
                  {item.label} {item.count}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {normalized ? (
          results.length === 0 ? (
            <EmptyState icon={<Search size={22} aria-hidden />} title="Tidak ditemukan" body="Coba kata lain, atau cari dalam romaji." />
          ) : (
            <div className="list-card">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  className="list-row"
                  onClick={() => navigate(`/library/${result.type}/${result.id}`)}
                >
                  <span className="grow">
                    <span className="list-row__title jp" lang="ja">{result.primary}</span>
                    <span className="list-row__sub">{result.secondary}</span>
                  </span>
                  <span className="list-row__trail">{result.meaning}</span>
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            {tab === 'kana' ? <KanaGrid /> : null}
            {tab === 'vocab' ? <VocabGrid /> : null}
            {tab === 'kanji' ? <KanjiGrid /> : null}
            {tab === 'grammar' ? <GrammarGrid /> : null}
            {tab === 'reading' ? <ReadingGrid /> : null}
            {tab === 'listening' ? <ListeningGrid /> : null}
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function KanaGrid() {
  return (
    <div className="lib-grid">
      {KANA_ITEMS.map((item) => (
        <button type="button" className="lib-item" key={item.id} onClick={() => navigate(`/library/kana/${item.id}`)}>
          <span className="lib-item__jp" lang="ja">{item.kana}</span>
          <span className="lib-item__reading">{item.romaji}</span>
          <span className="lib-item__meaning">{item.script === 'hiragana' ? 'hiragana' : 'katakana'} · {item.group}</span>
        </button>
      ))}
    </div>
  );
}

function VocabGrid() {
  return (
    <div className="lib-grid">
      {VOCAB_ITEMS.map((item) => (
        <button type="button" className="lib-item" key={item.id} onClick={() => navigate(`/library/vocab/${item.id}`)}>
          <span className="lib-item__jp" lang="ja">{item.word}</span>
          <span className="lib-item__reading">{item.reading}</span>
          <span className="lib-item__meaning">{item.meaning}</span>
        </button>
      ))}
    </div>
  );
}

function KanjiGrid() {
  return (
    <div className="lib-grid">
      {KANJI_ITEMS.map((item) => (
        <button type="button" className="lib-item" key={item.id} onClick={() => navigate(`/library/kanji/${item.id}`)}>
          <span className="lib-item__jp" lang="ja">{item.kanji}</span>
          <span className="lib-item__reading">{item.words[0]?.reading}</span>
          <span className="lib-item__meaning">{item.meaning}</span>
        </button>
      ))}
    </div>
  );
}

function GrammarGrid() {
  return (
    <div className="stack-sm">
      {GRAMMAR_ITEMS.map((item) => (
        <button type="button" className="quick-link" key={item.id} onClick={() => navigate(`/library/grammar/${item.id}`)}>
          <span className="quick-link__icon"><Sparkles size={18} aria-hidden /></span>
          <span className="grow">
            <span className="quick-link__title jp" lang="ja">{item.pattern}</span>
            <span className="quick-link__sub">{item.meaning}</span>
          </span>
          <span className="caption">{item.level.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

function ReadingGrid() {
  return (
    <div className="stack-sm">
      {READING_PASSAGES.map((passage) => (
        <button type="button" className="quick-link" key={passage.id} onClick={() => navigate(`/library/reading/${passage.id}`)}>
          <span className="quick-link__icon"><BookOpen size={18} aria-hidden /></span>
          <span className="grow">
            <span className="quick-link__title">{passage.title}</span>
            <span className="quick-link__sub">
              {passage.type === 'info' ? 'cari informasi' : passage.type === 'mid' ? 'bacaan sedang' : 'bacaan pendek'} ·{' '}
              {passage.questions.length} pertanyaan
            </span>
          </span>
          <ArrowRight size={16} aria-hidden />
        </button>
      ))}
    </div>
  );
}

function ListeningGrid() {
  return (
    <div className="stack-sm">
      {LISTENING_ITEMS.map((item) => (
        <button type="button" className="quick-link" key={item.id} onClick={() => navigate(`/library/listening/${item.id}`)}>
          <span className="quick-link__icon"><BookOpen size={18} aria-hidden /></span>
          <span className="grow">
            <span className="quick-link__title">{item.context}</span>
            <span className="quick-link__sub">
              {item.type === 'quick_response' ? 'respons cepat' : item.type === 'key_points' ? 'poin kunci' : item.type === 'task_based' ? 'tugas' : 'ungkapan'} ·{' '}
              {item.options.length} opsi
            </span>
          </span>
          <ArrowRight size={16} aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function LibraryDetailScreen({ type, id }: { type: string; id: string }) {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const [selected, setSelected] = useState<string | null>(null);

  const item =
    type === 'kana'
      ? KANA_ITEMS.find((entry) => entry.id === id)
      : type === 'vocab'
        ? VOCAB_ITEMS.find((entry) => entry.id === id)
        : type === 'kanji'
          ? KANJI_ITEMS.find((entry) => entry.id === id)
          : type === 'grammar'
            ? GRAMMAR_ITEMS.find((entry) => entry.id === id)
            : type === 'reading'
              ? READING_PASSAGES.find((entry) => entry.id === id)
              : type === 'listening'
                ? LISTENING_ITEMS.find((entry) => entry.id === id)
                : null;

  const inReview = Boolean(item && data.cards[`${type}:${item.id}:meaning`]) || Boolean(item && data.cards[`${type}:${item.id}:recognition`]);
  const canAdd = Boolean(item && CURRICULUM.some((unit) => unit.itemId === item.id));

  if (!item) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Item perpustakaan</h1>
        <EmptyState title="Item tidak ditemukan" body="Mungkin id berubah setelah pembaruan konten." action={<button className="btn btn--primary" onClick={() => navigate('/library')}>Kembali</button>} />
      </main>
    );
  }

  return (
    <main className="app-main" id="main" tabIndex={-1}>
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className="icon-btn" onClick={() => navigate('/library')} aria-label="Kembali">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <span className="caption">{type}</span>
        <span className="grow" />
        {canAdd ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => actions.addToReview(item.id)}
            disabled={inReview}
          >
            {inReview ? 'Sudah di review' : 'Tambah ke review'}
          </button>
        ) : null}
      </div>

      {type === 'kana' ? <KanaDetail item={item as KanaItem} /> : null}
      {type === 'vocab' ? <VocabDetail item={item as VocabItem} /> : null}
      {type === 'kanji' ? <KanjiDetail item={item as KanjiItem} /> : null}
      {type === 'grammar' ? <GrammarDetail item={item as GrammarItem} /> : null}
      {type === 'reading' ? <ReadingDetail item={item as ReadingPassage} /> : null}
      {type === 'listening' ? <ListeningDetail item={item as ListeningItem} selected={selected} setSelected={setSelected} /> : null}
    </main>
  );
}

function KanaDetail({ item }: { item: KanaItem }) {
  return (
    <div className="stack">
      <h1 className="sr-only">Kana {item.kana} ({item.romaji})</h1>
      <div className="detail-hero">
        <span className="detail-hero__jp" lang="ja">{item.kana}</span>
        <span className="detail-hero__reading">{item.romaji}</span>
        <AudioButton text={item.audio} label="Dengar" allowSpeed />
      </div>
      <div className="detail-section">
        <h2>Cara mengingat</h2>
        <p style={{ lineHeight: 1.6 }}>{item.mnemonic}</p>
      </div>
      {item.confusableWith?.length ? (
        <div className="detail-section">
          <h2>Sering tertukar</h2>
          <div className="word-chips">
            {item.confusableWith.map((kana) => (
              <span className="word-chip" key={kana} lang="ja">{kana}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="detail-section">
        <h2>Detail</h2>
        <p className="caption">
          {item.script} · baris {item.row} · {item.group}
        </p>
      </div>
    </div>
  );
}

function VocabDetail({ item }: { item: VocabItem }) {
  const kanji = item.kanjiIds.map((id) => KANJI_ITEMS.find((entry) => entry.id === id)).filter(Boolean) as KanjiItem[];
  return (
    <div className="stack">
      <h1 className="sr-only">{item.word} — {item.meaning}</h1>
      <div className="detail-hero">
        <JapaneseText text={item.word} mode="all" className="detail-hero__jp" as="p" />
        <p className="detail-hero__reading" lang="ja">{item.reading}</p>
        <p style={{ fontSize: 18, fontWeight: 600 }}>{item.meaning}</p>
        <div className="row wrap">
          <Chip tone="neutral">{item.pos}</Chip>
          <Chip tone="info">{item.level.toUpperCase()}</Chip>
        </div>
        <AudioButton text={item.audio} label="Dengar" allowSpeed />
      </div>

      <div className="detail-section">
        <h2>Contoh</h2>
        <div className="example">
          <JapaneseText text={item.example.ja} mode="all" className="example__ja" as="p" />
          <p className="example__reading" lang="ja">{item.example.reading}</p>
        </div>
      </div>

      {kanji.length ? (
        <div className="detail-section">
          <h2>Kanji di kata ini</h2>
          <div className="word-chips">
            {kanji.map((entry) => (
              <a className="word-chip" key={entry.id} href={`#/library/kanji/${entry.id}`} lang="ja">
                {entry.kanji}
                <small>{entry.meaning}</small>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="detail-section">
        <h2>Konteks</h2>
        <div className="row wrap">
          {item.tags.map((tag) => (
            <Chip tone="neutral" key={tag}>{tag}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function KanjiDetail({ item }: { item: KanjiItem }) {
  return (
    <div className="stack">
      <h1 className="sr-only">Kanji {item.kanji} — {item.meaning}</h1>
      <div className="detail-hero">
        <span className="detail-hero__jp" lang="ja">{item.kanji}</span>
        <p style={{ fontSize: 18, fontWeight: 600 }}>{item.meaning}</p>
        <p className="caption">{item.radical} · {item.strokes} goresan</p>
        <AudioButton text={item.words[0]?.reading ?? ''} label="Dengar kata contoh" />
      </div>

      <div className="detail-section">
        <h2>Dipakai dalam kata</h2>
        <div className="word-chips">
          {item.words.map((word) => (
            <span className="word-chip" key={word.reading} lang="ja">
              {word.word}
              <small>{word.reading} · {word.meaning}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h2>Mnemonic</h2>
        <p style={{ lineHeight: 1.6 }}>{item.mnemonic}</p>
      </div>

      <div className="banner banner--warning">
        <Sparkles size={18} aria-hidden />
        <div>
          <strong className="banner__title">Kesalahan umum</strong>
          {item.mistake}
        </div>
      </div>

      <p className="caption">
        Readings: on {item.on.join('、') || '—'} · kun {item.kun.join('、') || '—'}. Kami menguji bacaan di dalam kata, bukan daftar terisolasi.
      </p>
    </div>
  );
}

function GrammarDetail({ item }: { item: GrammarItem }) {
  return (
    <div className="stack">
      <h1 className="sr-only">{item.pattern} — {item.meaning}</h1>
      <div className="detail-hero">
        <span className="detail-hero__jp" lang="ja">{item.pattern}</span>
        <p style={{ fontSize: 18, fontWeight: 600 }}>{item.meaning}</p>
        <Chip tone="info">{item.level.toUpperCase()}</Chip>
      </div>

      <div className="detail-section">
        <h2>Bentuk</h2>
        <p>{item.formation}</p>
      </div>
      <div className="detail-section">
        <h2>Nuansa</h2>
        <p style={{ lineHeight: 1.65 }}>{item.nuance}</p>
      </div>
      <div className="detail-section">
        <h2>Contoh</h2>
        <div className="example-list">
          {item.examples.map((example) => (
            <div className="example" key={example.id}>
              <JapaneseText text={example.ja} mode="all" className="example__ja" as="p" />
              <p className="example__reading" lang="ja">{example.reading}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="detail-section">
        <h2>Bandingkan</h2>
        <p><strong>{item.contrast.pattern}</strong> — {item.contrast.note}</p>
      </div>
      <div className="banner banner--warning">
        <Sparkles size={18} aria-hidden />
        <div>
          <strong className="banner__title">Kesalahan umum</strong>
          {item.commonError}
        </div>
      </div>
      <div className="detail-section">
        <h2>Latihan</h2>
        <div className="stack-sm">
          {item.drills.map((drill) => (
            <details className="disclosure" key={drill.id}>
              <summary>{drill.prompt}</summary>
              <div className="disclosure__body">
                <p><strong>Benar:</strong> {drill.options.find((option) => option.id === drill.correct)?.text}</p>
                <p style={{ marginTop: 6 }}>{drill.explanation}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadingDetail({ item }: { item: ReadingPassage }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="stack">
      <div className="stack-sm">
        <span className="eyebrow">{item.type === 'info' ? 'Cari informasi' : item.type === 'mid' ? 'Bacaan sedang' : 'Bacaan pendek'}</span>
        <h1>{item.title}</h1>
        <p className="caption">Target waktu {Math.round(item.timerSeconds / 60)} menit · {item.questions.length} pertanyaan</p>
      </div>
      <div className="passage passage--tall" tabIndex={0} aria-label="Teks bacaan">
        <JapaneseText text={item.body} mode="all" />
      </div>
      <div className="stack">
        {item.questions.map((question) => {
          const selected = answers[question.id] ?? null;
          const answered = Boolean(selected);
          const correct = selected === question.correct;
          return (
            <div className="card stack-sm" key={question.id}>
              <p style={{ fontWeight: 700 }}>{question.prompt}</p>
              <OptionList
                options={question.options}
                selected={selected}
                correct={question.correct}
                answered={answered}
                onSelect={(optionId) => setAnswers((current) => ({ ...current, [question.id]: optionId }))}
                japanese
              />
              {answered ? (
                <div className={`feedback ${correct ? 'feedback--correct' : 'feedback--wrong'}`}>
                  <strong>{correct ? 'Benar' : 'Belum tepat'}</strong>
                  <p className="feedback__why">{question.explanation}</p>
                  <div className="feedback__evidence">
                    <strong style={{ display: 'block', marginBottom: 4 }}>Bukti dari teks</strong>
                    <span className="jp" lang="ja">{question.evidence}</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListeningDetail({
  item,
  selected,
  setSelected,
}: {
  item: ListeningItem;
  selected: string | null;
  setSelected: (value: string | null) => void;
}) {
  const answered = selected !== null;
  const correct = selected === item.correct;
  return (
    <div className="stack">
      <div className="stack-sm">
        <span className="eyebrow">{item.context}</span>
        <h1>{item.question}</h1>
        <p className="caption">{item.instruction}</p>
      </div>
      <div className="card stack-sm">
        <span className="card__title">Audio</span>
        <AudioButton text={item.scriptReading} label="Putar audio" allowSpeed />
      </div>
      <OptionList
        options={item.options}
        selected={selected}
        correct={item.correct}
        answered={answered}
        onSelect={setSelected}
        japanese
      />
      {answered ? (
        <div className={`feedback ${correct ? 'feedback--correct' : 'feedback--wrong'}`}>
          <strong>{correct ? 'Benar' : 'Belum tepat'}</strong>
          <p className="feedback__why">{item.explanation}</p>
          <div className="feedback__evidence">
            <strong style={{ display: 'block', marginBottom: 4 }}>Transkrip</strong>
            <span className="jp" lang="ja" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{item.script}</span>
            <span className="jp" lang="ja" style={{ display: 'block', marginTop: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
              {item.scriptReading}
            </span>
          </div>
        </div>
      ) : null}
      <p className="caption">
        Audio diputar dari perangkat (bukan rekaman native). Untuk ujian, latih mode sekali dengar di Mock.
      </p>
    </div>
  );
}
