
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Pagination,
  Tooltip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar,
} from '@mui/material';
import { Search, QrCode2, Add, FilterList, Inventory2, CheckCircle, Block, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import QRDisplay from '../components/common/QRDisplay';
import { useLanguage } from '../context/LanguageContext';
import { itemAPI } from '../services/api';

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
  brand?: string;
  model?: string;
  location?: string;        // full location string e.g. "A3"
  shelf_column?: string;    // A–Z
  shelf_row?: number;       // 1–6
  qr_code_data?: string;
  qr_code_image?: string;
}

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Category values match backend enum exactly (lowercase)
  const categories = [
    { value: 'electronics',  label: t('catElectronics') },
    { value: 'school_items', label: t('catSchoolItems') },
    { value: 'decorations',  label: t('catDecorations') },
    { value: 'clothes',      label: t('catClothes') },
    { value: 'games',        label: t('catGames') },
    { value: 'other',        label: t('catOther') },
  ];

  const statuses = [
    { value: 'available', label: t('available') },
    { value: 'borrowed', label: t('borrowed') },
    { value: 'maintenance', label: t('maintenance') },
    { value: 'retired', label: t('retired') },
  ];

  const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const ROWS = [1, 2, 3, 4, 5, 6];

  const parseLocation = (item: Item): { col: string; row: number | null } => {
    if (item.shelf_column && item.shelf_row) {
      return { col: item.shelf_column.toUpperCase(), row: item.shelf_row };
    }
    if (item.location) {
      const match = item.location.trim().match(/^([A-Za-z])([1-6])$/);
      if (match) return { col: match[1].toUpperCase(), row: parseInt(match[2]) };
    }
    return { col: '—', row: null };
  };

  const getCategoryLabel = (val: string) =>
    categories.find(c => c.value === val?.toLowerCase())?.label ?? val;

  const getStatusLabel = (val: string) =>
    statuses.find(s => s.value === val?.toLowerCase())?.label ?? val;

  useEffect(() => {
    fetchItems();
  }, [page, searchQuery, categoryFilter, statusFilter]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await itemAPI.getAll({
        page,
        page_size: 12,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(Math.ceil(data.total / 12));
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status?.toLowerCase()) {
      case 'available': return 'success';
      case 'borrowed': return 'info';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available': return <CheckCircle />;
      case 'borrowed': return <Block />;
      default: return <Info />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1b4332' }}>
          {t('inventory')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {language === 'fr' ? 'Parcourez et recherchez les articles disponibles' : 'Browse and search available items'}
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={t('searchItems')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('category')}</InputLabel>
              <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} label={t('category')}>
                <MenuItem value="">{t('allCategories')}</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('status')}</InputLabel>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} label={t('status')}>
                <MenuItem value="">{t('allStatuses')}</MenuItem>
                {statuses.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" startIcon={<FilterList />}
              onClick={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}>
              {language === 'fr' ? 'Effacer' : 'Clear'}
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {language === 'fr' ? `${items.length} / ${total} articles` : `Showing ${items.length} of ${total} items`}
          </Typography>
          {(searchQuery || categoryFilter || statusFilter) && (
            <Chip label={language === 'fr' ? 'Filtré' : 'Filtered'} size="small" color="primary" variant="outlined" />
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}

      {/* Items Table */}
      {loading ? (
        <LoadingSpinner message={t('loading')} />
      ) : items.length === 0 ? (
        <Alert severity="info">
          {t('noItems')} {language === 'fr' ? 'Essayez de modifier vos filtres.' : 'Try adjusting your filters.'}
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('itemName')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('itemCode')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('category')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('status')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('quantity')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{language === 'fr' ? 'Disponible' : 'Available'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{language === 'fr' ? 'Colonne (A–Z)' : 'Column (A–Z)'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{language === 'fr' ? 'Rangée (1–6)' : 'Row (1–6)'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#1b4332', width: 32, height: 32 }}>
                          <Inventory2 sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><code>{item.item_code}</code></TableCell>
                    <TableCell>
                      <Chip label={getCategoryLabel(item.category)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(item.status)} size="small" color={getStatusColor(item.status)} icon={getStatusIcon(item.status)} />
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Chip label={item.available_quantity} size="small" color={item.available_quantity > 0 ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={parseLocation(item).col}
                        size="small"
                        sx={{ bgcolor: '#1b4332', color: 'white', fontWeight: 700, minWidth: 36 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={parseLocation(item).row ?? '—'}
                        size="small"
                        sx={{ bgcolor: '#2d6a4f', color: 'white', fontWeight: 700, minWidth: 36 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" size="large" />
            </Box>
          )}
        </>
      )}

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('qrCode')} — {selectedItem?.name}</DialogTitle>
        <DialogContent>
          {selectedItem?.qr_code_data && (
            <QRDisplay data={selectedItem.qr_code_data} title={selectedItem.name}
              description={`${t('itemCode')}: ${selectedItem.item_code}`}
              size={300} filename={`item_qr_${selectedItem.id}`} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedItem?.name}</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{t('itemCode')}</Typography>
                  <Typography variant="body1">{selectedItem.item_code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{t('category')}</Typography>
                  <Typography variant="body1">{getCategoryLabel(selectedItem.category)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{t('status')}</Typography>
                  <Chip label={getStatusLabel(selectedItem.status)} color={getStatusColor(selectedItem.status)} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{t('quantity')}</Typography>
                  <Typography variant="body1">{selectedItem.available_quantity} / {selectedItem.quantity}</Typography>
                </Grid>
                {selectedItem.brand && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{t('brand')}</Typography>
                    <Typography variant="body1">{selectedItem.brand}</Typography>
                  </Grid>
                )}
                {selectedItem.model && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{t('model')}</Typography>
                    <Typography variant="body1">{selectedItem.model}</Typography>
                  </Grid>
                )}
                {selectedItem.location && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">{t('location')}</Typography>
                    <Typography variant="body1">{selectedItem.location}</Typography>
                  </Grid>
                )}
                {selectedItem.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">{t('description')}</Typography>
                    <Typography variant="body1">{selectedItem.description}</Typography>
                  </Grid>
                )}
                {selectedItem.max_borrow_days && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">{t('maxBorrowDays')}</Typography>
                    <Typography variant="body1">{selectedItem.max_borrow_days} {t('days')}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Inventory;