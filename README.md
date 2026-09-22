# Target Rush

A fast-paced reaction browser game where you have 30 seconds to click as many targets as possible.

## Features

- **30 Second Timer**: Fast-paced gameplay.
- **Multiple Targets**: Normal, Small (+3 pts), Moving (+5 pts).
- **Bombs**: Avoid clicking bombs (-3 pts, resets combo).
- **Combo System**: Consecutive hits multiply your score! (x2 at 5 hits, x3 at 10 hits).
- **Responsive Design**: Play on desktop or mobile.
- **Web Audio API**: Browser-generated sound effects.

## How to Play

1. Open `index.html` in your web browser.
2. Enter your name and click **Start Game**.
3. Click on the targets as they appear.
4. Build your combo by not missing any clicks and avoiding bombs.
5. Get the highest score possible before the 30 seconds run out!

## Running Locally

Since the game is built with vanilla HTML, CSS, and JavaScript without external assets (like images or sound files that would cause CORS issues), you can simply double-click the `index.html` file to open it in your browser.

Alternatively, you can run a local server:

**Using Python:**
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

**Using Node.js (http-server):**
```bash
npx http-server . -p 8000
```

## Publishing to GitHub Pages

1. Create a new repository on GitHub (e.g., `target-rush`).
2. Upload `index.html`, `style.css`, and `script.js` to the repository.
3. Go to the repository **Settings** > **Pages**.
4. Under **Source**, select the `main` (or `master`) branch and save.
5. Your game will be published at `https://<your-username>.github.io/target-rush/`.

## Author
Created with HTML, CSS, and JavaScript.
