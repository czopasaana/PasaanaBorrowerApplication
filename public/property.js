// Initialize Swiper instances for each category
function initializeSwipers() {
    var swipers = {};
    imageCategories.forEach(function (category) {
      var categoryKey = category.replace(/\s+/g, '-');
      swipers[category] = new Swiper('#gallery-category-' + categoryKey + ' .swiper-container', {
        loop: true,
        spaceBetween: 10,
        navigation: {
          nextEl: '#gallery-category-' + categoryKey + ' .swiper-button-next',
          prevEl: '#gallery-category-' + categoryKey + ' .swiper-button-prev',
        },
      });
    });
    return swipers;
  }
  
  var swipers = initializeSwipers();
  
  // Function to show selected category
  function showGalleryCategory(category, btn) {
    var categories = imageCategories;
    categories.forEach(function (cat) {
      var catId = 'gallery-category-' + cat.replace(/\s+/g, '-');
      var element = document.getElementById(catId);
      if (element) {
        if (cat === category) {
          element.classList.remove('hidden');
        } else {
          element.classList.add('hidden');
        }
      }
    });
  
    // Update active button styles
    var buttons = document.querySelectorAll('.category-button');
    buttons.forEach(function (button) {
      button.classList.remove('bg-blue-600', 'text-white', 'active');
      button.classList.add('bg-gray-200', 'text-gray-800');
    });
    btn.classList.add('bg-blue-600', 'text-white', 'active');
    btn.classList.remove('bg-gray-200', 'text-gray-800');
  }
  
  // Set default category to show on page load
  document.addEventListener('DOMContentLoaded', function () {
    if (imageCategories.length > 0) {
      var firstButton = document.querySelector('.category-button');
      if (firstButton) {
        showGalleryCategory(imageCategories[0], firstButton);
      }
    }
  });
  
  // Collapsible Sections Script
  function toggleSection(sectionId, button) {
    const section = document.getElementById(sectionId);
    const svgIcon = button.querySelector('svg');
  
    if (section.classList.contains('hidden')) {
      // Open the section
      section.classList.remove('hidden');
      svgIcon.classList.add('transform', '-rotate-180');
    } else {
      // Close the section
      section.classList.add('hidden');
      svgIcon.classList.remove('transform', '-rotate-180');
    }
  }
  
  // JavaScript Functions for Photo Overlay
  function openPhotoOverlay() {
    document.getElementById('photo-overlay').classList.remove('hidden');
    // Disable scrolling on the main page
    document.body.classList.add('overflow-hidden');
  }
  
  function closePhotoOverlay() {
    document.getElementById('photo-overlay').classList.add('hidden');
    // Re-enable scrolling on the main page
    document.body.classList.remove('overflow-hidden');
  }
  
  function showOverlayGalleryCategory(category, btn) {
    var categories = imageCategories;
    categories.forEach(function (cat) {
      var catId = 'overlay-gallery-category-' + cat.replace(/\s+/g, '-');
      var element = document.getElementById(catId);
      if (element) {
        if (cat === category) {
          element.classList.remove('hidden');
          // Reset scroll position of the category content to the top
          element.scrollTop = 0;
        } else {
          element.classList.add('hidden');
        }
      }
    });
  
    // Update active button styles
    var buttons = document.querySelectorAll('.overlay-category-button');
    buttons.forEach(function (button) {
      button.classList.remove('bg-blue-600', 'text-white');
      button.classList.add('bg-gray-200', 'text-gray-800');
    });
    btn.classList.add('bg-blue-600', 'text-white');
    btn.classList.remove('bg-gray-200', 'text-gray-800');
  
    // Additionally, reset the scroll position of the overlay content container
    var overlayContentContainer = document.querySelector('#photo-overlay .overflow-y-auto');
    if (overlayContentContainer) {
      overlayContentContainer.scrollTop = 0;
    }
  }
  
  // Initialize the overlay with the "All" category active
  document.addEventListener('DOMContentLoaded', function () {
    if (imageCategories.length > 0) {
      var firstCategoryButton = document.querySelector('.overlay-category-button');
      if (firstCategoryButton) {
        showOverlayGalleryCategory(imageCategories[0], firstCategoryButton);
      }
    }
  
    // Add event listener to close overlay when clicking on the background
    var overlayBackground = document.getElementById('overlay-background');
    if (overlayBackground) {
      overlayBackground.addEventListener('click', function (event) {
        closePhotoOverlay();
      });
    }
  });

  // Mortgage Calculator Functionality

  // Initialize variables
  let estimatedMonthlyPayment = 0;
  let principalInterest = 0;
  let propertyTaxes = 0;
  let homeInsurance = 75; // Placeholder value, adjust if necessary
  let mortgageInsurance = 0; // Calculated based on down payment
  let hoaFees = property.HOAFees || 0; // From property data
  let utilities = 0; // Placeholder value, adjust if necessary

  // Initialize the chart
  let paymentBreakdownChart;

  function calculateEstimatedPayment() {
    // Input values
    const homePrice = parseFloat(property.Price) || 0;
    const downPayment = parseFloat(document.getElementById('custom-down-payment').value) || 0;
    const interestRate = parseFloat(document.getElementById('custom-interest-rate').value) || 0;
    const loanTermYears = 30; // Default loan term

    // Calculations
    const loanAmount = homePrice - downPayment;
    const monthlyInterestRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTermYears * 12;

    // Monthly principal & interest
    principalInterest = (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));

    // Property Taxes
    const annualPropertyTaxRate = 1.2 / 100; // Example annual tax rate
    propertyTaxes = ((property.Taxes || (homePrice * annualPropertyTaxRate)) / 12);

    // Mortgage Insurance (if down payment < 20%)
    if ((downPayment / homePrice) < 0.20) {
      const miRate = 0.5 / 100; // Example rate
      mortgageInsurance = (loanAmount * miRate) / 12;
    } else {
      mortgageInsurance = 0;
    }

    // Estimated Monthly Payment
    estimatedMonthlyPayment = principalInterest + mortgageInsurance + propertyTaxes + homeInsurance + hoaFees + utilities;

    // Update the UI
    document.getElementById('estimated-payment-value').innerText = formatCurrency(estimatedMonthlyPayment);
    document.getElementById('legend-principal-interest').innerText = formatCurrency(principalInterest);
    document.getElementById('legend-property-taxes').innerText = formatCurrency(propertyTaxes);
    document.getElementById('legend-home-insurance').innerText = formatCurrency(homeInsurance);
    
    // Update breakdown values
    document.getElementById('breakdown-principal-interest').innerText = formatCurrency(principalInterest);
    document.getElementById('breakdown-mortgage-insurance').innerText = formatCurrency(mortgageInsurance);
    document.getElementById('breakdown-property-taxes').innerText = formatCurrency(propertyTaxes);
    document.getElementById('breakdown-home-insurance').innerText = formatCurrency(homeInsurance);
    document.getElementById('breakdown-hoa-fees').innerText = formatCurrency(hoaFees);
    document.getElementById('breakdown-utilities').innerText = formatCurrency(utilities);

    // Update the pie chart
    updatePaymentBreakdownChart();
  }

  function initializePaymentBreakdownChart() {
    const ctx = document.getElementById('payment-breakdown-chart').getContext('2d');
    paymentBreakdownChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal & Interest', 'Property Taxes', 'Home Insurance'],
        datasets: [{
          data: [principalInterest, propertyTaxes, homeInsurance],
          backgroundColor: ['#4F46E5', '#10B981', '#8B5CF6'],
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            enabled: true,
          },
        },
        plugins: [centerTextPlugin],
      },
    });
  }

  const centerTextPlugin = {
    id: 'centerTextPlugin',
    afterDraw(chart) {
      const {ctx, chartArea: {left, right, top, bottom, width, height}} = chart;

      ctx.save();

      // Calculate the center point
      const x = left + width / 2;
      const y = top + height / 2;

      // Set font and styles
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#374151'; // Text color (gray-800)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Prepare the text
      const text = `Est. ${formatCurrency(estimatedMonthlyPayment)}`;

      // Draw the text in the center
      ctx.fillText(text, x, y);

      ctx.restore();
    }
  };

  function updatePaymentBreakdownChart() {
    paymentBreakdownChart.data.datasets[0].data = [principalInterest, propertyTaxes, homeInsurance];
    paymentBreakdownChart.update();

    // Update the estimated payment text
    document.getElementById('estimated-payment-value').innerText = formatCurrency(estimatedMonthlyPayment);
  }

  // Format currency
  function formatCurrency(value) {
    return `$${parseFloat(value).toFixed(2).toLocaleString()}`;
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', function () {
    // Initialize the chart
    initializePaymentBreakdownChart();
    
    // Perform initial calculation
    calculateEstimatedPayment();

    // Add event listeners to inputs
    document.getElementById('custom-down-payment').addEventListener('input', calculateEstimatedPayment);
    document.getElementById('custom-interest-rate').addEventListener('input', calculateEstimatedPayment);
  });

  // Function for "Sign in to save changes" button
  function signInToSaveChanges() {
    // Redirect to sign-in page or open modal
    window.location.href = '/login'; // Adjust the URL as needed
  }
  