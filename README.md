# Notepad98

A Windows 98-style Notepad for the web, built with 98.css.

Notepad98 is a single-page static web app. It recreates the classic Notepad
window, menu bar, text editor, and status bar while using browser-native file
APIs for local text files.

## Live Demo

GitHub Pages:

```text
https://frankyang0610.github.io/notepad98/
```

## Features

- New, Open, Save, Save As, Page Setup notice, Print, and Exit notice
- Undo, Cut, Copy, Paste, Delete, Select All, and Time/Date
- Find, Find Next, Replace, Replace All, and Go To line
- Word Wrap, Font selection, Status Bar, and Soft Pixels display
- Classic keyboard shortcuts such as `Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+F`,
  `Ctrl+H`, `Ctrl+G`, `F3`, and `F5`
- Offline-friendly vendored 98.css assets

## Run

Open `index.html` directly in a browser, or serve the folder with any static
file server:

```sh
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

## Browser Notes

Chrome and Edge support the File System Access API, so Save can write back to a
previously opened file after permission is granted. Browsers without that API
fall back to downloading a `.txt` file.

Because this is a web page, Exit cannot close a normal browser tab by itself,
and Page Setup is handled by the browser or operating system print dialog.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).

98.css is also MIT licensed and is vendored in `vendor/98.css`. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
