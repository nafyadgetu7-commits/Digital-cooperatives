import React, { useEffect, useState } from "react";

import {
  Container,
  Card,
  Button,
  Row,
  Col,
  Spinner,
  Alert,
  Badge,
  Modal,
  Form,
  InputGroup,
} from "react-bootstrap";

import {
  FaShoppingCart,
  FaArrowLeft,
  FaBoxOpen,
  FaMinus,
  FaPlus,
  FaShoppingBag,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import api from "../../services/api";

import "./Products.css";

// ============================================================
// PRODUCTS PAGE
// ============================================================

const Products = () => {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // Selected product for cart
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Add-to-cart loading
  const [addingToCart, setAddingToCart] = useState(false);

  // Modal
  const [showCartModal, setShowCartModal] = useState(false);

  // Cart count
  const [cartCount, setCartCount] = useState(0);

  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================

  useEffect(() => {
    fetchProducts();
    fetchCartCount();
  }, []);

  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("GET PRODUCTS");

      const response = await api.get("/products");

      console.log("PRODUCTS RESPONSE:", response.data);

      const data =
        response.data?.products ||
        response.data?.data ||
        response.data ||
        [];

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("PRODUCTS ERROR:", error);

      const message =
        error.response?.data?.message ||
        "Failed to load products";

      setError(message);

      toast.error(message);

      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FETCH CART COUNT
  // ==========================================================

  const fetchCartCount = async () => {
    try {
      const response = await api.get("/customer/cart");

      console.log("CART RESPONSE:", response.data);

      const cart =
        response.data?.cart ||
        response.data?.items ||
        response.data?.data ||
        [];

      if (Array.isArray(cart)) {
        const totalQuantity = cart.reduce(
          (total, item) =>
            total + Number(item.quantity || 0),
          0
        );

        setCartCount(totalQuantity);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.log(
        "CART COUNT ERROR:",
        error.response?.data || error.message
      );

      setCartCount(0);
    }
  };

  // ==========================================================
  // FORMAT MONEY
  // ==========================================================

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================================
  // OPEN ADD TO CART MODAL
  // ==========================================================

  const handleAddToCartClick = (product) => {
    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      toast.error("This product is out of stock.");
      return;
    }

    setSelectedProduct(product);
    setQuantity(1);
    setShowCartModal(true);
  };

  // ==========================================================
  // CLOSE CART MODAL
  // ==========================================================

  const handleCloseCartModal = () => {
    if (addingToCart) {
      return;
    }

    setShowCartModal(false);
    setSelectedProduct(null);
    setQuantity(1);
  };

  // ==========================================================
  // INCREASE QUANTITY
  // ==========================================================

  const increaseQuantity = () => {
    if (!selectedProduct) {
      return;
    }

    const stock = Number(selectedProduct.stock || 0);

    setQuantity((previous) => {
      if (previous >= stock) {
        toast.warning(
          `Only ${stock} item(s) are available in stock.`
        );

        return stock;
      }

      return previous + 1;
    });
  };

  // ==========================================================
  // DECREASE QUANTITY
  // ==========================================================

  const decreaseQuantity = () => {
    setQuantity((previous) => {
      if (previous <= 1) {
        return 1;
      }

      return previous - 1;
    });
  };

  // ==========================================================
  // MANUAL QUANTITY CHANGE
  // ==========================================================

  const handleQuantityChange = (e) => {
    let value = Number(e.target.value);

    if (!Number.isFinite(value)) {
      value = 1;
    }

    value = Math.floor(value);

    if (value < 1) {
      value = 1;
    }

    if (selectedProduct) {
      const stock = Number(selectedProduct.stock || 0);

      if (value > stock) {
        value = stock;

        toast.warning(
          `Only ${stock} item(s) are available in stock.`
        );
      }
    }

    setQuantity(value);
  };

  // ==========================================================
  // ADD PRODUCT TO CART
  // ==========================================================

  const handleConfirmAddToCart = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product.");
      return;
    }

    const stock = Number(selectedProduct.stock || 0);

    const selectedQuantity = Number(quantity);

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!Number.isInteger(selectedQuantity)) {
      toast.error("Quantity must be a whole number.");
      return;
    }

    if (selectedQuantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (selectedQuantity > stock) {
      toast.error(
        `Only ${stock} item(s) are available in stock.`
      );
      return;
    }

    try {
      setAddingToCart(true);

      console.log("ADDING TO CART:", {
        product_id: selectedProduct.id,
        quantity: selectedQuantity,
      });

      // ======================================================
      // ADD TO CART
      // ======================================================

      const response = await api.post(
        "/customer/cart",
        {
          product_id: Number(selectedProduct.id),
          quantity: selectedQuantity,
        }
      );

      console.log(
        "ADD TO CART RESPONSE:",
        response.data
      );

      const productTotal =
        Number(selectedProduct.price || 0) *
        selectedQuantity;

      toast.success(
        `${selectedProduct.name} added to cart. Total: ${formatMoney(
          productTotal
        )} ETB`
      );

      // Update cart count
      await fetchCartCount();

      // Close modal
      setShowCartModal(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error) {
      console.error(
        "ADD TO CART ERROR:",
        error
      );

      console.error(
        "ADD TO CART RESPONSE:",
        error.response?.data
      );

      const message =
        error.response?.data?.message ||
        "Failed to add product to cart.";

      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  };

  // ==========================================================
  // GO TO CART
  // ==========================================================

  const handleViewCart = () => {
    navigate("/customer/cart");
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Container
        fluid
        className="products-page d-flex justify-content-center align-items-center"
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
            Loading products...
          </p>
        </div>
      </Container>
    );
  }

  // ==========================================================
  // TOTAL SELECTED PRODUCT
  // ==========================================================

  const selectedProductTotal = selectedProduct
    ? Number(selectedProduct.price || 0) *
      Number(quantity || 0)
    : 0;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Container
      fluid
      className="products-page py-4 px-3 px-md-4"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="products-header mb-4">
        <div>
          <h2 className="products-title">
            Available Products
          </h2>

          <p className="products-subtitle">
            Browse products available from the
            cooperative.
          </p>
        </div>

        <div className="products-header-actions">
          {/* CART BUTTON */}

          <Button
            variant="success"
            onClick={handleViewCart}
          >
            <FaShoppingCart className="me-2" />

            My Cart

            {cartCount > 0 && (
              <Badge
                bg="light"
                text="dark"
                className="ms-2"
              >
                {cartCount}
              </Badge>
            )}
          </Button>

          {/* PRODUCT COUNT */}

          <Badge
            bg="primary"
            className="products-count"
          >
            {products.length} Products
          </Badge>

          {/* BACK */}

          <Button
            variant="outline-primary"
            onClick={() =>
              navigate("/customer")
            }
          >
            <FaArrowLeft className="me-2" />

            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <Alert
          variant="warning"
          className="mb-4"
        >
          <strong>Error:</strong> {error}

          <Button
            variant="outline-primary"
            size="sm"
            className="ms-3"
            onClick={fetchProducts}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* ======================================================
          PRODUCTS
      ====================================================== */}

      <Row className="g-4">
        {products.length > 0 ? (
          products.map((product, index) => {
            const stock = Number(
              product.stock || 0
            );

            const price = Number(
              product.price || 0
            );

            return (
              <Col
                key={
                  product.id || index
                }
                xs={12}
                sm={6}
                md={4}
                lg={3}
              >
                <Card className="product-card h-100">
                  {/* ==========================================
                      PRODUCT IMAGE
                  ========================================== */}

                  <div className="product-image-container">
                    {product.image_url ||
                    product.image ? (
                      <img
                        src={
                          product.image_url ||
                          product.image
                        }
                        alt={
                          product.name ||
                          "Product"
                        }
                        className="product-image"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div className="product-image-placeholder d-flex">
                        <FaBoxOpen />
                      </div>
                    )}

                    {/* STOCK */}

                    <div className="product-stock-badge">
                      <Badge
                        bg={
                          stock > 0
                            ? "success"
                            : "danger"
                        }
                      >
                        {stock > 0
                          ? `${stock} in stock`
                          : "Out of stock"}
                      </Badge>
                    </div>
                  </div>

                  {/* ==========================================
                      PRODUCT BODY
                  ========================================== */}

                  <Card.Body>
                    <Card.Title className="product-name">
                      {product.name ||
                        product.product_name ||
                        "Unnamed Product"}
                    </Card.Title>

                    <Card.Text className="product-description">
                      {product.description ||
                        "Cooperative product"}
                    </Card.Text>

                    {/* UNIT */}

                    {product.unit && (
                      <div className="product-unit">
                        Unit:{" "}
                        <strong>
                          {product.unit}
                        </strong>
                      </div>
                    )}

                    {/* PRICE */}

                    <div className="product-price">
                      {formatMoney(price)} ETB
                    </div>

                    {/* ADD CART */}

                    <Button
                      variant="primary"
                      className="add-cart-button w-100"
                      disabled={stock <= 0}
                      onClick={() =>
                        handleAddToCartClick(
                          product
                        )
                      }
                    >
                      <FaShoppingCart className="me-2" />

                      {stock > 0
                        ? "Add to Cart"
                        : "Out of Stock"}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            );
          })
        ) : (
          /* ====================================================
             NO PRODUCTS
          ==================================================== */

          <Col xs={12}>
            <Card className="no-products-card text-center">
              <Card.Body className="py-5">
                <FaBoxOpen
                  size={60}
                  className="text-muted mb-3"
                />

                <h4>
                  No Products Available
                </h4>

                <p className="text-muted">
                  There are currently no
                  products available.
                </p>

                <Button
                  variant="primary"
                  onClick={() =>
                    navigate("/customer")
                  }
                >
                  Back to Dashboard
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* ======================================================
          ADD TO CART MODAL
      ====================================================== */}

      <Modal
        show={showCartModal}
        onHide={handleCloseCartModal}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaShoppingBag className="me-2 text-primary" />

            Add to Cart
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedProduct && (
            <>
              {/* PRODUCT NAME */}

              <h5 className="fw-bold mb-3">
                {selectedProduct.name ||
                  selectedProduct.product_name}
              </h5>

              {/* PRICE */}

              <div className="mb-3">
                Price per item:
                <strong className="text-primary ms-2">
                  {formatMoney(
                    selectedProduct.price
                  )}{" "}
                  ETB
                </strong>
              </div>

              {/* AVAILABLE STOCK */}

              <div className="mb-3">
                Available stock:
                <Badge
                  bg="success"
                  className="ms-2"
                >
                  {selectedProduct.stock}
                </Badge>
              </div>

              {/* QUANTITY */}

              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">
                  Quantity
                </Form.Label>

                <InputGroup>
                  <Button
                    variant="outline-secondary"
                    onClick={
                      decreaseQuantity
                    }
                    disabled={
                      quantity <= 1 ||
                      addingToCart
                    }
                  >
                    <FaMinus />
                  </Button>

                  <Form.Control
                    type="number"
                    min="1"
                    max={
                      selectedProduct.stock
                    }
                    value={quantity}
                    onChange={
                      handleQuantityChange
                    }
                    className="text-center fw-bold"
                    disabled={addingToCart}
                  />

                  <Button
                    variant="outline-secondary"
                    onClick={
                      increaseQuantity
                    }
                    disabled={
                      quantity >=
                        Number(
                          selectedProduct.stock
                        ) ||
                      addingToCart
                    }
                  >
                    <FaPlus />
                  </Button>
                </InputGroup>
              </Form.Group>

              {/* TOTAL */}

              <Card className="border-0 bg-light">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">
                      Total Amount
                    </span>

                    <span className="fw-bold text-success fs-4">
                      {formatMoney(
                        selectedProductTotal
                      )}{" "}
                      ETB
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}
        </Modal.Body>

        {/* MODAL FOOTER */}

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={
              handleCloseCartModal
            }
            disabled={addingToCart}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={
              handleConfirmAddToCart
            }
            disabled={
              addingToCart ||
              !selectedProduct
            }
          >
            {addingToCart ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                  className="me-2"
                />

                Adding...
              </>
            ) : (
              <>
                <FaShoppingCart className="me-2" />

                Add {quantity} to Cart
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Products;