/**
 * UserOrders.tsx — User Orders Page
 * Replaces UserRequests.tsx
 * Route: /orders (user side)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  Tooltip, IconButton, CircularProgress, Grid,
} from '@mui/material';
import { Add, Cancel, HourglassEmpty, CheckCircle, LocalShipping, ThumbDown, CalendarMonth } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useLanguage } from '../context/LanguageContext';
import { itemAPI } from '../services/api';

const API = '/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

interface Order {
  id: number; user_id: number; order_type: string; title: string;
  description: string; item_id?: number; item_name?: string;
  needed_date?: string; ready_date?: string; status: string;
  admin_response?: string; admin_name?: string; created_at: string;
}

const ORDER_TYPES = [
  { value: 'new_item',       en: 'New Item Request',  fr: 'Demande de nouvel article' },
  { value: 'special_borrow', en: 'Special Borrowing', fr: 'Emprunt Spécial' },
  { value: 'other',          en: 'Other Request',      fr: 'Autre demande' },
];

const STATUS_CFG: Record<string, { color: any; icon: React.ReactNode; en: string; fr: string }> = {
  pending:  { color: 'warning', icon: <HourglassEmpty />, en: 'Pending',  fr: 'En attente' },
  approved: { color: 'info',    icon: <CheckCircle />,    en: 'Approved', fr: 'Approuvée' },
  ready:    { color: 'success', icon: <LocalShipping />,  en: 'Ready',    fr: 'Prête' },
  rejected: { color: 'error',   icon: <ThumbDown />,      en: 'Rejected', fr: 'Rejetée' },
};

const UserOrders: React.FC = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [orders, setOrders]       = useState<Order[]>([]);
  const [items, setItems]         = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    order_type: 'new_item', title: '', description: '',
    item_id: '' as string | number, needed_date: null as Date | null,
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/me`, { headers: authHeaders() });
      if (!res.ok) throw new Error(fr ? 'Échec du chargement' : 'Failed to load');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [fr]);

  useEffect(() => {
    fetchOrders();
    itemAPI.getAll({ page: 1, page_size: 100 })
      .then(d => setItems((d.items || []).map((i: any) => ({ id: i.id, name: i.name }))))
      .catch(() => {});
  }, [fetchOrders]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setError(fr ? 'Titre requis' : 'Title required'); return; }
    if (!form.description.trim()) { setError(fr ? 'Description requise' : 'Description required'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          order_type: form.order_type,
          title: form.title.trim(),
          description: form.description.trim(),
          ...(form.item_id   && { item_id: Number(form.item_id) }),
          ...(form.needed_date && { needed_date: form.needed_date.toISOString() }),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.detail)
          ? err.detail.map((e: any) => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(', ')
          : err.detail || (fr ? 'Échec' : 'Failed'));
      }
      setSuccess(fr ? 'Commande créée !' : 'Order created!');
      setShowCreate(false);
      setForm({ order_type: 'new_item', title: '', description: '', item_id: '', needed_date: null });
      fetchOrders();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm(fr ? 'Annuler cette commande ?' : 'Cancel this order?')) return;
    try {
      const res = await fetch(`${API}/orders/${id}/cancel`, { method: 'PATCH', headers: authHeaders() });
      if (!res.ok) throw new Error(fr ? 'Échec' : 'Failed');
      setSuccess(fr ? 'Commande annulée.' : 'Order cancelled.');
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const typeLabel = (v: string) => { const t = ORDER_TYPES.find(x => x.value === v); return t ? (fr ? t.fr : t.en) : v; };
  const statusChip = (s: string) => {
    const cfg = STATUS_CFG[s] || { color: 'default', icon: null, en: s, fr: s };
    return <Chip icon={cfg.icon as any} label={fr ? cfg.fr : cfg.en} color={cfg.color} size="small" />;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1b4332' }}>
            {fr ? 'Mes commandes' : 'My Orders'}
          </Typography>
          <Button variant="contained" startIcon={<Add />}
            onClick={() => { setShowCreate(true); setError(''); }}
            sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
            {fr ? 'Nouvelle commande' : 'New Order'}
          </Button>
        </Box>

        {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        {orders.filter(o => o.status === 'ready').length > 0 && (
          <Alert severity="success" icon={<LocalShipping />} sx={{ mb: 2 }}>
            <strong>🎉 {fr
              ? `${orders.filter(o => o.status === 'ready').length} commande(s) prête(s) à récupérer !`
              : `${orders.filter(o => o.status === 'ready').length} order(s) ready for pickup!`}
            </strong>
          </Alert>
        )}

        <Card elevation={2} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#2d6a4f' }} /></Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f0fdf4' }}>
                    <TableRow>
                      {['#', fr ? 'Type' : 'Type', fr ? 'Titre' : 'Title',
                        fr ? 'Statut' : 'Status', fr ? 'Souhaité le' : 'Needed By',
                        fr ? 'Prête le' : 'Ready Date', fr ? 'Réponse admin' : 'Admin Note',
                        fr ? 'Créée le' : 'Created', fr ? 'Action' : 'Action',
                      ].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          {fr ? 'Aucune commande. Cliquez sur "Nouvelle commande".' : 'No orders yet. Click "New Order".'}
                        </TableCell>
                      </TableRow>
                    ) : orders.map(o => (
                      <TableRow key={o.id} hover sx={o.status === 'ready' ? { bgcolor: '#f0fdf4' } : {}}>
                        <TableCell sx={{ fontFamily: 'monospace', color: '#888' }}>#{o.id}</TableCell>
                        <TableCell><Chip label={typeLabel(o.order_type)} size="small" variant="outlined" /></TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.title}</Typography>
                          {o.item_name && <Typography variant="caption" color="text.secondary">📦 {o.item_name}</Typography>}
                        </TableCell>
                        <TableCell>{statusChip(o.status)}</TableCell>
                        <TableCell><Typography variant="caption">{fmt(o.needed_date)}</Typography></TableCell>
                        <TableCell>
                          {o.ready_date
                            ? <Chip label={fmt(o.ready_date)} size="small" color="success" icon={<CalendarMonth />} />
                            : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          {o.admin_response
                            ? <Typography variant="caption" sx={{ fontStyle: 'italic' }}>"{o.admin_response}"</Typography>
                            : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell><Typography variant="caption">{fmt(o.created_at)}</Typography></TableCell>
                        <TableCell>
                          {o.status === 'pending' && (
                            <Tooltip title={fr ? 'Annuler' : 'Cancel'}>
                              <IconButton size="small" color="error" onClick={() => handleCancel(o.id)}><Cancel /></IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Create Order Dialog */}
        <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: '#1b4332', color: 'white', fontWeight: 700 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Add /> {fr ? 'Nouvelle commande' : 'New Order'}</Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>{fr ? 'Type de commande' : 'Order Type'}</InputLabel>
                  <Select value={form.order_type} label={fr ? 'Type de commande' : 'Order Type'}
                    onChange={e => setForm({ ...form, order_type: e.target.value })}>
                    {ORDER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{fr ? t.fr : t.en}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required label={fr ? 'Titre' : 'Title'}
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required multiline rows={3}
                  label={fr ? 'Description détaillée' : 'Detailed Description'}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{fr ? 'Article lié (optionnel)' : 'Related Item (optional)'}</InputLabel>
                  <Select value={form.item_id} label={fr ? 'Article lié (optionnel)' : 'Related Item (optional)'}
                    onChange={e => setForm({ ...form, item_id: e.target.value })}>
                    <MenuItem value="">{fr ? '— Aucun —' : '— None —'}</MenuItem>
                    {items.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <DatePicker label={fr ? 'Date souhaitée (optionnel)' : 'Needed By (optional)'}
                  value={form.needed_date} onChange={d => setForm({ ...form, needed_date: d })}
                  minDate={new Date()} slotProps={{ textField: { fullWidth: true } }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowCreate(false)} disabled={submitting}>{fr ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={handleCreate} variant="contained" disabled={submitting}
              sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
              {submitting ? (fr ? 'Envoi...' : 'Submitting...') : (fr ? 'Soumettre' : 'Submit Order')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default UserOrders;
