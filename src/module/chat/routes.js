const { Router } = require("express")
const {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
  deleteConversation,
} = require("./controllers/chat.controller")

const sessionAuthMiddleware = require("../../middleware/sessionAuth")

const router = Router()

router.use(sessionAuthMiddleware)

router.get("/chat/conversations", listConversations)
router.post("/chat/conversations", getOrCreateConversation)
router.get("/chat/conversations/:id/messages", getMessages)
router.post("/chat/messages", sendMessage)
router.post("/chat/read", markRead)
router.delete("/chat/conversations/:id", deleteConversation)

module.exports = router
