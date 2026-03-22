const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');

// @desc    Get dashboard analytics (revenue, low stock)
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    // 1. Calculate Revenue (Today, This Month, Total)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const matchToday = { createdAt: { $gte: startOfToday } };
    const matchMonth = { createdAt: { $gte: startOfMonth } };

    const revenuePromise = Bill.aggregate([
      {
        $facet: {
          today: [
            { $match: matchToday },
            { $group: { _id: null, total: { $sum: "$finalTotal" }, count: { $sum: 1 } } }
          ],
          month: [
            { $match: matchMonth },
            { $group: { _id: null, total: { $sum: "$finalTotal" }, count: { $sum: 1 } } }
          ],
          total: [
            { $group: { _id: null, total: { $sum: "$finalTotal" }, count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // 2. Fetch Low Stock Medicines < 15
    const lowStockPromise = Medicine.find({ stock: { $lt: 20 } }).select('name stock price').sort({ stock: 1 }).limit(10);

    // 3. Recent 5 Bills
    const recentBillsPromise = Bill.find().sort({ createdAt: -1 }).limit(5).populate('patient', 'name').lean();

    // 4. Top 5 Medicines
    const topMedicinesPromise = Bill.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.name", totalSold: { $sum: { $toDouble: { $ifNull: ["$items.quantity", 0] } } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    const [revenueData, lowStock, recentBills, topMedicines] = await Promise.all([revenuePromise, lowStockPromise, recentBillsPromise, topMedicinesPromise]);
    
    const rev = revenueData[0];
    
    res.json({
      revenue: {
        today: rev.today[0] ? rev.today[0].total : 0,
        todayCount: rev.today[0] ? rev.today[0].count : 0,
        month: rev.month[0] ? rev.month[0].total : 0,
        monthCount: rev.month[0] ? rev.month[0].count : 0,
        allTime: rev.total[0] ? rev.total[0].total : 0,
      },
      lowStock,
      recentBills: recentBills.map(b => ({
        _id: b._id,
        billNo: b.invoiceNumber,
        patientName: b.patient ? b.patient.name : 'Walk-in',
        finalTotal: b.finalTotal,
        createdAt: b.createdAt
      })),
      topMedicines
    });

  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = {
  getAnalytics
};
