import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Spinner,
  InputGroup,
  Alert,
} from "react-bootstrap";

import {
  FaPlus,
  FaUsers,
  FaUserCheck,
  FaShoppingCart,
  FaMoneyBillWave,
  FaSearch,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaTrash,
  FaTimes,
  FaPiggyBank,
  FaChartLine,
  FaHandHoldingUsd,
  FaExchangeAlt,
  FaWallet,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCreditCard,
  FaEye,
} from "react-icons/fa";

import { toast } from "react-toastify";

import api from "../../services/api";

import "./AdminDashboard.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const AdminDashboard = () => {
  
  // ============================================================
  // USERS
  // ============================================================

  const [users, setUsers] = useState([]);

  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const handleLoanRepayment = async () => {

    if (!selectedLoan) {
        toast.error("Please select a loan");
        return;
    }

    const amount = Number(repaymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter a valid repayment amount");
        return;
    }

    const remaining =
        Number(selectedLoan.remaining_balance || 0);

    if (amount > remaining) {
        toast.error(
            `Maximum repayment is ETB ${remaining.toFixed(2)}`
        );
        return;
    }

    if (!selectedMember?.member_id) {
        toast.error("No member selected");
        return;
    }

    if (!selectedLoan?.id) {
        toast.error("Invalid loan selected");
        return;
    }

    try {

        const response = await api.post(
    `/admin/members/${selectedMember.member_id}/loans/${selectedLoan.id}/repayment`,
    {
        repayment_amount: amount
    }
);

        if (!response.data?.success) {
            throw new Error(
                response.data?.message ||
                "Failed to repay loan"
            );
        }

        toast.success(
            "Loan repayment recorded successfully"
        );

        setShowRepaymentModal(false);
        setSelectedLoan(null);
        setRepaymentAmount("");

        // Reload the member's loans
        if (selectedMember?.member_id) {

            const loansResponse =
                await api.get(
                    `/admin/members/${selectedMember.member_id}/loans`
                );

            if (loansResponse.data?.success) {

                setMemberLoans(
                    loansResponse.data.loans || []
                );

            }

            // Refresh this member's financial summary too.
            const financialResponse = await api.get(
                `/admin/members/${selectedMember.member_id}/financial`
            );

            if (financialResponse.data?.success) {
                setFinancial(
                    financialResponse.data.financial || {
                        savings: 0,
                        shares: 0,
                        totalLoanAmount: 0,
                        activeLoans: 0,
                        transactionCount: 0,
                    }
                );

                setMemberTransactions(
                    Array.isArray(financialResponse.data.transactions)
                        ? financialResponse.data.transactions
                        : []
                );
            }
        }

    } catch (error) {

        console.error(
            "LOAN REPAYMENT ERROR:",
            error
        );

        toast.error(
            error.response?.data?.message ||
            error.message ||
            "Failed to repay loan"
        );
    }
};

  // ============================================================
  // PAYMENTS
  // ============================================================

  const [payments, setPayments] = useState([]);

  const [paymentLoading, setPaymentLoading] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);

  const [rejectReason, setRejectReason] = useState("");

  const [paymentActionLoading, setPaymentActionLoading] =
    useState(false);
  const [memberLoans, setMemberLoans] = useState([]);
const [selectedLoan, setSelectedLoan] = useState(null);
const [showRepaymentModal, setShowRepaymentModal] = useState(false);
const [repaymentAmount, setRepaymentAmount] = useState("");
const [repaymentLoading, setRepaymentLoading] = useState(false);
const [showMembershipModal, setShowMembershipModal] =
    useState(false);

const [membershipNumber, setMembershipNumber] =
    useState("");

const [membershipMember, setMembershipMember] =
    useState(null);

const [membershipLoading, setMembershipLoading] =
    useState(false);
   
  // ============================================================
  // USER MODAL
  // ============================================================

  const [showUserModal, setShowUserModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: "",
    role_id: 5,
    is_active: true,
  });

  // ============================================================
  // MEMBER FINANCIAL MODAL
  // ============================================================

  const [showFinancialModal, setShowFinancialModal] =
    useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  const [financial, setFinancial] = useState({
    savings: 0,
    shares: 0,
    activeLoans: 0,
    transactionCount: 0,
  });

  const [memberTransactions, setMemberTransactions] = useState([]);

  const [financialLoading, setFinancialLoading] = useState(false);

  // ============================================================
  // FINANCIAL ACTION MODAL
  // ============================================================

  const [showActionModal, setShowActionModal] = useState(false);

  const [actionType, setActionType] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [actionData, setActionData] = useState({
  amount: "",
  type: "deposit",
  share_count: "",
  term_months: "",
  transaction_type: "deposit",
  description: "",
  reference_number: "",

  // Loan repayment
  loan_id: "",
  repayment_amount: "",
  payment_method: "cash"
});
//===================================
 //LOAD MEMBER LOANS
 //===================================
const loadMemberLoans = async (memberId) => {
  try {
    if (!memberId) {
      setMemberLoans([]);
      return;
    }

    const response = await api.get(
      `/admin/members/${memberId}/loans`
    );

    if (response.data?.success) {
      setMemberLoans(
        response.data.loans || []
      );
    } else {
      setMemberLoans([]);
    }

  } catch (error) {
    console.error(
      "LOAD MEMBER LOANS ERROR:",
      error
    );

    setMemberLoans([]);
  }
};

  // ============================================================
  // GENERAL
  // ============================================================

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // ROLES
  // ============================================================

  const roleNames = {
    1: "Admin",
    2: "Manager",
    3: "Accountant",
    4: "Supplier",
    5: "Customer",
    6: "Member",
  };

  // ============================================================
  // FORMAT AMOUNT
  // ============================================================

  const formatAmount = (amount) => {
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return "0.00";
    }

    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ============================================================
  // USER ACTIVE CHECK
  // ============================================================

  const isUserActive = (user) => {
    return (
      user?.is_active === true ||
      user?.is_active === 1 ||
      user?.is_active === "1"
    );
  };

  // ============================================================
  // FETCH PENDING PAYMENTS
  // ============================================================

  const fetchPendingPayments = useCallback(async () => {
    try {
      setPaymentLoading(true);

      console.log("ADMIN: Loading pending payments...");

      const response = await api.get("/admin/payments/pending");

      console.log(
        "ADMIN PENDING PAYMENTS RESPONSE:",
        response.data
      );

      const result = response.data;

      let paymentList = [];

      if (Array.isArray(result)) {
        paymentList = result;
      } else if (Array.isArray(result?.payments)) {
        paymentList = result.payments;
      } else if (Array.isArray(result?.data)) {
        paymentList = result.data;
      } else if (Array.isArray(result?.pendingPayments)) {
        paymentList = result.pendingPayments;
      }

      setPayments(paymentList);
    } catch (error) {
      console.error(
        "FETCH PENDING PAYMENTS ERROR:",
        error
      );

      setPayments([]);

      /*
       * Payment loading failure should not destroy
       * the complete admin dashboard.
       */
      console.error(
        error.response?.data?.message ||
          "Failed to load pending payments"
      );
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  // ============================================================
// FETCH SYSTEM STATS
// ============================================================

const fetchSystemStats = useCallback(async () => {
  try {
    console.log("ADMIN: Loading complete system statistics...");

    const response = await api.get("/admin/system-stats");

    console.log(
      "ADMIN SYSTEM STATS RESPONSE:",
      response.data
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
        "Failed to load system statistics"
      );
    }

    // Backend returns both direct values and stats object.
    // Prefer stats object, with direct response as fallback.
    const stats = response.data.stats || response.data;

    const newStats = {
      totalUsers: Number(stats.totalUsers ?? 0),
      activeUsers: Number(stats.activeUsers ?? 0),

      totalOrders: Number(stats.totalOrders ?? 0),

      ordersReceived: Number(
        stats.ordersReceived ?? 0
      ),

      pendingOrders: Number(
        stats.pendingOrders ?? 0
      ),

      totalProducts: Number(
        stats.totalProducts ?? 0
      ),

      totalStock: Number(
        stats.totalStock ?? 0
      ),

      totalRevenue: Number(
        stats.totalRevenue ?? 0
      )
    };

    console.log(
      "ADMIN FINAL SYSTEM STATS:",
      newStats
    );

    setSystemStats(newStats);

  } catch (error) {
    console.error(
      "FETCH SYSTEM STATS ERROR:",
      error
    );

    console.error(
      "STATUS:",
      error.response?.status
    );

    console.error(
      "DATA:",
      error.response?.data
    );

    // Don't overwrite successfully loaded values with 0.
    setSystemStats((previous) => ({
      ...previous
    }));
  }
}, []);

  // ============================================================
  // FETCH USERS
  // ============================================================

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get("/admin/users");

      console.log(
        "ADMIN USERS RESPONSE:",
        response.data
      );

      const result = response.data;

      let usersList = [];

      if (Array.isArray(result)) {
        usersList = result;
      } else if (Array.isArray(result?.users)) {
        usersList = result.users;
      } else if (Array.isArray(result?.data)) {
        usersList = result.data;
      }

      setUsers(usersList);
    } catch (error) {
      console.error(
        "FETCH USERS ERROR:",
        error
      );

      throw error;
    }
  }, []);

  // ============================================================
  // FETCH EVERYTHING
  // ============================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
        fetchPendingPayments(),
      ]);
    } catch (error) {
      console.error(
        "ADMIN DASHBOARD ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to load administration data";

      setErrorMessage(message);

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    fetchUsers,
    fetchSystemStats,
    fetchPendingPayments,
  ]);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // PAYMENT STATUS BADGE
  // ============================================================

  const getPaymentStatusBadge = (status) => {
    const normalized = String(
      status || "pending"
    ).toLowerCase();

    if (
      normalized === "approved" ||
      normalized === "completed" ||
      normalized === "success"
    ) {
      return (
        <Badge bg="success">
          <FaCheckCircle className="me-1" />
          Approved
        </Badge>
      );
    }

    if (
      normalized === "rejected" ||
      normalized === "failed"
    ) {
      return (
        <Badge bg="danger">
          <FaTimesCircle className="me-1" />
          Rejected
        </Badge>
      );
    }

    return (
      <Badge bg="warning" text="dark">
        <FaClock className="me-1" />
        Pending
      </Badge>
    );
  };

  // ============================================================
  // APPROVE PAYMENT
  // ============================================================

  const approvePayment = async (payment) => {
    if (!payment?.id) {
      toast.error("Invalid payment");
      return;
    }

    const confirmed = window.confirm(
      `Approve payment of ${formatAmount(
        payment.amount
      )} ETB?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPaymentActionLoading(true);

      console.log(
        "APPROVING PAYMENT:",
        payment.id
      );

      const response = await api.patch(
        `/admin/payments/${payment.id}/approve`
      );

      console.log(
        "APPROVE PAYMENT RESPONSE:",
        response.data
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message ||
            "Failed to approve payment"
        );
      }

      toast.success(
        response.data?.message ||
          "Payment approved successfully"
      );

      setShowPaymentModal(false);
      setSelectedPayment(null);

      await Promise.all([
        fetchPendingPayments(),
        fetchSystemStats(),
      ]);
    } catch (error) {
      console.error(
        "APPROVE PAYMENT ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to approve payment"
      );
    } finally {
      setPaymentActionLoading(false);
    }
  };

  // ============================================================
  // OPEN PAYMENT DETAILS
  // ============================================================

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  // ============================================================
  // OPEN REJECT PAYMENT
  // ============================================================

  const openRejectPayment = (payment) => {
    if (!payment?.id) {
      toast.error("Invalid payment");
      return;
    }

    setSelectedPayment(payment);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // ============================================================
  // REJECT PAYMENT
  // ============================================================

  const rejectPayment = async (e) => {
    e.preventDefault();

    if (!selectedPayment?.id) {
      toast.error("Invalid payment");
      return;
    }

    if (!rejectReason.trim()) {
      toast.error(
        "Please enter a rejection reason"
      );
      return;
    }

    try {
      setPaymentActionLoading(true);

      const response = await api.patch(
        `/admin/payments/${selectedPayment.id}/reject`,
        {
          reason: rejectReason.trim(),
        }
      );

      console.log(
        "REJECT PAYMENT RESPONSE:",
        response.data
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message ||
            "Failed to reject payment"
        );
      }

      toast.success(
        response.data?.message ||
          "Payment rejected successfully"
      );

      setShowRejectModal(false);
      setShowPaymentModal(false);

      setSelectedPayment(null);
      setRejectReason("");

      await fetchPendingPayments();
    } catch (error) {
      console.error(
        "REJECT PAYMENT ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to reject payment"
      );
    } finally {
      setPaymentActionLoading(false);
    }
  };

  // ============================================================
  // USER MODAL
  // ============================================================

  const handleShowUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);

      setFormData({
        username: user.username || "",
        email: user.email || "",
        password: "",
        full_name: user.full_name || "",
        phone: user.phone || "",
        address: user.address || "",
        role_id: Number(user.role_id || 5),
        is_active: isUserActive(user),
      });
    } else {
      setEditingUser(null);

      setFormData({
        username: "",
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: "",
        role_id: 5,
        is_active: true,
      });
    }

    setShowUserModal(true);
  };

  // ============================================================
  // CLOSE USER MODAL
  // ============================================================

  const handleCloseUserModal = () => {
    if (saving) {
      return;
    }

    setShowUserModal(false);
    setEditingUser(null);

    setFormData({
      username: "",
      email: "",
      password: "",
      full_name: "",
      phone: "",
      address: "",
      role_id: 5,
      is_active: true,
    });
  };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleFormChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // ============================================================
  // SAVE USER
  // ============================================================

  const handleSaveUser = async (e) => {
    e.preventDefault();

    const username = formData.username.trim();
    const email = formData.email.trim();
    const fullName = formData.full_name.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();

    if (!username) {
      toast.error("Username is required");
      return;
    }

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (!fullName) {
      toast.error("Full name is required");
      return;
    }

    if (
      !editingUser &&
      formData.password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters"
      );
      return;
    }

    if (
      editingUser &&
      formData.password.trim() &&
      formData.password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters"
      );
      return;
    }

    try {
      setSaving(true);

      if (editingUser) {
        const updateData = {
          username,
          email,
          full_name: fullName,
          phone,
          address,
          role_id: Number(formData.role_id),
          is_active: Boolean(formData.is_active),
        };

        if (formData.password.trim()) {
          updateData.password =
            formData.password;
        }

        console.log(
          "UPDATING USER:",
          editingUser.id,
          updateData
        );

        await api.put(
          `/admin/users/${editingUser.id}`,
          updateData
        );

        toast.success(
          "User updated successfully"
        );
      } else {
        const createData = {
          username,
          email,
          password: formData.password,
          full_name: fullName,
          phone,
          address,
          role_id: Number(formData.role_id),
          is_active: Boolean(formData.is_active),
        };

        console.log(
          "CREATING USER:",
          createData
        );

        await api.post(
          "/admin/users",
          createData
        );

        toast.success(
          Number(formData.role_id) === 6
            ? "Member created successfully"
            : "User created successfully"
        );
      }

      handleCloseUserModal();

      await fetchData();
    } catch (error) {
      console.error(
        "SAVE USER ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to save user"
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // TOGGLE USER STATUS
  // ============================================================

  const handleToggleUserStatus = async (
    userId
  ) => {
    if (!userId) {
      toast.error("Invalid user");
      return;
    }

    try {
      await api.patch(
        `/admin/users/${userId}/toggle-status`
      );

      toast.success(
        "User status updated"
      );

      await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
      ]);
    } catch (error) {
      console.error(
        "TOGGLE USER ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to change user status"
      );
    }
  };

  // ============================================================
  // DELETE USER
  // ============================================================

  const handleDeleteUser = async (
    userId,
    username
  ) => {
    if (!userId) {
      toast.error("Invalid user");
      return;
    }

    const confirmed = window.confirm(
      `Delete user "${username}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/admin/users/${userId}`
      );

      toast.success(
        "User deleted successfully"
      );

      await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
      ]);
    } catch (error) {
      console.error(
        "DELETE USER ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to delete user"
      );
    }
  };

  // ============================================================
  // MEMBER USERS
  // IMPORTANT:
  // Detect member by role_id OR member_id.
  // ============================================================

  const memberUsers = useMemo(() => {
    return users.filter((user) => {
      return (
        Number(user.role_id) === 6 ||
        Number(user.member_id) > 0
      );
    });
  }, [users]);

  // ============================================================
  // OPEN MEMBER FINANCIAL
  // ============================================================

  const openMemberFinancial = async (
    memberUser
  ) => {
    if (!memberUser) {
      toast.error("Invalid member");
      return;
    }

    if (!memberUser.member_id) {
      toast.error(
        "This member does not have a valid member ID."
      );
      return;
    }

    try {
      setSelectedMember(memberUser);

      setShowFinancialModal(true);

      setFinancialLoading(true);

      const response = await api.get(
        `/admin/members/${memberUser.member_id}/financial`
      );

      console.log(
        "MEMBER FINANCIAL RESPONSE:",
        response.data
      );

      if (response.data?.success) {
        setFinancial(
          response.data.financial || {
            savings: 0,
            shares: 0,
            totalLoanAmount: 0,
            activeLoans: 0,
            transactionCount: 0,
          }
        );

        setMemberTransactions(
          Array.isArray(
            response.data.transactions
          )
            ? response.data.transactions
            : []
        );

        // Load only this selected member's loans.
        await loadMemberLoans(memberUser.member_id);
      } else {
        throw new Error(
          response.data?.message ||
            "Failed to load financial information"
        );
      }
    } catch (error) {
      console.error(
        "MEMBER FINANCIAL ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load member financial information"
      );
    } finally {
      setFinancialLoading(false);
    }
  };

  // ============================================================
  // OPEN FINANCIAL ACTION
  // ============================================================

  const openFinancialAction = (
    type
  ) => {
    if (!selectedMember) {
      toast.error("No member selected");
      return;
    }

    setActionType(type);

    setActionData({
      amount: "",
      type: "deposit",
      share_count: "",
      amount: "",
      transaction_type: "deposit",
      description: "",
      reference_number: "",
    });

    setShowActionModal(true);
  };

  // ============================================================
  // CLOSE FINANCIAL ACTION
  // ============================================================

  const closeFinancialAction = () => {
    if (actionLoading) {
      return;
    }

    setShowActionModal(false);
  };

  // ============================================================
  // ACTION FORM CHANGE
  // ============================================================

  const handleActionChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setActionData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // SUBMIT FINANCIAL ACTION
  // ============================================================

  const submitFinancialAction = async (
    e
  ) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error("No member selected");
      return;
    }

    if (!selectedMember.member_id) {
      toast.error(
        "Selected member has no member ID"
      );
      return;
    }

    try {
      setActionLoading(true);

      let response = null;

      // --------------------------------------------------------
      // SAVINGS
      // --------------------------------------------------------

      if (actionType === "savings") {
        const amount = Number(
          actionData.amount
        );

        if (amount <= 0) {
          toast.error(
            "Enter a valid amount"
          );
          return;
        }

        response = await api.post(
          `/admin/members/${selectedMember.member_id}/savings`,
          {
            amount,
            type: actionData.type,
            description:
              actionData.description.trim(),
          }
        );
      }

      // --------------------------------------------------------
      // SHARES
      // --------------------------------------------------------

      else if (actionType === "shares") {
        const shareCount = Number(
          actionData.share_count
        );

        if (shareCount <= 0) {
          toast.error(
            "Enter a valid share count"
          );
          return;
        }

        response = await api.post(
          `/admin/members/${selectedMember.member_id}/shares`,
          {
            share_count: shareCount,
            description:
              actionData.description.trim(),
          }
        );
      }

    // --------------------------------------------------------
// LOAN
// --------------------------------------------------------

else if (actionType === "loan") {

    const loanAmount = Number(
        actionData.amount
    );

    const termMonths = Number(
        actionData.term_months
    );

    // Validate loan amount
    if (
        !Number.isFinite(loanAmount) ||
        loanAmount <= 0
    ) {

        toast.error(
            "Enter a valid loan amount"
        );

        return;
    }

    // Validate loan term
    if (
        !Number.isInteger(termMonths) ||
        termMonths <= 0
    ) {

        toast.error(
            "Loan term must be greater than zero"
        );

        return;
    }

    console.log(
        "LOAN DATA BEING SENT:",
        {
            amount: loanAmount,
            term_months: termMonths,
            description:
                actionData.description?.trim() || ""
        }
    );

    response = await api.post(
        `/admin/members/${selectedMember.member_id}/loans`,
        {
            amount: loanAmount,

            term_months: termMonths,

            description:
                actionData.description?.trim() || ""
        }
    );
}

      // --------------------------------------------------------
      // TRANSACTION
      // --------------------------------------------------------

      else if (
        actionType === "transaction"
      ) {
        const amount = Number(
          actionData.amount
        );

        if (amount <= 0) {
          toast.error(
            "Enter a valid amount"
          );
          return;
        }

        response = await api.post(
          `/admin/members/${selectedMember.member_id}/transactions`,
          {
            transaction_type:
              actionData.transaction_type,
            amount,
            description:
              actionData.description.trim(),
            reference_number:
              actionData.reference_number.trim(),
          }
        );
      } else {
        toast.error(
          "Invalid financial operation"
        );
        return;
      }

      console.log(
        "FINANCIAL ACTION RESPONSE:",
        response?.data
      );

      if (response?.data?.success) {
        toast.success(
          response.data.message ||
            "Operation completed successfully"
        );

        setShowActionModal(false);

        await openMemberFinancial(
          selectedMember
        );
      } else {
        throw new Error(
          response?.data?.message ||
            "Operation failed"
        );
      }
    } catch (error) {
      console.error(
        "FINANCIAL ACTION ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Operation failed"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredUsers = useMemo(() => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    if (!search) {
      return users;
    }

    return users.filter((user) => {
      const username = String(
        user.username || ""
      ).toLowerCase();

      const email = String(
        user.email || ""
      ).toLowerCase();

      const fullName = String(
        user.full_name || ""
      ).toLowerCase();

      const role = String(
        roleNames[Number(user.role_id)] || ""
      ).toLowerCase();

      return (
        username.includes(search) ||
        email.includes(search) ||
        fullName.includes(search) ||
        role.includes(search)
      );
    });
  }, [users, searchTerm]);

  // ============================================================
  // ROLE BADGE
  // ============================================================

  const getRoleBadge = (roleId) => {
    const role =
      roleNames[Number(roleId)] ||
      "Unknown";

    const variants = {
      Admin: "danger",
      Manager: "primary",
      Accountant: "warning",
      Supplier: "success",
      Customer: "info",
      Member: "secondary",
    };

    return (
      <Badge
        bg={
          variants[role] ||
          "secondary"
        }
      >
        {role}
      </Badge>
    );
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <Container
        fluid
        className="admin-dashboard loading-screen"
      >
        <Spinner
          animation="border"
          variant="primary"
        />

        <p>
          Loading administration dashboard...
        </p>
      </Container>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <Container
      fluid
      className="admin-dashboard py-4 px-3 px-md-4"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">
        <div>
          <div className="header-title">
            <div className="admin-header-icon">
              <FaUsers />
            </div>

            <div>
              <h2>
                System Administration
              </h2>

              <p>
                Manage users, members,
                payments and cooperative
                finances.
              </p>
            </div>
          </div>
        </div>

        <Button
          className="add-user-btn"
          onClick={() =>
            handleShowUserModal()
          }
        >
          <FaPlus className="me-2" />
          Add New User
        </Button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {errorMessage && (
        <Alert
          variant="danger"
          className="mt-3"
        >
          <strong>
            Dashboard Error:
          </strong>{" "}
          {errorMessage}
        </Alert>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <Row className="g-4 mt-2">
        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card stat-users">
            <Card.Body>
              <div>
                <span>
                  Total Users
                </span>

                <h2>
                  {systemStats.totalUsers}
                </h2>
              </div>

              <FaUsers />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card stat-active">
            <Card.Body>
              <div>
                <span>
                  Active Users
                </span>

                <h2>
                  {systemStats.activeUsers}
                </h2>
              </div>

              <FaUserCheck />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card stat-orders">
            <Card.Body>
              <div>
                <span>
                  Total Orders
                </span>

                <h2>
                  {systemStats.totalOrders}
                </h2>
              </div>

              <FaShoppingCart />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card stat-revenue">
            <Card.Body>
              <div>
                <span>
                  Total Revenue
                </span>

                <h2>
                  {formatAmount(
                    systemStats.totalRevenue
                  )}{" "}
                  ETB
                </h2>
              </div>

              <FaMoneyBillWave />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ======================================================
          PAYMENT APPROVAL
      ====================================================== */}

      <Card className="payment-management-card mt-5">
        <Card.Body>
          <div className="section-title">
            <div>
              <h3>
                <FaCreditCard className="me-2" />
                Payment Approval
              </h3>

              <p>
                Review and approve or reject
                customer and member payments.
              </p>
            </div>

            <Badge
              bg={
                payments.length > 0
                  ? "warning"
                  : "success"
              }
              text={
                payments.length > 0
                  ? "dark"
                  : "white"
              }
            >
              {payments.length} Pending
            </Badge>
          </div>

          {paymentLoading ? (
            <div className="text-center py-5">
              <Spinner
                animation="border"
                variant="primary"
              />

              <p className="mt-2">
                Loading pending payments...
              </p>
            </div>
          ) : payments.length > 0 ? (
            <div className="table-responsive">
              <Table
                hover
                className="payment-table"
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>
                      Customer / Member
                    </th>
                    <th>Amount</th>
                    <th>
                      Payment Method
                    </th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map(
                    (
                      payment,
                      index
                    ) => {
                      const paymentUser =
                        payment.full_name ||
                        payment.member_name ||
                        payment.customer_name ||
                        payment.username ||
                        payment.user_name ||
                        "Unknown User";

                      return (
                        <tr
                          key={
                            payment.id ||
                            `payment-${index}`
                          }
                        >
                          <td>
                            {index + 1}
                          </td>

                          <td>
                            <strong>
                              {paymentUser}
                            </strong>

                            {(
                              payment.email ||
                              payment.username
                            ) && (
                              <small className="d-block text-muted">
                                {payment.email ||
                                  `@${payment.username}`}
                              </small>
                            )}
                          </td>

                          <td>
                            <strong className="text-success">
                              {formatAmount(
                                payment.amount
                              )}{" "}
                              ETB
                            </strong>
                          </td>

                          <td>
                            <Badge
                              bg="light"
                              text="dark"
                            >
                              {payment.payment_method ||
                                payment.method ||
                                "Payment"}
                            </Badge>
                          </td>

                          <td>
                            {payment.reference_number ||
                              payment.transaction_reference ||
                              payment.reference ||
                              "-"}
                          </td>

                          <td>
                            {payment.payment_date ||
                            payment.created_at
                              ? new Date(
                                  payment.payment_date ||
                                    payment.created_at
                                ).toLocaleDateString()
                              : "-"}
                          </td>

                          <td>
                            {getPaymentStatusBadge(
                              payment.status
                            )}
                          </td>

                          <td>
                            <div className="d-flex gap-2 justify-content-center">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  openPaymentDetails(
                                    payment
                                  )
                                }
                              >
                                <FaEye />
                              </Button>

                              <Button
                                size="sm"
                                variant="success"
                                disabled={
                                  paymentActionLoading
                                }
                                onClick={() =>
                                  approvePayment(
                                    payment
                                  )
                                }
                              >
                                <FaCheckCircle className="me-1" />
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                disabled={
                                  paymentActionLoading
                                }
                                onClick={() =>
                                  openRejectPayment(
                                    payment
                                  )
                                }
                              >
                                <FaTimesCircle className="me-1" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaCheckCircle
                size={45}
                className="text-success mb-3"
              />

              <h5>
                No Pending Payments
              </h5>

              <p className="text-muted mb-0">
                All payments have been
                processed.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ======================================================
          MEMBER FINANCIAL MANAGEMENT
      ====================================================== */}

      <Card className="member-management-card mt-5">
        <Card.Body>
          <div className="section-title">
            <div>
              <h3>
                Member Financial Management
              </h3>

              <p>
                Add savings, shares, loans
                and transactions for
                cooperative members.
              </p>
            </div>

            <Badge bg="dark">
              {memberUsers.length} Members
            </Badge>
          </div>

          <div className="table-responsive">
            <Table
              hover
              className="member-table"
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Membership</th>
                  <th>Status</th>
                  <th className="text-center">
                    Financial Management
                  </th>
                </tr>
              </thead>

              <tbody>
                {memberUsers.length > 0 ? (
                  memberUsers.map(
                    (
                      memberUser,
                      index
                    ) => (
                      <tr
                        key={
                          memberUser.id ||
                          `member-${index}`
                        }
                      >
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {memberUser.full_name ||
                              memberUser.username}
                          </strong>

                          <small className="d-block">
                            @
                            {
                              memberUser.username
                            }
                          </small>
                        </td>

                        <td>
                          {memberUser.email ||
                            "-"}
                        </td>

                        <td>
                          <Badge
                            bg="light"
                            text="dark"
                          >
                            {memberUser.membership_number ||
                              "Not assigned"}
                          </Badge>
                        </td>

                        <td>
                          <Badge
                            bg={
                              isUserActive(
                                memberUser
                              )
                                ? "success"
                                : "secondary"
                            }
                          >
                            {isUserActive(
                              memberUser
                            )
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </td>

                        <td>
                          <div className="member-actions">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              disabled={
                                !memberUser.member_id
                              }
                              onClick={() =>
                                openMemberFinancial(
                                  memberUser
                                )
                              }
                            >
                              <FaWallet className="me-1" />
                              Manage Finances
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-table"
                    >
                      <FaUsers />

                      <p>
                        No members found.
                      </p>

                      <small>
                        Create a user with
                        role{" "}
                        <strong>
                          Member
                        </strong>{" "}
                        first.
                      </small>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* ======================================================
          USER MANAGEMENT
      ====================================================== */}

      <Card className="user-card mt-5">
        <Card.Body className="p-0">
          <div className="user-management-header p-4">
            <Row className="align-items-center g-3">
              <Col xs={12} lg={5}>
                <h3>
                  User Management
                </h3>

                <p>
                  {filteredUsers.length}{" "}
                  user(s) found
                </p>
              </Col>

              <Col xs={12} lg={7}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>

                  <Form.Control
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                  />

                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      onClick={() =>
                        setSearchTerm("")
                      }
                    >
                      <FaTimes />
                    </Button>
                  )}
                </InputGroup>
              </Col>
            </Row>
          </div>

          <div className="table-responsive">
            <Table
              hover
              className="admin-user-table mb-0"
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(
                    (
                      user,
                      index
                    ) => (
                      <tr
                        key={
                          user.id ||
                          `user-${index}`
                        }
                      >
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {
                              user.username
                            }
                          </strong>
                        </td>

                        <td>
                          {user.email ||
                            "-"}
                        </td>

                        <td>
                          {user.full_name ||
                            "-"}
                        </td>

                        <td>
                          {getRoleBadge(
                            user.role_id
                          )}
                        </td>

                        <td>
                          <Badge
                            bg={
                              isUserActive(
                                user
                              )
                                ? "success"
                                : "secondary"
                            }
                          >
                            {isUserActive(
                              user
                            )
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() =>
                                handleShowUserModal(
                                  user
                                )
                              }
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              size="sm"
                              variant={
                                isUserActive(
                                  user
                                )
                                  ? "outline-warning"
                                  : "outline-success"
                              }
                              onClick={() =>
                                handleToggleUserStatus(
                                  user.id
                                )
                              }
                            >
                              {isUserActive(
                                user
                              ) ? (
                                <FaToggleOn />
                              ) : (
                                <FaToggleOff />
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() =>
                                handleDeleteUser(
                                  user.id,
                                  user.username
                                )
                              }
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-5"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* ======================================================
          USER MODAL
      ====================================================== */}

      <Modal
        show={showUserModal}
        onHide={handleCloseUserModal}
        centered
        size="lg"
      >
        <Modal.Header
          closeButton
          className="modal-header-blue"
        >
          <Modal.Title>
            {editingUser
              ? "Edit User"
              : "Add New User"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSaveUser}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Username *
                  </Form.Label>

                  <Form.Control
                    name="username"
                    value={
                      formData.username
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Email *
                  </Form.Label>

                  <Form.Control
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>
                Full Name *
              </Form.Label>

              <Form.Control
                name="full_name"
                value={
                  formData.full_name
                }
                onChange={
                  handleFormChange
                }
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
     <Form.Group className="mb-3">
  <Form.Label>Phone Number</Form.Label>

  <PhoneInput
    country="et"
    value={formData.phone}
    onChange={(phone) =>
      setFormData((prev) => ({
        ...prev,
        phone: `+${phone}`
      }))
    }
    enableSearch={true}
    countryCodeEditable={false}
    inputProps={{
      name: "phone",
      required: true,
      autoComplete: "tel"
    }}
    containerClass="phone-input-container"
    inputClass="phone-input"
  />
</Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Role
                  </Form.Label>

                  <Form.Select
                    name="role_id"
                    value={
                      formData.role_id
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="1">
                      Admin
                    </option>

                    <option value="2">
                      Manager
                    </option>

                    <option value="3">
                      Accountant
                    </option>

                    <option value="4">
                      Supplier
                    </option>

                    <option value="5">
                      Customer
                    </option>

                    <option value="6">
                      Member
                    </option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

           <Form.Group className="mb-3">
  <Form.Label>City / Address</Form.Label>

  <Form.Select
    name="address"
    value={formData.address}
    onChange={(e) =>
  setFormData((prev) => ({
    ...prev,
    address: e.target.value
  }))
}
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
    <option value="Amboo">Amboo</option>
    <option value="Jeldu">Jeldu</option>
    <option value="Wolaita Sodo">Wolaita Sodo</option>
  </Form.Select>
</Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Password{" "}
                {!editingUser && " *"}
              </Form.Label>

              <Form.Control
                type="password"
                name="password"
                value={
                  formData.password
                }
                onChange={
                  handleFormChange
                }
                required={!editingUser}
                minLength={6}
                placeholder={
                  editingUser
                    ? "Leave blank to keep current password"
                    : "Minimum 6 characters"
                }
              />
            </Form.Group>

            <Form.Check
              type="switch"
              name="is_active"
              label={
                formData.is_active
                  ? "Active"
                  : "Inactive"
              }
              checked={
                formData.is_active
              }
              onChange={
                handleFormChange
              }
            />
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={
                handleCloseUserModal
              }
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner
                    size="sm"
                    animation="border"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : editingUser ? (
                "Update User"
              ) : (
                "Create User"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ======================================================
          PAYMENT DETAILS MODAL
      ====================================================== */}

      <Modal
        show={showPaymentModal}
        onHide={() => {
          if (!paymentActionLoading) {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCreditCard className="me-2" />
            Payment Details
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedPayment && (
            <>
              <Row className="g-3">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6 className="text-muted">
                        Payer
                      </h6>

                      <h5>
                        {selectedPayment.full_name ||
                          selectedPayment.member_name ||
                          selectedPayment.customer_name ||
                          selectedPayment.username ||
                          selectedPayment.user_name ||
                          "Unknown"}
                      </h5>

                      <p className="mb-1">
                        Email:{" "}
                        {selectedPayment.email ||
                          "-"}
                      </p>

                      <p className="mb-0">
                        Phone:{" "}
                        {selectedPayment.phone ||
                          "-"}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="h-100">
                    <Card.Body>
                      <h6 className="text-muted">
                        Payment
                      </h6>

                      <h4 className="text-success">
                        {formatAmount(
                          selectedPayment.amount
                        )}{" "}
                        ETB
                      </h4>

                      <p className="mb-1">
                        Method:{" "}
                        {selectedPayment.payment_method ||
                          selectedPayment.method ||
                          "-"}
                      </p>

                      <p className="mb-0">
                        Status:{" "}
                        {getPaymentStatusBadge(
                          selectedPayment.status
                        )}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="mt-3">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p>
                        <strong>
                          Reference Number:
                        </strong>
                        <br />

                        {selectedPayment.reference_number ||
                          selectedPayment.transaction_reference ||
                          selectedPayment.reference ||
                          "-"}
                      </p>
                    </Col>

                    <Col md={6}>
                      <p>
                        <strong>
                          Payment Date:
                        </strong>
                        <br />

                        {selectedPayment.payment_date ||
                        selectedPayment.created_at
                          ? new Date(
                              selectedPayment.payment_date ||
                                selectedPayment.created_at
                            ).toLocaleString()
                          : "-"}
                      </p>
                    </Col>
                  </Row>

                  <p className="mb-0">
                    <strong>
                      Description:
                    </strong>

                    <br />

                    {selectedPayment.description ||
                      "-"}
                  </p>
                </Card.Body>
              </Card>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedPayment(null);
            }}
            disabled={
              paymentActionLoading
            }
          >
            Close
          </Button>

          {selectedPayment && (
            <>
              <Button
                variant="danger"
                onClick={() =>
                  openRejectPayment(
                    selectedPayment
                  )
                }
                disabled={
                  paymentActionLoading
                }
              >
                <FaTimesCircle className="me-1" />
                Reject
              </Button>

              <Button
                variant="success"
                onClick={() =>
                  approvePayment(
                    selectedPayment
                  )
                }
                disabled={
                  paymentActionLoading
                }
              >
                {paymentActionLoading ? (
                  <>
                    <Spinner
                      size="sm"
                      animation="border"
                      className="me-2"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="me-1" />
                    Approve Payment
                  </>
                )}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* ======================================================
          REJECT PAYMENT MODAL
      ====================================================== */}

      <Modal
        show={showRejectModal}
        onHide={() => {
          if (!paymentActionLoading) {
            setShowRejectModal(false);
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FaTimesCircle className="me-2" />
            Reject Payment
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={rejectPayment}>
          <Modal.Body>
            {selectedPayment && (
              <Alert variant="warning">
                You are rejecting a payment
                of{" "}
                <strong>
                  {formatAmount(
                    selectedPayment.amount
                  )}{" "}
                  ETB
                </strong>
                .
              </Alert>
            )}

            <Form.Group>
              <Form.Label>
                Rejection Reason *
              </Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                value={
                  rejectReason
                }
                onChange={(e) =>
                  setRejectReason(
                    e.target.value
                  )
                }
                placeholder="Enter the reason for rejecting this payment..."
                required
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() =>
                setShowRejectModal(false)
              }
              disabled={
                paymentActionLoading
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="danger"
              disabled={
                paymentActionLoading
              }
            >
              {paymentActionLoading ? (
                <>
                  <Spinner
                    size="sm"
                    animation="border"
                    className="me-2"
                  />
                  Rejecting...
                </>
              ) : (
                <>
                  <FaTimesCircle className="me-1" />
                  Reject Payment
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

   {/* ======================================================
    MEMBER FINANCIAL MODAL
====================================================== */}

<Modal
    show={showFinancialModal}
    onHide={() => {
        setShowFinancialModal(false);
        setSelectedLoan(null);
        setRepaymentAmount("");
    }}
    size="xl"
    centered
>

    <Modal.Header
        closeButton
        className="financial-modal-header"
    >

        <Modal.Title>

            <FaWallet className="me-2" />

            Member Financial Management

        </Modal.Title>

    </Modal.Header>


    <Modal.Body>

        {financialLoading ? (

            <div className="financial-loading">

                <Spinner
                    animation="border"
                    variant="primary"
                />

                <p>
                    Loading financial information...
                </p>

            </div>

        ) : (

            <>

                {/* ==================================================
                    MEMBER INFORMATION
                ================================================== */}

                {selectedMember && (

                    <div className="selected-member">

                        <div>

                            <h4>

                                {
                                    selectedMember.full_name ||
                                    selectedMember.username
                                }

                            </h4>

                            <p>

                                @
                                {
                                    selectedMember.username
                                }

                                {" • "}

                                {
                                    selectedMember.email
                                }

                            </p>

                        </div>


                        <Badge bg="dark">

                            {
                                selectedMember.membership_number ||
                                "Member"
                            }

                        </Badge>

                    </div>

                )}


                {/* ==================================================
                    FINANCIAL SUMMARY
                ================================================== */}

                <Row className="g-3 mt-2">


                    {/* TOTAL SAVINGS */}

                    <Col md={3}>

                        <div className="finance-card savings-card">

                            <FaPiggyBank />

                            <span>
                                Total Savings
                            </span>

                            <strong>

                                {formatAmount(
                                    financial.savings
                                )}

                                {" "}ETB

                            </strong>

                        </div>

                    </Col>


                    {/* SHARES */}

                    <Col md={3}>

                        <div className="finance-card shares-card">

                            <FaChartLine />

                            <span>
                                Shares
                            </span>

                            <strong>

                                {
                                    financial.shares || 0
                                }

                            </strong>

                        </div>

                    </Col>


                    {/* TOTAL LOAN */}

                    <Col md={3}>

                        <div className="finance-card loans-card">

                            <FaHandHoldingUsd />

                            <span>
                                Total Loan Amount
                            </span>

                            <strong>

                                ETB{" "}

                                {Number(
                                    financial.totalLoanAmount || 0
                                ).toFixed(2)}

                            </strong>

                        </div>

                    </Col>


                    {/* TRANSACTIONS */}

                    <Col md={3}>

                        <div className="finance-card transaction-card">

                            <FaExchangeAlt />

                            <span>
                                Transactions
                            </span>

                            <strong>

                                {
                                    financial.transactionCount ||
                                    0
                                }

                            </strong>

                        </div>

                    </Col>

                </Row>


                {/* ==================================================
                    ADD FINANCIAL INFORMATION
                ================================================== */}

                <div className="finance-action-area mt-4">

                    <h5>
                        Add Financial Information
                    </h5>


                    <div className="finance-buttons">


                        {/* SAVINGS */}

                        <Button
                            className="finance-btn savings-btn"
                            onClick={() =>
                                openFinancialAction(
                                    "savings"
                                )
                            }
                        >

                            <FaPiggyBank />

                            Add Savings

                        </Button>


                        {/* SHARES */}

                        <Button
                            className="finance-btn shares-btn"
                            onClick={() =>
                                openFinancialAction(
                                    "shares"
                                )
                            }
                        >

                            <FaChartLine />

                            Add Shares

                        </Button>


                        {/* LOAN */}

                        <Button
                            className="finance-btn loan-btn"
                            onClick={() =>
                                openFinancialAction(
                                    "loan"
                                )
                            }
                        >

                            <FaHandHoldingUsd />

                            Add Loan

                        </Button>


                        {/* TRANSACTION */}

                        <Button
                            className="finance-btn transaction-btn"
                            onClick={() =>
                                openFinancialAction(
                                    "transaction"
                                )
                            }
                        >

                            <FaExchangeAlt />

                            Add Transaction

                        </Button>

                    </div>

                </div>


                {/* ==================================================
                    MEMBER LOANS
                ================================================== */}

                <div className="member-loans-section mt-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <div>

                            <h5 className="mb-1">
                                Member Loans
                            </h5>

                            <p className="text-muted mb-0">

                                Loans belonging to this member

                            </p>

                        </div>


                        <Badge bg="primary">

                            {memberLoans.length}

                            {" "}

                            {
                                memberLoans.length === 1
                                    ? "Loan"
                                    : "Loans"
                            }

                        </Badge>

                    </div>


                    {memberLoans.length > 0 ? (

                        <div className="table-responsive">

                            <Table
                                hover
                                striped
                                bordered
                                className="align-middle"
                            >

                                <thead>

                                    <tr>

                                        <th>
                                            #
                                        </th>

                                        <th>
                                            Loan Amount
                                        </th>

                                        <th>
                                            Interest
                                        </th>

                                        <th>
                                            Term
                                        </th>

                                        <th>
                                            Remaining Balance
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Due Date
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {memberLoans.map(
                                        (loan, index) => {

                                            const remaining =
                                                Number(
                                                    loan.remaining_balance || 0
                                                );

                                            return (

                                                <tr
                                                    key={
                                                        loan.id ||
                                                        `loan-${index}`
                                                    }
                                                >

                                                    {/* NUMBER */}

                                                    <td>

                                                        {index + 1}

                                                    </td>


                                                    {/* LOAN AMOUNT */}

                                                    <td>

                                                        <strong>

                                                            ETB{" "}

                                                            {Number(
                                                                loan.amount || 0
                                                            ).toFixed(2)}

                                                        </strong>

                                                    </td>


                                                    {/* INTEREST */}

                                                    <td>

                                                        {Number(
                                                            loan.interest_rate || 0
                                                        ).toFixed(2)}

                                                        %

                                                    </td>


                                                    {/* TERM */}

                                                    <td>

                                                        {
                                                            loan.term_months ||
                                                            0
                                                        }

                                                        {" "}

                                                        months

                                                    </td>


                                                    {/* REMAINING */}

                                                    <td>

                                                        <strong
                                                            className={
                                                                remaining > 0
                                                                    ? "text-danger"
                                                                    : "text-success"
                                                            }
                                                        >

                                                            ETB{" "}

                                                            {remaining.toFixed(
                                                                2
                                                            )}

                                                        </strong>

                                                    </td>


                                                    {/* STATUS */}

                                                    <td>

                                                        <Badge
                                                            bg={
                                                                loan.status ===
                                                                "completed"
                                                                    ? "success"
                                                                    : loan.status ===
                                                                      "active"
                                                                        ? "primary"
                                                                        : loan.status ===
                                                                          "approved"
                                                                            ? "info"
                                                                            : loan.status ===
                                                                              "pending"
                                                                                ? "warning"
                                                                                : "secondary"
                                                            }
                                                        >

                                                            {
                                                                loan.status
                                                            }

                                                        </Badge>

                                                    </td>


                                                    {/* DUE DATE */}

                                                    <td>

                                                        {
                                                            loan.due_date
                                                                ? new Date(
                                                                      loan.due_date
                                                                  ).toLocaleDateString()
                                                                : "-"
                                                        }

                                                    </td>


                                                    {/* ACTION */}

                                                    <td>

                                                        {remaining > 0 &&
                                                        loan.status !==
                                                            "completed" ? (

                                                            <Button
                                                                type="button"
                                                                variant="success"
                                                                size="sm"
                                                                onClick={() => {

                                                                    setSelectedLoan(
                                                                        loan
                                                                    );

                                                                    setRepaymentAmount(
                                                                        ""
                                                                    );

                                                                    setShowRepaymentModal(
                                                                        true
                                                                    );

                                                                }}
                                                            >

                                                                <FaMoneyBillWave
                                                                    className="me-1"
                                                                />

                                                                Repay Loan

                                                            </Button>

                                                        ) : (

                                                            <Badge
                                                                bg="success"
                                                            >

                                                                ✓ Fully Repaid

                                                            </Badge>

                                                        )}

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )}

                                </tbody>

                            </Table>

                        </div>

                    ) : (

                        <div
                            className="text-center text-muted py-4 border rounded"
                        >

                            <FaHandHoldingUsd
                                size={35}
                                className="mb-2"
                            />

                            <p className="mb-0">

                                This member has no loans.

                            </p>

                        </div>

                    )}

                </div>


                {/* ==================================================
                    RECENT TRANSACTIONS
                ================================================== */}

                <div className="financial-transactions mt-4">

                    <h5>
                        Recent Transactions
                    </h5>


                    <div className="table-responsive">

                        <Table
                            hover
                            striped
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
                                        Reference
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {memberTransactions.length > 0 ? (

                                    memberTransactions.map(
                                        (
                                            transaction,
                                            index
                                        ) => (

                                            <tr
                                                key={
                                                    transaction.id ||
                                                    `transaction-${index}`
                                                }
                                            >

                                                <td>

                                                    {
                                                        transaction.transaction_date
                                                            ? new Date(
                                                                  transaction.transaction_date
                                                              ).toLocaleDateString()
                                                            : "-"
                                                    }

                                                </td>


                                                <td>

                                                    <Badge
                                                        bg={
                                                            transaction.transaction_type ===
                                                            "withdrawal"
                                                                ? "danger"
                                                                : transaction.transaction_type ===
                                                                  "loan_payment"
                                                                    ? "info"
                                                                    : "success"
                                                        }
                                                    >

                                                        {
                                                            transaction.transaction_type ||
                                                            "transaction"
                                                        }

                                                    </Badge>

                                                </td>


                                                <td>

                                                    {
                                                        transaction.description ||
                                                        "-"
                                                    }

                                                </td>


                                                <td>

                                                    <strong>

                                                        {
                                                            formatAmount(
                                                                transaction.amount
                                                            )
                                                        }

                                                        {" "}ETB

                                                    </strong>

                                                </td>


                                                <td>

                                                    {
                                                        transaction.reference_number ||
                                                        "-"
                                                    }

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

                                            No transactions found.

                                        </td>

                                    </tr>

                                )}

                            </tbody>

                        </Table>

                    </div>

                </div>

            </>

        )}

    </Modal.Body>


    {/* ==========================================================
        FINANCIAL MODAL FOOTER
    ========================================================== */}

    <Modal.Footer>

        <Button
            variant="secondary"
            onClick={() => {

                setShowFinancialModal(false);

                setSelectedLoan(null);

                setRepaymentAmount("");

            }}
        >

            Close

        </Button>

    </Modal.Footer>

</Modal>

{/* ======================================================
    LOAN REPAYMENT MODAL
====================================================== */}

<Modal
    show={showRepaymentModal}
    onHide={() => {

        if (!repaymentLoading) {

            setShowRepaymentModal(false);

            setSelectedLoan(null);

            setRepaymentAmount("");

        }

    }}
    centered
>

    <Modal.Header closeButton>

        <Modal.Title>

            <FaMoneyBillWave className="me-2" />

            Loan Repayment

        </Modal.Title>

    </Modal.Header>


    <Modal.Body>

        {selectedLoan && (

            <>

                {/* LOAN INFORMATION */}

                <div className="mb-4 p-3 border rounded">

                    <h6>
                        Loan Information
                    </h6>


                    <div className="row">

                        <div className="col-6">

                            <small className="text-muted">
                                Loan Amount
                            </small>

                            <div>

                                <strong>

                                    ETB{" "}

                                    {Number(
                                        selectedLoan.amount || 0
                                    ).toFixed(2)}

                                </strong>

                            </div>

                        </div>


                        <div className="col-6">

                            <small className="text-muted">
                                Remaining Balance
                            </small>

                            <div>

                                <strong className="text-danger">

                                    ETB{" "}

                                    {Number(
                                        selectedLoan.remaining_balance || 0
                                    ).toFixed(2)}

                                </strong>

                            </div>

                        </div>

                    </div>

                </div>


                {/* REPAYMENT AMOUNT */}

                <Form.Group className="mb-3">

                    <Form.Label>

                        Repayment Amount (ETB)

                    </Form.Label>


                    <Form.Control
                        type="number"
                        min="0.01"
                        max={
                            Number(
                                selectedLoan.remaining_balance || 0
                            )
                        }
                        step="0.01"
                        value={repaymentAmount}
                        onChange={(e) =>
                            setRepaymentAmount(
                                e.target.value
                            )
                        }
                        placeholder="Enter repayment amount"
                        disabled={repaymentLoading}
                    />


                    <Form.Text className="text-muted">

                        Maximum:

                        {" "}

                        ETB{" "}

                        {Number(
                            selectedLoan.remaining_balance || 0
                        ).toFixed(2)}

                    </Form.Text>

                </Form.Group>


                {/* FULL REPAYMENT */}

                <Button
                    type="button"
                    variant="outline-success"
                    className="w-100 mb-3"
                    disabled={repaymentLoading}
                    onClick={() => {

                        setRepaymentAmount(
                            Number(
                                selectedLoan.remaining_balance || 0
                            ).toFixed(2)
                        );

                    }}
                >

                    Pay Full Remaining Balance

                </Button>


                <div className="alert alert-info">

                    <small>

                        You can enter a partial repayment or
                        pay the entire remaining balance.

                    </small>

                </div>

            </>

        )}

    </Modal.Body>


    <Modal.Footer>

        <Button
            variant="secondary"
            disabled={repaymentLoading}
            onClick={() => {

                setShowRepaymentModal(false);

                setSelectedLoan(null);

                setRepaymentAmount("");

            }}
        >

            Cancel

        </Button>


        <Button
            variant="success"
            disabled={
                repaymentLoading ||
                !repaymentAmount ||
                Number(repaymentAmount) <= 0
            }
            onClick={handleLoanRepayment}
        >

            {repaymentLoading ? (

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

                    <FaMoneyBillWave
                        className="me-2"
                    />

                    Record Repayment

                </>

            )}

        </Button>

    </Modal.Footer>

</Modal>

    {/* ============================================================
    LOAN REPAYMENT MODAL
============================================================ */}

{showRepaymentModal && selectedLoan && (

    <div
        className="modal d-block"
        style={{
            backgroundColor:
                "rgba(0, 0, 0, 0.5)"
        }}
    >

        <div className="modal-dialog">

            <div className="modal-content">

                <div className="modal-header">

                    <h5 className="modal-title">
                        Repay Loan
                    </h5>

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => {
                            setShowRepaymentModal(false);
                            setSelectedLoan(null);
                            setRepaymentAmount("");
                        }}
                    />

                </div>

                <div className="modal-body">

                    <div className="mb-3">

                        <strong>
                            Loan ID:
                        </strong>{" "}
                        #{selectedLoan.id}

                    </div>

                    <div className="mb-3">

                        <strong>
                            Original Amount:
                        </strong>{" "}

                        ETB{" "}
                        {Number(
                            selectedLoan.amount || 0
                        ).toFixed(2)}

                    </div>

                    <div className="mb-3">

                        <strong>
                            Remaining Balance:
                        </strong>{" "}

                        <span className="text-danger">

                            ETB{" "}
                            {Number(
                                selectedLoan.remaining_balance || 0
                            ).toFixed(2)}

                        </span>

                    </div>

                    <div className="mb-3">

                        <label className="form-label">
                            Repayment Amount (ETB)
                        </label>

                        <input
                            type="number"
                            className="form-control"
                            min="0.01"
                            max={
                                selectedLoan.remaining_balance
                            }
                            step="0.01"
                            value={repaymentAmount}
                            onChange={(e) =>
                                setRepaymentAmount(
                                    e.target.value
                                )
                            }
                            placeholder="Enter repayment amount"
                        />

                    </div>

                </div>

                <div className="modal-footer">

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setShowRepaymentModal(false);
                            setSelectedLoan(null);
                            setRepaymentAmount("");
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleLoanRepayment}
                    >
                        Confirm Repayment
                    </button>

                </div>

            </div>

        </div>

    </div>

)}
      {/* ======================================================
    COOPERATIVE SALES / SUPPLIER OVERVIEW FOR ADMIN
====================================================== */}

<Card className="admin-overview-card mt-4">
  <Card.Body>

    <div className="section-title">
      <div>
        <h3>
          <FaShoppingCart className="me-2" />
          Cooperative Sales Overview
        </h3>

        <p>
          Overall products, stock, orders and revenue
          across the cooperative.
        </p>
      </div>
    </div>

    <Row className="g-4">

      {/* TOTAL PRODUCTS */}
      <Col xs={12} sm={6} lg={4} xl>
        <Card className="admin-overview-stat products-stat h-100">
          <Card.Body>

            <div>
              <span>Total Products</span>

              <h3>
                {systemStats.totalProducts}
              </h3>

              <small>
                All registered products
              </small>
            </div>

            <FaShoppingCart />

          </Card.Body>
        </Card>
      </Col>

      {/* TOTAL STOCK */}
      <Col xs={12} sm={6} lg={4} xl>
        <Card className="admin-overview-stat stock-stat h-100">
          <Card.Body>

            <div>
              <span>Total Stock</span>

              <h3>
                {systemStats.totalStock}
              </h3>

              <small>
                Available inventory units
              </small>
            </div>

            <FaChartLine />

          </Card.Body>
        </Card>
      </Col>

      {/* ORDERS RECEIVED */}
      <Col xs={12} sm={6} lg={4} xl>
        <Card className="admin-overview-stat orders-received-stat h-100">
          <Card.Body>

            <div>
              <span>Orders Received</span>

              <h3>
                {systemStats.ordersReceived}
              </h3>

              <small>
                Orders containing products
              </small>
            </div>

            <FaShoppingCart />

          </Card.Body>
        </Card>
      </Col>

      {/* PENDING ORDERS */}
      <Col xs={12} sm={6} lg={4} xl>
        <Card className="admin-overview-stat pending-orders-stat h-100">
          <Card.Body>

            <div>
              <span>Pending Orders</span>

              <h3>
                {systemStats.pendingOrders}
              </h3>

              <small>
                Pending or processing orders
              </small>
            </div>

            <FaClock />

          </Card.Body>
        </Card>
      </Col>

      {/* TOTAL REVENUE */}
      <Col xs={12} sm={6} lg={4} xl>
        <Card className="admin-overview-stat revenue-stat h-100">
          <Card.Body>

            <div>
              <span>Total Revenue</span>

              <h3>
                {formatAmount(
                  systemStats.totalRevenue
                )}{" "}
                ETB
              </h3>

              <small>
                Overall cooperative revenue
              </small>
            </div>

            <FaMoneyBillWave />

          </Card.Body>
        </Card>
      </Col>

    </Row>

  </Card.Body>
</Card>

      {/* ======================================================
          FINANCIAL ACTION MODAL
      ====================================================== */}

      <Modal
        show={showActionModal}
        onHide={closeFinancialAction}
        centered
      >
        <Modal.Header
          closeButton
          className="action-modal-header"
        >
          <Modal.Title>
            {actionType ===
              "savings" &&
              "Add Member Savings"}

            {actionType ===
              "shares" &&
              "Add Member Shares"}

            {actionType ===
              "loan" &&
              "Add Member Loan"}

            {actionType ===
              "transaction" &&
              "Add Member Transaction"}
          </Modal.Title>
        </Modal.Header>

        <Form
          onSubmit={
            submitFinancialAction
          }
        >
          <Modal.Body>
            {/* SAVINGS */}

            {actionType ===
              "savings" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Amount (ETB) *
                  </Form.Label>

                  <Form.Control
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="amount"
                    value={
                      actionData.amount
                    }
                    onChange={
                      handleActionChange
                    }
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Operation
                  </Form.Label>

                  <Form.Select
                    name="type"
                    value={
                      actionData.type
                    }
                    onChange={
                      handleActionChange
                    }
                  >
                    <option value="deposit">
                      Deposit
                    </option>

                    <option value="withdrawal">
                      Withdrawal
                    </option>
                  </Form.Select>
                </Form.Group>
              </>
            )}

            {/* SHARES */}

            {actionType ===
              "shares" && (
              <Form.Group className="mb-3">
                <Form.Label>
                  Number of Shares *
                </Form.Label>

                <Form.Control
                  type="number"
                  min="1"
                  step="1"
                  name="share_count"
                  value={
                    actionData.share_count
                  }
                  onChange={
                    handleActionChange
                  }
                  required
                />
              </Form.Group>
            )}

           {/* LOAN */}

{actionType === "loan" && (
    <>
        <Form.Group className="mb-3">

            <Form.Label>
                Loan Amount (ETB) *
            </Form.Label>

            <Form.Control
                type="number"
                min="0.01"
                step="0.01"
                name="amount"
                value={actionData.amount || ""}
                onChange={handleActionChange}
                placeholder="Enter loan amount"
                required
            />

        </Form.Group>


        <Form.Group className="mb-3">

            <Form.Label>
                Loan Term (Months) *
            </Form.Label>

            <Form.Control
                type="number"
                min="1"
                step="1"
                name="term_months"
                value={actionData.term_months || ""}
                onChange={handleActionChange}
                placeholder=""
                required
            />

            <Form.Text className="text-muted">
                Enter the number of months for repayment.
            </Form.Text>

        </Form.Group>


        <Form.Group className="mb-3">

            <Form.Label>
                Description
            </Form.Label>

            <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={actionData.description || ""}
                onChange={handleActionChange}
                placeholder="Enter loan description"
            />

        </Form.Group>
    </>
)}
{/* ============================================================
    MEMBER LOANS
============================================================ */}

{memberLoans.length > 0 && (
    <div className="member-loans-section">

        <h4 className="mb-3">
            Member Loans
        </h4>

        <div className="table-responsive">

            <table className="table table-bordered">

                <thead>
                    <tr>
                        <th>Loan ID</th>
                        <th>Amount</th>
                        <th>Remaining Balance</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>

                    {memberLoans.map((loan) => (

                        <tr key={loan.id}>

                            <td>
                                #{loan.id}
                            </td>

                            <td>
                                ETB{" "}
                                {Number(
                                    loan.amount || 0
                                ).toFixed(2)}
                            </td>

                            <td>
                                <strong>
                                    ETB{" "}
                                    {Number(
                                        loan.remaining_balance || 0
                                    ).toFixed(2)}
                                </strong>
                            </td>

                            <td>
                                <span
                                    className={`badge ${
                                        loan.status === "completed"
                                            ? "bg-success"
                                            : loan.status === "active"
                                            ? "bg-primary"
                                            : "bg-warning text-dark"
                                    }`}
                                >
                                    {loan.status}
                                </span>
                            </td>

                            <td>
                                {loan.due_date
                                    ? new Date(
                                        loan.due_date
                                      ).toLocaleDateString()
                                    : "N/A"}
                            </td>

                            <td>

                                {Number(
                                    loan.remaining_balance || 0
                                ) > 0 ? (

                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setSelectedLoan(loan);
                                            setShowRepaymentModal(true);
                                        }}
                                    >
                                        Repay Loan
                                    </button>

                                ) : (

                                    <span className="text-success">
                                        ✓ Fully Paid
                                    </span>

                                )}

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    </div>
)}


{/* ============================================================
    LOAN REPAYMENT
============================================================ */}

{actionType === "loan_payment" && (
    <>

        {/* SELECT LOAN */}

        <Form.Group className="mb-3">

            <Form.Label>
                Select Loan *
            </Form.Label>

            <Form.Select
                name="loan_id"
                value={
                    actionData.loan_id || ""
                }
                onChange={
                    handleActionChange
                }
                required
            >

                <option value="">
                    Select a loan
                </option>

                {memberLoans.length === 0 && (
                    <option disabled>
                        No active loans found
                    </option>
                )}

                {memberLoans.map(
                    (loan) => (
                        <option
                            key={loan.id}
                            value={loan.id}
                        >

                            Loan #{loan.id}
                            {" — "}
                            Amount: ETB{" "}
                            {Number(
                                loan.amount || 0
                            ).toFixed(2)}

                            {" — "}
                            Remaining: ETB{" "}

                            {Number(
                                loan.remaining_balance || 0
                            ).toFixed(2)}

                        </option>
                    )
                )}

            </Form.Select>

        </Form.Group>


        {/* REPAYMENT AMOUNT */}

        <Form.Group className="mb-3">

            <Form.Label>
                Repayment Amount (ETB) *
            </Form.Label>

            <Form.Control
                type="number"
                name="repayment_amount"
                min="0.01"
                step="0.01"
                value={
                    actionData.repayment_amount || ""
                }
                onChange={
                    handleActionChange
                }
                placeholder="Enter repayment amount"
                required
            />

        </Form.Group>


        {/* PAYMENT METHOD */}

        <Form.Group className="mb-3">

            <Form.Label>
                Payment Method *
            </Form.Label>

            <Form.Select
                name="payment_method"
                value={
                    actionData.payment_method ||
                    "cash"
                }
                onChange={
                    handleActionChange
                }
                required
            >

                <option value="cash">
                    Cash
                </option>

                <option value="bank_transfer">
                    Bank Transfer
                </option>

                <option value="mobile_money">
                    Mobile Money
                </option>

                <option value="other">
                    Other
                </option>

            </Form.Select>

        </Form.Group>


        {/* DESCRIPTION */}

        <Form.Group className="mb-3">

            <Form.Label>
                Description
            </Form.Label>

            <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={
                    actionData.description || ""
                }
                onChange={
                    handleActionChange
                }
                placeholder="Loan repayment description"
            />

        </Form.Group>

    </>
)}   

            {/* TRANSACTION */}

            {actionType ===
              "transaction" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Transaction Type *
                  </Form.Label>

                  <Form.Select
                    name="transaction_type"
                    value={
                      actionData.transaction_type
                    }
                    onChange={
                      handleActionChange
                    }
                  >
                    <option value="deposit">
                      Deposit
                    </option>

                    <option value="withdrawal">
                      Withdrawal
                    </option>

                    <option value="loan">
                      Loan
                    </option>

                    <option value="share_purchase">
                      Share Purchase
                    </option>

                    <option value="payment">
                      Payment
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Amount (ETB) *
                  </Form.Label>

                  <Form.Control
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="amount"
                    value={
                      actionData.amount
                    }
                    onChange={
                      handleActionChange
                    }
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    Reference Number
                  </Form.Label>

                  <Form.Control
                    name="reference_number"
                    value={
                      actionData.reference_number
                    }
                    onChange={
                      handleActionChange
                    }
                    placeholder="Optional"
                  />
                </Form.Group>
              </>
            )}

          
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={
                closeFinancialAction
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <>
                  <Spinner
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;