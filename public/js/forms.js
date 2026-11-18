/**
 * Ereto Namunyak CBO - Forms Controller (Membership, Volunteer, Contact Inquiries)
 */

document.addEventListener('DOMContentLoaded', () => {
  const joinTabButtons = document.querySelectorAll('[data-join-tab]');
  if (joinTabButtons.length) {
    const volunteerButton = document.getElementById('tab-btn-volunteer');
    const memberButton = document.getElementById('tab-btn-member');
    const volunteerPane = document.getElementById('join-pane-volunteer');
    const memberPane = document.getElementById('join-pane-member');

    const switchJoinTab = (tab) => {
      const showMember = tab === 'member';
      volunteerButton.className = showMember ? 'btn btn-outline btn-lg' : 'btn btn-primary btn-lg';
      memberButton.className = showMember ? 'btn btn-primary btn-lg' : 'btn btn-outline btn-lg';
      volunteerPane.style.display = showMember ? 'none' : 'block';
      memberPane.style.display = showMember ? 'block' : 'none';
    };

    joinTabButtons.forEach(button => {
      button.addEventListener('click', () => switchJoinTab(button.dataset.joinTab));
    });

    const initialTab = new URLSearchParams(window.location.search).get('type') === 'member' ? 'member' : 'volunteer';
    switchJoinTab(initialTab);
  }

  // 1. Volunteer Form Submission
  const volunteerForm = document.getElementById('volunteer-form');
  if (volunteerForm) {
    volunteerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('vol-name')?.value.trim();
      const email = document.getElementById('vol-email')?.value.trim();
      const phone = document.getElementById('vol-phone')?.value.trim();
      const location = document.getElementById('vol-location')?.value.trim();
      const areaOfInterest = document.getElementById('vol-interest')?.value;
      const skills = document.getElementById('vol-skills')?.value.trim();
      const availability = document.getElementById('vol-availability')?.value;
      const notes = document.getElementById('vol-notes')?.value.trim();

      if (!fullName || !email || !phone) {
        showToast('Please provide your name, email, and phone number.', 'warning');
        return;
      }

      const btn = volunteerForm.querySelector('button[type="submit"]');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting Application...';

      try {
        const res = await fetch('/api/forms/volunteer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone,
            location,
            area_of_interest: areaOfInterest,
            skills,
            availability,
            notes
          })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          volunteerForm.reset();
        } else {
          showToast(data.message || 'Submission failed', 'error');
        }
      } catch (err) {
        showToast('Unable to submit. Please check your network connection.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });
  }

  // 2. Member Form Submission
  const memberForm = document.getElementById('member-form');
  if (memberForm) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('mem-name')?.value.trim();
      const email = document.getElementById('mem-email')?.value.trim();
      const phone = document.getElementById('mem-phone')?.value.trim();
      const nationalId = document.getElementById('mem-id')?.value.trim();
      const county = document.getElementById('mem-county')?.value.trim();
      const subCounty = document.getElementById('mem-subcounty')?.value.trim();
      const occupation = document.getElementById('mem-occupation')?.value.trim();
      const membershipType = document.getElementById('mem-type')?.value;
      const notes = document.getElementById('mem-notes')?.value.trim();

      if (!fullName || !email || !phone) {
        showToast('Please provide your name, email, and phone number.', 'warning');
        return;
      }

      const btn = memberForm.querySelector('button[type="submit"]');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering Membership...';

      try {
        const res = await fetch('/api/forms/member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone,
            national_id: nationalId,
            county,
            sub_county: subCounty,
            occupation,
            membership_type: membershipType,
            notes
          })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          memberForm.reset();
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast('Unable to submit. Please check your connection.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });
  }

  // 3. Contact Form Submission
  const contactForm = document.getElementById('contact-inquiry-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('contact-name')?.value.trim();
      const email = document.getElementById('contact-email')?.value.trim();
      const phone = document.getElementById('contact-phone')?.value.trim();
      const subject = document.getElementById('contact-subject')?.value.trim();
      const message = document.getElementById('contact-message')?.value.trim();

      if (!name || !email || !message) {
        showToast('Please complete all required fields.', 'warning');
        return;
      }

      const btn = contactForm.querySelector('button[type="submit"]');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending message...';

      try {
        const res = await fetch('/api/forms/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, subject, message })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          contactForm.reset();
        } else {
          showToast(data.message || 'Message could not be sent.', 'error');
        }
      } catch (err) {
        showToast('Connection error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });
  }
});
