/**
 * Ereto Namunyak CBO - Donation & Pesapal Payment Controller
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const pesapal = require('../config/pesapal');
const mailer = require('../config/mailer');

/**
 * Public: Initiate Donation Order with Pesapal
 */
async function createDonationOrder(req, res) {
  try {
    const { donor_name, donor_email, donor_phone, amount, message, project_id } = req.body;

    if (!donor_name || !donor_email || !donor_phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide donor name, email, phone number, and contribution amount.'
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid donation amount of at least KES 10.'
      });
    }

    // Generate unique merchant reference
    const merchantReference = `ERETO-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Get project title if specified
    let projectTitle = 'General Community Empowerment';
    let validProjectId = null;
    if (project_id) {
      const proj = await db.getOne('SELECT id, title FROM projects WHERE id = $1', [project_id]);
      if (proj) {
        projectTitle = proj.title;
        validProjectId = proj.id;
      }
    }

    // Insert pending donation record into database
    await db.query(
      `INSERT INTO donations 
       (donor_name, donor_email, donor_phone, amount, currency, message, project_id, pesapal_merchant_reference, payment_status)
       VALUES ($1, $2, $3, $4, 'KES', $5, $6, $7, 'PENDING')`,
      [
        donor_name.trim(),
        donor_email.toLowerCase().trim(),
        donor_phone.trim(),
        numericAmount,
        message ? message.trim() : null,
        validProjectId,
        merchantReference
      ]
    );

    // Build callback URL
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:5000'}/payment-callback.html`;

    // Submit order request to Pesapal
    const orderResult = await pesapal.submitOrder({
      merchantReference,
      amount: numericAmount,
      currency: 'KES',
      description: `Donation to Ereto Namunyak CBO - ${projectTitle}`,
      callbackUrl,
      donorName: donor_name,
      donorEmail: donor_email,
      donorPhone: donor_phone
    });

    // Update donation record with Pesapal Order Tracking ID
    if (orderResult.order_tracking_id) {
      await db.query(
        'UPDATE donations SET pesapal_order_tracking_id = $1 WHERE pesapal_merchant_reference = $2',
        [orderResult.order_tracking_id, merchantReference]
      );
    }

    return res.json({
      success: true,
      message: 'Donation order initiated successfully.',
      redirect_url: orderResult.redirect_url,
      order_tracking_id: orderResult.order_tracking_id,
      merchant_reference: merchantReference,
      is_simulation: !!orderResult.is_mock
    });
  } catch (err) {
    console.error('[Create Donation Error]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to initiate Pesapal payment order. Please try again.'
    });
  }
}

/**
 * Pesapal IPN (Instant Payment Notification) Webhook Listener
 * Triggered by Pesapal server-to-server whenever transaction state changes
 */
async function pesapalIpn(req, res) {
  try {
    const orderTrackingId = req.query.OrderTrackingId || req.body.OrderTrackingId;
    const orderMerchantReference = req.query.OrderMerchantReference || req.body.OrderMerchantReference;
    const orderNotificationType = req.query.OrderNotificationType || req.body.OrderNotificationType || 'IPN';

    console.log(`[Pesapal IPN Received] TrackingId: ${orderTrackingId}, Ref: ${orderMerchantReference}`);

    if (!orderTrackingId) {
      return res.status(400).send('Missing OrderTrackingId');
    }

    // Verify transaction status directly with Pesapal
    const statusData = await pesapal.getTransactionStatus(orderTrackingId);
    console.log('[Pesapal IPN Status Result]', statusData);

    const isCompleted =
      statusData.payment_status_description === 'Completed' ||
      statusData.status_code === 1 ||
      statusData.status === '200' && statusData.payment_status_description?.toLowerCase() === 'completed';

    const isFailed =
      statusData.payment_status_description === 'Failed' ||
      statusData.status_code === 2;

    const newStatus = isCompleted ? 'COMPLETED' : (isFailed ? 'FAILED' : 'PENDING');

    // Retrieve existing donation record
    const donation = await db.getOne(
      'SELECT * FROM donations WHERE pesapal_order_tracking_id = $1 OR pesapal_merchant_reference = $2',
      [orderTrackingId, orderMerchantReference]
    );

    if (donation) {
      const receiptNumber = donation.receipt_number || `REC-${Date.now().toString().slice(-6)}`;

      await db.query(
        `UPDATE donations
         SET payment_status = $1, payment_method = $2, receipt_number = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newStatus, statusData.payment_method || 'Pesapal', receiptNumber, donation.id]
      );

      // Record transaction history
      await db.query(
        `INSERT INTO transactions
         (donation_id, merchant_reference, order_tracking_id, amount, currency, status, payment_account, raw_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          donation.id,
          orderMerchantReference || donation.pesapal_merchant_reference,
          orderTrackingId,
          statusData.amount || donation.amount,
          statusData.currency || 'KES',
          newStatus,
          statusData.payment_account || null,
          JSON.stringify(statusData)
        ]
      );

      // If status changed to COMPLETED, update project raised amount and send receipt
      if (isCompleted && donation.payment_status !== 'COMPLETED') {
        if (donation.project_id) {
          await db.query(
            'UPDATE projects SET raised_amount = raised_amount + $1 WHERE id = $2',
            [donation.amount, donation.project_id]
          );
        }

        // Fetch project name if any
        let projName = 'General Community Fund';
        if (donation.project_id) {
          const proj = await db.getOne('SELECT title FROM projects WHERE id = $1', [donation.project_id]);
          if (proj) projName = proj.title;
        }

        // Send email receipt
        await mailer.sendDonationReceipt({
          donorName: donation.donor_name,
          donorEmail: donation.donor_email,
          amount: donation.amount,
          currency: donation.currency || 'KES',
          merchantReference: donation.pesapal_merchant_reference,
          receiptNumber,
          projectTitle: projName
        });
      }
    }

    // Pesapal IPN standard response format
    const ipnResponse = {
      orderNotificationType: orderNotificationType,
      orderTrackingId: orderTrackingId,
      orderMerchantReference: orderMerchantReference,
      status: 200
    };

    return res.status(200).json(ipnResponse);
  } catch (err) {
    console.error('[Pesapal IPN Error]', err);
    return res.status(500).json({ error: 'IPN Processing Error', message: err.message });
  }
}

/**
 * Public & Admin: Verify Payment Status
 * Called by frontend callback or admin manual verification button
 */
async function verifyPayment(req, res) {
  try {
    const { orderTrackingId, merchantReference } = req.query;

    if (!orderTrackingId && !merchantReference) {
      return res.status(400).json({
        success: false,
        message: 'OrderTrackingId or MerchantReference required.'
      });
    }

    let donation = await db.getOne(
      'SELECT d.*, p.title AS project_title FROM donations d LEFT JOIN projects p ON d.project_id = p.id WHERE d.pesapal_order_tracking_id = $1 OR d.pesapal_merchant_reference = $2',
      [orderTrackingId || null, merchantReference || null]
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found.' });
    }

    // Always query Pesapal directly to verify the real status
    const statusData = await pesapal.getTransactionStatus(orderTrackingId || donation.pesapal_order_tracking_id);

    const isCompleted =
      statusData.payment_status_description === 'Completed' ||
      statusData.status_code === 1 ||
      (statusData.status === '200' && statusData.payment_status_description?.toLowerCase() === 'completed');

    const isFailed =
      statusData.payment_status_description === 'Failed' ||
      statusData.status_code === 2;

    const newStatus = isCompleted ? 'COMPLETED' : (isFailed ? 'FAILED' : 'PENDING');

    const receiptNumber = donation.receipt_number || `REC-${Date.now().toString().slice(-6)}`;

    // Update in database
    await db.query(
      `UPDATE donations 
       SET payment_status = $1, payment_method = $2, receipt_number = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newStatus, statusData.payment_method || donation.payment_method || 'Pesapal', receiptNumber, donation.id]
    );

    // If newly completed, update raised amount
    if (isCompleted && donation.payment_status !== 'COMPLETED') {
      if (donation.project_id) {
        await db.query(
          'UPDATE projects SET raised_amount = raised_amount + $1 WHERE id = $2',
          [donation.amount, donation.project_id]
        );
      }
      await mailer.sendDonationReceipt({
        donorName: donation.donor_name,
        donorEmail: donation.donor_email,
        amount: donation.amount,
        currency: donation.currency || 'KES',
        merchantReference: donation.pesapal_merchant_reference,
        receiptNumber,
        projectTitle: donation.project_title || 'General Community Fund'
      });
    }

    donation.payment_status = newStatus;
    donation.receipt_number = receiptNumber;
    donation.payment_method = statusData.payment_method || 'Pesapal';

    return res.json({
      success: true,
      donation,
      pesapal_status: statusData
    });
  } catch (err) {
    console.error('[Verify Payment Error]', err);
    return res.status(500).json({ success: false, message: 'Unable to verify payment with Pesapal.' });
  }
}

/**
 * Admin: Get all donations with filters
 */
async function getAdminDonations(req, res) {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT d.*, p.title AS project_title
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status.toUpperCase());
      sql += ` AND d.payment_status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(d.donor_name) LIKE $${params.length} OR LOWER(d.donor_email) LIKE $${params.length} OR LOWER(d.pesapal_merchant_reference) LIKE $${params.length} OR LOWER(d.donor_phone) LIKE $${params.length})`;
    }

    sql += ` ORDER BY d.id DESC`;

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Admin Get Donations Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve donation records.' });
  }
}

/**
 * Admin: Get raw transaction logs
 */
async function getAdminTransactions(req, res) {
  try {
    const result = await db.query('SELECT * FROM transactions ORDER BY id DESC LIMIT 100');
    return res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[Admin Get Transactions Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve transactions.' });
  }
}

module.exports = {
  createDonationOrder,
  pesapalIpn,
  verifyPayment,
  getAdminDonations,
  getAdminTransactions
};
