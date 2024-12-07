$(document).ready(function() {
  // Collect all the task items
  const $tasks = $('.task-item');
  const $progressBar = $('#progressBar');
  const $submitBtn = $('#submitApplication');

  function updateProgress() {
    // Count completed tasks among the REQUIRED core tasks. In this example, we consider all tasks required.
    const totalTasks = $tasks.length;
    let completedCount = 0;
    $tasks.each(function() {
      const status = $(this).find('.task-status').val();
      if (status === 'Completed') {
        completedCount++;
      }
    });

    const completionPercentage = (completedCount / totalTasks) * 100;
    $progressBar.css('width', completionPercentage + '%');

    // Enable submit button if all required tasks are completed.
    if (completedCount === totalTasks) {
      $submitBtn.removeClass('bg-gray-400 cursor-not-allowed');
      $submitBtn.addClass('bg-green-600 hover:bg-green-700 cursor-pointer');
      $submitBtn.prop('disabled', false);
    } else {
      $submitBtn.removeClass('bg-green-600 hover:bg-green-700 cursor-pointer');
      $submitBtn.addClass('bg-gray-400 cursor-not-allowed');
      $submitBtn.prop('disabled', true);
    }
  }

  // On change of task status, update progress
  $('.task-status').on('change', function() {
    updateProgress();
  });

  // Initially run once to set correct state
  updateProgress();

  // The submit button currently doesn't send data anywhere; you can integrate later.
  $submitBtn.on('click', function() {
    if (!$submitBtn.prop('disabled')) {
      alert('All tasks completed. Application ready to submit!');
      // Future: Add AJAX call or navigation to submission endpoint.
    }
  });

  // Tab Navigation Logic
  $('.tab-link').on('click', function() {
    const tabId = $(this).data('tab');

    // Hide all tab-content sections
    $('.tab-content').addClass('hidden');

    // Remove active state from all tab-link buttons
    $('.tab-link').removeClass('bg-blue-100 text-blue-900 font-bold');

    // Show the selected tab content
    $('#' + tabId).removeClass('hidden');

    // Add a simple active state to the clicked tab
    $(this).addClass('bg-blue-100 text-blue-900 font-bold');
  });

  // Automatically select the correct tab based on pre-approval status
  if (window.isPreApproved) {
    // If pre-approved, show Mortgage Application tab by default
    $('[data-tab="mortgageAppTab"]').click();
  } else {
    // If not pre-approved, show Home tab by default
    $('[data-tab="homeTab"]').click();
  }
});
