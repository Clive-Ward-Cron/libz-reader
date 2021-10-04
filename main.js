// Needs refactoring

const enterBtn = document.querySelector("#enter");
const newBtn = document.querySelector("#new");
const readBtn = document.querySelector("#read");
const prompt = document.querySelector(".prompt");
const wordCount = document.querySelector(".count");
const form = document.querySelector(".input-container");
const input = document.querySelector("#word-input");
const titleEl = document.querySelector(".title");
const libz = document.querySelector(".libz");
const vowels = ["a", "e", "i", "o", "u"];

const utterance = new SpeechSynthesisUtterance();

let words = [];
let speech = [];
let lib, blanks, title, value;

function clearInput() {
  form.reset();
}

async function resetLib() {
  speechSynthesis.cancel();
  libz.innerText = "";
  lib = await fetchLib();
  words = [];
  speech = [];
  blanks = [...lib.blanks];
  value = [...lib.value];
}

function enterBtnToggle(e) {
  if (e?.which !== 13 || e?.keyCode !== 13) return;
  if (e.type === "keydown") {
    enterBtn.classList.add("active");
  } else {
    enterBtn.classList.remove("active");
  }
}

function populatePrompt() {
  if (blanks.length !== 0) {
    prompt.innerText = `Enter ${vowels.includes(blanks[0][0]) ? "an" : "a"} ${blanks[0]}`;
    // console.log(blanks.length);
  } else {
    prompt.innerText = "All Done!";
  }
  wordCount.innerText = `Blank Count: ${blanks.length}`;
}

function read() {
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
  if (!input.value.trim() || words.length === lib?.blanks.length) return;
  // console.log(e);

  words.push(input.value.trim());
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
  // const res = await fetch("http://madlibz.herokuapp.com/api/random");
  const res = await fetch("http://madlibz.herokuapp.com/api/random?maxlength=10");
  const body = await res.json();
  if (body.title === "Hello ____!") return fetchLib();
  // console.log(body);
  blanks = [...body.blanks];
  title = body.title;
  value = body.value;
  populatePrompt();
  return body;
}

input.addEventListener("keydown", enterBtnToggle);
input.addEventListener("keyup", enterBtnToggle);
newBtn.addEventListener("click", resetLib);
readBtn.addEventListener("click", read);
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
