import React, { useState } from 'react';
import {
  Container,
  Card,
  Form,
  Button,
  Spinner
} from 'react-bootstrap';

import {
  Link,
  useNavigate
} from 'react-router-dom';

import { toast } from 'react-toastify';

import { useAuth } from '../../context/AuthContext';

const Login = () => {

  const navigate = useNavigate();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);

  // ========================================
  // HANDLE INPUT
  // ========================================

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  };

  // ========================================
  // HANDLE LOGIN
  // ========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!formData.email || !formData.password) {

      toast.error(
        'Please enter email and password'
      );

      return;
    }

    setLoading(true);

    try {

      const result = await login(
        formData.email,
        formData.password
      );

      console.log('LOGIN RESULT:', result);

      // IMPORTANT:
      // Check BOTH success and user
      if (result?.success && result?.user) {

        toast.success('Login successful');

        const roleId = Number(
          result.user.role_id
        );

        // ========================================
        // REDIRECT BASED ON ROLE
        // ========================================

        switch (roleId) {

          case 1:
            navigate('/admin');
            break;

          case 2:
            navigate('/manager');
            break;

          case 3:
            navigate('/accountant');
            break;

          case 4:
            navigate('/supplier');
            break;

          case 5:
            navigate('/customer');
            break;

          case 6:
            navigate('/member');
            break;

          default:

            toast.error(
              'Unknown user role'
            );

            navigate('/login');

        }

      } else {

        toast.error(
          result?.message ||
          'Login failed'
        );

      }

    } catch (error) {

      console.error(
        'LOGIN ERROR:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Unable to login'
      );

    } finally {

      setLoading(false);

    }

  };

  // ========================================
  // UI
  // ========================================

  return (

    <Container
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: '100vh'
      }}
    >

      <Card
        className="shadow"
        style={{
          width: '100%',
          maxWidth: '450px'
        }}
      >

        <Card.Body className="p-4">

          {/* TITLE */}

          <div className="text-center mb-4">

            <h2>
              Digital Cooperative
            </h2>

            <p className="text-muted">
              Management System
            </p>

          </div>

          <h4 className="text-center mb-4">
            Login
          </h4>

          {/* LOGIN FORM */}

          <Form onSubmit={handleSubmit}>

            {/* EMAIL */}

            <Form.Group className="mb-3">

              <Form.Label>
                Email
              </Form.Label>

              <Form.Control
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />

            </Form.Group>

            {/* PASSWORD */}

            <Form.Group className="mb-3">

              <Form.Label>
                Password
              </Form.Label>

              <Form.Control
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />

            </Form.Group>
            
            {/* FORGOT PASSWORD */}

            <div className="text-end mb-3">
    <Link
        to="/forgot-password"
        className="text-decoration-none"
    >
        Forgot Password?
    </Link>
        </div>

            {/* LOGIN BUTTON */}

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

                  Logging in...
                </>

              ) : (

                'Login'

              )}

            </Button>

          </Form>

          {/* REGISTER */}

          <div className="text-center mt-4">

            <p className="mb-0">
              Don't have an account?
            </p>

            <Link
              to="/register"
              className="btn btn-outline-primary mt-2"
            >
              Create an Account
            </Link>

          </div>

        </Card.Body>

      </Card>

    </Container>

  );

};

export default Login;