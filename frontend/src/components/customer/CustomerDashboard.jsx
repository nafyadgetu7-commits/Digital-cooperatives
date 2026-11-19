import React, { useEffect, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Badge,
  Modal,
  Form,
  Alert,
} from "react-bootstrap";

import {
  FaShoppingCart,
  FaDollarSign,
  FaClock,
  FaTruck,
  FaBoxOpen,
  FaArrowRight,
  FaStar,
  FaCreditCard,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaWallet,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import api from "../../services/api";

import { useAuth } from "../../context/AuthContext";

import "./CustomerDashboard.css";


const CustomerDashboard = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  // ============================================================
  // STATE
  // ============================================================

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    activeOrders: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);

  const [cartCount, setCartCount] = useState(0);

  const [loading, setLoading] = useState(true);

  // ============================================================
  // PAYMENT STATE
  // ============================================================

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [transactionId, setTransactionId] =
    useState("");

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  // ============================================================
  // FETCH DATA
  // ============================================================

  useEffect(() => {
    fetchDashboardData();
    fetchCartCount();
  }, []);

  // ============================================================
  // FETCH DASHBOARD
  // ============================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [statsResponse, ordersResponse] =
        await Promise.all([
          api.get("/customer/stats"),
          api.get("/customer/recent-orders"),
        ]);

      // --------------------------------------------------------
      // STATS
      // --------------------------------------------------------

      const statsData =
        statsResponse.data?.stats ||
        statsResponse.data?.data ||
        statsResponse.data ||
        {};

      setStats({
        totalOrders: Number(
          statsData.totalOrders ??
          statsData.total_orders ??
          0
        ),

        totalSpent: Number(
          statsData.totalSpent ??
          statsData.total_spent ??
          0
        ),

        pendingOrders: Number(
          statsData.pendingOrders ??
          statsData.pending_orders ??
          0
        ),

        activeOrders: Number(
          statsData.activeOrders ??
          statsData.active_orders ??
          0
        ),
      });

      // --------------------------------------------------------
      // RECENT ORDERS
      // --------------------------------------------------------

      const ordersData =
        ordersResponse.data?.orders ||
        ordersResponse.data?.data ||
        ordersResponse.data ||
        [];

      setRecentOrders(
        Array.isArray(ordersData)
          ? ordersData
          : []
      );

    } catch (error) {
      console.error(
        "CUSTOMER DASHBOARD ERROR:",
        error
      );

      setStats({
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        activeOrders: 0,
      });

      setRecentOrders([]);

      const message =
        error.response?.data?.message;

      if (message) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH CART COUNT
  // ============================================================

  const fetchCartCount = async () => {
    try {
      const response = await api.get(
        "/customer/cart"
      );

      const cartData =
        response.data?.cart ||
        response.data?.items ||
        response.data?.data ||
        [];

      if (Array.isArray(cartData)) {
        const count = cartData.reduce(
          (total, item) =>
            total +
            Number(item.quantity || 0),
          0
        );

        setCartCount(count);
      } else {
        setCartCount(0);
      }

    } catch (error) {
      console.error(
        "CART COUNT ERROR:",
        error
      );

      setCartCount(0);
    }
  };

  // ============================================================
  // FORMAT MONEY
  // ============================================================

  const formatMoney = (amount) => {
    const value = Number(amount || 0);

    return `${value.toFixed(2)} ETB`;
  };

  // ============================================================
  // ORDER STATUS
  // ============================================================

  const getStatusClass = (status) => {
    const value = String(
      status || ""
    ).toLowerCase();

    switch (value) {
      case "pending":
        return "badge bg-warning text-dark";

      case "processing":
        return "badge bg-info text-dark";

      case "confirmed":
        return "badge bg-primary";

      case "shipped":
        return "badge bg-primary";

      case "delivered":
        return "badge bg-success";

      case "completed":
        return "badge bg-success";

      case "cancelled":
        return "badge bg-danger";

      default:
        return "badge bg-secondary";
    }
  };

  // ============================================================
  // PAYMENT STATUS
  // ============================================================

  const getPaymentStatusClass = (
    paymentStatus
  ) => {
    const value = String(
      paymentStatus || "unpaid"
    ).toLowerCase();

    switch (value) {
      case "paid":
      case "completed":
        return "payment-status paid";

      case "failed":
        return "payment-status failed";

      default:
        return "payment-status unpaid";
    }
  };

  // ============================================================
  // PAYMENT STATUS TEXT
  // ============================================================

  const getPaymentStatusText = (
    paymentStatus
  ) => {
    const value = String(
      paymentStatus || "unpaid"
    ).toLowerCase();

    switch (value) {
      case "paid":
      case "completed":
        return "Paid";

      case "failed":
        return "Failed";

      default:
        return "Unpaid";
    }
  };

  // ============================================================
  // OPEN CART
  // ============================================================

  const openCart = () => {
    navigate("/customer/cart");
  };

  // ============================================================
  // OPEN PAYMENT MODAL
  // ============================================================

  const openPaymentModal = (order) => {
    if (!order?.id) {
      toast.error(
        "Invalid order. Cannot make payment."
      );

      return;
    }

    setSelectedOrder(order);

    setPaymentMethod("");

    setTransactionId("");

    setShowPaymentModal(true);
  };

  // ============================================================
  // CLOSE PAYMENT MODAL
  // ============================================================

  const closePaymentModal = () => {
    if (paymentLoading) {
      return;
    }

    setShowPaymentModal(false);

    setSelectedOrder(null);

    setPaymentMethod("");

    setTransactionId("");
  };

  // ============================================================
  // MAKE PAYMENT
  // ============================================================

  const handlePayment = async (event) => {
    event.preventDefault();

    if (!selectedOrder?.id) {
      toast.error(
        "Invalid order."
      );

      return;
    }

    if (!paymentMethod) {
      toast.error(
        "Please select a payment method."
      );

      return;
    }

    const amount = Number(
      selectedOrder.total_amount || 0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(
        "Invalid payment amount."
      );

      return;
    }

    // Transaction ID is especially useful for
    // bank transfer and mobile money.
    if (
      (
        paymentMethod === "bank_transfer" ||
        paymentMethod === "mobile_money"
      ) &&
      !transactionId.trim()
    ) {
      toast.error(
        "Please enter the transaction/reference ID."
      );

      return;
    }

    try {
      setPaymentLoading(true);

      const response = await api.post(
        `/customer/orders/${selectedOrder.id}/payment`,
        {
          payment_method: paymentMethod,

          amount: amount,

          transaction_id:
            transactionId.trim() || null,
        }
      );

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data?.message ||
          "Payment failed."
        );
      }

      toast.success(
        response.data?.message ||
        "Payment submitted successfully."
      );

      closePaymentModal();

      // Refresh dashboard
      await fetchDashboardData();

    } catch (error) {
      console.error(
        "CUSTOMER PAYMENT ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        error.message ||
        "Payment failed. Please try again.";

      toast.error(message);

    } finally {
      setPaymentLoading(false);
    }
  };

  // ============================================================
  // PAYMENT METHOD ICON
  // ============================================================

  const getPaymentMethodIcon = (
    method
  ) => {
    switch (method) {
      case "credit_card":
        return <FaCreditCard />;

      case "debit_card":
        return <FaCreditCard />;

      case "bank_transfer":
        return <FaUniversity />;

      case "mobile_money":
        return <FaMobileAlt />;

      case "cash":
        return <FaMoneyBillWave />;

      default:
        return <FaWallet />;
    }
  };

  // ============================================================
  // PAYMENT METHOD LABEL
  // ============================================================

  const getPaymentMethodLabel = (
    method
  ) => {
    switch (method) {
      case "credit_card":
        return "Credit Card";

      case "debit_card":
        return "Debit Card";

      case "bank_transfer":
        return "Bank Transfer";

      case "mobile_money":
        return "Mobile Money";

      case "cash":
        return "Cash";

      default:
        return method;
    }
  };

  // ============================================================
  // CHECK WHETHER ORDER CAN BE PAID
  // ============================================================

  const canPayOrder = (order) => {
    if (!order) {
      return false;
    }

    const paymentStatus =
      String(
        order.payment_status || "unpaid"
      ).toLowerCase();

    const status =
      String(
        order.status || ""
      ).toLowerCase();

    if (
      paymentStatus === "paid" ||
      paymentStatus === "completed"
    ) {
      return false;
    }

    if (
      status === "cancelled"
    ) {
      return false;
    }

    return true;
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="customer-dashboard loading-dashboard">

        <div className="text-center">

          <Spinner
            animation="border"
            variant="primary"
          />

          <p className="mt-3 text-muted">
            Loading your dashboard...
          </p>

        </div>

      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="customer-dashboard">

      <Container fluid>

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="dashboard-header">

          <div>

            <h1 className="dashboard-title">

              Welcome back,{" "}

              {user?.full_name ||
                user?.username ||
                "Customer"}!

            </h1>

            <p className="dashboard-subtitle">
              Here's what's happening with
              your account today.
            </p>

          </div>

          <div className="d-flex gap-2 flex-wrap">

            {/* CART */}

            <Button
              variant="outline-primary"
              onClick={openCart}
              className="position-relative"
            >

              <FaShoppingCart className="me-2" />

              My Cart

              {cartCount > 0 && (
                <Badge
                  bg="danger"
                  pill
                  className="ms-2"
                >
                  {cartCount}
                </Badge>
              )}

            </Button>

            {/* PRODUCTS */}

            <Button
              className="browse-btn"
              variant="primary"
              onClick={() =>
                navigate(
                  "/customer/products"
                )
              }
            >

              <FaShoppingCart className="me-2" />

              Browse Products

            </Button>

          </div>

        </div>

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <Row className="stats-row g-4">

          {/* TOTAL ORDERS */}

          <Col xl={3} md={6}>

            <Card className="stat-card">

              <Card.Body className="stat-card-body">

                <div className="stat-icon blue">
                  <FaShoppingCart />
                </div>

                <div className="stat-info">

                  <div className="stat-label">
                    Total Orders
                  </div>

                  <h2 className="stat-value">
                    {stats.totalOrders}
                  </h2>

                </div>

              </Card.Body>

            </Card>

          </Col>

          {/* TOTAL SPENT */}

          <Col xl={3} md={6}>

            <Card className="stat-card">

              <Card.Body className="stat-card-body">

                <div className="stat-icon green">
                  <FaDollarSign />
                </div>

                <div className="stat-info">

                  <div className="stat-label">
                    Total Spent
                  </div>

                  <h2 className="stat-value">
                    {formatMoney(
                      stats.totalSpent
                    )}
                  </h2>

                </div>

              </Card.Body>

            </Card>

          </Col>

          {/* PENDING ORDERS */}

          <Col xl={3} md={6}>

            <Card className="stat-card">

              <Card.Body className="stat-card-body">

                <div className="stat-icon yellow">
                  <FaClock />
                </div>

                <div className="stat-info">

                  <div className="stat-label">
                    Pending Orders
                  </div>

                  <h2 className="stat-value">
                    {stats.pendingOrders}
                  </h2>

                </div>

              </Card.Body>

            </Card>

          </Col>

          {/* ACTIVE ORDERS */}

          <Col xl={3} md={6}>

            <Card className="stat-card">

              <Card.Body className="stat-card-body">

                <div className="stat-icon cyan">
                  <FaTruck />
                </div>

                <div className="stat-info">

                  <div className="stat-label">
                    Active Orders
                  </div>

                  <h2 className="stat-value">
                    {stats.activeOrders}
                  </h2>

                </div>

              </Card.Body>

            </Card>

          </Col>

        </Row>

        {/* ====================================================
            RECENT ORDERS + QUICK ACTIONS
        ==================================================== */}

        <Row className="g-4 mt-1">

          {/* ==================================================
              RECENT ORDERS
          ================================================== */}

          <Col lg={8}>

            <Card className="dashboard-card">

              <Card.Header className="dashboard-card-header">

                <h5 className="dashboard-card-title">

                  <FaBoxOpen className="me-2 text-primary" />

                  Recent Orders

                </h5>

                <Button
                  variant="link"
                  size="sm"
                  onClick={() =>
                    navigate(
                      "/customer/orders"
                    )
                  }
                >
                  View All
                </Button>

              </Card.Header>

              <Card.Body className="dashboard-card-body">

                {recentOrders.length === 0 ? (

                  <div className="empty-orders">

                    <div className="empty-orders-icon">
                      <FaBoxOpen />
                    </div>

                    <h6>
                      No orders yet
                    </h6>

                    <p>
                      Start shopping to see
                      your orders here.
                    </p>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(
                          "/customer/products"
                        )
                      }
                    >
                      Browse Products
                    </Button>

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table orders-table mb-0">

                      <thead>

                        <tr>

                          <th>
                            Order
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Total
                          </th>

                          <th>
                            Order Status
                          </th>

                          <th>
                            Payment
                          </th>

                          <th>
                            Action
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {recentOrders.map(
                          (order, index) => {

                            const paymentStatus =
                              order.payment_status ||
                              "unpaid";

                            return (
                              <tr
                                key={
                                  order.id ||
                                  index
                                }
                              >

                                {/* ORDER */}

                                <td>

                                  <strong>
                                    {order.order_number ||
                                      `Order #${order.id}`}
                                  </strong>

                                </td>

                                {/* DATE */}

                                <td>

                                  {order.order_date
                                    ? new Date(
                                        order.order_date
                                      ).toLocaleDateString()
                                    : order.created_at
                                    ? new Date(
                                        order.created_at
                                      ).toLocaleDateString()
                                    : "-"}

                                </td>

                                {/* TOTAL */}

                                <td>

                                  <strong>
                                    {formatMoney(
                                      order.total_amount ||
                                      order.total ||
                                      0
                                    )}
                                  </strong>

                                </td>

                                {/* ORDER STATUS */}

                                <td>

                                  <span
                                    className={getStatusClass(
                                      order.status
                                    )}
                                  >

                                    {order.status ||
                                      "Unknown"}

                                  </span>

                                </td>

                                {/* PAYMENT STATUS */}

                                <td>

                                  <span
                                    className={getPaymentStatusClass(
                                      paymentStatus
                                    )}
                                  >

                                    {paymentStatus ===
                                      "paid" ||
                                    paymentStatus ===
                                      "completed" ? (
                                      <FaCheckCircle className="me-1" />
                                    ) : paymentStatus ===
                                      "failed" ? (
                                      <FaTimesCircle className="me-1" />
                                    ) : (
                                      <FaClock className="me-1" />
                                    )}

                                    {getPaymentStatusText(
                                      paymentStatus
                                    )}

                                  </span>

                                </td>

                                {/* ACTION */}

                                <td>

                                  {canPayOrder(
                                    order
                                  ) ? (

                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="pay-now-btn"
                                      onClick={() =>
                                        openPaymentModal(
                                          order
                                        )
                                      }
                                    >

                                      <FaCreditCard className="me-1" />

                                      Pay Now

                                    </Button>

                                  ) : (

                                    <span className="text-muted small">

                                      {paymentStatus ===
                                        "paid" ||
                                      paymentStatus ===
                                        "completed"
                                        ? "Payment Complete"
                                        : "Not Available"}

                                    </span>

                                  )}

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </Card.Body>

            </Card>

          </Col>

          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <Col lg={4}>

            <Card className="dashboard-card">

              <Card.Header className="dashboard-card-header">

                <h5 className="dashboard-card-title">
                  Quick Actions
                </h5>

              </Card.Header>

              <Card.Body className="dashboard-card-body">

                {/* CART */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={openCart}
                >

                  <div className="quick-action-left">

                    <div className="quick-action-icon">
                      <FaShoppingCart />
                    </div>

                    <span>

                      My Cart

                      {cartCount > 0 && (
                        <Badge
                          bg="danger"
                          pill
                          className="ms-2"
                        >
                          {cartCount}
                        </Badge>
                      )}

                    </span>

                  </div>

                  <FaArrowRight
                    className="quick-action-arrow"
                  />

                </button>

                {/* PRODUCTS */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/customer/products"
                    )
                  }
                >

                  <div className="quick-action-left">

                    <div className="quick-action-icon">
                      <FaShoppingCart />
                    </div>

                    Browse Products

                  </div>

                  <FaArrowRight
                    className="quick-action-arrow"
                  />

                </button>

                {/* ORDERS */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/customer/orders"
                    )
                  }
                >

                  <div className="quick-action-left">

                    <div className="quick-action-icon">
                      <FaBoxOpen />
                    </div>

                    View All Orders

                  </div>

                  <FaArrowRight
                    className="quick-action-arrow"
                  />

                </button>

                {/* REVIEWS */}

                <button
                  type="button"
                  className="quick-action"
                  onClick={() =>
                    navigate(
                      "/customer/reviews"
                    )
                  }
                >

                  <div className="quick-action-left">

                    <div className="quick-action-icon">
                      <FaStar />
                    </div>

                    My Reviews

                  </div>

                  <FaArrowRight
                    className="quick-action-arrow"
                  />

                </button>

              </Card.Body>

            </Card>

          </Col>

        </Row>

      </Container>


      {/* ========================================================
          PAYMENT MODAL
      ======================================================== */}

      <Modal
        show={showPaymentModal}
        onHide={closePaymentModal}
        centered
        size="lg"
        backdrop="static"
      >

        <Modal.Header closeButton>

          <Modal.Title>

            <FaCreditCard className="me-2 text-primary" />

            Pay for Order

          </Modal.Title>

        </Modal.Header>

        <Form onSubmit={handlePayment}>

          <Modal.Body>

            {selectedOrder && (

              <>

                {/* ORDER SUMMARY */}

                <div className="payment-order-summary">

                  <div>

                    <small className="text-muted">
                      Order
                    </small>

                    <h5>
                      {selectedOrder.order_number ||
                        `Order #${selectedOrder.id}`}
                    </h5>

                  </div>

                  <div className="text-end">

                    <small className="text-muted">
                      Amount
                    </small>

                    <h4 className="payment-amount">
                      {formatMoney(
                        selectedOrder.total_amount
                      )}
                    </h4>

                  </div>

                </div>


                <Alert
                  variant="info"
                  className="payment-info"
                >

                  <FaWallet className="me-2" />

                  Select how you want to pay
                  for this order.

                </Alert>


                {/* PAYMENT METHODS */}

                <Form.Label className="payment-label">

                  Payment Method

                </Form.Label>

                <div className="payment-method-grid">

                  {/* CREDIT CARD */}

                  <button
                    type="button"
                    className={`payment-method-card ${
                      paymentMethod ===
                      "credit_card"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        "credit_card"
                      )
                    }
                  >

                    <FaCreditCard />

                    <span>
                      Credit Card
                    </span>

                  </button>


                  {/* DEBIT CARD */}

                  <button
                    type="button"
                    className={`payment-method-card ${
                      paymentMethod ===
                      "debit_card"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        "debit_card"
                      )
                    }
                  >

                    <FaCreditCard />

                    <span>
                      Debit Card
                    </span>

                  </button>


                  {/* BANK TRANSFER */}

                  <button
                    type="button"
                    className={`payment-method-card ${
                      paymentMethod ===
                      "bank_transfer"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        "bank_transfer"
                      )
                    }
                  >

                    <FaUniversity />

                    <span>
                      Bank Transfer
                    </span>

                  </button>


                  {/* MOBILE MONEY */}

                  <button
                    type="button"
                    className={`payment-method-card ${
                      paymentMethod ===
                      "mobile_money"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        "mobile_money"
                      )
                    }
                  >

                    <FaMobileAlt />

                    <span>
                      Mobile Money
                    </span>

                  </button>


                  {/* CASH */}

                  <button
                    type="button"
                    className={`payment-method-card ${
                      paymentMethod ===
                      "cash"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        "cash"
                      )
                    }
                  >

                    <FaMoneyBillWave />

                    <span>
                      Cash
                    </span>

                  </button>

                </div>


                {/* TRANSACTION ID */}

                {(
                  paymentMethod ===
                    "bank_transfer" ||
                  paymentMethod ===
                    "mobile_money"
                ) && (

                  <div className="mt-4">

                    <Form.Label>

                      Transaction / Reference ID

                    </Form.Label>

                    <Form.Control
                      type="text"
                      value={transactionId}
                      onChange={(event) =>
                        setTransactionId(
                          event.target.value
                        )
                      }
                      placeholder="Enter transaction reference"
                    />

                    <Form.Text className="text-muted">

                      Enter the transaction/reference
                      number you received after making
                      the transfer.

                    </Form.Text>

                  </div>

                )}


                {/* CARD INFORMATION */}

                {(
                  paymentMethod ===
                    "credit_card" ||
                  paymentMethod ===
                    "debit_card"
                ) && (

                  <Alert
                    variant="warning"
                    className="mt-4"
                  >

                    <strong>
                      Demo payment:
                    </strong>{" "}

                    This option records the payment
                    in the cooperative system. Real
                    card processing requires a payment
                    gateway such as Chapa, Stripe or
                    another supported provider.

                  </Alert>

                )}


                {/* CASH */}

                {paymentMethod ===
                  "cash" && (

                  <Alert
                    variant="warning"
                    className="mt-4"
                  >

                    <FaMoneyBillWave className="me-2" />

                    Cash payments will be recorded
                    as a payment request and can be
                    confirmed by the cooperative
                    administrator.

                  </Alert>

                )}

              </>

            )}

          </Modal.Body>


          <Modal.Footer>

            <Button
              variant="secondary"
              onClick={closePaymentModal}
              disabled={paymentLoading}
            >
              Cancel
            </Button>

            <Button
              variant="success"
              type="submit"
              disabled={
                paymentLoading ||
                !paymentMethod
              }
            >

              {paymentLoading ? (

                <>
                  <Spinner
                    animation="border"
                    size="sm"
                    className="me-2"
                  />

                  Processing...

                </>

              ) : (

                <>
                  <FaCheckCircle className="me-2" />

                  Submit Payment
                </>

              )}

            </Button>

          </Modal.Footer>

        </Form>

      </Modal>

    </div>
  );
};

export default CustomerDashboard;