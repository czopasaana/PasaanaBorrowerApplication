document.addEventListener('DOMContentLoaded', function() {
  if (isLoggedIn && preApprovalData) {
    // Initialize variables from preApprovalData
    let annualIncome = preApprovalData.annualIncome;
    let monthlyDebts = preApprovalData.monthlyDebts;
    let downPayment = preApprovalData.downPayment;
    let interestRate = preApprovalData.expectedInterestRate; // Fixed at 4%
    let loanTermYears = preApprovalData.loanTermYears;

    // Initialize UI elements
    const maxLoanAmountElement = document.getElementById('max-loan-amount');
    const estimatedMonthlyPaymentElement = document.getElementById('estimated-monthly-payment');

    // Sliders and labels (excluding interest rate since it's fixed)
    const loanTermSlider = document.getElementById('loan-term-slider');
    const downPaymentSlider = document.getElementById('down-payment-slider');
    const annualIncomeSlider = document.getElementById('annual-income-slider');

    const loanTermLabel = document.getElementById('loan-term-label');
    const downPaymentLabel = document.getElementById('down-payment-label');
    const annualIncomeLabel = document.getElementById('annual-income-label');

    // Set initial slider values based on preApprovalData
    loanTermSlider.value = loanTermYears;
    downPaymentSlider.value = downPayment;
    annualIncomeSlider.value = annualIncome;

    // Update labels with initial values
    loanTermLabel.textContent = loanTermYears;
    downPaymentLabel.textContent = downPayment.toLocaleString();
    annualIncomeLabel.textContent = annualIncome.toLocaleString();

    // Event listeners for sliders
    loanTermSlider.addEventListener('input', updateCalculations);
    downPaymentSlider.addEventListener('input', updateCalculations);
    annualIncomeSlider.addEventListener('input', updateCalculations);

    function updateCalculations() {
      // Update variables from sliders
      loanTermYears = parseInt(loanTermSlider.value);
      downPayment = parseFloat(downPaymentSlider.value);
      annualIncome = parseFloat(annualIncomeSlider.value);

      // Update labels
      loanTermLabel.textContent = loanTermYears;
      downPaymentLabel.textContent = downPayment.toLocaleString();
      annualIncomeLabel.textContent = annualIncome.toLocaleString();

      // Perform calculations
      calculateAffordability();
    }

    function calculateAffordability() {
      const monthlyIncome = annualIncome / 12;

      // Maximum Housing Expense (Front-End Ratio)
      const maxHousingExpense = monthlyIncome * 0.28; // 28% of monthly income

      // Maximum Debt Expense (Back-End Ratio)
      const maxDebtExpense = (monthlyIncome * 0.36) - monthlyDebts; // 36% minus existing debts

      // Maximum Mortgage Payment
      const maxMortgagePayment = Math.min(maxHousingExpense, maxDebtExpense);

      // Ensure the maxMortgagePayment is positive
      if (maxMortgagePayment <= 0) {
        maxLoanAmountElement.textContent = `$0`;
        estimatedMonthlyPaymentElement.textContent = `$0`;
        return;
      }

      const monthlyInterestRate = interestRate / 100 / 12;
      const numberOfPayments = loanTermYears * 12;

      // Calculate mortgage amount using the formula for present value of an annuity
      const P = maxMortgagePayment;
      const r = monthlyInterestRate;
      const n = numberOfPayments;

      let mortgageAmount = P * (1 - Math.pow(1 + r, -n)) / r;

      // Include down payment
      const totalAffordableAmount = mortgageAmount + downPayment;

      // Update UI
      maxLoanAmountElement.textContent = `$${totalAffordableAmount.toFixed(0).toLocaleString()}`;
      estimatedMonthlyPaymentElement.textContent = `$${maxMortgagePayment.toFixed(0).toLocaleString()}`;
    }

    // Initialize calculation
    calculateAffordability();

  } else {
    // Handle non-logged-in users or users without pre-approval data
    // Your existing code here
  }
});
