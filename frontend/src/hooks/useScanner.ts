/**
 * useScanner Hook
 * Manages QR code scanning with camera controls and error handling
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import qrService, { ParsedQRData } from '../services/qrService';

interface UseScannerOptions {
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
  onScanSuccess?: (decodedText: string, result: any) => void;
  onScanError?: (error: string) => void;
  autoStart?: boolean;
}

interface CameraDevice {
  id: string;
  label: string;
}

interface UseScannerReturn {
  isScanning: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  error: string | null;
  cameras: CameraDevice[];
  currentCamera: string | null;
  lastScan: ParsedQRData | null;
  scanCount: number;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  pauseScanning: () => void;
  resumeScanning: () => void;
  switchCamera: (cameraId: string) => Promise<void>;
  clearError: () => void;
  clearLastScan: () => void;
}

/**
 * useScanner Hook
 */
export const useScanner = (
  elementId: string,
  options: UseScannerOptions = {}
): UseScannerReturn => {
  const {
    fps = 10,
    qrbox = 250,
    aspectRatio = 1.0,
    disableFlip = false,
    verbose = false,
    onScanSuccess,
    onScanError,
    autoStart = false,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ParsedQRData | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Get available cameras
   */
  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      const cameraDevices: CameraDevice[] = devices.map((device) => ({
        id: device.id,
        label: device.label || `Camera ${device.id}`,
      }));
      setCameras(cameraDevices);

      // Auto-select rear camera if available
      const rearCamera = cameraDevices.find(
        (cam) => cam.label.toLowerCase().includes('back') || cam.label.toLowerCase().includes('rear')
      );

      if (rearCamera) {
        setCurrentCamera(rearCamera.id);
      } else if (cameraDevices.length > 0) {
        setCurrentCamera(cameraDevices[0].id);
      }

      setHasPermission(true);
      return cameraDevices;
    } catch (err: any) {
      setError('Failed to access camera. Please grant camera permissions.');
      setHasPermission(false);
      if (onScanError) {
        onScanError(err.message || 'Camera access denied');
      }
      return [];
    }
  }, [onScanError]);

  /**
   * Handle successful scan
   */
  const handleScanSuccess = useCallback(
    (decodedText: string, result: any) => {
      if (isPaused) return;

      // Parse QR data
      const parsed = qrService.parseQRData(decodedText);
      setLastScan(parsed);
      setScanCount((prev) => prev + 1);

      if (onScanSuccess) {
        onScanSuccess(decodedText, result);
      }
    },
    [isPaused, onScanSuccess]
  );

  /**
   * Handle scan error
   */
  const handleScanError = useCallback(
    (errorMessage: string) => {
      // Ignore common scanning errors (not actual errors)
      if (
        errorMessage.includes('No MultiFormat Readers') ||
        errorMessage.includes('NotFoundException')
      ) {
        return;
      }

      if (verbose) {
        console.warn('Scan error:', errorMessage);
      }
    },
    [verbose]
  );

  /**
   * Start scanning
   */
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setError(null);

    try {
      // Get cameras if not already loaded
      let availableCameras = cameras;
      if (availableCameras.length === 0) {
        availableCameras = await getCameras();
      }

      if (availableCameras.length === 0) {
        throw new Error('No cameras found');
      }

      // Initialize scanner if not already done
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
        isInitializedRef.current = true;
      }

      // Start scanning with current or first camera
      const cameraId = currentCamera || availableCameras[0].id;

      await scannerRef.current.start(
        cameraId,
        {
          fps,
          qrbox,
          aspectRatio,
          disableFlip,
        },
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
      setIsPaused(false);
      setHasPermission(true);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start scanner';
      setError(errorMsg);
      setHasPermission(false);

      if (onScanError) {
        onScanError(errorMsg);
      }

      throw err;
    }
  }, [
    isScanning,
    cameras,
    getCameras,
    currentCamera,
    elementId,
    fps,
    qrbox,
    aspectRatio,
    disableFlip,
    handleScanSuccess,
    handleScanError,
    onScanError,
  ]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(async () => {
    if (!isScanning || !scannerRef.current) return;

    try {
      await scannerRef.current.stop();
      setIsScanning(false);
      setIsPaused(false);
    } catch (err: any) {
      console.error('Failed to stop scanner:', err);
    }
  }, [isScanning]);

  /**
   * Pause scanning
   */
  const pauseScanning = useCallback(() => {
    if (isScanning && scannerRef.current) {
      scannerRef.current.pause();
      setIsPaused(true);
    }
  }, [isScanning]);

  /**
   * Resume scanning
   */
  const resumeScanning = useCallback(() => {
    if (isScanning && isPaused && scannerRef.current) {
      scannerRef.current.resume();
      setIsPaused(false);
    }
  }, [isScanning, isPaused]);

  /**
   * Switch camera
   */
  const switchCamera = useCallback(
    async (cameraId: string) => {
      const wasScanning = isScanning;

      // Stop current scanning
      if (wasScanning) {
        await stopScanning();
      }

      // Update camera
      setCurrentCamera(cameraId);

      // Restart scanning with new camera
      if (wasScanning) {
        // Small delay to ensure previous camera is released
        setTimeout(() => {
          startScanning();
        }, 500);
      }
    },
    [isScanning, stopScanning, startScanning]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear last scan
   */
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  /**
   * Auto-start on mount if enabled
   */
  useEffect(() => {
    if (autoStart) {
      startScanning();
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && isInitializedRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear();
      }
    };
  }, [autoStart, startScanning]);

  return {
    isScanning,
    isPaused,
    hasPermission,
    error,
    cameras,
    currentCamera,
    lastScan,
    scanCount,
    startScanning,
    stopScanning,
    pauseScanning,
    resumeScanning,
    switchCamera,
    clearError,
    clearLastScan,
  };
};

/**
 * useQRParser Hook
 * Just for parsing QR data without camera
 */
export const useQRParser = () => {
  const parseQR = useCallback((qrData: string): ParsedQRData => {
    return qrService.parseQRData(qrData);
  }, []);

  const validateQR = useCallback((qrData: string): boolean => {
    return qrService.validateQRData(qrData);
  }, []);

  const extractId = useCallback((qrData: string): number | null => {
    return qrService.extractId(qrData);
  }, []);

  const extractType = useCallback((qrData: string): 'user' | 'item' | 'unknown' => {
    return qrService.extractType(qrData);
  }, []);

  return {
    parseQR,
    validateQR,
    extractId,
    extractType,
  };
};

/**
 * useScanHistory Hook
 * Track scan history
 */
export const useScanHistory = (maxHistory = 10) => {
  const [history, setHistory] = useState<ParsedQRData[]>([]);

  const addToHistory = useCallback(
    (scan: ParsedQRData) => {
      setHistory((prev) => {
        const newHistory = [scan, ...prev].slice(0, maxHistory);
        return newHistory;
      });
    },
    [maxHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback((index: number) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
};

export default useScanner;
