// Function to handle status selection
function selectStatus(status) {
  // Update the selected status text in the button
  document.getElementById('selected-status').textContent = status;

  // Close the dropdown
  toggleDropdown('status-dropdown');

  // Get all circle icons and update their appearance
  const statuses = ['For Sale', 'For Rent', 'Sold'];
  statuses.forEach(function(s) {
    const circleIcon = document.getElementById('circle-' + s);

    if (s === status) {
      // Fill the circle for the selected status
      circleIcon.classList.remove('text-gray-400');
      circleIcon.classList.add('text-blue-500');
      circleIcon.setAttribute('fill', 'currentColor');
      circleIcon.setAttribute('stroke', 'none');
    } else {
      // Unfill the circle for other statuses
      circleIcon.classList.remove('text-blue-500');
      circleIcon.classList.add('text-gray-400');
      circleIcon.setAttribute('fill', 'none');
      circleIcon.setAttribute('stroke', 'currentColor');
    }
  });
}

// Function to handle price type selection (List Price or Monthly Payment)
function selectPriceType(type) {
  const listPriceBtn = document.getElementById('list-price-btn');
  const monthlyPaymentBtn = document.getElementById('monthly-payment-btn');

  if (type === 'List Price') {
    listPriceBtn.classList.add('bg-blue-600', 'text-white');
    listPriceBtn.classList.remove('bg-gray-200', 'text-gray-700');
    monthlyPaymentBtn.classList.add('bg-gray-200', 'text-gray-700');
    monthlyPaymentBtn.classList.remove('bg-blue-600', 'text-white');
  } else {
    monthlyPaymentBtn.classList.add('bg-blue-600', 'text-white');
    monthlyPaymentBtn.classList.remove('bg-gray-200', 'text-gray-700');
    listPriceBtn.classList.add('bg-gray-200', 'text-gray-700');
    listPriceBtn.classList.remove('bg-blue-600', 'text-white');
  }
}

// Function to apply the price filter
function applyPriceFilter() {
  const minPrice = document.getElementById('min-price').value;
  const maxPrice = document.getElementById('max-price').value;
  const priceType = document.getElementById('list-price-btn').classList.contains('bg-blue-600') ? 'List Price' : 'Monthly Payment';

  // Update the selected price text in the button
  let priceText = priceType;
  if (minPrice || maxPrice) {
    priceText += ': ';
    priceText += minPrice ? `$${formatNumber(minPrice)}` : '';
    priceText += minPrice && maxPrice ? ' - ' : '';
    priceText += maxPrice ? `$${formatNumber(maxPrice)}` : '';
  }

  document.getElementById('selected-price').textContent = priceText;

  // Close the dropdown
  toggleDropdown('price-dropdown');

  // Clear the inputs
  // (Optional, depending on whether you want the values to persist when reopening the dropdown)
  // document.getElementById('min-price').value = '';
  // document.getElementById('max-price').value = '';
}

// Function to clear the price filter
function clearPriceFilter() {
  // Reset the inputs
  document.getElementById('min-price').value = '';
  document.getElementById('max-price').value = '';
  
  // Reset the toggle buttons to default (List Price)
  selectPriceType('List Price');

  // Reset the button text
  document.getElementById('selected-price').textContent = 'Price';

  // Close the dropdown
  toggleDropdown('price-dropdown');
}

// Function to format numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// State variables for Beds & Baths
let selectedBeds = 'Any';
let selectedBaths = 'Any';
let exactMatch = false;

// Function to toggle Exact Match
function toggleExactMatch() {
  exactMatch = !exactMatch;
  const toggle = document.getElementById('exact-match-toggle');
  const circle = document.getElementById('toggle-circle');

  if (exactMatch) {
    toggle.classList.remove('bg-gray-200');
    toggle.classList.add('bg-blue-600');
    circle.classList.add('translate-x-6');
  } else {
    toggle.classList.remove('bg-blue-600');
    toggle.classList.add('bg-gray-200');
    circle.classList.remove('translate-x-6');
  }
}

// Function to select number of beds
function selectBeds(beds) {
  selectedBeds = beds;
  
  // Update button styles
  const bedOptions = ['Any', '1', '2', '3', '4', '5+'];
  bedOptions.forEach(function(option) {
    const btn = document.getElementById('beds-' + option);
    if (option === beds) {
      btn.classList.add('bg-blue-600', 'text-white');
      btn.classList.remove('bg-white', 'text-gray-700');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-white', 'text-gray-700');
    }
  });
}

// Function to select number of baths
function selectBaths(baths) {
  selectedBaths = baths;
  
  // Update button styles
  const bathOptions = ['Any', '1', '2', '3', '4', '5+'];
  bathOptions.forEach(function(option) {
    const btn = document.getElementById('baths-' + option);
    if (option === baths) {
      btn.classList.add('bg-blue-600', 'text-white');
      btn.classList.remove('bg-white', 'text-gray-700');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-white', 'text-gray-700');
    }
  });
}

// Function to apply Beds & Baths filter
function applyBedsBathsFilter() {
  let bedsText = selectedBeds;
  let bathsText = selectedBaths;

  if (!exactMatch) {
    bedsText += bedsText !== 'Any' && bedsText !== '5+' ? '+' : '';
    bathsText += bathsText !== 'Any' && bathsText !== '5+' ? '+' : '';
  }

  let filterText = 'Beds & Baths';
  if (bedsText !== 'Any' || bathsText !== 'Any') {
    filterText = bedsText + ' Beds • ' + bathsText + ' Baths';
  }

  document.getElementById('selected-beds-baths').textContent = filterText;

  // Close the dropdown
  toggleDropdown('beds-baths-dropdown');
}

// Function to clear Beds & Baths filter
function clearBedsBathsFilter() {
  selectedBeds = 'Any';
  selectedBaths = 'Any';
  exactMatch = false;

  // Reset Exact Match toggle
  const toggle = document.getElementById('exact-match-toggle');
  const circle = document.getElementById('toggle-circle');
  toggle.classList.remove('bg-blue-600');
  toggle.classList.add('bg-gray-200');
  circle.classList.remove('translate-x-6');

  // Reset Beds buttons
  selectBeds('Any');

  // Reset Baths buttons
  selectBaths('Any');

  // Reset the button text
  document.getElementById('selected-beds-baths').textContent = 'Beds & Baths';

  // Close the dropdown
  toggleDropdown('beds-baths-dropdown');
}

// State variable for Property Types
let selectedPropertyTypes = [];

// Function to toggle property type selection
function togglePropertyType(type) {
  const index = selectedPropertyTypes.indexOf(type);
  const btn = document.getElementById('property-type-' + type.replace(' ', '-'));
  const checkmark = document.getElementById('checkmark-' + type.replace(' ', '-'));

  if (index > -1) {
    // Type is already selected; remove it
    selectedPropertyTypes.splice(index, 1);
    // Update button style
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-white', 'text-gray-700');
    // Hide checkmark
    checkmark.classList.add('hidden');
  } else {
    // Add type to selection
    selectedPropertyTypes.push(type);
    // Update button style
    btn.classList.add('bg-blue-600', 'text-white');
    btn.classList.remove('bg-white', 'text-gray-700');
    // Show checkmark
    checkmark.classList.remove('hidden');
  }
}

// Function to apply Property Type filter
function applyPropertyTypeFilter() {
  let filterText = 'Property Type';
  
  if (selectedPropertyTypes.length > 0) {
    filterText = selectedPropertyTypes.join(', ');
  }
  
  document.getElementById('selected-property-type').textContent = filterText;
  
  // Close the dropdown
  toggleDropdown('property-type-dropdown');
}

// Function to clear Property Type filter
function clearPropertyTypeFilter() {
  selectedPropertyTypes = [];
  
  // Reset buttons
  const propertyTypes = ['House', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Manufactured', 'Other'];
  propertyTypes.forEach(function(type) {
    const btn = document.getElementById('property-type-' + type.replace(' ', '-'));
    const checkmark = document.getElementById('checkmark-' + type.replace(' ', '-'));
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-white', 'text-gray-700');
    checkmark.classList.add('hidden');
  });
  
  // Reset the button text
  document.getElementById('selected-property-type').textContent = 'Property Type';
  
  // Close the dropdown
  toggleDropdown('property-type-dropdown');
}

// Update the toggleDropdown function to handle multiple dropdowns
function toggleDropdown(menuId) {
  // Close any open dropdowns
  const dropdowns = document.querySelectorAll('.origin-top-left.absolute.left-0.mt-2');
  dropdowns.forEach(function(drop) {
    if (drop.id !== menuId) {
      drop.classList.add('hidden');
    }
  });

  // Toggle the desired dropdown
  const dropdown = document.getElementById(menuId);
  dropdown.classList.toggle('hidden');
}

// Close the dropdown if clicking outside of it
window.addEventListener('click', function(event) {
  // Dropdown menus and their corresponding buttons
  const dropdowns = [
    { menu: 'status-dropdown', buttonSelector: 'button[onclick="toggleDropdown(\'status-dropdown\')"]' },
    { menu: 'price-dropdown', buttonSelector: 'button[onclick="toggleDropdown(\'price-dropdown\')"]' },
    { menu: 'beds-baths-dropdown', buttonSelector: 'button[onclick="toggleDropdown(\'beds-baths-dropdown\')"]' },
    { menu: 'property-type-dropdown', buttonSelector: 'button[onclick="toggleDropdown(\'property-type-dropdown\')"]' },
    // Add other dropdowns here
  ];

  dropdowns.forEach(function(drop) {
    const dropdownMenu = document.getElementById(drop.menu);
    const dropdownButton = document.querySelector(drop.buttonSelector);

    if (!dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
      if (!dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.add('hidden');
      }
    }
  });
});

// Function to toggle between Map View and List View
function toggleView() {
  const mapContainer = document.getElementById('map-container');
  const listingsContainer = document.getElementById('listings-container');
  const toggleText = document.getElementById('toggle-view-text');
  const listingsGrid = document.getElementById('listings-grid');
  const mainContent = document.getElementById('main-content');
  
  if (mapContainer.classList.contains('hidden')) {
    // Currently in List View, switch to Map View
    mapContainer.classList.remove('hidden');
    listingsContainer.classList.remove('w-full');
    listingsContainer.classList.add('w-2/5');
    toggleText.textContent = 'List View';

    // Adjust grid columns to 2 for Map View
    listingsGrid.classList.remove('grid-cols-4');
    listingsGrid.classList.add('grid-cols-2');

    // Remove 'list-view' class to decrease height
    mainContent.classList.remove('list-view');
  } else {
    // Currently in Map View, switch to List View
    mapContainer.classList.add('hidden');
    listingsContainer.classList.remove('w-2/5');
    listingsContainer.classList.add('w-full');
    toggleText.textContent = 'Map View';

    // Adjust grid columns to 4 for List View
    listingsGrid.classList.remove('grid-cols-2');
    listingsGrid.classList.add('grid-cols-4');

    // Add 'list-view' class to increase height
    mainContent.classList.add('list-view');
  }
}

// Function to toggle the dropdown menus
function toggleDropdown(dropdownId) {
  const dropdowns = document.querySelectorAll('.relative .origin-top-left');
  dropdowns.forEach(dropdown => {
    if (dropdown.id === dropdownId) {
      dropdown.classList.toggle('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  });
}

// Functions to manage the selection of amenities
const selectedAmenities = [];

function toggleAmenity(amenity) {
  const index = selectedAmenities.indexOf(amenity);
  const checkmark = document.getElementById(`amenity-checkmark-${amenity.replace(' ', '-')}`);
  
  if (index > -1) {
    // Remove amenity
    selectedAmenities.splice(index, 1);
    checkmark.classList.add('hidden');
  } else {
    // Add amenity
    selectedAmenities.push(amenity);
    checkmark.classList.remove('hidden');
  }
}

// Functions to manage the selection of features
const selectedFeatures = [];

function toggleFeature(feature) {
  const index = selectedFeatures.indexOf(feature);
  const checkmark = document.getElementById(`feature-checkmark-${feature.replace(' ', '-')}`);
  
  if (index > -1) {
    // Remove feature
    selectedFeatures.splice(index, 1);
    checkmark.classList.add('hidden');
  } else {
    // Add feature
    selectedFeatures.push(feature);
    checkmark.classList.remove('hidden');
  }
}

// Function to apply advanced filters
function applyAdvancedFilters() {
  // Get the minimum school rating
  const schoolRating = document.getElementById('school-rating').value;
  
  // Build the filter criteria
  const filters = {
    amenities: selectedAmenities,
    features: selectedFeatures,
    schoolRating: schoolRating,
  };

  // Send filters to the server or apply them on the client-side
  // For now, we can console.log them
  console.log('Applying advanced filters:', filters);

  // Close the dropdown
  toggleDropdown('advanced-filters-dropdown');
}

// Function to clear advanced filters
function clearAdvancedFilters() {
  // Reset selections
  selectedAmenities.length = 0;
  selectedFeatures.length = 0;
  document.getElementById('school-rating').value = '';

  // Reset checkmarks
  const amenityCheckmarks = document.querySelectorAll('[id^="amenity-checkmark-"]');
  amenityCheckmarks.forEach((checkmark) => {
    checkmark.classList.add('hidden');
  });

  const featureCheckmarks = document.querySelectorAll('[id^="feature-checkmark-"]');
  featureCheckmarks.forEach((checkmark) => {
    checkmark.classList.add('hidden');
  });

  // Close the dropdown
  toggleDropdown('advanced-filters-dropdown');
}