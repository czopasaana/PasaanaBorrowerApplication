document.getElementById('affordability-form').addEventListener('submit', calculateAffordability);

function calculateAffordability(event) {
  event.preventDefault(); // Prevent form submission

  const annualIncome = parseFloat(document.getElementById('annual-income').value);
  const monthlyDebts = parseFloat(document.getElementById('monthly-debts').value);
  const downPayment = parseFloat(document.getElementById('down-payment').value);
  const interestRate = parseFloat(document.getElementById('interest-rate').value) / 100;
  const loanTermYears = parseInt(document.getElementById('loan-term').value);

  if (isNaN(annualIncome) || isNaN(monthlyDebts) || isNaN(downPayment) || isNaN(interestRate) || isNaN(loanTermYears)) {
    alert('Please enter valid numeric values in all fields.');
    return;
  }

  const monthlyIncome = annualIncome / 12;
  const maxDTI = 0.43; // Typical maximum Debt-to-Income ratio (43% as per standard guidelines)

  // Calculate maximum monthly mortgage payment
  const maxMonthlyMortgagePayment = (monthlyIncome * maxDTI) - monthlyDebts;

  // Calculate the maximum loan amount the user can afford
  const numberOfPayments = loanTermYears * 12;
  const monthlyInterestRate = interestRate / 12;

  const maxLoanAmount = (maxMonthlyMortgagePayment * (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments))) / monthlyInterestRate;

  // Calculate the maximum affordable home price
  const affordableHomePrice = maxLoanAmount + downPayment;

  // Format numbers as currency
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Display the results
  document.getElementById('affordable-home-price').innerText = formatter.format(affordableHomePrice.toFixed(2));
  document.getElementById('monthly-payment').innerText = formatter.format(maxMonthlyMortgagePayment.toFixed(2));

  document.getElementById('results').style.display = 'block';
}
