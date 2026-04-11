let io;
const pool = require("../config/db");
const initSocket = (server) => {
    const { Server } = require("socket.io");

    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log("✅ client connected:", socket.id);
        socket.join("global_clients");

        // JOIN QUEUE ROOM (CLIENT)

        socket.on("join_queue_room", ({ queueId, userId }) => {
            socket.join(`queue_${queueId}`);

            socket.userId = userId;
            socket.queueId = queueId;

            console.log(`📡 User ${userId} joined queue_${queueId}`);
        });

        // JOIN HOST ROOM
        socket.on("join_host_room", ({ hostId }) => {
            socket.join(`host_${hostId}`);
            socket.hostId = hostId; 
            console.log(`👨‍💼 Host ${hostId} joined host_${hostId}`);
        });
        
        socket.on("disconnect", () => {
            console.log("❌ client disconnected:", socket.id);

            socket.userId = null;
            socket.queueId = null;
            socket.hostId = null;
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};

module.exports = { initSocket, getIO };