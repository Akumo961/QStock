# QR Inventory System - Administrator Guide

Complete guide for system administrators.

## 📋 Table of Contents

1. [Admin Dashboard](#admin-dashboard)
2. [User Management](#user-management)
3. [Item Management](#item-management)
4. [Transaction Management](#transaction-management)
5. [QR Code Management](#qr-code-management)
6. [Reports & Analytics](#reports--analytics)
7. [System Settings](#system-settings)
8. [Notifications](#notifications)
9. [Data Export](#data-export)
10. [Backup & Recovery](#backup--recovery)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)

---

## Admin Dashboard

### Accessing Admin Panel

1. Login with admin credentials
2. Click **"Admin"** in navigation menu
3. Or navigate to `/admin/dashboard`

### Dashboard Overview

**Statistics Cards:**
- 👥 **Total Users** - All registered users
- ✅ **Active Users** - Users with active status
- 📦 **Total Items** - All inventory items
- 🟢 **Available Items** - Items ready to borrow
- 🔴 **Borrowed Items** - Currently borrowed
- ⚠️ **Overdue Items** - Past due date
- 📊 **Total Transactions** - All-time transactions
- 🔄 **Active Transactions** - Current borrows

**Quick Actions:**
- ➕ Add New User
- ➕ Add New Item
- 📊 Generate Report
- 📧 Send Notification
- ⚙️ System Settings

**Recent Activity:**
- Latest user registrations
- Recent borrows/returns
- System alerts
- User reports

**Trending Items:**
- Most borrowed items
- Most requested categories
- Low stock alerts

---

## User Management

### Viewing Users

1. Go to **Admin** > **Users**
2. View list of all users
3. See user details:
   - Full name
   - Email
   - Department
   - Active borrows
   - Status (Active/Inactive)
   - Last login

### Creating New User

1. Click **"Add User"** button
2. Fill in required fields:
   - **Email*** (must be unique)
   - **Full Name***
   - **Password*** (temporary password)
   - **Department**
   - **Phone Number**
   - **Employee ID**
3. Set user role:
   - ☑️ **Is Admin** (checkbox)
4. Click **"Create User"**
5. User receives email with credentials

### Editing User

1. Click **"Edit"** icon on user row
2. Update user information:
   - Personal details
   - Department
   - Contact information
   - Admin status
   - Active status
3. Click **"Save Changes"**

### Deactivating User

**Option 1: Soft Delete (Recommended)**
1. Edit user
2. Uncheck **"Is Active"** checkbox
3. Save changes
4. User can't login but data preserved

**Option 2: Permanent Delete**
1. Click **"Delete"** icon
2. Confirm deletion
3. ⚠️ All user data permanently removed

### User Actions

**Generate QR Code:**
- Click **"QR Code"** icon
- Download or print user QR code
- Share with user

**View User History:**
- Click user name
- See all borrowing history
- View statistics
- Check overdue items

**Reset Password:**
- Click **"Reset Password"** icon
- Generate temporary password
- Email sent to user automatically

**Export User Data:**
- Select users
- Click **"Export"** button
- Choose format (CSV/Excel)
- Download file

### User Filters

Filter users by:
- 🔍 **Search:** Name or email
- 🏢 **Department:** Specific department
- ✅ **Status:** Active/Inactive
- 👤 **Role:** Admin/Regular user
- 📊 **Active Borrows:** Has active borrows

### Bulk Actions

Select multiple users:
- ✅ **Activate** - Enable multiple accounts
- ❌ **Deactivate** - Disable multiple accounts
- 📧 **Send Email** - Bulk notification
- 📥 **Export** - Export selected users

---

## Item Management

### Viewing Items

1. Go to **Admin** > **Items**
2. View inventory list with:
   - Item name and code
   - Category
   - Status
   - Quantity (total/available)
   - Location
   - Actions

### Adding New Item

1. Click **"Add Item"** button
2. Fill in details:

**Required Fields:**
- **Item Name*** (e.g., "Dell Laptop")
- **Item Code*** (e.g., "LAPTOP-001", must be unique)
- **Category*** (dropdown selection)
- **Quantity*** (how many units)

**Optional Fields:**
- **Description** (detailed info)
- **Brand** (e.g., "Dell")
- **Model** (e.g., "Latitude 5520")
- **Serial Number**
- **Location** (e.g., "Room 101")
- **Purchase Date**
- **Purchase Price**
- **Warranty Expiry**
- **Max Borrow Days** (default: 7)
- **Image** (upload photo)
- **Tags** (comma-separated)

**Settings:**
- ☑️ **Is Borrowable** (can be borrowed)

3. Click **"Create Item"**
4. QR code automatically generated

### Editing Item

1. Click **"Edit"** icon
2. Update any field
3. Save changes

### Changing Item Status

Available statuses:
- **Available** - Ready to borrow
- **Borrowed** - Currently borrowed
- **Maintenance** - Under repair
- **Retired** - No longer available
- **Lost** - Missing/stolen

### Managing Quantity

**Increase Quantity:**
1. Edit item
2. Update quantity field
3. Save

**Decrease Quantity:**
1. Edit item
2. Lower quantity
3. ⚠️ Cannot go below borrowed quantity

### Item Images

**Upload Image:**
1. Edit item
2. Click **"Upload Image"** button
3. Select image file (max 5MB)
4. Crop/resize if needed
5. Save

**Supported formats:** JPG, PNG, WebP, GIF

### QR Code Management

**View QR Code:**
- Click **"QR Code"** icon
- Shows large QR code

**Download QR Code:**
- Click **"Download"** button
- Saves PNG file

**Print QR Code:**
- Click **"Print"** button
- Print label for item
- Include item name and code

**Regenerate QR Code:**
- Automatic on code change
- No manual regeneration needed

### Item Filters

Filter by:
- 🔍 **Search:** Name, code, or brand
- 📁 **Category:** Specific category
- 📊 **Status:** Available/Borrowed/etc.
- 📍 **Location:** Specific room/area
- ✅ **Borrowable:** Only borrowable items

### Bulk Actions

Select multiple items:
- ⚙️ **Change Status** - Update status
- 📍 **Update Location** - Move items
- 📁 **Change Category** - Recategorize
- 🚫 **Retire** - Mark as retired
- 📥 **Export** - Export item data

### Low Stock Alerts

System automatically alerts when:
- ⚠️ Available quantity below threshold
- ⚠️ All items borrowed
- ⚠️ High demand items

---

## Transaction Management

### Viewing Transactions

1. Go to **Admin** > **Transactions**
2. See all transactions with:
   - User name
   - Item name
   - Status
   - Borrowed date
   - Due date
   - Returned date (if applicable)

### Transaction Status

- **Active** - Currently borrowed
- **Returned** - Successfully returned
- **Overdue** - Past due date
- **Cancelled** - Cancelled before completion

### Transaction Details

Click transaction to see:
- Complete user information
- Complete item information
- Borrow purpose
- Condition at borrow/return
- Notes
- Timeline of events
- Any issues reported

### Manual Borrow (Admin)

1. Click **"New Borrow"** button
2. Select user (search or scan QR)
3. Select item (search or scan QR)
4. Enter details:
   - Quantity
   - Purpose
   - Duration
5. Click **"Confirm Borrow"**

### Manual Return (Admin)

1. Find active transaction
2. Click **"Process Return"** button
3. Check item condition
4. Add notes if needed
5. Confirm return

### Extending Due Date

1. Find active transaction
2. Click **"Extend"** button
3. Select new due date
4. Add reason (optional)
5. Confirm extension
6. User receives notification

### Handling Overdue Items

**Send Reminder:**
1. Select overdue transactions
2. Click **"Send Reminder"** button
3. Email sent to users

**Apply Late Fees (if configured):**
1. View overdue transaction
2. Click **"Apply Fee"** button
3. Enter fee amount
4. Add reason
5. Confirm fee

**Force Return:**
1. Click **"Force Return"** on transaction
2. Add admin notes
3. Confirm action
4. Item marked as returned
5. Issue recorded

### Transaction Filters

Filter by:
- 📅 **Date Range:** Specific period
- 👤 **User:** Specific user
- 📦 **Item:** Specific item
- 📊 **Status:** Active/Returned/Overdue
- 🏷️ **Category:** Item category

### Export Transactions

1. Apply filters (if needed)
2. Click **"Export"** button
3. Select format:
   - CSV (for Excel)
   - PDF (for printing)
   - JSON (for data analysis)
4. Download file

---

## QR Code Management

### QR Code Types

**User QR Codes:**
- Format: `USER:{id}:{email}`
- Example: `USER:1:user@example.com`
- Generated automatically on user creation
- Unique per user

**Item QR Codes:**
- Format: `ITEM:{id}:{code}`
- Example: `ITEM:1:LAPTOP-001`
- Generated automatically on item creation
- Unique per item

### Bulk QR Generation

**For All Users:**
1. Go to **Admin** > **Users**
2. Click **"Export QR Codes"**
3. Select users or "All Users"
4. Choose format:
   - Individual files (ZIP)
   - Single PDF (multiple per page)
5. Download

**For All Items:**
1. Go to **Admin** > **Items**
2. Click **"Export QR Codes"**
3. Select items or "All Items"
4. Choose format and layout
5. Download

### Printing QR Codes

**Label Printing:**
1. Use bulk export feature
2. Select "Label Format"
3. Choose label size:
   - Small (2" x 1")
   - Medium (3" x 2")
   - Large (4" x 3")
4. Print on label sheets

**Recommended Printers:**
- Brother QL-820NWB
- Dymo LabelWriter 450
- Regular printer with label sheets

### QR Code Best Practices

✅ **DO:**
- Laminate labels for durability
- Place in visible location
- Keep codes clean and flat
- Regularly check code quality
- Replace damaged codes

❌ **DON'T:**
- Place in sunlight (fades)
- Cover with tape (reflection issues)
- Use very small sizes (hard to scan)
- Reuse codes for different items

---

## Reports & Analytics

### Available Reports

**User Activity Report:**
- User registration trends
- Active vs inactive users
- Top borrowers
- Department usage

**Inventory Status Report:**
- Items by category
- Availability statistics
- High-demand items
- Low stock items

**Transaction History Report:**
- Borrows over time
- Returns on time vs late
- Overdue statistics
- Category trends

**Overdue Items Report:**
- Currently overdue items
- Frequent late returners
- Financial impact (fees)

**Usage Analytics:**
- Peak usage times
- Most popular items
- Seasonal trends
- Department comparison

### Generating Reports

1. Go to **Admin** > **Reports**
2. Select report type
3. Choose date range
4. Apply filters (optional)
5. Select format:
   - PDF (printable)
   - Excel (editable)
   - CSV (data export)
6. Click **"Generate Report"**
7. Download when ready

### Scheduled Reports

**Setup Automatic Reports:**
1. Go to **Reports** > **Scheduled Reports**
2. Click **"Add Schedule"**
3. Configure:
   - Report type
   - Frequency (daily/weekly/monthly)
   - Recipients (email addresses)
   - Format
4. Save schedule

Reports automatically generated and emailed.

### Dashboard Analytics

**Real-time Metrics:**
- Current system usage
- Active transactions
- Overdue count
- Today's activity

**Trends:**
- Borrowing trends (30 days)
- Category popularity
- User growth
- Item utilization

**Charts:**
- Line charts (trends over time)
- Pie charts (category distribution)
- Bar charts (comparisons)
- Heatmaps (usage patterns)

---

## System Settings

### General Settings

**Application:**
- Site name
- Organization name
- Contact email
- Timezone
- Language
- Date/time format

**Borrowing Rules:**
- Default borrow days
- Maximum borrow days
- Max active borrows per user
- Reminder days before due
- Grace period days

**Notifications:**
- Email notifications enabled
- SMS notifications (if configured)
- Reminder schedules
- Overdue escalation

### Email Configuration

**SMTP Settings:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: app-password
From Email: noreply@qrinventory.com
From Name: QR Inventory System
```

**Email Templates:**
- Welcome email
- Borrow confirmation
- Return confirmation
- Due date reminder
- Overdue notification
- Password reset

### Security Settings

**Password Policy:**
- Minimum length (8-32 chars)
- Require uppercase
- Require lowercase
- Require numbers
- Require special characters
- Password expiry (optional)

**Session Settings:**
- Session timeout (minutes)
- Remember me duration (days)
- Max concurrent sessions
- Idle timeout

**Access Control:**
- IP whitelist (optional)
- Login attempt limit
- Account lockout duration
- Two-factor authentication (optional)

### Category Management

**Add Category:**
1. Go to **Settings** > **Categories**
2. Click **"Add Category"**
3. Enter category name
4. Save

**Edit/Delete Category:**
- Edit name
- Delete (if no items use it)
- Merge categories

### Location Management

**Add Location:**
1. Go to **Settings** > **Locations**
2. Click **"Add Location"**
3. Enter:
   - Location name (e.g., "Room 101")
   - Building (optional)
   - Floor (optional)
4. Save

### Backup Settings

**Automatic Backups:**
- Frequency: Daily/Weekly
- Time: Specify hour
- Retention: Days to keep
- Storage: Local/Cloud

**Backup Includes:**
- Database
- User uploads
- Configuration

---

## Notifications

### Sending Notifications

**Single User:**
1. Go to user profile
2. Click **"Send Message"** button
3. Enter subject and message
4. Send via Email/SMS/In-app

**Bulk Notification:**
1. Go to **Admin** > **Notifications**
2. Click **"New Notification"**
3. Select recipients:
   - All users
   - Specific department
   - Users with active borrows
   - Custom selection
4. Compose message
5. Schedule or send immediately

### Automatic Notifications

System automatically sends:

**Due Date Reminders:**
- Sent 2 days before due date
- Can be configured in settings

**Overdue Notifications:**
- Sent on due date
- Follow-up after 3 days
- Final notice after 7 days

**System Announcements:**
- New items added
- System maintenance
- Policy updates

### Notification History

View all sent notifications:
- Date sent
- Recipients
- Subject
- Delivery status
- Open rate (emails)

---

## Data Export

### Export Users

1. Go to **Admin** > **Users**
2. Apply filters (optional)
3. Click **"Export"**
4. Select fields to include
5. Choose format (CSV/Excel/PDF)
6. Download

### Export Items

Same process as users:
- Apply filters
- Select fields
- Choose format
- Download

### Export Transactions

Include options:
- Date range
- User details
- Item details
- Status information
- Financial data

### Export for Backup

**Full System Export:**
1. Go to **Settings** > **Backup**
2. Click **"Export All Data"**
3. Creates complete backup
4. Download ZIP file
5. Store securely

**Contains:**
- All user data
- All item data
- All transactions
- System settings
- QR codes

---

## Backup & Recovery

### Creating Manual Backup

1. Go to **Settings** > **Backup**
2. Click **"Create Backup"**
3. Select what to include:
   - ☑️ Database
   - ☑️ User uploads
   - ☑️ Configuration
4. Click **"Start Backup"**
5. Download backup file

### Restoring from Backup

⚠️ **Warning:** This will overwrite current data!

1. Go to **Settings** > **Backup**
2. Click **"Restore"** button
3. Upload backup file
4. Confirm restoration
5. Wait for process to complete
6. System automatically restarts

### Backup Best Practices

✅ **Schedule regular backups** (daily recommended)
✅ **Store backups off-site** (cloud storage)
✅ **Test restoration** periodically
✅ **Keep multiple backup versions**
✅ **Encrypt backup files**

---

## Security

### User Security

**Account Protection:**
- Strong password requirements
- Optional two-factor authentication
- Account lockout after failed attempts
- Session timeout
- Secure password reset

**Access Control:**
- Role-based permissions
- Admin vs regular user
- Department-level access (if needed)

### System Security

**Application Security:**
- HTTPS required in production
- Secure headers configured
- SQL injection prevention
- XSS protection
- CSRF tokens

**API Security:**
- JWT token authentication
- Rate limiting
- API key management (optional)

### Security Monitoring

**Audit Logs:**
- User login/logout
- Admin actions
- Failed login attempts
- Data exports
- Setting changes

**Security Alerts:**
- Multiple failed logins
- Unusual activity
- Unauthorized access attempts
- Data export activity

### Security Best Practices

✅ **DO:**
- Change default passwords immediately
- Use strong admin passwords
- Enable HTTPS
- Regular security updates
- Monitor audit logs
- Limit admin accounts

❌ **DON'T:**
- Share admin credentials
- Use weak passwords
- Disable security features
- Ignore security alerts
- Grant admin unnecessarily

---

## Troubleshooting

### Common Issues

**Users Can't Login:**
1. Check if account is active
2. Verify email is correct
3. Reset password
4. Check browser compatibility
5. Clear browser cache

**QR Codes Won't Scan:**
1. Check camera permissions
2. Ensure good lighting
3. Clean camera lens
4. Try different device
5. Regenerate QR code

**Items Show Incorrect Quantity:**
1. Check active transactions
2. Verify recent returns
3. Run data integrity check
4. Update manually if needed

**Emails Not Sending:**
1. Check SMTP settings
2. Verify email credentials
3. Check spam folders
4. Test connection
5. Review email logs

### Database Issues

**Connection Failed:**
```bash
# Check database is running
sudo systemctl status postgresql

# Test connection
psql -U qr_user -d qr_inventory
```

**Slow Queries:**
1. Check database size
2. Run maintenance
3. Optimize indices
4. Clean old data

### Performance Issues

**Slow Loading:**
1. Check server resources
2. Clear application cache
3. Optimize database
4. Review active users
5. Check network speed

**High Memory Usage:**
1. Restart application
2. Check for memory leaks
3. Review log files
4. Upgrade server if needed

### Getting Help

**Documentation:**
- [User Guide](user-guide.md)
- [Setup Guide](setup.md)
- [API Documentation](api.md)

**Support:**
- 📧 support@qrinventory.com
- 💬 Discord community
- 🐛 GitHub issues

**Professional Support:**
- Contact for enterprise support
- Custom development
- Training sessions
- On-site setup

---

## Appendix

### Admin Shortcuts

| Action | Shortcut |
|--------|----------|
| Admin Dashboard | `/admin/dashboard` |
| User Management | `/admin/users` |
| Item Management | `/admin/items` |
| Reports | `/admin/reports` |
| Settings | `/admin/settings` |

### Default Configuration

```yaml
Borrow Settings:
  Default Duration: 7 days
  Maximum Duration: 30 days
  Max Active Borrows: 5
  Reminder Days: 2

Notifications:
  Due Reminders: Enabled
  Overdue Alerts: Enabled
  Email Notifications: Enabled

Security:
  Password Min Length: 8
  Session Timeout: 1440 minutes
  Max Login Attempts: 5
```

---

**Scouts Musulmans de Montréal - Kashef**
*Empowering administrators with powerful tools*