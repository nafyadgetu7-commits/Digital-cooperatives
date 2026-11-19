import React from 'react';

// Import all components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CustomerDashboard from './components/customer/CustomerDashboard';
import SupplierDashboard from './components/supplier/SupplierDashboard';
import MemberDashboard from './components/member/MemberDashboard';
import AccountantDashboard from './components/accountant/AccountantDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import PrivateRoute from './components/common/PrivateRoute';

const DebugImports = () => {
  // Check each import
  const imports = {
    Login,
    Register,
    CustomerDashboard,
    SupplierDashboard,
    MemberDashboard,
    AccountantDashboard,
    ManagerDashboard,
    AdminDashboard,
    PrivateRoute
  };

  // Find undefined imports
  const undefinedImports = Object.entries(imports)
    .filter(([name, component]) => !component)
    .map(([name]) => name);

  return (
    <div className="container mt-5">
      <h1>Debugging Imports</h1>
      <div className="card">
        <div className="card-body">
          <h5>Import Status:</h5>
          <ul className="list-group">
            {Object.entries(imports).map(([name, component]) => (
              <li key={name} className={`list-group-item ${component ? 'list-group-item-success' : 'list-group-item-danger'}`}>
                {name}: {component ? '✅ Loaded' : '❌ NOT LOADED (undefined)'}
              </li>
            ))}
          </ul>
          {undefinedImports.length > 0 && (
            <div className="alert alert-danger mt-3">
              <strong>Missing imports:</strong> {undefinedImports.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugImports;