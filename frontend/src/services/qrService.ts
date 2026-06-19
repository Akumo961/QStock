/**
 * QR Code Service
 * Handles QR code generation, validation, and parsing
 */

import QRCode from 'qrcode';

interface QRCodeOptions {
  width?: number;
  height?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

interface ParsedQRData {
  valid: boolean;
  type: 'user' | 'item' | 'unknown';
  id?: number;
  rawData: string;
  email?: string;
  code?: string;
}

interface QRGenerationResult {
  dataUrl: string;
  rawData: string;
  svg?: string;
}

class QRService {
  private readonly DEFAULT_OPTIONS: QRCodeOptions = {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  /**
   * Generate QR code for user
   */
  async generateUserQR(
    userId: number,
    email: string,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    const data = `USER:${userId}:${email}`;
    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code for item
   */
  async generateItemQR(
    itemId: number,
    itemCode: string,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    const data = `ITEM:${itemId}:${itemCode}`;
    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code from raw data
   */
  async generateQRCode(
    data: string,
    options?: QRCodeOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Generate data URL
      const dataUrl = await QRCode.toDataURL(data, opts);

      // Generate SVG (optional)
      const svg = await QRCode.toString(data, {
        type: 'svg',
        ...opts
      });

      return {
        dataUrl,
        rawData: data,
        svg,
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Generate QR code as canvas
   */
  async generateQRCanvas(
    canvas: HTMLCanvasElement,
    data: string,
    options?: QRCodeOptions
  ): Promise<void> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      await QRCode.toCanvas(canvas, data, opts);
    } catch (error) {
      throw new Error(`Failed to generate QR canvas: ${error}`);
    }
  }

  /**
   * Parse QR code data
   */
  parseQRData(qrData: string): ParsedQRData {
    const result: ParsedQRData = {
      valid: false,
      type: 'unknown',
      rawData: qrData,
    };

    try {
      const parts = qrData.split(':');

      if (parts.length < 2) {
        return result;
      }

      const type = parts[0].toUpperCase();

      if (type === 'USER') {
        if (parts.length >= 3) {
          const id = parseInt(parts[1]);
          const email = parts[2];

          if (!isNaN(id) && this.isValidEmail(email)) {
            result.valid = true;
            result.type = 'user';
            result.id = id;
            result.email = email;
          }
        }
      } else if (type === 'ITEM') {
        if (parts.length >= 3) {
          const id = parseInt(parts[1]);
          const code = parts[2];

          if (!isNaN(id) && code) {
            result.valid = true;
            result.type = 'item';
            result.id = id;
            result.code = code;
          }
        }
      }

      return result;
    } catch (error) {
      return result;
    }
  }

  /**
   * Validate QR code data
   */
  validateQRData(qrData: string): boolean {
    const parsed = this.parseQRData(qrData);
    return parsed.valid;
  }

  /**
   * Extract ID from QR data
   */
  extractId(qrData: string): number | null {
    const parsed = this.parseQRData(qrData);
    return parsed.id || null;
  }

  /**
   * Extract type from QR data
   */
  extractType(qrData: string): 'user' | 'item' | 'unknown' {
    const parsed = this.parseQRData(qrData);
    return parsed.type;
  }

  /**
   * Download QR code as image
   */
  async downloadQRCode(
    data: string,
    filename: string,
    options?: QRCodeOptions
  ): Promise<void> {
    try {
      const result = await this.generateQRCode(data, options);

      // Convert data URL to blob
      const response = await fetch(result.dataUrl);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download QR code: ${error}`);
    }
  }

  /**
   * Print QR code
   */
  async printQRCode(
    data: string,
    title?: string,
    description?: string,
    options?: QRCodeOptions
  ): Promise<void> {
    try {
      const result = await this.generateQRCode(data, options);

      const printWindow = window.open('', '', 'width=600,height=800');

      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${title || 'QR Code'}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                text-align: center;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              p {
                font-size: 14px;
                color: #666;
                margin-bottom: 20px;
              }
              .qr-container {
                margin: 30px auto;
                max-width: 400px;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            ${title ? `<h1>${title}</h1>` : ''}
            ${description ? `<p>${description}</p>` : ''}
            <div class="qr-container">
              <img src="${result.dataUrl}" alt="QR Code" />
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              Generated on ${new Date().toLocaleString()}
            </p>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error) {
      throw new Error(`Failed to print QR code: ${error}`);
    }
  }

  /**
   * Share QR code via Web Share API
   */
  async shareQRCode(
    data: string,
    title?: string,
    filename?: string,
    options?: QRCodeOptions
  ): Promise<void> {
    if (!navigator.share) {
      throw new Error('Web Share API is not supported in this browser');
    }

    try {
      const result = await this.generateQRCode(data, options);

      // Convert data URL to blob
      const response = await fetch(result.dataUrl);
      const blob = await response.blob();

      // Create file
      const file = new File([blob], `${filename || 'qr-code'}.png`, {
        type: 'image/png',
      });

      // Share
      await navigator.share({
        title: title || 'QR Code',
        files: [file],
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        throw new Error(`Failed to share QR code: ${error}`);
      }
    }
  }

  /**
   * Copy QR code to clipboard
   */
  async copyQRToClipboard(data: string, options?: QRCodeOptions): Promise<void> {
    try {
      const result = await this.generateQRCode(data, options);

      // Convert data URL to blob
      const response = await fetch(result.dataUrl);
      const blob = await response.blob();

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
    } catch (error) {
      // Fallback: copy raw data
      try {
        await navigator.clipboard.writeText(data);
      } catch {
        throw new Error('Failed to copy QR code to clipboard');
      }
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get QR code info
   */
  getQRInfo(qrData: string): {
    type: string;
    id: number | null;
    additionalData: string | null;
    isValid: boolean;
  } {
    const parsed = this.parseQRData(qrData);

    return {
      type: parsed.type,
      id: parsed.id || null,
      additionalData: parsed.email || parsed.code || null,
      isValid: parsed.valid,
    };
  }

  /**
   * Format QR data for display
   */
  formatQRData(qrData: string): string {
    const parsed = this.parseQRData(qrData);

    if (!parsed.valid) {
      return 'Invalid QR Code';
    }

    if (parsed.type === 'user') {
      return `User: ${parsed.email} (ID: ${parsed.id})`;
    } else if (parsed.type === 'item') {
      return `Item: ${parsed.code} (ID: ${parsed.id})`;
    }

    return qrData;
  }

  /**
   * Batch generate QR codes
   */
  async batchGenerateQR(
    items: Array<{ data: string; filename: string }>,
    options?: QRCodeOptions
  ): Promise<Array<{ filename: string; dataUrl: string }>> {
    const results = [];

    for (const item of items) {
      try {
        const result = await this.generateQRCode(item.data, options);
        results.push({
          filename: item.filename,
          dataUrl: result.dataUrl,
        });
      } catch (error) {
        console.error(`Failed to generate QR for ${item.filename}:`, error);
      }
    }

    return results;
  }

  /**
   * Get QR code size recommendation
   */
  getRecommendedSize(usage: 'print' | 'screen' | 'mobile'): number {
    switch (usage) {
      case 'print':
        return 600; // High resolution for printing
      case 'screen':
        return 300; // Standard for web display
      case 'mobile':
        return 250; // Optimized for mobile screens
      default:
        return 300;
    }
  }

  /**
   * Get error correction level recommendation
   */
  getRecommendedErrorCorrection(usage: 'damaged' | 'normal' | 'pristine'): 'L' | 'M' | 'Q' | 'H' {
    switch (usage) {
      case 'damaged':
        return 'H'; // High error correction (30%)
      case 'normal':
        return 'M'; // Medium error correction (15%)
      case 'pristine':
        return 'L'; // Low error correction (7%)
      default:
        return 'M';
    }
  }
}

// Create singleton instance
const qrService = new QRService();

// Export service instance
export default qrService;

// Export types
export type { QRCodeOptions, ParsedQRData, QRGenerationResult };