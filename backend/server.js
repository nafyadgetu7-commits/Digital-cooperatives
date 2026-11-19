const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const nodeCrypto = require("node:crypto");
const app = express();

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "digital_cooperative_secret_key";

// ============================================================
// CORS CONFIGURATION
// ============================================================

const corsOptions = {
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept"
    ],

    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================
// BODY PARSERS
// ============================================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

// ============================================================
// UPLOAD DIRECTORIES
// ============================================================

const uploadRoot = path.join(
    __dirname,
    "uploads"
);

const productUploadDir = path.join(
    uploadRoot,
    "products"
);

if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, {
        recursive: true
    });
}

if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, {
        recursive: true
    });
}

console.log(
    "Upload directory:",
    productUploadDir
);

// ============================================================
// SERVE UPLOADED FILES
// ============================================================

app.use(
    "/uploads",
    express.static(uploadRoot)
);

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            productUploadDir
        );
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(
                file.originalname
            );

        const fileName =
            "product-" +
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1000000
            ) +
            extension;

        cb(
            null,
            fileName
        );
    }
});

const fileFilter = function (
    req,
    file,
    cb
) {

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
            )
        );
    }
};

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// ============================================================
// DATABASE
// ============================================================

const db = mysql.createPool({

    host:
        process.env.DB_HOST ||
        "localhost",

    user:
        process.env.DB_USER ||
        "root",

    password:
        process.env.DB_PASSWORD ||
        "",

    database:
        process.env.DB_NAME ||
        "cooperative_management",

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0
});

// ============================================================
// DATABASE TEST
// ============================================================

async function testDatabase() {

    try {

        const connection =
            await db.getConnection();

        console.log(
            "MySQL database connected successfully"
        );

        connection.release();

    } catch (error) {

        console.error(
            "MySQL connection failed:",
            error.message
        );
    }
}

testDatabase();

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message:
                    "Authorization token is required"
            });
        }

        const parts =
            authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid authorization format"
            });
        }

        const token =
            parts[1];

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.user =
            decoded;

        next();

    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired token"
        });
    }
}

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

function requireAdmin(
    req,
    res,
    next
) {

    try {

        const roleId =
            Number(
                req.user?.role_id
            );

        if (roleId !== 1) {

            return res.status(403).json({
                success: false,
                message:
                    "Administrator access required"
            });
        }

        next();

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error.message
        );

        return res.status(403).json({
            success: false,
            message:
                "Administrator access required"
        });
    }
}

// ============================================================
// GET USER ID
// ============================================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?.user_id ||
        req.user?.userId
    );
}

// ============================================================
// GET SUPPLIER ID
// ============================================================

async function getSupplierId(
    userId
) {

    if (!userId) {
        return null;
    }

    const [rows] =
        await db.execute(
            `
            SELECT id
            FROM suppliers
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

    if (
        !rows ||
        rows.length === 0
    ) {

        return null;
    }

    return rows[0].id;
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/api",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Digital Cooperative Management API is running"
        });
    }
);

// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const body =
                req.body || {};

            const {
                username,
                email,
                password
            } = body;

            const loginValue =
                username || email;

            if (
                !loginValue ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email/username and password are required"
                });
            }

            console.log(
                "LOGIN REQUEST:",
                loginValue
            );

            const [users] =
                await db.execute(
                    `
                    SELECT
                        u.id,
                        u.username,
                        u.email,
                        u.password_hash,
                        u.role_id,
                        u.full_name,
                        u.phone,
                        u.address,
                        u.is_active
                    FROM users u
                    WHERE
                        u.username = ?
                        OR u.email = ?
                    LIMIT 1
                    `,
                    [
                        loginValue,
                        loginValue
                    ]
                );

            if (
                !users ||
                users.length === 0
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username/email or password"
                });
            }

            const user =
                users[0];

            if (
                Number(
                    user.is_active
                ) === 0
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account is inactive"
                });
            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordCorrect) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username/email or password"
                });
            }

            const token =
                jwt.sign(
                    {
                        id: user.id,
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        role_id: user.role_id
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            console.log(
                "LOGIN SUCCESS:",
                user.email
            );

            return res.json({

                success: true,

                message:
                    "Login successful",

                token,

                user: {

                    id: user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    full_name:
                        user.full_name,

                    phone:
                        user.phone,

                    address:
                        user.address,

                    role_id:
                        user.role_id
                }
            });

        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Login failed",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// OLD LOGIN ROUTE
// ============================================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const body =
                req.body || {};

            const {
                username,
                email,
                password
            } = body;

            const loginValue =
                username || email;

            if (
                !loginValue ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email/username and password are required"
                });
            }

            const [users] =
                await db.execute(
                    `
                    SELECT
                        u.id,
                        u.username,
                        u.email,
                        u.password_hash,
                        u.role_id,
                        u.full_name,
                        u.phone,
                        u.address,
                        u.is_active
                    FROM users u
                    WHERE
                        u.username = ?
                        OR u.email = ?
                    LIMIT 1
                    `,
                    [
                        loginValue,
                        loginValue
                    ]
                );

            if (
                !users ||
                users.length === 0
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username/email or password"
                });
            }

            const user =
                users[0];

            if (
                Number(
                    user.is_active
                ) === 0
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Your account is inactive"
                });
            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordCorrect) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid username/email or password"
                });
            }

            const token =
                jwt.sign(
                    {
                        id: user.id,
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        role_id: user.role_id
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            return res.json({

                success: true,

                message:
                    "Login successful",

                token,

                user: {

                    id: user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    full_name:
                        user.full_name,

                    role_id:
                        user.role_id
                }
            });

        } catch (error) {

            console.error(
                "OLD LOGIN ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Login failed",
                error:
                    error.message
            });
        }
    }
);
// ============================================================
// REGISTER NEW USER
// ============================================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const body = req.body || {};

        const {
            username,
            email,
            password,
            full_name,
            phone,
            address,
            role_id
        } = body;

        console.log("====================================");
        console.log("REGISTER REQUEST");
        console.log("Body:", body);
        console.log("====================================");

        // --------------------------------------------------------
        // VALIDATION
        // --------------------------------------------------------

        if (!username || !String(username).trim()) {
            return res.status(400).json({
                success: false,
                message: "Username is required"
            });
        }

        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required"
            });
        }

        // --------------------------------------------------------
        // CHECK USERNAME
        // --------------------------------------------------------

        const [existingUsername] = await db.execute(
            `
            SELECT id
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            [String(username).trim()]
        );

        if (existingUsername.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        // --------------------------------------------------------
        // CHECK EMAIL
        // --------------------------------------------------------

        const [existingEmail] = await db.execute(
            `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [String(email).trim()]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        // --------------------------------------------------------
        // ROLE
        // --------------------------------------------------------

        // Default role = customer
        let selectedRoleId = 5;

        if (
            role_id !== undefined &&
            role_id !== null &&
            role_id !== ""
        ) {
            selectedRoleId = Number(role_id);

            if (Number.isNaN(selectedRoleId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }
        }

        // Check role exists
        const [roles] = await db.execute(
            `
            SELECT id, role_name
            FROM roles
            WHERE id = ?
            LIMIT 1
            `,
            [selectedRoleId]
        );

        if (roles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected role does not exist"
            });
        }

        // --------------------------------------------------------
        // PASSWORD HASH
        // --------------------------------------------------------

        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        // --------------------------------------------------------
        // INSERT USER
        // --------------------------------------------------------

        const [result] = await db.execute(
            `
            INSERT INTO users
            (
                username,
                email,
                password_hash,
                role_id,
                full_name,
                phone,
                address,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `,
            [
                String(username).trim(),
                String(email).trim(),
                passwordHash,
                selectedRoleId,
                String(full_name).trim(),
                phone ? String(phone).trim() : null,
                address ? String(address).trim() : null
            ]
        );

        console.log(
            "USER REGISTERED:",
            result.insertId
        );

        console.log(
            "ROLE:",
            roles[0].role_name
        );

        // --------------------------------------------------------
        // RESPONSE
        // --------------------------------------------------------

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: result.insertId,
                username: String(username).trim(),
                email: String(email).trim(),
                full_name: String(full_name).trim(),
                phone: phone || null,
                address: address || null,
                role_id: selectedRoleId,
                role_name: roles[0].role_name
            }
        });

    } catch (error) {
        console.error(
            "REGISTER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        });
    }
});
// ============================================================
// AUTH - CURRENT USER
// ============================================================

app.get(
    "/api/auth/me",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const [users] =
                await db.execute(
                    `
                    SELECT
                        id,
                        username,
                        email,
                        role_id,
                        full_name,
                        phone,
                        address,
                        is_active
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );

            if (
                users.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }

            return res.json({
                success: true,
                user:
                    users[0]
            });

        } catch (error) {

            console.error(
                "AUTH ME ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to get user information",
                error:
                    error.message
            });
        }
    }
);
// ============================================================
// ADMIN - CREATE USER
// MEMBER USERS ALSO GET MEMBER PROFILE
// ============================================================

app.post(
    "/api/admin/users",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection;

        try {

            const {
                username,
                email,
                password,
                full_name,
                phone,
                address,
                role_id,
                is_active
            } = req.body || {};

            // ----------------------------------------------------
            // VALIDATION
            // ----------------------------------------------------

            if (!username || !String(username).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Username is required"
                });
            }

            if (!email || !String(email).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }

            if (!full_name || !String(full_name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Full name is required"
                });
            }

            // ----------------------------------------------------
            // ROLE
            // 1 = Admin
            // 2 = Manager
            // 3 = Accountant
            // 4 = Supplier
            // 5 = Customer
            // 6 = Member
            // ----------------------------------------------------

            const selectedRole = Number(role_id);

            if (!selectedRole || Number.isNaN(selectedRole)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid role is required"
                });
            }

            // ----------------------------------------------------
            // CHECK ROLE EXISTS
            // ----------------------------------------------------

            const [roleRows] = await db.execute(
                `
                SELECT id, role_name
                FROM roles
                WHERE id = ?
                LIMIT 1
                `,
                [selectedRole]
            );

            if (roleRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Selected role does not exist"
                });
            }

            // ----------------------------------------------------
            // CHECK USERNAME
            // ----------------------------------------------------

            const [usernameRows] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE username = ?
                LIMIT 1
                `,
                [String(username).trim()]
            );

            if (usernameRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Username already exists"
                });
            }

            // ----------------------------------------------------
            // CHECK EMAIL
            // ----------------------------------------------------

            const [emailRows] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [String(email).trim()]
            );

            if (emailRows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email already exists"
                });
            }

            // ----------------------------------------------------
            // PASSWORD
            // ----------------------------------------------------

            const plainPassword =
                password && String(password).trim()
                    ? String(password)
                    : "123456";

            if (plainPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters"
                });
            }

            const passwordHash = await bcrypt.hash(
                plainPassword,
                10
            );

            // ----------------------------------------------------
            // ACTIVE STATUS
            // ----------------------------------------------------

            const activeStatus =
                is_active === false ||
                is_active === 0 ||
                is_active === "0"
                    ? 0
                    : 1;

            // ----------------------------------------------------
            // START DATABASE TRANSACTION
            // ----------------------------------------------------

            connection = await db.getConnection();

            await connection.beginTransaction();

            // ----------------------------------------------------
            // CREATE USER
            // ----------------------------------------------------

            const [userResult] = await connection.execute(
                `
                INSERT INTO users
                (
                    username,
                    email,
                    password_hash,
                    full_name,
                    phone,
                    address,
                    role_id,
                    is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    String(username).trim(),
                    String(email).trim(),
                    passwordHash,
                    String(full_name).trim(),
                    phone
                        ? String(phone).trim()
                        : null,
                    address
                        ? String(address).trim()
                        : null,
                    selectedRole,
                    activeStatus
                ]
            );

            const userId = userResult.insertId;

            console.log(
                "ADMIN CREATED USER:",
                userId,
                "ROLE:",
                selectedRole
            );

            // ====================================================
            // CREATE MEMBER PROFILE
            //
            // IMPORTANT:
            // Your project uses role_id = 6 for Member
            // ====================================================

            let member = null;

            if (selectedRole === 6) {

                const membershipNumber =
                    `MEM-${String(userId).padStart(4, "0")}`;

                const [memberResult] =
                    await connection.execute(
                        `
                        INSERT INTO members
                        (
                            user_id,
                            membership_number,
                            join_date,
                            status
                        )
                        VALUES (?, ?, CURDATE(), 'active')
                        `,
                        [
                            userId,
                            membershipNumber
                        ]
                    );

                console.log(
                    "MEMBER PROFILE CREATED:",
                    memberResult.insertId
                );

                member = {
                    id: memberResult.insertId,
                    user_id: userId,
                    membership_number: membershipNumber,
                    status: "active"
                };
            }

            // ----------------------------------------------------
            // COMMIT TRANSACTION
            // ----------------------------------------------------

            await connection.commit();

            // ----------------------------------------------------
            // SUCCESS RESPONSE
            // ----------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    selectedRole === 6
                        ? "Member created successfully"
                        : "User created successfully",

                userId,

                role_id: selectedRole,

                member,

                temporaryPassword:
                    password
                        ? null
                        : plainPassword

            });

        } catch (error) {

            // ----------------------------------------------------
            // ROLLBACK
            // ----------------------------------------------------

            if (connection) {

                try {
                    await connection.rollback();
                } catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }

            console.error(
                "CREATE USER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create user",
                error: error.message
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);

// ============================================================
// ADMIN - GET ALL USERS
// INCLUDING MEMBER PROFILE INFORMATION
// ============================================================

app.get(
    "/api/admin/users",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            console.log("ADMIN: GET USERS");

            const [users] = await db.execute(`
                SELECT
                    u.id,
                    u.username,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.address,
                    u.role_id,
                    u.is_active,
                    u.created_at,

                    /* ROLE */
                    r.role_name,

                    /* MEMBER PROFILE */
                    m.id AS member_id,
                    m.membership_number,
                    m.join_date,
                    m.status AS member_status

                FROM users u

                LEFT JOIN roles r
                    ON r.id = u.role_id

                LEFT JOIN members m
                    ON m.user_id = u.id

                ORDER BY u.id DESC
            `);

            const formattedUsers = users.map(user => ({

                // ==================================================
                // USER
                // ==================================================

                id:
                    Number(user.id),

                username:
                    user.username,

                full_name:
                    user.full_name,

                email:
                    user.email,

                phone:
                    user.phone,

                address:
                    user.address,

                role_id:
                    Number(user.role_id),

                role_name:
                    user.role_name || null,

                is_active:
                    Number(user.is_active),

                created_at:
                    user.created_at,

                // ==================================================
                // MEMBER
                // ==================================================

                member_id:
                    user.member_id
                        ? Number(user.member_id)
                        : null,

                membership_number:
                    user.membership_number || null,

                join_date:
                    user.join_date || null,

                member_status:
                    user.member_status || null

            }));

            // ======================================================
            // DEBUG
            // ======================================================

            console.log(
                "ADMIN USERS + MEMBER IDs:"
            );

            console.table(
                formattedUsers.map(user => ({
                    user_id:
                        user.id,

                    username:
                        user.username,

                    role_id:
                        user.role_id,

                    member_id:
                        user.member_id,

                    membership_number:
                        user.membership_number
                }))
            );

            return res.json({

                success: true,

                users:
                    formattedUsers

            });

        } catch (error) {

            console.error(
                "GET ADMIN USERS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load users",

                error:
                    error.message

            });
        }
    }
);

// ============================================================
// ADMIN - SYSTEM STATISTICS
// ============================================================

// ============================================================
// ADMIN - SYSTEM STATISTICS
// ============================================================

app.get(
    "/api/admin/system-stats",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            console.log("ADMIN: GET SYSTEM STATS");

            // USERS
            const [[userStats]] = await db.execute(`
                SELECT
                    COUNT(*) AS totalUsers,
                    COALESCE(SUM(
                        CASE WHEN is_active = 1 THEN 1 ELSE 0 END
                    ), 0) AS activeUsers
                FROM users
            `);

            // PRODUCTS + STOCK
            const [[productStats]] = await db.execute(`
                SELECT
                    COUNT(*) AS totalProducts,
                    COALESCE(SUM(stock), 0) AS totalStock
                FROM products
            `);

            // TOTAL ORDERS
            const [[orderStats]] = await db.execute(`
                SELECT COUNT(*) AS totalOrders
                FROM orders
            `);

            // ORDERS RECEIVED
            const [[receivedStats]] = await db.execute(`
                SELECT COUNT(DISTINCT oi.order_id) AS ordersReceived
                FROM order_items oi
                INNER JOIN products p
                    ON oi.product_id = p.id
            `);

            // PENDING ORDERS
            const [[pendingStats]] = await db.execute(`
                SELECT COUNT(*) AS pendingOrders
                FROM orders
                WHERE status IN ('pending', 'processing')
            `);

            // REVENUE
            const [[revenueStats]] = await db.execute(`
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN o.status IS NULL
                                  OR o.status != 'cancelled'
                                THEN oi.quantity * oi.unit_price
                                ELSE 0
                            END
                        ),
                        0
                    ) AS totalRevenue
                FROM orders o
                INNER JOIN order_items oi
                    ON o.id = oi.order_id
            `);

            // FINAL VALUES
            const stats = {
                totalUsers: Number(userStats?.totalUsers || 0),
                activeUsers: Number(userStats?.activeUsers || 0),

                totalProducts: Number(
                    productStats?.totalProducts || 0
                ),

                totalStock: Number(
                    productStats?.totalStock || 0
                ),

                totalOrders: Number(
                    orderStats?.totalOrders || 0
                ),

                ordersReceived: Number(
                    receivedStats?.ordersReceived || 0
                ),

                pendingOrders: Number(
                    pendingStats?.pendingOrders || 0
                ),

                totalRevenue: Number(
                    revenueStats?.totalRevenue || 0
                )
            };

            console.log(
                "ADMIN SYSTEM STATS RESULT:",
                stats
            );

            return res.json({
                success: true,

                // Direct values
                ...stats,

                // Also provide stats object
                stats
            });

        } catch (error) {

            console.error(
                "ADMIN SYSTEM STATS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load system statistics",
                error: error.message
            });
        }
    }
);
// ============================================================
// SUPPLIER PROFILE
// ============================================================

app.get(
    "/api/supplier/profile",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const [rows] =
                await db.execute(
                    `
                    SELECT
                        s.id,
                        s.user_id,
                        s.company_name,
                        s.contact_person,
                        s.phone,
                        s.email,
                        s.address,
                        s.tax_number,
                        s.status,
                        s.created_at,
                        u.username,
                        u.full_name
                    FROM suppliers s
                    INNER JOIN users u
                        ON s.user_id = u.id
                    WHERE s.user_id = ?
                    LIMIT 1
                    `,
                    [userId]
                );

            if (
                rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Supplier profile not found"
                });
            }

            return res.json({
                success: true,
                supplier:
                    rows[0]
            });

        } catch (error) {

            console.error(
                "SUPPLIER PROFILE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load supplier profile",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// SUPPLIER CATEGORIES
// ============================================================

app.get(
    "/api/supplier/categories",
    authenticateToken,
    async (req, res) => {

        try {

            const [categories] =
                await db.execute(
                    `
                    SELECT
                        id,
                        name,
                        description,
                        created_at
                    FROM categories
                    ORDER BY name ASC
                    `
                );

            return res.json({

                success: true,

                categories
            });

        } catch (error) {

            console.error(
                "CATEGORIES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load categories",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// GET SUPPLIER PRODUCTS
// ============================================================

app.get(
    "/api/supplier/products",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const supplierId =
                await getSupplierId(
                    userId
                );

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Supplier account not found"
                });
            }

            const [products] =
                await db.execute(
                    `
                    SELECT
                        p.id,
                        p.supplier_id,
                        p.category_id,
                        p.name,
                        p.description,
                        p.price,
                        p.stock,
                        p.is_active,
                        p.unit,
                        p.image_url,
                        p.created_at,
                        p.updated_at,
                        c.name AS category_name
                    FROM products p
                    LEFT JOIN categories c
                        ON p.category_id = c.id
                    WHERE p.supplier_id = ?
                    ORDER BY p.created_at DESC
                    `,
                    [supplierId]
                );

            return res.json({

                success: true,

                products
            });

        } catch (error) {

            console.error(
                "GET PRODUCTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load products",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// CREATE PRODUCT
// ============================================================

app.post(
    "/api/supplier/products",
    authenticateToken,
    upload.single("product_image"),
    async (req, res) => {

        let uploadedFile = null;

        try {

            console.log("");
            console.log(
                "======================================"
            );
            console.log(
                "CREATE PRODUCT"
            );
            console.log(
                "======================================"
            );

            console.log(
                "Content-Type:",
                req.headers["content-type"]
            );

            console.log(
                "File:",
                req.file
                    ? req.file.filename
                    : "No image"
            );

            console.log(
                "Body:",
                req.body
            );

            uploadedFile =
                req.file || null;

            const body =
                req.body || {};

            const {
                name,
                description,
                price,
                stock,
                unit,
                category_id
            } = body;

            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product name is required"
                });
            }

            if (
                price === undefined ||
                price === null ||
                price === ""
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product price is required"
                });
            }

            if (
                stock === undefined ||
                stock === null ||
                stock === ""
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product stock is required"
                });
            }

            // ------------------------------------------------
            // SUPPLIER
            // ------------------------------------------------

            const userId =
                getUserId(req);

            const supplierId =
                await getSupplierId(
                    userId
                );

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message:
                        "No supplier profile is associated with this user"
                });
            }

            // ------------------------------------------------
            // NUMBERS
            // ------------------------------------------------

            const productPrice =
                Number(price);

            const productStock =
                Number(stock);

            if (
                Number.isNaN(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product price"
                });
            }

            if (
                Number.isNaN(
                    productStock
                ) ||
                productStock < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product stock"
                });
            }

            // ------------------------------------------------
            // CATEGORY
            // ------------------------------------------------

            let categoryId = null;

            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);

                if (
                    Number.isNaN(
                        categoryId
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid category"
                    });
                }

                const [categoryRows] =
                    await db.execute(
                        `
                        SELECT id
                        FROM categories
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [categoryId]
                    );

                if (
                    categoryRows.length === 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Selected category does not exist"
                    });
                }
            }

            // ------------------------------------------------
            // IMAGE
            // ------------------------------------------------

            let imageUrl = null;

            if (req.file) {

                imageUrl =
                    `/uploads/products/${req.file.filename}`;
            }

            // ------------------------------------------------
            // INSERT PRODUCT
            // ------------------------------------------------

            const [result] =
                await db.execute(
                    `
                    INSERT INTO products
                    (
                        supplier_id,
                        category_id,
                        name,
                        description,
                        price,
                        stock,
                        is_active,
                        unit,
                        image_url
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                    `,
                    [
                        supplierId,
                        categoryId,
                        String(name).trim(),
                        description
                            ? String(description).trim()
                            : null,
                        productPrice,
                        productStock,
                        unit
                            ? String(unit).trim()
                            : null,
                        imageUrl
                    ]
                );

            console.log(
                "PRODUCT CREATED:",
                result.insertId
            );

            return res.status(201).json({

                success: true,

                message:
                    "Product created successfully",

                product: {

                    id:
                        result.insertId,

                    supplier_id:
                        supplierId,

                    category_id:
                        categoryId,

                    name:
                        String(name).trim(),

                    description:
                        description || null,

                    price:
                        productPrice,

                    stock:
                        productStock,

                    unit:
                        unit || null,

                    image_url:
                        imageUrl
                }
            });

        } catch (error) {

            console.error(
                "CREATE PRODUCT ERROR:",
                error
            );

            // Delete uploaded file
            // if database insertion fails.

            if (uploadedFile) {

                try {

                    if (
                        fs.existsSync(
                            uploadedFile.path
                        )
                    ) {

                        fs.unlinkSync(
                            uploadedFile.path
                        );
                    }

                } catch (deleteError) {

                    console.error(
                        "IMAGE CLEANUP ERROR:",
                        deleteError
                    );
                }
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to create product",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// UPDATE PRODUCT
// ============================================================

app.put(
    "/api/supplier/products/:id",
    authenticateToken,
    upload.single("product_image"),
    async (req, res) => {

        let uploadedFile =
            req.file || null;

        try {

            const productId =
                Number(
                    req.params.id
                );

            if (
                Number.isNaN(
                    productId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product ID"
                });
            }

            const userId =
                getUserId(req);

            const supplierId =
                await getSupplierId(
                    userId
                );

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Supplier account not found"
                });
            }

            const body =
                req.body || {};

            const {
                name,
                description,
                price,
                stock,
                unit,
                category_id
            } = body;

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product name is required"
                });
            }

            if (
                price === undefined ||
                price === null ||
                price === ""
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product price is required"
                });
            }

            if (
                stock === undefined ||
                stock === null ||
                stock === ""
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product stock is required"
                });
            }

            // ------------------------------------------------
            // FIND EXISTING PRODUCT
            // ------------------------------------------------

            const [existingRows] =
                await db.execute(
                    `
                    SELECT
                        id,
                        image_url
                    FROM products
                    WHERE
                        id = ?
                        AND supplier_id = ?
                    LIMIT 1
                    `,
                    [
                        productId,
                        supplierId
                    ]
                );

            if (
                existingRows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found"
                });
            }

            const oldImage =
                existingRows[0].image_url;

            let imageUrl =
                oldImage;

            // ------------------------------------------------
            // NEW IMAGE
            // ------------------------------------------------

            if (req.file) {

                imageUrl =
                    `/uploads/products/${req.file.filename}`;
            }

            // ------------------------------------------------
            // NUMBERS
            // ------------------------------------------------

            const productPrice =
                Number(price);

            const productStock =
                Number(stock);

            if (
                Number.isNaN(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product price"
                });
            }

            if (
                Number.isNaN(
                    productStock
                ) ||
                productStock < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product stock"
                });
            }

            // ------------------------------------------------
            // CATEGORY
            // ------------------------------------------------

            let categoryId = null;

            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);

                if (
                    Number.isNaN(
                        categoryId
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid category"
                    });
                }

                const [categoryRows] =
                    await db.execute(
                        `
                        SELECT id
                        FROM categories
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [categoryId]
                    );

                if (
                    categoryRows.length === 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Selected category does not exist"
                    });
                }
            }

            // ------------------------------------------------
            // UPDATE
            // ------------------------------------------------

            await db.execute(
                `
                UPDATE products
                SET
                    category_id = ?,
                    name = ?,
                    description = ?,
                    price = ?,
                    stock = ?,
                    unit = ?,
                    image_url = ?
                WHERE
                    id = ?
                    AND supplier_id = ?
                `,
                [
                    categoryId,
                    String(name).trim(),
                    description
                        ? String(description).trim()
                        : null,
                    productPrice,
                    productStock,
                    unit
                        ? String(unit).trim()
                        : null,
                    imageUrl,
                    productId,
                    supplierId
                ]
            );

            // ------------------------------------------------
            // DELETE OLD IMAGE
            // ------------------------------------------------

            if (
                req.file &&
                oldImage
            ) {

                const oldImagePath =
                    path.join(
                        __dirname,
                        oldImage.replace(
                            /^\/uploads\//,
                            "uploads/"
                        )
                    );

                if (
                    fs.existsSync(
                        oldImagePath
                    )
                ) {

                    try {

                        fs.unlinkSync(
                            oldImagePath
                        );

                    } catch (error) {

                        console.error(
                            "OLD IMAGE DELETE ERROR:",
                            error
                        );
                    }
                }
            }

            return res.json({

                success: true,

                message:
                    "Product updated successfully",

                image_url:
                    imageUrl
            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT ERROR:",
                error
            );

            if (uploadedFile) {

                try {

                    if (
                        fs.existsSync(
                            uploadedFile.path
                        )
                    ) {

                        fs.unlinkSync(
                            uploadedFile.path
                        );
                    }

                } catch (cleanupError) {

                    console.error(
                        "IMAGE CLEANUP ERROR:",
                        cleanupError
                    );
                }
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update product",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// DELETE PRODUCT
// ============================================================

app.delete(
    "/api/supplier/products/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const productId =
                Number(
                    req.params.id
                );

            const userId =
                getUserId(req);

            const supplierId =
                await getSupplierId(
                    userId
                );

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Supplier account not found"
                });
            }

            const [products] =
                await db.execute(
                    `
                    SELECT
                        image_url
                    FROM products
                    WHERE
                        id = ?
                        AND supplier_id = ?
                    LIMIT 1
                    `,
                    [
                        productId,
                        supplierId
                    ]
                );

            if (
                products.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found"
                });
            }

            const imageUrl =
                products[0].image_url;

            await db.execute(
                `
                DELETE FROM products
                WHERE
                    id = ?
                    AND supplier_id = ?
                `,
                [
                    productId,
                    supplierId
                ]
            );

            // ------------------------------------------------
            // DELETE IMAGE
            // ------------------------------------------------

            if (imageUrl) {

                const imagePath =
                    path.join(
                        __dirname,
                        imageUrl.replace(
                            /^\/uploads\//,
                            "uploads/"
                        )
                    );

                if (
                    fs.existsSync(
                        imagePath
                    )
                ) {

                    try {

                        fs.unlinkSync(
                            imagePath
                        );

                    } catch (error) {

                        console.error(
                            "IMAGE DELETE ERROR:",
                            error
                        );
                    }
                }
            }

            return res.json({
                success: true,
                message:
                    "Product deleted successfully"
            });

        } catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to delete product",
                error:
                    error.message
            });
        }
    }
);

// ============================================================
// SUPPLIER STATISTICS
// ============================================================

app.get(
    "/api/supplier/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const supplierId =
                await getSupplierId(
                    userId
                );

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Supplier account not found"
                });
            }

            const [productStats] =
                await db.execute(
                    `
                    SELECT
                        COUNT(*) AS totalProducts,

                        COALESCE(
                            SUM(stock),
                            0
                        ) AS totalStock

                    FROM products

                    WHERE supplier_id = ?
                    `,
                    [supplierId]
                );

            let ordersReceived = 0;
            let pendingOrders = 0;
            let totalRevenue = 0;

            try {

                const [orderStats] =
                    await db.execute(
                        `
                        SELECT

                            COUNT(
                                DISTINCT oi.order_id
                            ) AS ordersReceived,

                            COALESCE(
                                SUM(
                                    CASE
                                        WHEN o.status IN
                                        (
                                            'pending',
                                            'processing'
                                        )
                                        THEN 1
                                        ELSE 0
                                    END
                                ),
                                0
                            ) AS pendingOrders,

                            COALESCE(
                                SUM(
                                    oi.quantity *
                                   unit_price
                                ),
                                0
                            ) AS totalRevenue

                        FROM order_items oi

                        INNER JOIN products p
                            ON oi.product_id = p.id

                        INNER JOIN orders o
                            ON oi.order_id = o.id

                        WHERE
                            p.supplier_id = ?
                        `,
                        [supplierId]
                    );

                if (
                    orderStats.length > 0
                ) {

                    ordersReceived =
                        Number(
                            orderStats[0]
                                .ordersReceived
                        ) || 0;

                    pendingOrders =
                        Number(
                            orderStats[0]
                                .pendingOrders
                        ) || 0;

                    totalRevenue =
                        Number(
                            orderStats[0]
                                .totalRevenue
                        ) || 0;
                }

            } catch (orderError) {

                console.log(
                    "Order statistics unavailable:",
                    orderError.message
                );
            }

            return res.json({

                success: true,

                totalProducts:
                    Number(
                        productStats[0]
                            .totalProducts
                    ) || 0,

                totalStock:
                    Number(
                        productStats[0]
                            .totalStock
                    ) || 0,

                ordersReceived,

                pendingOrders,

                pendingDeliveries:
                    pendingOrders,

                totalRevenue
            });

        } catch (error) {

            console.error(
                "SUPPLIER STATS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load supplier statistics",
                error:
                    error.message
            });
        }
    }
);
// ============================================================
// SUPPLIER ORDERS
// ============================================================
// Workflow:
//
// Customer places order
//        ↓
// Payment pending
//        ↓
// Admin/Accountant approves payment
//        ↓
// orders.payment_status = 'paid'
//        ↓
// Supplier sees the order
//        ↓
// Supplier: pending → processing
//        ↓
// Supplier: processing → shipped
//        ↓
// Supplier: shipped → delivered
//        ↓
// Supplier: delivered → completed
//
// ============================================================

app.get(
    "/api/supplier/orders",
    authenticateToken,
    async (req, res) => {

        try {

            // ------------------------------------------------
            // GET LOGGED-IN USER
            // ------------------------------------------------

            const userId = getUserId(req);

            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message: "User authentication required"
                });
            }

            // ------------------------------------------------
            // GET SUPPLIER ID
            // ------------------------------------------------

            const supplierId = await getSupplierId(userId);

            if (!supplierId) {

                return res.status(403).json({
                    success: false,
                    message: "Supplier account not found"
                });
            }

            console.log(
                "SUPPLIER ORDERS - USER ID:",
                userId
            );

            console.log(
                "SUPPLIER ORDERS - SUPPLIER ID:",
                supplierId
            );

            // ------------------------------------------------
            // GET PAID ORDERS CONTAINING SUPPLIER PRODUCTS
            // ------------------------------------------------

            const [orders] = await db.execute(
                `
                SELECT

                    o.id,

                    o.order_number,

                    o.customer_id,

                    o.status,

                    o.payment_status,

                    o.order_date,

                    COALESCE(
                        u.full_name,
                        u.username,
                        'N/A'
                    ) AS customer_name,

                    COUNT(oi.id) AS total_items,

                    COALESCE(
                        SUM(
                            oi.quantity * oi.unit_price
                        ),
                        0
                    ) AS total_amount

                FROM orders o

                INNER JOIN order_items oi
                    ON o.id = oi.order_id

                INNER JOIN products p
                    ON oi.product_id = p.id

                LEFT JOIN users u
                    ON o.customer_id = u.id

                WHERE
                    p.supplier_id = ?
                    AND o.payment_status = 'paid'
                    AND o.status IN (
                        'pending',
                        'processing',
                        'shipped',
                        'delivered',
                        'completed'
                    )

                GROUP BY

                    o.id,
                    o.order_number,
                    o.customer_id,
                    o.status,
                    o.payment_status,
                    o.order_date,
                    u.full_name,
                    u.username

                ORDER BY
                    o.order_date DESC
                `,
                [supplierId]
            );

            console.log(
                "SUPPLIER PAID ORDERS:",
                orders
            );

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            return res.json({

                success: true,

                orders: orders || []

            });

        } catch (error) {

            console.error(
                "SUPPLIER ORDERS ERROR:",
                error
            );

            // IMPORTANT:
            // Do NOT return an empty array when SQL fails.
            // Otherwise frontend shows "No paid orders"
            // even though the backend has an error.

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load supplier orders",

                error:
                    error.message

            });
        }
    }
);


// ============================================================
// UPDATE SUPPLIER ORDER STATUS
// ============================================================
//
// Supplier can update:
//
// pending
//    ↓
// processing
//    ↓
// shipped
//    ↓
// delivered
//    ↓
// completed
//
// Payment MUST already be approved.
// ============================================================

app.put(
    "/api/supplier/orders/:id/status",
    authenticateToken,
    async (req, res) => {

        try {

            // ------------------------------------------------
            // ORDER ID
            // ------------------------------------------------

            const orderId = Number(
                req.params.id
            );

            if (
                !orderId ||
                Number.isNaN(orderId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID"

                });
            }

            // ------------------------------------------------
            // REQUEST BODY
            // ------------------------------------------------

            const {
                status
            } = req.body || {};

            // ------------------------------------------------
            // ALLOWED STATUSES
            // ------------------------------------------------

            const validStatuses = [

                "pending",

                "processing",

                "shipped",

                "delivered",

                "completed",

                "cancelled"

            ];

            if (
                !validStatuses.includes(status)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order status"

                });
            }

            // ------------------------------------------------
            // GET USER
            // ------------------------------------------------

            const userId = getUserId(req);

            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "User authentication required"

                });
            }

            // ------------------------------------------------
            // GET SUPPLIER
            // ------------------------------------------------

            const supplierId =
                await getSupplierId(userId);

            if (!supplierId) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Supplier account not found"

                });
            }

            console.log(
                "ORDER STATUS UPDATE"
            );

            console.log(
                "Order ID:",
                orderId
            );

            console.log(
                "Supplier ID:",
                supplierId
            );

            console.log(
                "New Status:",
                status
            );

            // ------------------------------------------------
            // VERIFY ORDER BELONGS TO SUPPLIER
            // AND PAYMENT HAS BEEN APPROVED
            // ------------------------------------------------

            const [rows] =
                await db.execute(
                    `
                    SELECT

                        o.id,

                        o.order_number,

                        o.status,

                        o.payment_status,

                        o.customer_id

                    FROM orders o

                    INNER JOIN order_items oi
                        ON o.id = oi.order_id

                    INNER JOIN products p
                        ON oi.product_id = p.id

                    WHERE
                        o.id = ?
                        AND p.supplier_id = ?

                    LIMIT 1
                    `,
                    [
                        orderId,
                        supplierId
                    ]
                );

            // ------------------------------------------------
            // ORDER NOT FOUND
            // ------------------------------------------------

            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found or does not belong to you"

                });
            }

            const order =
                rows[0];

            // ------------------------------------------------
            // PAYMENT CHECK
            // ------------------------------------------------

            if (
                order.payment_status !== "paid"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Payment has not been approved yet. Supplier cannot process this order."

                });
            }

            // ------------------------------------------------
            // PREVIOUS STATUS
            // ------------------------------------------------

            const currentStatus =
                order.status;

            // ------------------------------------------------
            // PREVENT INVALID WORKFLOW
            // ------------------------------------------------

           const allowedTransitions = {

    pending: [
        "processing",
        "shipped",
        "cancelled"
    ],

    processing: [
        "shipped",
        "delivered",
        "cancelled"
    ],

    shipped: [
        "delivered",
        "completed"
    ],

    delivered: [
        "completed"
    ],

    completed: [],

    cancelled: []

};

            // ------------------------------------------------
            // UPDATE ORDER
            // ------------------------------------------------

            await db.execute(
                `
                UPDATE orders

                SET
                    status = ?

                WHERE
                    id = ?
                `,
                [
                    status,
                    orderId
                ]
            );

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    `Order ${order.order_number} updated from ${currentStatus} to ${status}`,

                order: {

                    id:
                        order.id,

                    order_number:
                        order.order_number,

                    previous_status:
                        currentStatus,

                    status:
                        status,

                    payment_status:
                        order.payment_status

                }

            });

        } catch (error) {

            console.error(
                "UPDATE SUPPLIER ORDER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update order status",

                error:
                    error.message

            });
        }
    }
);

// ============================================================
// TEST UPLOAD
// ============================================================

app.post(
    "/api/test-upload",
    authenticateToken,
    upload.single("product_image"),
    (req, res) => {

        console.log(
            "TEST UPLOAD BODY:",
            req.body
        );

        console.log(
            "TEST UPLOAD FILE:",
            req.file
        );

        return res.json({

            success: true,

            message:
                "Upload test successful",

            body:
                req.body || {},

            file:
                req.file
                    ? {

                        filename:
                            req.file.filename,

                        originalname:
                            req.file.originalname,

                        size:
                            req.file.size,

                        mimetype:
                            req.file.mimetype
                    }
                    : null
        });
    }
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Image size cannot exceed 5MB"
                });
            }

            return res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }

        if (
            error &&
            error.message &&
            error.message.includes(
                "Only JPG"
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }

        next(error);
    }
);
// ============================================================
// ADMIN - UPDATE USER
// ============================================================

app.put(
    "/api/admin/users/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!userId || Number.isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            const {
                username,
                email,
                password,
                full_name,
                phone,
                role_id,
                is_active
            } = req.body || {};

            // -----------------------------
            // VALIDATION
            // -----------------------------

            if (!username || !String(username).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Username is required"
                });
            }

            if (!email || !String(email).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }

            if (!full_name || !String(full_name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Full name is required"
                });
            }

            const roleId = Number(role_id);

            if (!roleId || Number.isNaN(roleId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid role is required"
                });
            }

            // -----------------------------
            // CHECK ROLE
            // -----------------------------

            const [roleRows] = await db.execute(
                `
                SELECT id
                FROM roles
                WHERE id = ?
                LIMIT 1
                `,
                [roleId]
            );

            if (roleRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Selected role does not exist"
                });
            }

            // -----------------------------
            // CHECK USER
            // -----------------------------

            const [existingUser] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (existingUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // -----------------------------
            // CHECK DUPLICATE USERNAME
            // -----------------------------

            const [usernameRows] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE username = ?
                AND id != ?
                LIMIT 1
                `,
                [
                    String(username).trim(),
                    userId
                ]
            );

            if (usernameRows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Username already exists"
                });
            }

            // -----------------------------
            // CHECK DUPLICATE EMAIL
            // -----------------------------

            const [emailRows] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE email = ?
                AND id != ?
                LIMIT 1
                `,
                [
                    String(email).trim(),
                    userId
                ]
            );

            if (emailRows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists"
                });
            }

            // -----------------------------
            // ACTIVE STATUS
            // -----------------------------

            const activeStatus =
                is_active === true ||
                is_active === 1 ||
                is_active === "1"
                    ? 1
                    : 0;

            // -----------------------------
            // UPDATE WITH PASSWORD
            // -----------------------------

            if (
                password !== undefined &&
                password !== null &&
                String(password).trim() !== ""
            ) {
                if (String(password).length < 6) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Password must be at least 6 characters"
                    });
                }

                const passwordHash =
                    await bcrypt.hash(
                        String(password),
                        10
                    );

                await db.execute(
                    `
                    UPDATE users
                    SET
                        username = ?,
                        email = ?,
                        password_hash = ?,
                        full_name = ?,
                        phone = ?,
                        role_id = ?,
                        is_active = ?
                    WHERE id = ?
                    `,
                    [
                        String(username).trim(),
                        String(email).trim(),
                        passwordHash,
                        String(full_name).trim(),
                        phone
                            ? String(phone).trim()
                            : null,
                        roleId,
                        activeStatus,
                        userId
                    ]
                );
            } else {
                // -----------------------------
                // UPDATE WITHOUT PASSWORD
                // -----------------------------

                await db.execute(
                    `
                    UPDATE users
                    SET
                        username = ?,
                        email = ?,
                        full_name = ?,
                        phone = ?,
                        role_id = ?,
                        is_active = ?
                    WHERE id = ?
                    `,
                    [
                        String(username).trim(),
                        String(email).trim(),
                        String(full_name).trim(),
                        phone
                            ? String(phone).trim()
                            : null,
                        roleId,
                        activeStatus,
                        userId
                    ]
                );
            }

            // -----------------------------
            // GET UPDATED USER
            // -----------------------------

            const [updatedUsers] = await db.execute(
                `
                SELECT
                    id,
                    username,
                    email,
                    role_id,
                    full_name,
                    phone,
                    address,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            console.log(
                "ADMIN: USER UPDATED:",
                userId
            );

            return res.json({
                success: true,
                message: "User updated successfully",
                user: updatedUsers[0]
            });

        } catch (error) {

            console.error(
                "ADMIN UPDATE USER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to update user",
                error: error.message
            });
        }
    }
); 
// ============================================================
// ADMIN - DELETE USER
// ============================================================

app.delete(
    "/api/admin/users/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!userId || Number.isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            // Make sure logged-in user is admin
            const loggedInUserId = getUserId(req);

            const [adminRows] = await db.execute(
                `
                SELECT role_id
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [loggedInUserId]
            );

            if (
                adminRows.length === 0 ||
                Number(adminRows[0].role_id) !== 1
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Only administrators can delete users"
                });
            }

            // Prevent admin from deleting himself
            if (userId === Number(loggedInUserId)) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot delete your own account"
                });
            }

            // Check whether user exists
            const [userRows] = await db.execute(
                `
                SELECT id, username, email
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Delete supplier profile first if one exists
            try {
                await db.execute(
                    `
                    DELETE FROM suppliers
                    WHERE user_id = ?
                    `,
                    [userId]
                );
            } catch (supplierError) {
                console.log(
                    "Supplier profile delete skipped:",
                    supplierError.message
                );
            }

            // Delete user
            await db.execute(
                `
                DELETE FROM users
                WHERE id = ?
                `,
                [userId]
            );

            console.log(
                "ADMIN DELETED USER:",
                userRows[0].username
            );

            return res.json({
                success: true,
                message: "User deleted successfully"
            });

        } catch (error) {
            console.error(
                "ADMIN DELETE USER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to delete user",
                error: error.message
            });
        }
    }
);
// ============================================================
// ADMIN - TOGGLE USER ACTIVE STATUS
// ============================================================

app.patch(
    "/api/admin/users/:id/toggle-status",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!userId || Number.isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            // Get logged-in admin
            const loggedInUserId = getUserId(req);

            // Check admin role
            const [adminRows] = await db.execute(
                `
                SELECT role_id
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [loggedInUserId]
            );

            if (adminRows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Admin account not found"
                });
            }

            if (Number(adminRows[0].role_id) !== 1) {
                return res.status(403).json({
                    success: false,
                    message: "Only administrators can change user status"
                });
            }

            // Prevent admin from deactivating himself
            if (userId === Number(loggedInUserId)) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot deactivate your own account"
                });
            }

            // Get current user status
            const [userRows] = await db.execute(
                `
                SELECT
                    id,
                    username,
                    email,
                    is_active
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            const user = userRows[0];

            // Toggle status
            const newStatus =
                Number(user.is_active) === 1 ? 0 : 1;

            await db.execute(
                `
                UPDATE users
                SET is_active = ?
                WHERE id = ?
                `,
                [newStatus, userId]
            );

            console.log(
                `ADMIN: User ${user.username} status changed to ${
                    newStatus === 1 ? "ACTIVE" : "INACTIVE"
                }`
            );

            return res.json({
                success: true,
                message:
                    newStatus === 1
                        ? "User activated successfully"
                        : "User deactivated successfully",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_active: newStatus
                }
            });

        } catch (error) {
            console.error(
                "TOGGLE USER STATUS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to change user status",
                error: error.message
            });
        }
    }
);



// ============================================================
// ACCOUNTANT DASHBOARD
// ============================================================
app.get('/api/accountant/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('==============================================');
    console.log('ACCOUNTANT: GET DASHBOARD');
    console.log('==============================================');

    // ========================================================
    // 1. TOTAL PAYMENTS
    // ========================================================

    const [paymentCount] = await db.query(`
      SELECT COUNT(*) AS totalPayments
      FROM payments
    `);

    // ========================================================
    // 2. PENDING PAYMENTS
    // ========================================================

    const [pendingPaymentCount] = await db.query(`
      SELECT COUNT(*) AS pendingPayments
      FROM payments
      WHERE status = 'pending'
    `);

    // ========================================================
    // 3. ACTIVE LOANS
    // ========================================================

    const [loanCount] = await db.query(`
      SELECT COUNT(*) AS activeLoans
      FROM loans
      WHERE status IN ('active', 'approved')
    `);

    // ========================================================
    // 4. TOTAL REVENUE
    // ========================================================

    const [revenue] = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS totalRevenue
      FROM payments
      WHERE status = 'completed'
    `);

    // ========================================================
    // 5. RECENT PAYMENTS
    //
    // IMPORTANT:
    // payments.user_id -> users.id
    // payments.order_id -> orders.id
    //
    // We JOIN users and orders so the accountant can see:
    // - payer name
    // - username
    // - email
    // - phone
    // - order number
    // - transaction ID
    // - payment method
    // ========================================================

    const [recentPayments] = await db.query(`
      SELECT
        p.id,

        /* Payment information */
        p.user_id,
        p.order_id,
        p.transaction_id,
        p.amount,
        p.payment_method,
        p.status,
        p.payment_date,

        /* Payer information */
        COALESCE(
          payer.full_name,
          order_customer.full_name,
          payer.username,
          order_customer.username,
          'Unknown User'
        ) AS full_name,

        COALESCE(
          payer.username,
          order_customer.username
        ) AS username,

        COALESCE(
          payer.email,
          order_customer.email
        ) AS email,

        COALESCE(
          payer.phone,
          order_customer.phone
        ) AS phone,

        /* Order information */
        o.order_number,

        /* Member information */
        m.membership_number

      FROM payments p

      /* Direct payment user */
      LEFT JOIN users payer
        ON p.user_id = payer.id

      /* Order */
      LEFT JOIN orders o
        ON p.order_id = o.id

      /* Customer who created the order */
      LEFT JOIN users order_customer
        ON o.customer_id = order_customer.id

      /* Member information */
      LEFT JOIN members m
        ON m.user_id = COALESCE(
          p.user_id,
          o.customer_id
        )

      ORDER BY p.payment_date DESC, p.id DESC

      LIMIT 10
    `);

    // ========================================================
    // 6. PENDING LOANS
    // ========================================================

    const [pendingLoans] = await db.query(`
      SELECT
        l.id,
        l.member_id,
        l.amount,
        l.status,

        /* Member/User information */
        u.full_name,
        u.username,
        u.email,
        u.phone,

        /* Membership information */
        m.membership_number

      FROM loans l

      LEFT JOIN users u
        ON l.member_id = u.id

      LEFT JOIN members m
        ON m.user_id = u.id

      WHERE l.status = 'pending'

      ORDER BY l.id DESC

      LIMIT 10
    `);

    // ========================================================
    // 7. CREATE RESPONSE
    // ========================================================

    const result = {
      stats: {
        totalPayments: Number(
          paymentCount[0]?.totalPayments || 0
        ),

        pendingPayments: Number(
          pendingPaymentCount[0]?.pendingPayments || 0
        ),

        activeLoans: Number(
          loanCount[0]?.activeLoans || 0
        ),

        totalRevenue: Number(
          revenue[0]?.totalRevenue || 0
        )
      },

      // Keep both formats compatible with your React code
      totalPayments: Number(
        paymentCount[0]?.totalPayments || 0
      ),

      pendingPayments: Number(
        pendingPaymentCount[0]?.pendingPayments || 0
      ),

      activeLoans: Number(
        loanCount[0]?.activeLoans || 0
      ),

      totalRevenue: Number(
        revenue[0]?.totalRevenue || 0
      ),

      recentPayments: recentPayments || [],

      pendingLoans: pendingLoans || []
    };

    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
      'ACCOUNTANT TOTAL PAYMENTS:',
      result.totalPayments
    );

    console.log(
      'ACCOUNTANT PENDING PAYMENTS:',
      result.pendingPayments
    );

    console.log(
      'ACCOUNTANT ACTIVE LOANS:',
      result.activeLoans
    );

    console.log(
      'ACCOUNTANT TOTAL REVENUE:',
      result.totalRevenue
    );

    console.log(
      'ACCOUNTANT RECENT PAYMENTS:',
      JSON.stringify(result.recentPayments, null, 2)
    );

    console.log(
      'ACCOUNTANT PENDING LOANS:',
      JSON.stringify(result.pendingLoans, null, 2)
    );

    console.log('==============================================');

    // ========================================================
    // SEND RESPONSE
    // ========================================================

    res.json({
      success: true,
      ...result
    });

  } catch (error) {

    console.error(
      'ACCOUNTANT DASHBOARD ERROR:',
      error
    );

    console.error(
      'ERROR MESSAGE:',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Failed to load accountant dashboard',
      error: error.message
    });
  }
});


// ============================================================
// ACCOUNTANT GENERATE FINANCIAL REPORT
// ============================================================
app.get('/api/accountant/report', authenticateToken, async (req, res) => {
  try {

    console.log('==============================================');
    console.log('ACCOUNTANT: GENERATING FINANCIAL REPORT');
    console.log('==============================================');

    const PDFDocument = require('pdfkit');

    // ========================================================
    // 1. GET ALL PAYMENTS
    //
    // IMPORTANT:
    // We JOIN users and orders here too.
    // ========================================================

    const [payments] = await db.query(`
      SELECT

        /* Payment */
        p.id,
        p.user_id,
        p.order_id,
        p.transaction_id,
        p.amount,
        p.payment_method,
        p.status,
        p.payment_date,

        /* Payer */
        COALESCE(
          payer.full_name,
          order_customer.full_name,
          payer.username,
          order_customer.username,
          'Unknown User'
        ) AS full_name,

        COALESCE(
          payer.username,
          order_customer.username
        ) AS username,

        COALESCE(
          payer.email,
          order_customer.email
        ) AS email,

        COALESCE(
          payer.phone,
          order_customer.phone
        ) AS phone,

        /* Order */
        o.order_number,

        /* Member */
        m.membership_number

      FROM payments p

      LEFT JOIN users payer
        ON p.user_id = payer.id

      LEFT JOIN orders o
        ON p.order_id = o.id

      LEFT JOIN users order_customer
        ON o.customer_id = order_customer.id

      LEFT JOIN members m
        ON m.user_id = COALESCE(
          p.user_id,
          o.customer_id
        )

      ORDER BY p.payment_date DESC, p.id DESC
    `);

    // ========================================================
    // 2. GET ALL LOANS
    // ========================================================

    const [loans] = await db.query(`
      SELECT
        l.id,
        l.member_id,
        l.amount,
        l.status,

        u.full_name AS member_name,
        u.username,
        u.email,
        u.phone,

        m.membership_number

      FROM loans l

      LEFT JOIN users u
        ON l.member_id = u.id

      LEFT JOIN members m
        ON m.user_id = u.id

      ORDER BY l.id DESC
    `);

    // ========================================================
    // 3. CALCULATE SUMMARY
    // ========================================================

    const totalPayments = payments.length;

    const pendingPayments = payments.filter(
      payment =>
        String(payment.status || '').toLowerCase() === 'pending'
    ).length;

    const totalRevenue = payments
      .filter(
        payment =>
          String(payment.status || '').toLowerCase() === 'completed'
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const activeLoans = loans.filter(
      loan => {
        const status = String(
          loan.status || ''
        ).toLowerCase();

        return (
          status === 'active' ||
          status === 'approved'
        );
      }
    ).length;

    // ========================================================
    // 4. CREATE PDF
    // ========================================================

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // ========================================================
    // 5. PDF RESPONSE HEADERS
    // ========================================================

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="accountant-report.pdf"'
    );

    // Send PDF to browser
    doc.pipe(res);

    // ========================================================
    // 6. REPORT TITLE
    // ========================================================

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(
        'Cooperative Financial Report',
        {
          align: 'center'
        }
      );

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(
        `Generated: ${new Date().toLocaleString()}`,
        {
          align: 'center'
        }
      );

    doc.moveDown(2);

    // ========================================================
    // 7. FINANCIAL SUMMARY
    // ========================================================

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Financial Summary');

    doc.moveDown(0.7);

    doc
      .fontSize(12)
      .font('Helvetica');

    doc.text(
      `Total Payments: ${totalPayments}`
    );

    doc.text(
      `Pending Payments: ${pendingPayments}`
    );

    doc.text(
      `Active Loans: ${activeLoans}`
    );

    doc.text(
      `Total Revenue: ${totalRevenue.toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )} ETB`
    );

    doc.moveDown(2);

    // ========================================================
    // 8. PAYMENTS SECTION
    // ========================================================

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Recent Payments');

    doc.moveDown(0.7);

    if (payments.length === 0) {

      doc
        .fontSize(11)
        .font('Helvetica')
        .text('No payment records found.');

    } else {

      payments
        .slice(0, 20)
        .forEach((payment, index) => {

          const payer =
            payment.full_name ||
            payment.username ||
            'Unknown User';

          const order =
            payment.order_number ||
            (payment.order_id
              ? `Order #${payment.order_id}`
              : 'N/A');

          const transaction =
            payment.transaction_id ||
            'N/A';

          const amount =
            Number(payment.amount || 0)
              .toLocaleString(
                'en-US',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }
              );

          const method =
            payment.payment_method ||
            'N/A';

          const status =
            payment.status ||
            'N/A';

          const date =
            payment.payment_date
              ? new Date(
                  payment.payment_date
                ).toLocaleString()
              : 'N/A';

          doc
            .fontSize(9)
            .font('Helvetica')
            .text(
              `${index + 1}. ${payer}`
            );

          doc.text(
            `   Order: ${order} | Amount: ${amount} ETB`
          );

          doc.text(
            `   Method: ${method} | Status: ${status}`
          );

          doc.text(
            `   Transaction: ${transaction} | Date: ${date}`
          );

          doc.moveDown(0.5);
        });
    }

    // ========================================================
    // 9. LOANS SECTION
    // ========================================================

    doc.addPage();

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Loans');

    doc.moveDown(0.7);

    if (loans.length === 0) {

      doc
        .fontSize(11)
        .font('Helvetica')
        .text('No loan records found.');

    } else {

      loans
        .slice(0, 20)
        .forEach((loan, index) => {

          const member =
            loan.member_name ||
            loan.username ||
            'Unknown Member';

          const amount =
            Number(loan.amount || 0)
              .toLocaleString(
                'en-US',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }
              );

          const status =
            loan.status ||
            'N/A';

          const membership =
            loan.membership_number ||
            'N/A';

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(
              `${index + 1}. ${member}`
            );

          doc.text(
            `   Membership: ${membership}`
          );

          doc.text(
            `   Amount: ${amount} ETB | Status: ${status}`
          );

          doc.moveDown(0.5);
        });
    }

    // ========================================================
    // 10. FOOTER
    // ========================================================

    doc.moveDown(2);

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Generated by Cooperative Management System',
        {
          align: 'center'
        }
      );

    // ========================================================
    // 11. FINISH PDF
    // ========================================================

    doc.end();

  } catch (error) {

    console.error(
      '=============================================='
    );

    console.error(
      'ACCOUNTANT REPORT ERROR:',
      error
    );

    console.error(
      'ERROR MESSAGE:',
      error.message
    );

    console.error(
      '=============================================='
    );

    // If PDF has not already started
    if (!res.headersSent) {

      return res.status(500).json({
        success: false,
        message: 'Failed to generate accountant report',
        error: error.message
      });

    }

  }
});


// ============================================================
// APPROVE / REJECT LOAN
// ============================================================
app.patch(
  '/api/accountant/loans/:id/status',
  authenticateToken,
  async (req, res) => {

    try {

      const loanId = req.params.id;
      const { status } = req.body;

      console.log(
        'ACCOUNTANT: UPDATE LOAN',
        loanId,
        status
      );

      // ======================================================
      // VALIDATE STATUS
      // ======================================================

      if (!['approved', 'rejected'].includes(status)) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid loan status. Use approved or rejected.'
        });

      }

      // ======================================================
      // CHECK LOAN EXISTS
      // ======================================================

      const [loanRows] = await db.query(
        `
        SELECT id, status
        FROM loans
        WHERE id = ?
        LIMIT 1
        `,
        [loanId]
      );

      if (loanRows.length === 0) {

        return res.status(404).json({
          success: false,
          message: 'Loan not found.'
        });

      }

      // ======================================================
      // UPDATE LOAN
      // ======================================================

      await db.query(
        `
        UPDATE loans
        SET status = ?
        WHERE id = ?
        `,
        [
          status,
          loanId
        ]
      );

      console.log(
        `ACCOUNTANT: Loan ${loanId} changed to ${status}`
      );

      return res.json({
        success: true,
        message:
          `Loan ${status} successfully.`,
        loanId: Number(loanId),
        status
      });

    } catch (error) {

      console.error(
        'ACCOUNTANT LOAN STATUS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to update loan status.',
        error: error.message
      });
    }
  }
);

// ============================================================
// MANAGER DASHBOARD
// ============================================================
app.get("/api/manager/dashboard", authenticateToken, async (req, res) => {
  try {
    console.log("MANAGER: GET DASHBOARD");

    const [users] = await db.query(`
      SELECT COUNT(*) AS totalUsers
      FROM users
    `);

    const [activeUsers] = await db.query(`
      SELECT COUNT(*) AS activeUsers
      FROM users
      WHERE is_active = 1
    `);

    const [orders] = await db.query(`
      SELECT COUNT(*) AS totalOrders
      FROM orders
    `);

    const [revenue] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS totalRevenue
      FROM payments
      WHERE status = 'completed'
    `);

    res.json({
      success: true,

      stats: {
        totalUsers: Number(users[0].totalUsers || 0),
        activeUsers: Number(activeUsers[0].activeUsers || 0),
        totalOrders: Number(orders[0].totalOrders || 0),
        totalRevenue: Number(revenue[0].totalRevenue || 0)
      }
    });

  } catch (error) {
    console.error("MANAGER DASHBOARD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load manager dashboard",
      error: error.message
    });
  }
});

// ============================================================
// CUSTOMER DASHBOARD
// ============================================================

app.get('/api/customer/stats', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const [totalOrders] = await db.query(
      `SELECT COUNT(*) AS totalOrders
       FROM orders
       WHERE customer_id = ?`,
      [customerId]
    );

    const [totalSpent] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS totalSpent
       FROM orders
       WHERE customer_id = ?
       AND status != 'cancelled'`,
      [customerId]
    );

    const [pendingOrders] = await db.query(
      `SELECT COUNT(*) AS pendingOrders
       FROM orders
       WHERE customer_id = ?
       AND status = 'pending'`,
      [customerId]
    );

    const [activeOrders] = await db.query(
      `SELECT COUNT(*) AS activeOrders
       FROM orders
       WHERE customer_id = ?
       AND status IN ('processing', 'shipped')`,
      [customerId]
    );

    res.json({
      success: true,
      totalOrders: Number(totalOrders[0].totalOrders),
      totalSpent: Number(totalSpent[0].totalSpent),
      pendingOrders: Number(pendingOrders[0].pendingOrders),
      activeOrders: Number(activeOrders[0].activeOrders)
    });

  } catch (error) {
    console.error('CUSTOMER STATS ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to load customer statistics'
    });
  }
});


app.get('/api/customer/recent-orders', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const [orders] = await db.query(
      `SELECT
          id,
          order_number,
          total_amount,
          status,
          payment_status,
          order_date
       FROM orders
       WHERE customer_id = ?
       ORDER BY order_date DESC
       LIMIT 5`,
      [customerId]
    );

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('CUSTOMER RECENT ORDERS ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to load recent orders'
    });
  }
});
// ============================================================
// CUSTOMER - GET AVAILABLE PRODUCTS
// ============================================================

app.get("/api/products", async (req, res) => {
    console.log("GET /api/products");

    try {
        const [products] = await db.query(`
            SELECT
                id,
                supplier_id,
                category_id,
                name,
                description,
                price,
                stock,
                is_active,
                unit,
                image_url,
                created_at,
                updated_at
            FROM products
            WHERE is_active = 1
            ORDER BY created_at DESC
        `);

        console.log("PRODUCTS FOUND:", products.length);

        return res.status(200).json({
            success: true,
            products: products
        });

    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load products",
            error: error.message
        });
    }
});
// ============================================================
// CUSTOMER - GET ACTIVE PRODUCTS
// ============================================================

app.get("/api/products", async (req, res) => {
    try {
        console.log("GET /api/products");

        const [products] = await db.query(`
            SELECT
                id,
                supplier_id,
                category_id,
                name,
                description,
                price,
                stock,
                is_active,
                unit,
                image_url,
                created_at,
                updated_at
            FROM products
            WHERE is_active = 1
            ORDER BY created_at DESC
        `);

        console.log("PRODUCTS FOUND:", products.length);

        return res.status(200).json({
            success: true,
            products: products
        });

    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load products",
            error: error.message
        });
    }
});
// ============================================================
// CUSTOMER CART
// ============================================================

app.get(
    "/api/customer/cart",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;

            const [items] = await db.execute(
                `
                SELECT
                    ci.id,
                    ci.product_id,
                    ci.quantity,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image_url,
                    (p.price * ci.quantity) AS subtotal
                FROM cart_items ci
                INNER JOIN products p
                    ON ci.product_id = p.id
                WHERE ci.customer_id = ?
                AND p.is_active = 1
                ORDER BY ci.created_at DESC
                `,
                [customerId]
            );

            const total = items.reduce(
                (sum, item) =>
                    sum + Number(item.subtotal || 0),
                0
            );

            res.json({
                success: true,
                items,
                total
            });

        } catch (error) {
            console.error("GET CART ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Failed to load cart"
            });
        }
    }
);


// ============================================================
// ADD TO CART
// ============================================================

app.post(
    "/api/customer/cart",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;

            const productId = Number(
                req.body.product_id
            );

            const quantity = Number(
                req.body.quantity || 1
            );

            if (!productId || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product or quantity"
                });
            }

            const [products] = await db.execute(
                `
                SELECT
                    id,
                    name,
                    price,
                    stock,
                    is_active
                FROM products
                WHERE id = ?
                LIMIT 1
                `,
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const product = products[0];

            if (!product.is_active) {
                return res.status(400).json({
                    success: false,
                    message: "Product is not available"
                });
            }

            if (Number(product.stock) < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Only ${product.stock} item(s) available`
                });
            }

            const [existing] = await db.execute(
                `
                SELECT id, quantity
                FROM cart_items
                WHERE customer_id = ?
                AND product_id = ?
                LIMIT 1
                `,
                [
                    customerId,
                    productId
                ]
            );

            if (existing.length > 0) {

                const newQuantity =
                    Number(existing[0].quantity) +
                    quantity;

                if (
                    newQuantity >
                    Number(product.stock)
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `Only ${product.stock} item(s) available`
                    });
                }

                await db.execute(
                    `
                    UPDATE cart_items
                    SET quantity = ?
                    WHERE id = ?
                    `,
                    [
                        newQuantity,
                        existing[0].id
                    ]
                );

            } else {

                await db.execute(
                    `
                    INSERT INTO cart_items
                    (
                        customer_id,
                        product_id,
                        quantity
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        customerId,
                        productId,
                        quantity
                    ]
                );
            }

            res.status(201).json({
                success: true,
                message: "Product added to cart"
            });

        } catch (error) {
            console.error(
                "ADD TO CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to add product to cart"
            });
        }
    }
);


// ============================================================
// UPDATE CART ITEM
// ============================================================

app.put(
    "/api/customer/cart/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;
            const cartId = Number(req.params.id);
            const quantity = Number(req.body.quantity);

            if (!quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            const [items] = await db.execute(
                `
                SELECT
                    ci.id,
                    p.stock
                FROM cart_items ci
                INNER JOIN products p
                    ON ci.product_id = p.id
                WHERE ci.id = ?
                AND ci.customer_id = ?
                `,
                [
                    cartId,
                    customerId
                ]
            );

            if (items.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found"
                });
            }

            if (
                quantity >
                Number(items[0].stock)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${items[0].stock} item(s) available`
                });
            }

            await db.execute(
                `
                UPDATE cart_items
                SET quantity = ?
                WHERE id = ?
                AND customer_id = ?
                `,
                [
                    quantity,
                    cartId,
                    customerId
                ]
            );

            res.json({
                success: true,
                message: "Cart updated"
            });

        } catch (error) {
            console.error(
                "UPDATE CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to update cart"
            });
        }
    }
);


// ============================================================
// REMOVE CART ITEM
// ============================================================

app.delete(
    "/api/customer/cart/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;
            const cartId = Number(req.params.id);

            await db.execute(
                `
                DELETE FROM cart_items
                WHERE id = ?
                AND customer_id = ?
                `,
                [
                    cartId,
                    customerId
                ]
            );

            res.json({
                success: true,
                message: "Item removed from cart"
            });

        } catch (error) {
            console.error(
                "REMOVE CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to remove item"
            });
        }
    }
);
// ============================================================
// CUSTOMER ORDERS
// GET /api/customer/orders
// ============================================================

app.get("/api/customer/orders", authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.id;

        console.log("CUSTOMER ORDERS REQUEST");
        console.log("Customer ID:", customerId);

        const [orders] = await db.query(
            `
            SELECT
                o.id,
                o.order_number,
                o.customer_id,
                o.total_amount,
                o.status,
                o.payment_status,
                o.order_date
            FROM orders o
            WHERE o.customer_id = ?
            ORDER BY o.order_date DESC
            `,
            [customerId]
        );

        res.json({
            success: true,
            orders: orders
        });

    } catch (error) {
        console.error("CUSTOMER ORDERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load customer orders",
            error: error.message
        });
    }
});
// ============================================================
// CUSTOMER REVIEWS
// ============================================================

app.get("/api/customer/reviews", authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.id;

    const [reviews] = await db.query(
      `
      SELECT
        r.id,
        r.product_id,
        r.rating,
        r.comment,
        r.created_at,
        p.name AS product_name,
        p.image_url
      FROM reviews r
      LEFT JOIN products p
        ON r.product_id = p.id
      WHERE r.customer_id = ?
      ORDER BY r.created_at DESC
      `,
      [customerId]
    );

    res.json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error("CUSTOMER REVIEWS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load customer reviews",
      error: error.message
    });
  }
});
// ============================================================
// GET CUSTOMER REVIEWS
// ============================================================

app.get(
    "/api/customer/reviews",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;

            const [reviews] = await db.query(
                `
                SELECT
                    r.id,
                    r.customer_id,
                    r.product_id,
                    r.rating,
                    r.comment,
                    r.created_at,
                    p.name AS product_name,
                    p.image_url
                FROM reviews r
                LEFT JOIN products p
                    ON r.product_id = p.id
                WHERE r.customer_id = ?
                ORDER BY r.created_at DESC
                `,
                [customerId]
            );

            res.status(200).json({
                success: true,
                reviews: reviews
            });

        } catch (error) {

            console.error(
                "GET CUSTOMER REVIEWS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load customer reviews",
                error: error.message
            });
        }
    }
);

// ============================================================
// ADD CUSTOMER REVIEW
// ============================================================

app.post(
    "/api/customer/reviews",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId = req.user.id;

            const {
                product_id,
                rating,
                comment
            } = req.body;

            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: "Product is required"
                });
            }

            if (
                !rating ||
                Number(rating) < 1 ||
                Number(rating) > 5
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5"
                });
            }

            const [product] = await db.query(
                `
                SELECT id
                FROM products
                WHERE id = ?
                LIMIT 1
                `,
                [product_id]
            );

            if (product.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const [existing] = await db.query(
                `
                SELECT id
                FROM reviews
                WHERE customer_id = ?
                AND product_id = ?
                LIMIT 1
                `,
                [
                    customerId,
                    product_id
                ]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "You have already reviewed this product"
                });
            }

            const [result] = await db.query(
                `
                INSERT INTO reviews
                (
                    customer_id,
                    product_id,
                    rating,
                    comment
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    customerId,
                    product_id,
                    Number(rating),
                    comment || null
                ]
            );

            res.status(201).json({
                success: true,
                message: "Review added successfully",
                reviewId: result.insertId
            });

        } catch (error) {

            console.error(
                "ADD CUSTOMER REVIEW ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to add review",
                error: error.message
            });
        }
    }
); 
// ============================================================
// GET CUSTOMER CART
// ============================================================

app.get(
    "/api/customer/cart",
    authenticateToken,
    async (req, res) => {
        try {
            const customerId = req.user.id;

            const [cartItems] = await db.query(
                `
                SELECT
                    c.id AS cart_id,
                    c.customer_id,
                    c.product_id,
                    c.quantity,

                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.unit,
                    p.image_url,

                    (p.price * c.quantity) AS subtotal

                FROM cart_items c

                INNER JOIN products p
                    ON c.product_id = p.id

                WHERE c.customer_id = ?

                ORDER BY c.created_at DESC
                `,
                [customerId]
            );

            let totalAmount = 0;

            cartItems.forEach((item) => {
                totalAmount += Number(item.subtotal || 0);
            });

            res.json({
                success: true,
                cart: cartItems,
                totalAmount: totalAmount,
                itemCount: cartItems.length
            });

        } catch (error) {

            console.error(
                "GET CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load cart",
                error: error.message
            });
        }
    }
);

// ============================================================
// ADD PRODUCT TO CART
// ============================================================

app.post(
    "/api/customer/cart",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId = req.user.id;

            const {
                product_id,
                quantity
            } = req.body;

            const productId = Number(product_id);
            const requestedQuantity = Number(quantity);

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: "Product ID is required"
                });
            }

            if (
                !Number.isInteger(requestedQuantity) ||
                requestedQuantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be at least 1"
                });
            }

            // ----------------------------------------------------
            // GET PRODUCT
            // ----------------------------------------------------

            const [products] = await db.query(
                `
                SELECT
                    id,
                    name,
                    price,
                    stock,
                    is_active
                FROM products
                WHERE id = ?
                LIMIT 1
                `,
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const product = products[0];

            if (
                product.is_active === 0 ||
                product.is_active === false
            ) {
                return res.status(400).json({
                    success: false,
                    message: "This product is not available"
                });
            }

            if (Number(product.stock) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "This product is out of stock"
                });
            }

            // ----------------------------------------------------
            // CHECK EXISTING CART ITEM
            // ----------------------------------------------------

            const [existingItems] = await db.query(
                `
                SELECT
                    id,
                    quantity
                FROM cart_items
                WHERE customer_id = ?
                AND product_id = ?
                LIMIT 1
                `,
                [
                    customerId,
                    productId
                ]
            );

            if (existingItems.length > 0) {

                const existingQuantity =
                    Number(existingItems[0].quantity);

                const newQuantity =
                    existingQuantity + requestedQuantity;

                if (
                    newQuantity >
                    Number(product.stock)
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `Only ${product.stock} units of ${product.name} are available`
                    });
                }

                await db.query(
                    `
                    UPDATE cart_items
                    SET quantity = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [
                        newQuantity,
                        existingItems[0].id
                    ]
                );

                return res.json({
                    success: true,
                    message: "Cart quantity updated",
                    quantity: newQuantity
                });
            }

            // ----------------------------------------------------
            // INSERT NEW CART ITEM
            // ----------------------------------------------------

            await db.query(
                `
                INSERT INTO cart_items
                (
                    customer_id,
                    product_id,
                    quantity
                )
                VALUES (?, ?, ?)
                `,
                [
                    customerId,
                    productId,
                    requestedQuantity
                ]
            );

            res.status(201).json({
                success: true,
                message: "Product added to cart",
                quantity: requestedQuantity
            });

        } catch (error) {

            console.error(
                "ADD TO CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to add product to cart",
                error: error.message
            });
        }
    }
);

// ============================================================
// UPDATE CART QUANTITY
// ============================================================

app.put(
    "/api/customer/cart/:productId",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId = req.user.id;
            const productId = Number(req.params.productId);
            const quantity = Number(req.body.quantity);

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be at least 1"
                });
            }

            const [products] = await db.query(
                `
                SELECT
                    id,
                    name,
                    stock
                FROM products
                WHERE id = ?
                LIMIT 1
                `,
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            if (
                quantity >
                Number(products[0].stock)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${products[0].stock} units available`
                });
            }

            const [result] = await db.query(
                `
                UPDATE cart_items
                SET quantity = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = ?
                AND product_id = ?
                `,
                [
                    quantity,
                    customerId,
                    productId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found"
                });
            }

            res.json({
                success: true,
                message: "Cart updated successfully"
            });

        } catch (error) {

            console.error(
                "UPDATE CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to update cart",
                error: error.message
            });
        }
    }
);
// ============================================================
// DELETE CART ITEM
// ============================================================

app.delete(
    "/api/customer/cart/:productId",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId = req.user.id;
            const productId = Number(req.params.productId);

            const [result] = await db.query(
                `
                DELETE FROM cart_items
                WHERE customer_id = ?
                AND product_id = ?
                `,
                [
                    customerId,
                    productId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Cart item not found"
                });
            }

            res.json({
                success: true,
                message: "Item removed from cart"
            });

        } catch (error) {

            console.error(
                "DELETE CART ITEM ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to remove cart item",
                error: error.message
            });
        }
    }
);


// ============================================================
// CUSTOMER CHECKOUT
// ============================================================

app.post("/api/customer/checkout", authenticateToken, async (req, res) => {
    let connection;

    try {
        const customerId = Number(req.user.id);

        if (!customerId) {
            return res.status(401).json({
                success: false,
                message: "Invalid customer authentication"
            });
        }

        connection = await db.getConnection();

        await connection.beginTransaction();

        // --------------------------------------------------------
        // GET CUSTOMER CART
        // --------------------------------------------------------

        const [cartItems] = await connection.query(
            `
            SELECT
                c.id AS cart_id,
                c.product_id,
                c.quantity,
                p.name,
                p.price,
                p.stock,
                p.is_active
            FROM cart_items c
            INNER JOIN products p
                ON p.id = c.product_id
            WHERE c.customer_id = ?
            FOR UPDATE
            `,
            [customerId]
        );

        if (!cartItems || cartItems.length === 0) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Your cart is empty"
            });
        }

        // --------------------------------------------------------
        // CHECK STOCK + CALCULATE TOTAL
        // --------------------------------------------------------

        let totalAmount = 0;

        for (const item of cartItems) {

            const quantity = Number(item.quantity);
            const stock = Number(item.stock);
            const price = Number(item.price);

            if (item.is_active === 0) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `${item.name} is no longer available`
                });
            }

            if (quantity <= 0) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Invalid quantity for ${item.name}`
                });
            }

            if (quantity > stock) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `${item.name}: only ${stock} item(s) available, ` +
                        `but your cart contains ${quantity}`
                });
            }

            totalAmount += quantity * price;
        }

        // --------------------------------------------------------
        // CREATE UNIQUE ORDER NUMBER
        // --------------------------------------------------------

        const orderNumber =
            `ORD-${Date.now()}-${customerId}`;

        // --------------------------------------------------------
        // CREATE ORDER
        // --------------------------------------------------------

        const [orderResult] = await connection.query(
            `
            INSERT INTO orders
            (
                order_number,
                customer_id,
                total_amount,
                status,
                payment_status
            )
            VALUES (?, ?, ?, 'pending', 'unpaid')
            `,
            [
                orderNumber,
                customerId,
                totalAmount.toFixed(2)
            ]
        );

        const orderId = orderResult.insertId;

        // --------------------------------------------------------
        // CREATE ORDER ITEMS
        // AND DECREASE PRODUCT STOCK
        // --------------------------------------------------------

        for (const item of cartItems) {

            const quantity = Number(item.quantity);
            const price = Number(item.price);

            // Create order item
            await connection.query(
                `
                INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    quantity,
                    unit_price
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    item.product_id,
                    quantity,
                    price
                ]
            );

            // Decrease stock
            const [stockResult] = await connection.query(
                `
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
                  AND stock >= ?
                `,
                [
                    quantity,
                    item.product_id,
                    quantity
                ]
            );

            if (stockResult.affectedRows !== 1) {

                throw new Error(
                    `Insufficient stock for product ${item.product_id}`
                );
            }
        }

        // --------------------------------------------------------
        // CLEAR CUSTOMER CART
        // --------------------------------------------------------

        await connection.query(
            `
            DELETE FROM cart_items
            WHERE customer_id = ?
            `,
            [customerId]
        );

        // --------------------------------------------------------
        // COMMIT
        // --------------------------------------------------------

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: {
                id: orderId,
                order_number: orderNumber,
                total_amount: Number(totalAmount.toFixed(2)),
                status: "pending",
                payment_status: "unpaid"
            }
        });

    } catch (error) {

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error(
            "CHECKOUT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Checkout failed",
            error: error.message
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
});

// =====================================================
// MEMBER DASHBOARD
// GET /api/member/dashboard
// =====================================================

app.get(
    "/api/member/dashboard",
    authenticateToken,
    async (req, res) => {

        try {

            console.log("");
            console.log("==========================================");
            console.log("MEMBER DASHBOARD REQUEST");
            console.log("Authenticated user:", req.user);
            console.log("==========================================");

            const userId = req.user.id;

            console.log("1. USER ID:", userId);

            // =================================================
            // 1. MEMBER
            // =================================================

            const [memberRows] = await db.execute(
                `
                SELECT
                    m.id AS member_id,
                    m.user_id,
                    m.membership_number,
                    m.join_date,
                    m.status,
                    u.full_name,
                    u.username,
                    u.email,
                    u.phone,
                    u.address
                FROM members m
                INNER JOIN users u
                    ON m.user_id = u.id
                WHERE m.user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            console.log(
                "2. MEMBER QUERY COMPLETE"
            );

            if (memberRows.length === 0) {

                console.log(
                    "MEMBER NOT FOUND"
                );

                return res.status(404).json({
                    success: false,
                    message: "Member record not found",
                    user_id: userId
                });
            }

            const member = memberRows[0];

            console.log(
                "3. MEMBER FOUND:",
                member
            );

            const memberId = member.member_id;

            // =================================================
            // 2. SAVINGS
            // =================================================

            const [savingsRows] = await db.execute(
                `
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'deposit'
                                    THEN amount

                                WHEN type = 'withdrawal'
                                    THEN -amount

                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_savings
                FROM savings
                WHERE member_id = ?
                `,
                [memberId]
            );

            const savings = Number(
                savingsRows[0]?.total_savings || 0
            );

            console.log(
                "4. SAVINGS:",
                savings
            );

            // =================================================
            // 3. SHARES
            // =================================================

            const [sharesRows] = await db.execute(
                `
                SELECT
                    COALESCE(
                        SUM(share_count),
                        0
                    ) AS total_shares
                FROM shares
                WHERE member_id = ?
                `,
                [memberId]
            );

            const shares = Number(
                sharesRows[0]?.total_shares || 0
            );

            console.log(
                "5. SHARES:",
                shares
            );

          // ============================================================
// 4. LOANS
// ============================================================

// Get total loan amount for this member
const [loanRows] = await db.execute(
    `
    SELECT
        COALESCE(SUM(amount), 0) AS total_loan_amount
    FROM loans
    WHERE member_id = ?
    `,
    [memberId]
);

const totalLoanAmount = Number(
    loanRows[0]?.total_loan_amount || 0
);

console.log(
    "6. TOTAL LOAN AMOUNT:",
    totalLoanAmount
);

            
            // =================================================
            // 5. TRANSACTIONS
            // =================================================

            const [transactionRows] = await db.execute(
                `
                SELECT
                    id,
                    transaction_type,
                    amount,
                    description,
                    transaction_date,
                    reference_number
                FROM transactions
                WHERE user_id = ?
                ORDER BY transaction_date DESC
                LIMIT 10
                `,
                [userId]
            );

            console.log(
                "7. TRANSACTIONS:",
                transactionRows.length
            );

            // =================================================
            // 6. FORMAT TRANSACTIONS
            // =================================================

            const transactions = transactionRows.map(
                transaction => ({

                    id: transaction.id,

                    type:
                        transaction.transaction_type ===
                        "withdrawal"
                            ? "debit"
                            : "credit",

                    transaction_type:
                        transaction.transaction_type,

                    date:
                        transaction.transaction_date,

                    amount:
                        Number(transaction.amount || 0),

                    status:
                        "completed",

                    description:
                        transaction.description,

                    reference_number:
                        transaction.reference_number
                })
            );

            // =================================================
            // 7. RESPONSE
            // =================================================

            const response = {

                success: true,

                savings:
                    Number(savings.toFixed(2)),

                shares,

                totalLoanAmount,

                transactions,

                member: {

                    id:
                        member.member_id,

                    user_id:
                        member.user_id,

                    membership_number:
                        member.membership_number,

                    join_date:
                        member.join_date,

                    status:
                        member.status,

                    full_name:
                        member.full_name,

                    username:
                        member.username,

                    email:
                        member.email,

                    phone:
                        member.phone,

                    address:
                        member.address
                }
            };

            console.log("");
            console.log("==========================================");
            console.log("MEMBER DASHBOARD SUCCESS");
            console.log("==========================================");

            return res.status(200).json(response);

        } catch (error) {

            console.error("");
            console.error("==========================================");
            console.error("MEMBER DASHBOARD ERROR");
            console.error("==========================================");
            console.error(error);
            console.error("==========================================");

            return res.status(500).json({
                success: false,
                message: "Failed to load member dashboard",
                error: error.message
            });
        }
    }
);

// ============================================================
// ADMIN - GET MEMBER FINANCIAL INFORMATION
// GET /api/admin/members/:memberId/financial
// ============================================================

app.get(
    "/api/admin/members/:memberId/financial",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId = Number(req.params.memberId);

            if (!memberId || Number.isNaN(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            // ----------------------------------------------------
            // MEMBER
            // ----------------------------------------------------

            const [memberRows] = await db.execute(
                `
                SELECT
                    m.id AS member_id,
                    m.user_id,
                    m.membership_number,
                    m.join_date,
                    m.status,
                    u.username,
                    u.email,
                    u.full_name,
                    u.phone,
                    u.address
                FROM members m
                INNER JOIN users u
                    ON m.user_id = u.id
                WHERE m.id = ?
                LIMIT 1
                `,
                [memberId]
            );

            if (memberRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            const member = memberRows[0];

            // ----------------------------------------------------
            // SAVINGS
            // ----------------------------------------------------

            const [savingsRows] = await db.execute(
                `
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'deposit'
                                    THEN amount

                                WHEN type = 'withdrawal'
                                    THEN -amount

                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_savings
                FROM savings
                WHERE member_id = ?
                `,
                [memberId]
            );

            const savings =
                Number(
                    savingsRows[0]?.total_savings || 0
                );

            // ----------------------------------------------------
            // SHARES
            // ----------------------------------------------------

            const [sharesRows] = await db.execute(
                `
                SELECT
                    COALESCE(
                        SUM(share_count),
                        0
                    ) AS total_shares
                FROM shares
                WHERE member_id = ?
                `,
                [memberId]
            );

            const shares =
                Number(
                    sharesRows[0]?.total_shares || 0
                );
// ============================================================
// LOANS - SELECTED MEMBER ONLY
// ============================================================

const [loanRows] = await db.execute(
    `
    SELECT
        COALESCE(SUM(amount), 0) AS total_loan_amount
    FROM loans
    WHERE member_id = ?
    `,
    [memberId]
);

const totalLoanAmount = Number(
    loanRows[0]?.total_loan_amount || 0
);

console.log(
    `MEMBER ${memberId} TOTAL LOAN AMOUNT:`,
    totalLoanAmount
);

            // ----------------------------------------------------
            // TRANSACTIONS
            // ----------------------------------------------------

            const [transactionRows] =
                await db.execute(
                    `
                    SELECT
                        id,
                        transaction_type,
                        amount,
                        description,
                        transaction_date,
                        reference_number
                    FROM transactions
                    WHERE user_id = ?
                    ORDER BY transaction_date DESC
                    LIMIT 20
                    `,
                    [member.user_id]
                );

            return res.json({

                success: true,

                member,

                financial: {
                    savings:
                        Number(
                            savings.toFixed(2)
                        ),

                    shares,

                    totalLoanAmount,

                    transactionCount:
                        transactionRows.length
                },

                transactions:
                    transactionRows

            });

        } catch (error) {

            console.error(
                "ADMIN GET MEMBER FINANCIAL ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load member financial information",

                error:
                    error.message

            });
        }
    }
);

// ============================================================
// ADMIN - ADD MEMBER SAVINGS
// POST /api/admin/members/:memberId/savings
// ============================================================

app.post(
    "/api/admin/members/:memberId/savings",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection;

        try {

            const memberId = Number(req.params.memberId);

            const {
                amount,
                type,
                description
            } = req.body || {};

            // ----------------------------------------------------
            // VALIDATE MEMBER ID
            // ----------------------------------------------------

            if (!memberId || Number.isNaN(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            // ----------------------------------------------------
            // VALIDATE AMOUNT
            // ----------------------------------------------------

            const savingsAmount = Number(amount);

            if (
                !Number.isFinite(savingsAmount) ||
                savingsAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be greater than zero"
                });
            }

            // ----------------------------------------------------
            // VALIDATE TYPE
            // ----------------------------------------------------

            if (
                type !== "deposit" &&
                type !== "withdrawal"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Type must be deposit or withdrawal"
                });
            }

            // ----------------------------------------------------
            // CHECK MEMBER
            // ----------------------------------------------------

            const [memberRows] = await db.execute(
                `
                SELECT
                    m.id AS member_id,
                    m.user_id,
                    m.membership_number,
                    u.full_name,
                    u.username
                FROM members m
                INNER JOIN users u
                    ON m.user_id = u.id
                WHERE m.id = ?
                LIMIT 1
                `,
                [memberId]
            );

            if (memberRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            const member = memberRows[0];

            // ----------------------------------------------------
            // CHECK CURRENT SAVINGS BALANCE
            // ----------------------------------------------------

            const [balanceRows] = await db.execute(
                `
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'deposit'
                                    THEN amount

                                WHEN type = 'withdrawal'
                                    THEN -amount

                                ELSE 0
                            END
                        ),
                        0
                    ) AS balance
                FROM savings
                WHERE member_id = ?
                `,
                [memberId]
            );

            const currentBalance =
                Number(
                    balanceRows[0]?.balance || 0
                );

            // ----------------------------------------------------
            // PREVENT OVER-WITHDRAWAL
            // ----------------------------------------------------

            if (type === "withdrawal") {

                if (savingsAmount > currentBalance) {

                    return res.status(400).json({
                        success: false,
                        message:
                            `Insufficient savings balance. Current balance: ${currentBalance.toFixed(2)}`
                    });

                }
            }

            // ----------------------------------------------------
            // START TRANSACTION
            // ----------------------------------------------------

            connection = await db.getConnection();

            await connection.beginTransaction();

            // ----------------------------------------------------
            // INSERT SAVINGS
            // ----------------------------------------------------

            const [savingsResult] =
                await connection.execute(
                    `
                    INSERT INTO savings
                    (
                        member_id,
                        amount,
                        type
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        memberId,
                        savingsAmount,
                        type
                    ]
                );

            // ----------------------------------------------------
            // IMPORTANT:
            //
            // transactions.transaction_type is:
            //
            // savings
            // loan_payment
            // share_purchase
            // dividend
            // withdrawal
            //
            // Therefore:
            //
            // deposit    -> savings
            // withdrawal -> withdrawal
            // ----------------------------------------------------

            const transactionType =
                type === "deposit"
                    ? "savings"
                    : "withdrawal";

            // ----------------------------------------------------
            // CREATE TRANSACTION
            // ----------------------------------------------------

            const reference =
                `SAV-${Date.now()}-${savingsResult.insertId}`;

            await connection.execute(
                `
                INSERT INTO transactions
                (
                    user_id,
                    transaction_type,
                    amount,
                    description,
                    transaction_date,
                    reference_number
                )
                VALUES (?, ?, ?, ?, NOW(), ?)
                `,
                [
                    member.user_id,
                    transactionType,
                    savingsAmount,
                    description ||
                        (
                            type === "deposit"
                                ? "Member savings deposit"
                                : "Member savings withdrawal"
                        ),
                    reference
                ]
            );

            // ----------------------------------------------------
            // GET NEW BALANCE
            // ----------------------------------------------------

            const [newBalanceRows] =
                await connection.execute(
                    `
                    SELECT
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN type = 'deposit'
                                        THEN amount

                                    WHEN type = 'withdrawal'
                                        THEN -amount

                                    ELSE 0
                                END
                            ),
                            0
                        ) AS balance
                    FROM savings
                    WHERE member_id = ?
                    `,
                    [memberId]
                );

            const newBalance =
                Number(
                    newBalanceRows[0]?.balance || 0
                );

            // ----------------------------------------------------
            // COMMIT
            // ----------------------------------------------------

            await connection.commit();

            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    type === "deposit"
                        ? "Savings added successfully"
                        : "Savings withdrawal recorded successfully",

                savingsId:
                    savingsResult.insertId,

                memberId,

                transactionType,

                amount:
                    Number(
                        savingsAmount.toFixed(2)
                    ),

                previousBalance:
                    Number(
                        currentBalance.toFixed(2)
                    ),

                newBalance:
                    Number(
                        newBalance.toFixed(2)
                    ),

                reference

            });

        } catch (error) {

            // ----------------------------------------------------
            // ROLLBACK
            // ----------------------------------------------------

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );

                }
            }

            console.error(
                "ADMIN ADD SAVINGS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to add member savings",

                error:
                    error.message

            });

        } finally {

            // ----------------------------------------------------
            // RELEASE CONNECTION
            // ----------------------------------------------------

            if (connection) {
                connection.release();
            }

        }
    }
);
// ============================================================
// ADMIN - ADD MEMBER SHARES
// POST /api/admin/members/:memberId/shares
// ============================================================

app.post(
    "/api/admin/members/:memberId/shares",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId =
                Number(req.params.memberId);

            const {
                share_count,
                description
            } = req.body || {};

            // ----------------------------------------------------
            // VALIDATION
            // ----------------------------------------------------

            if (
                !memberId ||
                Number.isNaN(memberId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            const shareCount =
                Number(share_count);

            if (
                !Number.isInteger(shareCount) ||
                shareCount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Share count must be a positive whole number"
                });
            }

            // ----------------------------------------------------
            // CHECK MEMBER
            // ----------------------------------------------------

            const [memberRows] =
                await db.execute(
                    `
                    SELECT
                        id,
                        user_id
                    FROM members
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [memberId]
                );

            if (memberRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            // ----------------------------------------------------
            // INSERT SHARES
            // ----------------------------------------------------

            const [result] =
                await db.execute(
                    `
                    INSERT INTO shares
                    (
                        member_id,
                        share_count
                    )
                    VALUES (?, ?)
                    `,
                    [
                        memberId,
                        shareCount
                    ]
                );

            // ----------------------------------------------------
            // TRANSACTION RECORD
            // ----------------------------------------------------

            const reference =
                `SHR-${Date.now()}-${result.insertId}`;

            await db.execute(
                `
                INSERT INTO transactions
                (
                    user_id,
                    transaction_type,
                    amount,
                    description,
                    transaction_date,
                    reference_number
                )
                VALUES (
                    ?,
                    'share_purchase',
                    ?,
                    ?,
                    NOW(),
                    ?
                )
                `,
                [
                    memberRows[0].user_id,

                    shareCount,

                    description ||
                        `Added ${shareCount} cooperative share(s)`,

                    reference
                ]
            );

            return res.status(201).json({

                success: true,

                message:
                    "Member shares added successfully",

                sharesId:
                    result.insertId,

                reference

            });

        } catch (error) {

            console.error(
                "ADMIN ADD SHARES ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to add member shares",

                error:
                    error.message

            });
        }
    }
);


// ============================================================
// ADMIN - ADD MEMBER LOAN
// POST /api/admin/members/:memberId/loans
// ============================================================

app.post(
    "/api/admin/members/:memberId/loans",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection = null;

        try {

            // ====================================================
            // MEMBER ID
            // ====================================================

            const memberId = Number(req.params.memberId);

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            // ====================================================
            // REQUEST DATA
            // ====================================================

            const {
                amount,
                interest_rate,
                term_months,
                status,
                due_date
            } = req.body || {};

            // ====================================================
            // VALIDATE LOAN AMOUNT
            // ====================================================

            const loanAmount = Number(amount);

            if (
                !Number.isFinite(loanAmount) ||
                loanAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Loan amount must be greater than zero"
                });
            }

            // ====================================================
            // VALIDATE INTEREST RATE
            // ====================================================

            let interestRate = 0;

            if (
                interest_rate !== undefined &&
                interest_rate !== null &&
                interest_rate !== ""
            ) {
                interestRate = Number(interest_rate);
            }

            if (
                !Number.isFinite(interestRate) ||
                interestRate < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid interest rate"
                });
            }

            // ====================================================
            // VALIDATE LOAN TERM
            // ====================================================

            const termMonths = Number(term_months);

            if (
                !Number.isInteger(termMonths) ||
                termMonths <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Loan term must be greater than zero"
                });
            }

            // ====================================================
            // VALIDATE STATUS
            // ====================================================

            const allowedStatuses = [
                "pending",
                "approved",
                "active",
                "completed",
                "defaulted"
            ];

            // New loans are ACTIVE by default.
            const loanStatus = status || "active";

            if (
                !allowedStatuses.includes(loanStatus)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid loan status"
                });
            }

            // ====================================================
            // CHECK MEMBER
            // ====================================================

            const [memberRows] =
                await db.execute(
                    `
                    SELECT
                        m.id,
                        m.user_id,
                        m.membership_number,
                        u.full_name,
                        u.email,
                        u.phone
                    FROM members m
                    INNER JOIN users u
                        ON m.user_id = u.id
                    WHERE m.id = ?
                    LIMIT 1
                    `,
                    [memberId]
                );

            if (
                !memberRows ||
                memberRows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            const member = memberRows[0];

            // ====================================================
            // CALCULATE DUE DATE
            // ====================================================

            let calculatedDueDate = due_date || null;

            if (!calculatedDueDate) {

                const date = new Date();

                date.setMonth(
                    date.getMonth() + termMonths
                );

                calculatedDueDate =
                    date
                        .toISOString()
                        .split("T")[0];
            }

            // ====================================================
            // INITIAL REMAINING BALANCE
            // ====================================================

            const remainingBalance = loanAmount;

            // ====================================================
            // APPROVAL DATE
            // ====================================================

            let approvalDate = null;

            if (
                loanStatus === "approved" ||
                loanStatus === "active"
            ) {
                approvalDate =
                    new Date()
                        .toISOString()
                        .split("T")[0];
            }

            // ====================================================
            // START DATABASE TRANSACTION
            // ====================================================

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            // ====================================================
            // INSERT LOAN
            // ====================================================

            const [loanResult] =
                await connection.execute(
                    `
                    INSERT INTO loans
                    (
                        member_id,
                        amount,
                        interest_rate,
                        term_months,
                        status,
                        approval_date,
                        due_date,
                        remaining_balance
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        memberId,
                        loanAmount,
                        interestRate,
                        termMonths,
                        loanStatus,
                        approvalDate,
                        calculatedDueDate,
                        remainingBalance
                    ]
                );

            const loanId =
                loanResult.insertId;

            // ====================================================
            // CREATE TRANSACTION RECORD
            // ====================================================

            const reference =
                `LOAN-${Date.now()}-${loanId}`;

            try {

                await connection.execute(
                    `
                    INSERT INTO transactions
                    (
                        user_id,
                        transaction_type,
                        amount,
                        description,
                        transaction_date,
                        reference_number
                    )
                    VALUES (?, ?, ?, ?, NOW(), ?)
                    `,
                    [
                        member.user_id,
                        "loan",
                        loanAmount,
                        `Loan created for ${member.full_name}`,
                        reference
                    ]
                );

            } catch (transactionError) {

                console.warn(
                    "Loan created but transaction record was not created:",
                    transactionError.message
                );

                // Loan itself is still valid.
            }

            // ====================================================
            // COMMIT
            // ====================================================

            await connection.commit();

            // ====================================================
            // RESPONSE
            // ====================================================

            return res.status(201).json({

                success: true,

                message:
                    "Member loan added successfully",

                loanId,

                reference,

                loan: {

                    id: loanId,

                    member_id:
                        memberId,

                    amount:
                        loanAmount,

                    interest_rate:
                        interestRate,

                    term_months:
                        termMonths,

                    status:
                        loanStatus,

                    approval_date:
                        approvalDate,

                    due_date:
                        calculatedDueDate,

                    remaining_balance:
                        remainingBalance
                }

            });

        } catch (error) {

            // ====================================================
            // ROLLBACK
            // ====================================================

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "LOAN ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }

            console.error(
                "ADMIN ADD MEMBER LOAN ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to add member loan",

                error:
                    error.message

            });

        } finally {

            // ====================================================
            // RELEASE CONNECTION
            // ====================================================

            if (connection) {
                connection.release();
            }

        }
    }
);

// ============================================================
// ADMIN - ADD MEMBER TRANSACTION
// POST /api/admin/members/:memberId/transactions
// ============================================================

app.post(
    "/api/admin/members/:memberId/transactions",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId =
                Number(req.params.memberId);

            const {
                transaction_type,
                amount,
                description,
                reference_number
            } = req.body || {};

            // ----------------------------------------------------
            // VALIDATION
            // ----------------------------------------------------

            if (
                !memberId ||
                Number.isNaN(memberId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            if (
                !transaction_type ||
                !String(transaction_type).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Transaction type is required"
                });
            }

            const transactionAmount =
                Number(amount);

            if (
                !Number.isFinite(transactionAmount) ||
                transactionAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Amount must be greater than zero"
                });
            }

            // ----------------------------------------------------
            // CHECK MEMBER
            // ----------------------------------------------------

            const [memberRows] =
                await db.execute(
                    `
                    SELECT
                        id,
                        user_id
                    FROM members
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [memberId]
                );

            if (memberRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            // ----------------------------------------------------
            // REFERENCE
            // ----------------------------------------------------

            const reference =
                reference_number &&
                String(reference_number).trim()
                    ? String(reference_number).trim()
                    : `TXN-${Date.now()}`;

            // ----------------------------------------------------
            // INSERT TRANSACTION
            // ----------------------------------------------------

            const [result] =
                await db.execute(
                    `
                    INSERT INTO transactions
                    (
                        user_id,
                        transaction_type,
                        amount,
                        description,
                        transaction_date,
                        reference_number
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        NOW(),
                        ?
                    )
                    `,
                    [
                        memberRows[0].user_id,

                        String(
                            transaction_type
                        ).trim(),

                        transactionAmount,

                        description
                            ? String(description).trim()
                            : null,

                        reference
                    ]
                );

            return res.status(201).json({

                success: true,

                message:
                    "Member transaction added successfully",

                transactionId:
                    result.insertId,

                reference

            });

        } catch (error) {

            console.error(
                "ADMIN ADD TRANSACTION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to add member transaction",

                error:
                    error.message

            });
        }
    }
);

// ============================================================
// CUSTOMER PAYMENT SYSTEM
// ============================================================
//
// IMPORTANT:
// Replace ALL old customer payment routes with this section.
//
// Existing tables:
//
// orders:
//   id
//   order_number
//   customer_id
//   total_amount
//   status
//   payment_status
//   order_date
//
// payments:
//   id
//   user_id
//   order_id
//   amount
//   payment_method
//   transaction_id
//   status
//   payment_date
//
// ============================================================


// ============================================================
// ALLOWED PAYMENT METHODS
// ============================================================

const ALLOWED_PAYMENT_METHODS = [
    "credit_card",
    "debit_card",
    "bank_transfer",
    "cash",
    "mobile_money"
];


// ============================================================
// HELPER - GET USER ID FROM TOKEN
// ============================================================

function getAuthenticatedUserId(req) {

    const userId = Number(
        req.user?.id ||
        req.user?.user_id
    );

    if (
        !Number.isInteger(userId) ||
        userId <= 0
    ) {
        return null;
    }

    return userId;
}


// ============================================================
// 1. GET PAYMENT INFORMATION FOR ONE ORDER
//
// GET
// /api/customer/orders/:orderId/payment
//
// Used when customer opens the payment page.
// ============================================================

app.get(
    "/api/customer/orders/:orderId/payment",
    authenticateToken,
    async (req, res) => {

        try {

            // ----------------------------------------------------
            // GET USER
            // ----------------------------------------------------

            const customerId =
                getAuthenticatedUserId(req);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid customer authentication"
                });

            }


            // ----------------------------------------------------
            // GET ORDER ID
            // ----------------------------------------------------

            const orderId =
                Number(req.params.orderId);

            if (
                !Number.isInteger(orderId) ||
                orderId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid order ID"
                });

            }


            console.log(
                "CUSTOMER PAYMENT INFORMATION:",
                {
                    customerId,
                    orderId
                }
            );


            // ----------------------------------------------------
            // FIND CUSTOMER ORDER
            // ----------------------------------------------------

            const [orders] =
                await db.execute(
                    `
                    SELECT
                        id,
                        order_number,
                        customer_id,
                        total_amount,
                        status,
                        payment_status,
                        order_date
                    FROM orders
                    WHERE id = ?
                    AND customer_id = ?
                    LIMIT 1
                    `,
                    [
                        orderId,
                        customerId
                    ]
                );


            if (orders.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found or does not belong to you"
                });

            }


            const order =
                orders[0];


            // ----------------------------------------------------
            // GET PAYMENTS FOR THIS ORDER
            // ----------------------------------------------------

            const [payments] =
                await db.execute(
                    `
                    SELECT
                        id,
                        user_id,
                        order_id,
                        amount,
                        payment_method,
                        transaction_id,
                        status,
                        payment_date
                    FROM payments
                    WHERE order_id = ?
                    AND user_id = ?
                    ORDER BY id DESC
                    `,
                    [
                        orderId,
                        customerId
                    ]
                );


            // ----------------------------------------------------
            // CALCULATE PAID AMOUNT
            // ----------------------------------------------------

            let paidAmount = 0;

            payments.forEach(payment => {

                if (
                    payment.status === "completed"
                ) {

                    paidAmount += Number(
                        payment.amount || 0
                    );

                }

            });


            // ----------------------------------------------------
            // TOTAL ORDER AMOUNT
            // ----------------------------------------------------

            const totalAmount =
                Number(
                    order.total_amount || 0
                );


            // ----------------------------------------------------
            // REMAINING AMOUNT
            // ----------------------------------------------------

            const remainingAmount =
                Math.max(
                    totalAmount - paidAmount,
                    0
                );


            // ----------------------------------------------------
            // RETURN RESPONSE
            // ----------------------------------------------------

            return res.json({

                success: true,

                order: {

                    id:
                        order.id,

                    order_number:
                        order.order_number,

                    customer_id:
                        order.customer_id,

                    total_amount:
                        Number(
                            totalAmount.toFixed(2)
                        ),

                    paid_amount:
                        Number(
                            paidAmount.toFixed(2)
                        ),

                    remaining_amount:
                        Number(
                            remainingAmount.toFixed(2)
                        ),

                    status:
                        order.status,

                    payment_status:
                        order.payment_status,

                    order_date:
                        order.order_date

                },

                payments:

                    payments.map(payment => ({

                        id:
                            payment.id,

                        user_id:
                            payment.user_id,

                        order_id:
                            payment.order_id,

                        amount:
                            Number(
                                payment.amount || 0
                            ),

                        payment_method:
                            payment.payment_method,

                        transaction_id:
                            payment.transaction_id,

                        status:
                            payment.status,

                        payment_date:
                            payment.payment_date

                    }))

            });

        } catch (error) {

            console.error(
                "GET CUSTOMER PAYMENT INFORMATION ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load payment information",

                error:
                    error.message

            });

        }

    }
);

// ============================================================
// CUSTOMER PAYMENT SYSTEM
// ============================================================
//
// POST /api/customer/orders/:orderId/payment
// GET  /api/customer/payments
// GET  /api/customer/payments/:paymentId
//
// PAYMENT FLOW:
//
// Customer submits payment
//        ↓
// payments.status = pending
//        ↓
// Admin reviews payment
//        ↓
// Admin approves
//        ↓
// payments.status = completed
//        ↓
// orders.payment_status = paid
//
// ============================================================


// ============================================================
// 1. MAKE PAYMENT FOR AN ORDER
//
// POST
// /api/customer/orders/:orderId/payment
// ============================================================

app.post(
    "/api/customer/orders/:orderId/payment",
    authenticateToken,
    async (req, res) => {

        let connection = null;

        try {

            // ------------------------------------------------
            // GET CUSTOMER ID
            // ------------------------------------------------

            const customerId =
                getAuthenticatedUserId(req);


            if (!customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid customer authentication"

                });

            }


            // ------------------------------------------------
            // GET ORDER ID
            // ------------------------------------------------

            const orderId =
                Number(
                    req.params.orderId
                );


            if (
                !Number.isInteger(orderId) ||
                orderId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID"

                });

            }


            // ------------------------------------------------
            // REQUEST BODY
            // ------------------------------------------------

            const {
                payment_method,
                transaction_id,
                amount
            } = req.body || {};


            console.log(
                "=========================================="
            );

            console.log(
                "CUSTOMER PAYMENT REQUEST"
            );

            console.log(
                "Customer ID:",
                customerId
            );

            console.log(
                "Order ID:",
                orderId
            );

            console.log(
                "Payment Method:",
                payment_method
            );

            console.log(
                "Transaction ID:",
                transaction_id
            );

            console.log(
                "Amount:",
                amount
            );

            console.log(
                "=========================================="
            );


            // ------------------------------------------------
            // VALIDATE PAYMENT METHOD
            // ------------------------------------------------

            if (
                !payment_method ||
                !ALLOWED_PAYMENT_METHODS.includes(
                    payment_method
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment method"

                });

            }


            // ------------------------------------------------
            // TRANSACTION ID
            // ------------------------------------------------

            const transactionReference =
                transaction_id
                    ? String(
                        transaction_id
                    ).trim()
                    : "";


            if (
                transactionReference.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Transaction / Reference ID is required"

                });

            }


            // ------------------------------------------------
            // DATABASE CONNECTION
            // ------------------------------------------------

            connection =
                await db.getConnection();


            await connection.beginTransaction();


            // ------------------------------------------------
            // GET AND LOCK ORDER
            // ------------------------------------------------

            const [orders] =
                await connection.execute(
                    `
                    SELECT

                        id,

                        order_number,

                        customer_id,

                        total_amount,

                        status,

                        payment_status,

                        order_date

                    FROM orders

                    WHERE id = ?

                    AND customer_id = ?

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        orderId,
                        customerId
                    ]
                );


            // ------------------------------------------------
            // ORDER NOT FOUND
            // ------------------------------------------------

            if (
                orders.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found or does not belong to you"

                });

            }


            const order =
                orders[0];


            // ------------------------------------------------
            // ALREADY PAID
            // ------------------------------------------------

            if (
                order.payment_status === "paid"
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "This order has already been paid"

                });

            }


            // ------------------------------------------------
            // ORDER AMOUNT
            // ------------------------------------------------

            const orderAmount =
                Number(
                    order.total_amount || 0
                );


            if (
                !Number.isFinite(orderAmount) ||
                orderAmount <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order amount"

                });

            }


            // ------------------------------------------------
            // GET COMPLETED PAYMENTS
            //
            // IMPORTANT:
            //
            // Only completed payments count toward the
            // actual paid amount.
            //
            // Pending payments DO NOT count yet.
            // ------------------------------------------------

            const [completedTotals] =
                await connection.execute(
                    `
                    SELECT

                        COALESCE(
                            SUM(amount),
                            0
                        ) AS paid_amount

                    FROM payments

                    WHERE order_id = ?

                    AND user_id = ?

                    AND status = 'completed'
                    `,
                    [
                        orderId,
                        customerId
                    ]
                );


            const paidAmount =
                Number(
                    completedTotals[0]
                        ?.paid_amount || 0
                );


            // ------------------------------------------------
            // REMAINING AMOUNT
            // ------------------------------------------------

            const remainingAmount =
                Math.max(
                    orderAmount -
                    paidAmount,
                    0
                );


            if (
                remainingAmount <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "This order has already been fully paid"

                });

            }


            // ------------------------------------------------
            // CHECK EXISTING PENDING PAYMENT
            //
            // Prevent the same order from having multiple
            // pending payment submissions at the same time.
            // ------------------------------------------------

            const [pendingPayments] =
                await connection.execute(
                    `
                    SELECT

                        id,

                        amount,

                        transaction_id,

                        status

                    FROM payments

                    WHERE order_id = ?

                    AND user_id = ?

                    AND status = 'pending'

                    ORDER BY id DESC

                    LIMIT 1
                    `,
                    [
                        orderId,
                        customerId
                    ]
                );


            if (
                pendingPayments.length > 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "This order already has a payment waiting for admin approval",

                    payment: {

                        id:
                            pendingPayments[0].id,

                        amount:
                            Number(
                                pendingPayments[0].amount || 0
                            ),

                        transaction_id:
                            pendingPayments[0].transaction_id,

                        status:
                            "pending"

                    }

                });

            }


            // ------------------------------------------------
            // PAYMENT AMOUNT
            // ------------------------------------------------

            let paymentAmount;


            if (
                amount !== undefined &&
                amount !== null &&
                amount !== ""
            ) {

                paymentAmount =
                    Number(amount);

            } else {

                paymentAmount =
                    remainingAmount;

            }


            // ------------------------------------------------
            // VALIDATE AMOUNT
            // ------------------------------------------------

            if (
                !Number.isFinite(
                    paymentAmount
                ) ||
                paymentAmount <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment amount"

                });

            }


            // ------------------------------------------------
            // PREVENT OVERPAYMENT
            // ------------------------------------------------

            if (
                paymentAmount >
                remainingAmount
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `Payment amount cannot exceed the remaining balance of ${remainingAmount.toFixed(2)} ETB`

                });

            }


            // ------------------------------------------------
            // CHECK DUPLICATE TRANSACTION ID
            // ------------------------------------------------

            const [duplicateTransactions] =
                await connection.execute(
                    `
                    SELECT

                        id,

                        user_id,

                        order_id,

                        transaction_id,

                        status

                    FROM payments

                    WHERE transaction_id = ?

                    LIMIT 1
                    `,
                    [
                        transactionReference
                    ]
                );


            if (
                duplicateTransactions.length > 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction/reference ID has already been used"

                });

            }


            // ------------------------------------------------
            // INSERT PAYMENT
            //
            // VERY IMPORTANT:
            //
            // Customer payment = PENDING
            //
            // NOT completed.
            // ------------------------------------------------

            const [paymentResult] =
                await connection.execute(
                    `
                    INSERT INTO payments
                    (
                        user_id,
                        order_id,
                        amount,
                        payment_method,
                        transaction_id,
                        status,
                        payment_date
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'pending',
                        NOW()
                    )
                    `,
                    [
                        customerId,
                        orderId,
                        paymentAmount,
                        payment_method,
                        transactionReference
                    ]
                );


            // ------------------------------------------------
            // IMPORTANT:
            //
            // DO NOT SET:
            //
            // orders.payment_status = 'paid'
            //
            // The payment is still waiting for admin approval.
            //
            // Keep the order unpaid until approval.
            // ------------------------------------------------

            await connection.execute(
                `
                UPDATE orders

                SET payment_status = 'unpaid'

                WHERE id = ?

                AND customer_id = ?

                AND payment_status != 'paid'
                `,
                [
                    orderId,
                    customerId
                ]
            );


            // ------------------------------------------------
            // COMMIT
            // ------------------------------------------------

            await connection.commit();


            console.log(
                "=========================================="
            );

            console.log(
                "CUSTOMER PAYMENT SUBMITTED"
            );

            console.log(
                "Payment ID:",
                paymentResult.insertId
            );

            console.log(
                "Order ID:",
                orderId
            );

            console.log(
                "Amount:",
                paymentAmount
            );

            console.log(
                "Status: pending"
            );

            console.log(
                "=========================================="
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "Payment submitted successfully and is waiting for admin approval",

                payment: {

                    id:
                        paymentResult.insertId,

                    user_id:
                        customerId,

                    order_id:
                        orderId,

                    order_number:
                        order.order_number,

                    amount:
                        Number(
                            paymentAmount.toFixed(2)
                        ),

                    payment_method:
                        payment_method,

                    transaction_id:
                        transactionReference,

                    status:
                        "pending",

                    payment_date:
                        new Date()

                },

                order: {

                    id:
                        orderId,

                    order_number:
                        order.order_number,

                    total_amount:
                        Number(
                            orderAmount.toFixed(2)
                        ),

                    paid_amount:
                        Number(
                            paidAmount.toFixed(2)
                        ),

                    remaining_amount:
                        Number(
                            remainingAmount.toFixed(2)
                        ),

                    payment_status:
                        "unpaid"

                }

            });

        } catch (error) {

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "PAYMENT ROLLBACK ERROR:",
                        rollbackError
                    );

                }

            }


            console.error(
                "CUSTOMER PAYMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to process payment",

                error:
                    error.message

            });

        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);


// ============================================================
// 2. GET ALL CUSTOMER PAYMENTS
//
// GET
// /api/customer/payments
// ============================================================

app.get(
    "/api/customer/payments",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId =
                getAuthenticatedUserId(req);


            if (!customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid customer authentication"

                });

            }


            const [payments] =
                await db.execute(
                    `
                    SELECT

                        p.id,

                        p.user_id,

                        p.order_id,

                        p.amount,

                        p.payment_method,

                        p.transaction_id,

                        p.status,

                        p.payment_date,

                        o.order_number,

                        o.total_amount AS order_total,

                        o.payment_status AS order_payment_status,

                        o.status AS order_status,

                        o.order_date

                    FROM payments p

                    LEFT JOIN orders o
                        ON p.order_id = o.id

                    WHERE p.user_id = ?

                    ORDER BY

                        p.payment_date DESC,

                        p.id DESC
                    `,
                    [
                        customerId
                    ]
                );


            return res.json({

                success: true,

                payments:
                    payments.map(
                        payment => ({

                            id:
                                payment.id,

                            user_id:
                                payment.user_id,

                            order_id:
                                payment.order_id,

                            amount:
                                Number(
                                    payment.amount || 0
                                ),

                            payment_method:
                                payment.payment_method,

                            transaction_id:
                                payment.transaction_id,

                            status:
                                payment.status,

                            payment_date:
                                payment.payment_date,

                            order_number:
                                payment.order_number,

                            order_total:
                                Number(
                                    payment.order_total || 0
                                ),

                            order_payment_status:
                                payment.order_payment_status,

                            order_status:
                                payment.order_status,

                            order_date:
                                payment.order_date

                        })
                    )

            });

        } catch (error) {

            console.error(
                "GET CUSTOMER PAYMENTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load payment history",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// 3. GET SINGLE CUSTOMER PAYMENT
//
// GET
// /api/customer/payments/:paymentId
// ============================================================

app.get(
    "/api/customer/payments/:paymentId",
    authenticateToken,
    async (req, res) => {

        try {

            const customerId =
                getAuthenticatedUserId(req);


            const paymentId =
                Number(
                    req.params.paymentId
                );


            // ------------------------------------------------
            // VALIDATE CUSTOMER
            // ------------------------------------------------

            if (!customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid customer authentication"

                });

            }


            // ------------------------------------------------
            // VALIDATE PAYMENT ID
            // ------------------------------------------------

            if (
                !Number.isInteger(paymentId) ||
                paymentId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment ID"

                });

            }


            // ------------------------------------------------
            // FIND PAYMENT
            // ------------------------------------------------

            const [payments] =
                await db.execute(
                    `
                    SELECT

                        p.id,

                        p.user_id,

                        p.order_id,

                        p.amount,

                        p.payment_method,

                        p.transaction_id,

                        p.status,

                        p.payment_date,

                        o.order_number,

                        o.total_amount AS order_total,

                        o.payment_status AS order_payment_status,

                        o.status AS order_status,

                        o.order_date

                    FROM payments p

                    LEFT JOIN orders o
                        ON p.order_id = o.id

                    WHERE p.id = ?

                    AND p.user_id = ?

                    LIMIT 1
                    `,
                    [
                        paymentId,
                        customerId
                    ]
                );


            // ------------------------------------------------
            // NOT FOUND
            // ------------------------------------------------

            if (
                payments.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment not found"

                });

            }


            const payment =
                payments[0];


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                payment: {

                    id:
                        payment.id,

                    user_id:
                        payment.user_id,

                    order_id:
                        payment.order_id,

                    amount:
                        Number(
                            payment.amount || 0
                        ),

                    payment_method:
                        payment.payment_method,

                    transaction_id:
                        payment.transaction_id,

                    status:
                        payment.status,

                    payment_date:
                        payment.payment_date,

                    order_number:
                        payment.order_number,

                    order_total:
                        Number(
                            payment.order_total || 0
                        ),

                    order_payment_status:
                        payment.order_payment_status,

                    order_status:
                        payment.order_status,

                    order_date:
                        payment.order_date

                }

            });

        } catch (error) {

            console.error(
                "GET SINGLE CUSTOMER PAYMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load payment",

                error:
                    error.message

            });

        }

    }
);

// ============================================================
// ADMIN PAYMENT MANAGEMENT
// ============================================================
//
// GET   /api/admin/payments/pending
// GET   /api/admin/payments
// PATCH /api/admin/payments/:paymentId/approve
// PATCH /api/admin/payments/:paymentId/reject
//
// Requires:
// authenticateToken
// requireAdmin
// ============================================================


// ============================================================
// ADMIN - GET PENDING PAYMENTS
//
// GET /api/admin/payments/pending
// ============================================================

app.get(
    "/api/admin/payments/pending",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            console.log(
                "ADMIN: GET PENDING PAYMENTS"
            );

            const [payments] = await db.execute(

                `
                SELECT

                    p.id,

                    p.user_id,

                    p.order_id,

                    p.amount,

                    p.payment_method,

                    p.transaction_id,

                    p.status,

                    p.payment_date,


                    /* USER INFORMATION */

                    u.full_name AS payer_name,

                    u.username AS username,

                    u.email AS email,

                    u.phone AS phone,

                    u.address AS address,


                    /* MEMBER INFORMATION */

                    m.id AS member_id,

                    m.membership_number AS membership_number,

                    m.join_date AS join_date,

                    m.status AS member_status,


                    /* ORDER INFORMATION */

                    o.order_number AS order_number,

                    o.total_amount AS order_total,

                    o.status AS order_status,

                    o.payment_status AS order_payment_status,

                    o.order_date AS order_date


                FROM payments p


                LEFT JOIN users u
                    ON p.user_id = u.id


                LEFT JOIN members m
                    ON m.user_id = u.id


                LEFT JOIN orders o
                    ON p.order_id = o.id


                WHERE p.status = 'pending'


                ORDER BY
                    p.payment_date DESC,
                    p.id DESC
                `

            );


            const formattedPayments =
                payments.map(payment => ({

                    // ------------------------------------------------
                    // PAYMENT
                    // ------------------------------------------------

                    id:
                        payment.id,

                    user_id:
                        payment.user_id,

                    order_id:
                        payment.order_id,

                    amount:
                        Number(
                            payment.amount || 0
                        ),

                    payment_method:
                        payment.payment_method,

                    transaction_id:
                        payment.transaction_id,

                    // Alias for frontend
                    reference_number:
                        payment.transaction_id,

                    status:
                        payment.status,

                    payment_date:
                        payment.payment_date,


                    // ------------------------------------------------
                    // USER
                    // ------------------------------------------------

                    payer_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    full_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    username:
                        payment.username,

                    email:
                        payment.email || "",

                    phone:
                        payment.phone || "",

                    address:
                        payment.address || "",


                    // ------------------------------------------------
                    // MEMBER
                    // ------------------------------------------------

                    member_id:
                        payment.member_id,

                    membership_number:
                        payment.membership_number || "",

                    join_date:
                        payment.join_date,

                    member_status:
                        payment.member_status,


                    // ------------------------------------------------
                    // ORDER
                    // ------------------------------------------------

                    order_number:
                        payment.order_number || "",

                    order_total:
                        Number(
                            payment.order_total || 0
                        ),

                    order_status:
                        payment.order_status || "",

                    order_payment_status:
                        payment.order_payment_status || "",

                    order_date:
                        payment.order_date,


                    // ------------------------------------------------
                    // DESCRIPTION
                    // ------------------------------------------------

                    description:
                        payment.order_number
                            ? `Payment for order ${payment.order_number}`
                            : "Payment"


                }));


            console.log(
                "PENDING PAYMENTS FOUND:",
                formattedPayments.length
            );


            return res.json({

                success: true,

                count:
                    formattedPayments.length,

                payments:
                    formattedPayments

            });


        } catch (error) {

            console.error(
                "GET PENDING PAYMENTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load pending payments",

                error:
                    error.message

            });

        }

    }
);



// ============================================================
// ADMIN - GET ALL PAYMENTS
//
// GET /api/admin/payments
// ============================================================

app.get(
    "/api/admin/payments",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            console.log(
                "ADMIN: GET ALL PAYMENTS"
            );


            const [payments] = await db.execute(

                `
                SELECT

                    p.id,

                    p.user_id,

                    p.order_id,

                    p.amount,

                    p.payment_method,

                    p.transaction_id,

                    p.status,

                    p.payment_date,


                    /* USER */

                    u.full_name AS payer_name,

                    u.username AS username,

                    u.email AS email,

                    u.phone AS phone,

                    u.address AS address,


                    /* MEMBER */

                    m.id AS member_id,

                    m.membership_number AS membership_number,

                    m.join_date AS join_date,

                    m.status AS member_status,


                    /* ORDER */

                    o.order_number AS order_number,

                    o.total_amount AS order_total,

                    o.status AS order_status,

                    o.payment_status AS order_payment_status,

                    o.order_date AS order_date


                FROM payments p


                LEFT JOIN users u
                    ON p.user_id = u.id


                LEFT JOIN members m
                    ON m.user_id = u.id


                LEFT JOIN orders o
                    ON p.order_id = o.id


                ORDER BY
                    p.payment_date DESC,
                    p.id DESC
                `

            );


            const formattedPayments =
                payments.map(payment => ({

                    // PAYMENT

                    id:
                        payment.id,

                    user_id:
                        payment.user_id,

                    order_id:
                        payment.order_id,

                    amount:
                        Number(
                            payment.amount || 0
                        ),

                    payment_method:
                        payment.payment_method,

                    transaction_id:
                        payment.transaction_id,

                    reference_number:
                        payment.transaction_id,

                    status:
                        payment.status,

                    payment_date:
                        payment.payment_date,


                    // USER

                    payer_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    full_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    username:
                        payment.username,

                    email:
                        payment.email || "",

                    phone:
                        payment.phone || "",

                    address:
                        payment.address || "",


                    // MEMBER

                    member_id:
                        payment.member_id,

                    membership_number:
                        payment.membership_number || "",

                    join_date:
                        payment.join_date,

                    member_status:
                        payment.member_status,


                    // ORDER

                    order_number:
                        payment.order_number || "",

                    order_total:
                        Number(
                            payment.order_total || 0
                        ),

                    order_status:
                        payment.order_status || "",

                    order_payment_status:
                        payment.order_payment_status || "",

                    order_date:
                        payment.order_date,


                    // DESCRIPTION

                    description:
                        payment.order_number
                            ? `Payment for order ${payment.order_number}`
                            : "Payment"

                }));


            return res.json({

                success: true,

                count:
                    formattedPayments.length,

                payments:
                    formattedPayments

            });


        } catch (error) {

            console.error(
                "GET ADMIN PAYMENTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load payments",

                error:
                    error.message

            });

        }

    }
);



// ============================================================
// ADMIN - APPROVE PAYMENT
//
// PATCH /api/admin/payments/:paymentId/approve
// ============================================================

app.patch(
    "/api/admin/payments/:paymentId/approve",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection = null;

        try {

            const paymentId =
                Number(
                    req.params.paymentId
                );


            console.log(
                "ADMIN: APPROVE PAYMENT:",
                paymentId
            );


            // ------------------------------------------------
            // VALIDATE PAYMENT ID
            // ------------------------------------------------

            if (
                !Number.isInteger(paymentId) ||
                paymentId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment ID"

                });

            }


            // ------------------------------------------------
            // CONNECTION
            // ------------------------------------------------

            connection =
                await db.getConnection();


            await connection.beginTransaction();


            // ------------------------------------------------
            // GET PAYMENT
            // ------------------------------------------------

            const [payments] =
                await connection.execute(

                    `
                    SELECT

                        p.id,

                        p.user_id,

                        p.order_id,

                        p.amount,

                        p.payment_method,

                        p.transaction_id,

                        p.status,

                        p.payment_date,

                        u.full_name AS payer_name,

                        u.username,

                        u.email,

                        u.phone,

                        o.order_number,

                        o.total_amount AS order_total

                    FROM payments p

                    LEFT JOIN users u
                        ON p.user_id = u.id

                    LEFT JOIN orders o
                        ON p.order_id = o.id

                    WHERE p.id = ?

                    LIMIT 1

                    FOR UPDATE
                    `,

                    [paymentId]

                );


            // ------------------------------------------------
            // NOT FOUND
            // ------------------------------------------------

            if (
                payments.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment not found"

                });

            }


            const payment =
                payments[0];


            // ------------------------------------------------
            // ONLY PENDING
            // ------------------------------------------------

            if (
                String(
                    payment.status
                ).toLowerCase() !==
                "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `Payment is already ${payment.status}`

                });

            }


            // ------------------------------------------------
            // APPROVE PAYMENT
            // ------------------------------------------------

            const [updateResult] =
                await connection.execute(

                    `
                    UPDATE payments

                    SET status = 'completed'

                    WHERE id = ?

                    AND status = 'pending'
                    `,

                    [paymentId]

                );


            if (
                updateResult.affectedRows !== 1
            ) {

                await connection.rollback();

                return res.status(409).json({

                    success: false,

                    message:
                        "Payment could not be approved. It may have already been processed."

                });

            }


            // ------------------------------------------------
            // UPDATE ORDER PAYMENT STATUS
            //
            // Calculate all completed payments
            // for this order.
            // ------------------------------------------------

            if (
                payment.order_id
            ) {

                const [paymentTotals] =
                    await connection.execute(

                        `
                        SELECT

                            COALESCE(
                                SUM(amount),
                                0
                            ) AS paid_amount

                        FROM payments

                        WHERE order_id = ?

                        AND status = 'completed'
                        `,

                        [
                            payment.order_id
                        ]

                    );


                const paidAmount =
                    Number(
                        paymentTotals[0]
                            ?.paid_amount || 0
                    );


                const orderTotal =
                    Number(
                        payment.order_total || 0
                    );


                // --------------------------------------------
                // FULLY PAID
                // --------------------------------------------

                if (
                    orderTotal > 0 &&
                    paidAmount >= orderTotal
                ) {

                    await connection.execute(

                        `
                        UPDATE orders

                        SET payment_status = 'paid'

                        WHERE id = ?
                        `,

                        [
                            payment.order_id
                        ]

                    );

                }

                // --------------------------------------------
                // NOT FULLY PAID
                // --------------------------------------------

                else {

                    await connection.execute(

                        `
                        UPDATE orders

                        SET payment_status = 'unpaid'

                        WHERE id = ?
                        `,

                        [
                            payment.order_id
                        ]

                    );

                }

            }


            // ------------------------------------------------
            // COMMIT
            // ------------------------------------------------

            await connection.commit();


            console.log(
                "PAYMENT APPROVED SUCCESSFULLY:",
                paymentId
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Payment approved successfully",

                payment: {

                    id:
                        payment.id,

                    user_id:
                        payment.user_id,

                    order_id:
                        payment.order_id,

                    order_number:
                        payment.order_number,

                    payer_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    email:
                        payment.email || "",

                    phone:
                        payment.phone || "",

                    amount:
                        Number(
                            payment.amount || 0
                        ),

                    payment_method:
                        payment.payment_method,

                    transaction_id:
                        payment.transaction_id,

                    reference_number:
                        payment.transaction_id,

                    status:
                        "completed",

                    payment_date:
                        payment.payment_date

                }

            });


        } catch (error) {

            // ------------------------------------------------
            // ROLLBACK
            // ------------------------------------------------

            try {

                if (connection) {

                    await connection.rollback();

                }

            } catch (rollbackError) {

                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError
                );

            }


            console.error(
                "APPROVE PAYMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to approve payment",

                error:
                    error.message

            });

        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);



// ============================================================
// ADMIN - REJECT PAYMENT
//
// PATCH /api/admin/payments/:paymentId/reject
// ============================================================

app.patch(
    "/api/admin/payments/:paymentId/reject",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection = null;

        try {

            const paymentId =
                Number(
                    req.params.paymentId
                );


            console.log(
                "ADMIN: REJECT PAYMENT:",
                paymentId
            );


            // ------------------------------------------------
            // VALIDATE
            // ------------------------------------------------

            if (
                !Number.isInteger(paymentId) ||
                paymentId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment ID"

                });

            }


            connection =
                await db.getConnection();


            await connection.beginTransaction();


            // ------------------------------------------------
            // FIND PAYMENT
            // ------------------------------------------------

            const [payments] =
                await connection.execute(

                    `
                    SELECT

                        p.id,

                        p.user_id,

                        p.order_id,

                        p.amount,

                        p.payment_method,

                        p.transaction_id,

                        p.status,

                        p.payment_date,

                        u.full_name AS payer_name,

                        u.username,

                        u.email,

                        u.phone,

                        o.order_number

                    FROM payments p

                    LEFT JOIN users u
                        ON p.user_id = u.id

                    LEFT JOIN orders o
                        ON p.order_id = o.id

                    WHERE p.id = ?

                    LIMIT 1

                    FOR UPDATE
                    `,

                    [paymentId]

                );


            // ------------------------------------------------
            // NOT FOUND
            // ------------------------------------------------

            if (
                payments.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment not found"

                });

            }


            const payment =
                payments[0];


            // ------------------------------------------------
            // ONLY PENDING PAYMENT
            // ------------------------------------------------

            if (
                String(
                    payment.status
                ).toLowerCase() !==
                "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `Payment is already ${payment.status}`

                });

            }


            // ------------------------------------------------
            // REJECT
            // ------------------------------------------------

            const [updateResult] =
                await connection.execute(

                    `
                    UPDATE payments

                    SET status = 'rejected'

                    WHERE id = ?

                    AND status = 'pending'
                    `,

                    [paymentId]

                );


            if (
                updateResult.affectedRows !== 1
            ) {

                await connection.rollback();

                return res.status(409).json({

                    success: false,

                    message:
                        "Payment could not be rejected. It may have already been processed."

                });

            }


            // ------------------------------------------------
            // KEEP ORDER UNPAID
            // ------------------------------------------------

            if (
                payment.order_id
            ) {

                await connection.execute(

                    `
                    UPDATE orders

                    SET payment_status = 'unpaid'

                    WHERE id = ?
                    `,

                    [
                        payment.order_id
                    ]

                );

            }


            // ------------------------------------------------
            // COMMIT
            // ------------------------------------------------

            await connection.commit();


            console.log(
                "PAYMENT REJECTED SUCCESSFULLY:",
                paymentId
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Payment rejected successfully",

                payment: {

                    id:
                        payment.id,

                    user_id:
                        payment.user_id,

                    order_id:
                        payment.order_id,

                    order_number:
                        payment.order_number,

                    payer_name:
                        payment.payer_name ||
                        payment.username ||
                        "Unknown",

                    email:
                        payment.email || "",

                    phone:
                        payment.phone || "",

                    amount:
                        Number(
                            payment.amount || 0
                        ),

                    payment_method:
                        payment.payment_method,

                    transaction_id:
                        payment.transaction_id,

                    reference_number:
                        payment.transaction_id,

                    status:
                        "rejected",

                    payment_date:
                        payment.payment_date

                }

            });


        } catch (error) {

            try {

                if (connection) {

                    await connection.rollback();

                }

            } catch (rollbackError) {

                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError
                );

            }


            console.error(
                "REJECT PAYMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to reject payment",

                error:
                    error.message

            });

        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);

// ============================================================
// SUPPLIER ORDERS
// ============================================================

app.get("/api/supplier/orders", authenticateToken, async (req, res) => {
    try {
        // Logged-in user's ID
        const userId = req.user.id;

        // Find supplier belonging to this user
        const [supplierRows] = await db.execute(
            `
            SELECT id, user_id, company_name
            FROM suppliers
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        if (supplierRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier profile not found"
            });
        }

        const supplierId = supplierRows[0].id;

        // Get orders containing this supplier's products
        const [orders] = await db.execute(
            `
            SELECT
                o.id,
                o.order_number,
                o.customer_id,
                o.total_amount,
                o.status,
                o.payment_status,
                o.order_date,

                u.full_name AS customer_name,

                SUM(oi.quantity) AS total_items,

                GROUP_CONCAT(
                    DISTINCT p.name
                    ORDER BY p.name
                    SEPARATOR ', '
                ) AS product_names

            FROM orders o

            INNER JOIN order_items oi
                ON o.id = oi.order_id

            INNER JOIN products p
                ON oi.product_id = p.id

            INNER JOIN users u
                ON o.customer_id = u.id

            WHERE
                p.supplier_id = ?
                AND o.payment_status = 'paid'
                AND o.status IN (
                    'processing',
                    'shipped',
                    'delivered',
                    'completed'
                )

            GROUP BY
                o.id,
                o.order_number,
                o.customer_id,
                o.total_amount,
                o.status,
                o.payment_status,
                o.order_date,
                u.full_name

            ORDER BY o.order_date DESC
            `,
            [supplierId]
        );

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error("SUPPLIER ORDERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load supplier orders",
            error: error.message
        });
    }
});



// ============================================================
// SUPPLIER UPDATE ORDER STATUS
// ============================================================

app.put(
    "/api/supplier/orders/:orderId/status",
    authenticateToken,
    async (req, res) => {

        try {
            const orderId = Number(req.params.orderId);
            const { status } = req.body;

            const allowedStatuses = [
                "processing",
                "shipped",
                "delivered",
                "completed",
                "cancelled"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status"
                });
            }

            const userId = req.user.id;

            // Find supplier
            const [supplierRows] = await db.execute(
                `
                SELECT id
                FROM suppliers
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (supplierRows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Supplier profile not found"
                });
            }

            const supplierId = supplierRows[0].id;

            // Make sure this order contains this supplier's product
            const [orderRows] = await db.execute(
                `
                SELECT o.id, o.status, o.payment_status
                FROM orders o
                INNER JOIN order_items oi
                    ON o.id = oi.order_id
                INNER JOIN products p
                    ON oi.product_id = p.id
                WHERE
                    o.id = ?
                    AND p.supplier_id = ?
                LIMIT 1
                `,
                [orderId, supplierId]
            );

            if (orderRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found for this supplier"
                });
            }

            const order = orderRows[0];

            // Supplier cannot process unpaid orders
            if (order.payment_status !== "paid") {
                return res.status(400).json({
                    success: false,
                    message: "Payment has not been approved yet"
                });
            }

            // Update order
            await db.execute(
                `
                UPDATE orders
                SET status = ?
                WHERE id = ?
                `,
                [status, orderId]
            );

            res.json({
                success: true,
                message: `Order ${status} successfully`,
                orderId,
                status
            });

        } catch (error) {

            console.error(
                "SUPPLIER ORDER STATUS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to update order status",
                error: error.message
            });
        }
    }
);


// ============================================================
// APPROVE PAYMENT
// ============================================================

app.put(
    "/api/accountant/payments/:paymentId/approve",
    authenticateToken,
    async (req, res) => {

        try {

            const paymentId = Number(req.params.paymentId);

            // Get payment
            const [payments] = await db.execute(
                `
                SELECT
                    id,
                    order_id,
                    status
                FROM payments
                WHERE id = ?
                LIMIT 1
                `,
                [paymentId]
            );

            if (payments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            const payment = payments[0];

            if (!payment.order_id) {
                return res.status(400).json({
                    success: false,
                    message: "Payment is not linked to an order"
                });
            }

            // Approve payment
            await db.execute(
                `
                UPDATE payments
                SET status = 'completed'
                WHERE id = ?
                `,
                [paymentId]
            );

            // Mark order as paid and processing
            await db.execute(
                `
                UPDATE orders
                SET
                    payment_status = 'paid',
                    status = 'processing'
                WHERE id = ?
                `,
                [payment.order_id]
            );

            res.json({
                success: true,
                message: "Payment approved and order sent to supplier",
                order_id: payment.order_id
            });

        } catch (error) {

            console.error(
                "APPROVE PAYMENT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to approve payment",
                error: error.message
            });
        }
    }
);



// ============================================================
// FORGOT PASSWORD
// ============================================================

app.post(
    "/api/auth/forgot-password",
    async (req, res) => {

        try {

            const { email } = req.body || {};

            if (!email) {

                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });

            }

            const [users] = await db.execute(
                `
                SELECT
                    id,
                    email,
                    username
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [email.trim()]
            );

            if (!users || users.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "No account found with this email"
                });

            }

            const user = users[0];

            // Generate secure reset token
           const resetToken = nodeCrypto.randomBytes(32).toString("hex");

            // Token expires after 15 minutes
            const resetExpires =
                new Date(
                    Date.now() + 15 * 60 * 1000
                );

            /*
             * IMPORTANT:
             *
             * Your users table needs these two columns:
             *
             * reset_token
             * reset_token_expires
             */

            await db.execute(
                `
                UPDATE users
                SET
                    reset_token = ?,
                    reset_token_expires = ?
                WHERE id = ?
                `,
                [
                    resetToken,
                    resetExpires,
                    user.id
                ]
            );

            console.log(
                "PASSWORD RESET TOKEN GENERATED:",
                user.email
            );

            /*
             * DEVELOPMENT ONLY
             *
             * Later we will send this token through email.
             */

            return res.json({

                success: true,

                message:
                    "Password reset token generated",

                resetToken

            });

        } catch (error) {

            console.error(
                "FORGOT PASSWORD ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to process password reset",

                error:
                    error.message

            });

        }
    }
);


// ============================================================
// RESET PASSWORD
// ============================================================

app.post(
    "/api/auth/reset-password",
    async (req, res) => {

        try {

            const {
                token,
                password
            } = req.body || {};

            if (!token || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Reset token and new password are required"

                });

            }

            if (password.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be at least 6 characters"

                });

            }

            const [users] = await db.execute(
                `
                SELECT
                    id,
                    email
                FROM users
                WHERE
                    reset_token = ?
                    AND reset_token_expires > NOW()
                LIMIT 1
                `,
                [token]
            );

            if (!users || users.length === 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid or expired reset token"

                });

            }

            const user = users[0];

            // Hash the new password
            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );

            // Update password and invalidate token
            await db.execute(
                `
                UPDATE users
                SET
                    password_hash = ?,
                    reset_token = NULL,
                    reset_token_expires = NULL
                WHERE id = ?
                `,
                [
                    passwordHash,
                    user.id
                ]
            );

            console.log(
                "PASSWORD RESET SUCCESS:",
                user.email
            );

            return res.json({

                success: true,

                message:
                    "Password reset successfully"

            });

        } catch (error) {

            console.error(
                "RESET PASSWORD ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to reset password",

                error:
                    error.message

            });

        }
    }
);
// ============================================================
// ADMIN - REPAY MEMBER LOAN
// POST /api/admin/members/:memberId/loans/:loanId/repayment
// ============================================================

app.post(
    "/api/admin/members/:memberId/loans/:loanId/repayment",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection;

        try {

            // ----------------------------------------------------
            // IDs
            // ----------------------------------------------------

            const memberId =
                Number(req.params.memberId);

            const loanId =
                Number(req.params.loanId);

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            if (
                !Number.isInteger(loanId) ||
                loanId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid loan ID"
                });
            }

            // ----------------------------------------------------
            // REQUEST DATA
            // ----------------------------------------------------

            const {
                repayment_amount,
                payment_method,
                description
            } = req.body || {};

            // ----------------------------------------------------
            // VALIDATE REPAYMENT AMOUNT
            // ----------------------------------------------------

            const repaymentAmount =
                Number(repayment_amount);

            if (
                !Number.isFinite(repaymentAmount) ||
                repaymentAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Repayment amount must be greater than zero"
                });
            }

            // ----------------------------------------------------
            // PAYMENT METHOD
            // ----------------------------------------------------

            const paymentMethod =
                payment_method || "cash";

            const allowedPaymentMethods = [
                "cash",
                "bank_transfer",
                "mobile_money",
                "other"
            ];

            if (
                !allowedPaymentMethods.includes(
                    paymentMethod
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment method"
                });
            }

            // ----------------------------------------------------
            // DATABASE CONNECTION
            // ----------------------------------------------------

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            // ----------------------------------------------------
            // GET LOAN
            // ----------------------------------------------------

            const [loanRows] =
                await connection.execute(
                    `
                    SELECT
                        l.id,
                        l.member_id,
                        l.amount,
                        l.status,
                        l.remaining_balance,
                        m.user_id,
                        u.full_name
                    FROM loans l

                    INNER JOIN members m
                        ON l.member_id = m.id

                    INNER JOIN users u
                        ON m.user_id = u.id

                    WHERE l.id = ?
                    AND l.member_id = ?

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        loanId,
                        memberId
                    ]
                );

            if (
                !loanRows ||
                loanRows.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Loan not found for this member"
                });
            }

            const loan =
                loanRows[0];

            // ----------------------------------------------------
            // CHECK LOAN STATUS
            // ----------------------------------------------------

            if (
                loan.status === "completed"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "This loan has already been completed"
                });
            }

            if (
                loan.status !== "approved" &&
                loan.status !== "active"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `Loan cannot be repaid while status is '${loan.status}'`
                });
            }

            // ----------------------------------------------------
            // CURRENT BALANCE
            // ----------------------------------------------------

            const currentBalance =
                Number(
                    loan.remaining_balance || 0
                );

            if (
                currentBalance <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "This loan has no remaining balance"
                });
            }

            // ----------------------------------------------------
            // PREVENT OVERPAYMENT
            // ----------------------------------------------------

            if (
                repaymentAmount >
                currentBalance
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `Repayment cannot be greater than the remaining balance of ETB ${currentBalance.toFixed(2)}`
                });
            }

            // ----------------------------------------------------
            // CALCULATE NEW BALANCE
            // ----------------------------------------------------

            const newBalance =
                Math.max(
                    0,
                    currentBalance -
                    repaymentAmount
                );

            // ----------------------------------------------------
            // NEW STATUS
            // ----------------------------------------------------

            const newStatus =
                newBalance === 0
                    ? "completed"
                    : "active";

            // ----------------------------------------------------
            // UPDATE LOAN
            // ----------------------------------------------------

            await connection.execute(
                `
                UPDATE loans
                SET
                    remaining_balance = ?,
                    status = ?
                WHERE id = ?
                AND member_id = ?
                `,
                [
                    newBalance,
                    newStatus,
                    loanId,
                    memberId
                ]
            );

            // ----------------------------------------------------
            // TRANSACTION REFERENCE
            // ----------------------------------------------------

            const reference =
                `LP-${Date.now()}-${loanId}`;

            // ----------------------------------------------------
            // TRANSACTION DESCRIPTION
            // ----------------------------------------------------

            const transactionDescription =
                description &&
                description.trim()
                    ? description.trim()
                    : `Loan repayment for Loan #${loanId} - ${paymentMethod}`;

            // ----------------------------------------------------
            // CREATE TRANSACTION
            //
            // IMPORTANT:
            // Your ENUM supports:
            // loan_payment
            // ----------------------------------------------------

            await connection.execute(
                `
                INSERT INTO transactions
                (
                    user_id,
                    transaction_type,
                    amount,
                    description,
                    transaction_date,
                    reference_number
                )
                VALUES
                (?, 'loan_payment', ?, ?, NOW(), ?)
                `,
                [
                    loan.user_id,
                    repaymentAmount,
                    transactionDescription,
                    reference
                ]
            );

            // ----------------------------------------------------
            // COMMIT
            // ----------------------------------------------------

            await connection.commit();

            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.json({

                success: true,

                message:
                    newBalance === 0
                        ? "Loan fully repaid successfully"
                        : "Loan repayment recorded successfully",

                repayment: {

                    loan_id: loanId,

                    member_id: memberId,

                    repayment_amount:
                        repaymentAmount,

                    previous_balance:
                        currentBalance,

                    remaining_balance:
                        newBalance,

                    status:
                        newStatus,

                    payment_method:
                        paymentMethod,

                    reference

                }

            });

        } catch (error) {

            // ----------------------------------------------------
            // ROLLBACK
            // ----------------------------------------------------

            if (connection) {

                try {
                    await connection.rollback();
                } catch (rollbackError) {

                    console.error(
                        "LOAN REPAYMENT ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }

            console.error(
                "LOAN REPAYMENT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to process loan repayment",

                error:
                    error.message

            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);
// ============================================================
// ADMIN - GET MEMBER LOANS
// GET /api/admin/members/:memberId/loans
// ============================================================

app.get(
    "/api/admin/members/:memberId/loans",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const memberId = Number(
                req.params.memberId
            );

            // ----------------------------------------------------
            // VALIDATE MEMBER ID
            // ----------------------------------------------------

            if (
                !Number.isInteger(memberId) ||
                memberId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });

            }

            // ----------------------------------------------------
            // CHECK MEMBER
            // ----------------------------------------------------

            const [memberRows] =
                await db.execute(
                    `
                    SELECT
                        m.id,
                        m.user_id,
                        m.membership_number,
                        u.username,
                        u.email,
                        u.full_name
                    FROM members m
                    INNER JOIN users u
                        ON m.user_id = u.id
                    WHERE m.id = ?
                    LIMIT 1
                    `,
                    [memberId]
                );

            if (
                !memberRows ||
                memberRows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });

            }

            // ----------------------------------------------------
            // GET MEMBER LOANS
            // ----------------------------------------------------

            const [loans] =
                await db.execute(
                    `
                    SELECT
                        id,
                        member_id,
                        amount,
                        interest_rate,
                        term_months,
                        status,
                        approval_date,
                        due_date,
                        remaining_balance
                    FROM loans
                    WHERE member_id = ?
                    ORDER BY id DESC
                    `,
                    [memberId]
                );

            // ----------------------------------------------------
            // FORMAT LOANS
            // ----------------------------------------------------

            const formattedLoans =
                loans.map(loan => ({
                    id: loan.id,

                    member_id:
                        loan.member_id,

                    amount:
                        Number(
                            loan.amount || 0
                        ),

                    interest_rate:
                        Number(
                            loan.interest_rate || 0
                        ),

                    term_months:
                        Number(
                            loan.term_months || 0
                        ),

                    status:
                        loan.status,

                    approval_date:
                        loan.approval_date,

                    due_date:
                        loan.due_date,

                    remaining_balance:
                        Number(
                            loan.remaining_balance || 0
                        )
                }));

            // ----------------------------------------------------
            // TOTAL LOAN AMOUNT
            // ----------------------------------------------------

            const totalLoanAmount =
                formattedLoans.reduce(
                    (total, loan) =>
                        total +
                        Number(
                            loan.amount || 0
                        ),
                    0
                );

            // ----------------------------------------------------
            // REMAINING LOAN AMOUNT
            // ----------------------------------------------------

            const totalRemainingBalance =
                formattedLoans.reduce(
                    (total, loan) =>
                        total +
                        Number(
                            loan.remaining_balance || 0
                        ),
                    0
                );

            console.log(
                `MEMBER ${memberId} LOANS:`,
                formattedLoans
            );

            console.log(
                `MEMBER ${memberId} TOTAL LOAN AMOUNT:`,
                totalLoanAmount
            );

            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            return res.json({

                success: true,

                member: {
                    id:
                        memberRows[0].id,

                    user_id:
                        memberRows[0].user_id,

                    membership_number:
                        memberRows[0]
                            .membership_number,

                    username:
                        memberRows[0].username,

                    email:
                        memberRows[0].email,

                    full_name:
                        memberRows[0].full_name
                },

                loans:
                    formattedLoans,

                totalLoanAmount:
                    Number(
                        totalLoanAmount.toFixed(2)
                    ),

                totalRemainingBalance:
                    Number(
                        totalRemainingBalance.toFixed(2)
                    ),

                loanCount:
                    formattedLoans.length

            });

        } catch (error) {

            console.error(
                "ADMIN GET MEMBER LOANS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load member loans",

                error:
                    error.message

            });

        }

    }
);

// ============================================================
// ADMIN - ASSIGN MEMBERSHIP NUMBER
// PUT /api/admin/members/:memberId/membership
// ============================================================

app.put(
    "/api/admin/members/:memberId/membership",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection;

        try {

            const memberId = Number(req.params.memberId);

            const membershipNumber =
                String(req.body?.membership_number || "")
                    .trim()
                    .toUpperCase();

            // ----------------------------------------------------
            // Validate member ID
            // ----------------------------------------------------

            if (!Number.isInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            // ----------------------------------------------------
            // Validate membership number
            // ----------------------------------------------------

            if (!membershipNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Membership number is required"
                });
            }

            // Example format: MEM-0015
            if (!/^MEM-\d{4,}$/.test(membershipNumber)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Membership number must be in format MEM-0001"
                });
            }

            connection = await db.getConnection();

            await connection.beginTransaction();

            // ----------------------------------------------------
            // Check member
            // ----------------------------------------------------

            const [memberRows] = await connection.execute(
                `
                SELECT
                    id,
                    membership_number
                FROM members
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [memberId]
            );

            if (!memberRows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            // ----------------------------------------------------
            // Check whether membership number already belongs
            // to another member
            // ----------------------------------------------------

            const [existingRows] = await connection.execute(
                `
                SELECT
                    id,
                    membership_number
                FROM members
                WHERE membership_number = ?
                AND id <> ?
                LIMIT 1
                `,
                [
                    membershipNumber,
                    memberId
                ]
            );

            if (existingRows.length > 0) {

                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        `${membershipNumber} is already assigned to another member`
                });
            }

            // ----------------------------------------------------
            // Assign membership
            // ----------------------------------------------------

            await connection.execute(
                `
                UPDATE members
                SET membership_number = ?
                WHERE id = ?
                `,
                [
                    membershipNumber,
                    memberId
                ]
            );

            await connection.commit();

            return res.json({
                success: true,
                message:
                    `Membership number ${membershipNumber} assigned successfully`,
                membership: {
                    member_id: memberId,
                    membership_number: membershipNumber
                }
            });

        } catch (error) {

            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "MEMBERSHIP ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }

            console.error(
                "ASSIGN MEMBERSHIP ERROR:",
                error
            );

            // Duplicate-key protection
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message:
                        "This membership number is already assigned to another member"
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Failed to assign membership number",
                error: error.message
            });

        } finally {

            if (connection) {
                connection.release();
            }

        }
    }
);

// ============================================================
// ADMIN - UNASSIGN MEMBERSHIP NUMBER
// DELETE /api/admin/members/:memberId/membership
// ============================================================

app.delete(
    "/api/admin/members/:memberId/membership",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        let connection;

        try {

            const memberId = Number(req.params.memberId);

            if (!Number.isInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            connection = await db.getConnection();

            await connection.beginTransaction();

            // ----------------------------------------------------
            // Check member
            // ----------------------------------------------------

            const [memberRows] = await connection.execute(
                `
                SELECT
                    id,
                    membership_number
                FROM members
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [memberId]
            );

            if (!memberRows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            const currentMembership =
                memberRows[0].membership_number;

            if (!currentMembership) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "This member does not have a membership number"
                });
            }

            // ----------------------------------------------------
            // Remove membership
            // ----------------------------------------------------

            await connection.execute(
                `
                UPDATE members
                SET membership_number = NULL
                WHERE id = ?
                `,
                [memberId]
            );

            await connection.commit();

            return res.json({
                success: true,
                message:
                    `Membership number ${currentMembership} unassigned successfully`,
                membership: {
                    member_id: memberId,
                    membership_number: null
                }
            });

        } catch (error) {

            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error(
                        "UNASSIGN MEMBERSHIP ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }

            console.error(
                "UNASSIGN MEMBERSHIP ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to unassign membership number",
                error: error.message
            });

        } finally {

            if (connection) {
                connection.release();
            }

        }
    }
);
// ============================================================
// 404 HANDLER
// ============================================================

app.use(
    (req, res) => {

        console.log(
            "404 ROUTE:",
            req.method,
            req.originalUrl
        );

        return res.status(404).json({

            success: false,

            message:
                "API route not found",

            route:
                req.originalUrl
        });
    }
);

// ============================================================
// GENERAL ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal server error",

            error:
                error.message
        });
    }
);

 // ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT, 
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "Digital Cooperative Management Server"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            `API running on http://localhost:${PORT}/api`
        );

        console.log(
            `Login: http://localhost:${PORT}/api/auth/login`
        );

        console.log(
            `Admin Users: http://localhost:${PORT}/api/admin/users`
        );

        console.log(
            `Admin Stats: http://localhost:${PORT}/api/admin/system-stats`
        );

        console.log(
            `Products: http://localhost:${PORT}/api/supplier/products`
        );

        console.log(
            `Product images: http://localhost:${PORT}/uploads/products/`
        );

        console.log(
            "========================================"
        );
    }
);