import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { connect, getCollection } from "./db.js"; // Import MongoDB utility

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3500;
const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

const io = new Server(expressServer, {
  cors: {
    origin: ["http://localhost:3500", "http://127.0.0.1:3500"],
  },
});

// Connect to MongoDB
await connect();

// Helper functions
async function getAllActiveRooms() {
  const usersCollection = getCollection("users");
  const users = await usersCollection.find().toArray();
  return Array.from(new Set(users.map((user) => user.room)));
}

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on("enterRoom", async ({ name, room }) => {
    const usersCollection = getCollection("users");
    const messagesCollection = getCollection("messages");

    // Leave previous room
    const prevUser = await usersCollection.findOne({ socketId: socket.id });
    if (prevUser) {
      const prevRoom = prevUser.room;
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        "message",
        buildMsg(ADMIN, `${prevUser.name} has left the room`)
      );
      await usersCollection.updateOne(
        { socketId: socket.id },
        { $set: { name, room } }
      );
    } else {
      await usersCollection.insertOne({ socketId: socket.id, name, room });
    }

    const usersInRoom = await usersCollection.find({ room }).toArray();
    const previousMessages = await messagesCollection
      .find({ room })
      .sort({ time: 1 })
      .toArray();
    socket.join(room);
    socket.emit(
      "message",
      buildMsg(ADMIN, `You have joined the ${room} chat room`)
    );
    socket.emit("previousMessages", previousMessages); // Send previous messages to the client
    socket.broadcast
      .to(room)
      .emit("message", buildMsg(ADMIN, `${name} has joined the room`));

    io.to(room).emit("userList", {
      users: usersInRoom.map((user) => ({ name: user.name })),
    });
    io.emit("roomList", { rooms: await getAllActiveRooms() });
  });

  socket.on("disconnect", async () => {
    // const usersCollection = getCollection("users");
    // const user = await usersCollection.findOneAndDelete({
    //   socketId: socket.id,
    // });
    // if (user.value) {
    //   io.to(user.value.room).emit(
    //     "message",
    //     buildMsg(ADMIN, `${user.value.name} has left the room`)
    //   );
    //   const usersInRoom = await usersCollection
    //     .find({ room: user.value.room })
    //     .toArray();
    //   io.to(user.value.room).emit("userList", {
    //     users: usersInRoom.map((user) => ({ name: user.name })),
    //   });
    //   io.emit("roomList", { rooms: await getAllActiveRooms() });
    // }
    console.log(`User ${socket.id} disconnected`);
  });

  socket.on("message", async ({ name, text }) => {
    const usersCollection = getCollection("users");
    const messagesCollection = getCollection("messages");
    const user = await usersCollection.findOne({ socketId: socket.id });
    if (user) {
      const message = { room: user.room, name, text, time: new Date() };
      await messagesCollection.insertOne(message);
      io.to(user.room).emit("message", buildMsg(name, text));
    }
  });

  socket.on("activity", async (name) => {
    const usersCollection = getCollection("users");
    const user = await usersCollection.findOne({ socketId: socket.id });
    if (user) {
      socket.broadcast.to(user.room).emit("activity", name);
    }
  });
});
