document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('affordability-form');
  const detailsBtn = document.getElementById('details-btn');
  const detailsSection = document.getElementById('details-section');

  form.addEventListener('submit', calculateAffordability);

  // New function to project future financials
  function projectFinancials(params) {
    const { annualIncome, monthlyDebts, salaryGrowthRate, expenseGrowthRate, years } = params;

    const projectedIncomes = [];
    const projectedDebts = [];

    for (let i = 0; i <= years; i++) {
      const income = annualIncome * Math.pow(1 + salaryGrowthRate, i);
      const debts = monthlyDebts * 12 * Math.pow(1 + expenseGrowthRate, i);
      projectedIncomes.push(income);
      projectedDebts.push(debts);
    }

    return { projectedIncomes, projectedDebts };
  }

  function calculateAffordability(event) {
    if (event) event.preventDefault(); // Allow manual calls without an event

    // Collect inputs
    const annualIncome = parseFloat(document.getElementById('annual-income').value);
    const monthlyDebts = parseFloat(document.getElementById('monthly-debts').value);
    const downPayment = parseFloat(document.getElementById('down-payment').value);
    const interestRate = parseFloat(document.getElementById('interest-rate').value) / 100;
    const loanTermYears = parseInt(document.getElementById('loan-term').value);
    const salaryGrowthRate = parseFloat(document.getElementById('salary-growth').value) / 100;
    const expenseGrowthRate = parseFloat(document.getElementById('expense-growth').value) / 100;

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

    // Calculate Debt-to-Income Ratio
    const dtiPercentage = ((monthlyDebts + maxMonthlyMortgagePayment) / monthlyIncome) * 100;

    // Format numbers as currency
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Display the results
    document.getElementById('affordable-home-price').innerText = formatter.format(affordableHomePrice);
    document.getElementById('monthly-payment').innerText = formatter.format(maxMonthlyMortgagePayment);

    // Detailed Breakdown
    document.getElementById('detail-annual-income').innerText = formatter.format(annualIncome);
    document.getElementById('detail-monthly-debts').innerText = formatter.format(monthlyDebts);
    document.getElementById('detail-down-payment').innerText = formatter.format(downPayment);
    document.getElementById('detail-interest-rate').innerText = (interestRate * 100).toFixed(2);
    document.getElementById('detail-loan-term').innerText = loanTermYears;
    document.getElementById('detail-dti').innerText = dtiPercentage.toFixed(2);

    // Hide the details section initially
    detailsSection.classList.add('hidden');
    detailsBtn.textContent = 'See More Details';

    // Show the results section
    document.getElementById('results').classList.remove('hidden');

    // Future projections
    const projectionYears = loanTermYears; // Project over the loan term
    const projections = projectFinancials({
      annualIncome,
      monthlyDebts,
      salaryGrowthRate,
      expenseGrowthRate,
      years: projectionYears
    });

    // Display projections
    displayProjections(projections, projectionYears);

    // Prepare data for AI prediction
    const data = {
      annualIncome,
      monthlyDebts,
      salaryGrowthRate,
      expenseGrowthRate,
      years: loanTermYears
    };

    // Fetch AI predictions
    fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(result => {
        // Use AI-generated projections
        const projections = result.projections;

        // Update the chart
        displayProjectionsFromAI(projections);

        // Update results...
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  // Function to display charts
  function displayProjections(projections, years) {
    const ctx = document.getElementById('projection-chart').getContext('2d');
    const labels = [];
    for (let i = 0; i <= years; i++) {
      labels.push(`Year ${i}`);
    }

    const data = {
      labels: labels,
      datasets: [
        {
          label: 'Projected Annual Income',
          data: projections.projectedIncomes,
          borderColor: 'rgba(54, 162, 235, 1)',
          fill: false,
        },
        {
          label: 'Projected Annual Debts',
          data: projections.projectedDebts,
          borderColor: 'rgba(255, 99, 132, 1)',
          fill: false,
        },
      ],
    };

    // Destroy existing chart if it exists
    if (window.projectionChart) {
      window.projectionChart.destroy();
    }

    window.projectionChart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        title: {
          display: true,
          text: 'Future Financial Projections',
        },
      },
    });
  }

  // Function to display AI projections
  function displayProjectionsFromAI(projections) {
    const labels = projections.map(item => `Year ${item.year}`);
    const incomeData = projections.map(item => item.income);
    const debtsData = projections.map(item => item.debts);

    const ctx = document.getElementById('projection-chart').getContext('2d');

    // Destroy existing chart if it exists
    if (window.projectionChart) {
      window.projectionChart.destroy();
    }

    window.projectionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Projected Annual Income',
            data: incomeData,
            borderColor: 'rgba(54, 162, 235, 1)',
            fill: false,
          },
          {
            label: 'Projected Annual Debts',
            data: debtsData,
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false,
          },
        ],
      },
      options: {
        // Chart options...
      },
    });
  }

  // Toggle detailed breakdown visibility
  detailsBtn.addEventListener('click', function() {
    detailsSection.classList.toggle('hidden');
    if (detailsSection.classList.contains('hidden')) {
      detailsBtn.textContent = 'See More Details';
    } else {
      detailsBtn.textContent = 'Hide Details';
    }
  });

  // Add event listener for the what-if scenario input
  const whatIfInterestRate = document.getElementById('whatif-interest-rate');
  const whatIfInterestRateValue = document.getElementById('whatif-interest-rate-value');

  whatIfInterestRate.addEventListener('input', function() {
    const adjustedRate = parseFloat(this.value);
    whatIfInterestRateValue.textContent = `${adjustedRate}%`;

    // Recalculate affordability with the adjusted interest rate
    calculateAffordability();
  });
});