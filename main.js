// Needs refactoring

const enterBtn = document.querySelector("#enter");
const newBtn = document.querySelector("#new");
const readBtn = document.querySelector("#read");
const prompt = document.querySelector(".prompt");
const wordCount = document.querySelector(".count");
const form = document.querySelector(".input-container");
const wordInput = document.querySelector("#word-input");
const titleEl = document.querySelector(".title");
const libz = document.querySelector(".libz");
const vowels = ["a", "e", "i", "o", "u"];

const utterance = new SpeechSynthesisUtterance();

let words = [];
let speech = [];
let lib, blanks, title, value;
let isReading = false;
let allWordsEntered = false;

function clearInput() {
  form.reset();
}

async function resetLib() {
  speechSynthesis.cancel();
  lib = await fetchLib();
  libz.innerText = "";
  titleEl.innerText = "";
  allWordsEntered = false;
  isReading = false;
  wordInput.removeAttribute("disabled");
  readBtn.setAttribute("disabled", "");
  words = [];
  speech = [];
  blanks = [...lib.blanks];
  value = [...lib.value];
}

function restart() {
  speechSynthesis.cancel();
  libz.innerText = "";
  titleEl.innerText = "";
  allWordsEntered = false;
  isReading = false;
  enterBtn.innerText = "Enter";
  words = [];
  speech = [];
  blanks = [...lib.blanks];
  value = [...lib.value];

  wordInput.removeAttribute("disabled");
  readBtn.setAttribute("disabled", "");
  populatePrompt();
}

function enterBtnToggle(e) {
  if (e?.which !== 13 || e?.keyCode !== 13) return;
  if (e.type === "keydown") {
    enterBtn.classList.add("active");
  } else {
    enterBtn.classList.remove("active");
    // Don't let user type anymore words into the input;
    if (allWordsEntered) {
      this.setAttribute("disabled", true);
      clearInput();
      enterBtn.innerText = "RESTART";
    }
  }
}

function populatePrompt() {
  if (blanks.length !== 0) {
    prompt.innerText = `Enter ${vowels.includes(blanks[0][0]) ? "an" : "a"} ${blanks[0]}`;
    // console.log(blanks.length);
  } else {
    allWordsEntered = true;
    prompt.innerText = "All Done!";
  }
  wordCount.innerText = `Blank Count: ${blanks.length}`;
}

function readToggle() {
  if (!isReading) {
    isReading = true;
    readBtn.innerText = "Stop";
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    speech = chunkSentences(value);
    speechSynthesis.speak(utterance);
    utterance.onend = function () {
      if (speech.length > 0) {
        utterance.text = speech.shift();
        speechSynthesis.speak(utterance);
      } else {
        utterance.text = "";
      }
    };
  } else {
    isReading = false;
    speech = [];
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    utterance.text = "";
    readBtn.innerText = "Read";
  }
}

function chunkSentences(list) {
  // Uses a lookbehind regex to match groups to split on without including extra.
  return [...list.split(/(?<=\.|\!|\?)\s*/)];
}

function generate() {
  const content = value
    .slice(0, -1)
    .map((chunk, i) => {
      // console.log(i);
      return `${chunk}${words[i] ? words[i] : ""}`;
    })
    .join("");
  titleEl.innerText = lib.title;
  libz.innerText = content;

  value = content;
  // console.log(content);
}

function submit(e) {
  e.preventDefault();
  //! Find a better way
  if (allWordsEntered && e.submitter.id == "enter") {
    restart();
  }
  if (!wordInput.value.trim() || words.length === lib?.blanks.length) return;
  // console.log(e);

  words.push(wordInput.value.trim());
  blanks.shift();
  clearInput();
  populatePrompt();
  if (words.length === lib.blanks.length) {
    generate();
    readBtn.removeAttribute("disabled");
  }
}

function setVoice() {
  voices = this.getVoices();
  // console.log(voices);
  utterance.voice = voices.find((voice) => voice.name.includes("Google US English"));
}

async function fetchLib() {
  readBtn.setAttribute("disabled", "");
  //! Remove when done testing
  const res = await fetch("http://madlibz.herokuapp.com/api/random");
  // const res = await fetch("http://madlibz.herokuapp.com/api/random?maxlength=10");
  const body = await res.json();
  if (body.title === "Hello ____!") return fetchLib();
  // console.log(body);
  blanks = [...body.blanks];
  title = body.title;
  value = body.value;
  populatePrompt();
  return body;
}

wordInput.addEventListener("keydown", enterBtnToggle);
wordInput.addEventListener("keyup", enterBtnToggle);
newBtn.addEventListener("click", resetLib);
readBtn.addEventListener("click", readToggle);
speechSynthesis.addEventListener("voiceschanged", setVoice);

// Fetch a madlib on pageload
(async () => {
  speechSynthesis.cancel();

  lib = await fetchLib();

  form.addEventListener("submit", submit);
  form.addEventListener("keydown", (e) => {
    if (e.repeat) {
      e.preventDefault();
    }
  });
})();
