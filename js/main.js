// Intro text for the website
const introTitle = "Welcome to Libzreader!";
const introContent = `Libzreader is my take on a classic word game that I enjoyed playing as a kid. Follow the word prompts to build your own wacky story, then click the "READ" button to have your device read your story aloud to you!<br><br>This project uses Speech Synthesis from the Web Speech API with Netlify Functions for accessing
            the stories and prompts stored in Google's Firebase Firestore.`;

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
const count = sessionStorage.getItem("templateCount") ?? await getCount()

// The utterance object for speech synth
const utterance = new SpeechSynthesisUtterance();

// Base variables to control libz logic
const delay = 250;
const vowels = ["a", "e", "i", "o", "u"];
let words = [];
let speech = [];
let lib, blanks, title, value, voices;
let isReading = false;
let allWordsEntered = false;
// To track what el needs the click event fired on a keyup
// during btnToggle event listener
let delayedClick = null;

/**
 * Display the website introduction
 */
function showIntro() {
  libzreader.classList.add("active");
  delayedTextTransition(0, introTitle, introContent);
  form.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      libzreader.classList.remove("active");
    },
    { once: true }
  );
}

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
  newBtn.classList.remove("active");

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
  delayedTextTransition(delay + (1500 - delay));
}

/**
 *
 * @param {number} delayTime The time to subtract from the transition time of 1500. Defaults to the value of the const 'delay'
 * @param {string} newTitle The new title. Defaults to empty string
 * @param {string} newContent The new paragraph content. Defaults to empty string
 */
function delayedTextTransition(delayTime = delay, newTitle = "", newContent = "") {
  setTimeout(() => {
    titleEl.innerHTML = newTitle;
    libz.innerHTML = newContent;
  }, delayTime);
}

/**
 * Resets the page and fetches a new lib
 */
async function resetLib() {
  // Set the lib object to be a new lib from the api
  try {
    lib = await fetchLib();
    beginReset();
    populatePrompt();
  } catch (error) {
    titleEl.innerText = "Unable to Fetch Lib";
    libzreader.classList.add("active");
    return;
  }
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
function btnToggle(e) {
  if (e?.which !== 13 || e?.keyCode !== 13) return;
  // Set the button to be toggled based on the target.
  const btn = e.target.tagName === "INPUT" ? enterBtn : e.target;
  if (e.type === "keydown") {
    btn.classList.add("active");
    // If the target is the "New" or "Read" button
    // delay the click event and fire it on keyup instead.
    if (btn.id === "new" || btn.id === "read" || btn.innerText === "RESTART") {
      e.preventDefault();
      delayedClick = btn;
    }
  } else {
    btn.classList.remove("active");
    // If there is a delayed Click
    // fire it and clear the variable.
    if (delayedClick) {
      delayedClick.click();
      delayedClick = null;
    }
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
    setTimeout(() => {
      if (blanks.length !== 0) {
        prompt.innerText = `Enter ${vowels.includes(blanks[0][0]) ? "an" : "a"} ${blanks[0]}`;
      }
    }, delay);
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
      return `${chunk.trim()}${words[i] ? " " + words[i] : ""}${
        i + 1 > value.slice(0, -1).length - 1 ? "" : value[i + 1].trim().match(/^\W/) ? "" : " "
      }`;
    })
    .join("");
  libzreader.classList.add("active");
  // titleEl.innerText = lib.title;
  // libz.innerText = content;
  delayedTextTransition(0, lib.title, content);
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
 * Recursive async function to fetch a random lib from a madlibz api.
 * Will recursively call itself if the demo lib is fetched.
 * Adds values to the base logic variables and sets the initial prompt
 * Uses https://madlibz.herokuapp.com/api#help for source of the libs.
 * May update for a wider range of lib options.
 *
 * @returns {Object}
 */
async function fetchLib() {
  readBtn.setAttribute("disabled", "");
  try {
    const template = await getTemplate()

    blanks = [...template.blanks];
    title = template.title;
    value = template.value;
    return template;
  } catch (e) {
    console.log(e);
    titleEl.innerText = "Unable to Fetch Lib";
    libzreader.classList.add("active");
    return;
  }
}

async function getTemplate() {
  const randomTemplateId = Math.floor((Math.random() * count) + 1)
  let template = JSON.parse(localStorage.getItem(`templateId${randomTemplateId}`))
  if (!template) {
    const response = await fetch(".netlify/functions/getTemplate", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: randomTemplateId
      })
    })
    template = await response.json();
    localStorage.setItem(`templateId${randomTemplateId}`, JSON.stringify(template))
  }
  return template
}

async function getCount() {
  const response = await fetch('.netlify/functions/getTemplateCount')
  const count = await response.json()
  sessionStorage.setItem("templateCount",count)
  return count
}

// ----------- Event listeners -----------
// triggers button animation
wordInput.addEventListener("keydown", btnToggle);
enterBtn.addEventListener("keydown", btnToggle);
newBtn.addEventListener("keydown", btnToggle);
readBtn.addEventListener("keydown", btnToggle);

// reverts button animation
wordInput.addEventListener("keyup", btnToggle);
enterBtn.addEventListener("keyup", btnToggle);
newBtn.addEventListener("keyup", btnToggle);
readBtn.addEventListener("keyup", btnToggle);

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
    populatePrompt(); // Get the prompt ready
    showIntro(); // Display the website introduction

    // attach the event listeners to the form here
    form.addEventListener("submit", submit);
    // prevents held keys spam
    form.addEventListener("keydown", (e) => {
      if (e.repeat && (e?.which !== 8 || e?.keyCode !== 8)) {
        e.preventDefault();
      }
    });
  } catch (e) {
    console.log(e)
    return;
  }
})();
