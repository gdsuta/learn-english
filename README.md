# Classroom English for Indonesian Primary Teachers

A free website that helps Indonesian primary school teachers (SD, Grades 3–6) learn and practise **Classroom English**: the everyday words, phrases and conversations needed to teach an English lesson *in English*, with confidence.

> **Ringkasan (Bahasa Indonesia):** Situs gratis untuk membantu guru SD kelas 3–6 di Indonesia belajar *Classroom English*: kosakata level CEFR A1, ungkapan kelas, dan latihan percakapan dengan audio, agar Bapak/Ibu guru percaya diri mengajar dalam bahasa Inggris.

This project started as a prototype built in Google Sites and is now being developed into a standalone website.

---

## Features

### 📖 Vocabulary: A1 Word Bank
- **739 high-frequency words** (CEFR A1 level), all with Indonesian meanings
- **20 themes**: Greetings, Classroom Objects, School Places & People, School Subjects, Classroom Actions, Numbers & Shapes, Colours, Days & Time, Weather & Nature, Body & Health, Feelings, Family, Home & Daily Routine, Food & Drink, Animals, Clothes, Places & Transport, Hobbies & Sports, Describing Things, and Question & Small Words
- Click any word to hear it, or play a whole theme
- Search in English or Indonesian
- Mark words as *learned* and track progress (saved in the browser)
- **Flashcards**: flip, shuffle, listen
- **Quiz**: 10 questions per round, in two modes: *Listen → choose the meaning* and *Indonesian → English*

### 🗣️ Classroom Phrases
- **143 ready-to-use sentences** in 11 lesson stages: starting the lesson, taking the register, giving instructions, checking understanding, praise, managing the class, pair & group work, games & songs, helping students, ending the lesson, and *What Students Say*
- A practical teaching tip for every stage
- **Play all** pauses after each sentence so teachers can repeat it aloud
- **Hide Indonesian** and **Test me (hide English)** modes for self-checking

### 🎭 Conversation Practice
- **12 real classroom situations**, e.g. a late student, a sick student, checking homework, pair work, *Simon Says*, gentle pronunciation correction, Monday small talk
- **Listen mode**: the full dialogue with different voices for the teacher and the students
- **Role-play as teacher mode**: the computer speaks the students' lines. On the teacher's turn the user sees the Indonesian hint, says the English line aloud, then reveals the answer.
- Optional **"Check my speaking"** using speech recognition (where the browser supports it)

### 🏠 Home
- How to use the site
- A **4-week confidence plan** (15 minutes a day)
- 6 tips for teaching in English with confidence

### 🔊 Audio
All audio uses the browser's built-in **Web Speech API** (text-to-speech), so there are no audio files to host. Users can choose a **British or American accent** and **Slow / Normal / Fast** speed. Works best in Google Chrome.

---

## Tech stack

The prototype is written in plain web technologies, with no framework or build step:

- **HTML + CSS + vanilla JavaScript**
- **Web Speech API**: `speechSynthesis` for audio, `SpeechRecognition` for the optional speaking check
- **localStorage** for learning progress (per browser, no account needed)
- **Google Fonts**: [Nunito](https://fonts.google.com/specimen/Nunito)
- Illustrations from [Kitbitz](https://kitbitz.art/) (CC0)

Because it is fully static, it can be deployed to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

---

## Content format

All learning content is kept as simple pipe-separated text so that teachers and non-developers can edit it easily.

### Vocabulary
```text
## objects|✏️|Classroom Objects|Benda di Kelas
book|buku
pencil case|kotak pensil
```
- Header: `## id|icon|English title|Indonesian title`
- Entry: `english|indonesian`

### Classroom phrases
```text
## start|🌅|Starting the Lesson|Membuka Pelajaran|Use the same opening every day...
Good morning, class!|Selamat pagi, anak-anak!
```
- Header: `## id|icon|English title|Indonesian title|Tip`
- Entry: `English sentence|Indonesian translation`

### Dialogues
```text
## Sorry, I'm Late|Maaf, Saya Terlambat|A student arrives late.
Rizky: Excuse me, Miss. May I come in?|Permisi, Bu. Boleh saya masuk?
T: Yes, come in, Rizky. You're late. What happened?|Ya, masuk, Rizky. Kamu terlambat. Ada apa?
```
- Header: `## English title|Indonesian title|Situation`
- Line: `Speaker: English|Indonesian`
- Speakers: `T` = teacher (the user's role in role-play), `Class` = whole class, or any student name

### Content guidelines
- Keep vocabulary at **CEFR A1** level and the total word bank at **no more than 1,000 words**.
- Every English item needs an Indonesian translation.
- Prefer short sentences that teachers can actually say in an SD classroom.
- Names and situations should feel familiar to Indonesian schools (e.g. *Putu, Komang, Dewi, Budi, Siti*, UKS, flag ceremony).
- A word should appear in only one theme.

---

## Suggested project structure

```text
.
├── index.html              # Home
├── vocabulary.html         # Word bank, flashcards, quiz
├── phrases.html            # Classroom phrases
├── conversation.html       # Dialogues & role-play
├── assets/
│   ├── css/style.css       # Shared styles
│   ├── js/tts.js           # Shared text-to-speech + speech-recognition helper
│   ├── js/app.js           # Shared helpers: icons, data parsing, audio settings
│   ├── js/vocabulary.js
│   ├── js/phrases.js
│   ├── js/conversation.js
│   └── img/favicon.svg
├── data/
│   ├── vocabulary.txt
│   ├── phrases.txt
│   └── dialogues.txt
└── README.md
```

---

## Getting started

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```
2. Serve the folder with any local static server. Browsers block `fetch()` for data files opened directly with `file://`, so a server is needed. For example:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` (or the URL shown) in Google Chrome.

### Deploy
- **Vercel / Netlify**: import the repository and deploy as a static site. No build command, output directory `/`.
- **GitHub Pages**: Settings → Pages → deploy from the `main` branch, root folder.

---

## Browser support

| Feature | Chrome | Edge | Safari | Firefox |
|---|---|---|---|---|
| Text-to-speech | ✅ | ✅ | ✅ | ✅ (fewer voices) |
| Speaking check (speech recognition) | ✅ | ✅ | ⚠️ partial | ❌ |

Available voices depend on the user's device and operating system.

---

## Roadmap

- [ ] Split the prototype into separate pages, shared CSS/JS and data files
- [ ] Move learning progress to optional user accounts
- [ ] Printable classroom posters (e.g. *What Students Say*)
- [ ] Downloadable PDF word lists per theme
- [ ] Recorded audio by native speakers as an alternative to text-to-speech
- [ ] More dialogues aligned with Kurikulum Merdeka English topics
- [ ] Full Bahasa Indonesia interface option
- [ ] PWA / offline support for schools with limited internet

---

## Credits

- **Illustrations:** [Kitbitz](https://kitbitz.art/), 2,000+ free hand-drawn illustrations, released under **CC0**
- **Font:** [Nunito](https://fonts.google.com/specimen/Nunito) by Vernon Adams (SIL Open Font License)
- **Level reference:** Common European Framework of Reference for Languages (CEFR), A1

## License

*To be decided.* Add a `LICENSE` file before publishing. For example, MIT for the code and CC BY 4.0 for the learning content.
