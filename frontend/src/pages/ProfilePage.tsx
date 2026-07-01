import React, { useState, useEffect } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography, Tabs, Tab,
  Avatar, Chip, Button, Divider, List, ListItem, ListItemText,
  ListItemAvatar, Alert, Paper, LinearProgress, Tooltip, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Switch, Skeleton,
} from '@mui/material';
import {
  Edit, Save, Cancel, QrCode2, Assignment, History, Settings,
  Notifications, CheckCircle, Warning, TrendingUp, Inventory2,
  Person, Email, Phone, Business, Badge as BadgeIcon, Lock,
  Star, StarBorder, CalendarMonth, AccessTime, KeyboardReturn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userAPI, transactionAPI } from '../services/api';
import UserQR from '../components/users/UserQR';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
  condition_at_return?: string;
  rating?: number;
}

interface UserStats {
  total_borrows: number;
  active_borrows: number;
  total_returns: number;
  overdue_count: number;
  favorite_category?: string;
  avg_borrow_duration?: number;
}

const EnhancedProfile: React.FC = () => {
  const navigate = useNavigate();
  // Use auth context instead of re-fetching the same user
  const { user, updateUser, refreshUser, loading: authLoading } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);

  const [activeBorrows, setActiveBorrows] = useState<Transaction[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<Transaction[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', department: '', employee_id: '',
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '', confirm_password: '',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true, due_date_reminders: true,
    overdue_alerts: true, new_items_alerts: false,
  });

  // Sync form data when user loads from auth context
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        department: user.department || '',
        employee_id: user.employee_id || '',
      });
    }
  }, [user]);

  useEffect(() => {
    fetchUserStats();
  }, []);

  useEffect(() => {
    if (activeTab === 1) fetchActiveBorrows();
    else if (activeTab === 2) fetchBorrowHistory();
  }, [activeTab]);

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      // BUG 12 FIX: use centralized api service instead of raw fetch
      const data = await userAPI.getStats();
      setUserStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchActiveBorrows = async () => {
    try {
      // BUG 12 FIX: use centralized api service
      const data = await transactionAPI.getMyActive();
      setActiveBorrows(data);
    } catch (err) {
      console.error('Failed to fetch active borrows:', err);
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      // BUG 12 FIX: use centralized api service
      const data = await transactionAPI.getMyHistory({ limit: 20 });
      setBorrowHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // BUG 12 FIX: use centralized api service
      const updatedUser = await userAPI.update(user.id, formData);
      // Update auth context so Header and other components reflect new name
      updateUser(updatedUser);
      setEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // BUG 12 FIX: use centralized api service
      await userAPI.changePassword({
        new_password: passwordData.new_password,
      });
      setSuccess('Password changed successfully!');
      setShowPasswordDialog(false);
      setPasswordData({ new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const isOverdue = (dueDate?: string) => dueDate ? new Date(dueDate) < new Date() : false;

  const calculateDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const renderRating = (rating?: number) => {
    if (!rating) return null;
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {[1, 2, 3, 4, 5].map((star) =>
          star <= rating
            ? <Star key={star} sx={{ fontSize: 16, color: 'warning.main' }} />
            : <StarBorder key={star} sx={{ fontSize: 16, color: 'action.disabled' }} />
        )}
      </Box>
    );
  };

  if (authLoading) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load profile. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Left Sidebar */}
        <Grid item xs={12} md={4} lg={3}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent sx={{ textAlign: 'center', pt: 4 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={user.is_admin ? (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'error.main' }}>
                    <Settings sx={{ fontSize: 16 }} />
                  </Avatar>
                ) : null}
              >
                <Avatar sx={{
                  width: 120, height: 120, mx: 'auto', mb: 2,
                  bgcolor: user.is_admin ? 'error.main' : 'primary.main',
                  fontSize: 48, fontWeight: 700,
                }}>
                  {user.full_name.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>

              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {user.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>

              <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip label={user.is_admin ? 'Administrator' : 'User'} color={user.is_admin ? 'error' : 'primary'} size="small" />
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
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary', width: 40, height: 40 }}>
                        <Business fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Department" secondary={user.department}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                )}
                {user.employee_id && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary', width: 40, height: 40 }}>
                        <BadgeIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Employee ID" secondary={user.employee_id}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                )}
                {user.phone && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent', color: 'text.secondary', width: 40, height: 40 }}>
                        <Phone fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Phone" secondary={user.phone}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" startIcon={<QrCode2 />} onClick={() => setShowQRDialog(true)}>
                  My QR Code
                </Button>
                <Button fullWidth variant="outlined" startIcon={<Lock />} onClick={() => setShowPasswordDialog(true)}>
                  Change Password
                </Button>
                <Button fullWidth variant="outlined" startIcon={<Notifications />} onClick={() => setShowNotificationSettings(true)}>
                  Notifications
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
                Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Content */}
        <Grid item xs={12} md={8} lg={9}>
          {/* Stats */}
          {userStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { value: userStats.total_borrows, label: 'Total Borrows', color: 'primary.main' },
                { value: userStats.active_borrows, label: 'Active Now', color: 'info.main' },
                { value: userStats.total_returns, label: 'Returned', color: 'success.main' },
                { value: userStats.overdue_count, label: 'Overdue', color: userStats.overdue_count > 0 ? 'error.main' : 'success.main' },
              ].map((stat) => (
                <Grid item xs={6} sm={3} key={stat.label}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          <Card>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<Person />} label="Profile" iconPosition="start" />
              <Tab icon={<Badge badgeContent={activeBorrows.length} color="primary"><Assignment /></Badge>} label="Active Borrows" iconPosition="start" />
              <Tab icon={<History />} label="History" iconPosition="start" />
              <Tab icon={<TrendingUp />} label="Activity" iconPosition="start" />
            </Tabs>

            <CardContent sx={{ minHeight: 400 }}>
              {/* Tab 0: Profile Edit */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Personal Information</Typography>
                    {!editing ? (
                      <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditing(true)}>Edit Profile</Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" startIcon={<Cancel />} onClick={() => {
                          setEditing(false);
                          setFormData({ full_name: user.full_name, email: user.email, phone: user.phone || '', department: user.department || '', employee_id: user.employee_id || '' });
                        }} disabled={saving}>Cancel</Button>
                        <Button variant="contained" startIcon={<Save />} onClick={handleUpdateProfile} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Full Name" value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        disabled={!editing || saving} InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} /> }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!editing || saving} InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} /> }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Phone" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!editing || saving} InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} /> }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Department" value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        disabled={!editing || saving} InputProps={{ startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} /> }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Employee ID" value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        disabled={!editing || saving} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} /> }} />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 1: Active Borrows */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Active Borrows ({activeBorrows.length})
                  </Typography>
                  {activeBorrows.length === 0 ? (
                    <Alert severity="info">You have no active borrows. Visit the inventory to borrow items.</Alert>
                  ) : (
                    <List>
                      {activeBorrows.map((transaction) => {
                        const daysUntilDue = calculateDaysUntilDue(transaction.due_date);
                        const overdue = isOverdue(transaction.due_date);
                        return (
                          <Paper key={transaction.id} variant="outlined" sx={{ mb: 2, border: overdue ? 2 : 1, borderColor: overdue ? 'error.main' : 'divider' }}>
                            <ListItem secondaryAction={
                              <Button variant="contained" size="small" startIcon={<KeyboardReturn />} onClick={() => navigate('/scanner')}>Return</Button>
                            }>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: overdue ? 'error.main' : 'primary.main' }}><Inventory2 /></Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{transaction.item_name}</Typography>
                                    {overdue && <Chip label="OVERDUE" color="error" size="small" icon={<Warning />} />}
                                    {!overdue && daysUntilDue !== null && daysUntilDue <= 2 && (
                                      <Chip label={`Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`} color="warning" size="small" />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">Code: {transaction.item_code} • Qty: {transaction.quantity}</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <CalendarMonth sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{new Date(transaction.borrowed_at).toLocaleDateString()}</Typography>
                                      </Box>
                                      {transaction.due_date && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <AccessTime sx={{ fontSize: 14, color: overdue ? 'error.main' : 'inherit' }} />
                                          <Typography variant="caption" color={overdue ? 'error' : 'text.secondary'}>
                                            Due: {new Date(transaction.due_date).toLocaleDateString()}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItem>
                          </Paper>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 2: History */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Borrow History</Typography>
                  {borrowHistory.length === 0 ? (
                    <Alert severity="info">No transaction history available.</Alert>
                  ) : (
                    <List>
                      {borrowHistory.map((transaction) => (
                        <ListItem key={transaction.id} divider>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: transaction.status === 'returned' ? 'success.main' : 'primary.main' }}>
                              {transaction.status === 'returned' ? <CheckCircle /> : <Inventory2 />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">{transaction.item_name}</Typography>
                              {renderRating(transaction.rating)}
                            </Box>}
                            secondary={<Box>
                              <Typography variant="body2" color="text.secondary">{transaction.item_code} • Qty: {transaction.quantity}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(transaction.borrowed_at).toLocaleDateString()}
                                {transaction.returned_at && ` → ${new Date(transaction.returned_at).toLocaleDateString()}`}
                              </Typography>
                            </Box>}
                          />
                          <Chip label={transaction.status} size="small" color={transaction.status === 'returned' ? 'success' : 'primary'} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 3: Activity */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Activity Overview</Typography>
                  {userStats ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Borrowing Activity</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">Active</Typography>
                            <Typography variant="caption">{userStats.active_borrows} / {userStats.total_borrows}</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={(userStats.active_borrows / (userStats.total_borrows || 1)) * 100} sx={{ height: 8, borderRadius: 4 }} />
                        </Paper>
                      </Grid>
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Return Rate</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">Returns</Typography>
                            <Typography variant="caption">{userStats.total_returns} / {userStats.total_borrows}</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={(userStats.total_returns / (userStats.total_borrows || 1)) * 100} color="success" sx={{ height: 8, borderRadius: 4 }} />
                        </Paper>
                      </Grid>
                      {userStats.overdue_count > 0 && (
                        <Grid item xs={12}>
                          <Alert severity="warning">
                            You have {userStats.overdue_count} overdue item{userStats.overdue_count !== 1 ? 's' : ''}. Please return them soon.
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  ) : (
                    <Skeleton variant="rectangular" height={200} />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>My QR Code</DialogTitle>
        <DialogContent>
          {user.qr_code_data && <UserQR user={user} variant="detailed" showUserInfo={false} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setShowQRDialog(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth type="password" label="New Password" value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                disabled={saving} helperText="Minimum 8 characters" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="password" label="Confirm New Password" value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                disabled={saving}
                error={passwordData.confirm_password !== '' && passwordData.new_password !== passwordData.confirm_password}
                helperText={passwordData.confirm_password !== '' && passwordData.new_password !== passwordData.confirm_password ? 'Passwords do not match' : ''} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained"
            disabled={saving || !passwordData.new_password || passwordData.new_password !== passwordData.confirm_password}>
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={showNotificationSettings} onClose={() => setShowNotificationSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Notification Preferences</DialogTitle>
        <DialogContent>
          <List>
            {[
              { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'due_date_reminders', label: 'Due Date Reminders', desc: 'Get reminders before items are due' },
              { key: 'overdue_alerts', label: 'Overdue Alerts', desc: 'Receive alerts for overdue items' },
              { key: 'new_items_alerts', label: 'New Items Alerts', desc: 'Get notified when new items are added' },
            ].map(({ key, label, desc }) => (
              <ListItem key={key}>
                <ListItemText primary={label} secondary={desc} />
                <Switch
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNotificationSettings(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShowNotificationSettings(false)}>Save Preferences</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnhancedProfile;