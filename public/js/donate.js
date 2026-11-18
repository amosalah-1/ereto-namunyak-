/**
 * Ereto Namunyak CBO - Pesapal Secure Donation Client Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const donationForm = document.getElementById('pesapal-donation-form');
  const amountBtns = document.querySelectorAll('.amount-btn');
  const customAmountInput = document.getElementById('custom-amount-input');
  const selectedAmountDisplay = document.getElementById('selected-amount-display');
  const projectSelect = document.getElementById('donation-project-select');

  let currentAmount = 1000;

  // Pre-select project from query string if present (e.g. donate.html?project=2)
  const urlParams = new URLSearchParams(window.location.search);
  const targetProjectId = urlParams.get('project');

  // Load projects into donation dropdown
  if (projectSelect) {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          projectSelect.innerHTML = '<option value="">-- General Community Empowerment Fund --</option>';
          data.data.forEach(p => {
            const isSelected = targetProjectId && (String(p.id) === targetProjectId || p.slug === targetProjectId) ? 'selected' : '';
            projectSelect.innerHTML += `<option value="${p.id}" ${isSelected}>${p.title}</option>`;
          });
        }
      })
      .catch(err => console.error('Could not load projects for donation', err));
  }

  // Handle Preset Amount Buttons (KES 100, 500, 1000, 5000)
  amountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      amountBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const amountVal = parseFloat(btn.getAttribute('data-amount'));
      currentAmount = amountVal;

      if (customAmountInput) {
        customAmountInput.value = '';
      }
      updateAmountDisplay(currentAmount);
    });
  });

  // Handle Custom Amount Input
  if (customAmountInput) {
    customAmountInput.addEventListener('input', () => {
      amountBtns.forEach(b => b.classList.remove('active'));
      const val = parseFloat(customAmountInput.value);
      if (!isNaN(val) && val > 0) {
        currentAmount = val;
        updateAmountDisplay(currentAmount);
      } else {
        updateAmountDisplay(0);
      }
    });
  }

  function updateAmountDisplay(amount) {
    if (selectedAmountDisplay) {
      selectedAmountDisplay.innerText = `KES ${Number(amount).toLocaleString()}`;
    }
  }

  // Handle Donation Form Submit
  if (donationForm) {
    donationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const donorName = document.getElementById('donor-name')?.value.trim();
      const donorEmail = document.getElementById('donor-email')?.value.trim();
      const donorPhone = document.getElementById('donor-phone')?.value.trim();
      const donorMessage = document.getElementById('donor-message')?.value.trim();
      const projectId = projectSelect?.value || null;

      if (!donorName) {
        showToast('Please enter your full name.', 'warning');
        return;
      }
      if (!donorEmail || !donorEmail.includes('@')) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }
      if (!donorPhone || donorPhone.length < 9) {
        showToast('Please enter a valid phone number (e.g. 0712345678).', 'warning');
        return;
      }
      if (!currentAmount || currentAmount < 10) {
        showToast('Please select or specify a contribution amount of at least KES 10.', 'warning');
        return;
      }

      const submitBtn = document.getElementById('donate-submit-btn');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting to Pesapal Secure Gateway...';

      try {
        const res = await fetch('/api/donations/pesapal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donor_name: donorName,
            donor_email: donorEmail,
            donor_phone: donorPhone,
            amount: currentAmount,
            message: donorMessage,
            project_id: projectId
          })
        });

        const data = await res.json();

        if (data.success && data.redirect_url) {
          showToast('Order generated! Redirecting to secure Pesapal payment...', 'success');
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 800);
        } else {
          showToast(data.message || 'Payment initiation failed.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      } catch (err) {
        console.error('Pesapal donation submission error', err);
        showToast('Could not reach the payment gateway. Please check your internet connection.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
