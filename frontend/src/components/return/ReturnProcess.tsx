
import React, { useState } from 'react';
import {
  Box, Typography, Button, Alert, TextField, Grid, Chip, Avatar,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemAvatar, CircularProgress,
  Divider, Switch, FormControlLabel, FormControl, FormLabel,
  RadioGroup, Radio,
} from '@mui/material';
import {
  QrCodeScanner, CheckCircle, Assignment, Person, Inventory2, ArrowBack,
} from '@mui/icons-material';
import QRScanner from '../common/QRScanner';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

const API = '/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

interface ReturnProcessProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface TxData {
  id: number;
  item_id: number;       // FIX: was missing — required for item-based filtering
  item_name: string;
  item_code: string;
  user_name: string;
  quantity: number;
  borrowed_at: string;
  due_date: string | null;
}

const ReturnProcess: React.FC<ReturnProcessProps> = ({ onComplete, onCancel }) => {
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const fr = language === 'fr';
  const isAdmin = currentUser?.is_admin;

  const [adminMode, setAdminMode]         = useState(false);
  const [step, setStep]                   = useState<'scan_item' | 'scan_user' | 'select' | 'confirm' | 'done'>('scan_item');
  const [showScanner, setShowScanner]     = useState(false);
  const [scanTarget, setScanTarget]       = useState<'item' | 'user'>('item');

  const [itemQR, setItemQR]               = useState('');
  const [userQR, setUserQR]               = useState('');
  const [scannedItemId, setScannedItemId] = useState<number | null>(null);
  const [transactions, setTransactions]   = useState<TxData[]>([]);
  const [selected, setSelected]           = useState<TxData | null>(null);
  const [condition, setCondition]         = useState('good');
  const [notes, setNotes]                 = useState('');

  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const parseQR = (raw: string): { type: string; id: number } | null => {
    const parts = raw.split(':');
    if (parts.length < 2) return null;
    const id = parseInt(parts[1]);
    return isNaN(id) ? null : { type: parts[0].toLowerCase(), id };
  };

  // After scanning item → fetch active transactions for that item via dedicated endpoint
  const handleItemScan = async (raw: string) => {
    setShowScanner(false);
    const parsed = parseQR(raw);
    if (!parsed || parsed.type !== 'item') {
      setError(fr ? "Veuillez scanner un QR article" : 'Please scan an item QR code');
      return;
    }
    setItemQR(raw);
    setScannedItemId(parsed.id);
    setLoading(true); setError('');
    try {
      // FIX: use /active-for-item/{item_id} instead of /my-active.
      // /my-active only returns the current user's borrows and does not support
      // the admin-return-for-user workflow. The new endpoint returns all active
      // borrows for the item (filtered by user for non-admins).
      const res = await fetch(`${API}/transactions/active-for-item/${parsed.id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(fr ? 'Échec du chargement' : 'Failed to load');
      const all: TxData[] = await res.json();
      if (all.length === 0) {
        throw new Error(fr ? "Aucun emprunt actif trouvé pour cet article" : 'No active borrow found for this item');
      }
      setTransactions(all);
      if (all.length === 1) {
        setSelected(all[0]);
        setStep(adminMode ? 'scan_user' : 'confirm');
      } else {
        setStep('select');
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // After scanning user card (admin mode)
  const handleUserScan = (raw: string) => {
    setShowScanner(false);
    const parsed = parseQR(raw);
    if (!parsed || parsed.type !== 'user') {
      setError(fr ? 'Veuillez scanner une carte utilisateur' : 'Please scan a user QR card');
      return;
    }
    setUserQR(raw);
    setStep('confirm');
  };

  const handleScan = (raw: string) => {
    if (scanTarget === 'item') handleItemScan(raw);
    else handleUserScan(raw);
  };

  const handleReturn = async () => {
    if (!selected) return;
    setLoading(true); setError('');
    try {
      const body: any = {
        transaction_id: selected.id,
        condition_at_return: condition,
        notes,
      };
      const res = await fetch(`${API}/transactions/return`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(typeof err.detail === 'string' ? err.detail
          : (fr ? 'Échec du retour' : 'Failed to return item'));
      }
      setStep('done');
      setTimeout(() => onComplete?.(), 2500);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStep('scan_item'); setItemQR(''); setUserQR('');
    setScannedItemId(null); setTransactions([]); setSelected(null);
    setCondition('good'); setNotes(''); setError('');
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      {/* Admin mode toggle */}
      {isAdmin && (
        <FormControlLabel sx={{ mb: 2 }}
          control={<Switch checked={adminMode} onChange={e => { setAdminMode(e.target.checked); reset(); }} color="primary" />}
          label={<Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fr ? 'Mode admin : retourner pour un utilisateur' : 'Admin mode: return on behalf of user'}
          </Typography>}
        />
      )}

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Step: Scan Item ── */}
      {step === 'scan_item' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: '#2d6a4f' }}>
            <Inventory2 sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" gutterBottom>
            {fr ? "Scanner l'article à retourner" : 'Scan Item to Return'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {fr ? "Scannez le code QR sur l'article que vous retournez"
                : 'Scan the QR code on the item you are returning'}
          </Typography>
          {loading ? <CircularProgress sx={{ color: '#2d6a4f' }} /> : (
            <Button variant="contained" size="large" startIcon={<QrCodeScanner />}
              onClick={() => { setScanTarget('item'); setShowScanner(true); }}
              sx={{ bgcolor: '#2d6a4f' }}>
              {fr ? "Scanner QR article" : 'Scan Item QR'}
            </Button>
          )}
        </Box>
      )}

      {/* ── Step: Select transaction (if multiple) ── */}
      {step === 'select' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {fr ? 'Sélectionner la transaction' : 'Select Transaction'}
          </Typography>
          <List>
            {transactions.map(tx => (
              <ListItem key={tx.id} button onClick={() => {
                setSelected(tx);
                setStep(adminMode ? 'scan_user' : 'confirm');
              }} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, mb: 1 }}>
                <ListItemAvatar><Avatar sx={{ bgcolor: '#1b4332' }}><Assignment /></Avatar></ListItemAvatar>
                <ListItemText
                  primary={`${tx.item_name} — ${tx.user_name}`}
                  secondary={`${fr ? 'Emprunté le' : 'Borrowed'} ${new Date(tx.borrowed_at).toLocaleDateString()}`}
                />
                <Chip label={`#${tx.id}`} size="small" />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* ── Step: Scan User Card (admin mode) ── */}
      {step === 'scan_user' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: '#1b4332' }}>
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" gutterBottom>
            {fr ? "Scanner la carte de l'utilisateur" : "Scan User's QR Card"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {fr ? "Scannez la carte fidélité de l'utilisateur pour confirmer le retour"
                : "Scan the user's loyalty card to confirm the return"}
          </Typography>
          <Button variant="contained" size="large" startIcon={<QrCodeScanner />}
            onClick={() => { setScanTarget('user'); setShowScanner(true); }}
            sx={{ bgcolor: '#1b4332' }}>
            {fr ? 'Scanner carte utilisateur' : 'Scan User Card'}
          </Button>
        </Box>
      )}

      {/* ── Step: Confirm return ── */}
      {step === 'confirm' && selected && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>{fr ? 'Confirmer le retour' : 'Confirm Return'}</Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{fr ? 'Article' : 'Item'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.item_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{fr ? 'Emprunté par' : 'Borrowed by'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.user_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">{fr ? 'Quantité' : 'Quantity'}</Typography>
                <Typography variant="body2">{selected.quantity}</Typography>
              </Grid>
              {selected.due_date && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{fr ? 'Échéance' : 'Due date'}</Typography>
                  <Typography variant="body2"
                    sx={{ color: new Date(selected.due_date) < new Date() ? 'error.main' : 'inherit' }}>
                    {new Date(selected.due_date).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          <FormControl sx={{ mb: 2 }}>
            <FormLabel>{fr ? "État à la restitution" : 'Condition at return'}</FormLabel>
            <RadioGroup row value={condition} onChange={e => setCondition(e.target.value)}>
              <FormControlLabel value="good"     control={<Radio />} label={fr ? 'Bon'    : 'Good'} />
              <FormControlLabel value="fair"     control={<Radio />} label={fr ? 'Passable' : 'Fair'} />
              <FormControlLabel value="damaged"  control={<Radio />} label={fr ? 'Endommagé' : 'Damaged'} />
            </RadioGroup>
          </FormControl>

          <TextField fullWidth multiline rows={2} label={fr ? 'Notes (optionnel)' : 'Notes (optional)'}
            value={notes} onChange={e => setNotes(e.target.value)} sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => setStep('scan_item')}>
              {fr ? 'Retour' : 'Back'}
            </Button>
            <Button variant="contained" onClick={handleReturn}
              endIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}
              disabled={loading} sx={{ bgcolor: '#2d6a4f', flex: 1 }}>
              {fr ? 'Confirmer le retour' : 'Confirm Return'}
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Avatar sx={{ width: 90, height: 90, mx: 'auto', mb: 2, bgcolor: 'success.main' }}>
            <CheckCircle sx={{ fontSize: 55 }} />
          </Avatar>
          <Typography variant="h5" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
            {fr ? 'Retour réussi !' : 'Return Successful!'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {selected?.item_name} {fr ? 'a été retourné.' : 'has been returned.'}
          </Typography>
          <Button variant="contained" onClick={reset} sx={{ bgcolor: '#2d6a4f' }}>
            {fr ? 'Retourner un autre article' : 'Return Another Item'}
          </Button>
        </Box>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={showScanner} onClose={() => setShowScanner(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {scanTarget === 'item'
            ? (fr ? "Scanner l'article" : 'Scan Item QR')
            : (fr ? 'Scanner la carte utilisateur' : 'Scan User Card')}
        </DialogTitle>
        <DialogContent>
          <QRScanner onScanSuccess={handleScan} onScanError={setError} height={380} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScanner(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReturnProcess;