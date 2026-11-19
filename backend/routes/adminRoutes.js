const express = require('express');

const router = express.Router();

const {
  getUsers,
  getSystemStats,
  createUser,
  updateUser,
  toggleUserStatus
} = require('../controllers/adminController');

const {
  authenticateToken,
  requireAdmin
} = require('../middleware/authMiddleware');


// All admin routes require admin login
router.use(authenticateToken);
router.use(requireAdmin);


// GET /api/admin/users
router.get('/users', getUsers);


// GET /api/admin/system-stats
router.get('/system-stats', getSystemStats);


// POST /api/admin/users
router.post('/users', createUser);


// PUT /api/admin/users/:id
router.put('/users/:id', updateUser);


// PATCH /api/admin/users/:id/toggle-status
router.patch(
  '/users/:id/toggle-status',
  toggleUserStatus
);


module.exports = router;