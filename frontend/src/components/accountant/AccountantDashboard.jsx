import React, { useEffect, useState } from "react";
import api from "../../services/api";
import "./AccountantDashboard.css";

const AccountantDashboard = () => {

    // ============================================================
    // STATE
    // ============================================================

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Dashboard data
    const [dashboard, setDashboard] = useState({
        totalPayments: 0,
        pendingPayments: 0,
        activeLoans: 0,
        totalRevenue: 0,
        recentPayments: [],
        pendingLoans: []
    });

    // Selected payment
    const [selectedPayment, setSelectedPayment] =
        useState(null);

    // Selected loan
    const [selectedLoan, setSelectedLoan] =
        useState(null);

    // Loan processing
    const [processingLoan, setProcessingLoan] =
        useState(null);

    // ============================================================
    // LOAN REPAYMENT STATE
    // ============================================================

    const [showRepaymentModal, setShowRepaymentModal] =
        useState(false);

    const [repaymentAmount, setRepaymentAmount] =
        useState("");

    const [repaymentLoading, setRepaymentLoading] =
        useState(false);

    // ============================================================
    // LOAD DASHBOARD
    // ============================================================

    const loadDashboard = async (showLoading = true) => {

        try {

            if (showLoading) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            setError("");

            console.log(
                "ACCOUNTANT: Loading dashboard..."
            );

            const response = await api.get(
                "/accountant/dashboard"
            );

            console.log(
                "ACCOUNTANT DASHBOARD RESPONSE:",
                response.data
            );

            if (response.data?.success) {

                const data = response.data;

                setDashboard({

                    totalPayments: Number(
                        data.totalPayments ??
                        data.stats?.totalPayments ??
                        0
                    ),

                    pendingPayments: Number(
                        data.pendingPayments ??
                        data.stats?.pendingPayments ??
                        0
                    ),

                    activeLoans: Number(
                        data.activeLoans ??
                        data.stats?.activeLoans ??
                        0
                    ),

                    totalRevenue: Number(
                        data.totalRevenue ??
                        data.stats?.totalRevenue ??
                        0
                    ),

                    recentPayments:
                        Array.isArray(
                            data.recentPayments
                        )
                            ? data.recentPayments
                            : [],

                    pendingLoans:
                        Array.isArray(
                            data.pendingLoans
                        )
                            ? data.pendingLoans
                            : []
                });

            } else {

                setError(
                    response.data?.message ||
                    "Failed to load accountant dashboard."
                );
            }

        } catch (err) {

            console.error(
                "ACCOUNTANT DASHBOARD ERROR:",
                err
            );

            if (err.response?.status === 401) {

                setError(
                    "Your session has expired. Please login again."
                );

            } else if (err.response?.status === 403) {

                setError(
                    "You do not have permission to access the accountant dashboard."
                );

            } else {

                setError(
                    err.response?.data?.message ||
                    "Failed to connect to the server."
                );
            }

        } finally {

            setLoading(false);
            setRefreshing(false);
        }
    };

    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        loadDashboard();

    }, []);

    // ============================================================
    // FORMAT MONEY
    // ============================================================

    const formatMoney = (amount) => {

        const value = Number(amount || 0);

        return `${value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} ETB`;
    };

    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        try {

            return new Date(date).toLocaleString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        } catch {

            return date;
        }
    };

    // ============================================================
    // PAYMENT STATUS
    // ============================================================

    const getPaymentStatus = (status) => {

        const value =
            String(status || "").toLowerCase();

        if (value === "completed") {

            return (
                <span className="accountant-status accountant-status-success">
                    ✓ Completed
                </span>
            );
        }

        if (value === "pending") {

            return (
                <span className="accountant-status accountant-status-warning">
                    ● Pending
                </span>
            );
        }

        if (
            value === "failed" ||
            value === "rejected"
        ) {

            return (
                <span className="accountant-status accountant-status-danger">
                    ✕ {value}
                </span>
            );
        }

        return (
            <span className="accountant-status accountant-status-secondary">
                {status || "Unknown"}
            </span>
        );
    };

    // ============================================================
    // LOAN STATUS
    // ============================================================

    const getLoanStatus = (status) => {

        const value =
            String(status || "").toLowerCase();

        if (value === "approved") {

            return (
                <span className="accountant-status accountant-status-success">
                    ✓ Approved
                </span>
            );
        }

        if (value === "pending") {

            return (
                <span className="accountant-status accountant-status-warning">
                    ● Pending
                </span>
            );
        }

        if (value === "rejected") {

            return (
                <span className="accountant-status accountant-status-danger">
                    ✕ Rejected
                </span>
            );
        }

        if (value === "active") {

            return (
                <span className="accountant-status accountant-status-primary">
                    Active
                </span>
            );
        }

        if (value === "completed") {

            return (
                <span className="accountant-status accountant-status-success">
                    ✓ Completed
                </span>
            );
        }

        if (value === "defaulted") {

            return (
                <span className="accountant-status accountant-status-danger">
                    Defaulted
                </span>
            );
        }

        return (
            <span className="accountant-status accountant-status-secondary">
                {status || "Unknown"}
            </span>
        );
    };

    // ============================================================
    // APPROVE LOAN
    // ============================================================

    const approveLoan = async (loanId) => {

        if (!loanId) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to approve this loan?"
        );

        if (!confirmed) {
            return;
        }

        try {

            setProcessingLoan(loanId);
            setError("");

            console.log(
                "ACCOUNTANT: APPROVING LOAN:",
                loanId
            );

            const response = await api.patch(
                `/accountant/loans/${loanId}/status`,
                {
                    status: "approved"
                }
            );

            console.log(
                "APPROVE LOAN RESPONSE:",
                response.data
            );

            if (response.data?.success) {

                alert(
                    "Loan approved successfully."
                );

                setSelectedLoan(null);

                await loadDashboard(false);

            } else {

                setError(
                    response.data?.message ||
                    "Failed to approve loan."
                );
            }

        } catch (err) {

            console.error(
                "APPROVE LOAN ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to approve loan."
            );

        } finally {

            setProcessingLoan(null);
        }
    };

    // ============================================================
    // REJECT LOAN
    // ============================================================

    const rejectLoan = async (loanId) => {

        if (!loanId) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to reject this loan?"
        );

        if (!confirmed) {
            return;
        }

        try {

            setProcessingLoan(loanId);
            setError("");

            console.log(
                "ACCOUNTANT: REJECTING LOAN:",
                loanId
            );

            const response = await api.patch(
                `/accountant/loans/${loanId}/status`,
                {
                    status: "rejected"
                }
            );

            console.log(
                "REJECT LOAN RESPONSE:",
                response.data
            );

            if (response.data?.success) {

                alert(
                    "Loan rejected successfully."
                );

                setSelectedLoan(null);

                await loadDashboard(false);

            } else {

                setError(
                    response.data?.message ||
                    "Failed to reject loan."
                );
            }

        } catch (err) {

            console.error(
                "REJECT LOAN ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to reject loan."
            );

        } finally {

            setProcessingLoan(null);
        }
    };

    // ============================================================
    // LOAN REPAYMENT
    // ============================================================

    const handleLoanRepayment = async () => {

        if (!selectedLoan) {

            setError(
                "Please select a loan."
            );

            return;
        }

        const amount =
            Number(repaymentAmount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            setError(
                "Repayment amount must be greater than zero."
            );

            return;
        }

        const remaining =
            Number(
                selectedLoan.remaining_balance || 0
            );

        if (remaining <= 0) {

            setError(
                "This loan has already been fully repaid."
            );

            return;
        }

        if (amount > remaining) {

            setError(
                `Maximum repayment is ${formatMoney(
                    remaining
                )}.`
            );

            return;
        }

        try {

            setRepaymentLoading(true);
            setError("");

            console.log(
                "ACCOUNTANT: REPAYING LOAN:",
                selectedLoan.id
            );

            console.log(
                "ACCOUNTANT: REPAYMENT AMOUNT:",
                amount
            );

            const response = await api.post(
                `/accountant/loans/${selectedLoan.id}/repay`,
                {
                    amount
                }
            );

            console.log(
                "LOAN REPAYMENT RESPONSE:",
                response.data
            );

            if (!response.data?.success) {

                throw new Error(
                    response.data?.message ||
                    "Failed to record loan repayment."
                );
            }

            alert(
                "Loan repayment recorded successfully."
            );

            // Reset repayment form
            setRepaymentAmount("");

            setShowRepaymentModal(false);

            setSelectedLoan(null);

            // Refresh accountant dashboard
            await loadDashboard(false);

        } catch (err) {

            console.error(
                "LOAN REPAYMENT ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to record loan repayment."
            );

        } finally {

            setRepaymentLoading(false);
        }
    };

    // ============================================================
    // OPEN REPAYMENT MODAL
    // ============================================================

    const openRepaymentModal = () => {

        if (!selectedLoan) {

            setError(
                "Please select a loan."
            );

            return;
        }

        const remaining =
            Number(
                selectedLoan.remaining_balance || 0
            );

        if (remaining <= 0) {

            setError(
                "This loan has already been fully repaid."
            );

            return;
        }

        setError("");

        setRepaymentAmount("");

        setShowRepaymentModal(true);
    };

    // ============================================================
    // CLOSE REPAYMENT MODAL
    // ============================================================

    const closeRepaymentModal = () => {

        if (repaymentLoading) {
            return;
        }

        setShowRepaymentModal(false);

        setRepaymentAmount("");

        setError("");
    };

    // ============================================================
    // DOWNLOAD REPORT
    // ============================================================

    const downloadReport = async () => {

        try {

            setError("");

            console.log(
                "ACCOUNTANT: DOWNLOADING REPORT..."
            );

            const response = await api.get(
                "/accountant/report",
                {
                    responseType: "blob"
                }
            );

            const blob = new Blob(
                [response.data],
                {
                    type:
                        response.headers[
                            "content-type"
                        ] ||
                        "application/pdf"
                }
            );

            const url =
                window.URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                `accountant-report-${new Date()
                    .toISOString()
                    .slice(0, 10)}.pdf`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (err) {

            console.error(
                "REPORT DOWNLOAD ERROR:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to download accountant report."
            );
        }
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="accountant-loading">

                <div className="accountant-spinner" />

                <h3>
                    Loading Accountant Dashboard...
                </h3>

                <p>
                    Please wait while your financial
                    information is loaded.
                </p>

            </div>
        );
    }

    // ============================================================
    // MAIN DASHBOARD
    // ============================================================

    return (

        <div className="accountant-dashboard">

            {/* ================================================== */}
            {/* HEADER */}
            {/* ================================================== */}

            <div className="accountant-header">

                <div className="accountant-header-content">

                    <div>

                        <h1>
                            💼 Accountant Dashboard
                        </h1>

                        <p>
                            Manage cooperative payments,
                            loans and financial activities.
                        </p>

                    </div>

                    <div className="accountant-header-actions">

                        <button
                            className="accountant-btn accountant-btn-outline"
                            onClick={() =>
                                loadDashboard(false)
                            }
                            disabled={refreshing}
                        >

                            {refreshing ? (

                                <>
                                    <span className="accountant-small-spinner" />
                                    Refreshing...
                                </>

                            ) : (

                                <>
                                    ↻ Refresh
                                </>

                            )}

                        </button>

                        <button
                            className="accountant-btn accountant-btn-primary"
                            onClick={downloadReport}
                        >
                            📄 Financial Report
                        </button>

                    </div>

                </div>

            </div>

            {/* ================================================== */}
            {/* ERROR */}
            {/* ================================================== */}

            {error && (

                <div className="accountant-error">

                    <div>

                        <strong>
                            Error:
                        </strong>{" "}

                        {error}

                    </div>

                    <button
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>

                </div>
            )}

            {/* ================================================== */}
            {/* STATISTICS */}
            {/* ================================================== */}

            <div className="accountant-stats">

                {/* TOTAL PAYMENTS */}

                <div className="accountant-stat-card accountant-stat-blue">

                    <div className="accountant-stat-icon">
                        💳
                    </div>

                    <div className="accountant-stat-content">

                        <span>
                            Total Payments
                        </span>

                        <strong>
                            {dashboard.totalPayments}
                        </strong>

                        <small>
                            All recorded payments
                        </small>

                    </div>

                </div>

                {/* PENDING PAYMENTS */}

                <div className="accountant-stat-card accountant-stat-orange">

                    <div className="accountant-stat-icon">
                        ⏳
                    </div>

                    <div className="accountant-stat-content">

                        <span>
                            Pending Payments
                        </span>

                        <strong>
                            {dashboard.pendingPayments}
                        </strong>

                        <small>
                            Awaiting processing
                        </small>

                    </div>

                </div>

                {/* ACTIVE LOANS */}

                <div className="accountant-stat-card accountant-stat-green">

                    <div className="accountant-stat-icon">
                        💰
                    </div>

                    <div className="accountant-stat-content">

                        <span>
                            Active Loans
                        </span>

                        <strong>
                            {dashboard.activeLoans}
                        </strong>

                        <small>
                            Currently active loans
                        </small>

                    </div>

                </div>

                {/* REVENUE */}

                <div className="accountant-stat-card accountant-stat-purple">

                    <div className="accountant-stat-icon">
                        📈
                    </div>

                    <div className="accountant-stat-content">

                        <span>
                            Total Revenue
                        </span>

                        <strong>
                            {formatMoney(
                                dashboard.totalRevenue
                            )}
                        </strong>

                        <small>
                            Cooperative financial income
                        </small>

                    </div>

                </div>

            </div>

            {/* ================================================== */}
            {/* PENDING LOANS */}
            {/* ================================================== */}

            <div className="accountant-section">

                <div className="accountant-section-header">

                    <div>

                        <h2>
                            💰 Pending Loan Approvals
                        </h2>

                        <p>
                            Review and approve or reject
                            member loan applications.
                        </p>

                    </div>

                    <span className="accountant-count accountant-count-warning">

                        {dashboard.pendingLoans.length}{" "}
                        Pending

                    </span>

                </div>

                <div className="accountant-table-container">

                    {dashboard.pendingLoans.length === 0 ? (

                        <div className="accountant-empty">

                            <div className="accountant-empty-icon">
                                ✓
                            </div>

                            <h3>
                                No Pending Loans
                            </h3>

                            <p>
                                All loan applications
                                have been processed.
                            </p>

                        </div>

                    ) : (

                        <div className="accountant-table-wrapper">

                            <table className="accountant-table">

                                <thead>

                                    <tr>

                                        <th>#</th>

                                        <th>
                                            MEMBER
                                        </th>

                                        <th>
                                            AMOUNT
                                        </th>

                                        <th>
                                            INTEREST
                                        </th>

                                        <th>
                                            TERM
                                        </th>

                                        <th>
                                            STATUS
                                        </th>

                                        <th>
                                            DATE
                                        </th>

                                        <th>
                                            ACTIONS
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {dashboard.pendingLoans.map(
                                        (loan, index) => {

                                            const loanId =
                                                loan.id;

                                            const memberName =
                                                loan.full_name ||
                                                loan.member_name ||
                                                loan.username ||
                                                "Unknown Member";

                                            return (

                                                <tr
                                                    key={
                                                        loanId ||
                                                        index
                                                    }
                                                >

                                                    <td>
                                                        {index + 1}
                                                    </td>

                                                    <td>

                                                        <div className="accountant-person">

                                                            <div className="accountant-avatar">

                                                                {memberName
                                                                    .charAt(0)
                                                                    .toUpperCase()}

                                                            </div>

                                                            <div>

                                                                <strong>
                                                                    {memberName}
                                                                </strong>

                                                                {loan.membership_number && (

                                                                    <small>
                                                                        {
                                                                            loan.membership_number
                                                                        }
                                                                    </small>

                                                                )}

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>

                                                        <strong>
                                                            {formatMoney(
                                                                loan.amount
                                                            )}
                                                        </strong>

                                                    </td>

                                                    <td>

                                                        {Number(
                                                            loan.interest_rate ||
                                                            0
                                                        ).toFixed(2)}
                                                        %

                                                    </td>

                                                    <td>

                                                        {loan.term_months ||
                                                            0}{" "}
                                                        months

                                                    </td>

                                                    <td>

                                                        {getLoanStatus(
                                                            loan.status
                                                        )}

                                                    </td>

                                                    <td>

                                                        {formatDate(
                                                            loan.approval_date ||
                                                            loan.created_at ||
                                                            loan.loan_date
                                                        )}

                                                    </td>

                                                    <td>

                                                        <div className="accountant-actions">

                                                            <button
                                                                className="accountant-action-view"
                                                                onClick={() =>
                                                                    setSelectedLoan(
                                                                        loan
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>

                                                            <button
                                                                className="accountant-action-approve"
                                                                disabled={
                                                                    processingLoan ===
                                                                    loanId
                                                                }
                                                                onClick={() =>
                                                                    approveLoan(
                                                                        loanId
                                                                    )
                                                                }
                                                            >

                                                                {processingLoan ===
                                                                loanId ? (

                                                                    <span className="accountant-small-spinner" />

                                                                ) : (

                                                                    "✓ Approve"

                                                                )}

                                                            </button>

                                                            <button
                                                                className="accountant-action-reject"
                                                                disabled={
                                                                    processingLoan ===
                                                                    loanId
                                                                }
                                                                onClick={() =>
                                                                    rejectLoan(
                                                                        loanId
                                                                    )
                                                                }
                                                            >
                                                                ✕ Reject
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

            </div>

            {/* ================================================== */}
            {/* RECENT PAYMENTS */}
            {/* ================================================== */}

            <div className="accountant-section">

                <div className="accountant-section-header">

                    <div>

                        <h2>
                            💳 Recent Payments
                        </h2>

                        <p>
                            Latest cooperative payment
                            transactions.
                        </p>

                    </div>

                    <span className="accountant-count accountant-count-primary">

                        {dashboard.recentPayments.length}{" "}
                        Payments

                    </span>

                </div>

                <div className="accountant-table-container">

                    {dashboard.recentPayments.length === 0 ? (

                        <div className="accountant-empty">

                            <div className="accountant-empty-icon">
                                💳
                            </div>

                            <h3>
                                No Recent Payments
                            </h3>

                            <p>
                                No payment records are
                                available.
                            </p>

                        </div>

                    ) : (

                        <div className="accountant-table-wrapper">

                            <table className="accountant-table">

                                <thead>

                                    <tr>

                                        <th>#</th>

                                        <th>
                                            PAYER
                                        </th>

                                        <th>
                                            ORDER
                                        </th>

                                        <th>
                                            AMOUNT
                                        </th>

                                        <th>
                                            METHOD
                                        </th>

                                        <th>
                                            TRANSACTION ID
                                        </th>

                                        <th>
                                            STATUS
                                        </th>

                                        <th>
                                            DATE
                                        </th>

                                        <th>
                                            ACTION
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {dashboard.recentPayments.map(
                                        (payment, index) => {

                                            const payer =
                                                payment.full_name ||
                                                payment.customer_name ||
                                                payment.member_name ||
                                                payment.username ||
                                                "Unknown User";

                                            return (

                                                <tr
                                                    key={
                                                        payment.id ||
                                                        index
                                                    }
                                                >

                                                    <td>
                                                        {index + 1}
                                                    </td>

                                                    <td>

                                                        <div className="accountant-person">

                                                            <div className="accountant-avatar">

                                                                {payer
                                                                    .charAt(0)
                                                                    .toUpperCase()}

                                                            </div>

                                                            <div>

                                                                <strong>
                                                                    {payer}
                                                                </strong>

                                                                {payment.email && (

                                                                    <small>
                                                                        {
                                                                            payment.email
                                                                        }
                                                                    </small>

                                                                )}

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>

                                                        {payment.order_number ? (

                                                            <strong>
                                                                {
                                                                    payment.order_number
                                                                }
                                                            </strong>

                                                        ) : payment.order_id ? (

                                                            `Order #${payment.order_id}`

                                                        ) : (

                                                            "-"
                                                        )}

                                                    </td>

                                                    <td className="accountant-money">

                                                        {formatMoney(
                                                            payment.amount
                                                        )}

                                                    </td>

                                                    <td>

                                                        {payment.payment_method ||
                                                            "-"}

                                                    </td>

                                                    <td>

                                                        <span className="accountant-reference">

                                                            {payment.transaction_id ||
                                                                "-"}

                                                        </span>

                                                    </td>

                                                    <td>

                                                        {getPaymentStatus(
                                                            payment.status
                                                        )}

                                                    </td>

                                                    <td>

                                                        {formatDate(
                                                            payment.payment_date
                                                        )}

                                                    </td>

                                                    <td>

                                                        <button
                                                            className="accountant-action-view"
                                                            onClick={() =>
                                                                setSelectedPayment(
                                                                    payment
                                                                )
                                                            }
                                                        >
                                                            View
                                                        </button>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

            </div>

            {/* ================================================== */}
            {/* PAYMENT MODAL */}
            {/* ================================================== */}

            {selectedPayment && (

                <div className="accountant-modal-overlay">

                    <div className="accountant-modal">

                        <div className="accountant-modal-header">

                            <h2>
                                💳 Payment Details
                            </h2>

                            <button
                                className="accountant-modal-close"
                                onClick={() =>
                                    setSelectedPayment(null)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="accountant-modal-body">

                            <div className="accountant-detail-grid">

                                <div className="accountant-detail-card">

                                    <span>
                                        Payer
                                    </span>

                                    <h3>
                                        {
                                            selectedPayment.full_name ||
                                            selectedPayment.customer_name ||
                                            selectedPayment.member_name ||
                                            selectedPayment.username ||
                                            "Unknown User"
                                        }
                                    </h3>

                                    <p>
                                        <strong>
                                            Email:
                                        </strong>{" "}

                                        {selectedPayment.email ||
                                            "-"}
                                    </p>

                                    <p>
                                        <strong>
                                            Phone:
                                        </strong>{" "}

                                        {selectedPayment.phone ||
                                            "-"}
                                    </p>

                                </div>

                                <div className="accountant-detail-card">

                                    <span>
                                        Payment
                                    </span>

                                    <h3 className="accountant-detail-money">

                                        {formatMoney(
                                            selectedPayment.amount
                                        )}

                                    </h3>

                                    <p>

                                        <strong>
                                            Method:
                                        </strong>{" "}

                                        {
                                            selectedPayment.payment_method ||
                                            "-"
                                        }

                                    </p>

                                    <p>

                                        <strong>
                                            Status:
                                        </strong>{" "}

                                        {getPaymentStatus(
                                            selectedPayment.status
                                        )}

                                    </p>

                                </div>

                            </div>

                            <div className="accountant-detail-card accountant-detail-full">

                                <div className="accountant-detail-row">

                                    <div>

                                        <span>
                                            Reference Number
                                        </span>

                                        <strong>
                                            {
                                                selectedPayment.transaction_id ||
                                                "-"
                                            }
                                        </strong>

                                    </div>

                                    <div>

                                        <span>
                                            Payment Date
                                        </span>

                                        <strong>
                                            {formatDate(
                                                selectedPayment.payment_date
                                            )}
                                        </strong>

                                    </div>

                                </div>

                                <div className="accountant-detail-row">

                                    <div>

                                        <span>
                                            Order
                                        </span>

                                        <strong>
                                            {
                                                selectedPayment.order_number ||
                                                selectedPayment.order_id ||
                                                "-"
                                            }
                                        </strong>

                                    </div>

                                    <div>

                                        <span>
                                            Payment ID
                                        </span>

                                        <strong>
                                            {
                                                selectedPayment.id ||
                                                "-"
                                            }
                                        </strong>

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="accountant-modal-footer">

                            <button
                                className="accountant-btn accountant-btn-secondary"
                                onClick={() =>
                                    setSelectedPayment(null)
                                }
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* ================================================== */}
            {/* LOAN DETAILS MODAL */}
            {/* ================================================== */}

            {selectedLoan && !showRepaymentModal && (

                <div className="accountant-modal-overlay">

                    <div className="accountant-modal">

                        <div className="accountant-modal-header">

                            <h2>
                                💰 Loan Details
                            </h2>

                            <button
                                className="accountant-modal-close"
                                onClick={() =>
                                    setSelectedLoan(null)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="accountant-modal-body">

                            <div className="accountant-loan-grid">

                                {/* MEMBER */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Member
                                    </span>

                                    <strong>

                                        {selectedLoan.full_name ||
                                            selectedLoan.member_name ||
                                            selectedLoan.username ||
                                            "Unknown Member"}

                                    </strong>

                                </div>

                                {/* MEMBERSHIP NUMBER */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Membership Number
                                    </span>

                                    <strong>

                                        {selectedLoan.membership_number ||
                                            "-"}

                                    </strong>

                                </div>

                                {/* STATUS */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Status
                                    </span>

                                    <div>

                                        {getLoanStatus(
                                            selectedLoan.status
                                        )}

                                    </div>

                                </div>

                                {/* LOAN AMOUNT */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Loan Amount
                                    </span>

                                    <strong className="accountant-detail-money">

                                        {formatMoney(
                                            selectedLoan.amount
                                        )}

                                    </strong>

                                </div>

                                {/* INTEREST */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Interest Rate
                                    </span>

                                    <strong>

                                        {Number(
                                            selectedLoan.interest_rate ||
                                            0
                                        ).toFixed(2)}
                                        %

                                    </strong>

                                </div>

                                {/* TERM */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Term
                                    </span>

                                    <strong>

                                        {selectedLoan.term_months ||
                                            0}{" "}
                                        Months

                                    </strong>

                                </div>

                                {/* REMAINING */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Remaining Balance
                                    </span>

                                    <strong>

                                        {formatMoney(
                                            selectedLoan.remaining_balance
                                        )}

                                    </strong>

                                </div>

                                {/* DUE DATE */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Due Date
                                    </span>

                                    <strong>

                                        {formatDate(
                                            selectedLoan.due_date
                                        )}

                                    </strong>

                                </div>

                                {/* APPROVAL DATE */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Approval Date
                                    </span>

                                    <strong>

                                        {formatDate(
                                            selectedLoan.approval_date
                                        )}

                                    </strong>

                                </div>

                            </div>

                        </div>

                        {/* LOAN MODAL FOOTER */}

                        <div className="accountant-modal-footer">

                            {/* REPAY BUTTON */}

                            {Number(
                                selectedLoan.remaining_balance || 0
                            ) > 0 && (

                                <button
                                    className="accountant-btn accountant-btn-primary"
                                    onClick={
                                        openRepaymentModal
                                    }
                                >
                                    💵 Repay Loan
                                </button>

                            )}

                            {/* CLOSE */}

                            <button
                                className="accountant-btn accountant-btn-secondary"
                                onClick={() =>
                                    setSelectedLoan(null)
                                }
                            >
                                Close
                            </button>

                            {/* REJECT */}

                            {selectedLoan.status !==
                                "rejected" &&
                                selectedLoan.status !==
                                "completed" && (

                                <button
                                    className="accountant-btn accountant-btn-danger"
                                    disabled={
                                        processingLoan ===
                                        selectedLoan.id
                                    }
                                    onClick={() =>
                                        rejectLoan(
                                            selectedLoan.id
                                        )
                                    }
                                >
                                    ✕ Reject
                                </button>

                            )}

                            {/* APPROVE */}

                            {selectedLoan.status ===
                                "pending" && (

                                <button
                                    className="accountant-btn accountant-btn-success"
                                    disabled={
                                        processingLoan ===
                                        selectedLoan.id
                                    }
                                    onClick={() =>
                                        approveLoan(
                                            selectedLoan.id
                                        )
                                    }
                                >

                                    {processingLoan ===
                                    selectedLoan.id ? (

                                        <>
                                            <span className="accountant-small-spinner" />
                                            Processing...
                                        </>

                                    ) : (

                                        <>
                                            ✓ Approve Loan
                                        </>

                                    )}

                                </button>

                            )}

                        </div>

                    </div>

                </div>
            )}

            {/* ================================================== */}
            {/* LOAN REPAYMENT MODAL */}
            {/* ================================================== */}

            {showRepaymentModal &&
                selectedLoan && (

                    <div className="accountant-modal-overlay">

                        <div className="accountant-modal">

                            {/* HEADER */}

                            <div className="accountant-modal-header">

                                <h2>
                                    💵 Loan Repayment
                                </h2>

                                <button
                                    className="accountant-modal-close"
                                    onClick={
                                        closeRepaymentModal
                                    }
                                    disabled={
                                        repaymentLoading
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            {/* BODY */}

                            <div className="accountant-modal-body">

                                {/* MEMBER */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Member
                                    </span>

                                    <strong>

                                        {selectedLoan.full_name ||
                                            selectedLoan.member_name ||
                                            selectedLoan.username ||
                                            "Unknown Member"}

                                    </strong>

                                </div>

                                {/* LOAN ID */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Loan ID
                                    </span>

                                    <strong>
                                        #{selectedLoan.id}
                                    </strong>

                                </div>

                                {/* ORIGINAL AMOUNT */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Original Loan Amount
                                    </span>

                                    <strong>

                                        {formatMoney(
                                            selectedLoan.amount
                                        )}

                                    </strong>

                                </div>

                                {/* REMAINING */}

                                <div className="accountant-loan-detail">

                                    <span>
                                        Remaining Balance
                                    </span>

                                    <strong>

                                        {formatMoney(
                                            selectedLoan.remaining_balance
                                        )}

                                    </strong>

                                </div>

                                {/* REPAYMENT INPUT */}

                                <div
                                    style={{
                                        marginTop: "20px"
                                    }}
                                >

                                    <label
                                        htmlFor="repaymentAmount"
                                        style={{
                                            display:
                                                "block",
                                            marginBottom:
                                                "8px",
                                            fontWeight:
                                                "600"
                                        }}
                                    >
                                        Repayment Amount
                                        (ETB)
                                    </label>

                                    <input
                                        id="repaymentAmount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={
                                            repaymentAmount
                                        }
                                        onChange={(e) =>
                                            setRepaymentAmount(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter repayment amount"
                                        disabled={
                                            repaymentLoading
                                        }
                                        style={{
                                            width:
                                                "100%",
                                            padding:
                                                "12px",
                                            border:
                                                "1px solid #ddd",
                                            borderRadius:
                                                "8px",
                                            fontSize:
                                                "16px",
                                            boxSizing:
                                                "border-box"
                                        }}
                                    />

                                    <small
                                        style={{
                                            display:
                                                "block",
                                            marginTop:
                                                "8px",
                                            color:
                                                "#666"
                                        }}
                                    >
                                        Maximum repayment:
                                        {" "}
                                        {formatMoney(
                                            selectedLoan.remaining_balance
                                        )}
                                    </small>

                                </div>

                            </div>

                            {/* FOOTER */}

                            <div className="accountant-modal-footer">

                                <button
                                    className="accountant-btn accountant-btn-secondary"
                                    disabled={
                                        repaymentLoading
                                    }
                                    onClick={
                                        closeRepaymentModal
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    className="accountant-btn accountant-btn-success"
                                    disabled={
                                        repaymentLoading ||
                                        !repaymentAmount ||
                                        Number(
                                            repaymentAmount
                                        ) <= 0 ||
                                        Number(
                                            repaymentAmount
                                        ) >
                                        Number(
                                            selectedLoan.remaining_balance ||
                                            0
                                        )
                                    }
                                    onClick={
                                        handleLoanRepayment
                                    }
                                >

                                    {repaymentLoading ? (

                                        <>
                                            <span className="accountant-small-spinner" />
                                            Processing...
                                        </>

                                    ) : (

                                        <>
                                            💵 Confirm Repayment
                                        </>

                                    )}

                                </button>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    );
};

export default AccountantDashboard;