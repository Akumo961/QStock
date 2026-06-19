import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Skeleton,
  useTheme,
} from '@mui/material';
import { QrCode2 as QrCodeIcon } from '@mui/icons-material';

interface LoadingSpinnerProps {
  variant?: 'circular' | 'linear' | 'skeleton' | 'logo' | 'dots';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
  thickness?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'circular',
  size = 'medium',
  message,
  fullScreen = false,
  color = 'primary',
  thickness = 4,
}) => {
  const theme = useTheme();

  // Size mappings
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];

  // Container styles
  const containerStyles = fullScreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: theme.zIndex.modal + 1,
      }
    : {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(3),
      };

  // Circular variant
  if (variant === 'circular') {
    return (
      <Box sx={containerStyles}>
        <CircularProgress
          size={spinnerSize}
          color={color}
          thickness={thickness}
        />
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Linear variant
  if (variant === 'linear') {
    return (
      <Box sx={{ ...containerStyles, width: '100%', maxWidth: 400 }}>
        <LinearProgress
          color={color}
          sx={{ width: '100%', borderRadius: 1 }}
        />
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Skeleton variant
  if (variant === 'skeleton') {
    return (
      <Box sx={{ ...containerStyles, width: '100%' }}>
        <Skeleton variant="rectangular" width="100%" height={spinnerSize * 2} />
        <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" />
      </Box>
    );
  }

  // Logo variant (animated QR code)
  if (variant === 'logo') {
    return (
      <Box sx={containerStyles}>
        <Box
          sx={{
            position: 'relative',
            width: spinnerSize * 1.5,
            height: spinnerSize * 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Outer rotating circle */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: `3px solid ${theme.palette.primary.main}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />

          {/* QR Code Icon */}
          <QrCodeIcon
            sx={{
              fontSize: spinnerSize,
              color: theme.palette.primary.main,
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.7, transform: 'scale(0.95)' },
              },
            }}
          />
        </Box>

        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3, textAlign: 'center', fontWeight: 500 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Dots variant (three bouncing dots)
  if (variant === 'dots') {
    const dotSize = spinnerSize / 4;

    return (
      <Box sx={containerStyles}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: theme.palette.primary.main,
                animation: 'bounce 1.4s ease-in-out infinite',
                animationDelay: `${index * 0.16}s`,
                '@keyframes bounce': {
                  '0%, 80%, 100%': {
                    transform: 'scale(0)',
                    opacity: 0.5,
                  },
                  '40%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                },
              }}
            />
          ))}
        </Box>

        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Default fallback
  return (
    <Box sx={containerStyles}>
      <CircularProgress size={spinnerSize} color={color} />
    </Box>
  );
};

// Named export variants for convenience
export const CircularLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="circular" />
);

export const LinearLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="linear" />
);

export const SkeletonLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="skeleton" />
);

export const LogoLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="logo" />
);

export const DotsLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="dots" />
);

// Fullscreen loading component
export const FullScreenLoader: React.FC<{
  message?: string;
  variant?: LoadingSpinnerProps['variant'];
}> = ({ message = 'Loading...', variant = 'logo' }) => (
  <LoadingSpinner variant={variant} message={message} fullScreen size="large" />
);

// Inline loading component
export const InlineLoader: React.FC<{
  message?: string;
  size?: LoadingSpinnerProps['size'];
}> = ({ message, size = 'small' }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
    <CircularProgress size={size === 'small' ? 16 : 24} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

// Card loading skeleton
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <Box sx={{ width: '100%' }}>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={200} />
        <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
        <Skeleton variant="text" width="60%" />
      </Box>
    ))}
  </Box>
);

// Table loading skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box sx={{ width: '100%' }}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="rectangular"
            width={`${100 / columns}%`}
            height={40}
          />
        ))}
      </Box>
    ))}
  </Box>
);

export default LoadingSpinner;