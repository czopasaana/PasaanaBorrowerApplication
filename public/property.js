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
  
  // Move toggleSection outside of initializeSwipers
  function toggleSection(sectionId, button) {
    const section = document.getElementById(sectionId);
    const arrow = button.querySelector('.toggle-arrow');
  
    if (section.classList.contains('hidden')) {
      section.classList.remove('hidden');
      arrow.style.transform = 'rotate(180deg)';
    } else {
      section.classList.add('hidden');
      arrow.style.transform = 'rotate(0deg)';
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
    // Add console.log statements to debug
    console.log('Calculating payment...');
    console.log('Property:', property);

    // Input values - add default values if property.Price is undefined
    const homePrice = parseFloat(property.Price || 0);
    const downPayment = parseFloat(document.getElementById('custom-down-payment')?.value || 0);
    const interestRate = parseFloat(document.getElementById('custom-interest-rate')?.value || 0);
    const loanTermYears = 30;

    console.log('Inputs:', { homePrice, downPayment, interestRate });

    // Calculations
    const loanAmount = homePrice - downPayment;
    const monthlyInterestRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTermYears * 12;

    // Monthly principal & interest - check for valid values before calculation
    if (monthlyInterestRate && numberOfPayments) {
        principalInterest = (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
    } else {
        principalInterest = 0;
    }

    // Property Taxes (monthly)
    const annualPropertyTaxRate = 1.2 / 100; // 1.2% annual tax rate
    propertyTaxes = (property.Taxes || (homePrice * annualPropertyTaxRate)) / 12;

    // Ensure values are properly calculated as numbers
    principalInterest = Number(principalInterest) || 0;
    propertyTaxes = Number(propertyTaxes) || 0;
    homeInsurance = Number(homeInsurance) || 0;
    mortgageInsurance = Number(mortgageInsurance) || 0;
    hoaFees = Number(property.HOAFees) || 0;
    utilities = Number(utilities) || 0;

    // Calculate total monthly payment
    estimatedMonthlyPayment = principalInterest + propertyTaxes + homeInsurance + mortgageInsurance + hoaFees + utilities;

    console.log('Calculated values:', {
        principalInterest,
        propertyTaxes,
        homeInsurance,
        mortgageInsurance,
        hoaFees,
        utilities,
        estimatedMonthlyPayment
    });

    // After calculations, update everything at once
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
            cutout: '70%', // Make the doughnut thinner
            plugins: {
                legend: {
                    display: false // Remove default legend since we have custom one
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
  }

  function updatePaymentBreakdownChart() {
    // Update chart data with current values
    paymentBreakdownChart.data.datasets[0].data = [
        principalInterest,
        propertyTaxes,
        homeInsurance
    ];
    paymentBreakdownChart.update();

    // Ensure all related UI elements show the same values
    const updateValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.innerText = formatCurrency(value);
        } else {
            console.warn(`Element with id ${id} not found`);
        }
    };

    // Update all instances of principal & interest
    updateValue('estimated-payment-value', estimatedMonthlyPayment);
    updateValue('legend-principal-interest', principalInterest);
    updateValue('breakdown-principal-interest', principalInterest);

    // Update all instances of property taxes
    updateValue('legend-property-taxes', propertyTaxes);
    updateValue('breakdown-property-taxes', propertyTaxes);

    // Update all instances of home insurance
    updateValue('legend-home-insurance', homeInsurance);
    updateValue('breakdown-home-insurance', homeInsurance);

    console.log('Updated values:', {
        chart: paymentBreakdownChart.data.datasets[0].data,
        legend: {
            principalInterest,
            propertyTaxes,
            homeInsurance
        },
        total: estimatedMonthlyPayment
    });
  }

  // Improve currency formatting
  function formatCurrency(value) {
    // Ensure value is a number and handle invalid inputs
    const num = Number(value);
    if (isNaN(num)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');
    
    try {
        // Initialize the chart
        initializePaymentBreakdownChart();
        console.log('Chart initialized');

        // Set up input event listeners
        const downPaymentInput = document.getElementById('custom-down-payment');
        const interestRateInput = document.getElementById('custom-interest-rate');

        if (downPaymentInput) {
            downPaymentInput.addEventListener('input', calculateEstimatedPayment);
        }
        if (interestRateInput) {
            interestRateInput.addEventListener('input', calculateEstimatedPayment);
        }

        // Perform initial calculation
        calculateEstimatedPayment();
        console.log('Initial calculation completed');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
  });

  // Function for "Sign in to save changes" button
  function signInToSaveChanges() {
    // Redirect to sign-in page or open modal
    window.location.href = '/login'; // Adjust the URL as needed
  }
  
  // School Filter Functionality
  document.addEventListener('DOMContentLoaded', function () {
    // Reference to the select element
    const levelFilter = document.getElementById('school-level-filter');
    const schoolsList = document.getElementById('schools-list');
    const schoolCards = Array.from(schoolsList.getElementsByClassName('bg-white'));

    function filterSchools() {
      const selectedLevel = levelFilter.value;

      // Filter schools based on level
      let filteredSchools = schoolCards.filter(function (card) {
        const level = card.getAttribute('data-level');
        return selectedLevel === '' || level === selectedLevel;
      });

      // Clear the schools list
      schoolsList.innerHTML = '';

      // Append the filtered schools
      filteredSchools.forEach(function (card) {
        schoolsList.appendChild(card);
      });

      // If no schools match the filter, display a message
      if (filteredSchools.length === 0) {
        schoolsList.innerHTML = `
          <div class="text-center py-8 bg-gray-50 rounded-lg col-span-full">
            <p class="text-gray-600">No schools match the selected criteria.</p>
          </div>
        `;
      }
    }

    // Event listener for the select element
    levelFilter.addEventListener('change', filterSchools);

    // Initial filtering
    filterSchools();
  });
  
  function showRiskDetails(riskType) {
    // Create a modal or popup with detailed information about the specific risk
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 max-w-lg mx-4 max-h-[90vh] overflow-y-auto';
    
    // Add detailed information based on risk type
    content.innerHTML = `
      <h3 class="text-xl font-semibold mb-4">${riskType} - Detailed Information</h3>
      <div class="prose">
        ${getRiskDetailedContent(riskType)}
      </div>
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal on button click or outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.textContent === 'Close') {
        modal.remove();
      }
    });
  }
  
  function getRiskDetailedContent(riskType) {
    // Return detailed information based on risk type
    const riskDetails = {
      'Flood': `
        <h4 class="text-lg font-semibold mb-3">Flood Risk Factors</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>FEMA flood zone designation</li>
          <li>Historical flood events in the area</li>
          <li>Proximity to water bodies</li>
          <li>Local drainage systems and infrastructure</li>
          <li>Ground elevation relative to sea level</li>
        </ul>
        <h4 class="text-lg font-semibold mb-2">Mitigation Strategies</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Flood insurance coverage</li>
          <li>Property elevation modifications</li>
          <li>Installation of flood barriers</li>
          <li>Proper drainage maintenance</li>
        </ul>
        <p class="mb-3">Learn more about flood risks at <a href="https://www.fema.gov/flood-maps" class="text-blue-600 hover:underline">FEMA's flood maps</a>.</p>
      `,
  
      'Fire': `
        <h4 class="text-lg font-semibold mb-3">Fire Risk Factors</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Proximity to wildland areas</li>
          <li>Local vegetation density</li>
          <li>Historical fire incidents</li>
          <li>Building material flammability</li>
          <li>Local fire response capabilities</li>
        </ul>
        <h4 class="text-lg font-semibold mb-2">Prevention Measures</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Creating defensible space</li>
          <li>Fire-resistant landscaping</li>
          <li>Smoke detection systems</li>
          <li>Emergency evacuation planning</li>
        </ul>
        <p class="mb-3">Visit <a href="https://www.ready.gov/wildfires" class="text-blue-600 hover:underline">Ready.gov's Fire Safety Guidelines</a> for more information.</p>
      `,
  
      'Heat': `
        <h4 class="text-lg font-semibold mb-3">Heat Risk Assessment</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Urban heat island effects</li>
          <li>Local temperature patterns</li>
          <li>Building insulation quality</li>
          <li>Shade coverage</li>
          <li>Cooling system efficiency</li>
        </ul>
        <h4 class="text-lg font-semibold mb-2">Mitigation Strategies</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Energy-efficient cooling systems</li>
          <li>Proper insulation improvements</li>
          <li>Strategic landscaping for shade</li>
          <li>Cool roof technologies</li>
        </ul>
        <p class="mb-3">Learn more at <a href="https://www.epa.gov/heat-islands" class="text-blue-600 hover:underline">EPA's Heat Island Effect</a> resources.</p>
      `,
  
      'Wind': `
        <h4 class="text-lg font-semibold mb-3">Wind Risk Factors</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Local wind patterns</li>
          <li>Storm frequency</li>
          <li>Building height exposure</li>
          <li>Surrounding terrain</li>
          <li>Historical wind damage</li>
        </ul>
        <h4 class="text-lg font-semibold mb-2">Protection Measures</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Wind-resistant roofing</li>
          <li>Storm shutters installation</li>
          <li>Tree maintenance</li>
          <li>Secure outdoor items</li>
        </ul>
        <p class="mb-3">Check <a href="https://www.weather.gov/safety/wind" class="text-blue-600 hover:underline">National Weather Service</a> for wind safety information.</p>
      `,
  
      'Air': `
        <h4 class="text-lg font-semibold mb-3">Air Quality Factors</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Local air quality index (AQI)</li>
          <li>Proximity to pollution sources</li>
          <li>Seasonal air quality patterns</li>
          <li>Indoor air quality measures</li>
          <li>Ventilation systems</li>
        </ul>
        <h4 class="text-lg font-semibold mb-2">Improvement Strategies</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Air filtration systems</li>
          <li>Regular HVAC maintenance</li>
          <li>Air quality monitoring</li>
          <li>Proper ventilation</li>
        </ul>
        <p class="mb-3">Monitor local air quality at <a href="https://www.airnow.gov" class="text-blue-600 hover:underline">AirNow.gov</a>.</p>
      `
    };
    
    return riskDetails[riskType] || `
      <p class="text-gray-600 mb-4">Detailed information for ${riskType} is currently being compiled. Please check back later or contact our environmental assessment team for specific inquiries.</p>
      <p class="text-sm text-gray-500">For general environmental risk information, visit the <a href="https://www.epa.gov" class="text-blue-600 hover:underline">EPA website</a>.</p>
    `;
  }

// Amenities Section Functions
function filterAmenities(searchTerm) {
  const items = document.querySelectorAll('.amenity-item');
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const parentCategory = item.closest('.amenity-category');
    
    // Hide/show the item
    item.style.display = text.includes(lowerSearchTerm) ? '' : 'none';
    
    // Check if any items in the category are visible
    const hasVisibleItems = Array.from(parentCategory.querySelectorAll('.amenity-item'))
      .some(item => item.style.display !== 'none');
    
    // Hide/show the entire category
    parentCategory.style.display = hasVisibleItems ? '' : 'none';
  });
}

function filterAmenitiesByCategory(category) {
  // Update pill styles
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('bg-blue-600', 'text-white');
    pill.classList.add('bg-gray-100', 'text-gray-700');
  });
  
  // Show/hide categories
  document.querySelectorAll('.amenity-category').forEach(cat => {
    cat.style.display = (category === 'all' || cat.dataset.category === category) ? '' : 'none';
  });
  
  // Update active pill style
  const activePill = event.target;
  activePill.classList.remove('bg-gray-100', 'text-gray-700');
  activePill.classList.add('bg-blue-600', 'text-white');

  // Clear search input when switching categories
  const searchInput = document.getElementById('amenitySearch');
  if (searchInput) {
    searchInput.value = '';
  }
}

// Toggle Section Functionality Arrows
function toggleSection(sectionId, button) {
  const section = document.getElementById(sectionId);
  const arrow = button.querySelector('.toggle-arrow');

  if (section.classList.contains('hidden')) {
    // Section is being opened
    section.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';  // Point up when open
  } else {
    // Section is being closed
    section.classList.add('hidden');
    arrow.style.transform = 'rotate(0deg)';    // Point down when closed
  }
}


function showAllAmenities() {
  // Show all categories
  document.querySelectorAll('.amenity-category').forEach(cat => {
    cat.style.display = '';
  });

  // Show all items
  document.querySelectorAll('.amenity-item').forEach(item => {
    item.style.display = '';
  });

  // Reset pill styles
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('bg-blue-600', 'text-white');
    pill.classList.add('bg-gray-100', 'text-gray-700');
  });

  // Update active pill style
  const allPill = event.target;
  allPill.classList.remove('bg-gray-100', 'text-gray-700');
  allPill.classList.add('bg-blue-600', 'text-white');

  // Clear search input
  const searchInput = document.getElementById('amenitySearch');
  if (searchInput) {
    searchInput.value = '';
  }
}

// Initialize amenities section
document.addEventListener('DOMContentLoaded', function() {
  // Set "All" pill as active by default
  const allPill = document.querySelector('.category-pill');
  if (allPill) {
    allPill.classList.remove('bg-gray-100', 'text-gray-700');
    allPill.classList.add('bg-blue-600', 'text-white');
  }

  // Add input event listener for search
  const searchInput = document.getElementById('amenitySearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterAmenities(e.target.value));
  }
});


document.addEventListener('DOMContentLoaded', function() {
  initializeMarketSpeedBar();
});

// Add this function to initialize arrow rotations
document.addEventListener('DOMContentLoaded', function() {
  // Get all toggle buttons
  const toggleButtons = document.querySelectorAll('.toggle-button');
  
  // For each button, check its section's state and rotate arrow accordingly
  toggleButtons.forEach(button => {
    const sectionId = button.getAttribute('onclick').match(/toggleSection\('([^']+)'/)[1];
    const section = document.getElementById(sectionId);
    const arrow = button.querySelector('.toggle-arrow');
    
    // If section is visible (not hidden), rotate arrow up
    if (!section.classList.contains('hidden')) {
      arrow.style.transform = 'rotate(180deg)';
    }
  });
});

