/**
 * Copilot Routes - AI Assistant for Mortgage Application
 * 
 * This module provides an intelligent copilot that can:
 * - Answer questions about the mortgage process
 * - Help users navigate the application
 * - Fill in form fields with guidance
 * - Explain mortgage terminology
 * - Provide personalized assistance based on user's application status
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

// Dynamic import for pdf-to-img (ES module)
let pdfToImg;
(async () => {
  pdfToImg = await import('pdf-to-img');
})();

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // Cost-effective default

// System prompt that gives the AI knowledge about the application
const SYSTEM_PROMPT = `You are a helpful, friendly mortgage copilot assistant for a mortgage application portal. Your name is "Mortgage Copilot" and you work for the lending institution.

## Your Capabilities:
1. **Answer Questions**: Explain mortgage terms, process steps, and requirements clearly
2. **Navigate Users**: Guide users to the right sections of the application
3. **Fill Forms**: Help users understand what information is needed for each field
4. **Provide Status Updates**: Explain where users are in their application journey
5. **Calculate**: Help with basic mortgage calculations and estimates
6. **Read Documents**: Analyze uploaded documents (ID, pay stubs, W-2s, bank statements) using AI vision
7. **Auto-Fill Forms**: Extract information from documents and automatically fill form fields

## Document Reading Commands (users can say these):
- "Read my ID" / "Read my identification" → Extracts name, DOB, address from ID documents
- "Read my pay stub" → Extracts employer, income info from pay stubs
- "Read my W-2" → Extracts annual income and employer info from W-2 forms
- "Read my bank statement" → Extracts account info and balances from bank statements
- "Read my purchase agreement" → Extracts property and price info from contracts

When users mention they have uploaded documents and want help filling forms, suggest they say:
"Read my [document type] and fill in the form"

Note: Currently only image files (JPG, PNG) can be read. PDF support is coming soon.

## Application Sections:
- **Pre-Approval**: Initial assessment (5-10 mins) to determine borrowing capacity
- **Mortgage Application (URLA)**: Full application with sections for:
  - Personal Information (name, DOB, SSN, contact info)
  - Employment & Income (current/previous employers, income details)
  - Assets (bank accounts, investments, retirement)
  - Liabilities (debts, credit cards, loans)
  - Property Information (subject property details)
  - Declarations (financial history questions)
  - Demographics (optional government monitoring)
- **Document Upload**: ID, income docs, asset statements, liability statements
- **Messages**: Direct communication with loan officer
- **Calculator**: Mortgage payment calculator with Danish Realkredit model support
- **Video Call**: Schedule calls with loan officer

## Danish Realkredit Model (used in this app):
- Bond Rate: ~4% (market-based)
- Bidrag (administration fee): ~0.75%
- Total Rate: ~4.75%
- Max LTV: 80%
- Standard Term: 30 years
- Loan Types: Annuity (fixed payment) or Serial (declining payment)

## Key Terms to Explain:
- **Pre-Approval**: Preliminary loan amount estimate based on income/credit
- **DTI (Debt-to-Income)**: Ratio of monthly debts to gross monthly income
- **LTV (Loan-to-Value)**: Loan amount divided by property value
- **URLA**: Uniform Residential Loan Application - standard mortgage form
- **Closing Costs**: Fees due at loan closing (typically 2-5% of loan)
- **Rate Lock**: Securing an interest rate for a period of time
- **Clear to Close**: Final approval, ready to close the loan

## Navigation Commands (you can suggest these):
- "Go to Home" → homeTab
- "Go to Mortgage Application" → mortgageAppTab
- "Go to Messages" → messagesTab
- "Go to Calculator" → calculatorTab
- "Go to Property Search" → propertySearchTab
- "Go to Video Call" → videoCallTab
- "Go to Help Center/FAQ" → faqTab
- "Go to Settings" → accountSettingsTab
- "Go to Badges/Achievements" → badgesTab
- "Start Pre-Approval" → /preapproval

## Response Guidelines:
1. Be concise but thorough - mortgage buyers are often anxious
2. Use simple language, avoid jargon unless explaining it
3. Always be encouraging and supportive
4. If you don't know something specific to their loan, suggest they contact their loan officer
5. For calculations, show your work
6. When suggesting navigation, use the format: [Navigate to: tabName] or [Navigate to: /path]
7. For form help, explain what information is needed and why
8. Never make up specific rates, amounts, or dates - refer to their actual data or suggest contacting loan officer

## Formatting:
- Use markdown for formatting (bold, lists, etc.)
- Keep responses focused and scannable
- Use emojis sparingly for friendliness (✓, 📋, 💡, etc.)
`;

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Please log in to use the copilot' });
}

/**
 * Fetch user context for personalized responses
 */
async function getUserContext(pool, userId) {
  try {
    const context = {
      isPreApproved: false,
      preApprovedAmount: 0,
      applicationStatus: null,
      documentsStatus: {
        identification: false,
        income: false,
        assets: false,
        liabilities: false,
        purchaseAgreement: false,
        giftLetter: false
      },
      loanOfficer: null,
      pendingActionItems: 0,
      unreadMessages: 0
    };

    // Check pre-approval status
    const preApprovalResult = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT TOP 1 IsPreApproved, PreApprovedAmount, ApplicationData 
        FROM PreApprovalApplications 
        WHERE UserID = @UserID 
        ORDER BY SubmissionDate DESC
      `);

    if (preApprovalResult.recordset.length > 0) {
      const row = preApprovalResult.recordset[0];
      context.isPreApproved = row.IsPreApproved === true || row.IsPreApproved === 1;
      context.preApprovedAmount = row.PreApprovedAmount || 0;
    }

    // Check mortgage application status
    const appResult = await pool
      .request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT TOP 1 application_status 
        FROM dbo.loan_applications 
        WHERE user_id = @UserID 
        ORDER BY created_at DESC
      `);

    if (appResult.recordset.length > 0) {
      context.applicationStatus = appResult.recordset[0].application_status;
    }

    // Check document status
    const docChecks = [
      { table: 'IdentificationDocuments', field: 'IDFilePath', key: 'identification' },
      { table: 'IncomeVerificationDocuments', field: 'PayStubsFiles', key: 'income' },
      { table: 'AssetVerificationDocuments', field: 'BankStatementsFiles', key: 'assets' },
      { table: 'LiabilityVerificationDocuments', field: 'CreditCardStatementsFiles', key: 'liabilities' },
      { table: 'PurchaseAgreement', field: 'AgreementFilePath', key: 'purchaseAgreement' },
      { table: 'GiftLetter', field: 'GiftLetterFilePath', key: 'giftLetter' }
    ];

    for (const check of docChecks) {
      try {
        const result = await pool
          .request()
          .input('UserID', sql.Int, userId)
          .query(`SELECT TOP 1 ${check.field} FROM ${check.table} WHERE UserID = @UserID`);
        
        if (result.recordset.length > 0 && result.recordset[0][check.field]) {
          context.documentsStatus[check.key] = true;
        }
      } catch (e) {
        // Table might not exist, skip
      }
    }

    // Get loan officer info
    try {
      const loResult = await pool
        .request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT lo.FirstName, lo.LastName, lo.Email, lo.Phone
          FROM LoanOfficers lo
          INNER JOIN UserLoanOfficerAssignments uloa ON lo.OfficerID = uloa.OfficerID
          WHERE uloa.UserID = @UserID AND uloa.IsActive = 1
        `);

      if (loResult.recordset.length > 0) {
        context.loanOfficer = loResult.recordset[0];
      }
    } catch (e) {
      // Table might not exist
    }

    // Count pending action items
    try {
      const actionResult = await pool
        .request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT COUNT(*) as count 
          FROM ActionItems 
          WHERE UserID = @UserID AND Status != 'Completed'
        `);
      context.pendingActionItems = actionResult.recordset[0].count;
    } catch (e) {
      // Table might not exist
    }

    // Count unread messages
    try {
      const msgResult = await pool
        .request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT COUNT(*) as count 
          FROM Messages 
          WHERE RecipientType = 'Borrower' AND RecipientID = @UserID AND IsRead = 0
        `);
      context.unreadMessages = msgResult.recordset[0].count;
    } catch (e) {
      // Table might not exist
    }

    return context;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Format user context into a readable string for the AI
 */
function formatContextForAI(context, userEmail) {
  if (!context) return '';

  let contextStr = `\n\n## Current User Context:\n`;
  contextStr += `- **User Email**: ${userEmail}\n`;
  contextStr += `- **Pre-Approved**: ${context.isPreApproved ? 'Yes' : 'No'}\n`;
  
  if (context.isPreApproved && context.preApprovedAmount > 0) {
    contextStr += `- **Pre-Approved Amount**: $${context.preApprovedAmount.toLocaleString()}\n`;
  }
  
  if (context.applicationStatus) {
    contextStr += `- **Application Status**: ${context.applicationStatus}\n`;
  }

  // Document status
  const uploadedDocs = Object.entries(context.documentsStatus)
    .filter(([_, v]) => v)
    .map(([k]) => k);
  const pendingDocs = Object.entries(context.documentsStatus)
    .filter(([_, v]) => !v)
    .map(([k]) => k);

  if (uploadedDocs.length > 0) {
    contextStr += `- **Documents Uploaded**: ${uploadedDocs.join(', ')}\n`;
  }
  if (pendingDocs.length > 0) {
    contextStr += `- **Documents Needed**: ${pendingDocs.join(', ')}\n`;
  }

  if (context.loanOfficer) {
    contextStr += `- **Loan Officer**: ${context.loanOfficer.FirstName} ${context.loanOfficer.LastName}\n`;
  }

  if (context.pendingActionItems > 0) {
    contextStr += `- **Pending Action Items**: ${context.pendingActionItems}\n`;
  }

  if (context.unreadMessages > 0) {
    contextStr += `- **Unread Messages**: ${context.unreadMessages}\n`;
  }

  return contextStr;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * POST /api/copilot/chat
 * Main chat endpoint for the copilot
 */
router.post('/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.session.user.userID;
    const userEmail = req.session.user.email;
    const pool = req.app.locals.pool;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Fetch user context
    const userContext = await getUserContext(pool, userId);
    const contextStr = formatContextForAI(userContext, userEmail);

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextStr }
    ];

    // Add conversation history (limit to last 10 exchanges for token efficiency)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI
    const response = await callOpenAI(messages);

    // Check for navigation commands in response
    const navigationMatch = response.match(/\[Navigate to: ([^\]]+)\]/);
    let navigation = null;
    if (navigationMatch) {
      let navTarget = navigationMatch[1].trim();
      // Map user-friendly names to actual tab IDs
      const navMapping = {
        'home': 'homeTab',
        'Home': 'homeTab',
        'mortgage application': 'mortgageAppTab',
        'Mortgage Application': 'mortgageAppTab',
        'application': 'mortgageAppTab',
        'Application': 'mortgageAppTab',
        'messages': 'messagesTab',
        'Messages': 'messagesTab',
        'calculator': 'calculatorTab',
        'Calculator': 'calculatorTab',
        'property search': 'propertySearchTab',
        'Property Search': 'propertySearchTab',
        'video call': 'videoCallTab',
        'Video Call': 'videoCallTab',
        'help': 'faqTab',
        'Help': 'faqTab',
        'faq': 'faqTab',
        'FAQ': 'faqTab',
        'Help Center': 'faqTab',
        'settings': 'accountSettingsTab',
        'Settings': 'accountSettingsTab',
        'Account Settings': 'accountSettingsTab',
        'badges': 'badgesTab',
        'Badges': 'badgesTab',
        'achievements': 'badgesTab',
        'Achievements': 'badgesTab'
      };
      navigation = navMapping[navTarget] || navTarget;
    }

    res.json({
      response: response,
      navigation: navigation,
      context: {
        isPreApproved: userContext?.isPreApproved || false,
        pendingActionItems: userContext?.pendingActionItems || 0,
        unreadMessages: userContext?.unreadMessages || 0
      }
    });

  } catch (error) {
    console.error('Copilot chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process your message. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/copilot/suggestions
 * Get contextual suggestions based on user's current state
 */
router.get('/suggestions', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userID;
    const pool = req.app.locals.pool;

    const context = await getUserContext(pool, userId);
    const suggestions = [];

    if (!context) {
      return res.json({
        suggestions: [
          'How does the pre-approval process work?',
          'What documents do I need?',
          'Explain mortgage rates to me'
        ]
      });
    }

    // Context-aware suggestions
    if (!context.isPreApproved) {
      suggestions.push('Help me get pre-approved');
      suggestions.push('What information do I need for pre-approval?');
      suggestions.push('How is my borrowing capacity calculated?');
    } else {
      if (!context.documentsStatus.identification) {
        suggestions.push('What ID documents do you accept?');
      }
      if (!context.documentsStatus.income) {
        suggestions.push('What income documents do I need?');
      }
      if (!context.documentsStatus.assets) {
        suggestions.push('Help me with asset documentation');
      }

      if (context.pendingActionItems > 0) {
        suggestions.push(`What are my ${context.pendingActionItems} pending action items?`);
      }

      if (context.unreadMessages > 0) {
        suggestions.push('Take me to my messages');
      }

      suggestions.push('What\'s next in my application?');
      suggestions.push('Calculate my monthly payment');
    }

    // Always include general suggestions
    suggestions.push('Explain closing costs to me');

    res.json({ suggestions: suggestions.slice(0, 5) });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.json({
      suggestions: [
        'How does the mortgage process work?',
        'What documents do I need?',
        'Help me with my application'
      ]
    });
  }
});

/**
 * POST /api/copilot/form-help
 * Get help for a specific form field
 */
router.post('/form-help', ensureAuthenticated, async (req, res) => {
  try {
    const { fieldName, fieldLabel, formSection } = req.body;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const prompt = `The user is filling out a mortgage application form. They need help with the following field:

**Form Section**: ${formSection || 'Unknown'}
**Field Name**: ${fieldName}
**Field Label**: ${fieldLabel}

Please provide a brief, helpful explanation of:
1. What information goes in this field
2. Why this information is needed
3. Where to find this information (if applicable)

Keep the response concise (2-4 sentences max).`;

    const messages = [
      { role: 'system', content: 'You are a helpful mortgage assistant. Provide brief, clear explanations for form fields.' },
      { role: 'user', content: prompt }
    ];

    const response = await callOpenAI(messages);

    res.json({ help: response });

  } catch (error) {
    console.error('Form help error:', error);
    res.status(500).json({ error: 'Failed to get help for this field' });
  }
});

/**
 * POST /api/copilot/read-document
 * Read and analyze a document using OpenAI Vision API
 */
router.post('/read-document', ensureAuthenticated, async (req, res) => {
  try {
    const { documentType, containerName } = req.body;
    const userId = req.session.user.userID;
    const pool = req.app.locals.pool;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Get the document blob name from the database based on document type
    let query = '';
    let docField = '';
    let table = '';

    const docTypeMapping = {
      'identification': { table: 'IdentificationDocuments', field: 'IDFilePath' },
      'income_paystubs': { table: 'IncomeVerificationDocuments', field: 'PayStubsFiles' },
      'income_w2': { table: 'IncomeVerificationDocuments', field: 'W2Files' },
      'income_tax': { table: 'IncomeVerificationDocuments', field: 'TaxReturnsFiles' },
      'assets_bank': { table: 'AssetVerificationDocuments', field: 'BankStatementsFiles' },
      'purchase_agreement': { table: 'PurchaseAgreementDocuments', field: 'PurchaseAgreementFilePath' }
    };

    const mapping = docTypeMapping[documentType];
    if (!mapping) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT ${mapping.field} FROM ${mapping.table} WHERE UserID = @UserID`);

    if (!result.recordset.length || !result.recordset[0][mapping.field]) {
      return res.json({ 
        success: false, 
        message: `No ${documentType.replace('_', ' ')} document found. Please upload the document first.` 
      });
    }

    const blobName = result.recordset[0][mapping.field].split(',')[0]; // Get first file if multiple

    // Map document type to container name
    const containerMapping = {
      'identification': process.env.AZURE_STORAGE_CONTAINER_NAME_IDENTIFICATION,
      'income_paystubs': process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME,
      'income_w2': process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME,
      'income_tax': process.env.AZURE_STORAGE_CONTAINER_NAME_INCOME,
      'assets_bank': process.env.AZURE_STORAGE_CONTAINER_NAME_ASSET,
      'purchase_agreement': process.env.AZURE_STORAGE_CONTAINER_NAME_PURCHASE
    };

    const container = containerMapping[documentType];

    // Create Azure Blob Service Client using connection string
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return res.json({ success: false, message: 'Azure Storage connection string not configured' });
    }
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(container);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    
    // Determine file type
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const pdfExtensions = ['.pdf'];
    const extension = blobName.substring(blobName.lastIndexOf('.')).toLowerCase();
    
    let analysisResult;
    
    if (imageExtensions.includes(extension)) {
      // For images, download and convert to base64 for OpenAI Vision API
      try {
        const downloadResponse = await blobClient.download();
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        const imageBuffer = Buffer.concat(chunks);
        const base64Image = imageBuffer.toString('base64');
        
        // Determine mime type
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const mimeType = mimeTypes[extension] || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        // Use OpenAI Vision API for images
        const visionPrompt = getDocumentAnalysisPrompt(documentType);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
                ]
              }
            ],
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Vision API error:', error);
          return res.status(500).json({ error: 'Failed to analyze document' });
        }

        const data = await response.json();
        analysisResult = data.choices[0].message.content;
      } catch (downloadError) {
        console.error('Failed to download image:', downloadError);
        return res.json({
          success: false,
          message: 'Unable to access the document. Please try uploading it again.'
        });
      }
      
    } else if (pdfExtensions.includes(extension)) {
      // Handle PDF files - convert to images and let GPT-4 Vision read them directly
      // Download PDF from Azure Blob Storage
      let pdfBuffer;
      try {
        const downloadResponse = await blobClient.download();
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        pdfBuffer = Buffer.concat(chunks);
      } catch (downloadError) {
        console.error('Failed to download PDF:', downloadError);
        return res.json({
          success: false,
          message: 'Unable to access the document. Please try uploading it again.'
        });
      }
      
      // Convert PDF pages to images - NO text extraction, just visual conversion
      // The LLM will "see" and read the document directly
      let pageImages = [];
      try {
        // pdf-to-img converts PDF pages to PNG images
        const { pdf } = pdfToImg;
        const document = await pdf(pdfBuffer, { scale: 2 }); // Higher scale for better readability
        
        let pageNum = 0;
        for await (const image of document) {
          pageNum++;
          // Convert image buffer to base64
          const base64Image = image.toString('base64');
          pageImages.push({
            pageNumber: pageNum,
            base64: base64Image,
            mimeType: 'image/png'
          });
          // Limit to first 5 pages to avoid token limits
          if (pageNum >= 5) break;
        }
        
        if (pageImages.length === 0) {
          return res.json({
            success: false,
            message: 'Unable to process this PDF. Please try uploading an image version (JPG/PNG) of the document.'
          });
        }
      } catch (pdfError) {
        console.error('PDF to image conversion error:', pdfError);
        return res.json({
          success: false,
          message: 'Unable to process this PDF. Please try uploading an image version (JPG/PNG) of the document.'
        });
      }
      
      // Send PDF page images to GPT-4 Vision - let the AI READ the document visually
      const imagePrompt = getDocumentAnalysisPrompt(documentType, false); // false = image/vision mode
      
      // Build content array with all page images
      const contentArray = [
        {
          type: 'text',
          text: imagePrompt + (pageImages.length > 1 ? `\n\nThis document has ${pageImages.length} pages. Please read all pages.` : '')
        }
      ];
      
      // Add each page image to the content
      for (const page of pageImages) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${page.mimeType};base64,${page.base64}`,
            detail: 'high' // High detail for better text reading
          }
        });
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Vision-capable model
          messages: [
            {
              role: 'system',
              content: 'You are reading and analyzing document images. Look at the document carefully and extract the requested information. Return results in JSON format.'
            },
            {
              role: 'user',
              content: contentArray
            }
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('GPT API error:', error);
        return res.status(500).json({ error: 'Failed to analyze document' });
      }

      const data = await response.json();
      analysisResult = data.choices[0].message.content;
      
    } else {
      return res.json({
        success: false,
        message: `Unsupported file type (${extension}). Please upload an image (JPG, PNG) or PDF document.`
      });
    }

    // Try to parse as JSON for structured data
    let extractedData = null;
    try {
      // Look for JSON in the response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not JSON, that's okay
    }

    res.json({
      success: true,
      documentType: documentType,
      analysis: analysisResult,
      extractedData: extractedData,
      message: extractedData 
        ? 'I found information in your document. Would you like me to fill in the form fields with this data?' 
        : 'I analyzed your document. Here\'s what I found:'
    });

  } catch (error) {
    console.error('Document read error:', error.message || error);
    res.json({ 
      success: false, 
      message: 'Unable to read the document. ' + (error.message || 'Please try again later.')
    });
  }
});

/**
 * POST /api/copilot/fill-form
 * Fill form fields with provided data
 */
router.post('/fill-form', ensureAuthenticated, async (req, res) => {
  try {
    const { fields, formSection } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Fields array is required' });
    }

    // Return the fields to fill - the frontend will handle actually filling them
    res.json({
      success: true,
      fieldsToFill: fields,
      formSection: formSection,
      message: `Ready to fill ${fields.length} field(s) in ${formSection || 'the form'}.`
    });

  } catch (error) {
    console.error('Fill form error:', error);
    res.status(500).json({ error: 'Failed to prepare form fill' });
  }
});

/**
 * Get document analysis prompt based on document type
 * @param {string} documentType - Type of document
 * @param {boolean} textMode - True for PDF text analysis, false for image vision analysis
 */
function getDocumentAnalysisPrompt(documentType, textMode = false) {
  const modePrefix = textMode 
    ? 'Analyze the following document text and extract' 
    : 'Analyze this document image and extract';
    
  const prompts = {
    'identification': `${modePrefix} the following information from this ID document (driver's license, passport, or state ID) in JSON format:
{
  "fullName": "First Middle Last",
  "firstName": "",
  "middleName": "",
  "lastName": "",
  "dateOfBirth": "MM/DD/YYYY",
  "address": {
    "street": "",
    "city": "",
    "state": "",
    "zipCode": ""
  },
  "documentNumber": "",
  "expirationDate": "",
  "documentType": "Driver's License/Passport/State ID"
}

Only include fields you can clearly read from the document. For any field you cannot read, use null.`,

    'income_paystubs': `${modePrefix} the following information from this pay stub in JSON format:
{
  "employerName": "",
  "employerAddress": "",
  "employeeName": "",
  "payPeriod": {
    "start": "MM/DD/YYYY",
    "end": "MM/DD/YYYY"
  },
  "grossPay": 0.00,
  "netPay": 0.00,
  "ytdGross": 0.00,
  "ytdNet": 0.00,
  "hourlyRate": 0.00,
  "hoursWorked": 0,
  "payFrequency": "Weekly/Bi-weekly/Semi-monthly/Monthly"
}

Only include fields you can clearly read. For any field you cannot read, use null.`,

    'income_w2': `${modePrefix} the following information from this W-2 form in JSON format:
{
  "year": "",
  "employerName": "",
  "employerEIN": "",
  "employerAddress": "",
  "employeeName": "",
  "employeeSSN": "XXX-XX-####",
  "wagesTipsOtherComp": 0.00,
  "federalIncomeTaxWithheld": 0.00,
  "socialSecurityWages": 0.00,
  "socialSecurityTaxWithheld": 0.00,
  "medicareWages": 0.00,
  "medicareTaxWithheld": 0.00
}

Only include fields you can clearly read. For any field you cannot read, use null. Mask all but last 4 digits of SSN.`,

    'assets_bank': `${modePrefix} the following information from this bank statement in JSON format:
{
  "bankName": "",
  "accountHolder": "",
  "accountType": "Checking/Savings",
  "accountNumber": "****####",
  "statementPeriod": {
    "start": "MM/DD/YYYY",
    "end": "MM/DD/YYYY"
  },
  "beginningBalance": 0.00,
  "endingBalance": 0.00,
  "averageBalance": 0.00
}

Only include fields you can clearly read. Mask account numbers. For any field you cannot read, use null.`,

    'purchase_agreement': `${modePrefix} the following information from this purchase agreement/contract in JSON format:
{
  "propertyAddress": {
    "street": "",
    "city": "",
    "state": "",
    "zipCode": ""
  },
  "purchasePrice": 0.00,
  "earnestMoneyDeposit": 0.00,
  "closingDate": "MM/DD/YYYY",
  "sellerName": "",
  "buyerName": "",
  "propertyType": "Single Family/Condo/Townhouse/Multi-family"
}

Only include fields you can clearly read. For any field you cannot read, use null.`
  };

  return prompts[documentType] || `${modePrefix} any relevant information from this document in JSON format. Include names, dates, addresses, and financial figures if present.`;
}

module.exports = router;

