const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");

const {
    createQueue,
    joinQueue,
    cancelEntry,
    serveNext,
    endQueue,
    getQueueStatus,
    getAllQueues,
    getClientQueues,
    getHostQueueStatus,
} = require("../controllers/queue.controller");



router.post("/", authMiddleware, authorizeRoles("host"), createQueue);

router.get("/client", authMiddleware, getClientQueues);

router.get("/", authMiddleware, getAllQueues);

router.post("/:queueId/join", authMiddleware, authorizeRoles("client"), joinQueue);

router.patch("/:entryId/cancel", authMiddleware, authorizeRoles("client"), cancelEntry);

router.post("/:queueId/serve", authMiddleware, authorizeRoles("host"), serveNext);

router.get("/:queueId/status", authMiddleware, getQueueStatus);

router.patch("/:queueId/end", authMiddleware, authorizeRoles("host"), endQueue);

router.get("/:queueId/host-status", authMiddleware, authorizeRoles("host"), getHostQueueStatus);
module.exports = router;