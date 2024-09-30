document.getElementById('mortgage-form').addEventListener('submit', calculateMortgage);

function calculateMortgage(event) {
  event.preventDefault(); // Prevent form from submitting and refreshing the page

  const housePriceInput = document.getElementById('house-price');
  const loanTermInput = document.getElementById('loan-term');
  const pasaanaResultsDiv = document.getElementById('pasaana-results');
  const standardResultsDiv = document.getElementById('standard-results');
  const savingsResultsDiv = document.getElementById('savings-results');

  const housePrice = parseFloat(housePriceInput.value);
  const loanTermYears = parseInt(loanTermInput.value);
  const annualInterestRatePasaana = 0.03; // Pasaana's 3% mortgage rate
  const annualInterestRateStandard = 0.07; // US industry standard 7% rate
  const downPaymentPercentage = 0.20; // Fixed down payment percentage at 20%

  if (isNaN(housePrice) || housePrice <= 0) {
    alert('Please enter a valid house price.');
    return;
  }

  // Calculate down payment
  const downPayment = housePrice * downPaymentPercentage;
  const loanAmount = housePrice - downPayment;
  const numberOfPayments = loanTermYears * 12;

  // Function to calculate monthly payment
  function calculateMonthlyPayment(loanAmount, annualInterestRate, numberOfPayments) {
    const monthlyInterestRate = annualInterestRate / 12;
    return (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
  }

  // Calculate payments and total interest for Pasaana
  const monthlyPaymentPasaana = calculateMonthlyPayment(loanAmount, annualInterestRatePasaana, numberOfPayments);
  const totalPaymentPasaana = monthlyPaymentPasaana * numberOfPayments;
  const totalInterestPasaana = totalPaymentPasaana - loanAmount;

  // Calculate payments and total interest for Standard rate
  const monthlyPaymentStandard = calculateMonthlyPayment(loanAmount, annualInterestRateStandard, numberOfPayments);
  const totalPaymentStandard = monthlyPaymentStandard * numberOfPayments;
  const totalInterestStandard = totalPaymentStandard - loanAmount;

  // Calculate savings
  const monthlySavings = monthlyPaymentStandard - monthlyPaymentPasaana;
  const totalInterestSavings = totalInterestStandard - totalInterestPasaana;

  // Format numbers as currency
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Display Pasaana Mortgage results
  pasaanaResultsDiv.innerHTML = `
    <h2>Pasaana Mortgage (3%)</h2>
    <p><strong>Monthly Payment:</strong> ${formatter.format(monthlyPaymentPasaana.toFixed(2))}</p>
    <p><strong>Total Interest Paid:</strong> ${formatter.format(totalInterestPasaana.toFixed(2))}</p>
    <p><strong>Total Amount Paid:</strong> ${formatter.format(totalPaymentPasaana.toFixed(2))}</p>
  `;

  // Display Standard Mortgage results
  standardResultsDiv.innerHTML = `
    <h2>Standard Mortgage (7%)</h2>
    <p><strong>Monthly Payment:</strong> ${formatter.format(monthlyPaymentStandard.toFixed(2))}</p>
    <p><strong>Total Interest Paid:</strong> ${formatter.format(totalInterestStandard.toFixed(2))}</p>
    <p><strong>Total Amount Paid:</strong> ${formatter.format(totalPaymentStandard.toFixed(2))}</p>
  `;

  // Display Savings
  savingsResultsDiv.innerHTML = `
    <h2>Savings with Pasaana</h2>
    <p><strong>Monthly Savings:</strong> ${formatter.format(monthlySavings.toFixed(2))}</p>
    <p><strong>Total Interest Savings:</strong> ${formatter.format(totalInterestSavings.toFixed(2))}</p>
  `;
}
