document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const propertyPriceInput = document.getElementById('property-price');
  const downPaymentInput = document.getElementById('down-payment');
  const downPaymentMessage = document.getElementById('down-payment-message');
  const loanMessage = document.getElementById('loan-message');
  const form = document.getElementById('mortgage-form');
  const resultsSection = document.getElementById('results');
  const loanDetailsDiv = document.getElementById('loan-details');
  const costsSection = document.getElementById('costs-section');
  const notesSection = document.getElementById('notes-section');
  const adjustLoansLink = document.getElementById('adjust-loans-link');
  const adjustLoansSection = document.getElementById('adjust-loans-section');
  const adjustLoansContainer = document.getElementById('adjust-loans-container');

  // Constants
  const MIN_DOWN_PAYMENT_PERCENT = 5;
  const MAX_LOAN_PERCENT = 80;

  // Declare 'rates' variable
  let rates = {};

  // Fetch rates from the server
  fetch('/api/loan-types')
    .then(response => response.json())
    .then(data => {
      rates = data;
      initCalculator();
    })
    .catch(error => {
      console.error('Error fetching loan rates:', error);
      alert('Failed to load loan rates. Please try again later.');
    });

  function initCalculator() {
    // Event listener for Property Price input
    propertyPriceInput.addEventListener('input', function() {
      const propertyPrice = parseFloat(propertyPriceInput.value) || 0;
      const minDownPayment = (MIN_DOWN_PAYMENT_PERCENT / 100) * propertyPrice;
      downPaymentInput.value = minDownPayment.toFixed(2);
      updateDownPaymentMessage(propertyPrice);
      updateLoanMessage(propertyPrice);
    });

    // Event listener for Down Payment input
    downPaymentInput.addEventListener('input', function() {
      const propertyPrice = parseFloat(propertyPriceInput.value) || 0;
      updateDownPaymentMessage(propertyPrice);
    });

    function updateDownPaymentMessage(propertyPrice) {
      const downPayment = parseFloat(downPaymentInput.value) || 0;
      const minDownPayment = (MIN_DOWN_PAYMENT_PERCENT / 100) * propertyPrice;

      if (downPayment < minDownPayment) {
        downPaymentMessage.textContent = `Down payment must be at least ${MIN_DOWN_PAYMENT_PERCENT}% of the property price ($${formatNumber(minDownPayment)}).`;
      } else {
        downPaymentMessage.textContent = '';
      }
    }

    function updateLoanMessage(propertyPrice) {
      const maxLoanAmount = (MAX_LOAN_PERCENT / 100) * propertyPrice;
      loanMessage.textContent = `You can borrow up to ${MAX_LOAN_PERCENT}% of the property price ($${formatNumber(maxLoanAmount)}).`;
    }

    let selectedLoanTypes = [];
    let loanDataArray = [];
    let propertyPrice = 0;
    let downPayment = 0;

    // Form submission event
    form.addEventListener('submit', function(event) {
      event.preventDefault();

      // Get input values
      propertyPrice = parseFloat(propertyPriceInput.value);
      downPayment = parseFloat(downPaymentInput.value);

      // Validate inputs
      if (isNaN(propertyPrice) || propertyPrice <= 0) {
        alert('Please enter a valid property price.');
        return;
      }
      if (isNaN(downPayment) || downPayment < (MIN_DOWN_PAYMENT_PERCENT / 100) * propertyPrice) {
        alert(`Down payment must be at least ${MIN_DOWN_PAYMENT_PERCENT}% of the property price.`);
        return;
      }
      if (downPayment >= propertyPrice) {
        alert('Down payment cannot be equal to or exceed the property price.');
        return;
      }

      // Calculate loan amount
      const maxLoanAmount = (MAX_LOAN_PERCENT / 100) * propertyPrice;
      const loanAmount = Math.min(propertyPrice - downPayment, maxLoanAmount);

      // Get selected loan types
      selectedLoanTypes = Array.from(document.querySelectorAll('input[name="loanTypes"]:checked')).map(input => input.value);

      if (selectedLoanTypes.length === 0) {
        alert('Please select at least one loan type to compare.');
        return;
      }

      // Initialize loan data array
      loanDataArray = [];

      // Set default values (0 years interest-only, 30-year term)
      selectedLoanTypes.forEach(loanType => {
        const selectedRate = rates[loanType];

        // Check if the selectedRate exists
        if (!selectedRate) {
          alert(`Loan type "${loanType}" data is not available.`);
          return;
        }

        // Default interest-only period and loan term
        const interestOnlyPeriod = 0;
        const loanTerm = 30;

        // Store the data
        loanDataArray.push({
          loanType,
          selectedRate,
          interestOnlyPeriod,
          loanTerm,
          loanAmount,
        });
      });

      // Perform calculations and display results
      calculateAndDisplayResults();

      // Show the results section
      resultsSection.classList.remove('hidden');

      // Show the Adjust Loans link
      document.getElementById('adjust-loans-link-container').classList.remove('hidden');

      // Clear previous adjust loans section and hide it
      adjustLoansContainer.innerHTML = '';
      adjustLoansSection.classList.add('hidden');
    });

    // Adjust Loans Link Click
    adjustLoansLink.addEventListener('click', function(event) {
      event.preventDefault();

      // Generate adjustment sliders for selected loans
      generateAdjustmentSliders();

      // Toggle the adjust loans section
      adjustLoansSection.classList.toggle('hidden');
    });

    function calculateAndDisplayResults() {
      // Prepare data for each selected loan type
      loanDataArray.forEach(data => {
        const loanType = data.loanType;
        const selectedRate = data.selectedRate;
        const interestOnlyPeriod = data.interestOnlyPeriod;
        const loanTerm = data.loanTerm;
        const totalPeriods = loanTerm * 12;

        // Monthly interest rate including contribution rate
        const totalAnnualInterestRate = selectedRate.debtorInterestRate + selectedRate.annualContributionRate;
        const monthlyInterestRate = totalAnnualInterestRate / 12;

        // Calculations
        let interestOnlyPayment = null;
        let amortizationPayment = null;
        let totalPayment = 0;
        let totalInterest = 0;
        const loanAmount = data.loanAmount;

        if (interestOnlyPeriod > 0 && interestOnlyPeriod < loanTerm) {
          const interestOnlyPeriods = interestOnlyPeriod * 12;
          const amortizationPeriods = totalPeriods - interestOnlyPeriods;
          interestOnlyPayment = loanAmount * monthlyInterestRate;
          amortizationPayment = (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -amortizationPeriods));
          totalPayment = (interestOnlyPayment * interestOnlyPeriods) + (amortizationPayment * amortizationPeriods);
          totalInterest = totalPayment - loanAmount;
        } else if (interestOnlyPeriod === loanTerm) {
          const interestOnlyPeriods = totalPeriods;
          interestOnlyPayment = loanAmount * monthlyInterestRate;
          totalPayment = interestOnlyPayment * interestOnlyPeriods;
          totalInterest = totalPayment - loanAmount;
        } else {
          amortizationPayment = (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -totalPeriods));
          totalPayment = amortizationPayment * totalPeriods;
          totalInterest = totalPayment - loanAmount;
        }

        // Costs calculations
        const priceDeductionAtDisbursement = loanAmount * selectedRate.fees.priceDeductionAtDisbursementPercent;
        const totalEstablishmentCosts = selectedRate.fees.loanEstablishmentFee
                                      + selectedRate.fees.caseProcessingFee
                                      + selectedRate.fees.settlementCommission
                                      + selectedRate.fees.selfServiceDiscount
                                      + priceDeductionAtDisbursement
                                      + selectedRate.fees.registrationFee;

        // Update loan data
        data.interestOnlyPayment = interestOnlyPayment;
        data.amortizationPayment = amortizationPayment;
        data.totalInterest = totalInterest;
        data.totalPayment = totalPayment;
        data.totalEstablishmentCosts = totalEstablishmentCosts;
        data.priceDeductionAtDisbursement = priceDeductionAtDisbursement;
        data.totalPeriods = totalPeriods;
        data.interestType = getInterestType(loanType);
        data.totalAnnualInterestRate = totalAnnualInterestRate; // Store the total annual interest rate
      });

      // Generate Loan Details Table
      const loanDetailsHTML = generateLoanDetailsTable();

      // Generate Costs Section
      const costsHTML = generateCostsTable();

      // Generate Important Notes Section
      const notesHTML = `
        <h3 class="text-2xl font-bold mb-4">Important Notes</h3>
        <ul class="list-disc pl-5 text-gray-700">
          <li>Interest rates may change over time, especially for adjustable-rate loans.</li>
          <li>Calculations are estimates and actual loan terms may vary.</li>
          <li>Ensure you understand all loan terms before committing.</li>
        </ul>
      `;

      // Inject HTML into the page
      loanDetailsDiv.innerHTML = loanDetailsHTML;
      costsSection.innerHTML = costsHTML;
      notesSection.innerHTML = notesHTML;
    }

    // Helper functions
    function formatNumber(number) {
      return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getInterestType(loanType) {
      if (loanType === 'fixed-rate') return 'Fixed';
      else return 'Variable';
    }

    function generateAdjustmentSliders() {
      adjustLoansContainer.innerHTML = '';

      selectedLoanTypes.forEach(loanType => {
        const data = loanDataArray.find(item => item.loanType === loanType);
        const loanName = rates[loanType].name;

        // Determine the maximum interest-only period (cannot exceed 10 years)
        const maxInterestOnlyPeriod = Math.min(data.loanTerm, 10);

        const sliderHTML = `
          <div class="border p-3 rounded-lg bg-white shadow-sm flex flex-col h-full">
            <h4 class="text-base font-semibold text-gray-800 mb-2 text-center">${loanName}</h4>
            <!-- Sliders -->
            <div class="space-y-3 flex-grow">
              <!-- Interest-Only Period Slider -->
              <div>
                <label for="interest-only-period-${loanType}" class="block text-sm text-gray-700 mb-1">Interest-Only Period:</label>
                <div class="flex items-center">
                  <span class="text-xs text-gray-600 mr-2">0 yrs</span>
                  <input type="range" id="interest-only-period-${loanType}" name="interestOnlyPeriod[${loanType}]"
                    min="0" max="${maxInterestOnlyPeriod}" value="${Math.min(data.interestOnlyPeriod, maxInterestOnlyPeriod)}" class="w-full slider"
                    oninput="updateSliderOutput('${loanType}'); updateSliderFill('${loanType}');">
                  <span class="text-xs text-gray-600 ml-2">${maxInterestOnlyPeriod} yrs</span>
                </div>
                <div class="text-xs text-gray-600 mt-1">Selected: <span id="interest-only-output-${loanType}">${data.interestOnlyPeriod}</span> years</div>
              </div>
              <!-- Loan Term Slider -->
              <div>
                <label for="loan-term-${loanType}" class="block text-sm text-gray-700 mb-1">Loan Term:</label>
                <div class="flex items-center">
                  <span class="text-xs text-gray-600 mr-2">10 yrs</span>
                  <input type="range" id="loan-term-${loanType}" name="loanTerm[${loanType}]"
                    min="10" max="30" value="${data.loanTerm}" class="w-full slider"
                    oninput="updateSliderOutput('${loanType}'); updateSliderFill('${loanType}');">
                  <span class="text-xs text-gray-600 ml-2">30 yrs</span>
                </div>
                <div class="text-xs text-gray-600 mt-1">Selected: <span id="loan-term-output-${loanType}">${data.loanTerm}</span> years</div>
              </div>
            </div>
          </div>
        `;
        adjustLoansContainer.insertAdjacentHTML('beforeend', sliderHTML);

        // Initialize slider fill
        updateSliderFill(loanType);
      });
    }

    // Expose function to window scope
    window.updateSliderOutput = function(loanType) {
      const interestOnlySlider = document.getElementById(`interest-only-period-${loanType}`);
      const loanTermSlider = document.getElementById(`loan-term-${loanType}`);
      const loanTermValue = parseInt(loanTermSlider.value);

      // Determine the new maximum interest-only period
      const maxInterestOnlyPeriod = Math.min(loanTermValue, 10);

      // Update the max value and right-side label of the interest-only slider
      interestOnlySlider.max = maxInterestOnlyPeriod;
      const interestOnlyMaxLabel = interestOnlySlider.parentElement.querySelector('.ml-2');
      if (interestOnlyMaxLabel) {
        interestOnlyMaxLabel.textContent = `${maxInterestOnlyPeriod} yrs`;
      }

      // Adjust interest-only value if it exceeds the new maximum
      if (parseInt(interestOnlySlider.value) > maxInterestOnlyPeriod) {
        interestOnlySlider.value = maxInterestOnlyPeriod;
      }

      const interestOnlyValue = parseInt(interestOnlySlider.value);

      // Update displayed values
      document.getElementById(`interest-only-output-${loanType}`).textContent = interestOnlyValue;
      document.getElementById(`loan-term-output-${loanType}`).textContent = loanTermValue;

      // Update loan data
      const data = loanDataArray.find(item => item.loanType === loanType);
      data.interestOnlyPeriod = interestOnlyValue;
      data.loanTerm = loanTermValue;

      // Recalculate and update results
      calculateAndDisplayResults();

      // Update slider fill
      updateSliderFill(loanType);
    };

    function generateLoanDetailsTable() {
      let tableHTML = `
        <h3 class="text-2xl font-bold mb-4">Loan Details Comparison</h3>
        <table class="min-w-full bg-white rounded-lg">
          <thead>
            <tr class="bg-gray-200 text-gray-700">
              <th class="py-2 px-4 border-b w-1/4">Detail</th>
      `;

      loanDataArray.forEach(data => {
        tableHTML += `<th class="py-2 px-4 border-b w-1/4 text-center">${rates[data.loanType].name}</th>`;
      });

      tableHTML += `
            </tr>
          </thead>
          <tbody>
      `;

      const details = [
        { label: 'Monthly Payment During Interest-Only Period', key: 'interestOnlyPayment', format: (val) => val !== null ? `$${formatNumber(val)}` : 'N/A' },
        { label: 'Monthly Payment During Amortization Period', key: 'amortizationPayment', format: (val) => val !== null ? `$${formatNumber(val)}` : 'N/A' },
        { label: 'Loan Amount (Principal)', key: 'loanAmount', format: (val) => `$${formatNumber(val)}` },
        { label: 'Total Interest Over Loan Term', key: 'totalInterest', format: (val) => `$${formatNumber(val)}` },
        { label: 'Total Amount Payable Over Loan Term', key: 'totalPayment', format: (val) => `$${formatNumber(val)}` },
        { label: 'Total Annual Interest Rate', key: 'totalAnnualInterestRate', format: (val) => `${(val * 100).toFixed(2)}%` },
        { label: 'Debtor Interest Rate', key: 'debtorInterestRate', format: (val) => `${(val * 100).toFixed(2)}%` },
        { label: 'Annual Contribution Rate', key: 'annualContributionRate', format: (val) => `${(val * 100).toFixed(2)}%` },
        { label: 'Annual Percentage Rate (APR)', key: 'apr', format: (val) => `${(val * 100).toFixed(2)}%` },
        { label: 'Interest Type', key: 'interestType', format: (val) => val },
        { label: 'Loan Term', key: 'loanTerm', format: (val) => `${val} years` },
        { label: 'Interest-Only Period', key: 'interestOnlyPeriod', format: (val) => `${val} years` },
        { label: 'Issue Price of the Loan Bonds', key: 'issuePrice', format: (val) => `${formatNumber(val)}` },
        { label: 'Number of Payment Periods', key: 'totalPeriods', format: (val) => val },
        { label: 'Lender', key: 'lender', format: (val) => val },
      ];

      details.forEach(detail => {
        tableHTML += `<tr>
          <td class="py-2 px-4 border-b">${detail.label}</td>`;
        loanDataArray.forEach(data => {
          let value = data[detail.key];
          if (value === undefined) {
            value = data.selectedRate[detail.key];
          }
          tableHTML += `<td class="py-2 px-4 border-b text-right">${detail.format(value)}</td>`;
        });
        tableHTML += `</tr>`;
      });

      tableHTML += `
          </tbody>
        </table>
      `;

      return tableHTML;
    }

    function generateCostsTable() {
      let tableHTML = `
        <h3 class="text-2xl font-bold mb-4">Costs Associated with Taking the Loan</h3>
        <table class="min-w-full bg-white rounded-lg">
          <thead>
            <tr class="bg-gray-200 text-gray-700">
              <th class="py-2 px-4 border-b w-1/4">Cost Item</th>
      `;

      loanDataArray.forEach(data => {
        tableHTML += `<th class="py-2 px-4 border-b w-1/4 text-center">${rates[data.loanType].name}</th>`;
      });

      tableHTML += `
            </tr>
          </thead>
          <tbody>
      `;

      const costs = [
        { label: 'Loan Establishment Fee', key: 'loanEstablishmentFee' },
        { label: 'Case Processing Fee', key: 'caseProcessingFee' },
        { label: 'Settlement Commission', key: 'settlementCommission' },
        { label: 'Self-Service Discount', key: 'selfServiceDiscount' },
        { label: 'Price Deduction at Disbursement', key: 'priceDeductionAtDisbursement' },
        { label: 'Registration Fee to the State', key: 'registrationFee' },
        { label: 'Total Costs', key: 'totalEstablishmentCosts', bold: true },
      ];

      costs.forEach(cost => {
        tableHTML += `<tr>
          <td class="py-2 px-4 border-b ${cost.bold ? 'font-bold' : ''}">${cost.label}</td>`;
        loanDataArray.forEach(data => {
          let value;
          if (data.selectedRate.fees[cost.key] !== undefined) {
            value = data.selectedRate.fees[cost.key];
          } else {
            value = data[cost.key];
          }
          let formattedValue = `$${formatNumber(value)}`;
          if (cost.key === 'selfServiceDiscount') {
            formattedValue = `-$${formatNumber(-value)}`;
          }
          tableHTML += `<td class="py-2 px-4 border-b text-right ${cost.bold ? 'font-bold' : ''}">${formattedValue}</td>`;
        });
        tableHTML += `</tr>`;
      });

      tableHTML += `
          </tbody>
        </table>
      `;

      return tableHTML;
    }

    function updateSliderFill(loanType) {
      // Interest-Only Period Slider
      const ioSlider = document.getElementById(`interest-only-period-${loanType}`);
      const ioPercentage = ((ioSlider.value - ioSlider.min) / (ioSlider.max - ioSlider.min)) * 100;
      ioSlider.style.setProperty('--slider-percentage', `${ioPercentage}%`);

      // Loan Term Slider
      const termSlider = document.getElementById(`loan-term-${loanType}`);
      const termPercentage = ((termSlider.value - termSlider.min) / (termSlider.max - termSlider.min)) * 100;
      termSlider.style.setProperty('--slider-percentage', `${termPercentage}%`);
    }
  }
});


