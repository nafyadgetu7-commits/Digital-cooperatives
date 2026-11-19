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
    useNavigate
} from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";

const ForgotPassword = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!email.trim()) {

            toast.error("Please enter your email");

            return;
        }

        setLoading(true);

        try {

            const response = await api.post(
                "/auth/forgot-password",
                {
                    email: email.trim()
                }
            );

            console.log(
                "FORGOT PASSWORD RESPONSE:",
                response.data
            );

            if (!response.data?.success) {

                toast.error(
                    response.data?.message ||
                    "Unable to process request"
                );

                return;
            }

            /*
             * DEVELOPMENT MODE
             *
             * The backend returns the reset token.
             * Later we can send this token by email.
             */

            const token = response.data.resetToken;

            if (token) {

                navigate(
                    `/reset-password/${token}`
                );

                toast.success(
                    "Reset link generated successfully"
                );

            } else {

                toast.success(
                    "If this email exists, password reset instructions have been generated."
                );

            }

        } catch (error) {

            console.error(
                "FORGOT PASSWORD ERROR:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to process password reset"
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

                    <h4 className="text-center mb-3">
                        Forgot Password
                    </h4>

                    <p className="text-muted text-center mb-4">
                        Enter your email address to reset
                        your password.
                    </p>

                    <Form onSubmit={handleSubmit}>

                        <Form.Group className="mb-4">

                            <Form.Label>
                                Email
                            </Form.Label>

                            <Form.Control
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
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

                                    Checking...
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

export default ForgotPassword;