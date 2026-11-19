const db = require('../config/database');
const bcrypt = require('bcryptjs');

// ==========================================
// GET ALL USERS
// ==========================================
exports.getUsers = (req, res) => {
  const sql = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name,
      u.phone,
      u.role_id,
      u.is_active,
      r.role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Get users error:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    res.json(results);
  });
};


// ==========================================
// SYSTEM STATISTICS
// ==========================================
exports.getSystemStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,

      (SELECT COUNT(*)
       FROM users
       WHERE is_active = 1) AS activeUsers,

      (SELECT COUNT(*) FROM orders) AS totalOrders,

      (SELECT COALESCE(SUM(total_amount), 0)
       FROM orders) AS totalRevenue
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('System stats error:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch system statistics'
      });
    }

    res.json(results[0]);
  });
};


// ==========================================
// CREATE USER
// ==========================================
exports.createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      full_name,
      phone,
      role_id,
      is_active
    } = req.body;

    // Validation
    if (!username || !email || !full_name || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, full name and role are required'
      });
    }

    // Check username/email
    const checkSql = `
      SELECT id
      FROM users
      WHERE username = ? OR email = ?
    `;

    db.query(
      checkSql,
      [username, email],
      async (checkErr, existingUsers) => {

        if (checkErr) {
          console.error(checkErr);

          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (existingUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Username or email already exists'
          });
        }

        // Default password
        const defaultPassword = '123456';

        const passwordHash = await bcrypt.hash(
          defaultPassword,
          10
        );

        const sql = `
          INSERT INTO users
          (
            username,
            email,
            password_hash,
            role_id,
            full_name,
            phone,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          sql,
          [
            username,
            email,
            passwordHash,
            Number(role_id),
            full_name,
            phone || null,
            is_active ? 1 : 0
          ],
          (err, result) => {

            if (err) {
              console.error('Create user error:', err);

              return res.status(500).json({
                success: false,
                message: 'Failed to create user'
              });
            }

            res.status(201).json({
              success: true,
              message: 'User created successfully',
              userId: result.insertId,
              defaultPassword: defaultPassword
            });
          }
        );
      }
    );

  } catch (error) {
    console.error('Create user error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==========================================
// UPDATE USER
// ==========================================
exports.updateUser = (req, res) => {

  const { id } = req.params;

  const {
    username,
    email,
    full_name,
    phone,
    role_id,
    is_active
  } = req.body;

  const sql = `
    UPDATE users
    SET
      username = ?,
      email = ?,
      full_name = ?,
      phone = ?,
      role_id = ?,
      is_active = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      username,
      email,
      full_name,
      phone || null,
      Number(role_id),
      is_active ? 1 : 0,
      id
    ],
    (err, result) => {

      if (err) {
        console.error('Update user error:', err);

        return res.status(500).json({
          success: false,
          message: 'Failed to update user'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    }
  );
};


// ==========================================
// TOGGLE USER STATUS
// ==========================================
exports.toggleUserStatus = (req, res) => {

  const { id } = req.params;

  const sql = `
    UPDATE users
    SET is_active =
      CASE
        WHEN is_active = 1 THEN 0
        ELSE 1
      END
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {

    if (err) {
      console.error('Toggle status error:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to toggle user status'
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully'
    });
  });
};