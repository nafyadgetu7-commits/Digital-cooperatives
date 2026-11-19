import React, { useEffect, useState } from "react";
import "./Orders.css";

import {
    Container,
    Card,
    Table,
    Badge,
    Button,
    Spinner,
    Alert,
    Row,
    Col,
} from "react-bootstrap";

import {
    FaShoppingBag,
    FaArrowLeft,
    FaEye,
    FaBoxOpen,
    FaSync,
} from "react-icons/fa";

import {
    useNavigate,
} from "react-router-dom";

import {
    toast,
} from "react-toastify";

import api from "../../services/api";


// ============================================================
// ORDERS
// ============================================================

const Orders = () => {

    const navigate = useNavigate();

    // ========================================================
    // STATE
    // ========================================================

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    // ========================================================
    // FETCH ORDERS
    // ========================================================

    useEffect(() => {

        fetchOrders();

    }, []);


    const fetchOrders = async () => {

        try {

            setLoading(true);

            setError("");

            console.log(
                "CUSTOMER: GET ORDERS"
            );

            const response = await api.get(
                "/customer/orders"
            );

            console.log(
                "CUSTOMER ORDERS RESPONSE:",
                response.data
            );


            const data =
                response.data?.orders ||
                response.data?.data ||
                response.data ||
                [];


            if (Array.isArray(data)) {

                setOrders(data);

            } else {

                setOrders([]);

            }

        } catch (error) {

            console.error(
                "ORDERS ERROR:",
                error
            );


            const message =
                error.response?.data?.message ||
                "Failed to load your orders";


            setError(message);

            setOrders([]);

            toast.error(message);

        } finally {

            setLoading(false);

        }

    };


    // ========================================================
    // FORMAT MONEY
    // ========================================================

    const formatMoney = (amount) => {

        const value = Number(amount || 0);

        return value.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        ) + " ETB";

    };


    // ========================================================
    // FORMAT DATE
    // ========================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        try {

            return new Date(date).toLocaleString(
                "en-US",
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );

        } catch {

            return date;

        }

    };


    // ========================================================
    // ORDER STATUS
    // ========================================================

    const getStatusVariant = (status) => {

        switch (
            String(status || "").toLowerCase()
        ) {

            case "pending":
                return "warning";

            case "processing":
                return "primary";

            case "shipped":
                return "info";

            case "delivered":
                return "success";

            case "completed":
                return "success";

            case "cancelled":
                return "danger";

            default:
                return "secondary";

        }

    };


    // ========================================================
    // PAYMENT STATUS
    // ========================================================

    const getPaymentVariant = (
        paymentStatus
    ) => {

        switch (
            String(paymentStatus || "").toLowerCase()
        ) {

            case "paid":
                return "success";

            case "unpaid":
                return "warning";

            case "failed":
                return "danger";

            default:
                return "secondary";

        }

    };


    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {

        return (

            <Container
                fluid
                className="d-flex justify-content-center align-items-center"
                style={{
                    minHeight: "70vh",
                }}
            >

                <div className="text-center">

                    <Spinner
                        animation="border"
                        variant="primary"
                        style={{
                            width: "3rem",
                            height: "3rem",
                        }}
                    />

                    <p className="mt-3 text-muted">
                        Loading your orders...
                    </p>

                </div>

            </Container>

        );

    }


    // ========================================================
    // PAGE
    // ========================================================

    return (

        <Container
            fluid
            className="py-4 px-3 px-md-4"
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <div
                className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4"
            >

                <div>

                    <div className="d-flex align-items-center gap-3">

                        <div
                            className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center"
                            style={{
                                width: "50px",
                                height: "50px",
                            }}
                        >

                            <FaShoppingBag
                                size={22}
                            />

                        </div>

                        <div>

                            <h2 className="fw-bold mb-1">
                                My Orders
                            </h2>

                            <p className="text-muted mb-0">
                                View and track your orders
                            </p>

                        </div>

                    </div>

                </div>


                <div className="d-flex gap-2">

                    <Button
                        variant="outline-primary"
                        onClick={fetchOrders}
                    >

                        <FaSync className="me-2" />

                        Refresh

                    </Button>


                    <Button
                        variant="secondary"
                        onClick={() =>
                            navigate("/customer")
                        }
                    >

                        <FaArrowLeft className="me-2" />

                        Dashboard

                    </Button>

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (

                <Alert
                    variant="danger"
                    className="d-flex justify-content-between align-items-center"
                >

                    <span>

                        <strong>
                            Error:
                        </strong>{" "}

                        {error}

                    </span>


                    <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={fetchOrders}
                    >
                        Retry
                    </Button>

                </Alert>

            )}


            {/* ==================================================
                SUMMARY
            ================================================== */}

            <Row className="g-3 mb-4">

                <Col
                    xs={12}
                    md={4}
                >

                    <Card className="border-0 shadow-sm h-100">

                        <Card.Body>

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <small className="text-muted">
                                        Total Orders
                                    </small>

                                    <h3 className="fw-bold mb-0 text-primary">
                                        {orders.length}
                                    </h3>

                                </div>

                                <FaShoppingBag
                                    size={35}
                                    className="text-primary"
                                />

                            </div>

                        </Card.Body>

                    </Card>

                </Col>


                <Col
                    xs={12}
                    md={4}
                >

                    <Card className="border-0 shadow-sm h-100">

                        <Card.Body>

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <small className="text-muted">
                                        Completed
                                    </small>

                                    <h3 className="fw-bold mb-0 text-success">

                                        {
                                            orders.filter(
                                                (order) =>
                                                    String(
                                                        order.status
                                                    ).toLowerCase() ===
                                                    "completed" ||
                                                    String(
                                                        order.status
                                                    ).toLowerCase() ===
                                                    "delivered"
                                            ).length
                                        }

                                    </h3>

                                </div>

                                <FaBoxOpen
                                    size={35}
                                    className="text-success"
                                />

                            </div>

                        </Card.Body>

                    </Card>

                </Col>


                <Col
                    xs={12}
                    md={4}
                >

                    <Card className="border-0 shadow-sm h-100">

                        <Card.Body>

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <small className="text-muted">
                                        Total Spent
                                    </small>

                                    <h3 className="fw-bold mb-0 text-warning">

                                        {
                                            formatMoney(
                                                orders.reduce(
                                                    (
                                                        total,
                                                        order
                                                    ) =>
                                                        total +
                                                        Number(
                                                            order.total_amount ||
                                                            0
                                                        ),
                                                    0
                                                )
                                            )
                                        }

                                    </h3>

                                </div>

                                <span
                                    style={{
                                        fontSize: "30px",
                                    }}
                                >
                                    💰
                                </span>

                            </div>

                        </Card.Body>

                    </Card>

                </Col>

            </Row>


            {/* ==================================================
                ORDERS TABLE
            ================================================== */}

            <Card className="border-0 shadow-sm">

                <Card.Body className="p-0">

                    <div
                        className="p-4 border-bottom"
                    >

                        <h4 className="fw-bold mb-1">
                            Order History
                        </h4>

                        <p className="text-muted mb-0">
                            Your recent orders
                        </p>

                    </div>


                    <div className="table-responsive">

                        <Table
                            hover
                            className="mb-0 align-middle"
                        >

                            <thead
                                className="table-light"
                            >

                                <tr>

                                    <th className="px-4">
                                        #
                                    </th>

                                    <th>
                                        Order Number
                                    </th>

                                    <th>
                                        Date
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Payment
                                    </th>

                                    <th className="text-center">
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {orders.length > 0 ? (

                                    orders.map(
                                        (order, index) => (

                                            <tr
                                                key={
                                                    order.id ||
                                                    order.order_number ||
                                                    index
                                                }
                                            >

                                                <td className="px-4 fw-semibold">
                                                    {index + 1}
                                                </td>


                                                <td>

                                                    <strong>
                                                        {
                                                            order.order_number ||
                                                            `ORDER-${order.id}`
                                                        }
                                                    </strong>

                                                </td>


                                                <td>

                                                    {formatDate(
                                                        order.order_date
                                                    )}

                                                </td>


                                                <td>

                                                    <strong className="text-primary">

                                                        {
                                                            formatMoney(
                                                                order.total_amount
                                                            )
                                                        }

                                                    </strong>

                                                </td>


                                                <td>

                                                    <Badge
                                                        bg={getStatusVariant(
                                                            order.status
                                                        )}
                                                        className="px-3 py-2"
                                                    >

                                                        {
                                                            order.status ||
                                                            "pending"
                                                        }

                                                    </Badge>

                                                </td>


                                                <td>

                                                    <Badge
                                                        bg={getPaymentVariant(
                                                            order.payment_status
                                                        )}
                                                        className="px-3 py-2"
                                                    >

                                                        {
                                                            order.payment_status ||
                                                            "unpaid"
                                                        }

                                                    </Badge>

                                                </td>


                                                <td className="text-center">

                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() =>
                                                            toast.info(
                                                                `Order ${order.order_number || order.id}`
                                                            )
                                                        }
                                                    >

                                                        <FaEye className="me-1" />

                                                        View

                                                    </Button>

                                                </td>

                                            </tr>

                                        )
                                    )

                                ) : (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="text-center py-5"
                                        >

                                            <FaBoxOpen
                                                size={60}
                                                className="text-muted mb-3"
                                            />

                                            <h5>
                                                No Orders Yet
                                            </h5>

                                            <p className="text-muted">
                                                You haven't placed any orders yet.
                                            </p>

                                            <Button
                                                variant="primary"
                                                onClick={() =>
                                                    navigate(
                                                        "/customer/products"
                                                    )
                                                }
                                            >

                                                <FaShoppingBag className="me-2" />

                                                Browse Products

                                            </Button>

                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </Table>

                    </div>

                </Card.Body>

            </Card>

        </Container>

    );
};


export default Orders;