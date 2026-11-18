/**
 * Ereto Namunyak CBO - Admin Login & Password Reset Client Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const alertBox = document.getElementById('login-alert');
  const forgotLink = document.getElementById('forgot-password-link');
  const forgotModal = document.getElementById('forgot-password-modal');
  const forgotClose = document.getElementById('forgot-modal-close');
  const forgotForm = document.getElementById('forgot-password-form');
  const resetSection = document.getElementById('reset-password-section');
  const resetForm = document.getElementById('reset-password-form');

  // Check if reset_token is in query string
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('reset_token');

  if (resetToken && resetSection) {
    // Show password reset form
    document.getElementById('login-section').style.display = 'none';
    resetSection.style.display = 'block';
  }

  function showAlert(msg, type = 'error') {
    if (!alertBox) return;
    alertBox.className = `admin-login-alert ${type}`;
    alertBox.replaceChildren();
    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-circle';
    const message = document.createElement('span');
    message.textContent = String(msg ?? '');
    alertBox.append(icon, message);
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = 'none';
  }

  // 1. Submit Admin Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('admin-email')?.value.trim();
      const password = document.getElementById('admin-password')?.value;
      const rememberMe = document.getElementById('admin-remember')?.checked;

      if (!email || !password) {
        showAlert('Please enter both your email address and password.');
        return;
      }

      const submitBtn = document.getElementById('admin-login-btn');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe })
        });

        const data = await res.json();

        if (data.success) {
          submitBtn.innerHTML = '<i class="fas fa-check"></i> Redirecting...';
          window.location.href = data.redirect || '/admin/dashboard';
        } else {
          showAlert(data.message || 'Invalid email or password.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      } catch (err) {
        showAlert('Could not communicate with authentication server.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // 2. Open Forgot Password Modal
  if (forgotLink && forgotModal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.classList.add('open');
    });
  }

  if (forgotClose && forgotModal) {
    forgotClose.addEventListener('click', () => {
      forgotModal.classList.remove('open');
    });
  }

  // 3. Submit Forgot Password Request
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email')?.value.trim();
      const alertElem = document.getElementById('forgot-modal-alert');

      if (!email) return;

      const btn = forgotForm.querySelector('button[type="submit"]');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (alertElem) {
          alertElem.style.display = 'block';
          alertElem.textContent = data.message || 'If the address is registered, a reset link will be sent.';
        }
        forgotForm.reset();
      } catch (err) {
        if (alertElem) {
          alertElem.style.display = 'block';
          alertElem.innerHTML = 'Error sending reset email. Try again.';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });
  }

  // 4. Submit New Password Reset Form
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('new-password')?.value;
      const confirmPassword = document.getElementById('confirm-password')?.value;
      const alertElem = document.getElementById('reset-alert');

      if (!newPassword || newPassword.length < 8) {
        alertElem.style.display = 'block';
        alertElem.innerText = 'Password must be at least 8 characters long.';
        return;
      }
      if (newPassword !== confirmPassword) {
        alertElem.style.display = 'block';
        alertElem.innerText = 'Passwords do not match.';
        return;
      }

      const btn = resetForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword })
        });
        const data = await res.json();

        if (data.success) {
          alert(data.message);
          window.location.href = '/admin/login';
        } else {
          alertElem.style.display = 'block';
          alertElem.innerText = data.message || 'Failed to reset password.';
          btn.disabled = false;
          btn.innerHTML = 'Set New Password';
        }
      } catch (err) {
        alertElem.style.display = 'block';
        alertElem.innerText = 'Network error. Please try again.';
        btn.disabled = false;
      }
    });
  }
});
