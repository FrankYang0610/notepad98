(function () {
	"use strict";

	var state = {
		fileName: "Untitled",
		fileHandle: null,
		lastSavedText: "",
		wordWrap: false,
		statusBar: true,
		softPixels: true,
		findText: "",
		matchCase: false,
		fontFamily: "mono",
		fontSize: "14",
		pageSetup: {
			header: "&f",
			footer: "Page &p",
			left: "0.75",
			right: "0.75",
			top: "1",
			bottom: "1"
		}
	};

	var editor = document.getElementById("editor");
	var fileInput = document.getElementById("fileInput");
	var titleText = document.getElementById("titleText");
	var statusFile = document.getElementById("statusFile");
	var statusPosition = document.getElementById("statusPosition");
	var statusEncoding = document.getElementById("statusEncoding");
	var statusBar = document.getElementById("statusBar");
	var modalLayer = document.getElementById("modalLayer");
	var appWindow = document.getElementById("appWindow");

	function isDirty() {
		return editor.value !== state.lastSavedText;
	}

	function displayFileName() {
		return state.fileName || "Untitled";
	}

	function updateTitle() {
		var dirty = isDirty() ? "*" : "";
		var title = dirty + displayFileName() + " - Notepad98";
		titleText.textContent = title;
		document.title = title;
	}

	function updateStatus() {
		var pos = getLineAndColumn();
		statusFile.textContent = displayFileName() + (isDirty() ? " (modified)" : "");
		statusPosition.textContent = "Ln " + pos.line + ", Col " + pos.column;
		statusEncoding.textContent = "UTF-8";
		document.getElementById("wordWrapMenuItem").querySelector(".checkmark").textContent = state.wordWrap ? "\u2713" : "";
		document.getElementById("statusBarMenuItem").querySelector(".checkmark").textContent = state.statusBar ? "\u2713" : "";
		document.getElementById("softPixelsMenuItem").querySelector(".checkmark").textContent = state.softPixels ? "\u2713" : "";
		document.getElementById("goToMenuItem").disabled = state.wordWrap;
		statusBar.classList.toggle("hidden", !state.statusBar);
		editor.classList.toggle("word-wrap", state.wordWrap);
		document.body.classList.toggle("soft-pixels", state.softPixels);
		updateTitle();
	}

	function getLineAndColumn() {
		var start = editor.selectionStart || 0;
		var text = editor.value.slice(0, start);
		var lines = text.split("\n");
		return {
			line: lines.length,
			column: lines[lines.length - 1].length + 1
		};
	}

	function closeMenus() {
		document.querySelectorAll(".menu.open").forEach(function (menu) {
			menu.classList.remove("open");
		});
	}

	function showMessage(title, message, buttons) {
		closeMenus();
		var fragment = document.getElementById("messageTemplate").content.cloneNode(true);
		var dialog = fragment.querySelector(".dialog");
		fragment.getElementById("messageTitle").textContent = title || "Notepad98";
		fragment.getElementById("messageBody").textContent = message;
		var buttonHost = fragment.getElementById("messageButtons");
		var choices = buttons && buttons.length ? buttons : [{ label: "OK", value: "ok", defaultButton: true }];

		return new Promise(function (resolve) {
			choices.forEach(function (choice) {
				var button = document.createElement("button");
				button.type = "button";
				button.textContent = choice.label;
				if (choice.defaultButton) {
					button.className = "default";
				}
				button.addEventListener("click", function () {
					closeDialog();
					resolve(choice.value);
				});
				buttonHost.appendChild(button);
			});

			function closeDialog() {
				modalLayer.hidden = true;
				modalLayer.replaceChildren();
				editor.focus();
			}

			dialog.querySelector("[data-dialog-close]").addEventListener("click", function () {
				closeDialog();
				resolve("cancel");
			});

			modalLayer.replaceChildren(fragment);
			modalLayer.hidden = false;
			modalLayer.querySelector("button.default, button").focus();
		});
	}

	function confirmDiscard() {
		if (!isDirty()) {
			return Promise.resolve("discard");
		}

		return showMessage("Notepad98", "Do you want to save changes to " + displayFileName() + "?", [
			{ label: "Yes", value: "save", defaultButton: true },
			{ label: "No", value: "discard" },
			{ label: "Cancel", value: "cancel" }
		]).then(async function (choice) {
			if (choice === "save") {
				var saved = await saveFile();
				return saved ? "discard" : "cancel";
			}
			return choice;
		});
	}

	async function newFile() {
		var choice = await confirmDiscard();
		if (choice === "cancel") {
			return;
		}
		editor.value = "";
		state.fileName = "Untitled";
		state.fileHandle = null;
		state.lastSavedText = "";
		updateStatus();
		editor.focus();
	}

	async function openFile() {
		var choice = await confirmDiscard();
		if (choice === "cancel") {
			return;
		}

		if (window.showOpenFilePicker) {
			try {
				var handles = await window.showOpenFilePicker({
					types: [{
						description: "Text Documents",
						accept: { "text/plain": [".txt", ".log", ".ini", ".csv"] }
					}]
				});
				var handle = handles[0];
				var file = await handle.getFile();
				var text = await file.text();
				loadText(text, file.name, handle);
				return;
			} catch (error) {
				if (error.name !== "AbortError") {
					showMessage("Open", "Could not open the selected file.");
				}
				return;
			}
		}

		fileInput.value = "";
		fileInput.click();
	}

	function loadText(text, name, handle) {
		editor.value = text;
		state.fileName = name || "Untitled";
		state.fileHandle = handle || null;
		state.lastSavedText = text;
		updateStatus();
		editor.focus();
	}

	async function saveFile() {
		if (state.fileHandle && state.fileHandle.createWritable) {
			try {
				var writable = await state.fileHandle.createWritable();
				await writable.write(editor.value);
				await writable.close();
				state.lastSavedText = editor.value;
				updateStatus();
				return true;
			} catch (error) {
				showMessage("Save", "Could not save to the original file.");
				return false;
			}
		}

		return saveAsFile();
	}

	async function saveAsFile() {
		if (window.showSaveFilePicker) {
			try {
				var handle = await window.showSaveFilePicker({
					suggestedName: displayFileName().endsWith(".txt") ? displayFileName() : displayFileName() + ".txt",
					types: [{
						description: "Text Documents",
						accept: { "text/plain": [".txt"] }
					}]
				});
				state.fileHandle = handle;
				state.fileName = handle.name || state.fileName;
				return saveFile();
			} catch (error) {
				if (error.name !== "AbortError") {
					showMessage("Save As", "Could not save the file.");
				}
				return false;
			}
		}

		var name = displayFileName().endsWith(".txt") ? displayFileName() : displayFileName() + ".txt";
		var blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
		var url = URL.createObjectURL(blob);
		var link = document.createElement("a");
		link.href = url;
		link.download = name;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		state.fileName = name;
		state.lastSavedText = editor.value;
		updateStatus();
		return true;
	}

	function printFile() {
		closeMenus();
		window.print();
	}

	function pageSetup() {
		showMessage("Page Setup", "Browser printing does not expose Windows-style page setup. Use the system print dialog for paper size, margins, headers, and footers.");
	}

	function exitApp() {
		showMessage("Exit", "A web page cannot close itself unless it was opened by script. You can close this browser tab or window.");
	}

	function execEditorCommand(command) {
		editor.focus();
		try {
			document.execCommand(command);
		} catch (error) {
			showMessage("Edit", "This browser blocked the " + command + " command.");
		}
		updateStatus();
	}

	async function paste() {
		editor.focus();
		if (navigator.clipboard && navigator.clipboard.readText) {
			try {
				insertTextAtSelection(await navigator.clipboard.readText());
				return;
			} catch (error) {
				execEditorCommand("paste");
				return;
			}
		}
		execEditorCommand("paste");
	}

	function deleteSelection() {
		insertTextAtSelection("");
	}

	function insertTextAtSelection(text) {
		var start = editor.selectionStart;
		var end = editor.selectionEnd;
		editor.setRangeText(text, start, end, "end");
		editor.dispatchEvent(new Event("input", { bubbles: true }));
		editor.focus();
	}

	function insertTimeDate() {
		var now = new Date();
		insertTextAtSelection(now.toLocaleTimeString() + " " + now.toLocaleDateString());
	}

	function showFind() {
		openFindDialog("findTemplate");
	}

	function showReplace() {
		openFindDialog("replaceTemplate");
	}

	function openFindDialog(templateId) {
		closeMenus();
		var fragment = document.getElementById(templateId).content.cloneNode(true);
		modalLayer.replaceChildren(fragment);
		modalLayer.hidden = false;
		var firstInput = modalLayer.querySelector("input[type='text']");
		if (firstInput) {
			firstInput.value = state.findText;
			firstInput.select();
			firstInput.focus();
		}

		modalLayer.querySelectorAll("[data-dialog-close]").forEach(function (button) {
			button.addEventListener("click", closeDialog);
		});

		modalLayer.querySelectorAll("[data-dialog-action]").forEach(function (button) {
			button.addEventListener("click", function () {
				var action = button.getAttribute("data-dialog-action");
				if (action === "findNext") {
					findNextFromDialog();
				}
				if (action === "replaceOne") {
					replaceOne();
				}
				if (action === "replaceAll") {
					replaceAll();
				}
				if (action === "applyFont") {
					applyFontDialog();
				}
			});
		});
	}

	function closeDialog() {
		modalLayer.hidden = true;
		modalLayer.replaceChildren();
		editor.focus();
	}

	function getDialogFindOptions() {
		var findInput = modalLayer.querySelector("#findText, #replaceFind");
		var matchInput = modalLayer.querySelector("#matchCase, #replaceMatchCase");
		state.findText = findInput ? findInput.value : state.findText;
		state.matchCase = matchInput ? matchInput.checked : state.matchCase;
		return {
			text: state.findText,
			matchCase: state.matchCase,
			direction: modalLayer.querySelector("#findUp:checked") ? "up" : "down"
		};
	}

	function findNextFromDialog() {
		findNext(getDialogFindOptions());
	}

	function findNext(options) {
		options = options || { text: state.findText, matchCase: state.matchCase, direction: "down" };
		if (!options.text) {
			showFind();
			return false;
		}

		var haystack = options.matchCase ? editor.value : editor.value.toLowerCase();
		var needle = options.matchCase ? options.text : options.text.toLowerCase();
		var index = -1;

		if (options.direction === "up") {
			index = haystack.lastIndexOf(needle, Math.max(0, editor.selectionStart - 1));
		 } else {
			index = haystack.indexOf(needle, editor.selectionEnd);
			if (index === -1) {
				index = haystack.indexOf(needle, 0);
			}
		}

		if (index === -1) {
			showMessage("Notepad98", "Cannot find \"" + options.text + "\".");
			return false;
		}

		editor.focus();
		editor.setSelectionRange(index, index + options.text.length);
		updateStatus();
		return true;
	}

	function replaceOne() {
		var options = getDialogFindOptions();
		var replacement = modalLayer.querySelector("#replaceWith").value;
		var selected = editor.value.slice(editor.selectionStart, editor.selectionEnd);
		var same = options.matchCase ? selected === options.text : selected.toLowerCase() === options.text.toLowerCase();

		if (!same && !findNext(options)) {
			return;
		}

		insertTextAtSelection(replacement);
		findNext(options);
	}

	function replaceAll() {
		var options = getDialogFindOptions();
		var replacement = modalLayer.querySelector("#replaceWith").value;
		if (!options.text) {
			return;
		}

		var flags = options.matchCase ? "g" : "gi";
		var escaped = options.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		var regex = new RegExp(escaped, flags);
		var count = (editor.value.match(regex) || []).length;
		editor.value = editor.value.replace(regex, replacement);
		editor.dispatchEvent(new Event("input", { bubbles: true }));
		showMessage("Replace", "Replaced " + count + " occurrence" + (count === 1 ? "." : "s."));
	}

	function goToLine() {
		if (state.wordWrap) {
			showMessage("Go To", "Go To is unavailable while Word Wrap is on.");
			return;
		}

		var current = getLineAndColumn().line;
		var line = window.prompt("Line number:", String(current));
		if (!line) {
			return;
		}
		var target = Math.max(1, parseInt(line, 10) || current);
		var lines = editor.value.split("\n");
		var pos = 0;
		for (var i = 0; i < Math.min(target - 1, lines.length - 1); i += 1) {
			pos += lines[i].length + 1;
		}
		editor.focus();
		editor.setSelectionRange(pos, pos);
		updateStatus();
	}

	function showFont() {
		closeMenus();
		var fragment = document.getElementById("fontTemplate").content.cloneNode(true);
		modalLayer.replaceChildren(fragment);
		modalLayer.hidden = false;
		var family = modalLayer.querySelector("#fontFamily");
		var size = modalLayer.querySelector("#fontSize");
		family.value = state.fontFamily;
		size.value = state.fontSize;
		updateFontSample();
		family.addEventListener("change", updateFontSample);
		size.addEventListener("change", updateFontSample);
		modalLayer.querySelectorAll("[data-dialog-close]").forEach(function (button) {
			button.addEventListener("click", closeDialog);
		});
		modalLayer.querySelector("[data-dialog-action='applyFont']").addEventListener("click", applyFontDialog);
		family.focus();
	}

	function fontFamilyValue(key) {
		if (key === "system") {
			return "\"Pixelated MS Sans Serif\", Arial, sans-serif";
		}
		if (key === "notepad") {
			return "\"Lucida Console\", \"Courier New\", monospace";
		}
		return "\"Courier New\", monospace";
	}

	function updateFontSample() {
		var sample = modalLayer.querySelector("#fontSample");
		if (!sample) {
			return;
		}
		sample.style.fontFamily = fontFamilyValue(modalLayer.querySelector("#fontFamily").value);
		sample.style.fontSize = modalLayer.querySelector("#fontSize").value + "px";
	}

	function applyFontDialog() {
		state.fontFamily = modalLayer.querySelector("#fontFamily").value;
		state.fontSize = modalLayer.querySelector("#fontSize").value;
		editor.style.fontFamily = fontFamilyValue(state.fontFamily);
		editor.style.fontSize = state.fontSize + "px";
		closeDialog();
	}

	function showHelp() {
		showMessage("Help Topics", "Notepad98 supports New, Open, Save, Save As, Print, Undo, Cut, Copy, Paste, Delete, Find, Find Next, Replace, Go To, Select All, Time/Date, Word Wrap, Font, Status Bar, and classic keyboard shortcuts.");
	}

	function showAbout() {
		showMessage("About Notepad98", "Notepad98 is a small Windows 98-style text editor built with 98.css. It saves locally through your browser.");
	}

	var actions = {
		newFile: newFile,
		openFile: openFile,
		saveFile: saveFile,
		saveAsFile: saveAsFile,
		pageSetup: pageSetup,
		printFile: printFile,
		exitApp: exitApp,
		undo: function () { execEditorCommand("undo"); },
		cut: function () { execEditorCommand("cut"); },
		copy: function () { execEditorCommand("copy"); },
		paste: paste,
		deleteSelection: deleteSelection,
		selectAll: function () { editor.focus(); editor.select(); updateStatus(); },
		insertTimeDate: insertTimeDate,
		showFind: showFind,
		findNext: function () { findNext(); },
		showReplace: showReplace,
		goToLine: goToLine,
		toggleWordWrap: function () { state.wordWrap = !state.wordWrap; updateStatus(); },
		showFont: showFont,
		toggleStatusBar: function () { state.statusBar = !state.statusBar; updateStatus(); },
		toggleSoftPixels: function () { state.softPixels = !state.softPixels; updateStatus(); },
		showHelp: showHelp,
		showAbout: showAbout
	};

	document.querySelectorAll(".menu-button").forEach(function (button) {
		button.addEventListener("click", function (event) {
			event.stopPropagation();
			var menu = button.closest(".menu");
			var wasOpen = menu.classList.contains("open");
			closeMenus();
			menu.classList.toggle("open", !wasOpen);
		});
	});

	document.querySelectorAll("[data-action]").forEach(function (button) {
		button.addEventListener("click", function () {
			closeMenus();
			var action = actions[button.getAttribute("data-action")];
			if (action) {
				action();
			}
		});
	});

	document.addEventListener("click", function (event) {
		if (!event.target.closest(".menu")) {
			closeMenus();
		}
	});

	document.addEventListener("keydown", function (event) {
		var mod = event.ctrlKey || event.metaKey;
		if (event.key === "F1") {
			event.preventDefault();
			showHelp();
		}
		if (event.key === "F3") {
			event.preventDefault();
			findNext();
		}
		if (event.key === "F5") {
			event.preventDefault();
			insertTimeDate();
		}
		if (!mod) {
			return;
		}
		var key = event.key.toLowerCase();
		var shortcutMap = {
			n: newFile,
			o: openFile,
			s: saveFile,
			p: printFile,
			f: showFind,
			h: showReplace,
			g: goToLine
		};
		if (shortcutMap[key]) {
			event.preventDefault();
			shortcutMap[key]();
		}
	});

	editor.addEventListener("input", updateStatus);
	editor.addEventListener("click", updateStatus);
	editor.addEventListener("keyup", updateStatus);
	editor.addEventListener("select", updateStatus);

	fileInput.addEventListener("change", function () {
		var file = fileInput.files && fileInput.files[0];
		if (!file) {
			return;
		}
		file.text().then(function (text) {
			loadText(text, file.name, null);
		});
	});

	document.getElementById("minimizeButton").addEventListener("click", function () {
		appWindow.classList.toggle("minimized");
	});

	document.getElementById("maximizeButton").addEventListener("click", function () {
		appWindow.classList.toggle("maximized");
		appWindow.classList.remove("minimized");
	});

	document.getElementById("closeButton").addEventListener("click", async function () {
		var choice = await confirmDiscard();
		if (choice !== "cancel") {
			appWindow.classList.add("minimized");
		}
	});

	window.addEventListener("beforeunload", function (event) {
		if (isDirty()) {
			event.preventDefault();
			event.returnValue = "";
		}
	});

	updateStatus();
	editor.focus();
}());
