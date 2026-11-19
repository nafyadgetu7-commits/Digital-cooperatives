import React, { useState } from "react";
import {
    Container,
    Card,
    Form,
    Button,
    Spinner
} from "react-bootstrap";
import {
    Link,
    useNavigate,
    useParams
} from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";

const ResetPassword = () => {

    const { token } = useParams();

    const navigate = useNavigate();

    const [password, setPassword] = useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!password || !confirmPassword) {

            toast.error(
                "Please enter your new password"
            );

            return;
        }

        if (password.length < 6) {

            toast.error(
                "Password must be at least 6 characters"
            );

            return;
        }

        if (password !== confirmPassword) {

            toast.error(
                "Passwords do not match"
            );

            return;
        }

        if (!token) {

            toast.error(
                "Invalid or missing reset token"
            );

            return;
        }

        setLoading(true);

        try {

            const response = await api.post(
                "/auth/reset-password",
                {
                    token,
                    password
                }
            );

            console.log(
                "RESET PASSWORD RESPONSE:",
                response.data
            );

            if (!response.data?.success) {

                toast.error(
                    response.data?.message ||
                    "Failed to reset password"
                );

                return;
            }

            toast.success(
                "Password reset successfully!"
            );

            navigate("/login");

        } catch (error) {

            console.error(
                "RESET PASSWORD ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to reset password"
            );

        } finally {

            setLoading(false);

        }
    };

    return (

        <Container
            className="d-flex justify-content-center align-items-center"
            style={{
                minHeight: "100vh"
            }}
        >

            <Card
                className="shadow"
                style={{
                    width: "100%",
                    maxWidth: "450px"
                }}
            >

                <Card.Body className="p-4">

                    <div className="text-center mb-4">

                        <h2>
                            Digital Cooperative
                        </h2>

                        <p className="text-muted">
                            Management System
                        </p>

                    </div>

                    <h4 className="text-center mb-4">
                        Reset Password
                    </h4>

                    <Form onSubmit={handleSubmit}>

                        <Form.Group className="mb-3">

                            <Form.Label>
                                New Password
                            </Form.Label>

                            <Form.Control
                                type="password"
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                required
                            />

                        </Form.Group>

                        <Form.Group className="mb-4">

                            <Form.Label>
                                Confirm Password
                            </Form.Label>

                            <Form.Control
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                required
                            />

                        </Form.Group>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-100"
                            disabled={loading}
                        >

                            {loading ? (

                                <>
                                    <Spinner
                                        animation="border"
                                        size="sm"
                                        className="me-2"
                                    />

                                    Resetting...
                                </>

                            ) : (

                                "Reset Password"

                            )}

                        </Button>

                    </Form>

                    <div className="text-center mt-4">

                        <Link
                            to="/login"
                            className="text-decoration-none"
                        >
                            ← Back to Login
                        </Link>

                    </div>

                </Card.Body>

            </Card>

        </Container>
    );
};

export default ResetPassword;