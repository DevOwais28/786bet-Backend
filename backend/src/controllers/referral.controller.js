const User = require('../models/User.js');
const Referral = require('../models/Referral.js');

const getReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const referrals = await Referral.find({ referrer: userId })
      .populate('referredUser', 'email username createdAt')
      .sort({ createdAt: -1 });

    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    const activeReferrals = await Referral.countDocuments({ 
      referrer: userId, 
      isActive: true 
    });

    res.json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref._id,
        referredUser: ref.referredUser,
        commission: ref.commission,
        isActive: ref.isActive,
        createdAt: ref.createdAt
      })),
      stats: {
        totalReferrals,
        activeReferrals
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    const totalCommission = await Referral.aggregate([
      { $match: { referrer: userId } },
      { $group: { _id: null, total: { $sum: '$commission' } } }
    ]);

    const monthlyStats = await Referral.aggregate([
      { 
        $match: { 
          referrer: userId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          commission: { $sum: '$commission' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalReferrals,
        totalCommission: totalCommission[0]?.total || 0,
        monthlyStats
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
};

module.exports = {
  getReferrals,
  getReferralStats
};
