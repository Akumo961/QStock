
import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Avatar, Chip,
  Alert, Grid, Divider, Paper,
} from '@mui/material';
import {
  Print, ContentCopy, AdminPanelSettings,
  Business, Phone,
} from '@mui/icons-material';
import QRDisplay from '../common/QRDisplay';
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
}

interface UserQRProps {
  user: User;
  showUserInfo?: boolean;
  size?: number;
  variant?: 'default' | 'minimal' | 'detailed';
  onDownload?: () => void;
  onShare?: () => void;
}

const UserQR: React.FC<UserQRProps> = ({
  user,
  showUserInfo = true,
  size = 300,
  variant = 'default',
  onDownload,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);
  const { t, language } = useLanguage();

  const isFr = language === 'fr';
  const orgName = isFr ? 'Scouts Musulmans de Montréal' : 'Scouts Musulmans of Montreal';

  const handleCopy = async () => {
    if (user.qr_code_data) {
      try {
        await navigator.clipboard.writeText(user.qr_code_data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  /**
   * FIX 2: Prints a 5cm × 8.5cm loyalty card matching the physical Scout card.
   *
   * Landscape orientation:
   * ┌─────┬╌┬──────────────────────────────┬─────┐
   * │ Carte│ │  [QR 3cm×3cm]               │     │
   * │ Fidé ╌│  [Logo + Org Name]           │Name │
   * │ lité │ │                              │     │
   * │ Scout│ │                              │     │
   * └─────┴╌┴──────────────────────────────┴─────┘
   *  1.2cm    ~5.5cm                         1.2cm
   */
  const handlePrint = () => {
    if (!user.qr_code_image) return;
    const printWindow = window.open('', '', 'width=500,height=350');
    if (!printWindow) return;

    const cardTitle = isFr ? 'Carte Fidélité Scout' : 'Scout Loyalty Card';
    const roleLabel = user.is_admin ? (isFr ? 'Administrateur' : 'Administrator') : (isFr ? 'Membre' : 'Member');
    const logoSrc = window.location.origin + '/logo.png';

    const html = `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${cardTitle} - ${user.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 8.5cm;
      height: 5cm;
      overflow: hidden;
      font-family: Arial, sans-serif;
      background: white;
    }
    .card {
      width: 8.5cm;
      height: 5cm;
      display: flex;
      flex-direction: row;
      border: 1px solid #bbb;
      border-radius: 3mm;
      overflow: hidden;
      background: white;
    }
    /* Left orange strip */
    .left-strip {
      width: 1.3cm;
      background: linear-gradient(to bottom, #e8834a 0%, #c0522a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .strip-text {
      font-size: 6.5pt;
      font-weight: 900;
      color: #1b4332;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
      padding: 2mm 0;
    }
    /* Dashed separator */
    .dashes {
      width: 3mm;
      flex-shrink: 0;
      background: repeating-linear-gradient(
        to bottom,
        #1b4332 0px, #1b4332 4px,
        transparent 4px, transparent 8px
      );
    }
    /* Center content */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3mm 2mm;
    }
    .qr-img {
      width: 3cm;
      height: 3cm;
      object-fit: contain;
      display: block;
    }
    .bottom-row {
      display: flex;
      align-items: center;
      gap: 2mm;
      width: 100%;
    }
    .logo-img {
      width: 1.1cm;
      height: 1.1cm;
      object-fit: contain;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .org-text {
      font-size: 5pt;
      font-weight: 700;
      color: #1b4332;
      line-height: 1.3;
    }
    /* Right name strip */
    .right-strip {
      width: 1.3cm;
      background: linear-gradient(to bottom, #f4b49a 0%, #e08060 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .name-text {
      font-size: 6pt;
      font-weight: 800;
      color: #1b4332;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      letter-spacing: 0.5px;
      text-align: center;
      line-height: 1.1;
      padding: 2mm 0;
      max-height: 4.5cm;
      overflow: hidden;
    }
    @media print {
      @page {
        size: 8.5cm 5cm;
        margin: 0;
      }
      body { width: 8.5cm; height: 5cm; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="left-strip">
      <div class="strip-text">${cardTitle}</div>
    </div>
    <div class="dashes"></div>
    <div class="content">
      <img class="qr-img" src="${user.qr_code_image}" alt="QR Code" />
      <div class="bottom-row">
        <img class="logo-img" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'" />
        <div class="org-text">${orgName}<br/><span style="color:#888;font-weight:400;">${roleLabel}</span></div>
      </div>
    </div>
    <div class="right-strip">
      <div class="name-text">${user.full_name}</div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 400);
    };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ── Minimal variant ───────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <Box>
        {user.qr_code_data ? (
          <QRDisplay
            data={user.qr_code_data}
            size={size}
            showControls={true}
            showInfo={false}
            filename={`user_qr_${user.id}_${user.full_name.replace(/\s/g, '_')}`}
            onDownload={onDownload}
            onShare={onShare}
          />
        ) : (
          <Alert severity="warning">{t('error')}</Alert>
        )}
      </Box>
    );
  }

  // ── Detailed variant ──────────────────────────────────────────────
  if (variant === 'detailed') {
    return (
      <Card elevation={3}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2,
                  bgcolor: user.is_admin ? 'error.main' : 'primary.main', fontSize: 40 }}>
                  {user.is_admin
                    ? <AdminPanelSettings fontSize="large" />
                    : user.full_name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>{user.full_name}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>{user.email}</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip label={user.is_admin ? t('administrator') : t('user')}
                    color={user.is_admin ? 'error' : 'primary'} size="small" />
                  <Chip label={user.is_active ? t('active') : t('inactive')}
                    color={user.is_active ? 'success' : 'default'} size="small" />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box>
                {user.department && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Business color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('department')}</Typography>
                      <Typography variant="body2">{user.department}</Typography>
                    </Box>
                  </Box>
                )}
                {user.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Phone color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('phone')}</Typography>
                      <Typography variant="body2">{user.phone}</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">{t('qrInstruction')}</Typography>
              </Alert>
            </Grid>

            <Grid item xs={12} md={7}>
              {user.qr_code_data ? (
                <>
                  <QRDisplay
                    data={user.qr_code_data}
                    title={t('yourQRCode')}
                    description={t('qrInstruction')}
                    size={size}
                    showControls={true}
                    filename={`user_qr_${user.id}_${user.full_name.replace(/\s/g, '_')}`}
                    onDownload={onDownload}
                    onShare={onShare}
                  />
                  <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<Print />} onClick={handlePrint}
                      sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
                      {isFr ? 'Imprimer carte (5×8.5cm)' : 'Print card (5×8.5cm)'}
                    </Button>
                    <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy}>
                      {copied ? t('copied') : t('copyCode')}
                    </Button>
                  </Box>
                </>
              ) : (
                <Alert severity="warning">{t('error')}</Alert>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  // ── Default variant ───────────────────────────────────────────────
  return (
    <Box>
      {showUserInfo && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: user.is_admin ? 'error.main' : '#2d6a4f' }}>
              {user.is_admin
                ? <AdminPanelSettings />
                : user.full_name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{user.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              {user.department && (
                <Typography variant="caption" color="text.secondary">{user.department}</Typography>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {user.qr_code_data ? (
        <>
          <QRDisplay
            data={user.qr_code_data}
            title={t('personalQRCode')}
            description={t('qrInstruction')}
            size={size}
            showControls={true}
            filename={`user_qr_${user.id}_${user.full_name.replace(/\s/g, '_')}`}
            onDownload={onDownload}
            onShare={onShare}
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint}
              sx={{ bgcolor: '#2d6a4f', '&:hover': { bgcolor: '#1b4332' } }}>
              {isFr ? 'Imprimer carte (5×8.5cm)' : 'Print card (5×8.5cm)'}
            </Button>
            <Button variant="outlined" startIcon={<ContentCopy />} onClick={handleCopy}>
              {copied ? t('copied') : t('copyCode')}
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{isFr ? 'Sécurité :' : 'Security:'}</strong> {t('qrSecurity')}
            </Typography>
          </Alert>
        </>
      ) : (
        <Alert severity="warning">{t('error')}</Alert>
      )}
    </Box>
  );
};

export default UserQR;
