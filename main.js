// Needs refactoring

// Elements that are used and modified
const enterBtn = document.querySelector("#enter");
const newBtn = document.querySelector("#new");
const readBtn = document.querySelector("#read");
const prompt = document.querySelector(".prompt");
const wordCount = document.querySelector(".count");
const form = document.querySelector(".input-container");
const wordInput = document.querySelector("#word-input");
const titleEl = document.querySelector(".title");
const libz = document.querySelector(".libz");

// The utterance object for speech synth
const utterance = new SpeechSynthesisUtterance();

// Base variables to control libz logic
const vowels = ["a", "e", "i", "o", "u"];
let words = [];
let speech = [];
let lib, blanks, title, value;
let isReading = false;
let allWordsEntered = false;

/**
 * Sanatizes user input that will be displayed
 * @param {string} string
 * @returns {string}
 */
function sanitize(string) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, (match) => map[match]);
}

/**
 * Clear the wordInput for the next word
 */
function clearInput() {
  form.reset();
}

/**
 * Cancels SpeechSynth, Clears Inputs, and reverts
 * variables and elements to a default state. Then
 * it populates the blanks and value arrays with
 * the values found in the lib object.
 */
function beginReset() {
  speechSynthesis.cancel();
  clearInput();
  libz.classList.remove("active");
  libz.innerText = "";
  titleEl.innerText = "";
  allWordsEntered = false;
  isReading = false;
  enterBtn.innerText = "Enter";
  wordInput.removeAttribute("disabled");
  readBtn.setAttribute("disabled", "");
  words = [];
  speech = [];
  blanks = [...lib.blanks];
  value = [...lib.value];
}

/**
 * Resets the page and fetches a new lib
 */
async function resetLib() {
  // Set the lib object to be a new lib from the api
  lib = await fetchLib();
  beginReset();
  populatePrompt();
}

/**
 * Resets the page and restarts the last used lib.
 */
function restart() {
  beginReset();
  populatePrompt();
}

/**
 * Toggles the enterBtn animation, disables the wordInput if
 * the words have all been entered and sets enterBtn to 'RESTART'.
 * @param {event} e
 * @returns {VoidFunction}
 */
function enterBtnToggle(e) {
  if (e?.which !== 13 || e?.keyCode !== 13) return;
  if (e.type === "keydown") {
    enterBtn.classList.add("active");
  } else {
    enterBtn.classList.remove("active");
  }
}

/**
 * Checks if there are more blanks to be filled
 * in the lib and adds the word request to the
 * page.
 */
function populatePrompt() {
  // If there are still blanks, change the prompt
  // else stop accepting input
  if (blanks.length !== 0) {
    // setTimeout used to give element time to fade out
    // before the new prompt is added
    setTimeout(() => (prompt.innerText = `Enter ${vowels.includes(blanks[0][0]) ? "an" : "a"} ${blanks[0]}`), 250);
    wordInput.focus();
  } else {
    allWordsEntered = true;
    clearInput();
    // remove the active class from the btn
    // because the keyup event won't be fired
    // once the input is disabled
    enterBtn.classList.remove("active");
    wordInput.setAttribute("disabled", true);
    enterBtn.innerText = "RESTART";
    prompt.innerText = "All Done!";
  }
  setTimeout(() => prompt.classList.add("active"), 250);
  wordCount.innerText = `Blank Count: ${blanks.length}`;
}

/**
 * Starts SpeechSythesis with added logic
 * to compensate for speech cut off bug
 */
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

/**
 * Takes in a string and splits it into an array
 * of sentences.
 * @param {string} content
 * @returns {Array}
 */
function chunkSentences(content) {
  // Uses a lookbehind regex to match groups to split on without including extra.
  return [...content.split(/(?<=\.|\!|\?)\s*/)];
}

/**
 * Takes the chunks of the lib 'value' array and
 * uses the user input from the words array to
 * create a single string of lib content to be
 * displayed and read.
 */
function generate() {
  const content = value
    .slice(0, -1)
    .map((chunk, i) => {
      // console.log(i);
      return `${chunk}${words[i] ? words[i] : ""}`;
    })
    .join("");
  titleEl.innerText = lib.title;
  // libz.innerText = content;
  libz.innerHTML = content;
  libz.classList.add("active");

  value = content;
  // console.log(content);
}

/**
 * Takes the word submitted by the user in the wordInput
 * handles restarting the lib, clearing the input, and
 * starting prompt population
 * @param {event} e
 */
function submit(e) {
  e.preventDefault();

  //! Find a better way
  if (allWordsEntered && e.submitter.id == "enter") {
    restart();
  }
  if (!wordInput.value.trim() || words.length === lib?.blanks.length) return;
  prompt.classList.remove("active");
  // words.push(wordInput.value.trim());
  // Adding sanitization to user input
  words.push(sanitize(wordInput.value.trim()));
  blanks.shift();
  clearInput();
  populatePrompt();
  if (words.length === lib.blanks.length) {
    generate();
    readBtn.removeAttribute("disabled");
  }
}

/**
 * Sets the default voice to be used by SpeechSynthesis
 */
function setVoice() {
  voices = this.getVoices();
  // console.log(voices);
  utterance.voice = voices.find((voice) => voice.name.includes("Google US English"));
}

/**
 * Async function to fetch a random lib from a madlibz api.
 * Adds values to the base logic variables and sets the initial prompt
 * @returns {Object}
 */
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
  return body;
}

// ----------- Event listeners -----------
// triggers button animation
wordInput.addEventListener("keydown", enterBtnToggle);
// reverts button animation
wordInput.addEventListener("keyup", enterBtnToggle);
// triggers a new lib to be fetched
newBtn.addEventListener("click", resetLib);
// triggers the finished lib to be read by SpeechSynth
readBtn.addEventListener("click", readToggle);
// Changes the default SpeechSynth voice
speechSynthesis.addEventListener("voiceschanged", setVoice);

// Fetches an inital lib to start with on page load.
(async () => {
  speechSynthesis.cancel();

  lib = await fetchLib();
  populatePrompt();

  // attach the event listeners to the form here
  form.addEventListener("submit", submit);
  // prevents held keys spam
  form.addEventListener("keydown", (e) => {
    if (e.repeat) {
      e.preventDefault();
    }
  });
})();
