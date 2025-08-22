const { Router } = require("express")
const {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getLoginNotifications,
  markPopupAsShown,
  deleteNotification,
  getNotificationStats,
} = require("./controllers/notification.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")

const router = Router()

// Notification routes
router.get("/notifications", sessionAuthMiddleware, getNotifications)
router.get("/notifications/unread", sessionAuthMiddleware, getUnreadNotifications)
router.get("/notifications/login", sessionAuthMiddleware, getLoginNotifications)
router.get("/notifications/stats", sessionAuthMiddleware, getNotificationStats)
router.put("/notifications/:id/read", sessionAuthMiddleware, markNotificationAsRead)
router.put("/notifications/read-all", sessionAuthMiddleware, markAllNotificationsAsRead)
router.put("/notifications/:id/popup-shown", sessionAuthMiddleware, markPopupAsShown)
router.delete("/notifications/:id", sessionAuthMiddleware, deleteNotification)

module.exports = router
