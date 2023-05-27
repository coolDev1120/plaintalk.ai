const chatBox = document.querySelector(".chat-box");
const inputField = chatBox.querySelector("textarea");
const button = chatBox.querySelector("button");
const chatBoxBody = chatBox.querySelector(".chat-box-body");

const clarifyHeader = document.querySelector(".clarify");

const simpleHeader = document.querySelector(".simple");

let customer = null;

clarifyHeader.addEventListener("click", () => {
  console.log("successfully clicked");
  if (!clarifyHeader.classList.contains("active")) {
    setActive(clarifyHeader);
    inputField.placeholder = `Clarify Your Text | More Than 20 Characters`;
    button.classList.remove("*");
    if (button.classList.contains("simple")) button.classList.remove("simple");
    button.classList.add("clarify");
    button.textContent = "Clarify";
    const naming = document.getElementById("naming");
    naming.innerHTML = `You Are Now Using : <span id = "botName">Clarify</span>`;
    const name = document.getElementById("botName");
    name.innerHTML = "Clarify";
    name.style.fontWeight = "700";
    name.style.color = "#0f7cff";
  }
});

simpleHeader.addEventListener("click", () => {
  console.log("simple clicked");
  if (!simpleHeader.classList.contains("active")) {
    setActive(simpleHeader);
    inputField.placeholder = `Make Your Text Simple| More Than 20 Characters`;
    if (button.classList.contains("clarify"))
      button.classList.remove("clarify");
    button.classList.add("simple");
    button.textContent = "Simplify";
    const naming = document.getElementById("naming");
    naming.innerHTML = `You Are Now Using : <span id = "botName">Clarify</span>`;
    const name = document.getElementById("botName");
    name.textContent = "Simple";
    name.style.fontWeight = "700";
    name.style.color = "#fb475e";
  }
});

function setActive(h) {
  const all = document.querySelectorAll("*");
  all.forEach((e) => {
    e.classList.remove("active");
  });
  h.classList.add("active");
}

function scrollToBottom() {
  chatBoxBody.scrollTop = chatBoxBody.scrollHeight;
}

function typeText(element, text) {
  let index = 0;

  let interval = setInterval(() => {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      scrollToBottom();
    } else {
      clearInterval(interval);
    }
  }, 20);
}

let loadInterval;

function loader(element) {
  element.textContent = "Thinking";

  loadInterval = setInterval(() => {
    // Update the text content of the loading indicator
    element.textContent += ".";

    // If the loading indicator has reached three dots, reset it
    if (element.textContent === "Thinking....") {
      element.textContent = "Thinking";
    }
  }, 300);
}

function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);

  return `id-${timestamp}-${hexadecimalString}`;
}

button.addEventListener("click", sendMessage);
inputField.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});

async function sendMessage() {
  let customer = null;
  fetch("/usersUtils", { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      customer = data;
    })
    .then(async () => {
      const prompt = inputField.value;
      if (prompt.length < 20) {
        inputField.value = "";
        inputField.placeholder = `MUST BE MORE THAN 20 CHARACTERS`;
      }
      else if (
        !clarifyHeader.classList.contains("active") &&
        !simpleHeader.classList.contains("active")
      ) {
        input;
      }
      else {
        loader(button);
        inputField.value = "";
        chatBoxBody.innerHTML += `<div class="message"><i class="ri-user-line"></i> ${prompt}</div>`;
        scrollToBottom();
        if (clarifyHeader.classList.contains("active")) {
          await fetch("/layman", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
          })
            .then(async (response) => await response.json())
            .then((data) => {
              button.disabled = false;
              clearInterval(loadInterval);
              button.innerHTML = "Explain";
              const uniqueId = generateUniqueId();
              console.log(customer);
              customerCredits = customer.credits;
              if (customerCredits > 0) {
                chatBoxBody.innerHTML += `<div id=${uniqueId} class="response"> <i class="ri-robot-line"></i> </div><p>You still have <strong style="color: #0f7cff;">${customer.credits}</strong> credits left</p>`;
              } else {
                chatBoxBody.innerHTML += `<div id=${uniqueId} class="response"> <i class="ri-robot-line"></i> </div><p>No more credits left/</p>`;
              }
              const selected = document.getElementById(uniqueId);
              let textWithLineBreaksHTML = data.message
                .trim()
                .replace(/\n/g, "<br>");
              const modifiedString = textWithLineBreaksHTML.replace(
                /(\s)\+(\s)/g,
                "$1$2"
              );
              const modifiedString2 = modifiedString.replace(
                /(\s)\'(\s)/g,
                "$1$2"
              );
              const modifiedString3 = modifiedString2.replace(/(\s)\'/g, "$1");
              const modifiedString4 = modifiedString3.replaceAll("'", "");
              selected.innerHTML += modifiedString4;
              selected.style.backgroundColor = "#0f7cff";
              selected.style.color = "white";
              scrollToBottom();
            });
        } else if (simpleHeader.classList.contains("active")) {
          await fetch("/el5", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
          })
            .then(async (response) => await response.json())
            .then((data) => {
              button.disabled = false;
              clearInterval(loadInterval);
              button.innerHTML = "Explain";
              const uniqueId = generateUniqueId();
              customerCredits = customer.credits - 1;
              if (customerCredits > 0) {
                chatBoxBody.innerHTML += `<div id=${uniqueId} class="response"> <i class="ri-robot-line"></i> </div><p>You still have <strong style="color: #0f7cff;">${customer.credits}</strong> credits left</p>`;
              } else {
                chatBoxBody.innerHTML += `<div id=${uniqueId} class="response"> <i class="ri-robot-line"></i> </div><p>No more credits left/</p>`;
              }
              const selected = document.getElementById(uniqueId);
              let textWithLineBreaksHTML = data.message
                .trim()
                .replace(/\n/g, "<br>");
              const modifiedString = textWithLineBreaksHTML.replace(
                /(\s)\+(\s)/g,
                "$1$2"
              );
              const modifiedString2 = modifiedString.replace(
                /(\s)\'(\s)/g,
                "$1$2"
              );
              const modifiedString3 = modifiedString2.replace(/(\s)\'/g, "$1");
              // const modifiedString4 = modifiedString3.replaceAll("'", "");
              selected.innerHTML += modifiedString3;
              selected.style.backgroundColor = "#fb475e";
              selected.style.color = "white";
              scrollToBottom();
            });
        }
      }
    })
    .catch((e) => {
      console.log(e.message);
    });
}
