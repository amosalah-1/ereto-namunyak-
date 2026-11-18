/**
 * Ereto Namunyak CBO - Pesapal Payment Gateway v3 Integration Service
 * Fully supports Pesapal 3.0 API (Token, IPN, SubmitOrder, StatusCheck)
 * and includes a graceful simulation fallback for development/testing when keys are in demo mode.
 */

let cachedToken = null;
let tokenExpiresAt = null;

const PESAPAL_BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3/api',
  live: 'https://pay.pesapal.com/v3/api'
};

function getBaseUrl() {
  const env = (process.env.PESAPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  return PESAPAL_BASE_URLS[env] || PESAPAL_BASE_URLS.sandbox;
}

function isDemoMode() {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  return !key || !secret || key.includes('demo_') || secret.includes('demo_');
}

/**
 * Obtain OAuth 2.0 Bearer Token from Pesapal v3
 */
async function getAuthToken() {
  if (isDemoMode()) {
    return 'demo_mock_bearer_token_' + Date.now();
  }

  // Check if existing token is valid (with 5 minute buffer)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken;
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Auth/RequestToken`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pesapal Auth Token failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    cachedToken = data.token;
    tokenExpiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 3600000;
    return cachedToken;
  } catch (err) {
    console.error('[Pesapal Auth Error]', err.message);
    throw err;
  }
}

/**
 * Register or get IPN Notification ID
 */
async function getOrRegisterIpnId() {
  if (process.env.PESAPAL_IPN_ID && process.env.PESAPAL_IPN_ID.trim().length > 0) {
    return process.env.PESAPAL_IPN_ID.trim();
  }

  if (isDemoMode()) {
    return 'demo_mock_ipn_id_ereto_001';
  }

  const token = await getAuthToken();
  const baseUrl = getBaseUrl();
  const ipnUrl = process.env.PESAPAL_IPN_URL || `${process.env.APP_URL || 'http://localhost:5000'}/api/donations/pesapal-ipn`;

  try {
    const res = await fetch(`${baseUrl}/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'GET'
      })
    });

    const data = await res.json();
    if (data.ipn_id) {
      console.log(`[Pesapal] Registered IPN ID: ${data.ipn_id} for URL: ${ipnUrl}`);
      return data.ipn_id;
    }
    return null;
  } catch (err) {
    console.error('[Pesapal RegisterIPN Error]', err.message);
    return null;
  }
}

/**
 * Submit payment order to Pesapal
 */
async function submitOrder({
  merchantReference,
  amount,
  currency = 'KES',
  description,
  callbackUrl,
  donorName,
  donorEmail,
  donorPhone
}) {
  const names = (donorName || 'Generous Supporter').trim().split(' ');
  const firstName = names[0] || 'Ereto';
  const lastName = names.slice(1).join(' ') || 'Supporter';

  if (isDemoMode()) {
    // Generate simulated payment flow
    const trackingId = `mock_tracking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockRedirect = `${callbackUrl || '/payment-callback.html'}?OrderTrackingId=${trackingId}&OrderMerchantReference=${merchantReference}&simulation=true`;
    return {
      order_tracking_id: trackingId,
      merchant_reference: merchantReference,
      redirect_url: mockRedirect,
      status: '200',
      is_mock: true
    };
  }

  const token = await getAuthToken();
  const ipnId = await getOrRegisterIpnId();
  const baseUrl = getBaseUrl();

  const payload = {
    id: merchantReference,
    currency: currency,
    amount: parseFloat(amount),
    description: description || 'Donation to Ereto Namunyak CBO',
    callback_url: callbackUrl || process.env.PESAPAL_CALLBACK_URL,
    notification_id: ipnId,
    billing_address: {
      email_address: donorEmail,
      phone_number: donorPhone,
      country_code: 'KE',
      first_name: firstName,
      last_name: lastName
    }
  };

  try {
    const res = await fetch(`${baseUrl}/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.message || data.error?.message || 'Failed to submit order to Pesapal');
    }

    return {
      order_tracking_id: data.order_tracking_id,
      merchant_reference: data.merchant_reference,
      redirect_url: data.redirect_url,
      status: data.status,
      is_mock: false
    };
  } catch (err) {
    console.error('[Pesapal SubmitOrder Error]', err.message);
    throw err;
  }
}

/**
 * Verify payment status with Pesapal API
 */
async function getTransactionStatus(orderTrackingId) {
  if (isDemoMode() || (orderTrackingId && orderTrackingId.startsWith('mock_tracking_'))) {
    return {
      payment_method: 'Mpesa',
      amount: 1000,
      confirmation_code: `MPE${Math.floor(10000000 + Math.random() * 90000000)}`,
      payment_status_description: 'Completed',
      payment_account: '2547XXXXXXXX',
      status_code: 1,
      currency: 'KES',
      status: '200',
      is_mock: true
    };
  }

  const token = await getAuthToken();
  const baseUrl = getBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[Pesapal GetStatus Error]', err.message);
    throw err;
  }
}

module.exports = {
  getAuthToken,
  getOrRegisterIpnId,
  submitOrder,
  getTransactionStatus,
  isDemoMode
};
