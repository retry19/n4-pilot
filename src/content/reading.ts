/**
 * Reading seed — 5 passages covering the three N4 types only:
 * short comprehension, mid-size comprehension and information retrieval.
 * There is deliberately no "long passage" (it does not exist in N4).
 */
import type { ReadingPassage } from '../core/types.ts';

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: 'r-short-1',
    type: 'short',
    title: 'Setiap pagi',
    level: 'n5',
    timerSeconds: 150,
    body:
      '{私|わたし}は{毎朝|まいあさ}6{時|じ}に{起|お}きます。7{時|じ}に{朝|あさ}ご{飯|はん}を{食|た}べて、8{時|じ}に{家|いえ}を{出|で}ます。{会社|かいしゃ}まで{電車|でんしゃ}で40{分|ふん}かかります。{夜|よる}は11{時|じ}に{寝|ね}ます。',
    reading:
      'わたしはまいあさろくじにおきます。しちじにあさごはんをたべて、はちじにいえをでます。かいしゃまででんしゃでよんじゅっぷんかかります。よるはじゅういちじにねます。',
    questions: [
      {
        id: 'r-short-1-q1',
        prompt: '会社まで何分かかりますか。',
        options: [
          { id: 'a', text: '30分' },
          { id: 'b', text: '40分' },
          { id: 'c', text: '60分' },
          { id: 'd', text: '11分' },
        ],
        correct: 'b',
        explanation: 'Teks menyebut 「会社まで電車で40分かかります」.',
        evidence: '会社まで電車で40分かかります。',
      },
      {
        id: 'r-short-1-q2',
        prompt: '何時に家を出ますか。',
        options: [
          { id: 'a', text: '6時' },
          { id: 'b', text: '7時' },
          { id: 'c', text: '8時' },
          { id: 'd', text: '11時' },
        ],
        correct: 'c',
        explanation: '「8時に家を出ます」 — 6時 bangun, 7時 sarapan.',
        evidence: '8時に家を出ます。',
      },
    ],
  },
  {
    id: 'r-short-2',
    type: 'short',
    title: 'Jam makan siang',
    level: 'n5',
    timerSeconds: 150,
    body:
      '{昼休|ひるやす}みは12{時|じ}から1{時|じ}までです。{会社|かいしゃ}の{近|ちか}くに{安|やす}くておいしい{店|みせ}があります。でも、12{時|じ}はとても{込|こ}むので、{私|わたし}は1{時|じ}に{昼|ひる}ご{飯|はん}を{食|た}べます。',
    reading:
      'ひるやすみはじゅうにじからいちじまでです。かいしゃのちかくにやすくておいしいみせがあります。でも、じゅうにじはとてもこむので、わたしはいちじにひるごはんをたべます。',
    questions: [
      {
        id: 'r-short-2-q1',
        prompt: 'なぜ1時に昼ご飯を食べますか。',
        options: [
          { id: 'a', text: '店が遠いから' },
          { id: 'b', text: '店が高いから' },
          { id: 'c', text: '12時は込むから' },
          { id: 'd', text: '昼休みが短いから' },
        ],
        correct: 'c',
        explanation: '「12時はとても込むので」 — ので menandai sebab.',
        evidence: '12時はとても込むので、私は1時に昼ご飯を食べます。',
      },
      {
        id: 'r-short-2-q2',
        prompt: '昼休みは何時から何時までですか。',
        options: [
          { id: 'a', text: '11時から12時まで' },
          { id: 'b', text: '12時から1時まで' },
          { id: 'c', text: '1時から2時まで' },
          { id: 'd', text: '12時から2時まで' },
        ],
        correct: 'b',
        explanation: 'Kalimat pertama: 「昼休みは12時から1時までです」.',
        evidence: '昼休みは12時から1時までです。',
      },
    ],
  },
  {
    id: 'r-mid-1',
    type: 'mid',
    title: 'Pindah rumah',
    level: 'n4',
    timerSeconds: 300,
    body:
      '{先月|せんげつ}、{新|あたら}しいアパートに{引|ひ}っ{越|こ}しました。{前|まえ}の{家|いえ}は{駅|えき}から{遠|とお}くて、{会社|かいしゃ}まで1{時間|じかん}かかりました。{新|あたら}しい{家|いえ}は{駅|えき}から5{分|ふん}で、{近|ちか}くにスーパーと{公園|こうえん}があります。{部屋|へや}は{少|すこ}し{狭|せま}いですが、{静|しず}かです。{友達|ともだち}が{手伝|てつだ}ってくれたので、{引|ひ}っ{越|こ}しは1{日|にち}で{終|お}わりました。',
    reading:
      'せんげつ、あたらしいあぱーとにひっこしました。まえのいえはえきからとおくて、かいしゃまでいちじかんかかりました。あたらしいいえはえきからごふんで、ちかくにすーぱーとこうえんがあります。へやはすこしせまいですが、しずかです。ともだちがてつだってくれたので、ひっこしはいちにちでおわりました。',
    questions: [
      {
        id: 'r-mid-1-q1',
        prompt: '新しい家は駅からどうですか。',
        options: [
          { id: 'a', text: 'とても遠い' },
          { id: 'b', text: '5分で近い' },
          { id: 'c', text: '1時間かかる' },
          { id: 'd', text: '公園の中にある' },
        ],
        correct: 'b',
        explanation: '「新しい家は駅から5分で」 — dekat. 1時間 adalah rumah lama.',
        evidence: '新しい家は駅から5分で、近くにスーパーと公園があります。',
      },
      {
        id: 'r-mid-1-q2',
        prompt: '引っ越しはなぜ1日で終わりましたか。',
        options: [
          { id: 'a', text: '部屋が狭いから' },
          { id: 'b', text: '友達が手伝ったから' },
          { id: 'c', text: '会社が近いから' },
          { id: 'd', text: 'スーパーがあるから' },
        ],
        correct: 'b',
        explanation: '「友達が手伝ってくれたので」 — ので menyatakan sebab.',
        evidence: '友達が手伝ってくれたので、引っ越しは1日で終わりました。',
      },
    ],
  },
  {
    id: 'r-mid-2',
    type: 'mid',
    title: 'Kereta Jepang',
    level: 'n4',
    timerSeconds: 300,
    body:
      '日本の{電車|でんしゃ}は{時間|じかん}に{正確|せいかく}だと言われますが、{朝|あさ}の{電車|でんしゃ}はとても{込|こ}んでいます。{私|わたし}はいつも7{時|じ}{半|はん}の{電車|でんしゃ}に{乗|の}ります。{座|すわ}れませんが、{本|ほん}を{読|よ}む{時間|じかん}になります。{雨|あめ}の{日|ひ}は{電車|でんしゃ}が{遅|おく}れることがあるので、{早|はや}めに{家|いえ}を{出|で}ます。',
    reading:
      'にほんのでんしゃはじかんにせいかくだといわれますが、あさのでんしゃはとてもこんでいます。わたしはいつもしちじはんのでんしゃにのります。すわれませんが、ほんをよむじかんになります。あめのひはでんしゃがおくれることがあるので、はやめにいえをでます。',
    questions: [
      {
        id: 'r-mid-2-q1',
        prompt: '朝の電車はどうですか。',
        options: [
          { id: 'a', text: 'すいている' },
          { id: 'b', text: 'とても込んでいる' },
          { id: 'c', text: 'いつも遅れる' },
          { id: 'd', text: 'いつも座れる' },
        ],
        correct: 'b',
        explanation: '「朝の電車はとても込んでいます」.',
        evidence: '朝の電車はとても込んでいます。',
      },
      {
        id: 'r-mid-2-q2',
        prompt: '雨の日はなぜ早く家を出ますか。',
        options: [
          { id: 'a', text: '電車が遅れることがあるから' },
          { id: 'b', text: '本を読みたいから' },
          { id: 'c', text: '電車がいつもより速いから' },
          { id: 'd', text: '座りたいから' },
        ],
        correct: 'a',
        explanation: '「電車が遅れることがあるので、早めに家を出ます」.',
        evidence: '雨の日は電車が遅れることがあるので、早めに家を出ます。',
      },
    ],
  },
  {
    id: 'r-info-1',
    type: 'info',
    title: 'Pengumuman lomba pidato',
    level: 'n4',
    timerSeconds: 240,
    body: [
      '「{日本語|にほんご}スピーチ{大会|たいかい}」',
      '{日時|にちじ}：12{月|がつ}5{日|にち}（{日|にち}）13{時|じ}〜16{時|じ}',
      '{場所|ばしょ}：{市民|しみん}センター 3{階|かい}ホール',
      '{参加費|さんかひ}：{無料|むりょう}',
      '{申|もう}し{込|こ}み：11{月|がつ}20{日|にち}までにメールで',
      '※{発表|はっぴょう}は5{分|ふん}まで。{見学|けんがく}は{自由|じゆう}です。',
    ].join('\n'),
    reading:
      'にほんごすぴーちたいかい。にちじ：じゅうにがついつか（にち）じゅうさんじからじゅうろくじ。ばしょ：しみんせんたーさんがいほーる。さんかひ：むりょう。もうしこみ：じゅういちがつはつかまでにめーるで。※はっぴょうはごふんまで。けんがくはじゆうです。',
    questions: [
      {
        id: 'r-info-1-q1',
        prompt: 'スピーチ大会はいつですか。',
        options: [
          { id: 'a', text: '11月20日' },
          { id: 'b', text: '12月5日' },
          { id: 'c', text: '12月15日' },
          { id: 'd', text: '1月5日' },
        ],
        correct: 'b',
        explanation: '「日時：12月5日（日）」. 11月20日 adalah batas pendaftaran.',
        evidence: '日時：12月5日（日）13時〜16時',
      },
      {
        id: 'r-info-1-q2',
        prompt: '見学したい人はどうしますか。',
        options: [
          { id: 'a', text: 'メールで申し込む' },
          { id: 'b', text: '11月20日までに払う' },
          { id: 'c', text: '自由に見られる' },
          { id: 'd', text: '5分以内に話す' },
        ],
        correct: 'c',
        explanation: '「見学は自由です」 — tidak perlu mendaftar untuk menonton.',
        evidence: '※発表は5分まで。見学は自由です。',
      },
      {
        id: 'r-info-1-q3',
        prompt: '参加費はいくらですか。',
        options: [
          { id: 'a', text: '500円' },
          { id: 'b', text: '1,000円' },
          { id: 'c', text: '無料' },
          { id: 'd', text: '5分' },
        ],
        correct: 'c',
        explanation: '「参加費：無料」 — gratis.',
        evidence: '参加費：無料',
      },
    ],
  },
];

export const READING_BY_ID = new Map(READING_PASSAGES.map((passage) => [passage.id, passage]));
export const READING_QUESTIONS = READING_PASSAGES.flatMap((passage) =>
  passage.questions.map((question) => ({ passage, question })),
);
