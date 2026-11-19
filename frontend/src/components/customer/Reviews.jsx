import React, { useEffect, useState } from "react";

import {
  Container,
  Card,
  Button,
  Spinner,
  Alert,
  Form,
  Row,
  Col,
} from "react-bootstrap";

import {
  FaArrowLeft,
  FaStar,
  FaComment,
} from "react-icons/fa";

import {
  useNavigate,
} from "react-router-dom";

import {
  toast,
} from "react-toastify";

import api from "../../services/api";

// ============================================================
// REVIEWS
// ============================================================

const Reviews = () => {

  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [rating, setRating] = useState(5);

  const [comment, setComment] = useState("");

  const [saving, setSaving] = useState(false);

  // ==========================================================
  // FETCH REVIEWS
  // ==========================================================

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get("/customer/reviews");

      const data =
        response.data?.reviews ||
        response.data?.data ||
        response.data ||
        [];

      setReviews(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "REVIEWS ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to load reviews";

      setError(message);

      toast.error(message);

      setReviews([]);

    } finally {

      setLoading(false);

    }
  };

  // ==========================================================
  // SUBMIT REVIEW
  // ==========================================================

  const handleSubmitReview = async (
    e
  ) => {

    e.preventDefault();

    if (!comment.trim()) {

      toast.error(
        "Please enter your review"
      );

      return;
    }

    try {

      setSaving(true);

      await api.post(
        "/customer/reviews",
        {
          rating: Number(rating),
          comment: comment.trim(),
        }
      );

      toast.success(
        "Review submitted successfully"
      );

      setComment("");
      setRating(5);

      await fetchReviews();

    } catch (error) {

      console.error(
        "SUBMIT REVIEW ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to submit review";

      toast.error(message);

    } finally {

      setSaving(false);

    }
  };

  // ==========================================================
  // STAR DISPLAY
  // ==========================================================

  const displayStars = (value) => {

    const number =
      Number(value || 0);

    return (

      <div>

        {[1, 2, 3, 4, 5].map(
          (star) => (

            <FaStar
              key={star}
              className={
                star <= number
                  ? "text-warning"
                  : "text-muted"
              }
            />

          )
        )}

      </div>
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "70vh",
        }}
      >

        <div className="text-center">

          <Spinner
            animation="border"
            variant="primary"
          />

          <p className="mt-3 text-muted">
            Loading your reviews...
          </p>

        </div>

      </Container>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (

    <Container
      fluid
      className="py-4 px-4"
    >

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">

        <div>

          <h2 className="fw-bold">

            <FaStar className="me-2 text-warning" />

            My Reviews

          </h2>

          <p className="text-muted mb-0">
            View and submit your product reviews.
          </p>

        </div>

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

      {/* ERROR */}

      {error && (

        <Alert
          variant="warning"
          className="d-flex justify-content-between align-items-center"
        >

          <span>
            {error}
          </span>

          <Button
            size="sm"
            variant="outline-primary"
            onClick={fetchReviews}
          >
            Retry
          </Button>

        </Alert>

      )}

      <Row className="g-4">

        {/* ==================================================
            ADD REVIEW
        ================================================== */}

        <Col
          lg={5}
        >

          <Card
            className="border-0 shadow-sm"
          >

            <Card.Header>

              <h5 className="mb-0">

                <FaComment className="me-2 text-primary" />

                Write a Review

              </h5>

            </Card.Header>

            <Card.Body>

              <Form
                onSubmit={
                  handleSubmitReview
                }
              >

                {/* RATING */}

                <Form.Group className="mb-4">

                  <Form.Label>
                    Rating
                  </Form.Label>

                  <Form.Select
                    value={rating}
                    onChange={(e) =>
                      setRating(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >

                    <option value="5">
                      ⭐⭐⭐⭐⭐ - Excellent
                    </option>

                    <option value="4">
                      ⭐⭐⭐⭐ - Very Good
                    </option>

                    <option value="3">
                      ⭐⭐⭐ - Good
                    </option>

                    <option value="2">
                      ⭐⭐ - Fair
                    </option>

                    <option value="1">
                      ⭐ - Poor
                    </option>

                  </Form.Select>

                </Form.Group>

                {/* COMMENT */}

                <Form.Group className="mb-4">

                  <Form.Label>
                    Your Review
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={5}
                    placeholder="Write your review..."
                    value={comment}
                    onChange={(e) =>
                      setComment(
                        e.target.value
                      )
                    }
                  />

                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={saving}
                >

                  {saving
                    ? "Submitting..."
                    : "Submit Review"}

                </Button>

              </Form>

            </Card.Body>

          </Card>

        </Col>

        {/* ==================================================
            MY REVIEWS
        ================================================== */}

        <Col
          lg={7}
        >

          <Card
            className="border-0 shadow-sm"
          >

            <Card.Header>

              <h5 className="mb-0">
                My Reviews
              </h5>

            </Card.Header>

            <Card.Body>

              {reviews.length === 0 ? (

                <div className="text-center py-5">

                  <FaStar
                    size={60}
                    className="text-muted mb-3"
                  />

                  <h5>
                    No Reviews Yet
                  </h5>

                  <p className="text-muted">
                    You haven't submitted
                    any reviews yet.
                  </p>

                </div>

              ) : (

                reviews.map(
                  (review, index) => (

                    <Card
                      key={
                        review.id ||
                        index
                      }
                      className="mb-3 border"
                    >

                      <Card.Body>

                        <div className="d-flex justify-content-between align-items-start">

                          <div>

                            <h6 className="fw-bold">

                              {review.product_name ||
                                "Product"}

                            </h6>

                            {displayStars(
                              review.rating
                            )}

                          </div>

                          <small className="text-muted">

                            {review.created_at
                              ? new Date(
                                  review.created_at
                                ).toLocaleDateString()
                              : ""}

                          </small>

                        </div>

                        <p className="mt-3 mb-0">

                          {review.comment ||
                            review.review ||
                            "No comment"}

                        </p>

                      </Card.Body>

                    </Card>

                  )
                )

              )}

            </Card.Body>

          </Card>

        </Col>

      </Row>

    </Container>
  );
};

export default Reviews;