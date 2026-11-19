import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import "./SupplierOrderDetails.css";

function SupplierOrderDetails() {
    const navigate = useNavigate();

    // ============================================================
    // STATE
    // ============================================================

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [error, setError] = useState("");

    // ============================================================
    // LOAD ALL SUPPLIER ORDERS
    // ============================================================

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError("");

            console.log("Loading supplier orders...");

            const response = await api.get("/supplier/orders");

            console.log(
                "SUPPLIER ORDERS RESPONSE:",
                response.data
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                    "Failed to load supplier orders"
                );
            }

            setOrders(
                response.data.orders || []
            );

        } catch (error) {
            console.error(
                "ORDER DETAILS ERROR:",
                error
            );

            console.error(
                "STATUS:",
                error.response?.status
            );

            console.error(
                "URL:",
                error.config?.url
            );

            console.error(
                "DATA:",
                error.response?.data
            );

            const message =
                error.response?.data?.message ||
                error.message ||
                "Failed to load supplier orders";

            setError(message);
            setOrders([]);

            toast.error(message);

        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {
        loadOrders();
    }, []);

    // ============================================================
    // UPDATE ORDER STATUS
    // ============================================================

    const updateStatus = async (
        orderId,
        status,
        paymentStatus
    ) => {
        try {
            // ----------------------------------------------------
            // CHECK ORDER ID
            // ----------------------------------------------------

            if (
                orderId === undefined ||
                orderId === null ||
                orderId === ""
            ) {
                toast.error(
                    "Invalid order ID."
                );

                return;
            }

            // ----------------------------------------------------
            // PAYMENT CHECK
            // ----------------------------------------------------

            if (
                String(paymentStatus || "")
                    .toLowerCase() !== "paid"
            ) {
                toast.warning(
                    "Payment must be approved before processing this order."
                );

                return;
            }

            // ----------------------------------------------------
            // VALID STATUS
            // ----------------------------------------------------

            const validStatuses = [
                "processing",
                "shipped",
                "delivered",
                "completed"
            ];

            if (
                !validStatuses.includes(status)
            ) {
                toast.error(
                    "Invalid order status."
                );

                return;
            }

            setUpdatingOrderId(
                orderId
            );

            console.log(
                "UPDATING ORDER:",
                orderId,
                status
            );

            // ----------------------------------------------------
            // UPDATE BACKEND
            // ----------------------------------------------------

            const response =
                await api.put(
                    `/supplier/orders/${orderId}/status`,
                    {
                        status
                    }
                );

            console.log(
                "STATUS UPDATE RESPONSE:",
                response.data
            );

            if (
                !response.data?.success
            ) {
                throw new Error(
                    response.data?.message ||
                    "Failed to update order status"
                );
            }

            toast.success(
                `Order status changed to ${status}.`
            );

            // ----------------------------------------------------
            // RELOAD ORDERS
            // ----------------------------------------------------

            await loadOrders();

        } catch (error) {
            console.error(
                "STATUS UPDATE ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Failed to update order status"
            );

        } finally {
            setUpdatingOrderId(null);
        }
    };

    // ============================================================
    // STATUS SELECT
    // ============================================================

    const renderStatusAction = (order) => {
        const paymentApproved =
            String(
                order.payment_status || ""
            ).toLowerCase() === "paid";

        const currentStatus =
            String(
                order.status || "pending"
            ).toLowerCase();

        const isUpdating =
            updatingOrderId === order.id;

        // --------------------------------------------------------
        // PAYMENT NOT APPROVED
        // --------------------------------------------------------

        if (!paymentApproved) {
            return (
                <span className="waiting-payment">
                    Waiting for payment approval
                </span>
            );
        }

        // --------------------------------------------------------
        // COMPLETED
        // --------------------------------------------------------

        if (
            currentStatus === "completed"
        ) {
            return (
                <span className="completed-order">
                    ✓ Completed
                </span>
            );
        }

        // --------------------------------------------------------
        // CANCELLED
        // --------------------------------------------------------

        if (
            currentStatus === "cancelled"
        ) {
            return (
                <span className="cancelled-order">
                    Cancelled
                </span>
            );
        }

        // --------------------------------------------------------
        // STATUS SELECT
        // --------------------------------------------------------

        return (
            <select
                value={currentStatus}
                disabled={isUpdating}
                onChange={(e) =>
                    updateStatus(
                        order.id,
                        e.target.value,
                        order.payment_status
                    )
                }
            >
                <option value="pending">
                    Pending
                </option>

                <option value="processing">
                    Processing
                </option>

                <option value="shipped">
                    Shipped
                </option>

                <option value="delivered">
                    Delivered
                </option>

                <option value="completed">
                    Completed
                </option>
            </select>
        );
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <div className="order-details-page">

                <div className="order-details-loading">

                    <div className="spinner"></div>

                    <p>
                        Loading supplier orders...
                    </p>

                </div>

            </div>
        );
    }

    // ============================================================
    // PAGE
    // ============================================================

    return (
        <div className="order-details-page">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="order-details-header">

                <div>

                    <button
                        type="button"
                        className="back-button"
                        onClick={() =>
                            navigate("/supplier")
                        }
                    >
                        ← Back
                    </button>

                    <h1>
                        Orders
                    </h1>

                    <p>
                        Paid orders containing your products
                    </p>

                </div>

                <div className="orders-count">

                    {orders.length} Orders

                </div>

            </div>

            {/* ====================================================
                ERROR
            ==================================================== */}

            {error && (
                <div className="order-error">

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={loadOrders}
                    >
                        Retry
                    </button>

                </div>
            )}

            {/* ====================================================
                NO ORDERS
            ==================================================== */}

            {!error &&
                orders.length === 0 && (
                    <div className="empty-state">

                        <h2>
                            No paid orders yet
                        </h2>

                        <p>
                            Orders containing your products
                            will appear here after payment
                            has been approved.
                        </p>

                    </div>
                )}

            {/* ====================================================
                ORDERS TABLE
            ==================================================== */}

            {orders.length > 0 && (

                <div className="order-products-card">

                    <div className="orders-table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Order
                                    </th>

                                    <th>
                                        Customer
                                    </th>

                                    <th>
                                        Items
                                    </th>

                                    <th>
                                        Amount
                                    </th>

                                    <th>
                                        Payment
                                    </th>

                                    <th>
                                        Order Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {orders.map(
                                    (order) => {

                                        const paymentApproved =
                                            String(
                                                order.payment_status || ""
                                            ).toLowerCase() === "paid";

                                        const currentStatus =
                                            String(
                                                order.status ||
                                                "pending"
                                            ).toLowerCase();

                                        return (
                                            <tr
                                                key={order.id}
                                            >

                                                {/* ORDER */}

                                                <td>

                                                    <strong
                                                        className="order-number-link"
                                                    >
                                                        {
                                                            order.order_number ||
                                                            `Order #${order.id}`
                                                        }
                                                    </strong>

                                                    {order.order_date && (
                                                        <small
                                                            style={{
                                                                display:
                                                                    "block",
                                                                marginTop:
                                                                    "4px"
                                                            }}
                                                        >
                                                            {new Date(
                                                                order.order_date
                                                            ).toLocaleString()}
                                                        </small>
                                                    )}

                                                </td>

                                                {/* CUSTOMER */}

                                                <td>

                                                    {
                                                        order.customer_name ||
                                                        "N/A"
                                                    }

                                                </td>

                                                {/* ITEMS */}

                                                <td>

                                                    {
                                                        order.total_items ||
                                                        0
                                                    }

                                                </td>

                                                {/* AMOUNT */}

                                                <td>

                                                    $
                                                    {Number(
                                                        order.total_amount ||
                                                        0
                                                    ).toFixed(2)}

                                                </td>

                                                {/* PAYMENT */}

                                                <td>

                                                    <span
                                                        className={
                                                            paymentApproved
                                                                ? "order-payment paid"
                                                                : "order-payment unpaid"
                                                        }
                                                    >

                                                        {paymentApproved
                                                            ? "Approved"
                                                            : (
                                                                order.payment_status ||
                                                                "Unpaid"
                                                            )}

                                                    </span>

                                                </td>

                                                {/* ORDER STATUS */}

                                                <td>

                                                    <span
                                                        className={`order-status ${currentStatus}`}
                                                    >
                                                        {
                                                            currentStatus
                                                        }
                                                    </span>

                                                </td>

                                                {/* ACTION */}

                                                <td>

                                                    {renderStatusAction(
                                                        order
                                                    )}

                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}

        </div>
    );
}

export default SupplierOrderDetails;