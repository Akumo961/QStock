import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  Snackbar,
  useTheme,
} from '@mui/material';
import {
  Download,
  ContentCopy,
  Share,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  Print,
  QrCode2,
} from '@mui/icons-material';
import QRCode from 'qrcode';

interface QRDisplayProps {
  data: string;
  size?: number;
  title?: string;
  description?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  color?: {
    dark?: string;
    light?: string;
  };
  showControls?: boolean;
  showInfo?: boolean;
  filename?: string;
  className?: string;
  onDownload?: () => void;
  onShare?: () => void;
}

const QRDisplay: React.FC<QRDisplayProps> = ({
  data,
  size = 256,
  title,
  description,
  level = 'H',
  includeMargin = true,
  color = { dark: '#000000', light: '#FFFFFF' },
  showControls = true,
  showInfo = true,
  filename = 'qr-code',
  className,
  onDownload,
  onShare,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [currentSize, setCurrentSize] = useState(size);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [error, setError] = useState<string>('');

  // Generate QR code
  useEffect(() => {
    generateQRCode();
  }, [data, currentSize, level, color]);

  const generateQRCode = async () => {
    try {
      setError('');

      if (!data) {
        setError('No data provided for QR code');
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      await QRCode.toCanvas(canvas, data, {
        errorCorrectionLevel: level,
        width: currentSize,
        margin: includeMargin ? 4 : 0,
        color: {
          dark: color.dark || '#000000',
          light: color.light || '#FFFFFF',
        },
      });

      // Generate data URL for download
      const dataUrl = canvas.toDataURL('image/png');
      setQrDataUrl(dataUrl);
    } catch (err: any) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    }
  };

  // Download QR code
  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onDownload) {
      onDownload();
    }
  };

  // Copy QR code image to clipboard
  const handleCopyImage = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setShowCopied(true);
        } catch (err) {
          console.error('Failed to copy image:', err);
          // Fallback: try copying the data URL
          handleCopyData();
        }
      });
    } catch (err) {
      console.error('Error copying image:', err);
    }
  };

  // Copy QR code data to clipboard
  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(data);
      setShowCopied(true);
    } catch (err) {
      console.error('Failed to copy data:', err);
    }
  };

  // Share QR code
  const handleShare = async () => {
    try {
      if (navigator.share && qrDataUrl) {
        // Convert data URL to blob
        const response = await fetch(qrDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });

        await navigator.share({
          title: title || 'QR Code',
          text: description || 'Scan this QR code',
          files: [file],
        });

        if (onShare) {
          onShare();
        }
      } else {
        // Fallback: download the image
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  // Print QR code — item name appears BELOW the QR image
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=700,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || 'QR Code'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: white;
              padding: 32px 24px;
              text-align: center;
              color: #1a1a1a;
            }

            /* Org header */
            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              margin-bottom: 28px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1b4332;
            }
            .header img {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: contain;
              border: 2px solid #1b4332;
            }
            .header-text h1 {
              font-size: 16px;
              font-weight: 800;
              color: #1b4332;
              text-align: left;
            }
            .header-text p {
              font-size: 11px;
              color: #52b788;
              text-align: left;
            }

            /* QR Code box */
            .qr-container {
              margin: 24px auto;
              display: inline-block;
              padding: 16px;
              border: 2px solid #e8f5e9;
              border-radius: 16px;
              background: #f9fffe;
            }
            .qr-container img {
              display: block;
              width: 260px;
              height: 260px;
              object-fit: contain;
            }

            /* Item name BELOW QR */
            .item-name {
              font-size: 26px;
              font-weight: 800;
              color: #1b4332;
              margin-top: 16px;
              margin-bottom: 6px;
              letter-spacing: -0.5px;
            }
            .item-code {
              font-size: 14px;
              color: #555;
              font-family: monospace;
              background: #f0f0f0;
              display: inline-block;
              padding: 3px 12px;
              border-radius: 4px;
              margin-bottom: 4px;
            }
            .item-meta {
              font-size: 13px;
              color: #777;
              margin: 3px 0;
            }

            /* Footer */
            .footer {
              margin-top: 28px;
              padding-top: 16px;
              border-top: 1px solid #e0e0e0;
              font-size: 11px;
              color: #aaa;
            }

            @media print {
              body { padding: 16px; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <!-- Org header -->
          <div class="header">
            <img src="${window.location.origin}/logo.png" alt="Logo" onerror="this.style.display='none'" />
            <div class="header-text">
              <h1>Scouts Musulmans de Montréal</h1>
              <p>Système d'inventaire QR</p>
            </div>
          </div>

          <!-- QR Code image -->
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" />
          </div>

          <!-- Item name BELOW the QR code -->
          ${title ? `<div class="item-name">${title}</div>` : ''}
          ${description ? `<div class="item-code">${description}</div>` : ''}

          <!-- Footer -->
          <div class="footer">
            Généré le ${new Date().toLocaleString('fr-CA')} &nbsp;•&nbsp; Scouts Musulmans de Montréal
          </div>

          <script>
            window.onload = () => setTimeout(() => { window.print(); window.close(); }, 400);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Zoom controls
  const handleZoomIn = () => {
    setCurrentSize((prev) => Math.min(prev + 64, 512));
  };

  const handleZoomOut = () => {
    setCurrentSize((prev) => Math.max(prev - 64, 128));
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      <Card className={className} elevation={3}>
        <CardContent>
          {/* Title and Description */}
          {showInfo && (title || description) && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              {title && (
                <Typography variant="h6" component="h2" gutterBottom>
                  {title}
                </Typography>
              )}
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* QR Code Display */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: currentSize,
              backgroundColor: color.light,
              borderRadius: 1,
              p: 2,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                height: 'auto',
                imageRendering: 'pixelated',
              }}
            />
          </Box>

          {/* Data Preview */}
          {showInfo && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}
              >
                Data: {data.substring(0, 60)}
                {data.length > 60 && '...'}
              </Typography>
            </Box>
          )}
        </CardContent>

        {/* Controls */}
        {showControls && (
          <CardActions sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1, p: 2 }}>
            <Tooltip title="Download QR Code">
              <IconButton onClick={handleDownload} color="primary">
                <Download />
              </IconButton>
            </Tooltip>

            <Tooltip title="Copy Image">
              <IconButton onClick={handleCopyImage} color="primary">
                <ContentCopy />
              </IconButton>
            </Tooltip>

            {'share' in navigator && (
              <Tooltip title="Share">
                <IconButton onClick={handleShare} color="primary">
                  <Share />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Print">
              <IconButton onClick={handlePrint} color="primary">
                <Print />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Tooltip title="Zoom Out">
              <IconButton
                onClick={handleZoomOut}
                disabled={currentSize <= 128}
                color="primary"
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>

            <Tooltip title="Zoom In">
              <IconButton
                onClick={handleZoomIn}
                disabled={currentSize >= 512}
                color="primary"
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>

            <Tooltip title="Fullscreen">
              <IconButton onClick={handleToggleFullscreen} color="primary">
                <Fullscreen />
              </IconButton>
            </Tooltip>
          </CardActions>
        )}
      </Card>

      {/* Fullscreen Dialog */}
      {isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.modal,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
          }}
          onClick={handleToggleFullscreen}
        >
          <Box sx={{ textAlign: 'center', color: 'white', mb: 2 }}>
            {title && <Typography variant="h4">{title}</Typography>}
            {description && (
              <Typography variant="body1" sx={{ mt: 1 }}>
                {description}
              </Typography>
            )}
          </Box>

          <Paper
            sx={{ p: 4, backgroundColor: color.light }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{ maxWidth: '80vw', maxHeight: '60vh', display: 'block' }}
            />
          </Paper>

          <Button
            variant="contained"
            onClick={handleToggleFullscreen}
            sx={{ mt: 3 }}
          >
            Close
          </Button>
        </Box>
      )}

      {/* Copied Snackbar */}
      <Snackbar
        open={showCopied}
        autoHideDuration={2000}
        onClose={() => setShowCopied(false)}
        message="Copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default QRDisplay;
