$(document).ready(function() {
  const $progressBar = $('#progressBar');
  const $submitBtn = $('#submitApplication');

  function updateProgress() {
    // Count only non-optional tasks
    const $nonOptionalTasks = $('.task-item').not('[data-optional="true"]');
    const totalTasks = $nonOptionalTasks.length;
    let completedCount = 0;
    $nonOptionalTasks.each(function() {
      const status = $(this).attr('data-task-status');
      if (status === 'Completed') {
        completedCount++;
      }
    });

    const completionPercentage = (completedCount / totalTasks) * 100;
    $progressBar.css('width', completionPercentage + '%');

    if (completedCount === totalTasks) {
      $submitBtn.removeClass('bg-gray-400 cursor-not-allowed');
      $submitBtn.addClass('bg-green-600 hover:bg-green-700 cursor-pointer');
      $submitBtn.prop('disabled', false);
    } else {
      $submitBtn.removeClass('bg-green-600 hover:bg-green-700 cursor-pointer');
      $submitBtn.addClass('bg-gray-400 cursor-not-allowed');
      $submitBtn.prop('disabled', true);
    }
  }

  // Toggle form visibility on header click ONLY
  $('.task-header').on('click', function(e) {
    const $taskItem = $(this).closest('.task-item');
    const taskId = $taskItem.data('task-id');
    const $arrow = $(this).find('.task-arrow');
  
    let $formToToggle; // define this variable first
  
    if (taskId === 'loanApplication') {
      $formToToggle = $taskItem.find('.loan-application-form');
    } else if (taskId === 'authorizations') {
      $formToToggle = $taskItem.find('.authorization-form');
    } else if (taskId === 'identification') {
      $formToToggle = $taskItem.find('.identification-form');
    } else if (taskId === 'incomeVerification') {
      $formToToggle = $taskItem.find('.income-verification-form');
    } else if (taskId === 'assetVerification') {
      $formToToggle = $taskItem.find('.asset-verification-form');
    } else if (taskId === 'liabilityVerification') {
      $formToToggle = $taskItem.find('.liability-verification-form');
    } else if (taskId === 'disclosures') {
      $formToToggle = $taskItem.find('.disclosures-form');
    } else if (taskId === 'coBorrower') {
      $formToToggle = $taskItem.find('.co-borrower-form');
    } else if (taskId === 'purchaseAgreement') {
      $formToToggle = $taskItem.find('.purchase-agreement-form');
    } else if (taskId === 'giftLetter') {
      $formToToggle = $taskItem.find('.gift-letter-form');
    }
  
    if ($formToToggle) {
      $formToToggle.toggleClass('hidden');
  
      // If the form is now visible, rotate the arrow
      if ($formToToggle.hasClass('hidden')) {
        // Collapsed: remove rotate-180 to show arrow pointing down
        $arrow.removeClass('rotate-180');
      } else {
        // Expanded: add rotate-180 to rotate the arrow upward
        $arrow.addClass('rotate-180');
      }
    }
  });
  

  // Save logic for Loan Application & Loan Details
  $('.save-loan-details').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.loan-application-form');
    const $taskItem = $form.closest('.task-item[data-task-id="loanApplication"]');

    const requiredFields = $form.find('[required]');
    let allRequiredFilled = true;
    let someDataEntered = false;

    requiredFields.each(function() {
      const val = $(this).val();
      if (val && val.trim() !== '') {
        someDataEntered = true;
      }
      if (!val || val.trim() === '') {
        $(this).addClass('border-red-500');
        allRequiredFilled = false;
      } else {
        $(this).removeClass('border-red-500');
      }
    });

    let newStatus;
    if (allRequiredFilled) {
      newStatus = 'Completed';
    } else if (someDataEntered) {
      newStatus = 'In Progress';
    } else {
      newStatus = 'Not Started';
    }

    const formData = new FormData();
    formData.append('borrowerFirstName', $('#borrowerFirstName').val());
    formData.append('borrowerLastName', $('#borrowerLastName').val());
    formData.append('borrowerSSN', $('#borrowerSSN').val());
    formData.append('borrowerDOB', $('#borrowerDOB').val());
    formData.append('employmentType', $('#employmentType').val());
    formData.append('employerName', $('#employerName').val());
    formData.append('annualIncome', $('#annualIncome').val());
    formData.append('checkingAccounts', $('#checkingAccounts').val());
    formData.append('creditCardDebt', $('#creditCardDebt').val());
    formData.append('propertyAddress', $('#propertyAddress').val());
    formData.append('propertyValue', $('#propertyValue').val());
    formData.append('loanPurpose', $('#loanPurpose').val());
    formData.append('loanTerm', $('#loanTerm').val());
    formData.append('loanType', $('#loanType').val());
    formData.append('rateLock', $('#rateLock').val());

    const files = $('#loanDocs')[0].files;
    for (let i = 0; i < files.length; i++) {
      formData.append('loanDocs', files[i]);
    }

    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveLoanApplication',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your application data has been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Save logic for Authorizations & Consent
  $('.save-authorizations-consent').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.authorization-form');
    const $taskItem = $form.closest('.task-item[data-task-id="authorizations"]');

    const eSignature = $('#eSignature').val();
    const hasAgreed = $('#authorizationsAgree').is(':checked');

    let newStatus;
    if (hasAgreed && eSignature) {
      newStatus = 'Completed';
    } else if (hasAgreed || eSignature) {
      newStatus = 'In Progress';
    } else {
      newStatus = 'Not Started';
    }

    const formData = new FormData();
    formData.append('eSignature', eSignature);
    formData.append('hasAgreed', hasAgreed);
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveAuthorizationsConsent',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your authorization & consent data has been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Save logic for Identification Documents
  $('.save-identification-docs').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.identification-form');
    const $taskItem = $form.closest('.task-item[data-task-id="identification"]');

    const fileInput = $('#idDocs')[0];

    let newStatus = 'Not Started';
    if (fileInput.files.length > 0 || $taskItem.attr('data-task-status') === 'In Progress' || $taskItem.attr('data-task-status') === 'Completed') {
      newStatus = 'In Progress';
    }

    const formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append('idDocs', fileInput.files[0]);
    }
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveIdentificationDocuments',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your identification documents have been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Save logic for Income Verification Documents
  $('.save-income-docs').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.income-verification-form');
    const $taskItem = $form.closest('.task-item[data-task-id="incomeVerification"]');

    const employmentType = $taskItem.data('employment-type');

    const formData = new FormData();
    formData.append('employmentType', employmentType);

    let requiredFilesPresent = true;

    if (employmentType === 'W-2') {
      const payStubsFiles = $('#payStubs')[0].files;
      const w2sFiles = $('#w2s')[0].files;

      if (payStubsFiles.length > 0) {
        for (let i = 0; i < payStubsFiles.length; i++) {
          formData.append('payStubs', payStubsFiles[i]);
        }
      } else {
        requiredFilesPresent = false;
      }

      if (w2sFiles.length > 0) {
        for (let i = 0; i < w2sFiles.length; i++) {
          formData.append('w2s', w2sFiles[i]);
        }
      } else {
        requiredFilesPresent = false;
      }
    } else {
      // Self-Employed
      const taxReturnsFiles = $('#taxReturns')[0].files;
      const form1099Files = $('#form1099s')[0].files;
      const pnlFiles = $('#pnlDocs')[0].files;

      if (taxReturnsFiles.length > 0) {
        for (let i = 0; i < taxReturnsFiles.length; i++) {
          formData.append('taxReturns', taxReturnsFiles[i]);
        }
      } else {
        requiredFilesPresent = false;
      }

      if (form1099Files.length > 0) {
        for (let i = 0; i < form1099Files.length; i++) {
          formData.append('form1099s', form1099Files[i]);
        }
      } else {
        requiredFilesPresent = false;
      }

      if (pnlFiles.length > 0) {
        for (let i = 0; i < pnlFiles.length; i++) {
          formData.append('pnlDocs', pnlFiles[i]);
        }
      } else {
        requiredFilesPresent = false;
      }
    }

    let newStatus;
    if (requiredFilesPresent) {
      newStatus = 'Completed';
    } else {
      const anyFileUploaded = (employmentType === 'W-2')
        ? ($('#payStubs')[0].files.length > 0 || $('#w2s')[0].files.length > 0)
        : ($('#taxReturns')[0].files.length > 0 || $('#form1099s')[0].files.length > 0 || $('#pnlDocs')[0].files.length > 0);

      if (anyFileUploaded) {
        newStatus = 'In Progress';
      } else {
        newStatus = 'Not Started';
      }
    }

    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveIncomeVerification',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your income verification documents have been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Liability Verification Logic
  $('.save-liability-docs').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.liability-verification-form');
    const $taskItem = $form.closest('.task-item[data-task-id="liabilityVerification"]');

    const loanPurpose = $taskItem.data('loan-purpose');

    const creditFiles = $('#creditCardStatements')[0].files;
    const autoFiles = $('#autoLoanStatements')[0].files;
    const studentFiles = $('#studentLoanStatements')[0].files;
    let mortgageFiles = [];
    if (loanPurpose === 'Refinance') {
      mortgageFiles = $('#mortgageStatement')[0].files;
    }

    let requiredFilesPresent = true;
    if (creditFiles.length === 0) requiredFilesPresent = false;
    if (autoFiles.length === 0) requiredFilesPresent = false;
    if (studentFiles.length === 0) requiredFilesPresent = false;
    if (loanPurpose === 'Refinance' && mortgageFiles.length === 0) {
      requiredFilesPresent = false;
    }

    let newStatus;
    if (requiredFilesPresent) {
      newStatus = 'Completed';
    } else {
      const anyFileUploaded = (creditFiles.length > 0 || autoFiles.length > 0 || studentFiles.length > 0 || (loanPurpose === 'Refinance' && mortgageFiles.length > 0));
      if (anyFileUploaded) {
        newStatus = 'In Progress';
      } else {
        newStatus = 'Not Started';
      }
    }

    const formData = new FormData();
    for (let i = 0; i < creditFiles.length; i++) {
      formData.append('creditCardStatements', creditFiles[i]);
    }
    for (let i = 0; i < autoFiles.length; i++) {
      formData.append('autoLoanStatements', autoFiles[i]);
    }
    for (let i = 0; i < studentFiles.length; i++) {
      formData.append('studentLoanStatements', studentFiles[i]);
    }
    if (loanPurpose === 'Refinance') {
      for (let i = 0; i < mortgageFiles.length; i++) {
        formData.append('mortgageStatement', mortgageFiles[i]);
      }
    }

    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveLiabilityVerification',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your liability verification documents have been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Step 4: Add Save logic for Disclosures & Loan Estimate Review
  $('.save-disclosures').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.disclosures-form');
    const $taskItem = $form.closest('.task-item[data-task-id="disclosures"]');

    const eSignature = $('#eSignatureDisclosures').val();
    const hasECOA = $('#ecoaCheck').is(':checked');
    const hasFCRA = $('#fcraCheck').is(':checked');
    const hasHomeLoanToolkit = $('#homeLoanToolkitCheck').is(':checked');
    const intentToProceed = $('#intentToProceedCheck').is(':checked');

    let newStatus;

    const allRequiredAck = (hasECOA && hasFCRA && hasHomeLoanToolkit && eSignature && eSignature.trim() !== '' && intentToProceed);

    if (allRequiredAck) {
      newStatus = 'Completed';
    } else {
      const somethingEntered = hasECOA || hasFCRA || hasHomeLoanToolkit || (eSignature && eSignature.trim() !== '') || intentToProceed;
      if (somethingEntered) {
        newStatus = 'In Progress';
      } else {
        newStatus = 'Not Started';
      }
    }

    const formData = new FormData();
    formData.append('eSignature', eSignature || '');
    formData.append('hasECOA', hasECOA);
    formData.append('hasFCRA', hasFCRA);
    formData.append('hasHomeLoanToolkit', hasHomeLoanToolkit);
    formData.append('intentToProceed', intentToProceed);
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveDisclosures',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your disclosures and LE acknowledgments have been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          updateProgress();
        } else {
          alert('Error saving disclosures. Please try again.');
        }
      }
    });
  });

  // Co-Borrower Logic (Optional Task)
  $('.save-co-borrower').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.co-borrower-form');
    const $taskItem = $form.closest('.task-item[data-task-id="coBorrower"]');

    const firstName = $('#coBorrowerFirstName').val();
    const lastName = $('#coBorrowerLastName').val();
    const docs = $('#coBorrowerDocs')[0].files;

    let newStatus = 'Not Started';

    const somethingEntered = (firstName && firstName.trim() !== '') || (lastName && lastName.trim() !== '') || docs.length > 0;
    const allFieldsFilled = (firstName && firstName.trim() !== '') && (lastName && lastName.trim() !== '');
    if (allFieldsFilled && docs.length > 0) {
      newStatus = 'Completed';
    } else if (somethingEntered) {
      newStatus = 'In Progress';
    }

    const formData = new FormData();
    formData.append('coBorrowerFirstName', firstName || '');
    formData.append('coBorrowerLastName', lastName || '');
    for (let i = 0; i < docs.length; i++) {
      formData.append('coBorrowerDocs', docs[i]);
    }
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveCoBorrowerInfo',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Co-borrower information has been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800');
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          // Optional task does not affect the main progress
          updateProgress();
        } else {
          alert('Error saving co-borrower info. Please try again.');
        }
      }
    });
  });

  // Purchase Agreement Logic (Optional Task)
  $('.save-purchase-agreement').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.purchase-agreement-form');
    const $taskItem = $form.closest('.task-item[data-task-id="purchaseAgreement"]');

    const fileInput = $('#purchaseAgreement')[0].files;

    let newStatus = 'Not Started';

    if (fileInput.length > 0) {
      newStatus = 'Completed';
    } else {
      newStatus = 'Not Started';
    }

    const formData = new FormData();
    if (fileInput.length > 0) {
      formData.append('purchaseAgreement', fileInput[0]);
    }
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/savePurchaseAgreement',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your purchase agreement has been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          // Optional task does not affect main progress
          updateProgress();
        } else {
          alert('Error saving purchase agreement. Please try again.');
        }
      }
    });
  });

  // Gift Letter Logic (Optional Task)
  $('.save-gift-letter').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.gift-letter-form');
    const $taskItem = $form.closest('.task-item[data-task-id="giftLetter"]');

    const fileInput = $('#giftLetter')[0].files;

    let newStatus = 'Not Started';

    if (fileInput.length > 0) {
      newStatus = 'Completed';
    } else {
      newStatus = 'Not Started';
    }

    const formData = new FormData();
    if (fileInput.length > 0) {
      formData.append('giftLetter', fileInput[0]);
    }
    formData.append('newStatus', newStatus);

    $.ajax({
      url: '/saveGiftLetter',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your gift letter has been saved.');
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');

          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
            $statusLabel.text('Completed');
          } else {
            $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800');
            $statusLabel.text('Not Started');
          }

          // Optional task does not affect main progress
          updateProgress();
        } else {
          alert('Error saving gift letter. Please try again.');
        }
      }
    });
  });

  // Final Submission Button
  $('#submitApplication').on('click', function() {
    if (!$(this).prop('disabled')) {
      $.ajax({
        url: '/finalSubmitApplication',
        method: 'POST',
        success: function(response) {
          if (response.success) {
            alert('Your application has been submitted for review!');
            $('[data-task-id]').attr('data-task-status', 'Completed').each(function() {
              const $statusLabel = $(this).find('.task-status-label');
              $statusLabel.removeClass().addClass('task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800');
              $statusLabel.text('Completed');
            });
            updateProgress();
          } else {
            alert('Error submitting application. Please try again.');
          }
        }
      });
    }
  });

  // Initially show home tab
  $('[data-tab="homeTab"]').click();
  updateProgress();
});











  