// src/components/ProtectedRoute.jsx
import React from 'react';

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  
  // Check if authenticated
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please login to access this page.</p>
        </div>
      </div>
    );
  }
  
  // Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Insufficient Permissions</h2>
          <p className="text-gray-600">You don't have the required role to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required: {requiredRole}, Your role: {userRole}</p>
        </div>
      </div>
    );
  }
  
  // Check permission requirement
  if (requiredPermission) {
    const permissions = {
      admin: ['upload_data', 'manage_data', 'delete_data', 'clear_all_data', 'view_dashboard', 'export_data', 'train_ml_models', 'manage_users'],
      user: ['view_dashboard', 'export_charts', 'export_table', 'view_data']
    };
    
    const userPermissions = permissions[userRole] || [];
    if (!userPermissions.includes(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Permission Denied</h2>
            <p className="text-gray-600">You don't have permission to access this feature.</p>
            <p className="text-sm text-gray-500 mt-2">Required permission: {requiredPermission}</p>
          </div>
        </div>
      );
    }
  }
  
  return children;
};

export default ProtectedRoute;