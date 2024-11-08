document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('affordability-form');
  const resultDiv = document.getElementById('result');
  const priceRangeElement = document.getElementById('price-range');
  const downPaymentDisplay = document.getElementById('down-payment-display');
  const loanAmountDisplay = document.getElementById('loan-amount-display');
  const monthlyPaymentDisplay = document.getElementById('monthly-payment-display');
  const loanTermDisplay = document.getElementById('loan-term-display');
  const propertyTaxesDisplay = document.getElementById('property-taxes-display');
  const homeownersInsuranceDisplay = document.getElementById('homeowners-insurance-display');
  const hoaFeesDisplay = document.getElementById('hoa-fees-display');
  const propertyTaxesSummary = document.getElementById('property-taxes-summary');
  const homeownersInsuranceSummary = document.getElementById('homeowners-insurance-summary');
  const hoaFeesSummary = document.getElementById('hoa-fees-summary');

  // Apply input masks to format numbers as users type
  const inputFields = ['#household-income', '#own-savings', '#debt', '#property-taxes', '#homeowners-insurance', '#hoa-fees'];
  inputFields.forEach(function(selector) {
    $(selector).inputmask({
      alias: 'numeric',
      groupSeparator: ',',
      digits: 0,
      autoGroup: true,
      prefix: '',
      placeholder: '0',
      rightAlign: false
    });
  });

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Get input values and remove commas
    const householdIncome = parseFloat($('#household-income').inputmask('unmaskedvalue')) || 0;
    const ownSavings = parseFloat($('#own-savings').inputmask('unmaskedvalue')) || 0;
    const monthlyDebtPayments = parseFloat($('#debt').inputmask('unmaskedvalue')) || 0; // Monthly debt payments
    const annualInterestRate = parseFloat($('#interest-rate').val()) || 0;
    const loanTermYears = parseInt($('#loan-term').val()) || 0;

    // Advanced inputs (optional)
    const annualPropertyTaxes = parseFloat($('#property-taxes').inputmask('unmaskedvalue')) || 0;
    const annualHomeownersInsurance = parseFloat($('#homeowners-insurance').inputmask('unmaskedvalue')) || 0;
    const monthlyHOAFees = parseFloat($('#hoa-fees').inputmask('unmaskedvalue')) || 0;

    // Basic validation
    if (
      householdIncome <= 0 ||
      ownSavings < 0 ||
      monthlyDebtPayments < 0 ||
      annualInterestRate <= 0 ||
      loanTermYears <= 0 ||
      annualPropertyTaxes < 0 ||
      annualHomeownersInsurance < 0 ||
      monthlyHOAFees < 0
    ) {
      alert('Please enter valid numbers.');
      return;
    }

    // DTI Ratios
    const frontEndRatio = 0.28; // 28% of gross income for housing expenses
    const backEndRatio = 0.36; // 36% of gross income for total debt expenses

    const monthlyGrossIncome = householdIncome / 12;
    let maximumHousingExpense = monthlyGrossIncome * frontEndRatio;
    const maximumTotalDebtExpense = monthlyGrossIncome * backEndRatio;

    // Convert annual expenses to monthly
    const monthlyPropertyTaxes = annualPropertyTaxes > 0 ? annualPropertyTaxes / 12 : 0;
    const monthlyHomeownersInsurance = annualHomeownersInsurance > 0 ? annualHomeownersInsurance / 12 : 0;

    // Calculate total non-mortgage housing expenses
    const totalNonMortgageHousingExpenses = monthlyPropertyTaxes + monthlyHomeownersInsurance + monthlyHOAFees;

    // Adjust maximum housing expense if advanced inputs are provided
    if (totalNonMortgageHousingExpenses > 0) {
      maximumHousingExpense -= totalNonMortgageHousingExpenses;
    }

    // Initial maximum mortgage payment based on back-end DTI
    let maximumMortgagePayment = maximumTotalDebtExpense - monthlyDebtPayments;

    // Ensure the mortgage payment doesn't exceed the adjusted maximum housing expense
    maximumMortgagePayment = Math.min(maximumMortgagePayment, maximumHousingExpense);

    // Ensure that maximumMortgagePayment is positive
    if (maximumMortgagePayment <= 0) {
      alert('Based on your inputs, you may not qualify for a mortgage.');
      return;
    }

    // Calculate the loan amount using the correct formula
    const r = annualInterestRate / 100 / 12; // Monthly interest rate
    const n = loanTermYears * 12; // Total number of payments

    let loanAmount = maximumMortgagePayment * (1 - Math.pow(1 + r, -n)) / r;

    // Maximum purchase price
    let maximumPurchasePrice = loanAmount + ownSavings;

    // Update the result section with formatted numbers
    priceRangeElement.textContent = `$${maximumPurchasePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    downPaymentDisplay.textContent = `$${ownSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    loanAmountDisplay.textContent = `$${loanAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    monthlyPaymentDisplay.textContent = `$${maximumMortgagePayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    loanTermDisplay.textContent = `${loanTermYears} Years`;

    // Display advanced summary fields if inputs were provided
    if (annualPropertyTaxes > 0) {
      propertyTaxesSummary.style.display = 'block';
      propertyTaxesDisplay.textContent = `$${monthlyPropertyTaxes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      propertyTaxesSummary.style.display = 'none';
    }

    if (annualHomeownersInsurance > 0) {
      homeownersInsuranceSummary.style.display = 'block';
      homeownersInsuranceDisplay.textContent = `$${monthlyHomeownersInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      homeownersInsuranceSummary.style.display = 'none';
    }

    if (monthlyHOAFees > 0) {
      hoaFeesSummary.style.display = 'block';
      hoaFeesDisplay.textContent = `$${monthlyHOAFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      hoaFeesSummary.style.display = 'none';
    }

    resultDiv.classList.remove('hidden');
    // Scroll to the result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
  });
});





