document.getElementById('search-input').addEventListener('input', function () {
    const profileBox = document.getElementById('profile-box');
    profileBox.classList.remove('hidden'); // Show the profile box
  });

  // Close the profile box when the close button is clicked
  document.getElementById('close-profile-box').addEventListener('click', function () {
    const profileBox = document.getElementById('profile-box');
    profileBox.classList.add('hidden'); // Hide the profile box
  });