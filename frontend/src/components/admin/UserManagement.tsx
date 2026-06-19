import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Search,
  QrCode2,
  Download,
  Upload,
  Block,
  CheckCircle,
  Person,
  AdminPanelSettings,
} from '@mui/icons-material';
import QRDisplay from '../common/QRDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';


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

interface UserFormData {
  email: string;
  full_name: string;
  password: string;
  is_admin: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
}

const UserManagement: React.FC = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Form data
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    password: '',
    is_admin: false,
    department: '',
    phone: '',
    employee_id: '',
  });

  // Filters
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterAdmin, setFilterAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchQuery, filterActive, filterAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        page_size: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filterActive !== null && { is_active: filterActive.toString() }),
        ...(filterAdmin !== null && { is_admin: filterAdmin.toString() }),
      });

      const response = await fetch(
        `/api/users/?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(fr ? 'Échec du chargement des utilisateurs' : 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || fr ? 'Échec du chargement' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode: 'create' | 'edit', user?: User) => {
    setDialogMode(mode);
    if (mode === 'edit' && user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        full_name: user.full_name,
        password: '',
        is_admin: user.is_admin,
        department: user.department || '',
        phone: user.phone || '',
        employee_id: user.employee_id || '',
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        password: '',
        is_admin: false,
        department: '',
        phone: '',
        employee_id: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      is_admin: false,
      department: '',
      phone: '',
      employee_id: '',
    });
  };

  const handleSubmit = async () => {
    setError('');

    try {
      const url =
        dialogMode === 'create'
          ? `/api/users/`
          : `/api/users/${selectedUser?.id}`;

      const method = dialogMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || (fr ? 'Échec de la sauvegarde' : fr ? 'Échec de la sauvegarde' : 'Failed to save user'));
      }

      handleCloseDialog();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || fr ? 'Échec de la sauvegarde' : 'Failed to save user');
    }
  };

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(
        `/api/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ is_active: !isActive }),
        }
      );

      if (!response.ok) {
        throw new Error(fr ? 'Échec de la mise à jour du statut' : 'Failed to update user status');
      }

      fetchUsers();
    } catch (err: any) {
      setError(err.message || fr ? 'Échec de la mise à jour' : 'Failed to update user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm(fr ? 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?' : 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(fr ? 'Échec de la suppression' : fr ? 'Échec de la suppression' : 'Failed to delete user');
      }

      fetchUsers();
    } catch (err: any) {
      setError(err.message || fr ? 'Échec de la suppression' : 'Failed to delete user');
    }
  };

  const handleExport = () => {
    const csvContent = [
      'Name,Email,Department,Employee ID,Status,Admin,Created',
      ...users.map(
        (user) =>
          `${user.full_name},${user.email},${user.department || ''},${
            user.employee_id || ''
          },${user.is_active ? 'Active' : 'Inactive'},${
            user.is_admin ? 'Yes' : 'No'
          },${new Date(user.created_at).toLocaleDateString()}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredUsers = users;

  /**
   * Download user card — 8.5cm × 5.4cm (credit card size), landscape.
   * Design matches the reference image:
   *   - Dark green (#1a5c2e) background, rounded corners
   *   - Top-left: Scout logo + "SCOUT MUSULMAN DE MONTRÉAL"
   *   - Left column: "INVENTAIRE" large, pill badge "QR CODE", role label, name pill
   *   - Right: large white-bordered QR code
   */
  const handleDownloadLoyaltyCard = (user: User) => {
    const printWindow = window.open('', '', 'width=1050,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <title>Carte Inventaire - ${user.full_name}</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
        <style>
          body {
            background: #f3f3f3;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            margin: 0;
          }
          .card {
            width: 850px;
            height: 520px;
            background: #0a7a2f;
            border-radius: 30px;
            color: white;
            padding: 35px;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          }
          .left { width: 48%; }
          .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            margin-bottom: 6px;
            display: block;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: 10px;
          }
          .inventory {
            font-size: 42px;
            font-weight: 900;
            margin-bottom: 10px;
          }
          .badge {
            display: inline-block;
            background: white;
            color: #0a7a2f;
            padding: 7px 18px;
            border-radius: 20px;
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 14px;
          }
          .label { font-size: 16px; margin-bottom: 6px; }
          .name {
            background: white;
            color: #0a7a2f;
            display: inline-block;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 28px;
            font-weight: bold;
            max-width: 380px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .right {
            width: 42%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .qr-box {
            background: white;
            padding: 25px;
            border-radius: 25px;
          }
          #qrcode img {
            width: 280px !important;
            height: 280px !important;
            display: block;
          }
          .download-btn {
            margin-top: 30px;
            background: #0a7a2f;
            color: white;
            border: none;
            padding: 15px 35px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
          }
          .download-btn:hover { opacity: 0.85; }
          .status { margin-top: 12px; font-size: 14px; color: #555; }
        </style>
      </head>
      <body>
        <div class="card" id="card">
          <div class="left">
            <img src="/logo.png" class="logo" alt="Scout Logo"
              onerror="this.style.display='none'"/>
            <div class="title">SCOUT MUSULMAN<br>DE MONTRÉAL</div>
            <div class="inventory">INVENTAIRE</div>
            <div class="badge">QR CODE</div>
            <div class="label">${user.is_admin ? 'ADMIN' : 'MEMBRE'}</div>
            <div class="name">${user.full_name}</div>
          </div>
          <div class="right">
            <div class="qr-box">
              <div id="qrcode"></div>
            </div>
          </div>
        </div>
        <button class="download-btn" id="dlBtn">⬇ Télécharger la Carte (PNG)</button>
        <div class="status" id="status">Génération du QR code...</div>
        <script>
          ${user.qr_code_image ? `
            const img = document.createElement('img');
            img.src = '${user.qr_code_image}';
            img.style.cssText = 'width:280px;height:280px;display:block;';
            document.getElementById('qrcode').appendChild(img);
          ` : `
            new QRCode(document.getElementById('qrcode'), {
              text: ${JSON.stringify(user.qr_code_data || user.full_name)},
              width: 280, height: 280
            });
          `}
          document.getElementById('status').textContent = 'Prêt — cliquez pour télécharger.';
          document.getElementById('dlBtn').addEventListener('click', () => {
            document.getElementById('dlBtn').disabled = true;
            document.getElementById('status').textContent = 'Génération en cours...';
            setTimeout(() => {
              html2canvas(document.getElementById('card'), {
                scale: 2, useCORS: true, backgroundColor: null
              }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'carte-${user.full_name.replace(/\s+/g, '-')}.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                document.getElementById('status').textContent = '✅ Téléchargement lancé!';
                document.getElementById('dlBtn').disabled = false;
              });
            }, 300);
          });
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {fr ? "Gestion des utilisateurs" : "User Management"}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            {fr ? "Exporter" : "Export"}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog('create')}
          >
            {fr ? "Ajouter un utilisateur" : "Add User"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder={fr ? "Rechercher des utilisateurs..." : "Search users..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{fr ? "Statut" : "Status"}</InputLabel>
              <Select
                value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterActive(value === 'all' ? null : value === 'active');
                }}
                label={fr ? "Statut" : "Status"}
              >
                <MenuItem value="all">{fr ? "Tous" : "All"}</MenuItem>
                <MenuItem value="active">{fr ? "Actif" : "Active"}</MenuItem>
                <MenuItem value="inactive">{fr ? "Inactif" : "Inactive"}</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{fr ? "Rôle" : "Role"}</InputLabel>
              <Select
                value={filterAdmin === null ? 'all' : filterAdmin ? 'admin' : 'user'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterAdmin(value === 'all' ? null : value === 'admin');
                }}
                label={fr ? "Rôle" : "Role"}
              >
                <MenuItem value="all">{fr ? "Tous" : "All"}</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">{fr ? "Utilisateur" : "User"}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{fr ? "Utilisateur" : "User"}</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>{fr ? "Département" : "Department"}</TableCell>
                      <TableCell>{fr ? "ID employé" : "Employee ID"}</TableCell>
                      <TableCell>{fr ? "Téléphone" : "Phone"}</TableCell>
                      <TableCell>{fr ? "Statut" : "Status"}</TableCell>
                      <TableCell>{fr ? "Rôle" : "Role"}</TableCell>
                      <TableCell align="right">{fr ? "Actions" : "Actions"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: user.is_admin ? 'error.main' : 'primary.main' }}>
                              {user.is_admin ? <AdminPanelSettings /> : <Person />}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {user.full_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>{user.employee_id || '-'}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'default'}
                            size="small"
                            icon={user.is_active ? <CheckCircle /> : <Block />}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_admin ? 'Admin' : 'User'}
                            color={user.is_admin ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={fr ? "Voir le code QR" : "View QR Code"}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowQRDialog(true);
                              }}
                            >
                              <QrCode2 />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={fr ? "Modifier" : "Edit"}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', user)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.is_active ? (fr ? 'Désactiver' : 'Deactivate') : (fr ? 'Activer' : 'Activate')}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                              color={user.is_active ? 'error' : 'success'}
                            >
                              {user.is_active ? <Block /> : <CheckCircle />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={fr ? "Supprimer" : "Delete"}>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(user.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                labelRowsPerPage={fr ? "Lignes par page" : "Rows per page"}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? (fr ? 'Ajouter un utilisateur' : 'Add New User') : (fr ? 'Modifier l\'utilisateur' : 'Edit User')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={fr ? "Nom complet" : "Full Name"}
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </Grid>
            {dialogMode === 'create' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={fr ? "Mot de passe" : "Password"}
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  helperText={fr ? "Minimum 8 caractères" : "Minimum 8 characters"}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={fr ? "Département" : "Department"}
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={fr ? "ID employé" : "Employee ID"}
                value={formData.employee_id}
                onChange={(e) =>
                  setFormData({ ...formData, employee_id: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={fr ? "Téléphone" : "Phone"}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_admin}
                    onChange={(e) =>
                      setFormData({ ...formData, is_admin: e.target.checked })
                    }
                  />
                }
                label={fr ? "Administrateur" : "Administrator"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{fr ? "Annuler" : "Cancel"}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'create' ? (fr ? "Créer" : "Create") : (fr ? "Enregistrer" : "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog — with Loyalty Card download */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser?.full_name} — {fr ? "Code QR / Carte" : "QR Code / Card"}
        </DialogTitle>
        <DialogContent>
          {selectedUser?.qr_code_data && (
            <QRDisplay
              data={selectedUser.qr_code_data}
              title={selectedUser.full_name}
              description={selectedUser.email}
              size={300}
              filename={`user_qr_${selectedUser.id}`}
            />
          )}
          {selectedUser && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleDownloadLoyaltyCard(selectedUser)}
                sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
              >
                {fr ? "📥 Télécharger Carte (5cm × 8cm)" : "📥 Download Card (5cm × 8cm)"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>{fr ? "Fermer" : "Close"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;