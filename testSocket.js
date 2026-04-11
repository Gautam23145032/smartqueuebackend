const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

const queueId = 14; // change to the queue you created

socket.on("connect", () => {
    console.log("Connected to server");
    console.log("Socket ID:", socket.id);

    // join queue room
    socket.emit("join_queue_room", queueId);
});

socket.on("queue_updated", (data) => {
    console.log("Queue updated:", data);
});

socket.on("queue_served", (data) => {
    console.log("Queue served:", data);
});

socket.on("queue_ended", (data) => {
    console.log("Queue ended:", data);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});