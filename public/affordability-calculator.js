document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('affordability-form');
  const resultDiv = document.getElementById('result');
  const priceRangeElement = document.getElementById('price-range');
  const downPaymentDisplay = document.getElementById('down-payment-display');

  // Apply input masks to format numbers as users type
  $('#household-income').inputmask({
    alias: 'numeric',
    groupSeparator: ',',
    digits: 0,
    autoGroup: true,
    prefix: '',
    placeholder: '0',
    rightAlign: false
  });
  $('#own-savings').inputmask({
    alias: 'numeric',
    groupSeparator: ',',
    digits: 0,
    autoGroup: true,
    prefix: '',
    placeholder: '0',
    rightAlign: false
  });
  $('#debt').inputmask({
    alias: 'numeric',
    groupSeparator: ',',
    digits: 0,
    autoGroup: true,
    prefix: '',
    placeholder: '0',
    rightAlign: false
  });

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Get input values and remove commas
    const householdIncome = parseFloat($('#household-income').inputmask('unmaskedvalue')) || 0;
    const ownSavings = parseFloat($('#own-savings').inputmask('unmaskedvalue')) || 0;
    const debt = parseFloat($('#debt').inputmask('unmaskedvalue')) || 0;

    // Basic validation
    if (householdIncome <= 0 || ownSavings < 0 || debt < 0) {
      alert('Please enter valid numbers.');
      return;
    }

    // Calculate the estimated price range
    // Use a simple multiple of income for affordability estimate
    const lowerMultiplier = 3; // Lower end of the multipliers
    const upperMultiplier = 4; // Upper end of the multipliers

    const lowerPrice = (householdIncome * lowerMultiplier) - debt;
    const upperPrice = (householdIncome * upperMultiplier) - debt;

    // Ensure that values are not negative
    const adjustedLowerPrice = Math.max(lowerPrice, 0);
    const adjustedUpperPrice = Math.max(upperPrice, 0);

    // Update the result section with formatted numbers
    priceRangeElement.textContent = `$${adjustedLowerPrice.toLocaleString(undefined, {maximumFractionDigits:0})} - $${adjustedUpperPrice.toLocaleString(undefined, {maximumFractionDigits:0})}`;
    downPaymentDisplay.textContent = `$${ownSavings.toLocaleString(undefined, {maximumFractionDigits:0})}`;

    resultDiv.classList.remove('hidden');
    // Scroll to the result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
  });
});
