const pool = require("../config/db");
const sendQueueUpdate = require("../utils/sendQueueUpdate");
const {getIO} = require("../socket/socket");

const createQueue = async (req, res) => {
    const { name, time_per_user } = req.body;
    const host_id = req.user.id;

    try {
        const result = await pool.query(
            `INSERT INTO queues(host_id, name, time_per_user)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [host_id, name, time_per_user]
        );

        const createdQueue = result.rows[0];

        const io = getIO();

        // 1. SEND NEW QUEUE TO ALL CLIENTS
        io.to("global_clients").emit("queue_created", {
            id: createdQueue.id,
            name: createdQueue.name,
            is_active : true,
            current_serving: null,
            waiting_count: 0,
            estimated_wait_time: 0,
        });
        // 3. OPTIONAL: initialize state
        await sendQueueUpdate(createdQueue.id);

        res.status(201).json(createdQueue);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create queue" });
    }
};

const joinQueue = async (req, res) => {
    const queue_id = req.params.queueId;
    const client_id = req.user.id;

    try {
        // Check queue active
        const queueCheck = await pool.query(
        "SELECT * FROM queues WHERE id = $1 AND is_active = true",
        [queue_id]
        );

        if (queueCheck.rows.length === 0) {
        return res.status(400).json({ error: "Queue not active" });
        }

        //Get next position
        const positionResult = await pool.query(
        `SELECT COALESCE(MAX(position), 0) AS max
        FROM queue_entries
        WHERE queue_id = $1 AND status='waiting'`,
        [queue_id]
        );

        const newPosition = Number(positionResult.rows[0].max) + 1;

        //Insert entry
        const insertResult = await pool.query(
        `INSERT INTO queue_entries (queue_id, client_id, position)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [queue_id, client_id, newPosition]
        );

        //Send update (async, don't block)
        await sendQueueUpdate(queue_id);

        res.status(201).json(insertResult.rows[0]);

    } catch (err) {
        if (err.code === "23505") {
        return res.status(400).json({ error: "Already in queue" });
        }

        console.error(err);
        res.status(500).json({ error: "Join failed" });
    }
};


const cancelEntry = async (req, res) =>{
    const entryId = req.params.entryId;
    const user_id = req.user.id;

    try{
        const result = await pool.query(
            `UPDATE queue_entries
            SET status = 'cancelled'
            WHERE id = $1 AND client_id = $2 AND status = 'waiting'
            RETURNING *`,
            [entryId, user_id]
        );
        if (result.rows.length === 0) {
        return res.status(404).json({ error: "Entry not found" });
        }
        const io = getIO();
        await sendQueueUpdate(result.rows[0].queue_id);
        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: "Cancel failed" });
    }
}


const serveNext = async (req, res) => {
    const queueId = req.params.queueId;
    const hostId = req.user.id;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Verify host owns queue
        const queueCheck = await client.query(
        "SELECT * FROM queues WHERE id = $1 AND host_id = $2 AND is_active = true",
        [queueId, hostId]
        );

        if (queueCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Not authorized" });
        }

        // Get next waiting
        const nextEntry = await client.query(
        `SELECT * FROM queue_entries
        WHERE queue_id = $1 AND status = 'waiting'
        ORDER BY position ASC
        LIMIT 1
        FOR UPDATE`,
        [queueId]
        );

        if (nextEntry.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "No clients waiting" });
        }

        const entryId = nextEntry.rows[0].id;

        const updateResult = await client.query(
        `UPDATE queue_entries
        SET status = 'served'
        WHERE id = $1
        RETURNING *`,
        [entryId]
        );

        await client.query("COMMIT");
        

        await sendQueueUpdate(queueId);
        res.json(updateResult.rows[0]);

    } catch (err) {
        console.error("SERVE ERROR FULL:", err);
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Serve failed" });
    } finally {
        client.release();
    }
    };
const endQueue = async (req, res) => {
    const queueId = req.params.queueId;
    const hostId = req.user.id;

    try {
        const result = await pool.query(
            `UPDATE queues
             SET is_active = false
             WHERE id = $1 AND host_id = $2
             RETURNING *`,
            [queueId, hostId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: "Queue not found or not authorized"
            });
        }

        const io = getIO();

        // GLOBAL REMOVE
        io.emit("queue_ended", { queue_id: queueId });

        // update system state
        await sendQueueUpdate(queueId);

        res.json({
            message: "Queue ended successfully",
            queue: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to end queue" });
    }
};

const getQueueStatus = async (req, res) => {
    const queueId = req.params.queueId;
    const userId = req.user.id;

    try {
        const entryResult = await pool.query(
        `SELECT position
         FROM queue_entries
         WHERE queue_id = $1
         AND client_id = $2
         AND status = 'waiting'`,
        [queueId, userId]
        );

        // IMPORTANT FIX (don't break UI)
        if (entryResult.rows.length === 0) {
            return res.json({
                entry_position: null,
                current_position: null,
                serving_position: null,
                estimated_wait_time: 0,
                message: "Not in active queue",
            });
        }

        const userPosition = entryResult.rows[0].position;

        const aheadResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM queue_entries
         WHERE queue_id = $1
         AND status = 'waiting'
         AND position < $2`,
        [queueId, userPosition]
        );

        const peopleAhead = aheadResult.rows[0].count;

        const servingResult = await pool.query(
        `SELECT position
         FROM queue_entries
         WHERE queue_id = $1
         AND status = 'waiting'
         ORDER BY position ASC
         LIMIT 1`,
        [queueId]
        );

        const servingPosition =
            servingResult.rows.length > 0
                ? servingResult.rows[0].position
                : null;

        const queueResult = await pool.query(
        `SELECT time_per_user
         FROM queues
         WHERE id = $1`,
        [queueId]
        );

        const timePerUser = queueResult.rows[0]?.time_per_user || 1;

        const estimatedWaitTime = peopleAhead * timePerUser;

        res.json({
            entry_position: userPosition,
            current_position: peopleAhead + 1,
            serving_position: servingPosition,
            estimated_wait_time: estimatedWaitTime,
        });

    } catch (err) {
        console.error("GET STATUS ERROR:", err);
        res.status(500).json({ error: "Failed to get status" });
    }
};
const getAllQueues = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                q.id,
                q.name,
                q.time_per_user,

                COALESCE((
                    SELECT position
                    FROM queue_entries qe
                    WHERE qe.queue_id = q.id
                    AND qe.status = 'waiting'
                    ORDER BY position ASC
                    LIMIT 1
                ), NULL) AS current_serving,

                COALESCE((
                    SELECT COUNT(*)::int
                    FROM queue_entries qe
                    WHERE qe.queue_id = q.id
                    AND qe.status = 'waiting'
                ), 0) AS waiting_count

            FROM queues q
            WHERE q.is_active = true
            ORDER BY q.created_at DESC
        `);

        const data = result.rows.map(q => ({
            ...q,
            estimated_wait_time: (q.waiting_count || 0) * (q.time_per_user || 1),
        }));

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch queues" });
    }
};


const getClientQueues = async (req, res) => {
    const userId = req.user.id;

    try {
    const result = await pool.query(
    `SELECT qe.id AS entry_id,
            qe.queue_id,
            qe.position,
            q.name
    FROM queue_entries qe
    JOIN queues q ON q.id = qe.queue_id
    WHERE qe.client_id = $1
    AND qe.status = 'waiting'
    ORDER BY qe.id DESC`,
    [userId]
);

    res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load your queues" });
    }
};
const getHostQueueStatus = async (req, res) => {
    const hostId = req.user.id;

    try {
        const result = await pool.query(`
            SELECT 
                q.id,
                q.name,
                q.is_active,
                q.time_per_user,

                COUNT(qe.id) FILTER (WHERE qe.status = 'waiting') AS waiting_count,
                COUNT(qe.id) FILTER (WHERE qe.status = 'served') AS served_count,

                MIN(qe.position) FILTER (WHERE qe.status = 'waiting') AS current_serving

            FROM queues q
            LEFT JOIN queue_entries qe ON qe.queue_id = q.id
            WHERE q.host_id = $1
            GROUP BY q.id
            ORDER BY q.created_at DESC
        `, [hostId]);

        const data = result.rows.map(q => ({
            ...q,
            estimated_time_left: q.waiting_count * q.time_per_user
        }));

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
};
module.exports = {createQueue, joinQueue, cancelEntry, serveNext,
    endQueue, getQueueStatus, getAllQueues,
     getClientQueues, getHostQueueStatus};


