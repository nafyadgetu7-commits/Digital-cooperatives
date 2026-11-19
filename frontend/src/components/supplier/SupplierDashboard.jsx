import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
import "./SupplierDashboard.css";
import { useNavigate } from "react-router-dom";

// ============================================================
// EMPTY PRODUCT FORM
// ============================================================

const emptyForm = {
    name: "",
    description: "",
    price: "",
    stock: "",
    unit: "",
    category_id: "",
    image: null
};

// ============================================================
// IMAGE BASE URL
// ============================================================

const IMAGE_BASE_URL = "http://localhost:5000";

// ============================================================
// SUPPLIER DASHBOARD
// ============================================================

function SupplierDashboard() {

    const navigate = useNavigate();

    // ========================================================
    // PROFILE
    // ========================================================

    const [profile, setProfile] = useState(null);

    // ========================================================
    // STATISTICS
    // ========================================================

    const [stats, setStats] = useState({
        totalProducts: 0,
        totalStock: 0,
        ordersReceived: 0,
        pendingOrders: 0,
        totalRevenue: 0
    });

    // ========================================================
    // PRODUCTS
    // ========================================================

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    // ========================================================
    // ORDERS
    // ========================================================

    const [orders, setOrders] = useState([]);

    // ========================================================
    // MEMBERS
    // ========================================================

    const [members, setMembers] = useState([]);

    // ========================================================
    // MEMBER FINANCE
    // ========================================================

    const [selectedMember, setSelectedMember] = useState(null);

    const [memberFinancial, setMemberFinancial] = useState({
        savings: 0,
        shares: 0,
        activeLoans: 0,
        transactionCount: 0
    });

    const [memberTransactions, setMemberTransactions] = useState([]);

    const [showFinanceModal, setShowFinanceModal] = useState(false);

    const [financeLoading, setFinanceLoading] = useState(false);

    // ========================================================
    // PRODUCT MODAL
    // ========================================================

    const [showModal, setShowModal] = useState(false);

    const [editingProduct, setEditingProduct] = useState(null);

    const [form, setForm] = useState(emptyForm);

    const [imagePreview, setImagePreview] = useState(null);

    // ========================================================
    // LOADING
    // ========================================================

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");

    // ========================================================
    // LOAD DASHBOARD
    // ========================================================

    const loadDashboard = async () => {

        try {

            setLoading(true);
            setError("");

            const [
                productsRes,
                statsRes,
                ordersRes
            ] = await Promise.all([
                api.get("/supplier/products"),
                api.get("/supplier/stats"),
                api.get("/supplier/orders")
            ]);

            console.log("Products:", productsRes.data);
            console.log("Stats:", statsRes.data);
            console.log("Orders:", ordersRes.data);

            // =================================================
            // PRODUCTS
            // =================================================

            setProducts(
                productsRes.data?.products || []
            );

            // =================================================
            // ORDERS
            // =================================================

            setOrders(
                ordersRes.data?.orders || []
            );

            // =================================================
            // STATS
            // =================================================

            setStats({
                totalProducts:
                    Number(
                        statsRes.data?.totalProducts
                    ) || 0,

                totalStock:
                    Number(
                        statsRes.data?.totalStock
                    ) || 0,

                ordersReceived:
                    Number(
                        statsRes.data?.ordersReceived
                    ) || 0,

                pendingOrders:
                    Number(
                        statsRes.data?.pendingOrders
                    ) || 0,

                totalRevenue:
                    Number(
                        statsRes.data?.totalRevenue
                    ) || 0
            });

            // =================================================
            // PROFILE
            // =================================================

            try {

                const profileRes =
                    await api.get(
                        "/supplier/profile"
                    );

                setProfile(
                    profileRes.data?.supplier || null
                );

            } catch (profileError) {

                console.log(
                    "Profile not available:",
                    profileError.message
                );
            }

            // =================================================
            // CATEGORIES
            // =================================================

            try {

                const categoriesRes =
                    await api.get(
                        "/supplier/categories"
                    );

                setCategories(
                    categoriesRes.data?.categories || []
                );

            } catch (categoryError) {

                console.log(
                    "Categories not available:",
                    categoryError.message
                );
            }

            // =================================================
            // MEMBERS
            // =================================================

            try {

                const membersRes =
                    await api.get(
                        "/admin/members"
                    );

                console.log(
                    "Members:",
                    membersRes.data
                );

                setMembers(
                    membersRes.data?.members || []
                );

            } catch (memberError) {

                console.log(
                    "Members not available:",
                    memberError.response?.data ||
                    memberError.message
                );

                setMembers([]);
            }

        } catch (err) {

            console.error(
                "DASHBOARD ERROR:",
                err
            );

            const message =
                err.response?.data?.message ||
                "Failed to load supplier dashboard";

            setError(message);

            toast.error(message);

        } finally {

            setLoading(false);
        }
    };

    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {

        loadDashboard();

    }, []);

    // ========================================================
    // FORM CHANGE
    // ========================================================

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));
    };

    // ========================================================
    // IMAGE CHANGE
    // ========================================================

    const handleImageChange = (e) => {

        const file =
            e.target.files?.[0];

        if (!file) {

            setForm(previous => ({
                ...previous,
                image: null
            }));

            setImagePreview(null);

            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowedTypes.includes(file.type)) {

            toast.error(
                "Please select a valid image file."
            );

            e.target.value = "";

            return;
        }

        if (file.size > 5 * 1024 * 1024) {

            toast.error(
                "Image must be smaller than 5MB."
            );

            e.target.value = "";

            return;
        }

        setForm(previous => ({
            ...previous,
            image: file
        }));

        const previewUrl =
            URL.createObjectURL(file);

        setImagePreview(previewUrl);
    };

    // ========================================================
    // OPEN ADD PRODUCT
    // ========================================================

    const openAddProduct = () => {

        setEditingProduct(null);

        setForm({
            ...emptyForm
        });

        setImagePreview(null);

        setShowModal(true);
    };

    // ========================================================
    // OPEN EDIT PRODUCT
    // ========================================================

    const openEditProduct = (product) => {

        setEditingProduct(product);

        setForm({

            name:
                product.name || "",

            description:
                product.description || "",

            price:
                product.price || "",

            stock:
                product.stock || "",

            unit:
                product.unit || "",

            category_id:
                product.category_id || "",

            image: null
        });

        if (product.image_url) {

            if (
                product.image_url.startsWith("http")
            ) {

                setImagePreview(
                    product.image_url
                );

            } else {

                setImagePreview(
                    `${IMAGE_BASE_URL}${product.image_url}`
                );
            }

        } else {

            setImagePreview(null);
        }

        setShowModal(true);
    };

    // ========================================================
    // CLOSE PRODUCT MODAL
    // ========================================================

    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);

        setEditingProduct(null);

        setForm({
            ...emptyForm
        });

        setImagePreview(null);
    };

    // ========================================================
    // SAVE PRODUCT
    // ========================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);
            setError("");

            const data = new FormData();

            data.append(
                "name",
                form.name.trim()
            );

            data.append(
                "description",
                form.description.trim()
            );

            data.append(
                "price",
                String(Number(form.price))
            );

            data.append(
                "stock",
                String(Number(form.stock))
            );

            data.append(
                "unit",
                form.unit.trim()
            );

            if (form.category_id) {

                data.append(
                    "category_id",
                    String(
                        Number(form.category_id)
                    )
                );
            }

            if (form.image) {

                data.append(
                    "product_image",
                    form.image
                );
            }

            if (editingProduct) {

                await api.put(
                    `/supplier/products/${editingProduct.id}`,
                    data
                );

                toast.success(
                    "Product updated successfully!"
                );

            } else {

                await api.post(
                    "/supplier/products",
                    data
                );

                toast.success(
                    "Product added successfully!"
                );
            }

            closeModal();

            await loadDashboard();

        } catch (err) {

            console.error(
                "SAVE PRODUCT ERROR:",
                err
            );

            const message =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to save product";

            setError(message);

            toast.error(message);

        } finally {

            setSaving(false);
        }
    };

    // ========================================================
    // DELETE PRODUCT
    // ========================================================

    const handleDelete = async (id) => {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this product?"
            );

        if (!confirmed) {
            return;
        }

        try {

            await api.delete(
                `/supplier/products/${id}`
            );

            toast.success(
                "Product deleted successfully!"
            );

            await loadDashboard();

        } catch (err) {

            console.error(
                "DELETE ERROR:",
                err
            );

            toast.error(
                err.response?.data?.message ||
                "Failed to delete product"
            );
        }
    };

    // ========================================================
    // ORDER STATUS
    // ========================================================

    const handleOrderStatus = async (
        orderId,
        status,
        paymentStatus
    ) => {

        try {

            if (
                String(paymentStatus || "").toLowerCase()
                !== "paid"
            ) {

                toast.warning(
                    "Payment must be approved before the supplier can process this order."
                );

                return;
            }

            const allowedStatuses = [
                "processing",
                "shipped",
                "delivered",
                "completed"
            ];

            if (
                !allowedStatuses.includes(status)
            ) {

                toast.error(
                    "Invalid supplier order status."
                );

                return;
            }

            await api.put(
                `/supplier/orders/${orderId}/status`,
                {
                    status
                }
            );

            toast.success(
                `Order status changed to ${status}.`
            );

            await loadDashboard();

        } catch (err) {

            console.error(
                "ORDER STATUS ERROR:",
                err
            );

            toast.error(
                err.response?.data?.message ||
                "Failed to update order status"
            );
        }
    };

    // ========================================================
    // OPEN ALL ORDERS PAGE
    // ========================================================

    const openSupplierOrders = () => {

        navigate("/supplier/orders");
    };

    // ========================================================
    // IMAGE URL
    // ========================================================

    const getImageUrl = (imageUrl) => {

        if (!imageUrl) {
            return null;
        }

        if (
            imageUrl.startsWith("http")
        ) {

            return imageUrl;
        }

        return `${IMAGE_BASE_URL}${imageUrl}`;
    };

    // ========================================================
    // MEMBER FINANCE
    // ========================================================

    const handleManageFinance =
        async (member) => {

            try {

                const memberId =
                    member?.member_id ??
                    member?.memberId ??
                    member?.id;

                if (
                    memberId === undefined ||
                    memberId === null ||
                    memberId === "" ||
                    Number.isNaN(
                        Number(memberId)
                    )
                ) {

                    toast.error(
                        "Invalid member ID"
                    );

                    return;
                }

                setFinanceLoading(true);

                const response =
                    await api.get(
                        `/admin/members/${Number(memberId)}/financial`
                    );

                if (
                    !response.data?.success
                ) {

                    toast.error(
                        response.data?.message ||
                        "Failed to load member financial information"
                    );

                    return;
                }

                setSelectedMember(
                    response.data.member ||
                    member
                );

                setMemberFinancial({

                    savings:
                        Number(
                            response.data.financial?.savings
                        ) || 0,

                    shares:
                        Number(
                            response.data.financial?.shares
                        ) || 0,

                    activeLoans:
                        Number(
                            response.data.financial?.activeLoans
                        ) || 0,

                    transactionCount:
                        Number(
                            response.data.financial?.transactionCount
                        ) || 0
                });

                setMemberTransactions(
                    response.data.transactions || []
                );

                setShowFinanceModal(true);

            } catch (error) {

                console.error(
                    "MEMBER FINANCIAL ERROR:",
                    error
                );

                toast.error(
                    error.response?.data?.message ||
                    "Failed to load member financial information"
                );

            } finally {

                setFinanceLoading(false);
            }
        };

    // ========================================================
    // CLOSE FINANCE MODAL
    // ========================================================

    const closeFinanceModal = () => {

        if (financeLoading) {
            return;
        }

        setShowFinanceModal(false);

        setSelectedMember(null);

        setMemberFinancial({
            savings: 0,
            shares: 0,
            activeLoans: 0,
            transactionCount: 0
        });

        setMemberTransactions([]);
    };

    // ========================================================
    // REFRESH MEMBER FINANCE
    // ========================================================

    const refreshMemberFinance = async () => {

        if (!selectedMember) {
            return;
        }

        await handleManageFinance(
            selectedMember
        );
    };

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {

        return (
            <div className="supplier-loading">

                <div className="spinner"></div>

                <p>
                    Loading supplier dashboard...
                </p>

            </div>
        );
    }

    // ========================================================
    // UI
    // ========================================================

    return (

        <div className="supplier-dashboard">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="supplier-header">

                <div>

                    <h1>
                        Supplier Dashboard
                    </h1>

                    <p>
                        Manage your products,
                        inventory and orders.
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={openAddProduct}
                >
                    + Add Product
                </button>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="error-box">

                    <span>
                        {error}
                    </span>

                    <button
                        onClick={loadDashboard}
                        className="retry-button"
                    >
                        Retry
                    </button>

                </div>
            )}

            {/* =================================================
                PROFILE
            ================================================= */}

            {profile && (

                <div className="supplier-profile">

                    <div className="profile-info">

                        <strong>
                            {profile.company_name}
                        </strong>

                        <span>
                            {profile.contact_person}
                        </span>

                    </div>

                    <div className="profile-status">

                        Status:

                        <strong>
                            {" "}
                            {profile.status}
                        </strong>

                    </div>

                </div>
            )}

            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="stats-grid">

                <div className="stat-card">

                    <span>
                        Total Products
                    </span>

                    <strong>
                        {stats.totalProducts}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Total Stock
                    </span>

                    <strong>
                        {stats.totalStock}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Orders Received
                    </span>

                    <strong>
                        {stats.ordersReceived}
                    </strong>

                </div>

                <div className="stat-card">

                    <span>
                        Pending Orders
                    </span>

                    <strong>
                        {stats.pendingOrders}
                    </strong>

                </div>

                <div className="stat-card revenue">

                    <span>
                        Total Revenue
                    </span>

                    <strong>
                        ETB
                        {Number(
                            stats.totalRevenue
                        ).toFixed(2)}
                    </strong>

                </div>

            </div>

            {/* =================================================
                PRODUCTS
            ================================================= */}

            <section className="dashboard-section">

                <div className="section-header">

                    <div>

                        <h2>
                            My Products
                        </h2>

                        <p>
                            Products you are
                            currently supplying
                        </p>

                    </div>

                    <span className="count-badge">
                        {products.length} Products
                    </span>

                </div>

                {products.length === 0 ? (

                    <div className="empty-state">

                        <h3>
                            No products yet
                        </h3>

                        <p>
                            Add your first product
                            to start supplying
                            the cooperative.
                        </p>

                        <button
                            className="primary-button"
                            onClick={openAddProduct}
                        >
                            Add Product
                        </button>

                    </div>

                ) : (

                    <div className="product-grid">

                        {products.map(
                            product => (

                                <div
                                    className="product-card"
                                    key={product.id}
                                >

                                    {product.image_url ? (

                                        <div className="product-image-container">

                                            <img
                                                src={getImageUrl(
                                                    product.image_url
                                                )}
                                                alt={product.name}
                                                className="product-image"
                                            />

                                        </div>

                                    ) : (

                                        <div className="product-image-placeholder">
                                            No Image
                                        </div>
                                    )}

                                    <div className="product-card-top">

                                        <h3>
                                            {product.name}
                                        </h3>

                                        <span
                                            className={
                                                product.is_active
                                                    ? "active"
                                                    : "inactive"
                                            }
                                        >
                                            {product.is_active
                                                ? "Active"
                                                : "Inactive"}
                                        </span>

                                    </div>

                                    <p className="product-description">

                                        {product.description ||
                                            "No description"}

                                    </p>

                                    <div className="product-info">

                                        <span>
                                            Price:
                                            <strong>
                                                {" "}
                                                ETB
                                                {Number(
                                                    product.price
                                                ).toFixed(2)}
                                            </strong>
                                        </span>

                                        <span>
                                            Stock:
                                            <strong>
                                                {" "}
                                                {product.stock}
                                            </strong>
                                        </span>

                                        <span>
                                            Unit:
                                            <strong>
                                                {" "}
                                                {product.unit || "-"}
                                            </strong>
                                        </span>

                                        <span>
                                            Category:
                                            <strong>
                                                {" "}
                                                {product.category_name ||
                                                    "Uncategorized"}
                                            </strong>
                                        </span>

                                    </div>

                                    <div className="product-actions">

                                        <button
                                            onClick={() =>
                                                openEditProduct(
                                                    product
                                                )
                                            }
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="delete-button"
                                            onClick={() =>
                                                handleDelete(
                                                    product.id
                                                )
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>
                            )
                        )}

                    </div>
                )}

            </section>

            {/* =================================================
                ORDERS
            ================================================= */}

                        {/* =====================================
                            VIEW ALL ORDERS BUTTON
                        ===================================== */}

                       <section className="dashboard-section">

    <div className="section-header">

        <div>
            <h2>Orders</h2>

            <p>
                Manage orders containing your products
            </p>
        </div>

        <button
            type="button"
            className="view-orders-button"
            onClick={() => navigate("/supplier/orders")}
        >
            View All Orders
        </button>

    </div>

</section>

            {/* =================================================
                MEMBERS
            ================================================= */}

            {members.length > 0 && (

                <section className="dashboard-section">

                    <div className="section-header">

                        <div>

                            <h2>
                                Cooperative Members
                            </h2>

                            <p>
                                View member financial information
                            </p>

                        </div>

                        <span className="count-badge">
                            {members.length} Members
                        </span>

                    </div>

                    <div className="members-table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Member
                                    </th>

                                    <th>
                                        Membership No.
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Phone
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {members.map(member => {

                                    const resolvedMemberId =
                                        member?.member_id ??
                                        member?.memberId ??
                                        member?.id;

                                    return (

                                        <tr
                                            key={
                                                resolvedMemberId ||
                                                member.user_id
                                            }
                                        >

                                            <td>

                                                <strong>
                                                    {
                                                        member.full_name ||
                                                        member.username ||
                                                        "Unknown Member"
                                                    }
                                                </strong>

                                            </td>

                                            <td>
                                                {
                                                    member.membership_number ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    member.email ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    member.phone ||
                                                    "-"
                                                }
                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        String(
                                                            member.status ||
                                                            "active"
                                                        ).toLowerCase() ===
                                                        "active"
                                                            ? "member-status active"
                                                            : "member-status inactive"
                                                    }
                                                >
                                                    {
                                                        member.status ||
                                                        "Active"
                                                    }
                                                </span>

                                            </td>

                                            <td>

                                                <button
                                                    type="button"
                                                    className="manage-finance-button"
                                                    disabled={
                                                        !resolvedMemberId ||
                                                        financeLoading
                                                    }
                                                    onClick={() =>
                                                        handleManageFinance(
                                                            member
                                                        )
                                                    }
                                                >

                                                    {financeLoading
                                                        ? "Loading..."
                                                        : "Manage Finance"}

                                                </button>

                                            </td>

                                        </tr>

                                    );

                                })}

                            </tbody>

                        </table>

                    </div>

                </section>
            )}

            {/* =================================================
                PRODUCT MODAL
            ================================================= */}

            {showModal && (

                <div className="modal-overlay">

                    <div className="product-modal">

                        <div className="modal-header">

                            <h2>

                                {editingProduct
                                    ? "Edit Product"
                                    : "Add New Product"}

                            </h2>

                            <button
                                type="button"
                                onClick={closeModal}
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={handleSubmit}
                        >

                            <label>
                                Product Name *
                            </label>

                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />

                            <label>
                                Description
                            </label>

                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                            />

                            <div className="form-row">

                                <div>

                                    <label>
                                        Price *
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="price"
                                        value={form.price}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>

                                <div>

                                    <label>
                                        Stock *
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        name="stock"
                                        value={form.stock}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>

                            </div>

                            <div className="form-row">

                                <div>

                                    <label>
                                        Unit
                                    </label>

                                    <input
                                        name="unit"
                                        placeholder="kg, piece, litre..."
                                        value={form.unit}
                                        onChange={handleChange}
                                    />

                                </div>

                                <div>

                                    <label>
                                        Category
                                    </label>

                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                    >

                                        <option value="">
                                            Select category
                                        </option>

                                        {categories.map(
                                            category => (

                                                <option
                                                    key={
                                                        category.id
                                                    }
                                                    value={
                                                        category.id
                                                    }
                                                >
                                                    {
                                                        category.name
                                                    }
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                            </div>

                            <label>
                                Product Photo
                            </label>

                            <input
                                type="file"
                                name="image"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                onChange={handleImageChange}
                            />

                            <small>
                                Maximum size: 5MB
                            </small>

                            {imagePreview && (

                                <div className="image-preview">

                                    <img
                                        src={imagePreview}
                                        alt="Product preview"
                                    />

                                </div>

                            )}

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >

                                    {saving
                                        ? "Saving..."
                                        : editingProduct
                                        ? "Update Product"
                                        : "Add Product"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =================================================
                MEMBER FINANCE MODAL
            ================================================= */}

            {showFinanceModal && (

                <div
                    className="modal-overlay finance-overlay"
                    onClick={closeFinanceModal}
                >

                    <div
                        className="finance-modal"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <h2>
                                    Member Financial Information
                                </h2>

                                {selectedMember && (

                                    <p className="finance-member-name">
                                        {
                                            selectedMember.full_name ||
                                            selectedMember.username ||
                                            "Member"
                                        }
                                    </p>

                                )}

                            </div>

                            <button
                                type="button"
                                onClick={closeFinanceModal}
                            >
                                ×
                            </button>

                        </div>

                        {selectedMember && (

                            <div className="member-information">

                                <div>

                                    <span>
                                        Membership Number
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.membership_number ||
                                            "-"
                                        }
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Email
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.email ||
                                            "-"
                                        }
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Phone
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.phone ||
                                            "-"
                                        }
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Status
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.status ||
                                            "Active"
                                        }
                                    </strong>

                                </div>

                            </div>

                        )}

                        <div className="finance-grid">

                            <div className="finance-card savings-card">

                                <span>
                                    Total Savings
                                </span>

                                <strong>
                                    ETB
                                    {Number(
                                        memberFinancial.savings
                                    ).toFixed(2)}
                                </strong>

                                <small>
                                    Current balance
                                </small>

                            </div>

                            <div className="finance-card shares-card">

                                <span>
                                    Shares
                                </span>

                                <strong>
                                    {
                                        memberFinancial.shares
                                    }
                                </strong>

                                <small>
                                    Total shares owned
                                </small>

                            </div>

                            <div className="finance-card loan-card">

                                <span>
                                    Active Loans
                                </span>

                                <strong>
                                    {
                                        memberFinancial.activeLoans
                                    }
                                </strong>

                                <small>
                                    Currently active
                                </small>

                            </div>

                            <div className="finance-card transaction-card">

                                <span>
                                    Transactions
                                </span>

                                <strong>
                                    {
                                        memberFinancial.transactionCount
                                    }
                                </strong>

                                <small>
                                    Recent transactions
                                </small>

                            </div>

                        </div>

                        <div className="finance-transactions">

                            <div className="finance-section-title">

                                <div>

                                    <h3>
                                        Recent Transactions
                                    </h3>

                                    <p>
                                        Member's latest financial
                                        transactions
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    className="refresh-finance-button"
                                    onClick={
                                        refreshMemberFinance
                                    }
                                    disabled={
                                        financeLoading
                                    }
                                >

                                    {financeLoading
                                        ? "Refreshing..."
                                        : "Refresh"}

                                </button>

                            </div>

                            {memberTransactions.length === 0 ? (

                                <div className="no-transactions">
                                    No transactions found.
                                </div>

                            ) : (

                                <div className="transactions-table-wrapper">

                                    <table>

                                        <thead>

                                            <tr>

                                                <th>
                                                    Date
                                                </th>

                                                <th>
                                                    Type
                                                </th>

                                                <th>
                                                    Amount
                                                </th>

                                                <th>
                                                    Description
                                                </th>

                                                <th>
                                                    Reference
                                                </th>

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {memberTransactions.map(
                                                transaction => (

                                                    <tr
                                                        key={
                                                            transaction.id
                                                        }
                                                    >

                                                        <td>
                                                            {
                                                                transaction.transaction_date
                                                                    ? new Date(
                                                                        transaction.transaction_date
                                                                    ).toLocaleString()
                                                                    : "-"
                                                            }
                                                        </td>

                                                        <td>

                                                            <span
                                                                className={
                                                                    String(
                                                                        transaction.transaction_type ||
                                                                        ""
                                                                    ).toLowerCase() ===
                                                                    "withdrawal"
                                                                        ? "transaction-type withdrawal"
                                                                        : "transaction-type deposit"
                                                                }
                                                            >
                                                                {
                                                                    transaction.transaction_type ||
                                                                    "-"
                                                                }
                                                            </span>

                                                        </td>

                                                        <td>

                                                            <strong>
                                                                ETB
                                                                {Number(
                                                                    transaction.amount ||
                                                                    0
                                                                ).toFixed(2)}
                                                            </strong>

                                                        </td>

                                                        <td>
                                                            {
                                                                transaction.description ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                transaction.reference_number ||
                                                                "-"
                                                            }
                                                        </td>

                                                    </tr>

                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default SupplierDashboard;