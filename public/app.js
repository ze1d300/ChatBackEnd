// Establish a connection to the server
const socket = io("ws://localhost:3500");

// Get references to the HTML elements
const msgInput = document.querySelector("#message");
const nameInput = document.querySelector("#name");
const chatRoom = document.querySelector("#room");
const activity = document.querySelector(".activity");
const usersList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const chatDisplay = document.querySelector(".chat-display");

// Check local storage for stored name and room
window.onload = () => {
  const storedName = localStorage.getItem("name");
  const storedRoom = localStorage.getItem("room");

  if (storedName && storedRoom) {
    nameInput.value = storedName;
    chatRoom.value = storedRoom;
    enterRoom({ preventDefault: () => {} });
  }
};

// Function to send a message
const sendMessage = (e) => {
  e.preventDefault();
  // Check if all required fields have values
  if (nameInput.value && msgInput.value && chatRoom.value) {
    // Emit a 'message' event to the server with the message details
    socket.emit("message", {
      name: nameInput.value,
      text: msgInput.value,
    });
    // Clear the message input field
    msgInput.value = "";
  }
  // Focus on the message input field
  msgInput.focus();
};

// Function to enter a room
const enterRoom = (e) => {
  e.preventDefault();
  // Check if all required fields have values
  if (nameInput.value && chatRoom.value) {
    // Store name and room in local storage
    localStorage.setItem("name", nameInput.value);
    localStorage.setItem("room", chatRoom.value);

    // Emit an 'enterRoom' event to the server with the room details
    socket.emit("enterRoom", {
      name: nameInput.value,
      room: chatRoom.value,
    });
  }
};

// Add event listeners for form submissions
document.querySelector(".form-msg").addEventListener("submit", sendMessage);
document.querySelector(".form-join").addEventListener("submit", enterRoom);

// Emit an 'activity' event to the server when a key is pressed in the message input field
msgInput.addEventListener("keypress", () => {
  socket.emit("activity", nameInput.value);
});

// Listen for 'message' events from the server
socket.on("message", (data) => {
  displayMessage(data);
});

// Listen for 'previousMessages' events from the server
socket.on("previousMessages", (messages) => {
  messages.forEach(displayMessage);
});

const displayMessage = (data) => {
  // Clear the activity display
  activity.textContent = "";
  activity.style.display = "none";

  // Create a new list item for the message
  const { name, text, time } = data;
  const li = document.createElement("li");
  li.className = "post";

  if (name === nameInput.value) {
    li.className = "post post--left";
  } else {
    li.className = "post post--right";
  }

  li.innerHTML = `<div class="post__header ${
    name === nameInput.value ? "post__header--user" : "post__header--reply"
  }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`;

  // Add the new message to the chat display
  chatDisplay.appendChild(li);

  // Scroll to the bottom of the chat display
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
};

// Listen for 'activity' events from the server
let activityTimer;
socket.on("activity", (name) => {
  // Display the activity message
  activity.textContent = `${name} is typing...`;
  activity.style.display = "block";

  // Clear the activity message after 3 seconds
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = "";
    activity.style.display = "none";
  }, 3000);
});

// Listen for 'userList' and 'roomList' events from the server
socket.on("userList", ({ users }) => {
  showUsers(users);
});
socket.on("roomList", ({ rooms }) => {
  showRooms(rooms);
});

// Functions to display the list of users and rooms
const showUsers = (users) => {
  // Clear the users list
  usersList.textContent = "";
  if (users) {
    // Add the users to the list
    usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      usersList.textContent += ` ${user.name}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ",";
      }
    });
  }
};

const showRooms = (rooms) => {
  // Clear the rooms list
  roomList.textContent = "";
  if (rooms) {
    // Add the rooms to the list
    roomList.innerHTML = "<em>Active Rooms:</em>";
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`;
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += ",";
      }
    });
  }
};
