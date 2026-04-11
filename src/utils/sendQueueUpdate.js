const pool = require("../config/db");
const { getIO } = require("../socket/socket");

const runningQueues = new Set();
/*
    this is very important which prevents duplicate concurrent execution for the same queueId
    act like lightweight lock
*/

async function sendQueueUpdate(queueId) {
    if (runningQueues.has(queueId)) return;

    runningQueues.add(queueId);

    try {
        const io = getIO();

        
        const result = await pool.query(
            `SELECT client_id, position
             FROM queue_entries
             WHERE queue_id = $1
             AND status = 'waiting'
             ORDER BY position ASC`,
            [queueId]
        );

        const entries = result.rows;

        //  QUEUE DATA
        const queueRes = await pool.query(
            "SELECT time_per_user, host_id FROM queues WHERE id = $1",
            [queueId]
        );

        const hostId = queueRes.rows[0]?.host_id;
        const timePerUser = queueRes.rows[0]?.time_per_user || 1;

        //  CLIENT REALTIME UPDATE
        const sockets = await io.in(`queue_${queueId}`).fetchSockets();

        for (const socket of sockets) {
            const userId = socket.userId;
            if (!userId) continue;

            const index = entries.findIndex(
                (entry) => entry.client_id === userId
            );

            if (index === -1) continue;

            socket.emit("queue_status_update", {
                queue_id: queueId,
                current_position: index + 1,
                entry_position: entries[index].position,
                serving_position:
                    entries.length > 0 ? entries[0].position : null,
                estimated_wait_time: index * timePerUser,
            });
        }

        //  GLOBAL DATA
        const waitingCount = entries.length;

        const servedRes = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM queue_entries
             WHERE queue_id = $1 AND status = 'served'`,
            [queueId]
        );

        const servedCount = servedRes.rows[0].count;

        const currentServing =
            entries.length > 0 ? entries[0].position : null;

        const payload = {
            queue_id: queueId,
            current_serving: currentServing,
            waiting_count: waitingCount,
            served_count: servedCount,
            estimated_time_left: waitingCount * timePerUser,
        };

        //  HOST UPDATE (ROOM + FALLBACK)
        io.to(`host_${hostId}`).emit("host_queue_update", payload);
        io.emit("host_queue_update", payload); // fallback

        //  CLIENT LIST UPDATE
        io.to("global_clients").emit("queue_list_update", payload);

    } catch (err) {
        console.error("❌ SEND QUEUE UPDATE ERROR:", err.message);
    } finally {
        runningQueues.delete(queueId);
    }
}

module.exports = sendQueueUpdate;