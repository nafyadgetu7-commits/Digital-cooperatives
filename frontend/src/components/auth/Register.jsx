import React, { useState } from 'react';
import {
  Container,
  Card,
  Form,
  Button,
  Spinner
} from 'react-bootstrap';

import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../../context/AuthContext';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Register = () => {

  const navigate = useNavigate();

  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: ''
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
  // REGISTER
  // ========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    // Check required fields

    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.full_name
    ) {

      toast.error(
        'Please fill in all required fields'
      );

      return;
    }

    // ========================================
    // CHECK PASSWORD MATCH
    // ========================================

    if (formData.password !== formData.confirmPassword) {

      toast.error(
        'Passwords do not match'
      );

      return;
    }

    // ========================================
    // CHECK PASSWORD LENGTH
    // ========================================

    if (formData.password.length < 6) {

      toast.error(
        'Password must be at least 6 characters'
      );

      return;
    }

    setLoading(true);

    try {

      // Don't send confirmPassword to backend

      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address
      };

      console.log(
        'REGISTER DATA:',
        registrationData
      );

      const result = await register(
        registrationData
      );

      console.log(
        'REGISTER RESULT:',
        result
      );

      // ========================================
      // SUCCESS
      // ========================================

      if (result?.success) {

        toast.success(
          result.message ||
          'Registration successful!',
          {
            position: 'top-right',
            autoClose: 4000
          }
        );

        // Clear form

        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          full_name: '',
          phone: '',
          address: ''
        });

        // Go to login

        setTimeout(() => {

          navigate('/login');

        }, 1500);

      } else {

        toast.error(
          result?.message ||
          'Registration failed',
          {
            position: 'top-right',
            autoClose: 4000
          }
        );

      }

    } catch (error) {

      console.error(
        'REGISTER ERROR:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Registration failed. Please try again.',
        {
          position: 'top-right',
          autoClose: 4000
        }
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
          maxWidth: '500px'
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
            Create Account
          </h4>

          {/* FORM */}

          <Form onSubmit={handleSubmit}>

            {/* USERNAME */}

            <Form.Group className="mb-3">

              <Form.Label>
                Username *
              </Form.Label>

              <Form.Control
                type="text"
                name="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                required
              />

            </Form.Group>

            {/* FULL NAME */}

            <Form.Group className="mb-3">

              <Form.Label>
                Full Name *
              </Form.Label>

              <Form.Control
                type="text"
                name="full_name"
                placeholder="Enter full name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />

            </Form.Group>

            {/* EMAIL */}

            <Form.Group className="mb-3">

              <Form.Label>
                Email *
              </Form.Label>

              <Form.Control
                type="email"
                name="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                required
              />

            </Form.Group>

            {/* PASSWORD */}

            <Form.Group className="mb-3">

              <Form.Label>
                Password *
              </Form.Label>

              <Form.Control
                type="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
                required
              />

              <Form.Text className="text-muted">
                Password must be at least 6 characters.
              </Form.Text>

            </Form.Group>

            {/* CONFIRM PASSWORD */}

            <Form.Group className="mb-3">

              <Form.Label>
                Confirm Password *
              </Form.Label>

              <Form.Control
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                isInvalid={
                  formData.confirmPassword !== '' &&
                  formData.password !== formData.confirmPassword
                }
                required
              />

              <Form.Control.Feedback type="invalid">
                Passwords do not match.
              </Form.Control.Feedback>

            </Form.Group>

            {/* PHONE */}

<Form.Group className="mb-3">
  <Form.Label>Phone Number</Form.Label>

  <PhoneInput
    country="et"
    value={formData.phone}
    onChange={(phone) => {
      setFormData((prev) => ({
        ...prev,
        phone: `+${phone}`
      }));
    }}
    enableSearch={true}
    countryCodeEditable={false}
    inputProps={{
      name: "phone",
      required: true,
      autoComplete: "tel"
    }}
    containerStyle={{
      width: "100%"
    }}
    inputStyle={{
      width: "100%",
      height: "38px"
    }}
  />
<Form.Group className="mb-3">
  <Form.Label>City / Address</Form.Label>

  <Form.Select
    name="address"
    value={formData.address}
    onChange={handleChange}
  >
    <option value="">Select city</option>
    <option value="Addis Ababa">Addis Ababa</option>
    <option value="Jimma">Jimma</option>
    <option value="Adama">Adama</option>
    <option value="Bahir Dar">Bahir Dar</option>
    <option value="Hawassa">Hawassa</option>
    <option value="Mekelle">Mekelle</option>
    <option value="Dire Dawa">Dire Dawa</option>
    <option value="Gondar">Gondar</option>
    <option value="Dessie">Dessie</option>
    <option value="Bishoftu">Bishoftu</option>
    <option value="Debre Birhan">Debre Birhan</option>
    <option value="Shashamene">Shashamene</option>
    <option value="Nekemte">Nekemte</option>
    <option value="Arba Minch">Arba Minch</option>
    <option value="Wolaita Sodo">Wolaita Sodo</option>
  </Form.Select>
</Form.Group>

              <Form.Control
                type="text"
                name="address"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleChange}
              />

            </Form.Group>

            {/* REGISTER BUTTON */}

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

                  Creating Account...
                </>

              ) : (

                'Register'

              )}

            </Button>

          </Form>

          {/* LOGIN */}

          <div className="text-center mt-4">

            <p className="mb-0">
              Already have an account?
            </p>

            <Link
              to="/login"
              className="btn btn-outline-primary mt-2"
            >
              Login
            </Link>

          </div>

        </Card.Body>

      </Card>

    </Container>

  );
};

export default Register;