import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Alert
} from 'react-bootstrap';
import api from '../../services/api';
import { toast } from 'react-toastify';
import './MemberDashboard.css';

const MemberDashboard = () => {
  const [data, setData] = useState({
    savings: 0,
    shares: 0,
    totalLoanAmount: 0,
    transactions: [],
    member: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('====================================');
      console.log('MEMBER DASHBOARD - FETCHING DATA');
      console.log('====================================');

      const response = await api.get('/member/dashboard');

      console.log('MEMBER DASHBOARD RESPONSE:', response);
      console.log('MEMBER DASHBOARD DATA:', response.data);

      if (response.data?.success) {
       setData({
  savings: Number(response.data.savings || 0),
  shares: Number(response.data.shares || 0),
  totalLoanAmount: Number(response.data.totalLoanAmount || 0),
  transactions: Array.isArray(response.data.transactions)
    ? response.data.transactions
    : [],
  member: response.data.member || null
});

console.log(
  "TOTAL LOAN FROM API:",
  response.data?.data?.totalLoanAmount
);

        console.log('MEMBER DATA LOADED SUCCESSFULLY');
      } else {
        const message =
          response.data?.message ||
          'Failed to load member dashboard';

        console.error(
          'MEMBER DASHBOARD API ERROR:',
          message
        );

        setError(message);
        toast.error(message);
      }
    } catch (error) {
      console.error('====================================');
      console.error('MEMBER DASHBOARD REQUEST FAILED');
      console.error('MESSAGE:', error.message);
      console.error('CODE:', error.code);
      console.error(
        'STATUS:',
        error.response?.status
      );
      console.error(
        'DATA:',
        error.response?.data
      );
      console.error(
        'URL:',
        error.config?.url
      );
      console.error(
        'BASE URL:',
        error.config?.baseURL
      );
      console.error('====================================');

      let message =
        'Failed to load dashboard data';

      if (error.response) {
        message =
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        if (error.code === 'ECONNABORTED') {
          message =
            'The server took too long to respond. Please check the backend.';
        } else {
          message =
            'Cannot connect to the server. Please check that the backend is running.';
        }
      } else {
        message =
          error.message || message;
      }

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (amount) => {
    const value = Number(amount || 0);

    return value.toFixed(2);
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleDateString();
  };

  // =====================================================
  // TRANSACTION TYPE
  // =====================================================

  const getTransactionType = (transaction) => {
    if (transaction?.type) {
      return transaction.type;
    }

    if (
      transaction?.transaction_type ===
      'withdrawal'
    ) {
      return 'debit';
    }

    return 'credit';
  };

  // =====================================================
  // TRANSACTION BADGE
  // =====================================================

  const getTransactionBadge = (transaction) => {
    const type =
      getTransactionType(transaction);

    return type === 'credit'
      ? 'success'
      : 'danger';
  };

  // =====================================================
  // TRANSACTION LABEL
  // =====================================================

  const getTransactionLabel = (transaction) => {
    const type =
      getTransactionType(transaction);

    return type.toUpperCase();
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return 'success';
    }

    if (status === 'pending') {
      return 'warning';
    }

    if (status === 'failed') {
      return 'danger';
    }

    return 'secondary';
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner
          animation="border"
          variant="primary"
        />

        <p className="mt-3">
          Loading member dashboard...
        </p>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <Container
      fluid
      className="member-dashboard"
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="member-dashboard-header">

        <h2>
          Member Dashboard
        </h2>

        <p>
          View your savings, shares, loans,
          and recent transactions.
        </p>

        {data.member && (
          <p className="membership-text">

            Welcome,{' '}

            <strong>
              {data.member.full_name ||
                'Member'}
            </strong>

            {data.member.membership_number && (
              <>
                {' | '}
                Membership No:{' '}

                <strong>
                  {data.member.membership_number}
                </strong>
              </>
            )}

          </p>
        )}

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <Alert
          variant="danger"
          className="dashboard-error d-flex justify-content-between align-items-center"
        >

          <div>
            <strong>
              Unable to load dashboard:
            </strong>{' '}
            {error}
          </div>

          <button
            type="button"
            className="btn btn-danger btn-sm retry-button"
            onClick={fetchData}
          >
            Retry
          </button>

        </Alert>
      )}

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <Row className="mt-4 g-4">

        {/* SAVINGS */}

        <Col
          xs={12}
          sm={6}
          lg={3}
        >

          <Card
            className="dashboard-card savings-card text-center h-100"
          >

            <Card.Body className="dashboard-card-body">

              <div className="dashboard-icon savings-icon">
                ETB
              </div>

              <h6 className="dashboard-card-title">
                Total Savings
              </h6>

              <h2 className="dashboard-card-value savings-value">
                ETB{formatMoney(data.savings)}
              </h2>

              <small className="text-muted">
                Current balance
              </small>

            </Card.Body>

          </Card>

        </Col>

        {/* SHARES */}

        <Col
          xs={12}
          sm={6}
          lg={3}
        >

          <Card
            className="dashboard-card shares-card text-center h-100"
          >

            <Card.Body className="dashboard-card-body">

              <div className="dashboard-icon shares-icon">
                #
              </div>

              <h6 className="dashboard-card-title">
                Shares
              </h6>

              <h2 className="dashboard-card-value shares-value">
                {Number(data.shares || 0)}
              </h2>

              <small className="text-muted">
                Total shares owned
              </small>

            </Card.Body>

          </Card>

        </Col>

       {/* LOANS */}
<Col xs={12} sm={6} lg={3}>
  <Card className="dashboard-card loans-card text-center h-100">
    <Card.Body className="dashboard-card-body">

      <div className="dashboard-icon loans-icon">
        ETB
      </div>

      <h6 className="dashboard-card-title">
        Total Loans
      </h6>

      <h2 className="dashboard-card-value loans-value">
        ETB {Number(data.totalLoanAmount || 0).toFixed(2)}
      </h2>

      <small className="text-muted">
        Total loan amount
      </small>

    </Card.Body>
  </Card>
</Col>

        {/* TRANSACTIONS */}

        <Col
          xs={12}
          sm={6}
          lg={3}
        >

          <Card
            className="dashboard-card transactions-card text-center h-100"
          >

            <Card.Body className="dashboard-card-body">

              <div className="dashboard-icon transactions-icon">
                ↔
              </div>

              <h6 className="dashboard-card-title">
                Transactions
              </h6>

              <h2 className="dashboard-card-value transactions-value">
                {data.transactions.length}
              </h2>

              <small className="text-muted">
                Recent transactions
              </small>

            </Card.Body>

          </Card>

        </Col>

      </Row>

      {/* =================================================
          MEMBER INFORMATION
      ================================================= */}

      {data.member && (

        <Row className="mt-4">

          <Col xs={12}>

            <Card className="member-info-card">

              <Card.Header>

                <h5>
                  Member Information
                </h5>

              </Card.Header>

              <Card.Body>

                <Row className="g-3">

                  {/* FULL NAME */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={3}
                  >

                    <div className="member-info-item">

                      <strong>
                        Full Name
                      </strong>

                      <p>
                        {data.member.full_name ||
                          '-'}
                      </p>

                    </div>

                  </Col>

                  {/* USERNAME */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={3}
                  >

                    <div className="member-info-item">

                      <strong>
                        Username
                      </strong>

                      <p>
                        {data.member.username ||
                          '-'}
                      </p>

                    </div>

                  </Col>

                  {/* EMAIL */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={3}
                  >

                    <div className="member-info-item">

                      <strong>
                        Email
                      </strong>

                      <p>
                        {data.member.email ||
                          '-'}
                      </p>

                    </div>

                  </Col>

                  {/* PHONE */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={3}
                  >

                    <div className="member-info-item">

                      <strong>
                        Phone
                      </strong>

                      <p>
                        {data.member.phone ||
                          '-'}
                      </p>

                    </div>

                  </Col>

                  {/* MEMBERSHIP NUMBER */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={4}
                  >

                    <div className="member-info-item">

                      <strong>
                        Membership Number
                      </strong>

                      <p>
                        {data.member.membership_number ||
                          '-'}
                      </p>

                    </div>

                  </Col>

                  {/* JOIN DATE */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={4}
                  >

                    <div className="member-info-item">

                      <strong>
                        Join Date
                      </strong>

                      <p>
                        {formatDate(
                          data.member.join_date
                        )}
                      </p>

                    </div>

                  </Col>

                  {/* STATUS */}

                  <Col
                    xs={12}
                    sm={6}
                    lg={4}
                  >

                    <div className="member-info-item">

                      <strong>
                        Membership Status
                      </strong>

                      <p>

                        <Badge
                          bg={
                            data.member.status ===
                            'active'
                              ? 'success'
                              : data.member.status ===
                                'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {data.member.status ||
                            'Unknown'}
                        </Badge>

                      </p>

                    </div>

                  </Col>

                </Row>

              </Card.Body>

            </Card>

          </Col>

        </Row>

      )}

      {/* =================================================
          RECENT TRANSACTIONS
      ================================================= */}

      <Row className="mt-4">

        <Col xs={12}>

          <Card className="transaction-card">

            <Card.Header>

              <h5>
                Recent Transactions
              </h5>

            </Card.Header>

            <Card.Body className="p-0">

              <Table
                striped
                hover
                responsive
                className="transaction-table"
              >

                <thead>

                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Reference
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {data.transactions.length > 0 ? (

                    data.transactions.map(
                      (transaction, index) => {

                        return (

                          <tr
                            key={
                              transaction.id ||
                              index
                            }
                          >

                            {/* DATE */}

                            <td>
                              {formatDate(
                                transaction.date
                              )}
                            </td>

                            {/* TYPE */}

                            <td>

                              <Badge
                                className={
                                  getTransactionType(
                                    transaction
                                  ) === 'credit'
                                    ? 'transaction-credit'
                                    : 'transaction-debit'
                                }
                              >
                                {getTransactionLabel(
                                  transaction
                                )}
                              </Badge>

                            </td>

                            {/* DESCRIPTION */}

                            <td>
                              {transaction.description ||
                                '-'}
                            </td>

                            {/* AMOUNT */}

                            <td>

                              <strong>
                                ETB
                                {formatMoney(
                                  transaction.amount
                                )}
                              </strong>

                            </td>

                            {/* STATUS */}

                            <td>

                              <Badge
                                bg={getStatusBadge(
                                  transaction.status
                                )}
                                className="transaction-status"
                              >
                                {transaction.status ||
                                  'unknown'}
                              </Badge>

                            </td>

                            {/* REFERENCE */}

                            <td>
                              {transaction.reference_number ||
                                '-'}
                            </td>

                          </tr>

                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="6"
                        className="text-center empty-transactions"
                      >

                        <div className="empty-transactions-icon">
                          📋
                        </div>

                        <strong>
                          No transactions found
                        </strong>

                        <div>
                          Your recent transactions
                          will appear here.
                        </div>

                      </td>

                    </tr>

                  )}

                </tbody>

              </Table>

            </Card.Body>

          </Card>

        </Col>

      </Row>

    </Container>
  );
};

export default MemberDashboard;