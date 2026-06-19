# QR Inventory System - API Documentation

Complete API reference for the QR Inventory System.

## Base URL

```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Token Lifetime
- Access Token: 24 hours
- Refresh Token: 7 days

---

## 📋 Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Users](#user-endpoints)
3. [Items](#item-endpoints)
4. [Transactions](#transaction-endpoints)
5. [Reviews](#review-endpoints)
6. [Reports](#report-endpoints)
7. [QR Codes](#qr-code-endpoints)
8. [Dashboard](#dashboard-endpoints)

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "department": "IT",
  "phone": "+1234567890",
  "employee_id": "EMP001"
}
```

**Response:** `201 Created`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_admin": false,
    "department": "IT",
    "phone": "+1234567890",
    "employee_id": "EMP001",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- `400`: Validation error
- `409`: Email already exists

---

### Login

**POST** `/auth/login`

Authenticate and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_admin": false
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `403`: Account inactive

---

### Get Current User

**GET** `/auth/me`

Get authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_admin": false,
  "department": "IT",
  "phone": "+1234567890",
  "employee_id": "EMP001",
  "qr_code_data": "USER:1:user@example.com",
  "qr_code_image": "data:image/png;base64,...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Logout

**POST** `/auth/logout`

Invalidate current token.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

---

## User Endpoints

### List Users

**GET** `/users`

Get paginated list of users (Admin only).

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10, max: 100)
- `search` (string): Search by name or email
- `department` (string): Filter by department
- `is_active` (boolean): Filter by active status

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_active": true,
      "is_admin": false,
      "department": "IT",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

---

### Get User by ID

**GET** `/users/{user_id}`

Get user details by ID.

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_admin": false,
  "department": "IT",
  "phone": "+1234567890",
  "employee_id": "EMP001",
  "qr_code_data": "USER:1:user@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- `404`: User not found

---

### Update User

**PUT** `/users/{user_id}`

Update user information.

**Request Body:**
```json
{
  "full_name": "John Smith",
  "department": "HR",
  "phone": "+1234567890",
  "is_active": true
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Smith",
  "department": "HR",
  "is_active": true
}
```

---

### Change Password

**POST** `/users/me/change-password`

Change user's password.

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `401`: Current password incorrect
- `400`: Password validation failed

---

### Get User Statistics

**GET** `/users/me/stats`

Get statistics for current user.

**Response:** `200 OK`
```json
{
  "total_borrows": 25,
  "active_borrows": 2,
  "total_returns": 23,
  "overdue_count": 0,
  "on_time_returns": 20,
  "late_returns": 3,
  "favorite_category": "Electronics",
  "avg_borrow_duration": 5.5
}
```

---

## Item Endpoints

### List Items

**GET** `/items`

Get paginated list of items.

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 10)
- `search` (string): Search by name or code
- `category` (string): Filter by category
- `status` (string): available, borrowed, maintenance, retired
- `is_borrowable` (boolean): Filter borrowable items

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 15",
      "item_code": "LAPTOP-001",
      "category": "Electronics",
      "status": "available",
      "quantity": 5,
      "available_quantity": 3,
      "is_borrowable": true,
      "max_borrow_days": 7,
      "brand": "Dell",
      "model": "XPS 15",
      "location": "Storage Room A",
      "qr_code_data": "ITEM:1:LAPTOP-001",
      "created_at": "2024-01-10T09:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 10
}
```

---

### Get Item by ID

**GET** `/items/{item_id}`

Get detailed item information.

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Laptop Dell XPS 15",
  "item_code": "LAPTOP-001",
  "description": "15-inch laptop with i7 processor",
  "category": "Electronics",
  "status": "available",
  "quantity": 5,
  "available_quantity": 3,
  "is_borrowable": true,
  "max_borrow_days": 7,
  "serial_number": "SN12345",
  "brand": "Dell",
  "model": "XPS 15",
  "manufacturer": "Dell Inc.",
  "location": "Storage Room A",
  "purchase_date": "2023-01-15",
  "purchase_price": 1500.00,
  "warranty_expiry": "2026-01-15",
  "image_url": "/images/laptop.jpg",
  "qr_code_data": "ITEM:1:LAPTOP-001",
  "qr_code_image": "data:image/png;base64,...",
  "tags": ["laptop", "dell", "electronics"],
  "created_at": "2024-01-10T09:00:00Z"
}
```

---

### Create Item

**POST** `/items/`

Create a new item (Admin only).

**Request Body:**
```json
{
  "name": "Laptop Dell XPS 15",
  "item_code": "LAPTOP-001",
  "description": "15-inch laptop with i7 processor",
  "category": "Electronics",
  "quantity": 5,
  "is_borrowable": true,
  "max_borrow_days": 7,
  "brand": "Dell",
  "model": "XPS 15",
  "location": "Storage Room A",
  "purchase_price": 1500.00
}
```

**Response:** `201 Created`

---

### Update Item

**PUT** `/items/{item_id}`

Update item information (Admin only).

**Request Body:**
```json
{
  "name": "Laptop Dell XPS 15 (Updated)",
  "quantity": 6,
  "location": "Storage Room B",
  "status": "available"
}
```

**Response:** `200 OK`

---

### Delete Item

**DELETE** `/items/{item_id}`

Delete an item (Admin only).

**Response:** `204 No Content`

---

## Transaction Endpoints

### Borrow Item

**POST** `/transactions/borrow`

Create a new borrow transaction.

**Request Body:**
```json
{
  "user_qr_code": "USER:1:user@example.com",
  "item_qr_code": "ITEM:1:LAPTOP-001",
  "quantity": 1,
  "purpose": "Development work",
  "due_days": 7
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "item_id": 1,
  "user_name": "John Doe",
  "item_name": "Laptop Dell XPS 15",
  "status": "active",
  "quantity": 1,
  "borrowed_at": "2024-01-20T14:00:00Z",
  "due_date": "2024-01-27T14:00:00Z",
  "purpose": "Development work"
}
```

**Errors:**
- `400`: Invalid QR code
- `404`: User or item not found
- `409`: Item not available

---

### Return Item

**POST** `/transactions/return`

Return a borrowed item.

**Request Body:**
```json
{
  "transaction_id": 1,
  "condition_at_return": "good",
  "notes": "Item returned in good condition"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "status": "returned",
  "returned_at": "2024-01-25T16:00:00Z",
  "condition_at_return": "good",
  "notes": "Item returned in good condition"
}
```

---

### Get My Active Borrows

**GET** `/transactions/my-active`

Get current user's active borrows.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "item_id": 1,
    "item_name": "Laptop Dell XPS 15",
    "item_code": "LAPTOP-001",
    "quantity": 1,
    "borrowed_at": "2024-01-20T14:00:00Z",
    "due_date": "2024-01-27T14:00:00Z",
    "days_until_due": 2,
    "is_overdue": false,
    "purpose": "Development work"
  }
]
```

---

### Get My Transaction History

**GET** `/transactions/my-history`

Get current user's transaction history.

**Query Parameters:**
- `limit` (int, default: 20): Number of records

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "item_name": "Laptop Dell XPS 15",
    "status": "returned",
    "borrowed_at": "2024-01-20T14:00:00Z",
    "returned_at": "2024-01-25T16:00:00Z",
    "condition_at_return": "good"
  }
]
```

---

### List All Transactions

**GET** `/transactions/`

Get all transactions (Admin only).

**Query Parameters:**
- `page` (int)
- `page_size` (int)
- `status` (string): Filter by status
- `user_id` (int): Filter by user
- `item_id` (int): Filter by item

**Response:** `200 OK`

---

## Review Endpoints

### Create Review

**POST** `/reviews/`

Submit a review for an item.

**Request Body:**
```json
{
  "item_id": 1,
  "transaction_id": 1,
  "rating": 5,
  "comment": "Great laptop, works perfectly!",
  "has_issue": false
}
```

**Response:** `201 Created`

---

### Get Reviews for Item

**GET** `/reviews/item/{item_id}`

Get all reviews for an item.

**Response:** `200 OK`
```json
{
  "reviews": [
    {
      "id": 1,
      "user_name": "John Doe",
      "rating": 5,
      "comment": "Great laptop, works perfectly!",
      "has_issue": false,
      "created_at": "2024-01-25T17:00:00Z"
    }
  ],
  "total": 10,
  "avg_rating": 4.5
}
```

---

## Report Endpoints

### Generate Report

**POST** `/reports/generate`

Generate a report (Admin only).

**Request Body:**
```json
{
  "report_type": "transaction_history",
  "format": "pdf",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:** `200 OK` (File download)

---

## QR Code Endpoints

### Generate User QR

**GET** `/qr/user/{user_id}`

Generate QR code for user.

**Response:** `200 OK`
```json
{
  "qr_code_data": "USER:1:user@example.com",
  "qr_code_image": "data:image/png;base64,..."
}
```

---

### Generate Item QR

**GET** `/qr/item/{item_id}`

Generate QR code for item.

**Response:** `200 OK`
```json
{
  "qr_code_data": "ITEM:1:LAPTOP-001",
  "qr_code_image": "data:image/png;base64,..."
}
```

---

### Verify QR Code

**POST** `/qr/verify`

Verify and parse QR code data.

**Request Body:**
```json
{
  "qr_data": "USER:1:user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "type": "user",
  "id": 1,
  "email": "user@example.com"
}
```

---

## Dashboard Endpoints

### Get Dashboard Stats

**GET** `/dashboard/stats`

Get dashboard statistics.

**Response:** `200 OK`
```json
{
  "total_users": 50,
  "active_users": 45,
  "total_items": 100,
  "available_items": 75,
  "borrowed_items": 20,
  "active_borrows": 25,
  "overdue_borrows": 2
}
```

---

### Get Recent Activities

**GET** `/dashboard/recent-activities`

Get recent system activities.

**Query Parameters:**
- `limit` (int, default: 10)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_name": "John Doe",
    "activity_type": "borrow",
    "description": "Borrowed Laptop Dell XPS 15",
    "timestamp": "2024-01-20T14:00:00Z"
  }
]
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Validation error",
  "errors": {
    "email": ["Invalid email format"]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 409 Conflict
```json
{
  "detail": "Resource already exists"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

API requests are rate-limited to:
- **100 requests per minute** for authenticated users
- **20 requests per minute** for unauthenticated users

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 10,
  "total_pages": 10
}
```

---

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Get Items (with auth)
```bash
curl -X GET http://localhost:8000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Postman Collection

Import the Postman collection for easier testing:

**Download:** [QR-Inventory-API.postman_collection.json](./QR-Inventory-API.postman_collection.json)

---

## WebSocket Support (Future)

Real-time updates will be available via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

---

## API Versioning

Current version: **v1**

Future versions will be available at:
- `/api/v2/...`

---

## Support

For API support, contact: support@qrinventory.com