# Future Enhancements - Database Schema

This document contains all SQL scripts for the enhanced borrower experience features.

**Date Created:** December 16, 2024  
**Database:** Azure SQL Database

---

## Table of Contents

1. [Mortgage Model Configuration](#mortgage-model-configuration)
2. [Overview](#overview)
3. [New Tables](#new-tables)
4. [Sample Data](#sample-data)
5. [Integration Notes](#integration-notes)

---

## Mortgage Model Configuration

This application uses a mortgage calculation model with the following default configuration (defined in `index.js`):

| Parameter | Value | Description |
|-----------|-------|-------------|
| Bond Rate | 4.00% | Base interest rate (coupon rate) |
| Bidrag Rate | 0.75% | Administration fee |
| **Total Rate** | **4.75%** | Combined annual rate |
| Max LTV | 80% | Maximum loan-to-value ratio |
| Min Down Payment | 20% | Minimum down payment required |
| Loan Term | 30 years | Standard loan term |
| Housing DTI | 30% | Max % of income for housing expense |
| Total DTI | 40% | Max % of income for all debts |
| Stress Test Buffer | 1% | Additional rate buffer for affordability |

### Loan Types Supported

- **Annuity**: Fixed total payment (principal + interest stays constant)
- **Serial**: Fixed principal payment (total payment decreases over time)

### Additional Features

- **Interest-Only Period**: Up to 10 years where only interest and bidrag are paid
- **Payment Frequency**: Monthly (12/year) or Quarterly (4/year)

To modify these defaults, update the `REALKREDIT_CONFIG` object in `index.js`.

---

## Data Persistence for External Systems

To allow external systems (e.g., loan admin portals) to access calculated values without replicating logic, we store key calculations in the database.

### PreApprovalApplications Table Enhancement

Add the `PreApprovedAmount` column to store the calculated value:

```sql
-- Add PreApprovedAmount column to store the calculated loan amount
ALTER TABLE PreApprovalApplications ADD PreApprovedAmount DECIMAL(18,2) NULL;

-- Add calculation parameters used (for audit trail)
ALTER TABLE PreApprovalApplications ADD CalculationParams NVARCHAR(MAX) NULL;
```

The `CalculationParams` stores the model parameters used:
```json
{
  "bondRate": 0.04,
  "bidragRate": 0.0075,
  "loanTermYears": 30,
  "maxHousingDTI": 0.30,
  "maxTotalDTI": 0.40,
  "stressTestBuffer": 0.01,
  "calculatedAt": "2024-12-16T12:00:00Z"
}
```

### View for External Systems

Create a view that provides all key data for external systems:

```sql
CREATE VIEW vw_BorrowerSummary AS
SELECT 
    u.UserID,
    u.Email,
    u.FirstName,
    u.LastName,
    pa.ApplicationID,
    pa.IsPreApproved,
    pa.PreApprovedAmount,
    pa.SubmissionDate AS PreApprovalDate,
    pa.CalculationParams,
    le.InterestRate,
    le.TotalMonthlyPayment,
    le.LoanAmount,
    rl.LockedRate,
    rl.LockExpirationDate,
    lo.FirstName AS LoanOfficerFirstName,
    lo.LastName AS LoanOfficerLastName,
    lo.Email AS LoanOfficerEmail
FROM Users u
LEFT JOIN PreApprovalApplications pa ON u.UserID = pa.UserID
LEFT JOIN LoanEstimates le ON u.UserID = le.UserID
LEFT JOIN RateLocks rl ON u.UserID = rl.UserID
LEFT JOIN UserLoanOfficerAssignments uloa ON u.UserID = uloa.UserID AND uloa.IsActive = 1
LEFT JOIN LoanOfficers lo ON uloa.OfficerID = lo.OfficerID;
```

---

## Overview

These database additions support the following enhanced features:
- **Email/SMS Notifications** - Automated notifications for loan events
- **Credit Score Display** - Store and display credit scores
- **Property Search** - Save and manage favorite properties
- **Mortgage Calculator** - Save calculation scenarios
- **Gamification/Badges** - Achievement badges for borrowers
- **FAQ/Help Center** - Searchable knowledge base
- **Video Call Scheduling** - Book video calls with loan officers
- **E-Sign Documents** - Track electronic signatures
- **Multi-Language Support** - User language preferences

---

## New Tables

### 1. NotificationQueue

Queues email and SMS notifications for sending.

```sql
CREATE TABLE NotificationQueue (
    QueueID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    NotificationType NVARCHAR(20) NOT NULL, -- 'Email', 'SMS', 'Push'
    Recipient NVARCHAR(255) NOT NULL,
    Subject NVARCHAR(255),
    Body NVARCHAR(MAX) NOT NULL,
    TemplateID NVARCHAR(50),
    TemplateData NVARCHAR(MAX), -- JSON
    Priority NVARCHAR(20) DEFAULT 'Normal',
    Status NVARCHAR(20) DEFAULT 'Pending',
    AttemptCount INT DEFAULT 0,
    LastAttemptAt DATETIME2,
    SentAt DATETIME2,
    ErrorMessage NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_NotificationQueue_Status ON NotificationQueue(Status, CreatedAt);
```

**Status Values:**
- `Pending` - Waiting to be sent
- `Sent` - Successfully sent
- `Failed` - Send failed (will retry)
- `Cancelled` - Manually cancelled

---

### 2. NotificationTemplates

Stores reusable notification templates.

```sql
CREATE TABLE NotificationTemplates (
    TemplateID NVARCHAR(50) PRIMARY KEY,
    TemplateName NVARCHAR(100) NOT NULL,
    NotificationType NVARCHAR(20) NOT NULL,
    Subject NVARCHAR(255),
    BodyTemplate NVARCHAR(MAX) NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Template Variables:**
- `{{firstName}}` - User's first name
- `{{partnerName}}` - White-label partner name
- `{{preApprovedAmount}}` - Pre-approved loan amount
- `{{loginLink}}` - Link to login page
- See full list in templates

---

### 3. CreditScores

Stores credit score records from bureau pulls.

```sql
CREATE TABLE CreditScores (
    ScoreID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    Bureau NVARCHAR(50) NOT NULL, -- Experian, TransUnion, Equifax
    Score INT,
    ScoreRange NVARCHAR(50),
    Factors NVARCHAR(MAX), -- JSON array
    PullDate DATETIME2 DEFAULT GETDATE(),
    ExpiresAt DATETIME2,
    ConsentGiven BIT DEFAULT 0,
    ConsentDate DATETIME2,
    RawData NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_CreditScores_User ON CreditScores(UserID, PullDate DESC);
```

---

### 4. SavedProperties

Stores properties saved by users during house hunting.

```sql
CREATE TABLE SavedProperties (
    SavedPropertyID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    PropertySource NVARCHAR(50), -- 'Zillow', 'MLS', 'Manual'
    ExternalID NVARCHAR(100),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(50),
    ZipCode NVARCHAR(20),
    Price DECIMAL(18,2),
    Bedrooms INT,
    Bathrooms DECIMAL(4,2),
    SquareFeet INT,
    YearBuilt INT,
    PropertyType NVARCHAR(50),
    ListingStatus NVARCHAR(50),
    ImageURL NVARCHAR(500),
    ListingURL NVARCHAR(500),
    Notes NVARCHAR(MAX),
    IsFavorite BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_SavedProperties_User ON SavedProperties(UserID, IsFavorite DESC);
```

---

### 5. MortgageCalculations (Danish Realkredit Model)

Stores saved mortgage calculation scenarios following the Danish realkredit model.

**Key Danish Realkredit Features:**
- **Bond Rate + Bidrag**: Total rate = Bond coupon rate + Administration fee (bidrag)
- **Loan Types**: Annuity (fixed total payment) or Serial (fixed principal payment)
- **Interest-Only Period**: Up to 10 years where only interest and bidrag are paid
- **Payment Frequency**: Monthly (12/year) or Quarterly (4/year)
- **Max LTV**: 80% (minimum 20% down payment required)

```sql
CREATE TABLE MortgageCalculations (
    CalculationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT,
    CalculationName NVARCHAR(100),
    HomePrice DECIMAL(18,2),
    DownPayment DECIMAL(18,2),
    DownPaymentPercent DECIMAL(5,2),
    LoanAmount DECIMAL(18,2),
    InterestRate DECIMAL(5,4),             -- Bond rate (coupon rate)
    BidragRate DECIMAL(5,4) DEFAULT 0,     -- Administration fee (typically 0.4-1.2%)
    LoanTermYears INT,
    LoanType NVARCHAR(20) DEFAULT 'annuity', -- 'annuity' or 'serial'
    PaymentFrequency NVARCHAR(20) DEFAULT 'monthly', -- 'monthly' or 'quarterly'
    InterestOnlyYears INT DEFAULT 0,       -- Interest-only period (0-10 years)
    PropertyTaxAnnual DECIMAL(18,2),
    HomeInsuranceAnnual DECIMAL(18,2),
    PeriodPayment DECIMAL(18,2),           -- Payment per period (principal + interest + bidrag)
    PeriodTax DECIMAL(18,2),
    PeriodInsurance DECIMAL(18,2),
    TotalPeriodPayment DECIMAL(18,2),
    TotalInterestPaid DECIMAL(18,2),
    TotalBidragPaid DECIMAL(18,2) DEFAULT 0,
    IsSaved BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

**Note**: If you already have the old MortgageCalculations table, run this ALTER script to add the new columns:

```sql
-- Add Danish realkredit columns to existing table
ALTER TABLE MortgageCalculations ADD BidragRate DECIMAL(5,4) DEFAULT 0;
ALTER TABLE MortgageCalculations ADD LoanType NVARCHAR(20) DEFAULT 'annuity';
ALTER TABLE MortgageCalculations ADD PaymentFrequency NVARCHAR(20) DEFAULT 'monthly';
ALTER TABLE MortgageCalculations ADD InterestOnlyYears INT DEFAULT 0;
ALTER TABLE MortgageCalculations ADD PropertyTaxAnnual DECIMAL(18,2);
ALTER TABLE MortgageCalculations ADD PeriodPayment DECIMAL(18,2);
ALTER TABLE MortgageCalculations ADD PeriodTax DECIMAL(18,2);
ALTER TABLE MortgageCalculations ADD PeriodInsurance DECIMAL(18,2);
ALTER TABLE MortgageCalculations ADD TotalPeriodPayment DECIMAL(18,2);
ALTER TABLE MortgageCalculations ADD TotalBidragPaid DECIMAL(18,2) DEFAULT 0;
```

---

### 6. Badges & UserBadges

Gamification system for borrower achievements.

```sql
CREATE TABLE Badges (
    BadgeID INT IDENTITY(1,1) PRIMARY KEY,
    BadgeName NVARCHAR(100) NOT NULL,
    BadgeDescription NVARCHAR(500),
    BadgeIcon NVARCHAR(100),
    BadgeColor NVARCHAR(20),
    Category NVARCHAR(50),
    PointsValue INT DEFAULT 0,
    TriggerCondition NVARCHAR(100),
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE UserBadges (
    UserBadgeID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    BadgeID INT NOT NULL,
    EarnedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_UserBadges_Badge FOREIGN KEY (BadgeID) REFERENCES Badges(BadgeID)
);

CREATE INDEX IX_UserBadges_User ON UserBadges(UserID);
```

**Default Badges:**
| Badge | Description | Points |
|-------|-------------|--------|
| First Steps | Created account | 10 |
| Pre-Approved | Completed pre-approval | 50 |
| Document Pro | All docs uploaded | 30 |
| Fully Applied | Application submitted | 100 |
| Communicator | Sent first message | 15 |
| Quick Responder | Responded within 24hrs | 20 |
| Home Hunter | Saved 5 properties | 25 |
| Calculator Whiz | Saved 3 calculations | 15 |
| Informed Buyer | Read 10 FAQs | 20 |
| Clear to Close | CTC status | 200 |
| Homeowner | Loan funded | 500 |

---

### 7. FAQCategories & FAQArticles

Help center knowledge base.

```sql
CREATE TABLE FAQCategories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    CategoryDescription NVARCHAR(500),
    IconName NVARCHAR(50),
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE FAQArticles (
    ArticleID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL,
    Question NVARCHAR(500) NOT NULL,
    Answer NVARCHAR(MAX) NOT NULL,
    SearchKeywords NVARCHAR(500),
    ViewCount INT DEFAULT 0,
    HelpfulCount INT DEFAULT 0,
    NotHelpfulCount INT DEFAULT 0,
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_FAQ_Category FOREIGN KEY (CategoryID) REFERENCES FAQCategories(CategoryID)
);

CREATE INDEX IX_FAQ_Search ON FAQArticles(SearchKeywords);
```

---

### 8. VideoCallSlots & VideoCallBookings

Video call scheduling system.

```sql
CREATE TABLE VideoCallSlots (
    SlotID INT IDENTITY(1,1) PRIMARY KEY,
    OfficerID INT NOT NULL,
    SlotDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsAvailable BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_VideoSlot_Officer FOREIGN KEY (OfficerID) REFERENCES LoanOfficers(OfficerID)
);

CREATE TABLE VideoCallBookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    OfficerID INT NOT NULL,
    SlotID INT,
    ScheduledDate DATE NOT NULL,
    ScheduledTime TIME NOT NULL,
    Duration INT DEFAULT 30,
    MeetingLink NVARCHAR(500),
    MeetingProvider NVARCHAR(50),
    Topic NVARCHAR(255),
    Notes NVARCHAR(MAX),
    Status NVARCHAR(50) DEFAULT 'Scheduled',
    ReminderSent BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_VideoBooking_Officer FOREIGN KEY (OfficerID) REFERENCES LoanOfficers(OfficerID)
);

CREATE INDEX IX_VideoBookings_User ON VideoCallBookings(UserID, ScheduledDate);
CREATE INDEX IX_VideoBookings_Officer ON VideoCallBookings(OfficerID, ScheduledDate);
```

---

### 9. ESignDocuments

Tracks e-signature status for documents.

```sql
CREATE TABLE ESignDocuments (
    ESignID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ApplicationID INT,
    DocumentType NVARCHAR(100) NOT NULL,
    DocumentName NVARCHAR(255) NOT NULL,
    Provider NVARCHAR(50),
    ExternalEnvelopeID NVARCHAR(100),
    ExternalDocumentID NVARCHAR(100),
    Status NVARCHAR(50) DEFAULT 'Pending',
    SignerEmail NVARCHAR(255),
    SignerName NVARCHAR(255),
    SentAt DATETIME2,
    ViewedAt DATETIME2,
    SignedAt DATETIME2,
    ExpiresAt DATETIME2,
    SignedDocumentURL NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_ESign_User ON ESignDocuments(UserID, Status);
```

---

### 10. UserPreferences Update

Add language preference to existing table.

```sql
ALTER TABLE UserPreferences ADD 
    PreferredLanguage NVARCHAR(10) DEFAULT 'en';
```

---

## Sample Data

### Default Badges

```sql
INSERT INTO Badges (BadgeName, BadgeDescription, BadgeIcon, BadgeColor, Category, PointsValue, TriggerCondition, DisplayOrder) VALUES
('First Steps', 'Created your account', 'user-plus', '#3B82F6', 'Onboarding', 10, 'account_created', 1),
('Pre-Approved', 'Completed pre-approval process', 'check-circle', '#10B981', 'Milestones', 50, 'pre_approval_complete', 2),
('Document Pro', 'Uploaded all required documents', 'folder-check', '#8B5CF6', 'Documents', 30, 'all_docs_uploaded', 3),
('Fully Applied', 'Submitted complete mortgage application', 'file-text', '#F59E0B', 'Milestones', 100, 'application_submitted', 4),
('Communicator', 'Sent first message to loan officer', 'message-circle', '#06B6D4', 'Engagement', 15, 'first_message_sent', 5),
('Quick Responder', 'Responded to action item within 24 hours', 'zap', '#EF4444', 'Engagement', 20, 'quick_response', 6),
('Home Hunter', 'Saved 5 properties', 'home', '#EC4899', 'Property', 25, 'saved_5_properties', 7),
('Calculator Whiz', 'Saved 3 mortgage calculations', 'calculator', '#6366F1', 'Tools', 15, 'saved_3_calculations', 8),
('Informed Buyer', 'Read 10 FAQ articles', 'book-open', '#14B8A6', 'Education', 20, 'read_10_faqs', 9),
('Clear to Close', 'Received clear to close status', 'award', '#F97316', 'Milestones', 200, 'clear_to_close', 10),
('Homeowner', 'Loan funded and closed', 'key', '#84CC16', 'Milestones', 500, 'loan_funded', 11);
```

### FAQ Categories

```sql
INSERT INTO FAQCategories (CategoryName, CategoryDescription, IconName, DisplayOrder) VALUES
('Getting Started', 'Everything you need to know to begin your mortgage journey', 'play-circle', 1),
('Pre-Approval', 'Questions about the pre-approval process', 'check-square', 2),
('Documents', 'What documents you need and how to submit them', 'file-text', 3),
('Loan Types', 'Understanding different mortgage options', 'layers', 4),
('Rates & Costs', 'Interest rates, closing costs, and fees explained', 'dollar-sign', 5),
('The Process', 'What to expect from application to closing', 'git-branch', 6),
('After Closing', 'Post-closing questions and homeownership tips', 'home', 7);
```

### Notification Templates

```sql
INSERT INTO NotificationTemplates (TemplateID, TemplateName, NotificationType, Subject, BodyTemplate) VALUES
('welcome_email', 'Welcome Email', 'Email', 'Welcome to {{partnerName}}!', 'Hi {{firstName}},\n\nWelcome to {{partnerName}}! We''re excited to help you on your journey to homeownership.\n\nYour next step is to complete your pre-approval, which takes just 5-10 minutes.\n\nGet started here: {{preApprovalLink}}\n\nQuestions? Reply to this email or call us at {{supportPhone}}.\n\nBest regards,\nThe {{partnerName}} Team'),
('pre_approval_complete', 'Pre-Approval Complete', 'Email', 'Congratulations! You''re Pre-Approved', 'Hi {{firstName}},\n\nGreat news! You''ve been pre-approved for up to ${{preApprovedAmount}}.\n\nLog in to continue: {{loginLink}}\n\nCongratulations!\nThe {{partnerName}} Team'),
('document_approved', 'Document Approved', 'Email', 'Document Approved: {{documentType}}', 'Hi {{firstName}},\n\nGood news! Your {{documentType}} has been reviewed and approved.\n\nThank you,\nThe {{partnerName}} Team'),
('document_rejected', 'Document Rejected', 'Email', 'Action Required: Please Resubmit {{documentType}}', 'Hi {{firstName}},\n\nWe need you to resubmit your {{documentType}}.\n\nReason: {{rejectionReason}}\n\nThank you,\nThe {{partnerName}} Team'),
('clear_to_close', 'Clear to Close', 'Email', '🎉 Congratulations! You''re Clear to Close!', 'Hi {{firstName}},\n\n🎉 CONGRATULATIONS! 🎉\n\nYou''ve received Clear to Close!\n\nClosing Date: {{closingDate}}\nCash to Close: ${{cashToClose}}\n\nCongratulations!\nThe {{partnerName}} Team');
```

---

## Integration Notes

### Email Service
To send emails, integrate with one of:
- SendGrid (recommended)
- Mailgun
- Amazon SES
- SMTP server

### SMS Service
To send SMS, integrate with:
- Twilio (recommended)
- Vonage (Nexmo)
- Amazon SNS

### Video Conferencing
For video calls, integrate with:
- Zoom API
- Microsoft Teams
- Google Meet

### E-Signature
For document signing, integrate with:
- DocuSign
- HelloSign
- Adobe Sign

### Property Data
For property search, integrate with:
- Zillow API
- Realtor.com API
- MLS data providers

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 16, 2024 | Initial creation - Core dashboard features |
| 1.1 | Dec 16, 2024 | Added future enhancements - Calculator, Property Search, Video Calls, FAQ, Badges |

---

*Document created for the Borrower App Enhancement Project*

