import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  Grid,
  Divider,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  QrCode2,
  Assignment,
  History,
  Settings,
  Person,
  Email,
  Phone,
  Business,
  Badge,
  Lock,
  CheckCircle,
  Warning,
  Inventory2,
} from '@mui/icons-material';
import UserQR from './UserQR';
import LoadingSpinner from '../common/LoadingSpinner';


interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
  qr_code_data?: string;
  qr_code_image?: string;
  created_at: string;
}

interface Transaction {
  id: number;
  item_id: number;
  item_name: string;
  item_code: string;
  status: string;
  quantity: number;
  borrowed_at: string;
  due_date?: string;
  returned_at?: string;
  purpose?: string;
}

interface ProfileProps {
  userId?: number;
  onUpdate?: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    employee_id: '',
  });

  // Password change data
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchActiveTransactions();
    } else if (activeTab === 2) {
      fetchTransactionHistory();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const endpoint = userId
        ? `/api/users/${userId}`
        : `/api/auth/me`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data);
      setFormData({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || '',
        employee_id: data.employee_id || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/transactions/my-active`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActiveTransactions(data);
      }
    } catch (err) {
      console.error('Failed to fetch active transactions:', err);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/transactions/?page=1&page_size=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTransactionHistory(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
    }
  };

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/users/${user?.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditing(false);
      setSuccess('Profile updated successfully!');

      if (onUpdate) {
        onUpdate(updatedUser);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/users/me/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            new_password: passwordData.new_password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setShowPasswordDialog(false);
      setPasswordData({
        new_password: '',
        confirm_password: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  if (!user) {
    return (
      <Alert severity="error">
        Failed to load profile. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          My Profile
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<QrCode2 />}
            onClick={() => setShowQRDialog(true)}
          >
            My QR Code
          </Button>
          <Button
            variant="outlined"
            startIcon={<Lock />}
            onClick={() => setShowPasswordDialog(true)}
          >
            Change Password
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pt: 4 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: user.is_admin ? 'error.main' : 'primary.main',
                  fontSize: 48,
                }}
              >
                {user.full_name.charAt(0).toUpperCase()}
              </Avatar>

              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {user.full_name}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>

              <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip
                  label={user.is_admin ? 'Administrator' : 'User'}
                  color={user.is_admin ? 'error' : 'primary'}
                  size="small"
                />
                <Chip
                  label={user.is_active ? 'Active' : 'Inactive'}
                  color={user.is_active ? 'success' : 'default'}
                  size="small"
                  icon={user.is_active ? <CheckCircle /> : <Warning />}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <List dense>
                {user.department && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary' }}>
                        <Business fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Department"
                      secondary={user.department}
                    />
                  </ListItem>
                )}
                {user.employee_id && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary' }}>
                        <Badge fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Employee ID"
                      secondary={user.employee_id}
                    />
                  </ListItem>
                )}
                {user.phone && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary' }}>
                        <Phone fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Phone"
                      secondary={user.phone}
                    />
                  </ListItem>
                )}
              </List>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Member since {new Date(user.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
            >
              <Tab icon={<Person />} label="Profile" />
              <Tab icon={<Assignment />} label="Active Borrows" />
              <Tab icon={<History />} label="History" />
            </Tabs>

            <CardContent>
              {/* Profile Tab */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Profile Information
                    </Typography>
                    {!editing ? (
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setEditing(true)}
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Cancel />}
                          onClick={() => {
                            setEditing(false);
                            setFormData({
                              full_name: user.full_name,
                              email: user.email,
                              phone: user.phone || '',
                              department: user.department || '',
                              employee_id: user.employee_id || '',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={handleUpdateProfile}
                        >
                          Save
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        disabled={!editing}
                        InputProps={{
                          startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        disabled={!editing}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        disabled={!editing}
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Department"
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({ ...formData, department: e.target.value })
                        }
                        disabled={!editing}
                        InputProps={{
                          startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Employee ID"
                        value={formData.employee_id}
                        onChange={(e) =>
                          setFormData({ ...formData, employee_id: e.target.value })
                        }
                        disabled={!editing}
                        InputProps={{
                          startAdornment: <Badge sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Active Borrows Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Active Borrows ({activeTransactions.length})
                  </Typography>

                  {activeTransactions.length === 0 ? (
                    <Alert severity="info">
                      You have no active borrows.
                    </Alert>
                  ) : (
                    <List>
                      {activeTransactions.map((transaction) => (
                        <Paper
                          key={transaction.id}
                          variant="outlined"
                          sx={{
                            mb: 1,
                            border: isOverdue(transaction.due_date) ? 2 : 1,
                            borderColor: isOverdue(transaction.due_date)
                              ? 'error.main'
                              : 'divider',
                          }}
                        >
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <Inventory2 />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle1">
                                    {transaction.item_name}
                                  </Typography>
                                  {isOverdue(transaction.due_date) && (
                                    <Chip
                                      label="OVERDUE"
                                      color="error"
                                      size="small"
                                      icon={<Warning />}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Code: {transaction.item_code}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Borrowed: {new Date(transaction.borrowed_at).toLocaleDateString()}
                                  </Typography>
                                  {transaction.due_date && (
                                    <Typography
                                      variant="body2"
                                      color={isOverdue(transaction.due_date) ? 'error' : 'text.secondary'}
                                    >
                                      Due: {new Date(transaction.due_date).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        </Paper>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* History Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Transaction History
                  </Typography>

                  {transactionHistory.length === 0 ? (
                    <Alert severity="info">
                      No transaction history available.
                    </Alert>
                  ) : (
                    <List>
                      {transactionHistory.map((transaction) => (
                        <ListItem key={transaction.id} divider>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor:
                                  transaction.status === 'returned'
                                    ? 'success.main'
                                    : 'primary.main',
                              }}
                            >
                              <Inventory2 />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={transaction.item_name}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {transaction.item_code} • Qty: {transaction.quantity}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(transaction.borrowed_at).toLocaleDateString()}
                                  {transaction.returned_at &&
                                    ` - ${new Date(transaction.returned_at).toLocaleDateString()}`}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip
                            label={transaction.status}
                            color={
                              transaction.status === 'returned' ? 'success' : 'primary'
                            }
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>My QR Code</DialogTitle>
        <DialogContent>
          {user.qr_code_data && (
            <UserQR user={user} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, new_password: e.target.value })
                }
                helperText="Minimum 8 characters"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirm_password: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;