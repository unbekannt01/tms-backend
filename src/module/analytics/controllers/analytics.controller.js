// analytics.controller.js
const Task = require("../../task/models/Task")
const User = require("../../user/models/User")
const PermissionService = require("../../rbac/services/permissionService")
const mongoose = require("mongoose")

// Get manager's team analytics
const getManagerAnalytics = async (req, res) => {
  try {
    const currentUser = req.user

    // Check if user is a manager
    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")

    if (!canViewTeam) {
      return res.status(403).json({
        message: "You need manager permissions to view team analytics",
      })
    }

    const { timeframe = "7", startDate, endDate } = req.query

    // Build date filter
    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      // Default timeframes
      const daysAgo = Number.parseInt(timeframe)
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - daysAgo)
      dateFilter = {
        createdAt: { $gte: fromDate },
      }
    }

    // Get all tasks created by this manager
    const managerTasks = await Task.aggregate([
      {
        $match: {
          createdBy: currentUser._id,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: "user_1", // Your user collection name
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedUser",
        },
      },
      {
        $unwind: "$assignedUser",
      },
    ])

    // Calculate analytics
    const analytics = {
      overview: calculateOverviewStats(managerTasks),
      teamPerformance: calculateTeamPerformance(managerTasks),
      taskDistribution: calculateTaskDistribution(managerTasks),
      productivityTrends: calculateProductivityTrends(managerTasks, timeframe),
      priorityAnalysis: calculatePriorityAnalysis(managerTasks),
      completionRates: calculateCompletionRates(managerTasks),
      overdueAnalysis: calculateOverdueAnalysis(managerTasks),
      timeEstimationAccuracy: calculateTimeAccuracy(managerTasks),
      workloadBalance: calculateWorkloadBalance(managerTasks),
    }

    res.json({
      success: true,
      data: analytics,
      timeframe: timeframe,
      totalTasks: managerTasks.length,
    })
  } catch (error) {
    console.error("Manager analytics error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

// Helper functions for calculations
function normalizeStatusStr(status) {
  if (!status) return "pending"
  if (status === "todo") return "pending"
  if (status === "in_progress") return "in-progress"
  return status
}

function sameDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function calculateOverviewStats(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const total = normalized.length
  const completed = normalized.filter((t) => t.status === "completed").length
  const pending = normalized.filter((t) => t.status === "pending").length
  const inProgress = normalized.filter((t) => t.status === "in-progress").length
  const cancelled = normalized.filter((t) => t.status === "cancelled").length
  const overdue = normalized.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed",
  ).length

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    totalTasks: total,
    completed,
    pending,
    inProgress,
    cancelled,
    overdue,
    completionRate,
    activeTeamMembers: new Set(normalized.map((t) => t.assignedTo.toString())).size,
  }
}

function calculateTeamPerformance(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const performanceMap = {}
  normalized.forEach((task) => {
    const userId = task.assignedTo.toString()
    const userInfo = task.assignedUser

    if (!performanceMap[userId]) {
      performanceMap[userId] = {
        userId,
        name: `${userInfo.firstName} ${userInfo.lastName}`,
        userName: userInfo.userName,
        email: userInfo.email,
        totalTasks: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        cancelled: 0,
        overdue: 0,
        onTime: 0,
        avgCompletionTime: 0,
        completionTimes: [],
        estimatedHours: 0,
        actualHours: 0,
      }
    }

    const member = performanceMap[userId]
    member.totalTasks++
    member[task.status]++

    if (task.estimatedHours) {
      member.estimatedHours += task.estimatedHours
    }
    if (task.actualHours) {
      member.actualHours += task.actualHours
    }

    // Calculate overdue
    if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed") {
      member.overdue++
    }

    // Calculate completion time for completed tasks
    if (task.status === "completed" && task.completedAt && task.createdAt) {
      const completionTime = new Date(task.completedAt) - new Date(task.createdAt)
      const hoursToComplete = completionTime / (1000 * 60 * 60) // Convert to hours
      member.completionTimes.push(hoursToComplete)
    }

    // Check if completed on time
    if (task.status === "completed" && task.dueDate && task.completedAt) {
      if (new Date(task.completedAt) <= new Date(task.dueDate)) {
        member.onTime++
      }
    }
  })

  // Calculate averages
  Object.values(performanceMap).forEach((member) => {
    member.completionRate = member.totalTasks > 0 ? Math.round((member.completed / member.totalTasks) * 100) : 0

    member.onTimeRate = member.completed > 0 ? Math.round((member.onTime / member.completed) * 100) : 0

    member.avgCompletionTime =
      member.completionTimes.length > 0
        ? Math.round(member.completionTimes.reduce((a, b) => a + b, 0) / member.completionTimes.length)
        : 0

    member.efficiencyRatio =
      member.estimatedHours > 0 && member.actualHours > 0
        ? Math.round((member.estimatedHours / member.actualHours) * 100)
        : 100

    // Clean up temporary arrays
    delete member.completionTimes
  })

  return Object.values(performanceMap)
}

function calculateTaskDistribution(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const statusDist = {}
  const priorityDist = {}
  const memberDist = {}

  normalized.forEach((task) => {
    statusDist[task.status] = (statusDist[task.status] || 0) + 1
    priorityDist[task.priority] = (priorityDist[task.priority] || 0) + 1
    const memberName = `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
    memberDist[memberName] = (memberDist[memberName] || 0) + 1
  })

  return {
    byStatus: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
    byPriority: Object.entries(priorityDist).map(([priority, count]) => ({ priority, count })),
    byMember: Object.entries(memberDist).map(([member, count]) => ({ member, count })),
  }
}

function calculateProductivityTrends(tasks, timeframe) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const days = Number.parseInt(timeframe)
  const trends = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setDate(date.getDate() - i)

    const dayTasks = normalized.filter((task) => {
      const createdAt = new Date(task.createdAt)
      createdAt.setUTCHours(0, 0, 0, 0)
      return sameDay(createdAt, date)
    })

    const dayCompleted = normalized.filter((task) => {
      if (!task.completedAt) return false
      const completedDate = new Date(task.completedAt)
      completedDate.setUTCHours(0, 0, 0, 0)
      return sameDay(completedDate, date)
    })

    trends.push({
      date: date.toISOString().split("T")[0],
      tasksCreated: dayTasks.length,
      tasksCompleted: dayCompleted.length,
      completionRate: dayTasks.length > 0 ? Math.round((dayCompleted.length / dayTasks.length) * 100) : 0,
    })
  }

  return trends
}

function calculatePriorityAnalysis(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const priorities = ["low", "medium", "high", "urgent"]

  return priorities.map((priority) => {
    const priorityTasks = normalized.filter((t) => t.priority === priority)
    const completed = priorityTasks.filter((t) => t.status === "completed").length

    return {
      priority,
      total: priorityTasks.length,
      completed,
      pending: priorityTasks.filter((t) => t.status === "pending").length,
      inProgress: priorityTasks.filter((t) => t.status === "in-progress").length,
      completionRate: priorityTasks.length > 0 ? Math.round((completed / priorityTasks.length) * 100) : 0,
      avgCompletionTime: calculateAvgCompletionTimeForTasks(priorityTasks),
    }
  })
}

function calculateCompletionRates(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const last7Days = normalized.filter((t) => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(t.createdAt) >= weekAgo
  })

  const last30Days = normalized.filter((t) => {
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    return new Date(t.createdAt) >= monthAgo
  })

  return {
    last7Days: {
      total: last7Days.length,
      completed: last7Days.filter((t) => t.status === "completed").length,
      rate:
        last7Days.length > 0
          ? Math.round((last7Days.filter((t) => t.status === "completed").length / last7Days.length) * 100)
          : 0,
    },
    last30Days: {
      total: last30Days.length,
      completed: last30Days.filter((t) => t.status === "completed").length,
      rate:
        last30Days.length > 0
          ? Math.round((last30Days.filter((t) => t.status === "completed").length / last30Days.length) * 100)
          : 0,
    },
    allTime: {
      total: normalized.length,
      completed: normalized.filter((t) => t.status === "completed").length,
      rate:
        normalized.length > 0
          ? Math.round((normalized.filter((t) => t.status === "completed").length / normalized.length) * 100)
          : 0,
    },
  }
}

function calculateOverdueAnalysis(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const overdueTasks = normalized.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed",
  )

  const overdueByPriority = {
    urgent: overdueTasks.filter((t) => t.priority === "urgent").length,
    high: overdueTasks.filter((t) => t.priority === "high").length,
    medium: overdueTasks.filter((t) => t.priority === "medium").length,
    low: overdueTasks.filter((t) => t.priority === "low").length,
  }

  const overdueByMember = {}
  overdueTasks.forEach((task) => {
    const memberName = `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
    overdueByMember[memberName] = (overdueByMember[memberName] || 0) + 1
  })

  return {
    total: overdueTasks.length,
    byPriority: overdueByPriority,
    byMember: Object.entries(overdueByMember).map(([member, count]) => ({ member, count })),
    percentage: normalized.length > 0 ? Math.round((overdueTasks.length / normalized.length) * 100) : 0,
  }
}

function calculateTimeAccuracy(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const tasksWithBothTimes = normalized.filter((t) => t.estimatedHours && t.actualHours)

  if (tasksWithBothTimes.length === 0) {
    return {
      tasksAnalyzed: 0,
      averageAccuracy: 0,
      underestimated: 0,
      overestimated: 0,
      accurate: 0,
    }
  }

  let underestimated = 0
  let overestimated = 0
  let accurate = 0
  let totalAccuracy = 0

  tasksWithBothTimes.forEach((task) => {
    const accuracy = (task.estimatedHours / task.actualHours) * 100
    totalAccuracy += accuracy

    if (accuracy < 90) {
      underestimated++
    } else if (accuracy > 110) {
      overestimated++
    } else {
      accurate++
    }
  })

  return {
    tasksAnalyzed: tasksWithBothTimes.length,
    averageAccuracy: Math.round(totalAccuracy / tasksWithBothTimes.length),
    underestimated,
    overestimated,
    accurate,
    underestimatedPercentage: Math.round((underestimated / tasksWithBothTimes.length) * 100),
    overestimatedPercentage: Math.round((overestimated / tasksWithBothTimes.length) * 100),
    accuratePercentage: Math.round((accurate / tasksWithBothTimes.length) * 100),
  }
}

function calculateWorkloadBalance(tasks) {
  const normalized = tasks.map((t) => ({ ...t, status: normalizeStatusStr(t.status) }))
  const memberWorkload = {}
  normalized.forEach((task) => {
    const userId = task.assignedTo.toString()
    const memberName = `${task.assignedUser.firstName} ${task.assignedUser.lastName}`

    if (!memberWorkload[userId]) {
      memberWorkload[userId] = {
        name: memberName,
        activeTasks: 0,
        totalEstimatedHours: 0,
        urgentTasks: 0,
        highPriorityTasks: 0,
      }
    }

    const member = memberWorkload[userId]

    if (task.status !== "completed" && task.status !== "cancelled") {
      member.activeTasks++
    }

    if (task.estimatedHours) {
      member.totalEstimatedHours += task.estimatedHours
    }

    if (task.priority === "urgent") {
      member.urgentTasks++
    } else if (task.priority === "high") {
      member.highPriorityTasks++
    }
  })

  const workloadData = Object.values(memberWorkload)
  const avgActiveTasks =
    workloadData.length > 0 ? workloadData.reduce((sum, m) => sum + m.activeTasks, 0) / workloadData.length : 0

  const avgEstimatedHours =
    workloadData.length > 0 ? workloadData.reduce((sum, m) => sum + m.totalEstimatedHours, 0) / workloadData.length : 0

  // Calculate workload balance score (lower is more balanced)
  const balanceScore =
    workloadData.length > 0
      ? Math.round(
          workloadData.reduce((sum, m) => {
            return sum + Math.abs(m.activeTasks - avgActiveTasks)
          }, 0) / workloadData.length,
        )
      : 0

  return {
    members: workloadData,
    averageActiveTasks: Math.round(avgActiveTasks),
    averageEstimatedHours: Math.round(avgEstimatedHours),
    balanceScore,
    isBalanced: balanceScore <= 2, // Consider balanced if deviation is 2 or less
  }
}

function calculateAvgCompletionTimeForTasks(tasks) {
  const completedTasks = tasks.filter((t) => t.status === "completed" && t.completedAt && t.createdAt)

  if (completedTasks.length === 0) return 0

  const totalTime = completedTasks.reduce((sum, task) => {
    const completionTime = new Date(task.completedAt) - new Date(task.createdAt)
    return sum + completionTime / (1000 * 60 * 60) // Convert to hours
  }, 0)

  return Math.round(totalTime / completedTasks.length)
}

// Get detailed task metrics for specific team member
const getTeamMemberDetails = async (req, res) => {
  try {
    const currentUser = req.user
    const { memberId } = req.params
    const { timeframe = "30" } = req.query

    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")

    if (!canViewTeam) {
      return res.status(403).json({
        message: "You need manager permissions to view team member details",
      })
    }

    const daysAgo = Number.parseInt(timeframe)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - daysAgo)

    const memberTasks = await Task.find({
      createdBy: currentUser._id,
      assignedTo: memberId,
      createdAt: { $gte: fromDate },
    })
      .populate("assignedTo", "firstName lastName userName email")
      .sort({ createdAt: -1 })

    if (memberTasks.length === 0) {
      return res.json({
        success: true,
        member: null,
        tasks: [],
        analytics: null,
      })
    }

    const member = memberTasks[0].assignedTo // fixed

    const analytics = {
      overview: calculateOverviewStats(memberTasks),
      recentTasks: memberTasks.slice(0, 10),
      productivityTrend: calculateProductivityTrends(memberTasks, timeframe),
      priorityBreakdown: calculatePriorityAnalysis(memberTasks),
      timeAccuracy: calculateTimeAccuracy(memberTasks),
    }

    res.json({
      success: true,
      member: {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        userName: member.userName,
        email: member.email,
      },
      tasks: memberTasks,
      analytics,
      timeframe,
    })
  } catch (error) {
    console.error("Team member details error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

// Get admin analytics: global and role-based task analytics
const getAdminAnalytics = async (req, res) => {
  try {
    const currentUser = req.user

    const canViewAll = await PermissionService.hasPermission(currentUser, "task:read:all")

    if (!canViewAll) {
      return res.status(403).json({
        message: "You need admin permissions to view global analytics",
      })
    }

    const { timeframe = "30", startDate, endDate } = req.query

    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      const daysAgo = Number.parseInt(timeframe)
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - daysAgo)
      dateFilter = { createdAt: { $gte: fromDate } }
    }

    // Aggregate tasks with users and roles
    const tasks = await Task.aggregate([
      { $match: { ...dateFilter } },
      {
        $lookup: {
          from: "user_1",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedUser",
        },
      },
      { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "roles",
          localField: "assignedUser.roleId",
          foreignField: "_id",
          as: "assignedRole",
        },
      },
      { $unwind: { path: "$assignedRole", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "user_1",
          localField: "createdBy",
          foreignField: "_id",
          as: "creatorUser",
        },
      },
      { $unwind: { path: "$creatorUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "roles",
          localField: "creatorUser.roleId",
          foreignField: "_id",
          as: "creatorRole",
        },
      },
      { $unwind: { path: "$creatorRole", preserveNullAndEmptyArrays: true } },
    ])

    // Normalize for calculations
    const normalized = tasks.map((t) => ({
      ...t,
      status: normalizeStatusStr(t.status),
    }))

    // Overview and distributions
    const overview = calculateOverviewStats(normalized)
    const distribution = calculateTaskDistribution(normalized)
    const completionRates = calculateCompletionRates(normalized)
    const trends = calculateProductivityTrends(normalized, timeframe)

    // Role-based analytics
    const byRole = {
      assigned: { user: 0, manager: 0, admin: 0, unknown: 0 },
      created: { user: 0, manager: 0, admin: 0, unknown: 0 },
    }

    normalized.forEach((t) => {
      const assignedRole = t.assignedRole?.name || "unknown"
      const creatorRole = t.creatorRole?.name || "unknown"
      if (byRole.assigned[assignedRole] === undefined) byRole.assigned.unknown++
      else byRole.assigned[assignedRole]++
      if (byRole.created[creatorRole] === undefined) byRole.created.unknown++
      else byRole.created[creatorRole]++
    })

    // Top managers (by tasks assigned/created)
    const managerMap = {}
    normalized.forEach((t) => {
      if (t.creatorRole?.name === "manager") {
        const mId = t.creatorUser?._id?.toString()
        if (!mId) return
        if (!managerMap[mId]) {
          managerMap[mId] = {
            managerId: mId,
            name: `${t.creatorUser.firstName || ""} ${t.creatorUser.lastName || ""}`.trim() || t.creatorUser.userName,
            tasksAssigned: 0,
            completed: 0,
          }
        }
        managerMap[mId].tasksAssigned++
        if (t.status === "completed") managerMap[mId].completed++
      }
    })
    const topManagers = Object.values(managerMap)
      .map((m) => ({
        ...m,
        completionRate: m.tasksAssigned > 0 ? Math.round((m.completed / m.tasksAssigned) * 100) : 0,
      }))
      .sort((a, b) => b.tasksAssigned - a.tasksAssigned)
      .slice(0, 5)

    // Top users (by tasks completed)
    const userMap = {}
    normalized.forEach((t) => {
      const u = t.assignedUser
      if (!u) return
      const uId = u._id?.toString()
      if (!uId) return
      if (!userMap[uId]) {
        userMap[uId] = {
          userId: uId,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.userName,
          tasksCompleted: 0,
          activeTasks: 0,
        }
      }
      if (t.status === "completed") userMap[uId].tasksCompleted++
      if (t.status === "pending" || t.status === "in-progress") userMap[uId].activeTasks++
    })
    const topUsers = Object.values(userMap)
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 5)

    res.json({
      success: true,
      timeframe,
      data: {
        overview,
        statusDistribution: distribution.byStatus,
        priorityDistribution: distribution.byPriority,
        completionRates,
        trends,
        byRole,
        topManagers,
        topUsers,
      },
      totalTasks: normalized.length,
    })
  } catch (error) {
    console.error("Admin analytics error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  getManagerAnalytics,
  getTeamMemberDetails,
  getAdminAnalytics,
}