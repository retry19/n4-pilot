/**
 * Listening seed — 10 items across the four N4 types only. There is no
 * "general outline" item because N4 does not test it (PRD §2.3).
 *
 * Audio is produced by the device speech engine from `scriptReading` (kana), so
 * kanji readings cannot be mispronounced. If TTS is unavailable the transcript
 * is the documented fallback — never a blocked session.
 */
import type { ListeningItem } from '../core/types.ts';

export const LISTENING_ITEMS: ListeningItem[] = [
  {
    id: 'l-task-1',
    type: 'task_based',
    context: 'Di restoran',
    instruction: 'Dengarkan percakapan di restoran. Apa yang dipesan wanita itu?',
    script:
      '店員：いらっしゃいませ。女性：すみません、カレーライスを一つと、アイスコーヒーをお願いします。店員：カレーライス一つと、アイスコーヒー一つですね。女性：あ、それから、サラダもお願いします。店員：かしこまりました。',
    scriptReading:
      'てんいん：いらっしゃいませ。じょせい：すみません、かれーらいすをひとつと、あいすこーひーをおねがいします。てんいん：かれーらいすひとつと、あいすこーひーひとつですね。じょせい：あ、それから、さらだもおねがいします。てんいん：かしこまりました。',
    question: '女性は何を注文しましたか。',
    options: [
      { id: 'a', text: 'カレーとコーヒーだけ' },
      { id: 'b', text: 'カレーとコーヒーとサラダ' },
      { id: 'c', text: 'サラダとコーヒーだけ' },
      { id: 'd', text: 'カレーとサラダだけ' },
    ],
    correct: 'b',
    explanation: 'Wanita menambahkan サラダも setelah memesan kari dan es kopi. も menandai tambahan.',
    seconds: 45,
    tags: ['makanan', 'angka'],
  },
  {
    id: 'l-task-2',
    type: 'task_based',
    context: 'Telepon kantor',
    instruction: 'Dengarkan telepon di kantor. Jam berapa rapat dimulai?',
    script:
      '男性：もしもし、田中さんですか。明日の会議の時間を確認したいんですが。女性：はい、明日の会議は10時からです。男性：10時ですね。場所はどこですか。女性：3階の会議室です。男性：分かりました。ありがとうございます。',
    scriptReading:
      'だんせい：もしもし、たなかさんですか。あしたのかいぎのじかんをかくにんしたいんですが。じょせい：はい、あしたのかいぎはじゅうじからです。だんせい：じゅうじですね。ばしょはどこですか。じょせい：さんがいのかいぎしつです。だんせい：わかりました。ありがとうございます。',
    question: '会議は何時に始まりますか。',
    options: [
      { id: 'a', text: '9時' },
      { id: 'b', text: '10時' },
      { id: 'c', text: '11時' },
      { id: 'd', text: '3時' },
    ],
    correct: 'b',
    explanation: '「明日の会議は10時からです」. "3階" adalah lantai, bukan jam — jebakan angka.',
    seconds: 45,
    tags: ['angka', 'waktu', 'kerja'],
  },
  {
    id: 'l-key-1',
    type: 'key_points',
    context: 'Prakiraan cuaca',
    instruction: 'Dengarkan prakiraan cuaca. Bagaimana cuaca besok sore?',
    script:
      '明日の東京は、朝は晴れですが、午後から雨が降るでしょう。気温は20度まで上がりますが、夜は10度まで下がります。傘を持って出かけてください。',
    scriptReading:
      'あしたのとうきょうは、あさははれですが、ごごからあめがふるでしょう。きおんはにじゅうどまであがりますが、よるはじゅうどまでさがります。かさをもってでかけてください。',
    question: '明日の午後はどうなりますか。',
    options: [
      { id: 'a', text: '晴れ' },
      { id: 'b', text: '雨' },
      { id: 'c', text: '雪' },
      { id: 'd', text: 'くもり' },
    ],
    correct: 'b',
    explanation: '「午後から雨が降るでしょう」 — hujan mulai sore.',
    seconds: 35,
    tags: ['alam', 'waktu'],
  },
  {
    id: 'l-key-2',
    type: 'key_points',
    context: 'Pengumuman kelas',
    instruction: 'Dengarkan pengumuman kelas. Apa yang harus dibawa besok?',
    script:
      '明日の日本語のクラスは、9時からではなく、10時から始まります。教室は204から305に変わります。教科書とノートを持ってきてください。',
    scriptReading:
      'あしたのにほんごのくらすは、くじからではなく、じゅうじからはじまります。きょうしつはにひゃくよんからさんびゃくごにかわります。きょうかしょとのーとをもってきてください。',
    question: '明日、学生は何を持って行きますか。',
    options: [
      { id: 'a', text: '教科書とノート' },
      { id: 'b', text: '辞書とノート' },
      { id: 'c', text: '教科書だけ' },
      { id: 'd', text: '何もいらない' },
    ],
    correct: 'a',
    explanation: '「教科書とノートを持ってきてください」 — bawa buku teks dan catatan.',
    seconds: 35,
    tags: ['sekolah'],
  },
  {
    id: 'l-key-3',
    type: 'key_points',
    context: 'Rencana akhir pekan',
    instruction: 'Dengarkan percakapan. Apa yang dilakukan wanita itu hari Sabtu?',
    script:
      '男性：週末、何をする？　女性：土曜日は友達と映画を見に行くの。日曜日は家でゆっくり休むつもり。男性：いいね。じゃあ、日曜日に一緒に昼ご飯を食べない？　女性：うん、いいよ。',
    scriptReading:
      'だんせい：しゅうまつ、なにをする？　じょせい：どようびはともだちとえいがをみにいくの。にちようびはいえでゆっくりやすむつもり。だんせい：いいね。じゃあ、にちようびにいっしょにひるごはんをたべない？　じょせい：うん、いいよ。',
    question: '女性は土曜日に何をしますか。',
    options: [
      { id: 'a', text: '昼ご飯を食べる' },
      { id: 'b', text: '映画を見る' },
      { id: 'c', text: '家で休む' },
      { id: 'd', text: '買い物に行く' },
    ],
    correct: 'b',
    explanation: '土曜日 = menonton film; 日曜日 = istirahat lalu makan siang. つもり menandai rencana.',
    seconds: 40,
    tags: ['waktu', 'hiburan'],
  },
  {
    id: 'l-verb-1',
    type: 'verbal_expressions',
    context: 'Di toko',
    instruction: 'Dengarkan percakapan di toko. Apa yang sedang dilakukan pegawai toko?',
    script:
      '店員：いらっしゃいませ。何をお探しですか。客：あの、白いシャツを探しています。店員：こちらはいかがですか。',
    scriptReading:
      'てんいん：いらっしゃいませ。なにをおさがしですか。きゃく：あの、しろいしゃつをさがしています。てんいん：こちらはいかがですか。',
    question: '店員は何をしていますか。',
    options: [
      { id: 'a', text: 'おすすめを紹介している' },
      { id: 'b', text: '値段を聞いている' },
      { id: 'c', text: 'お礼を言っている' },
      { id: 'd', text: '謝っている' },
    ],
    correct: 'a',
    explanation: '「こちらはいかがですか」 = menawarkan/merekomendasikan barang.',
    seconds: 30,
    tags: ['ungkapan'],
  },
  {
    id: 'l-verb-2',
    type: 'verbal_expressions',
    context: 'Ucapan terima kasih',
    instruction: 'Dengarkan percakapan. Apa yang sedang dilakukan wanita itu?',
    script:
      '女性：この前は引っ越しを手伝ってくれて、本当にありがとうございました。男性：いいえ、どういたしまして。何かあったら、また言ってください。',
    scriptReading:
      'じょせい：このまえはひっこしをてつだってくれて、ほんとうにありがとうございました。だんせい：いいえ、どういたしまして。なにかあったら、またいってください。',
    question: '女性は何をしていますか。',
    options: [
      { id: 'a', text: '謝っている' },
      { id: 'b', text: 'お礼を言っている' },
      { id: 'c', text: '誘っている' },
      { id: 'd', text: '断っている' },
    ],
    correct: 'b',
    explanation: '「ありがとうございました」 = terima kasih. 「どういたしまして」 adalah balasannya.',
    seconds: 30,
    tags: ['ungkapan'],
  },
  {
    id: 'l-quick-1',
    type: 'quick_response',
    context: 'Meminta izin',
    instruction: 'Dengarkan pertanyaan. Pilih respons yang paling natural.',
    script: '男性：すみません、エアコンをつけてもいいですか。',
    scriptReading: 'だんせい：すみません、えあこんをつけてもいいですか。',
    question: 'どう答えますか。',
    options: [
      { id: 'a', text: 'ええ、どうぞ。' },
      { id: 'b', text: 'ええ、そうですね。' },
      { id: 'c', text: 'いいえ、けっこうです。' },
      { id: 'd', text: 'はい、いりません。' },
    ],
    correct: 'a',
    explanation: 'Permintaan izin 〜てもいいですか dijawab 「ええ、どうぞ」 (silakan). Opsi lain tidak menjawab izin.',
    seconds: 12,
    tags: ['ungkapan', 'izin'],
  },
  {
    id: 'l-quick-2',
    type: 'quick_response',
    context: 'Bertanya arah',
    instruction: 'Dengarkan pertanyaan. Pilih respons yang paling natural.',
    script: '女性：すみません、駅はどこですか。',
    scriptReading: 'じょせい：すみません、えきはどこですか。',
    question: 'どう答えますか。',
    options: [
      { id: 'a', text: 'この道をまっすぐ行ってください。' },
      { id: 'b', text: 'はい、駅です。' },
      { id: 'c', text: 'いいえ、行きません。' },
      { id: 'd', text: '駅は電車です。' },
    ],
    correct: 'a',
    explanation: 'Pertanyaan "di mana stasiun" dijawab dengan petunjuk arah. Opsi lain tidak menjawab lokasi.',
    seconds: 12,
    tags: ['ungkapan', 'tempat'],
  },
  {
    id: 'l-quick-3',
    type: 'quick_response',
    context: 'Mengajak makan siang',
    instruction: 'Dengarkan ajakan. Pilih respons yang paling natural.',
    script: '男性：一緒に昼ご飯を食べませんか。',
    scriptReading: 'だんせい：いっしょにひるごはんをたべませんか。',
    question: 'どう答えますか。',
    options: [
      { id: 'a', text: 'ええ、食べましょう。' },
      { id: 'b', text: 'ええ、食べました。' },
      { id: 'c', text: 'はい、昼ご飯です。' },
      { id: 'd', text: 'いいえ、食べますか。' },
    ],
    correct: 'a',
    explanation: 'Ajakan 〜ませんか dijawab dengan 〜ましょう. Bentuk ました berarti sudah terjadi.',
    seconds: 12,
    tags: ['ungkapan', 'makanan'],
  },
];

export const LISTENING_BY_ID = new Map(LISTENING_ITEMS.map((item) => [item.id, item]));

export const LISTENING_TYPES = [
  { id: 'task_based', label: 'Tugas', hint: 'Selesaikan tugas dari percakapan.' },
  { id: 'key_points', label: 'Poin kunci', hint: 'Tangkap informasi penting.' },
  { id: 'verbal_expressions', label: 'Ungkapan', hint: 'Pahami maksud pembicara.' },
  { id: 'quick_response', label: 'Respons cepat', hint: 'Jawab dalam 5 detik.' },
] as const;
