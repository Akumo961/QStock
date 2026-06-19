import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Chip,
  Box,
  Button,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Person,
  AdminPanelSettings,
  Email,
  Phone,
  Business,
  Badge,
  QrCode2,
  Edit,
  Block,
  CheckCircle,
  MoreVert,
} from '@mui/icons-material';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
  created_at: string;
}

interface UserCardProps {
  user: User;
  variant?: 'default' | 'compact' | 'detailed';
  onViewQR?: (user: User) => void;
  onEdit?: (user: User) => void;
  onToggleActive?: (user: User) => void;
  onViewProfile?: (user: User) => void;
  showActions?: boolean;
  elevation?: number;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  variant = 'default',
  onViewQR,
  onEdit,
  onToggleActive,
  onViewProfile,
  showActions = true,
  elevation = 2,
}) => {
  // Compact variant
  if (variant === 'compact') {
    return (
      <Card elevation={elevation} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: user.is_admin ? 'error.main' : 'primary.main',
              }}
            >
              {user.is_admin ? <AdminPanelSettings /> : <Person />}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                {user.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
            {showActions && (
              <IconButton size="small" onClick={() => onViewProfile?.(user)}>
                <MoreVert />
              </IconButton>
            )}
          </Box>
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
            <Chip
              label={user.is_admin ? 'Admin' : 'User'}
              size="small"
              color={user.is_admin ? 'error' : 'default'}
            />
            <Chip
              label={user.is_active ? 'Active' : 'Inactive'}
              size="small"
              color={user.is_active ? 'success' : 'default'}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <Card elevation={elevation} sx={{ height: '100%' }}>
        <CardContent sx={{ textAlign: 'center', pt: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              bgcolor: user.is_admin ? 'error.main' : 'primary.main',
              fontSize: 32,
            }}
          >
            {user.is_admin ? (
              <AdminPanelSettings fontSize="large" />
            ) : (
              user.full_name.charAt(0).toUpperCase()
            )}
          </Avatar>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {user.full_name}
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {user.email}
          </Typography>

          <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Chip
              label={user.is_admin ? 'Administrator' : 'User'}
              color={user.is_admin ? 'error' : 'primary'}
              size="small"
            />
            <Chip
              label={user.is_active ? 'Active' : 'Inactive'}
              color={user.is_active ? 'success' : 'default'}
              size="small"
              icon={user.is_active ? <CheckCircle /> : <Block />}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'left' }}>
            {user.department && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Business fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {user.department}
                </Typography>
              </Box>
            )}
            {user.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {user.phone}
                </Typography>
              </Box>
            )}
            {user.employee_id && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Badge fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  ID: {user.employee_id}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Member since {new Date(user.created_at).toLocaleDateString()}
          </Typography>
        </CardContent>

        {showActions && (
          <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              size="small"
              startIcon={<QrCode2 />}
              onClick={() => onViewQR?.(user)}
            >
              QR Code
            </Button>
            {onEdit && (
              <Button size="small" startIcon={<Edit />} onClick={() => onEdit(user)}>
                Edit
              </Button>
            )}
          </CardActions>
        )}
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      elevation={elevation}
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: user.is_admin ? 'error.main' : 'primary.main',
            }}
          >
            {user.is_admin ? (
              <AdminPanelSettings />
            ) : (
              user.full_name.charAt(0).toUpperCase()
            )}
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {user.full_name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              <Chip
                label={user.is_admin ? 'Admin' : 'User'}
                size="small"
                color={user.is_admin ? 'error' : 'default'}
              />
              <Chip
                label={user.is_active ? 'Active' : 'Inactive'}
                size="small"
                color={user.is_active ? 'success' : 'default'}
                icon={user.is_active ? <CheckCircle /> : <Block />}
              />
            </Box>

            {(user.department || user.phone || user.employee_id) && (
              <Box sx={{ mt: 1 }}>
                {user.department && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Business sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {user.department}
                    </Typography>
                  </Box>
                )}
                {user.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {user.phone}
                    </Typography>
                  </Box>
                )}
                {user.employee_id && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Badge sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      ID: {user.employee_id}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>

      {showActions && (
        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
          {onViewQR && (
            <Tooltip title="View QR Code">
              <IconButton size="small" onClick={() => onViewQR(user)}>
                <QrCode2 />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="Edit User">
              <IconButton size="small" onClick={() => onEdit(user)}>
                <Edit />
              </IconButton>
            </Tooltip>
          )}
          {onToggleActive && (
            <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
              <IconButton
                size="small"
                onClick={() => onToggleActive(user)}
                color={user.is_active ? 'error' : 'success'}
              >
                {user.is_active ? <Block /> : <CheckCircle />}
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default UserCard;