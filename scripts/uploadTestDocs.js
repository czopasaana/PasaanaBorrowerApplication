/**
 * Upload Test Documents to Azure Blob Storage
 * 
 * This script uploads the generated test documents to Azure Blob Storage
 * and links them to the test users in the database.
 * 
 * Run: node scripts/uploadTestDocs.js
 */

require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { getConnection } = require('../Db');

const TEST_DOCS_DIR = path.join(__dirname, '../test-documents');

// Azure Blob Storage setup - prefer connection string over SAS token
let blobServiceClient;

if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.log('✅ Using AZURE_STORAGE_CONNECTION_STRING for authentication');
  blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
} else {
  console.log('Using SAS Token for authentication');
  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  let sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const sasPrefix = sasToken.startsWith('?') ? '' : '?';
  sasToken = sasPrefix + sasToken;
  console.log(`Storage account: ${storageAccountName}`);
  console.log(`SAS token starts with: ${sasToken.substring(0, 20)}...`);
  blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net${sasToken}`
  );
}

// Container names from .env (matching the main app's env variables)
const CONTAINERS = {
  identification: process.env.AZURE_STORAGE_CONTAINER_NAME_IDENTIFICATION || 'identification-docs',
  income: process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME || 'income-docs',
  assets: process.env.AZURE_STORAGE_CONTAINER_NAME_ASSET || 'asset-docs',
  liabilities: process.env.AZURE_STORAGE_CONTAINER_NAME_LIABILITY || 'liability-docs',
  purchaseAgreement: process.env.AZURE_STORAGE_CONTAINER_NAME_PURCHASE || 'purchase-agreement-docs',
  giftLetter: process.env.AZURE_STORAGE_CONTAINER_NAME_GIFTLETTER || 'gift-letter-docs',
  authorization: process.env.AZURE_STORAGE_CONTAINER_NAME_AUTHORIZATION || 'authorization-docs'
};

console.log('Container names:', CONTAINERS);

// Map test user emails to their COMPLETE document sets
// Each user (except denied.nodocs) has ALL required documents for AI agent processing
const USER_DOC_MAPPING = {
  // ==========================================
  // APPROVED SCENARIOS - Complete Document Sets
  // ==========================================
  
  'approved.w2@test.com': {
    prefix: 'approved-w2',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023',
        'tax-return-2023',
        'tax-return-2024'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'credit-card-chase-visa-2025-12',  // $150/month credit card
        'auto-loan-2025-12'                 // $350/month auto loan
      ],
      purchaseAgreement: ['purchase-agreement-michael-johnson'],
      authorization: ['authorization']
    }
  },
  
  'approved.dual@test.com': {
    prefix: 'approved-dual',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'auto-loan-2025-12',             // $500/month auto loan
        'credit-card-discover-2025-12',  // $200/month credit card
        'student-loan-2025-12'           // $100/month student loan
      ],
      purchaseAgreement: ['purchase-agreement-sarah-williams'],
      authorization: ['authorization']
    }
  },
  
  'approved.selfemployed@test.com': {
    prefix: 'approved-selfemployed',
    docs: {
      identification: ['drivers-license'],
      income: [
        'profit-loss-2024', 
        'profit-loss-2025-YTD',
        'tax-return-2023',
        'tax-return-2024'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'auto-loan-2025-12',                     // $750/month BMW auto loan
        'credit-card-chase-sapphire-reserve-2025-12',  // $250/month Chase Sapphire
        'credit-card-amex-platinum-2025-12'           // $200/month Amex Platinum
      ],
      purchaseAgreement: ['purchase-agreement-robert-chen'],
      authorization: ['authorization']
    }
  },
  
  // Note: VA loans not supported in Danish realkredit style - approved.veteran@test.com removed
  
  // ==========================================
  // DENIED SCENARIOS - Complete Document Sets (denial for specific reason, not missing docs)
  // ==========================================
  
  'denied.highdti@test.com': {
    prefix: 'denied-highdti',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      // ALL liabilities must be documented to show the high DTI
      liabilities: [
        'credit-card-capital-one-2025-12',
        'credit-card-discover-2025-12',
        'auto-loan-2025-12',
        'student-loan-2025-12'
      ],
      purchaseAgreement: ['purchase-agreement-kevin-miller'],
      authorization: ['authorization']
    }
  },
  
  'denied.badcredit@test.com': {
    prefix: 'denied-badcredit',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'credit-card-wells-fargo-2025-12',  // $150/month credit card
        'auto-loan-2025-12',                 // $350/month auto loan
        'student-loan-2025-12'               // $100/month student loan
      ],
      purchaseAgreement: ['purchase-agreement-lisa-thompson'],
      authorization: ['authorization']
    }
  },
  
  // NOTE: denied.nodocs@test.com intentionally excluded - that's the test case for missing docs
  
  // ==========================================
  // EDGE CASES - Complete Document Sets with Scenario-Specific Documents
  // ==========================================
  
  'edge.investment@test.com': {
    prefix: 'edge-investment',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023', 
        'rental-income',      // Rental income from existing properties
        'tax-return-2023',    // Tax returns show rental income
        'tax-return-2024'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'mortgage-statement',                 // Existing mortgages on rental properties ($2500/month)
        'credit-card-chase-freedom-2025-12',  // $150/month credit card
        'credit-card-amex-gold-2025-12'       // $150/month credit card
      ],
      purchaseAgreement: ['purchase-agreement-david-park'],
      authorization: ['authorization']
    }
  },
  
  'edge.refinance@test.com': {
    prefix: 'edge-refinance',
    docs: {
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023'
      ],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: [
        'mortgage-statement',                     // Current mortgage being refinanced
        'auto-loan-2025-12',                      // $400/month auto loan
        'credit-card-citi-double-cash-2025-12',   // $200/month credit card
        'credit-card-target-redcard-2025-12',     // $100/month credit card
        'student-loan-2025-12'                    // $100/month student loan
      ],
      // NO purchase agreement for refinance
      authorization: ['authorization']
    }
  },
  
  'edge.giftfunds@test.com': {
    prefix: 'edge-giftfunds',
    docs: {
      // COMPLETE document set - not just gift letter!
      identification: ['drivers-license'],
      income: [
        'paystub-2025-11-15_to_2025-11-30', 
        'paystub-2025-12-01_to_2025-12-15', 
        'w2-2024', 
        'w2-2023'
      ],
      assets: [
        'bank-statement-2025-10', 
        'bank-statement-2025-11', 
        'bank-statement-2025-12',
        'donor-bank-statement'  // Donor's bank statement proving funds
      ],
      liabilities: [
        'credit-card-bank-of-america-2025-12',  // $150/month credit card
        'student-loan-2025-12'                   // $200/month student loan
      ],
      giftLetter: ['gift-letter-emily-garcia'],
      purchaseAgreement: ['purchase-agreement-emily-garcia'],
      authorization: ['authorization']
    }
  },
  
  'edge.nonresident@test.com': {
    prefix: 'edge-nonresident',
    docs: {
      identification: ['passport'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-hiroshi-tanaka'],
      authorization: ['authorization']
    }
  },

  // ============================================================================
  // NEW APPROVED SCENARIOS
  // ============================================================================

  'approved.conditional@test.com': {
    prefix: 'approved-conditional',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-capital-one-2025-12', 'student-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-patricia-nelson'],
      authorization: ['authorization']
    }
  },

  'approved.plaid@test.com': {
    prefix: 'approved-plaid',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-andrew-mitchell'],
      authorization: ['authorization']
    }
  },

  // Note: FHA loans not supported in Danish realkredit style - borrower.firsttime@test.com removed

  'coborrower.nonoccupant@test.com': {
    prefix: 'coborrower-nonoccupant',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['credit-card-chase-2025-12', 'student-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-michelle-taylor'],
      authorization: ['authorization']
    }
  },

  // ============================================================================
  // NEW DENIED SCENARIOS
  // ============================================================================

  'denied.bankruptcyrecent@test.com': {
    prefix: 'denied-bankruptcyrecent',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-capital-one-secured-2025-12'],
      purchaseAgreement: ['purchase-agreement-brandon-davis'],
      authorization: ['authorization']
    }
  },

  'denied.lates30@test.com': {
    prefix: 'denied-lates30',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-discover-2025-12'],
      authorization: ['authorization']
    }
  },

  'denied.lates60@test.com': {
    prefix: 'denied-lates60',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-amex-2025-12'],
      authorization: ['authorization']
    }
  },

  'denied.judgment@test.com': {
    prefix: 'denied-judgment',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-wells-fargo-2025-12'],
      purchaseAgreement: ['purchase-agreement-daniel-garcia'],
      authorization: ['authorization']
    }
  },

  'denied.secondhomecredit@test.com': {
    prefix: 'denied-secondhomecredit',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-chase-sapphire-2025-12'],
      purchaseAgreement: ['purchase-agreement-stephanie-lee'],
      authorization: ['authorization']
    }
  },

  'denied.investmentcredit@test.com': {
    prefix: 'denied-investmentcredit',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-amex-platinum-2025-12'],
      purchaseAgreement: ['purchase-agreement-gregory-adams'],
      authorization: ['authorization']
    }
  },

  // ============================================================================
  // PRODUCT VARIATIONS
  // ============================================================================

  'product.15year@test.com': {
    prefix: 'product-15year',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-chase-freedom-unlimited-2025-12'],
      purchaseAgreement: ['purchase-agreement-catherine-wright'],
      authorization: ['authorization']
    }
  },

  'product.arm5@test.com': {
    prefix: 'product-arm5',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-thomas-baker'],
      authorization: ['authorization']
    }
  },

  'product.arm1@test.com': {
    prefix: 'product-arm1',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-rebecca-hill'],
      authorization: ['authorization']
    }
  },

  'occupancy.secondhome@test.com': {
    prefix: 'occupancy-secondhome',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-amex-black-2025-12'],
      purchaseAgreement: ['purchase-agreement-william-scott'],
      authorization: ['authorization']
    }
  },

  // ============================================================================
  // INCOME TYPE VARIATIONS
  // ============================================================================

  'income.1099@test.com': {
    prefix: 'income-1099',
    docs: {
      identification: ['drivers-license'],
      income: ['tax-return-2023', 'tax-return-2024', 'profit-loss-2024', 'profit-loss-2025-YTD'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-chase-ink-2025-12'],
      purchaseAgreement: ['purchase-agreement-jennifer-moore'],
      authorization: ['authorization']
    }
  },

  'income.commission@test.com': {
    prefix: 'income-commission',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-amex-gold-2025-12'],
      purchaseAgreement: ['purchase-agreement-mark-robinson'],
      authorization: ['authorization']
    }
  },

  'income.multiple@test.com': {
    prefix: 'income-multiple',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024', 'rental-income'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-chase-sapphire-preferred-2025-12'],
      purchaseAgreement: ['purchase-agreement-elizabeth-clark'],
      authorization: ['authorization']
    }
  },

  'income.retired@test.com': {
    prefix: 'income-retired',
    docs: {
      identification: ['drivers-license'],
      income: ['tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-robert-lewis'],
      authorization: ['authorization']
    }
  },

  'income.socialsecurity@test.com': {
    prefix: 'income-socialsecurity',
    docs: {
      identification: ['drivers-license'],
      income: ['tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['credit-card-aarp-visa-2025-12'],
      purchaseAgreement: ['purchase-agreement-dorothy-walker'],
      authorization: ['authorization']
    }
  },

  'income.alimony@test.com': {
    prefix: 'income-alimony',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-capital-one-2025-12'],
      purchaseAgreement: ['purchase-agreement-susan-hall'],
      authorization: ['authorization']
    }
  },

  'edge.newjob@test.com': {
    prefix: 'edge-newjob',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'student-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-brian-young'],
      authorization: ['authorization']
    }
  },

  // ============================================================================
  // ADDITIONAL EDGE CASES
  // ============================================================================

  'edge.creditfloor@test.com': {
    prefix: 'edge-creditfloor',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-capital-one-secured-2025-12'],
      purchaseAgreement: ['purchase-agreement-marcus-green'],
      authorization: ['authorization']
    }
  },

  'edge.bankruptcy@test.com': {
    prefix: 'edge-bankruptcy',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-opensky-secured-2025-12'],
      purchaseAgreement: ['purchase-agreement-rachel-turner'],
      authorization: ['authorization']
    }
  },

  'edge.foreclosure@test.com': {
    prefix: 'edge-foreclosure',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-discover-2025-12'],
      purchaseAgreement: ['purchase-agreement-kenneth-hughes'],
      authorization: ['authorization']
    }
  },

  'edge.dti43@test.com': {
    prefix: 'edge-dti43',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'student-loan-2025-12', 'credit-card-chase-2025-12'],
      purchaseAgreement: ['purchase-agreement-angela-king'],
      authorization: ['authorization']
    }
  },

  'edge.reservesfloor@test.com': {
    prefix: 'edge-reservesfloor',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-discover-2025-12'],
      purchaseAgreement: ['purchase-agreement-timothy-evans'],
      authorization: ['authorization']
    }
  },

  'edge.largedeposit@test.com': {
    prefix: 'edge-largedeposit',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-amex-2025-12'],
      purchaseAgreement: ['purchase-agreement-nicole-phillips'],
      authorization: ['authorization']
    }
  },

  'edge.highutilization@test.com': {
    prefix: 'edge-highutilization',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['credit-card-chase-2025-12', 'credit-card-discover-2025-12', 'auto-loan-2025-12'],
      purchaseAgreement: ['purchase-agreement-jason-campbell'],
      authorization: ['authorization']
    }
  },

  'edge.nsf@test.com': {
    prefix: 'edge-nsf',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-capital-one-2025-12'],
      purchaseAgreement: ['purchase-agreement-melissa-roberts'],
      authorization: ['authorization']
    }
  },

  'edge.deferredloans@test.com': {
    prefix: 'edge-deferredloans',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['student-loan-2025-12', 'credit-card-chase-2025-12'],
      purchaseAgreement: ['purchase-agreement-ryan-collins'],
      authorization: ['authorization']
    }
  },

  'edge.multiplereo@test.com': {
    prefix: 'edge-multiplereo',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024', 'rental-income'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['mortgage-statement', 'auto-loan-2025-12', 'credit-card-amex-centurion-2025-12'],
      purchaseAgreement: ['purchase-agreement-steven-peterson'],
      authorization: ['authorization']
    }
  },

  // Note: DPA programs not supported in Danish realkredit style - edge.dpa@test.com removed

  'edge.sellerconcession@test.com': {
    prefix: 'edge-sellerconcession',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-citi-2025-12'],
      purchaseAgreement: ['purchase-agreement-laura-morris'],
      authorization: ['authorization']
    }
  },

  'edge.trust@test.com': {
    prefix: 'edge-trust',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023', 'tax-return-2023', 'tax-return-2024'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-jp-morgan-private-2025-12'],
      purchaseAgreement: ['purchase-agreement-richard-nelson'],
      authorization: ['authorization']
    }
  },

  'stage1.preapproval@test.com': {
    prefix: 'stage1-preapproval',
    docs: {
      identification: ['drivers-license'],
      income: ['paystub-2025-11-15_to_2025-11-30', 'paystub-2025-12-01_to_2025-12-15', 'w2-2024', 'w2-2023'],
      assets: ['bank-statement-2025-10', 'bank-statement-2025-11', 'bank-statement-2025-12'],
      liabilities: ['auto-loan-2025-12', 'credit-card-chase-2025-12'],
      authorization: ['authorization']
    }
  }
};

// Generate blob name matching the real app format: user-{userId}-{timestamp}-{random}.{ext}
function generateBlobName(userId, filename) {
  const extension = filename.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 12);
  return `user-${userId}-${timestamp}-${random}.${extension}`;
}

async function uploadToBlob(containerName, blobName, filePath) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create container if it doesn't exist (private access - no public access)
    await containerClient.createIfNotExists();
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const fileBuffer = fs.readFileSync(filePath);
    
    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' }
    });
    
    console.log(`   ✅ Uploaded: ${blobName}`);
    return blobName; // Return just the blob name, not URL
  } catch (error) {
    console.error(`   ❌ Failed to upload ${blobName}: ${error.message}`);
    return null;
  }
}

async function uploadTestDocuments() {
  let pool;
  
  try {
    console.log('🔄 Connecting to database...');
    pool = await getConnection();
    console.log('✅ Connected to database\n');

    console.log('📤 Uploading test documents to Azure Blob Storage...\n');

    for (const [email, mapping] of Object.entries(USER_DOC_MAPPING)) {
      console.log(`\n👤 Processing: ${email}`);
      
      // Get user ID
      const userResult = await pool.request()
        .input('email', sql.VarChar, email)
        .query('SELECT UserID FROM Users WHERE Email = @email');
      
      if (userResult.recordset.length === 0) {
        console.log(`   ⚠️  User not found, skipping...`);
        continue;
      }
      
      const userId = userResult.recordset[0].UserID;
      console.log(`   User ID: ${userId}`);

      // Process each document category
      for (const [docType, docNames] of Object.entries(mapping.docs)) {
        const containerName = CONTAINERS[docType];
        if (!containerName) {
          console.log(`   ⚠️  No container configured for ${docType}`);
          continue;
        }

        for (const docName of docNames) {
          // Build filename
          // Note: Purchase agreements and gift letters are NOT prefixed - they use the buyer/recipient name directly
          let filename;
          const noPrefixTypes = ['purchaseAgreement', 'giftLetter'];
          
          if (mapping.prefix && !noPrefixTypes.includes(docType)) {
            filename = `${mapping.prefix}-${docName}.pdf`;
          } else {
            filename = `${docName}.pdf`;
          }
          
          const filePath = path.join(TEST_DOCS_DIR, filename);
          
          if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  File not found: ${filename}`);
            continue;
          }

          // Upload to blob using the correct naming format
          const blobName = generateBlobName(userId, filename);
          console.log(`   📄 Uploading ${filename} to ${containerName} as ${blobName}...`);
          
          const uploadedBlobName = await uploadToBlob(containerName, blobName, filePath);
          
          if (uploadedBlobName) {
            console.log(`      ✅ Uploaded to blob: ${uploadedBlobName}`);
            
            // Save to appropriate database table with correct format and flags
            try {
              await saveDocumentRecord(pool, userId, docType, uploadedBlobName, filename);
              console.log(`      ✅ Database record created`);
            } catch (dbError) {
              console.log(`      ⚠️  DB record failed: ${dbError.message}`);
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DOCUMENT UPLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTest users now have documents in their profiles.');
    console.log('Login with any test account to verify.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

async function saveDocumentRecord(pool, userId, docType, blobName, filename) {
  // The database stores the blob name (flat format), not full URL
  // The app generates full URLs with SAS token when displaying
  // blobName format: "user-{userId}-{timestamp}-{random}.pdf"
  const storedBlobName = blobName;
  
  switch (docType) {
    case 'identification':
      // Check if record exists
      const idExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM IdentificationDocuments WHERE UserID = @UserID');
      
      if (idExists.recordset.length > 0) {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('IDFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE IdentificationDocuments 
            SET IDFilePath = @IDFilePath, ApplicationStatus = @ApplicationStatus, UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('IDFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO IdentificationDocuments (UserID, IDFilePath, ApplicationStatus)
            VALUES (@UserID, @IDFilePath, @ApplicationStatus)
          `);
      }
      break;

    case 'income':
      // Determine which field and uploaded flag to update based on filename
      // Check in order of specificity - paystub BEFORE w2 since filenames like 'approved-w2-paystub.pdf' exist
      let incomeField = 'PayStubsFiles';
      let incomeUploadedFlag = 'PayStubsUploaded';
      
      if (filename.includes('paystub')) {
        // Check paystub FIRST (highest priority) 
        incomeField = 'PayStubsFiles';
        incomeUploadedFlag = 'PayStubsUploaded';
      } else if (filename.includes('profit') || filename.includes('pnl') || filename.includes('p-l') || filename.includes('rental')) {
        // P&L and rental income statements
        incomeField = 'PnLFiles';
        incomeUploadedFlag = 'PnLUploaded';
      } else if (filename.includes('1099')) {
        incomeField = 'Form1099Files';
        incomeUploadedFlag = 'Form1099sUploaded';
      } else if (filename.includes('tax')) {
        incomeField = 'TaxReturnsFiles';
        incomeUploadedFlag = 'TaxReturnsUploaded';
      } else if (filename.includes('w2')) {
        // W2 check at the end since many filenames contain 'w2' as prefix
        incomeField = 'W2Files';
        incomeUploadedFlag = 'W2sUploaded';
      }
      
      // Get existing files or create new record
      const incomeExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM IncomeVerificationDocuments WHERE UserID = @UserID');
      
      let currentIncomeFiles = '';
      if (incomeExists.recordset.length > 0 && incomeExists.recordset[0][incomeField]) {
        currentIncomeFiles = incomeExists.recordset[0][incomeField];
      }
      
      // Append new blob name (just the filename, not URL)
      const newIncomeFiles = currentIncomeFiles ? `${currentIncomeFiles},${storedBlobName}` : storedBlobName;
      
      if (incomeExists.recordset.length > 0) {
        // Update with new file AND set the uploaded flag to 1
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('Files', sql.NVarChar(sql.MAX), newIncomeFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE IncomeVerificationDocuments 
            SET ${incomeField} = @Files, 
                ${incomeUploadedFlag} = 1,
                ApplicationStatus = @ApplicationStatus, 
                UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        // Insert with uploaded flag set to 1
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('Files', sql.NVarChar(sql.MAX), newIncomeFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO IncomeVerificationDocuments (UserID, ${incomeField}, ${incomeUploadedFlag}, ApplicationStatus)
            VALUES (@UserID, @Files, 1, @ApplicationStatus)
          `);
      }
      break;

    case 'assets':
      const assetExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM AssetVerificationDocuments WHERE UserID = @UserID');
      
      let currentAssetFiles = '';
      if (assetExists.recordset.length > 0 && assetExists.recordset[0].BankStatementsFiles) {
        currentAssetFiles = assetExists.recordset[0].BankStatementsFiles;
      }
      
      const newAssetFiles = currentAssetFiles ? `${currentAssetFiles},${storedBlobName}` : storedBlobName;
      
      if (assetExists.recordset.length > 0) {
        // Update with new file AND set BankStatementsUploaded to 1
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('BankStatementsFiles', sql.NVarChar(sql.MAX), newAssetFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE AssetVerificationDocuments 
            SET BankStatementsFiles = @BankStatementsFiles, 
                BankStatementsUploaded = 1,
                ApplicationStatus = @ApplicationStatus, 
                UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        // Insert with BankStatementsUploaded set to 1
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('BankStatementsFiles', sql.NVarChar(sql.MAX), newAssetFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO AssetVerificationDocuments (UserID, BankStatementsFiles, BankStatementsUploaded, ApplicationStatus)
            VALUES (@UserID, @BankStatementsFiles, 1, @ApplicationStatus)
          `);
      }
      break;

    case 'liabilities':
      // Determine which liability type based on filename
      let liabilityField = 'MortgageStatementFiles';
      let liabilityUploadedFlag = 'MortgageStatementUploaded';
      
      if (filename.includes('credit-card')) {
        liabilityField = 'CreditCardStatementsFiles';
        liabilityUploadedFlag = 'CreditCardStatementsUploaded';
      } else if (filename.includes('auto-loan')) {
        liabilityField = 'AutoLoanStatementsFiles';
        liabilityUploadedFlag = 'AutoLoanStatementsUploaded';
      } else if (filename.includes('student-loan')) {
        liabilityField = 'StudentLoanStatementsFiles';
        liabilityUploadedFlag = 'StudentLoanStatementsUploaded';
      } else if (filename.includes('mortgage')) {
        liabilityField = 'MortgageStatementFiles';
        liabilityUploadedFlag = 'MortgageStatementUploaded';
      }
      
      const liabilityExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM LiabilityVerificationDocuments WHERE UserID = @UserID');
      
      // Get existing files for this field
      let currentLiabilityFiles = '';
      if (liabilityExists.recordset.length > 0 && liabilityExists.recordset[0][liabilityField]) {
        currentLiabilityFiles = liabilityExists.recordset[0][liabilityField];
      }
      
      // Append new blob name
      const newLiabilityFiles = currentLiabilityFiles ? `${currentLiabilityFiles},${storedBlobName}` : storedBlobName;
      
      if (liabilityExists.recordset.length > 0) {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('Files', sql.NVarChar(sql.MAX), newLiabilityFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE LiabilityVerificationDocuments 
            SET ${liabilityField} = @Files, 
                ${liabilityUploadedFlag} = 1,
                ApplicationStatus = @ApplicationStatus, 
                UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('Files', sql.NVarChar(sql.MAX), newLiabilityFiles)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO LiabilityVerificationDocuments (UserID, ${liabilityField}, ${liabilityUploadedFlag}, ApplicationStatus)
            VALUES (@UserID, @Files, 1, @ApplicationStatus)
          `);
      }
      break;

    case 'giftLetter':
      const giftExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM GiftLetter WHERE UserID = @UserID');
      
      if (giftExists.recordset.length > 0) {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('GiftLetterFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE GiftLetter 
            SET GiftLetterFilePath = @GiftLetterFilePath, ApplicationStatus = @ApplicationStatus, UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('GiftLetterFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO GiftLetter (UserID, GiftLetterFilePath, ApplicationStatus)
            VALUES (@UserID, @GiftLetterFilePath, @ApplicationStatus)
          `);
      }
      break;

    case 'purchaseAgreement':
      const paExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM PurchaseAgreement WHERE UserID = @UserID');
      
      if (paExists.recordset.length > 0) {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('AgreementFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE PurchaseAgreement 
            SET AgreementFilePath = @AgreementFilePath, ApplicationStatus = @ApplicationStatus, UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('AgreementFilePath', sql.NVarChar(500), storedBlobName)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO PurchaseAgreement (UserID, AgreementFilePath, ApplicationStatus)
            VALUES (@UserID, @AgreementFilePath, @ApplicationStatus)
          `);
      }
      break;

    case 'authorization':
      // Authorization/consent documents go to AuthorizationsConsent table
      const authExists = await pool.request()
        .input('UserID', sql.Int, userId)
        .query('SELECT TOP 1 * FROM AuthorizationsConsent WHERE UserID = @UserID');
      
      if (authExists.recordset.length > 0) {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('HasAgreed', sql.Bit, 1)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            UPDATE AuthorizationsConsent 
            SET HasAgreed = @HasAgreed, 
                SignedDate = GETDATE(),
                ESignature = 'Test User Signature',
                ApplicationStatus = @ApplicationStatus,
                UpdatedAt = SYSUTCDATETIME()
            WHERE UserID = @UserID
          `);
      } else {
        await pool.request()
          .input('UserID', sql.Int, userId)
          .input('HasAgreed', sql.Bit, 1)
          .input('ApplicationStatus', sql.NVarChar(50), 'Completed')
          .query(`
            INSERT INTO AuthorizationsConsent (UserID, HasAgreed, SignedDate, ESignature, ApplicationStatus)
            VALUES (@UserID, @HasAgreed, GETDATE(), 'Test User Signature', @ApplicationStatus)
          `);
      }
      break;

    default:
      console.log(`      ⚠️  Unknown document type: ${docType}`);
  }
}

// Run the upload
uploadTestDocuments();

