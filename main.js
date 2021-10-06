// Needs refactoring

// Elements that are used and modified
const enterBtn = document.querySelector("#enter");
const newBtn = document.querySelector("#new");
const readBtn = document.querySelector("#read");
const prompt = document.querySelector(".prompt");
const wordCount = document.querySelector(".count span");
const form = document.querySelector(".input-container");
const wordInput = document.querySelector("#word-input");
const titleEl = document.querySelector(".title");
const libz = document.querySelector(".libz");
const libzreader = document.querySelector(".libzreader");
const copyYear = document.querySelector("#copy-year");

// The utterance object for speech synth
const utterance = new SpeechSynthesisUtterance();

// Base variables to control libz logic
const delay = 250;
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
  libzreader.classList.remove("active");

  allWordsEntered = false;
  isReading = false;
  enterBtn.innerText = "Enter";
  wordInput.removeAttribute("disabled");
  readBtn.innerText = "Read";
  readBtn.setAttribute("disabled", "");
  words = [];
  speech = [];
  blanks = [...lib.blanks];
  value = [...lib.value];
  setTimeout(() => {
    libz.innerHTML = "";
    titleEl.innerText = "";
  }, delay + (1500 - delay));
}

/**
 * Resets the page and fetches a new lib
 */
async function resetLib() {
  // Set the lib object to be a new lib from the api
  try {
    lib = await fetchLib();
  } catch (e) {
    return;
  }
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
  prompt.classList.remove("active");
  // If there are still blanks, change the prompt
  // else stop accepting input
  if (blanks.length !== 0) {
    // setTimeout used to give element time to fade out
    // before the new prompt is added
    setTimeout(() => (prompt.innerText = `Enter ${vowels.includes(blanks[0][0]) ? "an" : "a"} ${blanks[0]}`), delay);
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
    setTimeout(() => (prompt.innerText = "All Done!"), delay);
  }
  setTimeout(() => prompt.classList.add("active"), delay);
  updateWordCount(blanks.length);
}

/**
 * Update the word count displayed
 * @param {integer|string} count
 */
function updateWordCount(count) {
  wordCount.classList.remove("active");
  setTimeout(() => {
    wordCount.innerText = `${count}`;
    wordCount.classList.add("active");
  }, delay);
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
        readBtn.innerText = "Read";
        isReading = false;
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
      return `${chunk}${words[i] ? words[i] : ""}`;
    })
    .join("");
  libzreader.classList.add("active");
  titleEl.innerText = lib.title;
  libz.innerHTML = content;
  value = content;
  readBtn.removeAttribute("disabled");
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
    return;
  }
  if (!wordInput.value.trim() || words.length === lib?.blanks.length) return;
  // prompt.classList.remove("active");
  // Adding sanitization to user input and puts it on the end of the array
  words.push(sanitize(wordInput.value.trim()));
  // Removes the word at index 0 that has already been supplied
  blanks.shift();
  // Clear the wordInput for the next word
  clearInput();
  // Change the prompt to as for the next word at index 0 from the blanks array
  populatePrompt();
  // If the length of the words array is the same the original blanks array,
  // Generate the full content to be displayed and read
  if (words.length === lib.blanks.length) {
    generate();
  }
}

/**
 * Sets the default voice to be used by SpeechSynthesis
 */
function setVoice() {
  voices = speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.name.includes("Google US English"));
}

/**
 * Async function to fetch a random lib from a madlibz api.
 * Adds values to the base logic variables and sets the initial prompt
 * Uses https://madlibz.herokuapp.com/api#help for source of the libs.
 * May update for a wider range of lib options.
 * @returns {Object}
 */
async function fetchLib() {
  readBtn.setAttribute("disabled", "");
  // const res = await fetch("https://madlibz.herokuapp.com/api/random");
  try {
    const res = await fetch("http://madlibz.herokuapp.com/api/random");
    const body = await res.json();
    if (body.title === "Hello ____!") return fetchLib();
    blanks = [...body.blanks];
    title = body.title;
    value = body.value;
    return body;
  } catch (e) {
    console.log(e);
    titleEl.innerText = "Unable to Fetch Lib";
    libzreader.classList.add("active");
    return;
  }
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
setVoice(); // FireFox doesn't fire the voiceschanged event on page load like Chrome
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.addEventListener("voiceschanged", setVoice);
}

// Fetches an inital lib to start with on page load.
(async () => {
  try {
    speechSynthesis.cancel();
    copyYear.innerText = new Date().getFullYear();
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
  } catch (e) {
    return;
  }
})();
