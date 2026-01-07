/**
 * Copilot Chat Widget - JavaScript Controller
 * 
 * Handles all client-side functionality for the AI copilot assistant:
 * - Chat interface and message handling
 * - API communication
 * - Navigation commands
 * - Form field assistance
 * - Conversation history management
 */

(function() {
  'use strict';

  // DOM Elements
  let toggleBtn, chatWindow, messagesContainer, form, input, sendBtn;
  let suggestionsContainer, clearBtn, minimizeBtn, notificationDot;

  // State
  let conversationHistory = [];
  let isOpen = false;
  let isLoading = false;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Get DOM elements
    toggleBtn = document.getElementById('copilot-toggle-btn');
    chatWindow = document.getElementById('copilot-window');
    messagesContainer = document.getElementById('copilot-messages');
    form = document.getElementById('copilot-form');
    input = document.getElementById('copilot-input');
    sendBtn = document.getElementById('copilot-send-btn');
    suggestionsContainer = document.getElementById('suggestions-container');
    clearBtn = document.getElementById('copilot-clear-btn');
    minimizeBtn = document.getElementById('copilot-minimize-btn');
    notificationDot = document.getElementById('copilot-notification');

    if (!toggleBtn || !chatWindow) {
      console.warn('Copilot elements not found');
      return;
    }

    // Bind event listeners
    toggleBtn.addEventListener('click', toggleWindow);
    minimizeBtn.addEventListener('click', closeWindow);
    clearBtn.addEventListener('click', clearConversation);
    form.addEventListener('submit', handleSubmit);
    input.addEventListener('input', handleInputChange);
    input.addEventListener('keydown', handleKeyDown);

    // Load suggestions
    loadSuggestions();

    // Load conversation from sessionStorage
    loadConversation();

    // Show notification dot after delay if not opened before
    if (!sessionStorage.getItem('copilot_opened')) {
      setTimeout(() => {
        if (notificationDot && !isOpen) {
          notificationDot.classList.remove('hidden');
        }
      }, 5000);
    }

    // Setup form field help listeners
    setupFormFieldHelp();
  }

  /**
   * Toggle chat window visibility
   */
  function toggleWindow() {
    if (isOpen) {
      closeWindow();
    } else {
      openWindow();
    }
  }

  function openWindow() {
    chatWindow.classList.remove('hidden');
    isOpen = true;
    toggleBtn.classList.add('hidden');
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    // Hide notification
    if (notificationDot) {
      notificationDot.classList.add('hidden');
    }
    
    // Mark as opened
    sessionStorage.setItem('copilot_opened', 'true');
    
    // Scroll to bottom
    scrollToBottom();
  }

  function closeWindow() {
    chatWindow.classList.add('hidden');
    isOpen = false;
    toggleBtn.classList.remove('hidden');
  }

  // Store pending form data for confirmation
  let pendingFormData = null;
  let pendingDocumentType = null;

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();
    
    const message = input.value.trim();
    if (!message || isLoading) return;

    // Add user message to UI
    addMessage('user', message);
    
    // Clear input
    input.value = '';
    handleInputChange();
    
    // Add to conversation history
    conversationHistory.push({ role: 'user', content: message });

    // Check for form fill confirmation
    if (checkForFillConfirmation(message)) {
      showTypingIndicator();
      isLoading = true;
      
      try {
        const result = await fillFormFields(pendingFormData, pendingDocumentType);
        hideTypingIndicator();
        
        const successMsg = result.filledFields.length > 0 
          ? `✅ I've filled in ${result.filledFields.length} field(s) with the information from your document!` +
            (result.failedFields.length > 0 ? `\n\n⚠️ I couldn't find ${result.failedFields.length} field(s) on this page. You may need to fill those manually.` : '')
          : 'I couldn\'t find matching form fields on this page. You may need to navigate to the correct section first.';
        
        addMessage('assistant', successMsg);
        conversationHistory.push({ role: 'assistant', content: successMsg });
        saveConversation();
        
        // Clear pending data
        pendingFormData = null;
        pendingDocumentType = null;
      } catch (error) {
        hideTypingIndicator();
        addMessage('assistant', 'Sorry, I encountered an error filling the form. Please try again.');
      } finally {
        isLoading = false;
        handleInputChange();
      }
      return;
    }

    // Check for document reading commands
    const docReadMatch = detectDocumentReadCommand(message);
    if (docReadMatch) {
      readDocument(docReadMatch);
      return;
    }
    
    // Show loading indicator
    showTypingIndicator();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: conversationHistory.slice(-20)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Remove typing indicator
      hideTypingIndicator();
      
      // Add assistant response
      addMessage('assistant', data.response, data.navigation);
      
      // Add to conversation history
      conversationHistory.push({ role: 'assistant', content: data.response });
      
      // Save conversation
      saveConversation();
      
      // Handle navigation if present
      if (data.navigation) {
        handleNavigation(data.navigation);
      }

    } catch (error) {
      console.error('Copilot error:', error);
      hideTypingIndicator();
      addMessage('assistant', 'I apologize, but I encountered an error. Please try again or contact your loan officer for assistance.');
    } finally {
      isLoading = false;
      handleInputChange();
    }
  }

  /**
   * Detect document reading commands in user message
   */
  function detectDocumentReadCommand(message) {
    const lowerMessage = message.toLowerCase();
    
    const docPatterns = [
      { patterns: ['read my id', 'read my identification', 'read my license', 'read my passport', 'scan my id', 'extract from my id'], type: 'identification' },
      { patterns: ['read my pay stub', 'read my paystub', 'extract from pay stub', 'scan my pay stub'], type: 'income_paystubs' },
      { patterns: ['read my w2', 'read my w-2', 'extract from w2', 'scan my w2'], type: 'income_w2' },
      { patterns: ['read my tax return', 'extract from tax', 'scan my tax'], type: 'income_tax' },
      { patterns: ['read my bank statement', 'extract from bank', 'scan my bank statement'], type: 'assets_bank' },
      { patterns: ['read my purchase agreement', 'read my contract', 'extract from purchase agreement', 'scan my contract'], type: 'purchase_agreement' }
    ];

    for (const doc of docPatterns) {
      if (doc.patterns.some(pattern => lowerMessage.includes(pattern))) {
        return doc.type;
      }
    }

    // Generic document reading command - try to infer type
    if (lowerMessage.includes('read') && lowerMessage.includes('document')) {
      if (lowerMessage.includes('income') || lowerMessage.includes('pay')) return 'income_paystubs';
      if (lowerMessage.includes('bank') || lowerMessage.includes('asset')) return 'assets_bank';
      if (lowerMessage.includes('id') || lowerMessage.includes('identification')) return 'identification';
      if (lowerMessage.includes('purchase') || lowerMessage.includes('contract')) return 'purchase_agreement';
    }

    return null;
  }

  /**
   * Add a message to the chat
   */
  function addMessage(role, content, navigation = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `copilot-message ${role}`;
    
    if (role === 'user') {
      messageDiv.innerHTML = `
        <div class="flex justify-end">
          <div class="message-bubble px-4 py-3 max-w-[85%]">
            <p class="text-white">${escapeHtml(content)}</p>
          </div>
        </div>
      `;
    } else {
      // Process markdown-like formatting
      const formattedContent = formatResponse(content);
      
      // Check for navigation command
      let navButton = '';
      if (navigation) {
        const navLabel = getNavigationLabel(navigation);
        navButton = `
          <button type="button" class="copilot-nav-btn" onclick="window.copilotNavigate('${navigation}')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
            ${navLabel}
          </button>
        `;
      }
      
      messageDiv.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div class="flex-1 max-w-[85%]">
            <div class="message-bubble message-content px-4 py-3">
              ${formattedContent}
              ${navButton}
            </div>
          </div>
        </div>
      `;
    }
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  /**
   * Format response with basic markdown support
   */
  function formatResponse(content) {
    // Remove navigation tags from visible content
    content = content.replace(/\[Navigate to: [^\]]+\]/g, '');
    
    // Escape HTML first
    let formatted = escapeHtml(content);
    
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Lists: lines starting with - or *
    formatted = formatted.replace(/(?:^|<br>)[-*•]\s+(.+?)(?=<br>|$)/g, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Clean up multiple <ul> tags
    formatted = formatted.replace(/<\/ul><br><ul>/g, '');
    
    // Numbered lists
    formatted = formatted.replace(/(?:^|<br>)(\d+)\.\s+(.+?)(?=<br>|$)/g, '<li>$2</li>');
    
    return formatted;
  }

  /**
   * Show typing indicator
   */
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'copilot-message assistant';
    indicator.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
        </div>
        <div class="copilot-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(indicator);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Handle input changes (for auto-resize and button state)
   */
  function handleInputChange() {
    // Auto-resize textarea
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    
    // Update send button state
    sendBtn.disabled = !input.value.trim() || isLoading;
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(e) {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  }

  /**
   * Load contextual suggestions
   */
  async function loadSuggestions() {
    try {
      const response = await fetch('/api/copilot/suggestions');
      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        renderSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Render default suggestions
      renderSuggestions([
        'How does the mortgage process work?',
        'What documents do I need?',
        'Calculate my monthly payment'
      ]);
    }
  }

  function renderSuggestions(suggestions) {
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = suggestions.map(s => 
      `<button type="button" class="copilot-suggestion" data-question="${escapeHtml(s).replace(/"/g, '&quot;')}">${escapeHtml(s)}</button>`
    ).join('');
    
    // Add click handlers via event delegation
    suggestionsContainer.querySelectorAll('.copilot-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.getAttribute('data-question')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        window.copilotAsk(question);
      });
    });
  }

  /**
   * Clear conversation
   */
  function clearConversation() {
    // Keep only welcome message
    const welcomeMessage = messagesContainer.querySelector('.copilot-message');
    messagesContainer.innerHTML = '';
    if (welcomeMessage) {
      messagesContainer.appendChild(welcomeMessage.cloneNode(true));
    } else {
      // Add default welcome
      addMessage('assistant', '👋 Hi! I\'m your Mortgage Copilot. How can I help you today?');
    }
    
    // Clear history
    conversationHistory = [];
    sessionStorage.removeItem('copilot_conversation');
    
    // Reload suggestions
    loadSuggestions();
  }

  /**
   * Save/load conversation to sessionStorage
   */
  function saveConversation() {
    sessionStorage.setItem('copilot_conversation', JSON.stringify(conversationHistory));
  }

  function loadConversation() {
    try {
      const saved = sessionStorage.getItem('copilot_conversation');
      if (saved) {
        conversationHistory = JSON.parse(saved);
        
        // Replay messages (skip if empty)
        if (conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            addMessage(msg.role, msg.content);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  }

  /**
   * Handle navigation commands
   */
  function handleNavigation(target) {
    // Don't auto-navigate, let user click button
    console.log('Navigation available:', target);
  }

  /**
   * Navigate to a tab or URL
   */
  window.copilotNavigate = function(target) {
    if (target.startsWith('/')) {
      // URL navigation
      window.location.href = target;
    } else {
      // Tab navigation
      const tabBtn = document.querySelector(`[data-tab="${target}"]`);
      if (tabBtn) {
        tabBtn.click();
        closeWindow();
      }
    }
  };

  /**
   * Ask a question (from suggestions)
   */
  window.copilotAsk = function(question) {
    input.value = question;
    handleInputChange();
    form.dispatchEvent(new Event('submit'));
  };

  /**
   * Get navigation button label
   */
  function getNavigationLabel(target) {
    const labels = {
      'homeTab': 'Go to Home',
      'mortgageAppTab': 'Go to Application',
      'messagesTab': 'Go to Messages',
      'calculatorTab': 'Go to Calculator',
      'propertySearchTab': 'Go to Property Search',
      'videoCallTab': 'Schedule a Call',
      'faqTab': 'Go to Help Center',
      'accountSettingsTab': 'Go to Settings',
      'badgesTab': 'View Achievements',
      '/preapproval': 'Start Pre-Approval'
    };
    return labels[target] || `Go to ${target}`;
  }

  /**
   * Setup form field help (adds ? icons to form fields)
   */
  function setupFormFieldHelp() {
    // Find all form inputs with labels
    document.querySelectorAll('label[for]').forEach(label => {
      const input = document.getElementById(label.getAttribute('for'));
      if (!input) return;
      
      // Skip if already has help button
      if (label.querySelector('.copilot-field-help')) return;
      
      // Create help button
      const helpBtn = document.createElement('button');
      helpBtn.type = 'button';
      helpBtn.className = 'copilot-field-help ml-2 inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-violet-600 transition-colors';
      helpBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `;
      helpBtn.title = 'Get help with this field';
      
      helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        getFieldHelp(input.name || input.id, label.textContent.trim());
      });
      
      label.appendChild(helpBtn);
    });
  }

  /**
   * Get help for a specific form field
   */
  async function getFieldHelp(fieldName, fieldLabel) {
    // Open copilot if closed
    if (!isOpen) {
      openWindow();
    }
    
    // Add user question about this field
    const question = `Help me understand the "${fieldLabel}" field`;
    addMessage('user', question);
    conversationHistory.push({ role: 'user', content: question });
    
    showTypingIndicator();
    isLoading = true;
    
    try {
      const response = await fetch('/api/copilot/form-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fieldName: fieldName,
          fieldLabel: fieldLabel,
          formSection: getFormSection(fieldName)
        })
      });
      
      const data = await response.json();
      hideTypingIndicator();
      
      if (data.help) {
        addMessage('assistant', data.help);
        conversationHistory.push({ role: 'assistant', content: data.help });
        saveConversation();
      }
    } catch (error) {
      hideTypingIndicator();
      addMessage('assistant', `For the "${fieldLabel}" field, please enter the requested information. If you're unsure, contact your loan officer for guidance.`);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Get form section based on field name
   */
  function getFormSection(fieldName) {
    const sections = {
      firstName: 'Personal Information',
      lastName: 'Personal Information',
      ssn: 'Personal Information',
      dob: 'Personal Information',
      email: 'Contact Information',
      phone: 'Contact Information',
      employer: 'Employment',
      income: 'Income',
      annualIncome: 'Income',
      monthlyDebt: 'Liabilities',
      bank: 'Assets',
      property: 'Property Information'
    };
    
    for (const [key, section] of Object.entries(sections)) {
      if (fieldName.toLowerCase().includes(key.toLowerCase())) {
        return section;
      }
    }
    
    return 'Mortgage Application';
  }

  /**
   * Utility: Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Utility: Scroll to bottom of messages
   */
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Read and analyze a document using AI
   */
  async function readDocument(documentType) {
    if (!isOpen) {
      openWindow();
    }

    const docTypeLabels = {
      'identification': 'ID document',
      'income_paystubs': 'pay stub',
      'income_w2': 'W-2 form',
      'income_tax': 'tax return',
      'assets_bank': 'bank statement',
      'purchase_agreement': 'purchase agreement'
    };

    const label = docTypeLabels[documentType] || documentType;
    addMessage('user', `Read my ${label} and extract the information`);
    conversationHistory.push({ role: 'user', content: `Read my ${label} and extract the information` });
    
    showTypingIndicator();
    isLoading = true;

    try {
      const response = await fetch('/api/copilot/read-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType })
      });

      const data = await response.json();
      hideTypingIndicator();

      if (!data.success) {
        addMessage('assistant', data.message || 'Unable to read the document.');
        conversationHistory.push({ role: 'assistant', content: data.message });
        saveConversation();
        return;
      }

      // Show the analysis
      let responseText = data.message + '\n\n' + data.analysis;
      
      // If we have extracted data, offer to fill the form
      if (data.extractedData) {
        pendingFormData = data.extractedData;
        pendingDocumentType = documentType;
        responseText += '\n\n**Would you like me to fill in the form fields with this information?** Just say "yes" or "fill the form".';
      }

      addMessage('assistant', responseText);
      conversationHistory.push({ role: 'assistant', content: responseText });
      saveConversation();

    } catch (error) {
      console.error('Document read error:', error);
      hideTypingIndicator();
      addMessage('assistant', 'Sorry, I encountered an error reading the document. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  /**
   * Fill form fields with extracted data
   */
  async function fillFormFields(data, documentType) {
    if (!data) return;

    const fieldMappings = getFieldMappings(documentType);
    const filledFields = [];
    const failedFields = [];

    for (const [dataKey, fieldSelector] of Object.entries(fieldMappings)) {
      const value = getNestedValue(data, dataKey);
      if (value !== null && value !== undefined) {
        const field = document.querySelector(fieldSelector);
        if (field) {
          try {
            if (field.tagName === 'SELECT') {
              // For select elements, find matching option
              const options = Array.from(field.options);
              const match = options.find(opt => 
                opt.value.toLowerCase() === String(value).toLowerCase() ||
                opt.text.toLowerCase() === String(value).toLowerCase()
              );
              if (match) {
                field.value = match.value;
                filledFields.push(dataKey);
              }
            } else if (field.type === 'checkbox') {
              field.checked = Boolean(value);
              filledFields.push(dataKey);
            } else {
              field.value = value;
              filledFields.push(dataKey);
            }
            // Trigger change event
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('input', { bubbles: true }));
          } catch (e) {
            failedFields.push(dataKey);
          }
        } else {
          failedFields.push(dataKey);
        }
      }
    }

    return { filledFields, failedFields };
  }

  /**
   * Get field mappings for different document types
   */
  function getFieldMappings(documentType) {
    const mappings = {
      'identification': {
        'firstName': '#firstName1a, input[name="firstName"]',
        'lastName': '#lastName1a, input[name="lastName"]',
        'middleName': '#middleName1a, input[name="middleName"]',
        'dateOfBirth': '#dob1a, input[name="dateOfBirth"]',
        'address.street': '#currentStreet1a, input[name="streetAddress"]',
        'address.city': '#currentCity1a, input[name="city"]',
        'address.state': '#currentState1a, select[name="state"]',
        'address.zipCode': '#currentZip1a, input[name="zipCode"]'
      },
      'income_paystubs': {
        'employerName': '#employerName1b1, input[name="currentEmployerName"]',
        'grossPay': '#monthlyIncome1b1, input[name="monthlyIncome"]',
        'employerAddress': '#employerAddress1b1, input[name="employerAddress"]'
      },
      'income_w2': {
        'employerName': '#employerName1b1, input[name="currentEmployerName"]',
        'wagesTipsOtherComp': '#annualIncome1b1, input[name="annualIncome"]',
        'year': '#w2Year, input[name="w2Year"]'
      },
      'assets_bank': {
        'bankName': '#financialInstitution2c1, input[name="bankName"]',
        'accountType': '#accountType2c1, select[name="accountType"]',
        'endingBalance': '#cashValue2c1, input[name="accountBalance"]'
      },
      'purchase_agreement': {
        'purchasePrice': '#purchasePrice4, input[name="purchasePrice"]',
        'propertyAddress.street': '#propertyStreet4a, input[name="propertyStreet"]',
        'propertyAddress.city': '#propertyCity4a, input[name="propertyCity"]',
        'propertyAddress.state': '#propertyState4a, select[name="propertyState"]',
        'propertyAddress.zipCode': '#propertyZip4a, input[name="propertyZip"]',
        'closingDate': '#expectedClosingDate, input[name="closingDate"]'
      }
    };
    return mappings[documentType] || {};
  }

  /**
   * Get nested value from object using dot notation
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj);
  }

  /**
   * Handle form fill confirmation in chat
   */
  function checkForFillConfirmation(message) {
    const lowerMessage = message.toLowerCase();
    const confirmPhrases = ['yes', 'fill', 'fill the form', 'go ahead', 'do it', 'please fill', 'fill in'];
    
    if (pendingFormData && confirmPhrases.some(phrase => lowerMessage.includes(phrase))) {
      return true;
    }
    return false;
  }

  // Expose API for external use
  window.Copilot = {
    open: openWindow,
    close: closeWindow,
    toggle: toggleWindow,
    ask: window.copilotAsk,
    navigate: window.copilotNavigate,
    readDocument: readDocument,
    fillForm: fillFormFields
  };

  // Expose readDocument globally for easy access
  window.copilotReadDocument = readDocument;

})();

