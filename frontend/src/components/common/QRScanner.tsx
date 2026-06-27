import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  CameraAlt,
  Close,
  FlipCameraAndroid,
  FlashlightOn,
  FlashlightOff,
  CheckCircle,
} from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useLanguage } from '../../context/LanguageContext';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onScanError?: (error: string) => void;
  width?: number | string;
  height?: number | string;
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
}

interface CameraDevice {
  id: string;
  label: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  width = '100%',
  height = 400,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  disableFlip = false,
  verbose = false,
}) => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerId = 'qr-scanner-container';

  // Initialize scanner
  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerId);
    }

    return () => {
      stopScanning();
    };
  }, []);

  // Check if camera API is available (requires HTTPS on mobile)
  const isCameraAvailable =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.isSecureContext;

  // Get available cameras
  const loadCameras = async () => {
    if (!window.isSecureContext) {
      setError(
        fr
          ? 'Contexte non sécurisé. HTTPS requis pour accéder à la caméra.'
          : 'Insecure context. HTTPS is required for camera access.'
      );
      return false;
    }

    if (!navigator.mediaDevices) {
      setError(
        fr
          ? 'navigator.mediaDevices est indisponible.'
          : 'navigator.mediaDevices is unavailable.'
      );
      return false;
    }

    try {
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        setError(
          fr
            ? 'Aucune caméra détectée.'
            : 'No camera detected.'
        );
        return false;
      }

      const cameraDevices: CameraDevice[] = devices.map((device) => ({
        id: device.id,
        label: device.label || `Camera ${device.id}`,
      }));

      setCameras(cameraDevices);

      const rearCamera = cameraDevices.find(
        (camera) =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
      );

      const chosen = rearCamera?.id || cameraDevices[0].id;
      setSelectedCamera(chosen);
      return chosen;
    } catch (err: any) {
      setHasPermission(false);
      if (err?.name === 'NotAllowedError') {
        setError(
          fr
            ? "Accès à la caméra refusé. Cliquez sur l'icône de caméra/cadenas dans la barre d'adresse de votre navigateur pour autoriser l'accès, puis réessayez — ou utilisez l'option « Scanner une image » ci-dessous."
            : "Camera access was blocked. Click the camera/lock icon in your browser's address bar to allow access, then try again — or use \"Scan Image File\" below instead."
        );
      } else if (err?.name === 'NotFoundError') {
        setError(fr ? 'Aucune caméra trouvée sur cet appareil.' : 'No camera found on this device.');
      } else if (err?.name === 'NotReadableError') {
        setError(
          fr
            ? 'La caméra est déjà utilisée par une autre application ou un autre onglet.'
            : 'The camera is already in use by another app or browser tab.'
        );
      } else {
        setError(`${err?.name || 'Camera Error'}: ${err?.message || 'Unable to access the camera.'}`);
      }
      return false;
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
        },
      });

      stream.getTracks().forEach((track) => track.stop());

      setHasPermission(true);
      setError('');

      return true;
    } catch (err: any) {
      setHasPermission(false);

      if (err?.name === 'NotAllowedError') {
        setError(
          fr
            ? "Accès à la caméra refusé. Cliquez sur l'icône de caméra/cadenas dans la barre d'adresse de votre navigateur pour autoriser l'accès, puis cliquez sur « Démarrer le scan » à nouveau — ou utilisez « Scanner une image » ci-dessous."
            : "Camera access was blocked. Click the camera/lock icon in your browser's address bar to allow access, then click \"Start Scanning\" again — or use \"Scan Image File\" below instead."
        );
      } else if (err?.name === 'NotReadableError') {
        setError(
          fr
            ? 'La caméra est déjà utilisée par une autre application ou un autre onglet.'
            : 'The camera is already in use by another app or browser tab.'
        );
      } else {
        setError(`${err?.name || 'Permission Error'}: ${err?.message || 'Unable to access the camera.'}`);
      }

      return false;
    }
  };

  // Start scanning
  const startScanning = async (cameraId?: string) => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    // Check if already scanning
    if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      return;
    }

    setError('');

    // Enumerate cameras lazily, on this user gesture, the first time the
    // user clicks Start — this is what the browser's permission prompt is
    // tied to, so doing it here (rather than automatically on page load)
    // is what makes the prompt actually appear and succeed reliably.
    let cameraToUse: string | false | undefined = cameraId || selectedCamera;
    if (!cameraToUse) {
      cameraToUse = await loadCameras();
      if (!cameraToUse) return; // loadCameras already set a helpful error
    }

    // Confirm permission (separate from enumeration — some browsers grant
    // device listing but still need an explicit getUserMedia confirmation).
    const hasAccess = await requestCameraPermission();
    if (!hasAccess) return;

    try {
      setIsScanning(true);

      await scanner.start(
        cameraToUse,
        {
          fps,
          qrbox,
          aspectRatio,
          disableFlip,
        },
        (decodedText, decodedResult) => {
          // Success callback
          if (verbose) {
            console.log('QR Code scanned:', decodedText);
          }

          setScanSuccess(true);
          onScanSuccess(decodedText, decodedResult);

          // Show success for 1 second then continue scanning
          setTimeout(() => {
            setScanSuccess(false);
          }, 1000);
        },
        (errorMessage) => {
          // Error callback (called frequently, so we don't show all errors)
          if (verbose) {
            console.log('Scan error:', errorMessage);
          }
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      if (err?.name === 'NotAllowedError') {
        setError(
          fr
            ? "Accès à la caméra refusé. Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur, puis réessayez."
            : 'Camera access was blocked. Please allow camera access in your browser settings, then try again.'
        );
      } else {
        setError(`${err?.name || 'Scanner Error'}: ${err?.message || 'Unable to start the camera.'}`);
      }

      if (onScanError) {
        onScanError(err?.message || String(err));
      }
    }
  };

  // Stop scanning
  const stopScanning = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
        setIsScanning(false);
        setTorchEnabled(false);
      }
    } catch (err: any) {
      console.error('Error stopping scanner:', err);
    }
  };

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !isScanning) return;

    try {
      // Access the video track
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any],
        });
        setTorchEnabled(!torchEnabled);
      } else {
        setError(fr ? 'Lampe torche non supportée sur cet appareil' : 'Torch/flashlight not supported on this device');
      }
    } catch (err: any) {
      console.error('Error toggling torch:', err);
      setError(fr ? 'Échec de la lampe torche' : 'Failed to toggle flashlight');
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (cameras.length < 2) return;

    const currentIndex = cameras.findIndex((cam) => cam.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    await stopScanning();
    setSelectedCamera(nextCamera.id);
    await startScanning(nextCamera.id);
  };

  // Handle camera selection from dialog
  const handleCameraSelect = async (cameraId: string) => {
    setShowCameraDialog(false);
    await stopScanning();
    setSelectedCamera(cameraId);
    await startScanning(cameraId);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Permission Request */}
      {hasPermission === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {fr ? 'Permission caméra requise. Veuillez autoriser l\'accès et réessayer.' : 'Camera permission is required. Please allow camera access and try again.'}
          <Button
            size="small"
            onClick={requestCameraPermission}
            sx={{ ml: 2 }}
          >
            {fr ? 'Accorder la permission' : 'Grant Permission'}
          </Button>
        </Alert>
      )}

      {/* Scanner Container */}
      <Paper
        elevation={3}
        sx={{
          width,
          height,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 2,
          backgroundColor: '#000',
        }}
      >
        <div id={scannerId} ref={scannerDivRef} style={{ width: '100%', height: '100%' }} />

        {/* Success Overlay */}
        {scanSuccess && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(76, 175, 80, 0.9)',
              zIndex: 1000,
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CheckCircle sx={{ fontSize: 80, mb: 1 }} />
              <Typography variant="h6">{fr ? 'Code QR scanné !' : 'QR Code Scanned!'}</Typography>
            </Box>
          </Box>
        )}

        {/* Camera Controls Overlay */}
        {isScanning && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              p: 2,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            }}
          >
            {/* Flip Camera */}
            {cameras.length > 1 && !disableFlip && (
              <IconButton
                onClick={switchCamera}
                sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <FlipCameraAndroid />
              </IconButton>
            )}

            {/* Torch Toggle */}
            <IconButton
              onClick={toggleTorch}
              sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              {torchEnabled ? <FlashlightOn /> : <FlashlightOff />}
            </IconButton>

            {/* Camera Selection */}
            {cameras.length > 1 && (
              <IconButton
                onClick={() => setShowCameraDialog(true)}
                sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <CameraAlt />
              </IconButton>
            )}
          </Box>
        )}

        {/* Not Scanning State */}
        {!isScanning && !error && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'white',
            }}
          >
            <CameraAlt sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {fr ? 'Caméra prête' : 'Camera Ready'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {fr ? 'Cliquez sur le bouton ci-dessous pour commencer' : 'Click the button below to start scanning'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Control Buttons */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isScanning ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<CameraAlt />}
            onClick={() => startScanning()}
            disabled={!isCameraAvailable}
            sx={{ minWidth: 200 }}
          >
            {fr ? 'Démarrer le scan' : 'Start Scanning'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="large"
            startIcon={<Close />}
            onClick={stopScanning}
            color="error"
            sx={{ minWidth: 200 }}
          >
            {fr ? 'Arrêter le scan' : 'Stop Scanning'}
          </Button>
        )}

        {/* File upload fallback — works even without camera permission */}
        <Button
          variant={error ? 'contained' : 'outlined'}
          color={error ? 'primary' : 'inherit'}
          size="large"
          component="label"
          sx={{ minWidth: 200 }}
        >
          {fr ? '📷 Scanner une image' : '📷 Scan Image File'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !scannerRef.current) return;
              try {
                const result = await scannerRef.current.scanFile(file, true);
                setError('');
                onScanSuccess(result, null);
              } catch {
                setError(fr ? 'Impossible de lire le QR code dans cette image.' : 'Could not read QR code from this image.');
              }
              e.target.value = '';
            }}
          />
        </Button>
      </Box>

      {/* Camera Selection Dialog */}
      <Dialog open={showCameraDialog} onClose={() => setShowCameraDialog(false)}>
        <DialogTitle>{fr ? 'Sélectionner une caméra' : 'Select Camera'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{fr ? 'Caméra' : 'Camera'}</InputLabel>
            <Select
              value={selectedCamera}
              label={fr ? "Caméra" : "Camera"}
              onChange={(e) => setSelectedCamera(e.target.value)}
            >
              {cameras.map((camera) => (
                <MenuItem key={camera.id} value={camera.id}>
                  {camera.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCameraDialog(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
          <Button
            onClick={() => handleCameraSelect(selectedCamera)}
            variant="contained"
          >
            {fr ? 'Sélectionner' : 'Select'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Helper Text */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 1 }}
      >
        {fr ? 'Positionnez le code QR dans le champ de la caméra pour scanner' : 'Position the QR code within the camera view to scan'}
      </Typography>
    </Box>
  );
};

export default QRScanner;