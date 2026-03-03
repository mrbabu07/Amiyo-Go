import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../Modal';
import Button from '../Button';

const UserRoleManager = ({ user, onUpdate, onClose }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'customer', label: 'Customer', description: 'Regular customer with basic permissions' },
    { value: 'vendor', label: 'Vendor/Seller', description: 'Can sell products and manage their shop' },
    { value: 'admin', label: 'Admin', description: 'Full system access and control' },
  ];

  const handleUpdateRole = async () => {
    if (selectedRole === user.role) {
      toast.error('Please select a different role');
      return;
    }

    try {
      setLoading(true);
      const token = await user.getIdToken?.() || localStorage.getItem('token');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users/${user._id}/role`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'User role updated successfully');
        onUpdate?.();
        onClose?.();
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Change User Role">
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">User</p>
          <p className="font-medium">{user.email}</p>
          <p className="text-sm text-gray-600 mt-2">Current Role</p>
          <p className="font-medium capitalize">{user.role}</p>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select New Role
          </label>
          <div className="space-y-3">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedRole === role.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{role.label}</p>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Warning for vendor role */}
        {selectedRole === 'vendor' && user.role !== 'vendor' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> User must have registered as a vendor first. 
              If they haven't, this will fail. Check the Vendors page to see if they have a vendor account.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            disabled={loading || selectedRole === user.role}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserRoleManager;
