$(document).ready(function() {
  const $tasks = $('.task-item');
  const $progressBar = $('#progressBar');
  const $submitBtn = $('#submitApplication');

  function updateProgress() {
    const totalTasks = $tasks.length;
    let completedCount = 0;
    $tasks.each(function() {
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
    if (taskId === 'loanApplication') {
      $taskItem.find('.loan-application-form').toggleClass('hidden');
    } else if (taskId === 'authorizations') {
      $taskItem.find('.authorization-form').toggleClass('hidden');
    } else if (taskId === 'identification') {
      $taskItem.find('.identification-form').toggleClass('hidden');
    } else if (taskId === 'incomeVerification') {
      $taskItem.find('.income-verification-form').toggleClass('hidden');
    } else if (taskId === 'assetVerification') {
      $taskItem.find('.asset-verification-form').toggleClass('hidden');
    } else if (taskId === 'liabilityVerification') {
      // Liability Verification form toggle
      $taskItem.find('.liability-verification-form').toggleClass('hidden');
    }
    // Add other task toggles if needed
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

  // Asset Verification logic already integrated above

  // Liability Verification Logic (Step 4)
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
    // Credit, auto, student always required
    if (creditFiles.length === 0) requiredFilesPresent = false;
    if (autoFiles.length === 0) requiredFilesPresent = false;
    if (studentFiles.length === 0) requiredFilesPresent = false;
    // Mortgage statement required if refinance
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

  // Final Submission Button
  $submitBtn.on('click', function() {
    if (!$submitBtn.prop('disabled')) {
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








  