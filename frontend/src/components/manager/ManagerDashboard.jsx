import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Button,
  Tabs,
  Tab,
  Badge,
  Alert,
} from "react-bootstrap";
import api from "../../services/api";
import { toast } from "react-toastify";

const defaultData = {
  stats: {
    totalMembers: 0,
    pendingApprovals: 0,
    activeSuppliers: 0,
    monthlyRevenue: 0,
  },
  pendingMembers: [],
  pendingSuppliers: [],
  performance: {},
};

const ManagerDashboard = () => {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // FETCH DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      console.log("MANAGER: GET DASHBOARD");

      const response = await api.get("/manager/dashboard");

      console.log(
        "MANAGER DASHBOARD RESPONSE:",
        response.data
      );

      const result = response.data || {};

      setData({
        stats: {
          totalMembers: Number(
            result.stats?.totalMembers ?? 0
          ),

          pendingApprovals: Number(
            result.stats?.pendingApprovals ?? 0
          ),

          activeSuppliers: Number(
            result.stats?.activeSuppliers ?? 0
          ),

          monthlyRevenue: Number(
            result.stats?.monthlyRevenue ?? 0
          ),
        },

        pendingMembers: Array.isArray(
          result.pendingMembers
        )
          ? result.pendingMembers
          : [],

        pendingSuppliers: Array.isArray(
          result.pendingSuppliers
        )
          ? result.pendingSuppliers
          : [],

        performance: result.performance || {},
      });
    } catch (error) {
      console.error(
        "MANAGER DASHBOARD ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to load dashboard data";

      setErrorMessage(message);

      toast.error(message);

      setData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // APPROVE MEMBER / SUPPLIER
  // ============================================================

  const handleApprove = async (type, id) => {
    try {
      console.log(
        `MANAGER: APPROVE ${type}`,
        id
      );

      await api.post(
        `/manager/approve/${type}/${id}`
      );

      toast.success(
        `${type} approved successfully`
      );

      fetchData();
    } catch (error) {
      console.error(
        `APPROVE ${type.toUpperCase()} ERROR:`,
        error
      );

      toast.error(
        error.response?.data?.message ||
          `Failed to approve ${type}`
      );
    }
  };

  // ============================================================
  // REJECT MEMBER / SUPPLIER
  // ============================================================

  const handleReject = async (type, id) => {
    try {
      console.log(
        `MANAGER: REJECT ${type}`,
        id
      );

      await api.post(
        `/manager/reject/${type}/${id}`
      );

      toast.success(
        `${type} rejected successfully`
      );

      fetchData();
    } catch (error) {
      console.error(
        `REJECT ${type.toUpperCase()} ERROR:`,
        error
      );

      toast.error(
        error.response?.data?.message ||
          `Failed to reject ${type}`
      );
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner
          animation="border"
          variant="primary"
        />

        <p className="mt-3">
          Loading manager dashboard...
        </p>
      </Container>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <Container fluid className="mt-4 px-4">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2 className="fw-bold mb-1">
            Manager Dashboard
          </h2>

          <p className="text-muted mb-0">
            Monitor cooperative performance and
            manage approvals
          </p>
        </div>

        <Button
          variant="outline-primary"
          onClick={fetchData}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {errorMessage && (
        <Alert
          variant="danger"
          className="mb-4"
        >
          <div className="d-flex justify-content-between align-items-center">

            <div>
              <strong>
                Dashboard Error:
              </strong>{" "}
              {errorMessage}
            </div>

            <Button
              variant="outline-danger"
              size="sm"
              onClick={fetchData}
            >
              Retry
            </Button>

          </div>
        </Alert>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <Row className="g-4">

        {/* TOTAL MEMBERS */}

        <Col
          xs={12}
          sm={6}
          md={3}
        >
          <Card className="shadow-sm border-0 h-100">

            <Card.Body className="text-center">

              <div className="mb-2">
                <i
                  className="bi bi-people-fill text-primary"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </div>

              <h6 className="text-muted">
                Total Members
              </h6>

              <h2 className="fw-bold text-primary">
                {Number(
                  data.stats?.totalMembers ?? 0
                )}
              </h2>

            </Card.Body>

          </Card>
        </Col>

        {/* PENDING APPROVALS */}

        <Col
          xs={12}
          sm={6}
          md={3}
        >
          <Card className="shadow-sm border-0 h-100">

            <Card.Body className="text-center">

              <div className="mb-2">
                <i
                  className="bi bi-hourglass-split text-warning"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </div>

              <h6 className="text-muted">
                Pending Approvals
              </h6>

              <h2 className="fw-bold text-warning">
                {Number(
                  data.stats?.pendingApprovals ?? 0
                )}
              </h2>

            </Card.Body>

          </Card>
        </Col>

        {/* ACTIVE SUPPLIERS */}

        <Col
          xs={12}
          sm={6}
          md={3}
        >
          <Card className="shadow-sm border-0 h-100">

            <Card.Body className="text-center">

              <div className="mb-2">
                <i
                  className="bi bi-shop text-info"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </div>

              <h6 className="text-muted">
                Active Suppliers
              </h6>

              <h2 className="fw-bold text-info">
                {Number(
                  data.stats?.activeSuppliers ?? 0
                )}
              </h2>

            </Card.Body>

          </Card>
        </Col>

        {/* MONTHLY REVENUE */}

        <Col
          xs={12}
          sm={6}
          md={3}
        >
          <Card className="shadow-sm border-0 h-100">

            <Card.Body className="text-center">

              <div className="mb-2">
                <i
                  className="bi bi-cash-stack text-success"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </div>

              <h6 className="text-muted">
                Monthly Revenue
              </h6>

              <h2 className="fw-bold text-success">
                $
                {Number(
                  data.stats?.monthlyRevenue ?? 0
                ).toFixed(2)}
              </h2>

            </Card.Body>

          </Card>
        </Col>

      </Row>

      {/* ======================================================
          PENDING APPROVALS
      ====================================================== */}

      <Row className="mt-4">

        <Col xs={12}>

          <Card className="shadow-sm border-0">

            <Card.Header className="bg-white py-3">

              <div className="d-flex justify-content-between align-items-center">

                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-check2-square me-2"></i>
                  Pending Approvals
                </h5>

                <Badge bg="warning">
                  {Number(
                    data.stats?.pendingApprovals ?? 0
                  )}
                </Badge>

              </div>

            </Card.Header>

            <Card.Body>

              <Tabs
                defaultActiveKey="members"
                className="mb-3"
              >

                {/* ==================================================
                    MEMBERS
                ================================================== */}

                <Tab
                  eventKey="members"
                  title={
                    <>
                      <i className="bi bi-people me-2"></i>
                      Members
                    </>
                  }
                >

                  <Table
                    striped
                    hover
                    responsive
                  >

                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Join Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {data.pendingMembers?.length > 0 ? (

                        data.pendingMembers.map(
                          (member) => (

                            <tr key={member.id}>

                              <td>
                                {member.full_name ||
                                  member.username ||
                                  "Unknown"}
                              </td>

                              <td>
                                {member.email ||
                                  "N/A"}
                              </td>

                              <td>
                                {member.phone ||
                                  "N/A"}
                              </td>

                              <td>
                                {member.join_date
                                  ? new Date(
                                      member.join_date
                                    ).toLocaleDateString()
                                  : member.created_at
                                  ? new Date(
                                      member.created_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>

                              <td>

                                <Button
                                  size="sm"
                                  variant="success"
                                  className="me-2"
                                  onClick={() =>
                                    handleApprove(
                                      "member",
                                      member.id
                                    )
                                  }
                                >
                                  <i className="bi bi-check-lg me-1"></i>
                                  Approve
                                </Button>

                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() =>
                                    handleReject(
                                      "member",
                                      member.id
                                    )
                                  }
                                >
                                  <i className="bi bi-x-lg me-1"></i>
                                  Reject
                                </Button>

                              </td>

                            </tr>

                          )
                        )

                      ) : (

                        <tr>

                          <td
                            colSpan="5"
                            className="text-center text-muted py-4"
                          >

                            <i
                              className="bi bi-inbox fs-3 d-block mb-2"
                            ></i>

                            No pending member approvals

                          </td>

                        </tr>

                      )}

                    </tbody>

                  </Table>

                </Tab>

                {/* ==================================================
                    SUPPLIERS
                ================================================== */}

                <Tab
                  eventKey="suppliers"
                  title={
                    <>
                      <i className="bi bi-shop me-2"></i>
                      Suppliers
                    </>
                  }
                >

                  <Table
                    striped
                    hover
                    responsive
                  >

                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {data.pendingSuppliers?.length > 0 ? (

                        data.pendingSuppliers.map(
                          (supplier) => (

                            <tr key={supplier.id}>

                              <td>
                                {supplier.company_name ||
                                  supplier.company ||
                                  "N/A"}
                              </td>

                              <td>
                                {supplier.full_name ||
                                  supplier.username ||
                                  "Unknown"}
                              </td>

                              <td>
                                {supplier.email ||
                                  "N/A"}
                              </td>

                              <td>
                                {supplier.phone ||
                                  "N/A"}
                              </td>

                              <td>

                                <Button
                                  size="sm"
                                  variant="success"
                                  className="me-2"
                                  onClick={() =>
                                    handleApprove(
                                      "supplier",
                                      supplier.id
                                    )
                                  }
                                >
                                  <i className="bi bi-check-lg me-1"></i>
                                  Approve
                                </Button>

                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() =>
                                    handleReject(
                                      "supplier",
                                      supplier.id
                                    )
                                  }
                                >
                                  <i className="bi bi-x-lg me-1"></i>
                                  Reject
                                </Button>

                              </td>

                            </tr>

                          )
                        )

                      ) : (

                        <tr>

                          <td
                            colSpan="5"
                            className="text-center text-muted py-4"
                          >

                            <i
                              className="bi bi-inbox fs-3 d-block mb-2"
                            ></i>

                            No pending supplier approvals

                          </td>

                        </tr>

                      )}

                    </tbody>

                  </Table>

                </Tab>

              </Tabs>

            </Card.Body>

          </Card>

        </Col>

      </Row>

      {/* ======================================================
          FOOTER REFRESH
      ====================================================== */}

      <div className="text-end mt-4 mb-4">

        <Button
          variant="outline-primary"
          onClick={fetchData}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh Dashboard
        </Button>

      </div>

    </Container>
  );
};

export default ManagerDashboard;