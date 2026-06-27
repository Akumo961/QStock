import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Paper, IconButton, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  FormControl, InputLabel, Select, MenuItem, Alert, Tooltip,
  InputAdornment, Switch, FormControlLabel,
} from '@mui/material';
import { Edit, Delete, Add, Search, QrCode2, Download, Inventory } from '@mui/icons-material';
import QRDisplay from '../common/QRDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';


interface Item {
  id: number;
  name: string;
  item_code: string;
  description?: string;
  category: string;
  status: string;
  quantity: number;
  available_quantity: number;
  is_borrowable: boolean;
  max_borrow_days?: number;
  location?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  qr_code_data?: string;
  qr_code_image?: string;
}

interface ItemFormData {
  name: string;
  item_code: string;
  description: string;
  category: string;
  status: string;
  quantity: number;
  available_quantity: number;
  is_borrowable: boolean;
  max_borrow_days: number;
  location: string;   // stored as "A3", "B6", etc.
}

// ✅ Lowercase values match backend DB enum exactly
const CATEGORIES = [
  { en: 'Electronics',      fr: 'Électronique',       value: 'electronics' },
  { en: 'School Items',     fr: 'Articles scolaires',  value: 'school_items' },
  { en: 'Decorations',      fr: 'Décorations',         value: 'decorations' },
  { en: 'Clothes',          fr: 'Vêtements',           value: 'clothes' },
  { en: 'Games',            fr: 'Jeux',                value: 'games' },
  { en: 'Other',            fr: 'Autre',               value: 'other' },
];

const STATUSES = [
  { en: 'Available',   fr: 'Disponible',  value: 'available' },
  { en: 'Borrowed',    fr: 'Emprunté',    value: 'borrowed' },
  { en: 'Maintenance', fr: 'Maintenance', value: 'maintenance' },
  { en: 'Retired',     fr: 'Retraité',    value: 'retired' },
];

const API_BASE = `/api/items/`;

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const defaultForm = (): ItemFormData => ({
  name: '',
  item_code: '',
  description: '',
  category: 'other',
  status: 'available',
  quantity: 1,
  available_quantity: 1,
  is_borrowable: true,
  max_borrow_days: 7,
  location: '',
});

const ItemManagement: React.FC = () => {
  const { t, language } = useLanguage();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>(defaultForm());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchItems(); }, [page, rowsPerPage, searchQuery, filterCategory, filterStatus]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        page_size: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterStatus && { status: filterStatus }),
      });
      const response = await fetch(`${API_BASE}?${params}`, { headers: authHeaders() });
      if (!response.ok) throw new Error(t('error'));
      const data = await response.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode: 'create' | 'edit', item?: Item) => {
    setDialogMode(mode);
    setError('');
    if (mode === 'edit' && item) {
      setSelectedItem(item);
      setFormData({
        name: item.name,
        item_code: item.item_code,
        description: item.description || '',
        category: item.category?.toLowerCase() || 'other',
        status: item.status?.toLowerCase() || 'available',
        quantity: item.quantity,
        available_quantity: item.available_quantity,
        is_borrowable: item.is_borrowable,
        max_borrow_days: item.max_borrow_days || 7,
        location: item.location || '',
      });
    } else {
      setSelectedItem(null);
      setFormData(defaultForm());
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError(`${t('itemName')} ${t('descriptionRequired')}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = dialogMode === 'create' ? API_BASE : `${API_BASE}${selectedItem?.id}`;
      // Strip item_code from update payload — backend ignores it anyway, but be explicit
      const payload = dialogMode === 'edit'
        ? (({ item_code, ...rest }) => rest)(formData)
        : formData;

      const response = await fetch(url, {
        method: dialogMode === 'create' ? 'POST' : 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail && Array.isArray(errorData.detail)) {
          throw new Error(errorData.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; '));
        }
        throw new Error(errorData.detail || t('failedToSave'));
      }

      setOpenDialog(false);
      setSuccess(dialogMode === 'create' ? t('userCreated') : t('userUpdated'));
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm(t('confirmDeleteItem'))) return;
    try {
      const response = await fetch(`${API_BASE}${itemId}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) throw new Error(t('failedToDelete'));
      setSuccess(t('userDeleted'));
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  /**
   * Item QR Label: 5cm × 5cm print — QR code + item name + code
   */
  const handlePrintItemQR = (item: Item) => {
    if (!item.qr_code_image) return;
    const printWindow = window.open('', '', 'width=400,height=500');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>QR - ${item.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;display:flex;flex-direction:column;
          align-items:center;justify-content:center;width:5cm;padding:2mm;background:white}
        .qr-img{width:4cm;height:4cm;object-fit:contain;display:block}
        .item-name{font-size:8pt;font-weight:700;text-align:center;margin-top:2mm;
          max-width:4.5cm;word-break:break-word;color:#1b4332}
        .item-code{font-size:6pt;color:#666;font-family:monospace;margin-top:1mm}
        @media print{@page{size:5cm 5cm;margin:0}body{width:5cm}}
      </style></head>
      <body>
        <img class="qr-img" src="${item.qr_code_image}" alt="QR"/>
        <div class="item-name">${item.name}</div>
        <div class="item-code">${item.item_code}</div>
        <script>window.onload=()=>setTimeout(()=>{window.print();window.close();},400);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  /**
   * User Loyalty Card PDF — exactly 5cm × 8cm, styled like the scanned card image.
   * Orange left stripe "Carte Fidélité Scout", Scout logo in centre, QR code top-right,
   * user name on right stripe.
   */
  const handleDownloadUserLoyaltyCard = (user: {
    full_name: string;
    qr_code_image?: string;
    qr_code_data?: string;
    employee_id?: string;
  }) => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Carte Fidélité - ${user.full_name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        @page{size:8cm 5cm landscape;margin:0}
        body{
          width:8cm;height:5cm;
          font-family:'Arial',sans-serif;
          background:#fff;
          display:flex;
          flex-direction:row;
          overflow:hidden;
        }
        /* Left stripe — orange gradient with rotated text */
        .stripe-left{
          width:1.4cm;
          background:linear-gradient(180deg,#f97316,#ea580c);
          display:flex;align-items:center;justify-content:center;
          position:relative;flex-shrink:0;
        }
        .stripe-left-text{
          writing-mode:vertical-rl;
          text-orientation:mixed;
          transform:rotate(180deg);
          font-size:10pt;
          font-weight:900;
          color:#14532d;
          letter-spacing:1px;
          white-space:nowrap;
          font-style:italic;
        }
        /* Dotted separator */
        .dots{
          width:0.3cm;
          background:repeating-linear-gradient(
            to bottom,
            #333 0px,#333 3px,transparent 3px,transparent 7px
          );
          flex-shrink:0;
        }
        /* Main content area */
        .main{
          flex:1;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:space-between;
          padding:0.3cm 0.2cm;
        }
        /* QR code top */
        .qr-img{
          width:2.2cm;height:2.2cm;
          object-fit:contain;
          border:2px solid #14532d;
          border-radius:4px;
          padding:2px;
        }
        /* Scout logo */
        .logo-area{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:1mm;
        }
        .scout-logo{
          width:1.5cm;height:1.5cm;
          object-fit:contain;
        }
        .org-name{
          font-size:5pt;
          color:#14532d;
          text-align:center;
          font-weight:bold;
          max-width:3cm;
        }
        /* Right stripe — name */
        .stripe-right{
          width:1.1cm;
          background:linear-gradient(180deg,#fdba74,#fb923c);
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
        }
        .stripe-right-text{
          writing-mode:vertical-rl;
          text-orientation:mixed;
          transform:rotate(180deg);
          font-size:7pt;
          font-weight:800;
          color:#1c1917;
          letter-spacing:0.5px;
          white-space:nowrap;
          padding:2mm 0;
        }
      </style></head>
      <body>
        <!-- Left orange stripe -->
        <div class="stripe-left">
          <span class="stripe-left-text">Carte Fidélité Scout</span>
        </div>
        <!-- Dotted separator line -->
        <div class="dots"></div>
        <!-- Main area: QR top, logo bottom -->
        <div class="main">
          ${user.qr_code_image
            ? `<img class="qr-img" src="${user.qr_code_image}" alt="QR Code"/>`
            : `<div style="width:2.2cm;height:2.2cm;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#999">No QR</div>`
          }
          <div class="logo-area">
            <svg class="scout-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#14532d" stroke-width="3"/>
              <text x="50" y="20" text-anchor="middle" font-size="7" fill="#14532d" font-weight="bold">★ SCOUTS MUSULMANS ★</text>
              <text x="50" y="88" text-anchor="middle" font-size="7" fill="#14532d" font-weight="bold">DE MONTRÉAL</text>
              <!-- Fleur-de-lis simplified -->
              <path d="M50,30 C50,30 45,40 40,45 C38,47 40,52 50,52 C60,52 62,47 60,45 C55,40 50,30 50,30Z" fill="#14532d"/>
              <path d="M50,52 L45,75 L50,70 L55,75 Z" fill="#14532d"/>
              <ellipse cx="38" cy="50" rx="8" ry="5" fill="#14532d"/>
              <ellipse cx="62" cy="50" rx="8" ry="5" fill="#14532d"/>
              <circle cx="50" cy="46" r="5" fill="white" stroke="#14532d" stroke-width="1.5"/>
            </svg>
            <div class="org-name">Scouts Musulmans de Montréal</div>
          </div>
        </div>
        <!-- Right name stripe -->
        <div class="stripe-right">
          <span class="stripe-right-text">${user.full_name}</span>
        </div>
        <script>
          window.onload = () => setTimeout(() => { window.print(); window.close(); }, 600);
        </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const getCategoryLabel = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value?.toLowerCase());
    return cat ? (language === 'fr' ? cat.fr : cat.en) : value;
  };

  const getStatusLabel = (value: string) => {
    const s = STATUSES.find(s => s.value === value?.toLowerCase());
    return s ? (language === 'fr' ? s.fr : s.en) : value;
  };

  const getStatusColor = (status: string): any => {
    switch (status?.toLowerCase()) {
      case 'available': return 'success';
      case 'borrowed': return 'info';
      case 'maintenance': return 'warning';
      case 'retired': return 'default';
      default: return 'default';
    }
  };

  const handleExport = () => {
    const csv = [
      'Name,Code,Category,Status,Quantity,Available,Borrowable',
      ...items.map(i =>
        `"${i.name}","${i.item_code}","${i.category}","${i.status}",${i.quantity},${i.available_quantity},${i.is_borrowable}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1b4332' }}>{t('itemManagement')}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>{t('export')}</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('create')}
            sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
            {t('addItem')}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardContent>
          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder={t('searchItems')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>{t('category')}</InputLabel>
              <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} label={t('category')}>
                <MenuItem value="">{t('allCategories')}</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{language === 'fr' ? cat.fr : cat.en}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{t('status')}</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label={t('status')}>
                <MenuItem value="">{t('allStatuses2')}</MenuItem>
                {STATUSES.map(s => (
                  <MenuItem key={s.value} value={s.value}>{language === 'fr' ? s.fr : s.en}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? <LoadingSpinner /> : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('itemName')}</TableCell>
                      <TableCell>{t('itemCode')}</TableCell>
                      <TableCell>{t('category')}</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell>{t('quantity')}</TableCell>
                      <TableCell>{language === 'fr' ? 'Disponible' : 'Available'}</TableCell>
                      <TableCell>{language === 'fr' ? 'Colonne (A–Z)' : 'Column (A–Z)'}</TableCell>
                      <TableCell>{language === 'fr' ? 'Rangée (1–6)' : 'Row (1–6)'}</TableCell>
                      <TableCell align="right">{t('actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          {t('noItems')} {t('createFirstItem')}
                        </TableCell>
                      </TableRow>
                    ) : items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: '#2d6a4f' }}><Inventory /></Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><code>{item.item_code}</code></TableCell>
                        <TableCell><Chip label={getCategoryLabel(item.category)} size="small" /></TableCell>
                        <TableCell>
                          <Chip label={getStatusLabel(item.status)} color={getStatusColor(item.status)} size="small" />
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Chip label={item.available_quantity} color={item.available_quantity > 0 ? 'success' : 'error'} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(() => { const m = item.location?.match(/^([A-Za-z])[1-6]$/); return m ? m[1].toUpperCase() : (item.location || '—'); })()}
                            size="small"
                            sx={{ bgcolor: '#1b4332', color: 'white', fontWeight: 700, minWidth: 36 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(() => { const m = item.location?.match(/^[A-Za-z]([1-6])$/); return m ? m[1] : '—'; })()}
                            size="small"
                            sx={{ bgcolor: '#2d6a4f', color: 'white', fontWeight: 700, minWidth: 36 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={t('viewQR')}>
                            <IconButton size="small" onClick={() => { setSelectedItem(item); setShowQRDialog(true); }}>
                              <QrCode2 />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={language === 'fr' ? 'Imprimer QR article' : 'Print Item QR'}>
                            <IconButton size="small" onClick={() => handlePrintItemQR(item)}>
                              <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('edit')}>
                            <IconButton size="small" onClick={() => handleOpenDialog('edit', item)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('delete')}>
                            <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
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
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage={t('rowsPerPage')}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create'
            ? (language === 'fr' ? 'Ajouter un article' : 'Add New Item')
            : (language === 'fr' ? `Modifier : ${selectedItem?.name}` : `Edit: ${selectedItem?.name}`)}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>

            {/* Item Name */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label={t('itemName')} value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={saving} />
            </Grid>

            {/* item_code — editable only on create, LOCKED on edit */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('itemCode')}
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                disabled={saving || dialogMode === 'edit'}
                helperText={
                  dialogMode === 'edit'
                    ? (language === 'fr' ? 'Le code article ne peut pas être modifié' : 'Item code cannot be changed')
                    : (language === 'fr' ? 'Laisser vide pour générer automatiquement' : 'Leave blank to auto-generate')
                }
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label={t('description')} value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={saving} />
            </Grid>

            {/* Category */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('category')}</InputLabel>
                <Select value={formData.category} label={t('category')} disabled={saving}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{language === 'fr' ? cat.fr : cat.en}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('status')}</InputLabel>
                <Select value={formData.status} label={t('status')} disabled={saving}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  {STATUSES.map(s => (
                    <MenuItem key={s.value} value={s.value}>{language === 'fr' ? s.fr : s.en}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Quantity */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label={t('quantity')} type="number" value={formData.quantity}
                onChange={(e) => {
                  const newQty = Math.max(1, parseInt(e.target.value) || 1);
                  setFormData({
                    ...formData,
                    quantity: newQty,
                    // Keep available_quantity in range whenever the total changes
                    available_quantity: Math.min(formData.available_quantity, newQty),
                  });
                }}
                inputProps={{ min: 1 }} disabled={saving} />
            </Grid>

            {/* Available Quantity — how many of the total are available right now */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={language === 'fr' ? 'Quantité disponible' : 'Available Quantity'}
                type="number"
                value={formData.available_quantity}
                onChange={(e) => {
                  const raw = parseInt(e.target.value);
                  const clamped = Math.max(0, Math.min(isNaN(raw) ? 0 : raw, formData.quantity));
                  setFormData({ ...formData, available_quantity: clamped });
                }}
                inputProps={{ min: 0, max: formData.quantity }}
                helperText={
                  language === 'fr'
                    ? `Sur un total de ${formData.quantity}`
                    : `Out of a total of ${formData.quantity}`
                }
                disabled={saving}
              />
            </Grid>

            {/* Column A–Z */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel>{language === 'fr' ? 'Colonne (A–Z)' : 'Column (A–Z)'}</InputLabel>
                <Select
                  value={formData.location?.match(/^([A-Za-z])[1-6]$/) ? formData.location[0].toUpperCase() : ''}
                  label={language === 'fr' ? 'Colonne (A–Z)' : 'Column (A–Z)'}
                  onChange={(e) => {
                    const col = e.target.value;
                    const row = formData.location?.match(/^[A-Za-z]([1-6])$/)?.[1] || '1';
                    setFormData({ ...formData, location: `${col}${row}` });
                  }}
                >
                  <MenuItem value="">{language === 'fr' ? '— Aucune —' : '— None —'}</MenuItem>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(col => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Row 1–6 */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel>{language === 'fr' ? 'Rangée (1–6)' : 'Row (1–6)'}</InputLabel>
                <Select
                  value={formData.location?.match(/^[A-Za-z]([1-6])$/) ? formData.location[1] : ''}
                  label={language === 'fr' ? 'Rangée (1–6)' : 'Row (1–6)'}
                  onChange={(e) => {
                    const row = e.target.value;
                    const col = formData.location?.match(/^([A-Za-z])[1-6]$/)?.[1]?.toUpperCase() || 'A';
                    setFormData({ ...formData, location: `${col}${row}` });
                  }}
                >
                  <MenuItem value="">{language === 'fr' ? '— Aucune —' : '— None —'}</MenuItem>
                  {[1,2,3,4,5,6].map(row => (
                    <MenuItem key={row} value={String(row)}>{row}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Max Borrow Days */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('maxBorrowDays')} type="number" value={formData.max_borrow_days}
                onChange={(e) => setFormData({ ...formData, max_borrow_days: Math.max(1, parseInt(e.target.value) || 1) })}
                inputProps={{ min: 1 }} disabled={saving} />
            </Grid>

            {/* Borrowable toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch checked={formData.is_borrowable} disabled={saving}
                    onChange={(e) => setFormData({ ...formData, is_borrowable: e.target.checked })} />
                }
                label={language === 'fr' ? "L'article peut être emprunté" : 'Item can be borrowed by users'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}
            sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
            {saving ? t('saving') : dialogMode === 'create' ? t('createItem') : t('saveChanges')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('qrCode')} — {selectedItem?.name}</DialogTitle>
        <DialogContent>
          {selectedItem?.qr_code_data && (
            <QRDisplay
              data={selectedItem.qr_code_data}
              title={selectedItem.name}
              description={`${t('itemCode')}: ${selectedItem.item_code}`}
              size={300}
              filename={`item_qr_${selectedItem.id}`}
            />
          )}
          {selectedItem && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button variant="contained" startIcon={<Download />}
                onClick={() => handlePrintItemQR(selectedItem)}
                sx={{ bgcolor: '#2d6a4f' }}>
                {language === 'fr' ? 'Imprimer QR (5cm × 5cm)' : 'Print QR (5cm × 5cm)'}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemManagement;