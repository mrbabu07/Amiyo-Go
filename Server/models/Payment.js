const { ObjectId } = require("mongodb");

class Payment {
  constructor(db) {
    this.collection = db.collection("payments");
  }

  async findAll() {
    return await this.collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByOrderId(orderId) {
    return await this.collection.findOne({ orderId });
  }

  async findByUserId(userId) {
    return await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async create(paymentData) {
    const payment = {
      ...paymentData,
      status: 'pending', // pending, processing, completed, failed, refunded
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(payment);
    return result.insertedId;
  }

  async updateStatus(id, status, transactionData = {}) {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...transactionData
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
    }

    return await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
  }

  async processStripePayment(paymentData) {
    // This would integrate with Stripe API
    // For now, we'll simulate the payment process
    
    try {
      // Simulate Stripe payment processing
      const stripePayment = {
        stripePaymentId: `pi_${Date.now()}`, // Simulated Stripe payment ID
        stripeStatus: 'succeeded',
        stripeFee: Math.round(paymentData.amount * 0.029 + 30), // Stripe fee calculation
        currency: 'bdt'
      };

      const paymentId = await this.create({
        ...paymentData,
        paymentMethod: 'stripe',
        ...stripePayment,
        status: 'completed'
      });

      return {
        success: true,
        paymentId,
        transactionId: stripePayment.stripePaymentId
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processBkashPayment(paymentData) {
    // This would integrate with bKash API
    // For now, we'll simulate the payment process
    
    try {
      // Simulate bKash payment processing
      const bkashPayment = {
        bkashTransactionId: `TXN${Date.now()}`,
        bkashStatus: 'Completed',
        bkashFee: Math.round(paymentData.amount * 0.015), // bKash fee
        currency: 'bdt'
      };

      const paymentId = await this.create({
        ...paymentData,
        paymentMethod: 'bkash',
        ...bkashPayment,
        status: 'completed'
      });

      return {
        success: true,
        paymentId,
        transactionId: bkashPayment.bkashTransactionId
      };
    } catch (error) {
      console.error('bKash payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processNagadPayment(paymentData) {
    // This would integrate with Nagad API
    // For now, we'll simulate the payment process
    
    try {
      // Simulate Nagad payment processing
      const nagadPayment = {
        nagadTransactionId: `NGD${Date.now()}`,
        nagadStatus: 'Success',
        nagadFee: Math.round(paymentData.amount * 0.015), // Nagad fee
        currency: 'bdt'
      };

      const paymentId = await this.create({
        ...paymentData,
        paymentMethod: 'nagad',
        ...nagadPayment,
        status: 'completed'
      });

      return {
        success: true,
        paymentId,
        transactionId: nagadPayment.nagadTransactionId
      };
    } catch (error) {
      console.error('Nagad payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processCODPayment(paymentData) {
    // Cash on Delivery - no actual payment processing needed
    const paymentId = await this.create({
      ...paymentData,
      paymentMethod: 'cod',
      status: 'pending', // Will be completed when cash is received
      codNotes: 'Payment to be collected on delivery'
    });

    return {
      success: true,
      paymentId,
      transactionId: `COD${Date.now()}`
    };
  }

  async processRefund(paymentId, refundAmount, reason = '') {
    const payment = await this.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    // Create refund record
    const refund = {
      originalPaymentId: paymentId,
      refundAmount,
      reason,
      status: 'processing',
      createdAt: new Date()
    };

    // In a real implementation, this would call the payment gateway's refund API
    // For now, we'll simulate the refund process
    
    const refundId = await this.collection.insertOne({
      ...refund,
      refundId: `REF${Date.now()}`,
      status: 'completed',
      completedAt: new Date()
    });

    // Update original payment status
    await this.updateStatus(paymentId, 'refunded', {
      refundId: refundId.insertedId,
      refundAmount,
      refundedAt: new Date()
    });

    return {
      success: true,
      refundId: refundId.insertedId
    };
  }

  async getPaymentStats() {
    const pipeline = [
      {
        $group: {
          _id: {
            status: "$status",
            method: "$paymentMethod"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ];

    const stats = await this.collection.aggregate(pipeline).toArray();
    
    const result = {
      totalTransactions: 0,
      totalAmount: 0,
      byStatus: {},
      byMethod: {}
    };

    stats.forEach(stat => {
      result.totalTransactions += stat.count;
      result.totalAmount += stat.totalAmount;
      
      if (!result.byStatus[stat._id.status]) {
        result.byStatus[stat._id.status] = { count: 0, amount: 0 };
      }
      result.byStatus[stat._id.status].count += stat.count;
      result.byStatus[stat._id.status].amount += stat.totalAmount;
      
      if (!result.byMethod[stat._id.method]) {
        result.byMethod[stat._id.method] = { count: 0, amount: 0 };
      }
      result.byMethod[stat._id.method].count += stat.count;
      result.byMethod[stat._id.method].amount += stat.totalAmount;
    });

    return result;
  }
}

module.exports = Payment;