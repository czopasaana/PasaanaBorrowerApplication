document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('mortgage-form');
  const detailsBtn = document.getElementById('details-btn');
  const detailsSection = document.getElementById('details-section');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Get input values
    const housePrice = parseFloat(document.getElementById('house-price').value);
    const loanTerm = parseInt(document.getElementById('loan-term').value);
    const rateType = document.querySelector('input[name="rateType"]:checked').value;

    // Check if inputs are valid
    if (isNaN(housePrice) || isNaN(loanTerm)) {
      alert('Please enter valid numbers for house price and loan term.');
      return;
    }

    // Perform calculations
    const variableRate = 0.04; // Current variable interest rate (4%)
    const fixedRate = 0.045;   // Fixed interest rate slightly higher (4.5%)
    const pasaanaRate = rateType === 'variable' ? variableRate : fixedRate;

    const standardRate = pasaanaRate + 0.02; // Standard rate is higher than Pasaana's

    const pasaanaMonthlyPayment = calculateMonthlyPayment(housePrice, pasaanaRate, loanTerm);
    const standardMonthlyPayment = calculateMonthlyPayment(housePrice, standardRate, loanTerm);

    // Calculate savings
    const monthlySavings = standardMonthlyPayment - pasaanaMonthlyPayment;
    const totalSavings = monthlySavings * loanTerm * 12;

    // Display results with formatted numbers
    document.getElementById('pasaana-results').innerHTML = `
      <h3 class="text-xl font-bold mb-4">Pasaana Mortgage (${capitalizeFirstLetter(rateType)} Rate)</h3>
      <p class="text-gray-700">Monthly Payment: $${formatNumber(pasaanaMonthlyPayment)}</p>
      <p class="text-gray-700">Total Payment over ${loanTerm} years: $${formatNumber(pasaanaMonthlyPayment * loanTerm * 12)}</p>
    `;

    document.getElementById('standard-results').innerHTML = `
      <h3 class="text-xl font-bold mb-4">Standard Mortgage (${capitalizeFirstLetter(rateType)} Rate)</h3>
      <p class="text-gray-700">Monthly Payment: $${formatNumber(standardMonthlyPayment)}</p>
      <p class="text-gray-700">Total Payment over ${loanTerm} years: $${formatNumber(standardMonthlyPayment * loanTerm * 12)}</p>
    `;

    document.getElementById('savings-results').innerHTML = `
      <h3 class="text-2xl font-bold mb-4">Your Savings with Pasaana</h3>
      <p class="text-green-600 text-xl">Save $${formatNumber(monthlySavings)} per month</p>
      <p class="text-green-600 text-xl">Total Savings over ${loanTerm} years: $${formatNumber(totalSavings)}</p>
    `;

    // Prepare detailed breakdown
    const pasaanaTotalInterest = (pasaanaMonthlyPayment * loanTerm * 12) - housePrice;
    const standardTotalInterest = (standardMonthlyPayment * loanTerm * 12) - housePrice;

    document.getElementById('pasaana-details').innerHTML = `
      <h3 class="text-xl font-bold mb-4">Pasaana Mortgage Details</h3>
      <p class="text-gray-700">Interest Rate: ${(pasaanaRate * 100).toFixed(2)}%</p>
      <p class="text-gray-700">Total Interest Paid: $${formatNumber(pasaanaTotalInterest)}</p>
      <p class="text-gray-700">Total Payment: $${formatNumber(pasaanaMonthlyPayment * loanTerm * 12)}</p>
    `;

    document.getElementById('standard-details').innerHTML = `
      <h3 class="text-xl font-bold mb-4">Standard Mortgage Details</h3>
      <p class="text-gray-700">Interest Rate: ${(standardRate * 100).toFixed(2)}%</p>
      <p class="text-gray-700">Total Interest Paid: $${formatNumber(standardTotalInterest)}</p>
      <p class="text-gray-700">Total Payment: $${formatNumber(standardMonthlyPayment * loanTerm * 12)}</p>
    `;

    // Hide the details section initially
    detailsSection.classList.add('hidden');
    detailsBtn.textContent = 'See More Details';

    // Show the results section
    document.getElementById('results').classList.remove('hidden');
  });

  // Toggle detailed breakdown visibility
  detailsBtn.addEventListener('click', function() {
    detailsSection.classList.toggle('hidden');
    if (detailsSection.classList.contains('hidden')) {
      detailsBtn.textContent = 'See More Details';
    } else {
      detailsBtn.textContent = 'Hide Details';
    }
  });

  function calculateMonthlyPayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 12;
    const numberOfPayments = years * 12;
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  }

  function formatNumber(number) {
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});