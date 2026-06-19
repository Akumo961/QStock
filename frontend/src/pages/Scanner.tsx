
import React, { useState } from 'react';
import {
  Box, Container, Typography, Card, CardContent,
  Button, Alert, Tabs, Tab, Chip,
} from '@mui/material';
import { QrCodeScanner, Add, KeyboardReturn } from '@mui/icons-material';
import QRScanner from '../components/common/QRScanner';
import BorrowProcess from '../components/borrow/BorrowProcess';
import ReturnProcess from '../components/return/ReturnProcess';
import { useLanguage } from '../context/LanguageContext';

type ScanMode = 'scan' | 'borrow' | 'return';

const Scanner: React.FC = () => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<ScanMode>('scan');
  const [scannedData, setScannedData] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScanner, setShowScanner] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const handleScan = (decodedText: string) => {
    setScannedData(decodedText);
    setError('');
    setShowScanner(false);

    const parts = decodedText.split(':');
    if (parts.length < 2) {
      setError(language === 'fr' ? 'Format de code QR invalide' : 'Invalid QR code format');
      setShowScanner(true);
      return;
    }

    const type = parts[0].toLowerCase();
    if (type === 'user') {
      setMode('scan');
    } else if (type === 'item') {
      setMode('borrow');
    } else {
      setError(language === 'fr' ? 'Type de code QR non reconnu' : 'Unrecognized QR code type');
      setShowScanner(true);
    }
  };

  const handleBorrowComplete = (transaction: any) => {
    setSuccess(
      language === 'fr'
        ? `Article emprunté avec succès ! Transaction #${transaction.id}`
        : `Successfully borrowed item! Transaction ID: ${transaction.id}`
    );
    setTimeout(() => {
      setShowScanner(true);
      setMode('scan');
      setScannedData('');
      setSuccess('');
    }, 3000);
  };

  const handleReturnComplete = () => {
    setSuccess(language === 'fr' ? 'Article retourné avec succès !' : 'Item returned successfully!');
    setTimeout(() => {
      setShowScanner(true);
      setMode('scan');
      setScannedData('');
      setSuccess('');
    }, 3000);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError('');
    setSuccess('');
    setShowScanner(newValue === 0);
    if (newValue === 0) setMode('scan');
    else if (newValue === 1) setMode('borrow');
    else setMode('return');
  };

  const resetScanner = () => {
    setShowScanner(true);
    setMode('scan');
    setScannedData('');
    setError('');
    setSuccess('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <QrCodeScanner sx={{ fontSize: 64, color: '#2d6a4f', mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1b4332' }}>
          {t('scanTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('scanSubtitle')}
        </Typography>
      </Box>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>{success}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}

      {/* Mode Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" indicatorColor="primary">
          <Tab icon={<QrCodeScanner />} label={t('scanner')} iconPosition="start" />
          <Tab icon={<Add />} label={language === 'fr' ? 'Emprunter' : 'Borrow'} iconPosition="start" />
          <Tab icon={<KeyboardReturn />} label={language === 'fr' ? 'Retourner' : 'Return'} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Scanner Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            {showScanner ? (
              <>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                  {language === 'fr'
                    ? 'Positionnez le code QR dans le champ de la caméra'
                    : 'Position QR code within the camera view'}
                </Typography>
                <QRScanner
                  onScanSuccess={handleScan}
                  onScanError={(err) => setError(err)}
                  height={400}
                />
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {language === 'fr' ? 'Comment utiliser :' : 'How to use:'}
                  </Typography>
                  <Typography variant="body2" component="div">
                    {language === 'fr' ? (
                      <>
                        1. Scannez d'abord votre code QR utilisateur<br />
                        2. Puis scannez le code QR de l'article<br />
                        3. Suivez les instructions pour compléter la transaction
                      </>
                    ) : (
                      <>
                        1. Scan your user QR code first<br />
                        2. Then scan the item QR code<br />
                        3. Follow the prompts to complete the transaction
                      </>
                    )}
                  </Typography>
                </Alert>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {language === 'fr' ? 'Code QR scanné !' : 'QR Code Scanned!'}
                </Typography>
                <Chip label={scannedData} sx={{ mb: 3 }} />
                <Box>
                  <Button variant="contained" onClick={resetScanner} sx={{ mr: 2, bgcolor: '#2d6a4f' }}>
                    {language === 'fr' ? 'Scanner à nouveau' : 'Scan Again'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Borrow Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1b4332' }}>
              {language === 'fr' ? 'Emprunter un article' : 'Borrow an Item'}
            </Typography>
            <BorrowProcess onComplete={handleBorrowComplete} onCancel={resetScanner} />
          </CardContent>
        </Card>
      )}

      {/* Return Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1b4332' }}>
              {language === 'fr' ? 'Retourner un article' : 'Return an Item'}
            </Typography>
            <ReturnProcess onComplete={handleReturnComplete} onCancel={resetScanner} />
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Scanner;
