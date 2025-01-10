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

    let $formToToggle;

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

      if ($formToToggle.hasClass('hidden')) {
        $arrow.removeClass('rotate-180');
      } else {
        $arrow.addClass('rotate-180');
      }
    }
  });

  // Helper function to update file preview on file selection
  function updateFilePreview(inputId, previewContainerId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return; // If element not found, skip

    fileInput.addEventListener('change', function() {
      const previewContainer = document.getElementById(previewContainerId);
      if (!previewContainer) return;

      previewContainer.innerHTML = '';
      if (fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const objectURL = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = objectURL;
          link.target = '_blank';
          link.textContent = file.name + ' (Local Preview)';
          link.classList.add('text-blue-600', 'underline', 'block', 'mb-1');
          previewContainer.appendChild(link);
        }
      } else {
        previewContainer.textContent = 'No file chosen.';
      }
    });
  }

  updateFilePreview('payStubs', 'payStubsPreview');
  updateFilePreview('w2s', 'w2sPreview');
  updateFilePreview('taxReturns', 'taxReturnsPreview');
  updateFilePreview('form1099s', 'form1099sPreview');
  updateFilePreview('pnlDocs', 'pnlDocsPreview');
  updateFilePreview('idDocs', 'idDocsPreview');
  updateFilePreview('bankStatements', 'bankStatementsPreview');
  updateFilePreview('investmentStatements', 'investmentStatementsPreview');
  updateFilePreview('retirementStatements', 'retirementStatementsPreview');
  updateFilePreview('creditCardStatements', 'creditCardStatementsPreview');
  updateFilePreview('autoLoanStatements', 'autoLoanStatementsPreview');
  updateFilePreview('studentLoanStatements', 'studentLoanStatementsPreview');
  updateFilePreview('mortgageStatement', 'mortgageStatementPreview');
  updateFilePreview('purchaseAgreement', 'purchaseAgreementPreview');
  updateFilePreview('giftLetter', 'giftLetterPreview');

  

  // Save logic for Loan Application & Loan Details
  $('.save-loan-details').on('click', function(e) {
    e.stopPropagation();
    const $form = $(this).closest('.loan-application-form');
    const $taskItem = $form.closest('.task-item[data-task-id="loanApplication"]');
  
    // -------------------------------------
    // VALIDATION - CHECK REQUIRED FIELDS
    // -------------------------------------
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
  
// -------------------------------------
// GATHER FORM DATA
// -------------------------------------
const formData = new FormData();

// Borrower Name Parts
formData.append('borrowerFirstName',      $('#borrowerFirstName').val());
formData.append('borrowerMiddleName',     $('#borrowerMiddleName').val());
formData.append('borrowerSuffix',         $('#borrowerSuffix').val());
formData.append('alternateNames',         $('#alternateNames').val());

// Basic Info
formData.append('borrowerLastName',       $('#borrowerLastName').val());
formData.append('borrowerSSN',            $('#borrowerSSN').val());
formData.append('borrowerDOB',            $('#borrowerDOB').val());
formData.append('citizenship',            $('#citizenship').val());

// Type of Credit
formData.append('typeOfCredit',           $('#typeOfCredit').val());
formData.append('numberOfBorrowers',      $('#numberOfBorrowers').val());

// Marital / Dependents
formData.append('maritalStatus',          $('#maritalStatus').val());
formData.append('dependentsNumber',       $('#dependentsNumber').val());
formData.append('dependentsAges',         $('#dependentsAges').val());

// --- NEW: Contact Info ---
formData.append('homePhone',              $('#homePhone').val());
formData.append('cellPhone',              $('#cellPhone').val());
formData.append('workPhone',              $('#workPhone').val());
formData.append('emailAddress',           $('#emailAddress').val());

// Current Address
formData.append('currentAddressStreet',   $('#currentAddressStreet').val());
formData.append('currentAddressCity',     $('#currentAddressCity').val());
formData.append('currentAddressState',    $('#currentAddressState').val());
formData.append('currentAddressZip',      $('#currentAddressZip').val());
formData.append('currentAddressYears',    $('#currentAddressYears').val());
formData.append('currentAddressMonths',   $('#currentAddressMonths').val());
formData.append('currentAddressHousing',  $('#currentAddressHousing').val());
formData.append('currentAddressRent',     $('#currentAddressRent').val());

// Former Address
const formerBoxChecked = $('#chkFormerAddress').is(':checked');
// If box is checked => “Does not apply” => HasFormer = false
const hasFormer = !formerBoxChecked; 
formData.append('hasFormerAddress', hasFormer ? 'true' : 'false');
formData.append('formerAddressStreet',    $('#formerAddressStreet').val());
formData.append('formerAddressCity',      $('#formerAddressCity').val());
formData.append('formerAddressState',     $('#formerAddressState').val());
formData.append('formerAddressZip',       $('#formerAddressZip').val());
formData.append('formerAddressYears',     $('#formerAddressYears').val());
formData.append('formerAddressMonths',    $('#formerAddressMonths').val());
formData.append('formerAddressHousing',   $('#formerAddressHousing').val());
formData.append('formerAddressRent',      $('#formerAddressRent').val());

// Mailing Address
const hasMailing = !$('#chkMailingAddress').is(':checked');
formData.append('hasMailingAddress', hasMailing ? 'true' : 'false');
formData.append('mailingAddressStreet',   $('#mailingAddressStreet').val());
formData.append('mailingAddressCity',     $('#mailingAddressCity').val());
formData.append('mailingAddressState',    $('#mailingAddressState').val());
formData.append('mailingAddressZip',      $('#mailingAddressZip').val());

// Employment / Income (Section 1b)
const currentBoxChecked = $('#chkCurrentEmployment').is(':checked');
const hasCurrentEmployment = !currentBoxChecked; 
formData.append('hasCurrentEmployment', hasCurrentEmployment ? 'true' : 'false');
formData.append('employmentType',         $('#employmentType').val());
formData.append('employerName',           $('#employerName').val());
formData.append('annualIncome',           $('#annualIncome').val());

// Current Employment
formData.append('employerPhone',         $('#employerPhone').val());
formData.append('employerStreet',        $('#employerStreet').val());
formData.append('employerUnit',          $('#employerUnit').val());
formData.append('employerCity',          $('#employerCity').val());
formData.append('employerState',         $('#employerState').val());
formData.append('employerZip',           $('#employerZip').val());
formData.append('employerCountry',       $('#employerCountry').val());
formData.append('positionTitle',         $('#positionTitle').val());
formData.append('startDate',            $('#startDate').val());
formData.append('lineOfWorkYears',      $('#lineOfWorkYears').val());
formData.append('lineOfWorkMonths',     $('#lineOfWorkMonths').val());

// Checkboxes / radio
formData.append('isFamilyEmployee',      $('#isFamilyEmployee').is(':checked') ? 'true' : 'false');
formData.append('ownershipShare',        $('input[name="ownershipShare"]:checked').val() || null);
formData.append('monthlyIncomeOrLoss',   $('#monthlyIncomeOrLoss').val());

// Gross monthly incomes
formData.append('baseIncome',           $('#baseIncome').val());
formData.append('overtimeIncome',       $('#overtimeIncome').val());
formData.append('bonusIncome',          $('#bonusIncome').val());
formData.append('commissionIncome',     $('#commissionIncome').val());
formData.append('militaryEntitlements', $('#militaryEntitlements').val());
formData.append('otherIncome',          $('#otherIncome').val());

// Section 1c: Additional Employment
const additionalBoxChecked = $('#chkAdditionalEmployment').is(':checked');
const hasAdditional = !additionalBoxChecked; 
formData.append('hasAdditionalEmployment', hasAdditional ? 'true' : 'false');
formData.append('employerNameAdditional1',           $('#employerNameAdditional1').val());
formData.append('employerPhoneAdditional1',          $('#employerPhoneAdditional1').val());
formData.append('employerStreetAdditional1',         $('#employerStreetAdditional1').val());
formData.append('employerUnitAdditional1',           $('#employerUnitAdditional1').val());
formData.append('employerCityAdditional1',           $('#employerCityAdditional1').val());
formData.append('employerStateAdditional1',          $('#employerStateAdditional1').val());
formData.append('employerZipAdditional1',            $('#employerZipAdditional1').val());
formData.append('employerCountryAdditional1',        $('#employerCountryAdditional1').val());
formData.append('positionTitleAdditional1',          $('#positionTitleAdditional1').val());
formData.append('startDateAdditional1',              $('#startDateAdditional1').val());
formData.append('lineOfWorkYearsAdditional1',        $('#lineOfWorkYearsAdditional1').val());
formData.append('lineOfWorkMonthsAdditional1',       $('#lineOfWorkMonthsAdditional1').val());

formData.append('isFamilyEmployeeAdditional1',        $('#isFamilyEmployeeAdditional1').is(':checked') ? 'true' : 'false');
formData.append('ownershipShareAdditional1',         $('input[name="ownershipShareAdditional1"]:checked').val() || null);
formData.append('monthlyIncomeOrLossAdditional1',    $('#monthlyIncomeOrLossAdditional1').val());

// Gross monthly income Additional1
formData.append('baseIncomeAdditional1',             $('#baseIncomeAdditional1').val());
formData.append('overtimeIncomeAdditional1',         $('#overtimeIncomeAdditional1').val());
formData.append('bonusIncomeAdditional1',            $('#bonusIncomeAdditional1').val());
formData.append('commissionIncomeAdditional1',       $('#commissionIncomeAdditional1').val());
formData.append('militaryEntitlementsAdditional1',   $('#militaryEntitlementsAdditional1').val());
formData.append('otherIncomeAdditional1',            $('#otherIncomeAdditional1').val());

// Section 1d: Previous Employment
const previousEmploymentBoxChecked = $('#chkPreviousEmploymentAdditional2').is(':checked');
const hasPreviousEmploymentAdditional2 = !previousEmploymentBoxChecked;
formData.append('hasPreviousEmploymentAdditional2', hasPreviousEmploymentAdditional2 ? 'true' : 'false');
formData.append('employerNameAdditional2',         $('#employerNameAdditional2').val());
formData.append('prevGrossMonthlyIncomeAdditional2', $('#prevGrossMonthlyIncomeAdditional2').val());

formData.append('employerStreetAdditional2',       $('#employerStreetAdditional2').val());
formData.append('employerUnitAdditional2',         $('#employerUnitAdditional2').val());
formData.append('employerCityAdditional2',         $('#employerCityAdditional2').val());
formData.append('employerStateAdditional2',        $('#employerStateAdditional2').val());
formData.append('employerZipAdditional2',          $('#employerZipAdditional2').val());
formData.append('employerCountryAdditional2',      $('#employerCountryAdditional2').val());

formData.append('positionTitleAdditional2',        $('#positionTitleAdditional2').val());
formData.append('startDateAdditional2',            $('#startDateAdditional2').val());
formData.append('endDateAdditional2',              $('#endDateAdditional2').val());

// Check if business owner or self-employed
formData.append('wasBusinessOwnerAdditional2',     $('#wasBusinessOwnerAdditional2').is(':checked') ? 'true' : 'false');

// Section 1e: Income From Other Sources
const otherIncomeBoxChecked = $('#chkOtherIncome').is(':checked');
const hasOtherIncome = !otherIncomeBoxChecked;
formData.append('hasOtherIncome', hasOtherIncome ? 'true' : 'false');
formData.append('incomeSource1',  $('#incomeSource1').val());
formData.append('monthlyIncome1', $('#monthlyIncome1').val());

formData.append('incomeSource2',  $('#incomeSource2').val());
formData.append('monthlyIncome2', $('#monthlyIncome2').val());

formData.append('incomeSource3',  $('#incomeSource3').val());
formData.append('monthlyIncome3', $('#monthlyIncome3').val());

formData.append('incomeSource4',  $('#incomeSource4').val());
formData.append('monthlyIncome4', $('#monthlyIncome4').val());

// Section 2a: Assets
formData.append('accountType1',          $('#accountType1').val());
formData.append('financialInstitution1', $('#financialInstitution1').val());
formData.append('accountNumber1',        $('#accountNumber1').val());
formData.append('cashValue1',           $('#cashValue1').val());

formData.append('accountType2',          $('#accountType2').val());
formData.append('financialInstitution2', $('#financialInstitution2').val());
formData.append('accountNumber2',        $('#accountNumber2').val());
formData.append('cashValue2',           $('#cashValue2').val());

formData.append('accountType3',          $('#accountType3').val());
formData.append('financialInstitution3', $('#financialInstitution3').val());
formData.append('accountNumber3',        $('#accountNumber3').val());
formData.append('cashValue3',           $('#cashValue3').val());

formData.append('accountType4',          $('#accountType4').val());
formData.append('financialInstitution4', $('#financialInstitution4').val());
formData.append('accountNumber4',        $('#accountNumber4').val());
formData.append('cashValue4',           $('#cashValue4').val());

formData.append('accountType5',          $('#accountType5').val());
formData.append('financialInstitution5', $('#financialInstitution5').val());
formData.append('accountNumber5',        $('#accountNumber5').val());
formData.append('cashValue5',           $('#cashValue5').val());

// Section 2b: Other Assets & Credits
const assets2bChecked = $('#chkAssets2b').is(':checked');
const hasOtherAssets2b = !assets2bChecked;
formData.append('hasOtherAssets2b', hasOtherAssets2b ? 'true' : 'false');


formData.append('assetCreditType1',  $('#assetCreditType1').val());
formData.append('assetCreditValue1', $('#assetCreditValue1').val());

formData.append('assetCreditType2',  $('#assetCreditType2').val());
formData.append('assetCreditValue2', $('#assetCreditValue2').val());

formData.append('assetCreditType3',  $('#assetCreditType3').val());
formData.append('assetCreditValue3', $('#assetCreditValue3').val());

formData.append('assetCreditType4',  $('#assetCreditType4').val());
formData.append('assetCreditValue4', $('#assetCreditValue4').val());

// Section 2c: Liabilities
const liabilities2cChecked = $('#chkLiabilities2c').is(':checked');
const hasLiabilities2c = !liabilities2cChecked;
formData.append('hasLiabilities2c', hasLiabilities2c ? 'true' : 'false');

formData.append('accountType2c1',    $('#accountType2c1').val());
formData.append('companyName2c1',    $('#companyName2c1').val());
formData.append('accountNumber2c1',  $('#accountNumber2c1').val());
formData.append('unpaidBalance2c1',  $('#unpaidBalance2c1').val());
formData.append('payOff2c1',         $('#payOff2c1').is(':checked') ? 'true' : 'false');
formData.append('monthlyPayment2c1', $('#monthlyPayment2c1').val());

formData.append('accountType2c2',    $('#accountType2c2').val());
formData.append('companyName2c2',    $('#companyName2c2').val());
formData.append('accountNumber2c2',  $('#accountNumber2c2').val());
formData.append('unpaidBalance2c2',  $('#unpaidBalance2c2').val());
formData.append('payOff2c2',         $('#payOff2c2').is(':checked') ? 'true' : 'false');
formData.append('monthlyPayment2c2', $('#monthlyPayment2c2').val());

formData.append('accountType2c3',    $('#accountType2c3').val());
formData.append('companyName2c3',    $('#companyName2c3').val());
formData.append('accountNumber2c3',  $('#accountNumber2c3').val());
formData.append('unpaidBalance2c3',  $('#unpaidBalance2c3').val());
formData.append('payOff2c3',         $('#payOff2c3').is(':checked') ? 'true' : 'false');
formData.append('monthlyPayment2c3', $('#monthlyPayment2c3').val());

formData.append('accountType2c4',    $('#accountType2c4').val());
formData.append('companyName2c4',    $('#companyName2c4').val());
formData.append('accountNumber2c4',  $('#accountNumber2c4').val());
formData.append('unpaidBalance2c4',  $('#unpaidBalance2c4').val());
formData.append('payOff2c4',         $('#payOff2c4').is(':checked') ? 'true' : 'false');
formData.append('monthlyPayment2c4', $('#monthlyPayment2c4').val());

formData.append('accountType2c5',    $('#accountType2c5').val());
formData.append('companyName2c5',    $('#companyName2c5').val());
formData.append('accountNumber2c5',  $('#accountNumber2c5').val());
formData.append('unpaidBalance2c5',  $('#unpaidBalance2c5').val());
formData.append('payOff2c5',         $('#payOff2c5').is(':checked') ? 'true' : 'false');
formData.append('monthlyPayment2c5', $('#monthlyPayment2c5').val());

// Section 2d: Other Liabilities
const liabilities2dChecked = $('#chkLiabilities2d').is(':checked');
const hasOtherLiabilities2d = !liabilities2dChecked;
formData.append('hasOtherLiabilities2d', hasOtherLiabilities2d ? 'true' : 'false');

formData.append('liabilityType2d1',  $('#liabilityType2d1').val());
formData.append('monthlyPayment2d1', $('#monthlyPayment2d1').val());

formData.append('liabilityType2d2',  $('#liabilityType2d2').val());
formData.append('monthlyPayment2d2', $('#monthlyPayment2d2').val());

formData.append('liabilityType2d3',  $('#liabilityType2d3').val());
formData.append('monthlyPayment2d3', $('#monthlyPayment2d3').val());

formData.append('liabilityType2d4',  $('#liabilityType2d4').val());
formData.append('monthlyPayment2d4', $('#monthlyPayment2d4').val());

// Section 3: Real Estate
const noRealEstate = $('#chkNoRealEstate').is(':checked');
const hasRealEstate3 = !noRealEstate;
formData.append('hasRealEstate3', hasRealEstate3 ? 'true' : 'false');

// Section 3a: Property #1
formData.append('propertyStreet1', $('#propertyStreet1').val());
formData.append('propertyCity1',   $('#propertyCity1').val());
formData.append('propertyState1',  $('#propertyState1').val());
formData.append('propertyZip1',    $('#propertyZip1').val());
formData.append('propertyValue1',  $('#propertyValue1').val());
formData.append('propertyStatus1', $('#propertyStatus1').val());
formData.append('intendedOccupancy1', $('#intendedOccupancy1').val());
formData.append('monthlyInsurance1',  $('#monthlyInsurance1').val());
formData.append('monthlyRentalIncome1', $('#monthlyRentalIncome1').val());

const noMortgage1 = $('#chkNoMortgage1').is(':checked');
const hasMortgageLoans1 = !noMortgage1;
formData.append('hasMortgageLoans1', hasMortgageLoans1 ? 'true' : 'false');

formData.append('creditorName1',    $('#creditorName1').val());
formData.append('creditorAccount1', $('#creditorAccount1').val());
formData.append('mortgagePayment1', $('#mortgagePayment1').val());
formData.append('unpaidBalance1',   $('#unpaidBalance1').val());
formData.append('payOffMortgage1',  $('#payOffMortgage1').is(':checked') ? 'true' : 'false');
formData.append('mortgageType1',    $('#mortgageType1').val());

// Section 3b: Property #2
const noProperty2 = $('#chkNoProperty2').is(':checked');
const hasProperty2 = !noProperty2;
formData.append('hasProperty2', hasProperty2 ? 'true' : 'false');

formData.append('propertyStreet2', $('#propertyStreet2').val());
formData.append('propertyCity2',   $('#propertyCity2').val());
formData.append('propertyState2',  $('#propertyState2').val());
formData.append('propertyZip2',    $('#propertyZip2').val());
formData.append('propertyValue2',  $('#propertyValue2').val());
formData.append('propertyStatus2', $('#propertyStatus2').val());
formData.append('intendedOccupancy2', $('#intendedOccupancy2').val());
formData.append('monthlyInsurance2',  $('#monthlyInsurance2').val());
formData.append('monthlyRentalIncome2', $('#monthlyRentalIncome2').val());

const noMortgage2 = $('#chkNoMortgage2').is(':checked');
const hasMortgageLoans2 = !noMortgage2;
formData.append('hasMortgageLoans2', hasMortgageLoans2 ? 'true' : 'false');

formData.append('creditorName2',     $('#creditorName2').val());
formData.append('creditorAccount2',  $('#creditorAccount2').val());
formData.append('mortgagePayment2',  $('#mortgagePayment2').val());
formData.append('unpaidBalance2',    $('#unpaidBalance2').val());
formData.append('payOffMortgage2',   $('#payOffMortgage2').is(':checked') ? 'true' : 'false');
formData.append('mortgageType2',     $('#mortgageType2').val());

// Section 3c: Property #3
const noProperty3 = $('#chkNoProperty3').is(':checked');
const hasProperty3 = !noProperty3;
formData.append('hasProperty3', hasProperty3 ? 'true' : 'false');

formData.append('propertyStreet3',  $('#propertyStreet3').val());
formData.append('propertyCity3',    $('#propertyCity3').val());
formData.append('propertyState3',   $('#propertyState3').val());
formData.append('propertyZip3',     $('#propertyZip3').val());
formData.append('propertyValue3',   $('#propertyValue3').val());
formData.append('propertyStatus3',  $('#propertyStatus3').val());
formData.append('intendedOccupancy3', $('#intendedOccupancy3').val());
formData.append('monthlyInsurance3',  $('#monthlyInsurance3').val());
formData.append('monthlyRentalIncome3', $('#monthlyRentalIncome3').val());

const noMortgage3 = $('#chkNoMortgage3').is(':checked');
const hasMortgageLoans3 = !noMortgage3;
formData.append('hasMortgageLoans3', hasMortgageLoans3 ? 'true' : 'false');

formData.append('creditorName3',    $('#creditorName3').val());
formData.append('creditorAccount3', $('#creditorAccount3').val());
formData.append('mortgagePayment3', $('#mortgagePayment3').val());
formData.append('unpaidBalance3',   $('#unpaidBalance3').val());
formData.append('payOffMortgage3',  $('#payOffMortgage3').is(':checked') ? 'true' : 'false');
formData.append('mortgageType3',    $('#mortgageType3').val());

// Section 4: Loan and Property Information

// Section 4a:
formData.append('loanAmount4', $('#loanAmount4').val());

// Loan Purpose
const loanPurpose4 = $('input[name="loanPurpose4"]:checked').val() || null;
formData.append('loanPurpose4', loanPurpose4);

// If "Other" => let user specify
formData.append('loanPurposeOtherDesc4', $('#loanPurposeOtherDesc4').val());

// Property
formData.append('propertyStreet4', $('#propertyStreet4').val());
formData.append('propertyCity4',   $('#propertyCity4').val());
formData.append('propertyState4',  $('#propertyState4').val());
formData.append('propertyZip4',    $('#propertyZip4').val());
formData.append('propertyCounty4', $('#propertyCounty4').val());
formData.append('propertyUnit4',   $('#propertyUnit4').val());

// Number of Units, Property Value
formData.append('numberOfUnits4',  $('#numberOfUnits4').val());
formData.append('propertyValue4',  $('#propertyValue4').val());

// Occupancy (radio)
const occupancy4 = $('input[name="occupancy4"]:checked').val() || null;
formData.append('occupancy4', occupancy4);

// FHA Secondary Residence (checkbox)
formData.append('fhaSecondaryResidence4', $('#fhaSecondaryResidence4').is(':checked') ? 'true' : 'false');

// Mixed-Use (radio)
const mixedUseVal = $('input[name="mixedUse4"]:checked').val();
let mixedUse4 = null; // We'll store it as boolean
if (mixedUseVal === 'Yes') {
  mixedUse4 = 'true';
} else if (mixedUseVal === 'No') {
  mixedUse4 = 'false';
}
formData.append('mixedUse4', mixedUse4);

// Manufactured Home (radio)
const manufacturedVal = $('input[name="manufacturedHome4"]:checked').val();
let manufacturedHome4 = null; 
if (manufacturedVal === 'Yes') {
  manufacturedHome4 = 'true';
} else if (manufacturedVal === 'No') {
  manufacturedHome4 = 'false';
}
formData.append('manufacturedHome4', manufacturedHome4);

// Section 4b: Other New Mortgage Loans on the Property You Are Buying or Refinancing
const noMortgage4bChecked = $('#chkNoMortgage4b').is(':checked');
const hasNewMortgages4b = !noMortgage4bChecked;
formData.append('hasNewMortgages4b', hasNewMortgages4b ? 'true' : 'false');


formData.append('creditorName4b1',     $('#creditorName4b1').val());
formData.append('lienType4b1',        $('input[name="lienType4b1"]:checked').val() || '');
formData.append('monthlyPayment4b1',   $('#monthlyPayment4b1').val());
formData.append('loanAmount4b1',       $('#loanAmount4b1').val());
formData.append('creditLimit4b1',      $('#creditLimit4b1').val());


formData.append('creditorName4b2',     $('#creditorName4b2').val());
formData.append('lienType4b2',        $('input[name="lienType4b2"]:checked').val() || '');
formData.append('monthlyPayment4b2',   $('#monthlyPayment4b2').val());
formData.append('loanAmount4b2',       $('#loanAmount4b2').val());
formData.append('creditLimit4b2',      $('#creditLimit4b2').val());

// Section 4c: Rental Income on the Property You Want to Purchase
const noRental4cChecked = $('#chkNoRental4c').is(':checked');
const hasRentalIncome4c = !noRental4cChecked;
formData.append('hasRentalIncome4c', hasRentalIncome4c ? 'true' : 'false');

formData.append('expectedRentalIncome4c', $('#expectedRentalIncome4c').val());
formData.append('netRentalIncome4c',     $('#netRentalIncome4c').val());

// Section 4d: Gifts or Grants
const noGifts4dChecked = $('#chkNoGifts4d').is(':checked');
const hasGiftsGrants4d = !noGifts4dChecked;
formData.append('hasGiftsGrants4d', hasGiftsGrants4d ? 'true' : 'false');

formData.append('giftAssetType4d1',  $('#giftAssetType4d1').val());
formData.append('deposited4d1',      $('input[name="deposited4d1"]:checked').val() || '');
formData.append('giftSource4d1',     $('#giftSource4d1').val());
formData.append('giftValue4d1',      $('#giftValue4d1').val());

formData.append('giftAssetType4d2',  $('#giftAssetType4d2').val());
formData.append('deposited4d2',      $('input[name="deposited4d2"]:checked').val() || '');
formData.append('giftSource4d2',     $('#giftSource4d2').val());
formData.append('giftValue4d2',      $('#giftValue4d2').val());

// Assets & Liabilities
formData.append('checkingAccounts',       $('#checkingAccounts').val());
formData.append('creditCardDebt',         $('#creditCardDebt').val());

// Property Details
formData.append('propertyAddress',        $('#propertyAddress').val());
formData.append('propertyValue',          $('#propertyValue').val());

// Loan Preferences
formData.append('loanPurpose',            $('#loanPurpose').val());
formData.append('loanTerm',               $('#loanTerm').val());
formData.append('loanType',               $('#loanType').val());
formData.append('rateLock',               $('#rateLock').val());

// Attach optional docs
const files = $('#loanDocs')[0].files;
for (let i = 0; i < files.length; i++) {
  formData.append('loanDocs', files[i]);
}

// Application Status
formData.append('newStatus', newStatus);

  
    // -------------------------------------
    // POST TO SERVER
    // -------------------------------------
    $.ajax({
      url: '/saveLoanApplication',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        if (response.success) {
          alert('Your application data has been saved.');
  
          // Update the status label on the task item
          $taskItem.attr('data-task-status', newStatus);
          const $statusLabel = $taskItem.find('.task-status-label');
  
          if (newStatus === 'Completed') {
            $statusLabel.removeClass().addClass(
              'task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-green-200 text-green-800'
            );
            $statusLabel.text('Completed');
          } else if (newStatus === 'In Progress') {
            $statusLabel.removeClass().addClass(
              'task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800'
            );
            $statusLabel.text('In Progress');
          } else {
            $statusLabel.removeClass().addClass(
              'task-status-label text-sm font-semibold px-3 py-1 rounded-full bg-gray-200 text-gray-800'
            );
            $statusLabel.text('Not Started');
          }
  
          // (Optional) If you have some progress bar or status indicator
          if (typeof updateProgress === 'function') {
            updateProgress();
          }
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

    // Gather files
    const payStubsFiles = $('#payStubs')[0].files;
    const w2sFiles = $('#w2s')[0].files;
    const taxReturnsFiles = $('#taxReturns')[0].files;
    const form1099Files = $('#form1099s')[0].files;
    const pnlFiles = $('#pnlDocs')[0].files;

    for (let file of payStubsFiles) formData.append('payStubs', file);
    for (let file of w2sFiles) formData.append('w2s', file);
    for (let file of taxReturnsFiles) formData.append('taxReturns', file);
    for (let file of form1099Files) formData.append('form1099s', file);
    for (let file of pnlFiles) formData.append('pnlDocs', file);

    // Determine status
    let newStatus = 'Not Started';
    const anyFileUploaded = (payStubsFiles.length > 0 || w2sFiles.length > 0 || taxReturnsFiles.length > 0 || form1099Files.length > 0 || pnlFiles.length > 0);
    if (anyFileUploaded) {
      newStatus = 'In Progress';
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


          function updateLinks(previewId, filesArray) {
            const previewDiv = document.getElementById(previewId);
            if (!previewDiv) return;
            previewDiv.innerHTML = '';
            if (filesArray && filesArray.length > 0) {
              filesArray.forEach(fileObj => {
                const link = document.createElement('a');
                link.href = fileObj.url;
                link.target = '_blank';
                link.textContent = fileObj.name;
                link.classList.add('text-blue-600', 'underline', 'block', 'mb-1');
                previewDiv.appendChild(link);
              });
            } else {
              previewDiv.textContent = 'No file chosen.';
            }
          }

          // Update each preview section with the actual URLs from the server response
          updateLinks('payStubsPreview', response.payStubs);
          updateLinks('w2sPreview', response.w2s);
          updateLinks('taxReturnsPreview', response.taxReturns);
          updateLinks('form1099sPreview', response.form1099s);
          updateLinks('pnlDocsPreview', response.pnl);

        } else {
          alert('Error saving your data. Please try again.');
        }
      }
    });
  });

  // Save logic for Asset Verification Documents
$('.save-asset-docs').on('click', function(e) {
  e.stopPropagation();
  const $form = $(this).closest('.asset-verification-form');
  const $taskItem = $form.closest('.task-item[data-task-id="assetVerification"]');

  const bankFiles = $('#bankStatements')[0].files;
  const investFiles = $('#investmentStatements')[0].files;
  const retireFiles = $('#retirementStatements')[0].files;

  const linkedAccountEnabled = $('.link-account-button').data('linked') === true; // If you track linking with data attr

  let newStatus = 'Not Started';
  if (linkedAccountEnabled || bankFiles.length > 0 || investFiles.length > 0 || retireFiles.length > 0) {
    newStatus = 'In Progress';
  }

  const formData = new FormData();
  for (let file of bankFiles) formData.append('bankStatements', file);
  for (let file of investFiles) formData.append('investmentStatements', file);
  for (let file of retireFiles) formData.append('retirementStatements', file);

  formData.append('linkedAccount', linkedAccountEnabled ? 'true' : 'false');
  formData.append('newStatus', newStatus);

  $.ajax({
    url: '/saveAssetVerification',
    method: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
      if (response.success) {
        alert('Your asset verification documents have been saved.');
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

        // Update with actual URLs from server if returned similarly to Income logic
        function updateLinks(previewId, filesArray) {
          const previewDiv = document.getElementById(previewId);
          if (!previewDiv) return;
          previewDiv.innerHTML = '';
          if (filesArray && filesArray.length > 0) {
            filesArray.forEach(fileObj => {
              const link = document.createElement('a');
              link.href = fileObj.url;
              link.target = '_blank';
              link.textContent = fileObj.name;
              link.classList.add('text-blue-600', 'underline', 'block', 'mb-1');
              previewDiv.appendChild(link);
            });
          } else {
            previewDiv.textContent = 'No file chosen.';
          }
        }

        if (response.bank) updateLinks('bankStatementsPreview', response.bank);
        if (response.investment) updateLinks('investmentStatementsPreview', response.investment);
        if (response.retirement) updateLinks('retirementStatementsPreview', response.retirement);

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

  // Gather files (no conditional logic, always gather mortgage now)
  const creditFiles = $('#creditCardStatements')[0].files;
  const autoFiles = $('#autoLoanStatements')[0].files;
  const studentFiles = $('#studentLoanStatements')[0].files;
  const mortgageFiles = $('#mortgageStatement')[0].files;

  // Determine status
  let newStatus;
  const anyFileUploaded = (creditFiles.length > 0 || autoFiles.length > 0 || studentFiles.length > 0 || mortgageFiles.length > 0);
  if (creditFiles.length > 0 && autoFiles.length > 0 && studentFiles.length > 0 && mortgageFiles.length > 0) {
    newStatus = 'Completed';
  } else if (anyFileUploaded) {
    newStatus = 'In Progress';
  } else {
    newStatus = 'Not Started';
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
  for (let i = 0; i < mortgageFiles.length; i++) {
    formData.append('mortgageStatement', mortgageFiles[i]);
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

        // Update the preview containers with actual SAS URLs from server response
        function updateLinks(previewId, filesArray) {
          const previewDiv = document.getElementById(previewId);
          if (!previewDiv) return;
          previewDiv.innerHTML = '';
          if (filesArray && filesArray.length > 0) {
            filesArray.forEach(fileObj => {
              const link = document.createElement('a');
              link.href = fileObj.url;
              link.target = '_blank';
              link.textContent = fileObj.name;
              link.classList.add('text-blue-600', 'underline', 'block', 'mb-1');
              previewDiv.appendChild(link);
            });
          } else {
            previewDiv.textContent = 'No file chosen.';
          }
        }

        // Assuming server returns arrays: response.creditCardStatements, response.autoLoanStatements, response.studentLoanStatements, response.mortgageStatement
        updateLinks('creditCardStatementsPreview', response.creditCardStatements);
        updateLinks('autoLoanStatementsPreview', response.autoLoanStatements);
        updateLinks('studentLoanStatementsPreview', response.studentLoanStatements);
        updateLinks('mortgageStatementPreview', response.mortgageStatement);

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
    // If file chosen, at least 'In Progress'
    // But since it's optional and having the file means it's done, we can say 'Completed'
    newStatus = 'Completed';
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

        // If server returned a fileUrl, update the preview link
        const previewDiv = document.getElementById('purchaseAgreementPreview');
        if (previewDiv) {
          previewDiv.innerHTML = '';
          if (response.fileUrl) {
            const link = document.createElement('a');
            link.href = response.fileUrl;
            link.target = '_blank';
            link.textContent = 'View Uploaded Purchase Agreement';
            link.classList.add('text-blue-600', 'underline');
            previewDiv.appendChild(link);
          } else {
            previewDiv.textContent = 'No file chosen.';
          }
        }
      } else {
        alert('Error saving your purchase agreement. Please try again.');
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

        // Update preview link with the actual SAS URL from response.fileUrl if provided
        const previewDiv = document.getElementById('giftLetterPreview');
        if (previewDiv) {
          previewDiv.innerHTML = '';
          if (response.fileUrl) {
            const link = document.createElement('a');
            link.href = response.fileUrl;
            link.target = '_blank';
            link.textContent = 'View Uploaded Gift Letter';
            link.classList.add('text-blue-600', 'underline');
            previewDiv.appendChild(link);
          } else {
            previewDiv.textContent = 'No file chosen.';
          }
        }
      } else {
        alert('Error saving your gift letter. Please try again.');
      }
    }
  });
});

// Example jQuery or plain JS for tab switching
$('.urla-tab').on('click', function() {
  // Remove "hidden" from the target section, add "hidden" to others
  const targetId = $(this).data('target');
  $('.urla-section').addClass('hidden');
  $(targetId).removeClass('hidden');
  
  // Optionally style the active tab
  $('.urla-tab').removeClass('bg-blue-300 text-white').addClass('bg-gray-200 text-gray-700');
  $(this).removeClass('bg-gray-200 text-gray-700').addClass('bg-blue-300 text-white');
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


  // Does Not Apply Checkboxes
  $('#chkFormerAddress').on('change', function() {
    if ($(this).is(':checked')) {
      $('#formerAddressFields').addClass('hidden');
    } else {
      $('#formerAddressFields').removeClass('hidden');
    }
  });
  
  
  $('#chkMailingAddress').on('change', function() {
    if ($(this).is(':checked')) {
      $('#mailingAddressFields').addClass('hidden');
    } else {
      $('#mailingAddressFields').removeClass('hidden');
    }
  });

  $('#chkCurrentEmployment').on('change', function() {
    if ($(this).is(':checked')) {
      $('#currentEmploymentFields').addClass('hidden');
    } else {
      $('#currentEmploymentFields').removeClass('hidden');
    }
  });
  

  $('#chkAdditionalEmployment').on('change', function() {
    if ($(this).is(':checked')) {
      $('#additionalEmploymentFields').addClass('hidden');
    } else {
      $('#additionalEmploymentFields').removeClass('hidden');
    }
  });
  
  
  $('#chkPreviousEmploymentAdditional2').on('change', function() {
    if ($(this).is(':checked')) {
      $('#previousEmploymentFieldsAdditional2').addClass('hidden');
    } else {
      $('#previousEmploymentFieldsAdditional2').removeClass('hidden');
    }
  });
  

  $('#chkOtherIncome').on('change', function() {
    if ($(this).is(':checked')) {
      $('#otherIncomeFields').addClass('hidden');
    } else {
      $('#otherIncomeFields').removeClass('hidden');
    }
  });

  $('#chkAssets2b').on('change', function() {
    if ($(this).is(':checked')) {
      $('#otherAssets2bFields').addClass('hidden');
    } else {
      $('#otherAssets2bFields').removeClass('hidden');
    }
  });

  $('#chkLiabilities2c').on('change', function() {
    if ($(this).is(':checked')) {
      // Does not apply => no liabilities => hide the fields
      $('#liabilities2cFields').addClass('hidden');
    } else {
      $('#liabilities2cFields').removeClass('hidden');
    }
  });

  $('#chkLiabilities2d').on('change', function() {
    if ($(this).is(':checked')) {
      $('#liabilities2dFields').addClass('hidden');
    } else {
      $('#liabilities2dFields').removeClass('hidden');
    }
  });
  
$('#chkNoRealEstate').on('change', function() {
  if ($(this).is(':checked')) {
    $('#section3RealEstateFields').addClass('hidden');
  } else {
    $('#section3RealEstateFields').removeClass('hidden');
  }
});

$('#chkNoMortgage1').on('change', function() {
  if ($(this).is(':checked')) {
    $('#mortgageFields1').addClass('hidden');
  } else {
    $('#mortgageFields1').removeClass('hidden');
  }
});

$('#chkNoProperty2').on('change', function() {
  if ($(this).is(':checked')) {
    $('#property2Fields').addClass('hidden');
  } else {
    $('#property2Fields').removeClass('hidden');
  }
});

$('#chkNoMortgage2').on('change', function() {
  if ($(this).is(':checked')) {
    $('#mortgageFields2').addClass('hidden');
  } else {
    $('#mortgageFields2').removeClass('hidden');
  }
});

$('#chkNoProperty3').on('change', function() {
  if ($(this).is(':checked')) {
    $('#property3Fields').addClass('hidden');
  } else {
    $('#property3Fields').removeClass('hidden');
  }
});

$('#chkNoMortgage3').on('change', function() {
  if ($(this).is(':checked')) {
    $('#mortgageFields3').addClass('hidden');
  } else {
    $('#mortgageFields3').removeClass('hidden');
  }
});

// Hide the “Other” text input for loanPurposeOtherDesc4 unless the user selects “Other” 
$('input[name="loanPurpose4"]').on('change', function() {
  if ($(this).val() === 'Other') {
    $('#loanPurposeOtherDesc4').show();
  } else {
    $('#loanPurposeOtherDesc4').hide().val('');
  }
});

$('#chkNoMortgage4b').on('change', function() {
  if ($(this).is(':checked')) {
    $('#mortgage4bFields').addClass('hidden');
  } else {
    $('#mortgage4bFields').removeClass('hidden');
  }
});

$('#chkNoRental4c').on('change', function() {
  if ($(this).is(':checked')) {
    $('#rentalIncome4cFields').addClass('hidden');
  } else {
    $('#rentalIncome4cFields').removeClass('hidden');
  }
});

$('#chkNoGifts4d').on('change', function() {
  if ($(this).is(':checked')) {
    $('#gifts4dFields').addClass('hidden');
  } else {
    $('#gifts4dFields').removeClass('hidden');
  }
});

  
  

  // Initially show home tab
  $('[data-tab="homeTab"]').click();
  updateProgress();
});











  