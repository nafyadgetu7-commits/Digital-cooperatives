import React, { useEffect, useState } from "react";

import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Spinner,
    Alert,
    Form,
    Badge
} from "react-bootstrap";

import {
    FaShoppingCart,
    FaTrash,
    FaPlus,
    FaMinus,
    FaArrowLeft,
    FaCreditCard
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import api from "../../services/api";

import "./Cart.css";

const Cart = () => {

    const navigate = useNavigate();

    const [cartItems, setCartItems] = useState([]);

    const [loading, setLoading] = useState(true);

    const [checkingOut, setCheckingOut] = useState(false);

    // =========================================================
    // FETCH CART
    // =========================================================

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {

        try {

            setLoading(true);

            const response =
                await api.get("/customer/cart");

            const data =
                response.data?.cart ||
                response.data?.items ||
                response.data?.data ||
                response.data ||
                [];

            setCartItems(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (error) {

            console.error(
                "CART ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to load cart"
            );

            setCartItems([]);

        } finally {

            setLoading(false);

        }
    };

    // =========================================================
    // MONEY
    // =========================================================

    const formatMoney = (amount) => {

        const value = Number(amount || 0);

        return `${value.toFixed(2)} ETB`;
    };

    // =========================================================
    // GET PRICE
    // =========================================================

    const getPrice = (item) => {

        return Number(
            item.price ??
            item.unit_price ??
            item.product_price ??
            0
        );
    };

    // =========================================================
    // GET QUANTITY
    // =========================================================

    const getQuantity = (item) => {

        return Number(
            item.quantity || 1
        );
    };

    // =========================================================
    // TOTAL
    // =========================================================

    const calculateTotal = () => {

        return cartItems.reduce(
            (total, item) => {

                return total +
                    getPrice(item) *
                    getQuantity(item);

            },
            0
        );
    };

    // =========================================================
    // UPDATE QUANTITY
    // =========================================================

    const updateQuantity = async (
        item,
        newQuantity
    ) => {

        if (newQuantity < 1) {
            return;
        }

        const stock = Number(
            item.stock ?? 999999
        );

        if (newQuantity > stock) {

            toast.warning(
                `Only ${stock} item(s) available`
            );

            return;
        }

        try {

            await api.put(
                `/customer/cart/${item.product_id}`,
                {
                    quantity: newQuantity
                }
            );

            setCartItems(
                previous =>
                    previous.map(
                        cartItem =>
                            cartItem.product_id ===
                            item.product_id
                                ? {
                                    ...cartItem,
                                    quantity:
                                        newQuantity
                                }
                                : cartItem
                    )
            );

        } catch (error) {

            console.error(
                "UPDATE CART ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to update quantity"
            );

        }
    };

    // =========================================================
    // REMOVE ITEM
    // =========================================================

    const removeItem = async (
        item
    ) => {

        try {

            await api.delete(
                `/customer/cart/${item.product_id}`
            );

            setCartItems(
                previous =>
                    previous.filter(
                        cartItem =>
                            cartItem.product_id !==
                            item.product_id
                    )
            );

            toast.success(
                "Product removed from cart"
            );

        } catch (error) {

            console.error(
                "REMOVE CART ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to remove product"
            );
        }
    };

    // =========================================================
    // CHECKOUT
    // =========================================================

    const handleCheckout = async () => {

        if (cartItems.length === 0) {

            toast.warning(
                "Your cart is empty"
            );

            return;
        }

        try {

            setCheckingOut(true);

            const response =
                await api.post(
                    "/customer/checkout"
                );

            if (response.data?.success) {

                const order =
                    response.data.order;

                toast.success(
                    "Order placed successfully!"
                );

                setCartItems([]);

                setTimeout(() => {

                    navigate(
                        "/customer/orders"
                    );

                }, 800);

            } else {

                toast.error(
                    response.data?.message ||
                    "Checkout failed"
                );
            }

        } catch (error) {

            console.error(
                "CHECKOUT ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Checkout failed"
            );

        } finally {

            setCheckingOut(false);
        }
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {

        return (
            <Container
                className="d-flex justify-content-center align-items-center"
                style={{
                    minHeight: "70vh"
                }}
            >

                <div className="text-center">

                    <Spinner
                        animation="border"
                        variant="primary"
                    />

                    <p className="mt-3 text-muted">
                        Loading your cart...
                    </p>

                </div>

            </Container>
        );
    }

    // =========================================================
    // EMPTY CART
    // =========================================================

    if (cartItems.length === 0) {

        return (
            <Container
                className="py-5"
            >

                <Card
                    className="text-center shadow-sm border-0"
                >

                    <Card.Body
                        className="py-5"
                    >

                        <FaShoppingCart
                            size={70}
                            className="text-muted mb-4"
                        />

                        <h3>
                            Your Cart is Empty
                        </h3>

                        <p className="text-muted">
                            Add some products to
                            your cart before checkout.
                        </p>

                        <Button
                            variant="primary"
                            onClick={() =>
                                navigate(
                                    "/customer/products"
                                )
                            }
                        >

                            <FaShoppingCart
                                className="me-2"
                            />

                            Browse Products

                        </Button>

                    </Card.Body>

                </Card>

            </Container>
        );
    }

    // =========================================================
    // CART UI
    // =========================================================

    return (

        <Container
            fluid
            className="cart-page py-4 px-4"
        >

            {/* HEADER */}

            <div
                className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4"
            >

                <div>

                    <h2 className="fw-bold">
                        <FaShoppingCart
                            className="me-2 text-primary"
                        />

                        My Cart
                    </h2>

                    <p className="text-muted mb-0">
                        Review your products
                        before checkout.
                    </p>

                </div>

                <Button
                    variant="outline-primary"
                    onClick={() =>
                        navigate(
                            "/customer/products"
                        )
                    }
                >

                    <FaArrowLeft
                        className="me-2"
                    />

                    Continue Shopping

                </Button>

            </div>

            <Row className="g-4">

                {/* =================================================
                    CART ITEMS
                ================================================= */}

                <Col lg={8}>

                    {cartItems.map(
                        (item) => {

                            const price =
                                getPrice(item);

                            const quantity =
                                getQuantity(item);

                            const subtotal =
                                price *
                                quantity;

                            return (

                                <Card
                                    key={
                                        item.product_id
                                    }
                                    className="cart-item-card mb-3 border-0 shadow-sm"
                                >

                                    <Card.Body>

                                        <Row
                                            className="align-items-center g-3"
                                        >

                                            {/* IMAGE */}

                                            <Col
                                                xs={12}
                                                md={2}
                                            >

                                                <div
                                                    className="cart-image-container"
                                                >

                                                    {item.image_url ||
                                                    item.image ? (

                                                        <img
                                                            src={
                                                                item.image_url ||
                                                                item.image
                                                            }
                                                            alt={
                                                                item.name ||
                                                                "Product"
                                                            }
                                                            className="cart-product-image"
                                                        />

                                                    ) : (

                                                        <FaShoppingCart
                                                            size={40}
                                                            className="text-muted"
                                                        />

                                                    )}

                                                </div>

                                            </Col>

                                            {/* PRODUCT */}

                                            <Col
                                                xs={12}
                                                md={4}
                                            >

                                                <h5 className="fw-bold mb-1">

                                                    {item.name ||
                                                        item.product_name ||
                                                        "Product"}

                                                </h5>

                                                <p className="text-muted mb-1">

                                                    Unit price:

                                                    {" "}

                                                    <strong>
                                                        {formatMoney(
                                                            price
                                                        )}
                                                    </strong>

                                                </p>

                                                {item.stock !==
                                                    undefined && (

                                                    <Badge
                                                        bg="success"
                                                    >
                                                        {item.stock}
                                                        {" "}
                                                        in stock
                                                    </Badge>

                                                )}

                                            </Col>

                                            {/* QUANTITY */}

                                            <Col
                                                xs={12}
                                                md={3}
                                            >

                                                <Form.Label className="fw-semibold">
                                                    Quantity
                                                </Form.Label>

                                                <div
                                                    className="d-flex align-items-center"
                                                >

                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item,
                                                                quantity - 1
                                                            )
                                                        }
                                                        disabled={
                                                            quantity <= 1
                                                        }
                                                    >

                                                        <FaMinus />

                                                    </Button>

                                                    <span
                                                        className="mx-3 fw-bold"
                                                    >
                                                        {quantity}
                                                    </span>

                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item,
                                                                quantity + 1
                                                            )
                                                        }
                                                    >

                                                        <FaPlus />

                                                    </Button>

                                                </div>

                                            </Col>

                                            {/* SUBTOTAL */}

                                            <Col
                                                xs={12}
                                                md={2}
                                                className="text-md-end"
                                            >

                                                <div className="fw-bold text-primary">
                                                    {formatMoney(
                                                        subtotal
                                                    )}
                                                </div>

                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="mt-2"
                                                    onClick={() =>
                                                        removeItem(
                                                            item
                                                        )
                                                    }
                                                >

                                                    <FaTrash
                                                        className="me-1"
                                                    />

                                                    Remove

                                                </Button>

                                            </Col>

                                        </Row>

                                    </Card.Body>

                                </Card>

                            );
                        }
                    )}

                </Col>

                {/* =================================================
                    ORDER SUMMARY
                ================================================= */}

                <Col lg={4}>

                    <Card
                        className="shadow-sm border-0 sticky-summary"
                    >

                        <Card.Body>

                            <h4 className="fw-bold mb-4">
                                Order Summary
                            </h4>

                            <div
                                className="d-flex justify-content-between mb-3"
                            >

                                <span>
                                    Products
                                </span>

                                <strong>
                                    {cartItems.length}
                                </strong>

                            </div>

                            <div
                                className="d-flex justify-content-between mb-3"
                            >

                                <span>
                                    Total Items
                                </span>

                                <strong>
                                    {cartItems.reduce(
                                        (
                                            total,
                                            item
                                        ) =>
                                            total +
                                            getQuantity(
                                                item
                                            ),
                                        0
                                    )}
                                </strong>

                            </div>

                            <hr />

                            <div
                                className="d-flex justify-content-between align-items-center mb-4"
                            >

                                <h5 className="mb-0">
                                    Total
                                </h5>

                                <h4 className="text-primary fw-bold mb-0">
                                    {formatMoney(
                                        calculateTotal()
                                    )}
                                </h4>

                            </div>

                            <Button
                                variant="primary"
                                size="lg"
                                className="w-100"
                                disabled={
                                    checkingOut
                                }
                                onClick={
                                    handleCheckout
                                }
                            >

                                {checkingOut ? (

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
                                        <FaCreditCard
                                            className="me-2"
                                        />

                                        Checkout
                                    </>
                                )}

                            </Button>

                            <p
                                className="text-muted text-center small mt-3 mb-0"
                            >
                                Payment status will
                                initially be unpaid.
                            </p>

                        </Card.Body>

                    </Card>

                </Col>

            </Row>

        </Container>
    );
};

export default Cart;