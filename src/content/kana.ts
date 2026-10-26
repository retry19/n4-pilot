/**
 * Kana content — generated from the gojūon table so the set is complete and
 * consistent. Seed quality note: every character has romaji, row, group and a
 * TTS audio source; hiragana base characters also have authored mnemonics.
 */
import type { KanaItem } from '../core/types.ts';

interface Row {
  row: string;
  group: KanaItem['group'];
  vowels: string;
  hiragana: string[];
  katakana: string[];
  romaji: string[];
}

const HIRAGANA_BASE = ['あ', 'い', 'う', 'え', 'お'];
const KATAKANA_BASE = ['ア', 'イ', 'ウ', 'エ', 'オ'];

const BASE_ROWS: Omit<Row, 'group'>[] = [
  { row: 'a', vowels: 'a i u e o', hiragana: ['あ', 'い', 'う', 'え', 'お'], katakana: ['ア', 'イ', 'ウ', 'エ', 'オ'], romaji: ['a', 'i', 'u', 'e', 'o'] },
  { row: 'ka', vowels: 'a i u e o', hiragana: ['か', 'き', 'く', 'け', 'こ'], katakana: ['カ', 'キ', 'ク', 'ケ', 'コ'], romaji: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { row: 'sa', vowels: 'a i u e o', hiragana: ['さ', 'し', 'す', 'せ', 'そ'], katakana: ['サ', 'シ', 'ス', 'セ', 'ソ'], romaji: ['sa', 'shi', 'su', 'se', 'so'] },
  { row: 'ta', vowels: 'a i u e o', hiragana: ['た', 'ち', 'つ', 'て', 'と'], katakana: ['タ', 'チ', 'ツ', 'テ', 'ト'], romaji: ['ta', 'chi', 'tsu', 'te', 'to'] },
  { row: 'na', vowels: 'a i u e o', hiragana: ['な', 'に', 'ぬ', 'ね', 'の'], katakana: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'], romaji: ['na', 'ni', 'nu', 'ne', 'no'] },
  { row: 'ha', vowels: 'a i u e o', hiragana: ['は', 'ひ', 'ふ', 'へ', 'ほ'], katakana: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'], romaji: ['ha', 'hi', 'fu', 'he', 'ho'] },
  { row: 'ma', vowels: 'a i u e o', hiragana: ['ま', 'み', 'む', 'め', 'も'], katakana: ['マ', 'ミ', 'ム', 'メ', 'モ'], romaji: ['ma', 'mi', 'mu', 'me', 'mo'] },
  { row: 'ya', vowels: 'a u o', hiragana: ['や', 'ゆ', 'よ'], katakana: ['ヤ', 'ユ', 'ヨ'], romaji: ['ya', 'yu', 'yo'] },
  { row: 'ra', vowels: 'a i u e o', hiragana: ['ら', 'り', 'る', 'れ', 'ろ'], katakana: ['ラ', 'リ', 'ル', 'レ', 'ロ'], romaji: ['ra', 'ri', 'ru', 're', 'ro'] },
  { row: 'wa', vowels: 'a o n', hiragana: ['わ', 'を', 'ん'], katakana: ['ワ', 'ヲ', 'ン'], romaji: ['wa', 'wo', 'n'] },
];

const DAKUTEN_ROWS: Omit<Row, 'group'>[] = [
  { row: 'ga', vowels: 'a i u e o', hiragana: ['が', 'ぎ', 'ぐ', 'げ', 'ご'], katakana: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'], romaji: ['ga', 'gi', 'gu', 'ge', 'go'] },
  { row: 'za', vowels: 'a i u e o', hiragana: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], katakana: ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'], romaji: ['za', 'ji', 'zu', 'ze', 'zo'] },
  { row: 'da', vowels: 'a i u e o', hiragana: ['だ', 'ぢ', 'づ', 'で', 'ど'], katakana: ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'], romaji: ['da', 'ji', 'zu', 'de', 'do'] },
  { row: 'ba', vowels: 'a i u e o', hiragana: ['ば', 'び', 'ぶ', 'べ', 'ぼ'], katakana: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'], romaji: ['ba', 'bi', 'bu', 'be', 'bo'] },
  { row: 'pa', vowels: 'a i u e o', hiragana: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], katakana: ['パ', 'ピ', 'プ', 'ペ', 'ポ'], romaji: ['pa', 'pi', 'pu', 'pe', 'po'] },
];

const YOON_ROWS: Omit<Row, 'group'>[] = [
  { row: 'kya', vowels: 'a u o', hiragana: ['きゃ', 'きゅ', 'きょ'], katakana: ['キャ', 'キュ', 'キョ'], romaji: ['kya', 'kyu', 'kyo'] },
  { row: 'sha', vowels: 'a u o', hiragana: ['しゃ', 'しゅ', 'しょ'], katakana: ['シャ', 'シュ', 'ショ'], romaji: ['sha', 'shu', 'sho'] },
  { row: 'cha', vowels: 'a u o', hiragana: ['ちゃ', 'ちゅ', 'ちょ'], katakana: ['チャ', 'チュ', 'チョ'], romaji: ['cha', 'chu', 'cho'] },
  { row: 'nya', vowels: 'a u o', hiragana: ['にゃ', 'にゅ', 'にょ'], katakana: ['ニャ', 'ニュ', 'ニョ'], romaji: ['nya', 'nyu', 'nyo'] },
  { row: 'hya', vowels: 'a u o', hiragana: ['ひゃ', 'ひゅ', 'ひょ'], katakana: ['ヒャ', 'ヒュ', 'ヒョ'], romaji: ['hya', 'hyu', 'hyo'] },
  { row: 'mya', vowels: 'a u o', hiragana: ['みゃ', 'みゅ', 'みょ'], katakana: ['ミャ', 'ミュ', 'ミョ'], romaji: ['mya', 'myu', 'myo'] },
  { row: 'rya', vowels: 'a u o', hiragana: ['りゃ', 'りゅ', 'りょ'], katakana: ['リャ', 'リュ', 'リョ'], romaji: ['rya', 'ryu', 'ryo'] },
  { row: 'gya', vowels: 'a u o', hiragana: ['ぎゃ', 'ぎゅ', 'ぎょ'], katakana: ['ギャ', 'ギュ', 'ギョ'], romaji: ['gya', 'gyu', 'gyo'] },
  { row: 'ja', vowels: 'a u o', hiragana: ['じゃ', 'じゅ', 'じょ'], katakana: ['ジャ', 'ジュ', 'ジョ'], romaji: ['ja', 'ju', 'jo'] },
  { row: 'bya', vowels: 'a u o', hiragana: ['びゃ', 'びゅ', 'びょ'], katakana: ['ビャ', 'ビュ', 'ビョ'], romaji: ['bya', 'byu', 'byo'] },
  { row: 'pya', vowels: 'a u o', hiragana: ['ぴゃ', 'ぴゅ', 'ぴょ'], katakana: ['ピャ', 'ピュ', 'ピョ'], romaji: ['pya', 'pyu', 'pyo'] },
];

/**
 * Short Indonesian mnemonics for base hiragana. Kept deliberately concrete:
 * "ki" is a key, "ne" has a cat tail, "ru" loops. No anime imagery.
 */
const HIRAGANA_MNEMONIC: Record<string, string> = {
  あ: 'Seperti "a" dengan garis silang — bayangkan huruf A yang dilipat.',
  い: 'Dua goresan memanjang, seperti dua orang berdiri (ii).',
  う: 'Atap kecil di atas, seperti topi "u".',
  え: 'Badan "e" dengan kaki melangkah.',
  お: 'Seperti あ tetapi dengan titik di kanan atas.',
  か: 'Pedang kecil menembus — "ka" seperti katana.',
  き: 'Kunci (key) dengan dua gigi → ki.',
  く: 'Paruh burung yang terbuka → ku.',
  け: 'Kayu dengan cabang → ke.',
  こ: 'Dua garis mendatar, seperti dua roti → ko.',
  さ: 'Sakura dengan tangkai → sa.',
  し: 'Senyum melengkung → shi.',
  す: 'Sekrup dengan ulir berputar → su.',
  せ: 'Gelas jus dengan sedotan → se.',
  そ: 'Soba yang melengkung → so.',
  た: 'Tabel dengan dua kaki → ta.',
  ち: 'Ceri dengan tangkai di atas → chi.',
  つ: 'Gelombang tsunami kecil → tsu.',
  て: 'Tangan (te) yang melambai.',
  と: 'Duri (toge) menancap → to.',
  な: 'Tangga yang dinaiki → na.',
  に: 'Dua garis dan kurva — seperti に (dua) → ni.',
  ぬ: 'Mi yang dililit sumpit → nu.',
  ね: 'Kucing (neko) dengan ekor melingkar → ne.',
  の: 'Siput dalam lingkaran → no.',
  は: 'Lebah (hachi) dengan antena → ha.',
  ひ: 'Hidung mancung → hi.',
  ふ: 'Gunung Fuji dengan awan → fu.',
  へ: 'Bukit kecil → he.',
  ほ: 'Seperti は dengan satu garis tambahan → ho.',
  ま: 'Mata (ma) dengan kelopak → ma.',
  み: 'Tiga goresan seperti aliran → mi.',
  む: 'Serangga dengan sungut → mu.',
  め: 'Mata dengan bulu mata → me.',
  も: 'Mochi bertumpuk → mo.',
  や: 'Layar kapal → ya.',
  ゆ: 'Onsen dengan uap → yu.',
  よ: 'Yoyo dengan tali → yo.',
  ら: 'Angka 5 dengan topi → ra.',
  り: 'Dua garis sungai → ri.',
  る: 'Lingkaran dengan ekor → ru.',
  れ: 'Seperti る tetapi berekor tegak → re.',
  ろ: 'Seperti る tanpa lingkaran → ro.',
  わ: 'Burung dengan sayap → wa.',
  を: 'Seperti お dengan garis bawah → wo.',
  ん: 'Satu goresan melengkung, seperti "n" → n.',
};

const CONFUSABLE: Record<string, string[]> = {
  し: ['つ', 'ソ'],
  つ: ['し', 'シ'],
  そ: ['ん', 'ソ'],
  ん: ['そ', 'ン'],
  る: ['ろ', 'ル'],
  ろ: ['る', 'ロ'],
  ね: ['れ', 'わ'],
  れ: ['ね', 'わ'],
  わ: ['ね', 'れ'],
  ク: ['ワ', 'ウ'],
  シ: ['ツ', 'ソ'],
  ツ: ['シ', 'ソ'],
  ソ: ['ン', 'ツ'],
  ン: ['ソ', 'シ'],
};

function buildItems(): KanaItem[] {
  const items: KanaItem[] = [];
  const scripts: { script: KanaItem['script']; charsKey: 'hiragana' | 'katakana'; prefix: string }[] = [
    { script: 'hiragana', charsKey: 'hiragana', prefix: 'h' },
    { script: 'katakana', charsKey: 'katakana', prefix: 'k' },
  ];
  const groups: { group: KanaItem['group']; rows: Omit<Row, 'group'>[] }[] = [
    { group: 'base', rows: BASE_ROWS },
    { group: 'dakuten', rows: DAKUTEN_ROWS },
    { group: 'yoon', rows: YOON_ROWS },
  ];

  for (const { script, charsKey, prefix } of scripts) {
    for (const { group, rows } of groups) {
      for (const row of rows) {
        const chars = row[charsKey];
        chars.forEach((kana, index) => {
          const romaji = row.romaji[index]!;
          const id = `kana-${prefix}-${row.row}${row.romaji.length > 1 ? `-${romaji}` : ''}`;
          const mnemonic =
            script === 'hiragana' && group === 'base'
              ? (HIRAGANA_MNEMONIC[kana] ?? `Bunyi "${romaji}".`)
              : script === 'katakana'
                ? `Katakana untuk bunyi "${romaji}". Dipakai pada kata serapan seperti コーヒー.`
                : `Kombinasi bunyi "${romaji}".`;
          items.push({
            id,
            kana,
            romaji,
            script,
            row: row.row,
            group,
            audio: kana,
            mnemonic,
            confusableWith: CONFUSABLE[kana],
          });
        });
      }
    }
  }
  return items;
}

export const KANA_ITEMS: KanaItem[] = buildItems();

export const KANA_BY_ID = new Map(KANA_ITEMS.map((item) => [item.id, item]));

/** Gate: 95% accuracy across at least 20 answers (DESIGN §7.3). */
export const KANA_GATE_ACCURACY = 0.95;
export const KANA_GATE_ATTEMPTS = 20;

/** Hiragana first, then katakana — the order used by the curriculum. */
export const KANA_ORDER = KANA_ITEMS.filter((item) => item.script === 'hiragana').concat(
  KANA_ITEMS.filter((item) => item.script === 'katakana'),
);

export const HIRAGANA_ITEMS = KANA_ITEMS.filter((item) => item.script === 'hiragana');
export const KATAKANA_ITEMS = KANA_ITEMS.filter((item) => item.script === 'katakana');

export { HIRAGANA_BASE, KATAKANA_BASE };
