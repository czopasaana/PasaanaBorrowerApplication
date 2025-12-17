# Database Schema Additions for Borrower App

This document contains all the SQL scripts for the enhanced borrower experience features added to the application.

**Date Created:** December 16, 2024  
**Database:** Azure SQL Database

---

## Table of Contents

1. [Overview](#overview)
2. [New Tables](#new-tables)
3. [Stored Procedures](#stored-procedures)
4. [Sample Data](#sample-data)
5. [Table Relationships](#table-relationships)

---

## Overview

These database additions support the following features:
- **Loan Officer Communication** - Direct messaging between borrowers and loan officers
- **Document Upload Center** - Track required and uploaded documents
- **Loan Timeline** - Visual progress tracking through loan milestones
- **Notifications System** - In-app notifications for borrowers
- **Loan Estimates** - Closing costs and payment breakdowns
- **Rate Lock Tracking** - Monitor rate lock status and expiration
- **Loan Product Comparison** - Compare different loan products
- **Activity Logging** - Audit trail of all actions
- **Action Items** - Tasks and to-dos for borrowers

---

## New Tables

### 1. LoanOfficers

Stores loan officer profiles and contact information.

```sql
CREATE TABLE LoanOfficers (
    OfficerID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Phone NVARCHAR(20),
    NMLS_ID NVARCHAR(20),
    PhotoURL NVARCHAR(500),
    Bio NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| OfficerID | INT | Primary key, auto-increment |
| FirstName | NVARCHAR(100) | Loan officer's first name |
| LastName | NVARCHAR(100) | Loan officer's last name |
| Email | NVARCHAR(255) | Unique email address |
| Phone | NVARCHAR(20) | Contact phone number |
| NMLS_ID | NVARCHAR(20) | NMLS license number |
| PhotoURL | NVARCHAR(500) | URL to profile photo |
| Bio | NVARCHAR(MAX) | Biography/description |
| IsActive | BIT | Whether officer is active (default: 1) |

---

### 2. UserLoanOfficerAssignments

Links borrowers to their assigned loan officer.

```sql
CREATE TABLE UserLoanOfficerAssignments (
    AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    OfficerID INT NOT NULL,
    AssignedDate DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    CONSTRAINT FK_Assignment_Officer FOREIGN KEY (OfficerID) REFERENCES LoanOfficers(OfficerID)
);
```

**Usage:** Each borrower can have one active loan officer assignment. When a new officer is assigned, set the previous assignment's `IsActive` to 0.

---

### 3. LoanTimeline

Tracks loan milestones and progress through the mortgage process.

```sql
CREATE TABLE LoanTimeline (
    TimelineID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    MilestoneName NVARCHAR(100) NOT NULL,
    MilestoneDescription NVARCHAR(500),
    MilestoneOrder INT NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    EstimatedDate DATE,
    CompletedDate DATE,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Status Values:**
- `Pending` - Not yet started
- `In Progress` - Currently active
- `Completed` - Successfully completed
- `Skipped` - Skipped (not applicable)

**Default Milestones (created by stored procedure):**
1. Pre-Approval
2. Application Submitted
3. Document Collection
4. Processing
5. Underwriting
6. Conditional Approval
7. Clear to Close
8. Closing
9. Funded

---

### 4. Documents

Tracks required and uploaded documents for the loan application.

```sql
CREATE TABLE Documents (
    DocumentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    DocumentCategory NVARCHAR(100) NOT NULL,
    DocumentType NVARCHAR(100) NOT NULL,
    DocumentName NVARCHAR(255),
    FileName NVARCHAR(255),
    BlobURL NVARCHAR(500),
    FileSize INT,
    MimeType NVARCHAR(100),
    IsRequired BIT DEFAULT 1,
    Status NVARCHAR(50) DEFAULT 'Pending',
    RejectionReason NVARCHAR(500),
    UploadedAt DATETIME2,
    ReviewedAt DATETIME2,
    ReviewedBy INT,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Document Categories:**
- `Income` - Pay stubs, W-2s, tax returns
- `Assets` - Bank statements, investment accounts
- `Identity` - Government ID, SSN card
- `Property` - Purchase agreement, insurance quotes
- `Other` - Miscellaneous documents

**Status Values:**
- `Pending` - Not yet uploaded
- `Uploaded` - File uploaded, awaiting review
- `Under Review` - Being reviewed by loan officer
- `Approved` - Document accepted
- `Rejected` - Document rejected (see RejectionReason)

---

### 5. Messages

Stores secure messages between borrowers and loan officers.

```sql
CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    ConversationID UNIQUEIDENTIFIER DEFAULT NEWID(),
    SenderType NVARCHAR(20) NOT NULL,
    SenderID INT NOT NULL,
    RecipientType NVARCHAR(20) NOT NULL,
    RecipientID INT NOT NULL,
    Subject NVARCHAR(255),
    MessageBody NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    ReadAt DATETIME2,
    HasAttachment BIT DEFAULT 0,
    AttachmentURL NVARCHAR(500),
    AttachmentName NVARCHAR(255),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

**SenderType/RecipientType Values:**
- `Borrower`
- `LoanOfficer`

**Indexes:**
```sql
CREATE INDEX IX_Messages_Recipient ON Messages(RecipientType, RecipientID, IsRead);
CREATE INDEX IX_Messages_Sender ON Messages(SenderType, SenderID);
```

---

### 6. Notifications

In-app notifications for borrowers.

```sql
CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    NotificationType NVARCHAR(50) NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Message NVARCHAR(MAX),
    ActionURL NVARCHAR(500),
    Priority NVARCHAR(20) DEFAULT 'Normal',
    IsRead BIT DEFAULT 0,
    ReadAt DATETIME2,
    IsDismissed BIT DEFAULT 0,
    DismissedAt DATETIME2,
    ExpiresAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

**NotificationType Values:**
- `Document` - Document-related notifications
- `Message` - New message received
- `Status` - Loan status change
- `Reminder` - Deadline reminders
- `Alert` - Important alerts

**Priority Values:**
- `Low`
- `Normal`
- `High`
- `Urgent`

**Index:**
```sql
CREATE INDEX IX_Notifications_User ON Notifications(UserID, IsRead, CreatedAt DESC);
```

---

### 7. LoanEstimates

Stores estimated closing costs and loan terms.

```sql
CREATE TABLE LoanEstimates (
    EstimateID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    
    -- Loan Terms
    LoanAmount DECIMAL(18,2),
    InterestRate DECIMAL(5,4),
    LoanTermMonths INT DEFAULT 360,
    LoanType NVARCHAR(50),
    LoanPurpose NVARCHAR(50),
    
    -- Monthly Payment Breakdown
    PrincipalAndInterest DECIMAL(18,2),
    PropertyTax DECIMAL(18,2),
    HomeownersInsurance DECIMAL(18,2),
    MortgageInsurance DECIMAL(18,2),
    HOAFees DECIMAL(18,2),
    TotalMonthlyPayment DECIMAL(18,2),
    
    -- Closing Costs Breakdown
    OriginationFee DECIMAL(18,2),
    AppraisalFee DECIMAL(18,2),
    CreditReportFee DECIMAL(18,2),
    TitleInsurance DECIMAL(18,2),
    TitleSearch DECIMAL(18,2),
    RecordingFees DECIMAL(18,2),
    TransferTax DECIMAL(18,2),
    AttorneyFees DECIMAL(18,2),
    SurveyFee DECIMAL(18,2),
    FloodCertification DECIMAL(18,2),
    PrepaidInterest DECIMAL(18,2),
    PrepaidTaxes DECIMAL(18,2),
    PrepaidInsurance DECIMAL(18,2),
    EscrowDeposit DECIMAL(18,2),
    OtherFees DECIMAL(18,2),
    TotalClosingCosts DECIMAL(18,2),
    
    -- Cash to Close
    DownPayment DECIMAL(18,2),
    SellerCredits DECIMAL(18,2),
    LenderCredits DECIMAL(18,2),
    CashToClose DECIMAL(18,2),
    
    EstimatedClosingDate DATE,
    IsActive BIT DEFAULT 1,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**LoanType Values:**
- `Conventional`
- `FHA`
- `VA`
- `USDA`
- `Jumbo`

**LoanPurpose Values:**
- `Purchase`
- `Refinance`
- `Cash-Out Refinance`

---

### 8. RateLocks

Tracks rate lock status and expiration.

```sql
CREATE TABLE RateLocks (
    RateLockID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    LockedRate DECIMAL(5,4) NOT NULL,
    LockPeriodDays INT NOT NULL,
    LockStartDate DATE NOT NULL,
    LockExpirationDate DATE NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Active',
    ExtensionFee DECIMAL(18,2),
    ExtendedDays INT,
    RequestedBy NVARCHAR(20),
    ApprovedBy INT,
    ApprovedAt DATETIME2,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Status Values:**
- `Active` - Lock is currently active
- `Expired` - Lock has expired
- `Extended` - Lock was extended
- `Cancelled` - Lock was cancelled
- `Converted` - Lock was converted to final rate

**Common Lock Periods:**
- 30 days
- 45 days
- 60 days

---

### 9. LoanProducts

Available loan products for comparison.

```sql
CREATE TABLE LoanProducts (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProductName NVARCHAR(100) NOT NULL,
    ProductType NVARCHAR(50) NOT NULL,
    Description NVARCHAR(MAX),
    BaseRate DECIMAL(5,4),
    APR DECIMAL(5,4),
    Points DECIMAL(5,4),
    MinCreditScore INT,
    MaxDTI DECIMAL(5,2),
    MinDownPaymentPercent DECIMAL(5,2),
    MinLoanAmount DECIMAL(18,2),
    MaxLoanAmount DECIMAL(18,2),
    RequiresPMI BIT,
    PMIRate DECIMAL(5,4),
    PMIRemovalLTV DECIMAL(5,2),
    Features NVARCHAR(MAX),
    Restrictions NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    DisplayOrder INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Features/Restrictions:** Stored as JSON arrays for flexibility.

---

### 10. UserPreferences

User notification and display preferences.

```sql
CREATE TABLE UserPreferences (
    PreferenceID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    EmailNotifications BIT DEFAULT 1,
    SMSNotifications BIT DEFAULT 0,
    PushNotifications BIT DEFAULT 1,
    NotifyDocumentUpdates BIT DEFAULT 1,
    NotifyMessageReceived BIT DEFAULT 1,
    NotifyStatusChanges BIT DEFAULT 1,
    NotifyRateLockAlerts BIT DEFAULT 1,
    NotifyDeadlineReminders BIT DEFAULT 1,
    DarkMode BIT DEFAULT 0,
    Language NVARCHAR(10) DEFAULT 'en',
    TimeZone NVARCHAR(50) DEFAULT 'America/New_York',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

---

### 11. ActivityLog

Audit trail of all user and system activities.

```sql
CREATE TABLE ActivityLog (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT,
    OfficerID INT,
    ApplicationID INT,
    ActivityType NVARCHAR(50) NOT NULL,
    ActivityDescription NVARCHAR(500),
    EntityType NVARCHAR(50),
    EntityID INT,
    OldValue NVARCHAR(MAX),
    NewValue NVARCHAR(MAX),
    IPAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

**ActivityType Values:**
- `Login` - User login
- `Logout` - User logout
- `DocumentUpload` - Document uploaded
- `FormSubmit` - Form submitted
- `StatusChange` - Status changed
- `MessageSent` - Message sent
- `ProfileUpdate` - Profile updated

**Indexes:**
```sql
CREATE INDEX IX_ActivityLog_User ON ActivityLog(UserID, CreatedAt DESC);
CREATE INDEX IX_ActivityLog_Application ON ActivityLog(ApplicationID, CreatedAt DESC);
```

---

### 12. ActionItems

Tasks and to-dos assigned to borrowers or loan officers.

```sql
CREATE TABLE ActionItems (
    ActionItemID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX),
    Category NVARCHAR(50),
    AssignedTo NVARCHAR(20) NOT NULL,
    AssignedToID INT,
    AssignedBy NVARCHAR(20),
    AssignedByID INT,
    Priority NVARCHAR(20) DEFAULT 'Normal',
    Status NVARCHAR(50) DEFAULT 'Pending',
    DueDate DATE,
    CompletedAt DATETIME2,
    CompletedBy INT,
    RelatedDocumentID INT,
    ActionURL NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Category Values:**
- `Document` - Document-related task
- `Form` - Form completion
- `Signature` - Signature required
- `Payment` - Payment required
- `Other` - Miscellaneous

**Index:**
```sql
CREATE INDEX IX_ActionItems_User ON ActionItems(UserID, Status, DueDate);
```

---

## Stored Procedures

### sp_CreateDefaultTimeline

Creates default loan milestones for a new user/application.

```sql
CREATE PROCEDURE sp_CreateDefaultTimeline
    @UserID INT,
    @ApplicationID INT = NULL
AS
BEGIN
    INSERT INTO LoanTimeline (UserID, ApplicationID, MilestoneName, MilestoneDescription, MilestoneOrder, Status)
    VALUES 
        (@UserID, @ApplicationID, 'Pre-Approval', 'Get pre-approved for your mortgage', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Application Submitted', 'Complete and submit your full application', 2, 'Pending'),
        (@UserID, @ApplicationID, 'Document Collection', 'Submit all required documents', 3, 'Pending'),
        (@UserID, @ApplicationID, 'Processing', 'Loan processor reviews your application', 4, 'Pending'),
        (@UserID, @ApplicationID, 'Underwriting', 'Underwriter reviews and approves your loan', 5, 'Pending'),
        (@UserID, @ApplicationID, 'Conditional Approval', 'Loan approved with conditions', 6, 'Pending'),
        (@UserID, @ApplicationID, 'Clear to Close', 'All conditions satisfied, ready to close', 7, 'Pending'),
        (@UserID, @ApplicationID, 'Closing', 'Sign final documents and close your loan', 8, 'Pending'),
        (@UserID, @ApplicationID, 'Funded', 'Loan is funded and complete', 9, 'Pending');
END;
```

**Usage:**
```sql
EXEC sp_CreateDefaultTimeline @UserID = 1, @ApplicationID = 123;
```

---

### sp_CreateDefaultDocumentRequirements

Creates default document requirements for a new user/application.

```sql
CREATE PROCEDURE sp_CreateDefaultDocumentRequirements
    @UserID INT,
    @ApplicationID INT = NULL
AS
BEGIN
    INSERT INTO Documents (UserID, ApplicationID, DocumentCategory, DocumentType, IsRequired, Status)
    VALUES 
        (@UserID, @ApplicationID, 'Income', 'Pay Stubs (Last 30 Days)', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Income', 'W-2 Forms (Last 2 Years)', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Income', 'Tax Returns (Last 2 Years)', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Income', 'Employment Verification Letter', 0, 'Pending'),
        (@UserID, @ApplicationID, 'Assets', 'Bank Statements (Last 2 Months)', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Assets', 'Investment Account Statements', 0, 'Pending'),
        (@UserID, @ApplicationID, 'Assets', 'Retirement Account Statements', 0, 'Pending'),
        (@UserID, @ApplicationID, 'Identity', 'Government-Issued Photo ID', 1, 'Pending'),
        (@UserID, @ApplicationID, 'Identity', 'Social Security Card', 0, 'Pending'),
        (@UserID, @ApplicationID, 'Property', 'Purchase Agreement', 0, 'Pending'),
        (@UserID, @ApplicationID, 'Property', 'Homeowners Insurance Quote', 0, 'Pending');
END;
```

**Usage:**
```sql
EXEC sp_CreateDefaultDocumentRequirements @UserID = 1, @ApplicationID = 123;
```

---

## Sample Data

### Default Loan Officer (Required for Testing)

Run this script first to create a default loan officer that will be auto-assigned to all borrowers:

```sql
-- Insert default loan officer
INSERT INTO LoanOfficers (FirstName, LastName, Email, Phone, NMLS_ID, Bio, IsActive)
VALUES (
    'Sarah', 
    'Johnson', 
    'sarah.johnson@bankabc.com', 
    '203-555-0123', 
    '123456', 
    'With over 10 years of experience in mortgage lending, I''m dedicated to helping you find the perfect home financing solution. I specialize in first-time homebuyer programs, refinancing, and jumbo loans.',
    1
);
```

**Note:** Once a loan officer exists in the system, the application will automatically assign them to any borrower who doesn't have a loan officer yet when they visit their profile page.

### Default Loan Products

```sql
INSERT INTO LoanProducts (ProductName, ProductType, Description, MinCreditScore, MaxDTI, MinDownPaymentPercent, Features)
VALUES 
    ('30-Year Fixed Conventional', 'Conventional', 'Traditional 30-year fixed rate mortgage with stable monthly payments.', 620, 45.00, 3.00, '["Stable monthly payments", "No upfront mortgage insurance", "PMI can be removed at 80% LTV"]'),
    ('15-Year Fixed Conventional', 'Conventional', 'Pay off your home faster with a 15-year fixed rate mortgage.', 620, 45.00, 3.00, '["Lower interest rate", "Build equity faster", "Pay less interest over life of loan"]'),
    ('FHA Loan', 'FHA', 'Government-backed loan with lower credit and down payment requirements.', 580, 50.00, 3.50, '["Lower credit requirements", "Lower down payment", "More flexible qualification"]'),
    ('VA Loan', 'VA', 'For veterans and active military with no down payment required.', 580, 50.00, 0.00, '["No down payment required", "No monthly mortgage insurance", "Competitive rates"]'),
    ('USDA Loan', 'USDA', 'For rural and suburban home buyers with no down payment.', 640, 41.00, 0.00, '["No down payment", "Lower mortgage insurance", "For eligible rural areas"]'),
    ('Jumbo Loan', 'Jumbo', 'For loan amounts exceeding conforming loan limits.', 700, 43.00, 10.00, '["Finance larger home purchases", "Competitive rates", "Flexible terms"]');
```

---

## Table Relationships

```
Users (existing)
  └── UserLoanOfficerAssignments ──> LoanOfficers
  └── LoanTimeline
  └── Documents
  └── Messages (as Borrower)
  └── Notifications
  └── LoanEstimates
  └── RateLocks
  └── UserPreferences
  └── ActivityLog
  └── ActionItems

LoanOfficers
  └── UserLoanOfficerAssignments
  └── Messages (as LoanOfficer)
  └── ActivityLog

BorrowerLoanApplication (existing)
  └── LoanTimeline
  └── Documents
  └── LoanEstimates
  └── RateLocks
  └── ActionItems
  └── ActivityLog
```

---

## Queries for Common Operations

### Get Borrower Dashboard Data

```sql
SELECT 
    u.UserID,
    u.Email,
    u.FirstName,
    u.LastName,
    pa.IsPreApproved,
    la.ApplicationID,
    la.ApplicationStatus,
    lo.FirstName + ' ' + lo.LastName as LoanOfficerName,
    lo.Email as LoanOfficerEmail,
    lo.Phone as LoanOfficerPhone,
    (SELECT COUNT(*) FROM Documents d WHERE d.UserID = u.UserID AND d.Status = 'Pending' AND d.IsRequired = 1) as PendingDocuments,
    (SELECT COUNT(*) FROM Messages m WHERE m.RecipientType = 'Borrower' AND m.RecipientID = u.UserID AND m.IsRead = 0) as UnreadMessages,
    (SELECT COUNT(*) FROM Notifications n WHERE n.UserID = u.UserID AND n.IsRead = 0) as UnreadNotifications
FROM Users u
LEFT JOIN PreApprovalApplications pa ON u.UserID = pa.UserID
LEFT JOIN BorrowerLoanApplication la ON u.UserID = la.UserID
LEFT JOIN UserLoanOfficerAssignments uloa ON u.UserID = uloa.UserID AND uloa.IsActive = 1
LEFT JOIN LoanOfficers lo ON uloa.OfficerID = lo.OfficerID
WHERE u.UserID = @UserID;
```

### Get Loan Timeline

```sql
SELECT * FROM LoanTimeline 
WHERE UserID = @UserID 
ORDER BY MilestoneOrder;
```

### Get Pending Documents

```sql
SELECT * FROM Documents 
WHERE UserID = @UserID AND Status = 'Pending' AND IsRequired = 1
ORDER BY DocumentCategory, DocumentType;
```

### Get Unread Messages

```sql
SELECT m.*, 
       lo.FirstName + ' ' + lo.LastName as SenderName
FROM Messages m
LEFT JOIN LoanOfficers lo ON m.SenderType = 'LoanOfficer' AND m.SenderID = lo.OfficerID
WHERE m.RecipientType = 'Borrower' AND m.RecipientID = @UserID AND m.IsRead = 0
ORDER BY m.CreatedAt DESC;
```

### Get Active Rate Lock

```sql
SELECT * FROM RateLocks 
WHERE UserID = @UserID AND Status = 'Active'
ORDER BY CreatedAt DESC;
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 16, 2024 | Initial creation of all tables |

---

*Document created for the Borrower App Enhancement Project*

