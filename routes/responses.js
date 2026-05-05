const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const mongoose = require('mongoose');

const validateSubmission = (body) => {
  if (!body || typeof body !== 'object') return false;
  if (!body.consent) return false;
  if (!body.demographics || typeof body.demographics !== 'object') return false;
  if (!body.asmc || typeof body.asmc !== 'object') return false;
  if (!body.bidq || typeof body.bidq !== 'object') return false;
  if (!body.rses || typeof body.rses !== 'object') return false;

  const demographics = body.demographics;
  if (!demographics.gender || typeof demographics.gender !== 'string') return false;
  if (typeof demographics.age !== 'number' || demographics.age < 13 || demographics.age > 19) return false;
  if (!demographics.educationLevel || typeof demographics.educationLevel !== 'string') return false;
  if (!demographics.hoursOnSocialMedia || typeof demographics.hoursOnSocialMedia !== 'string') return false;
  if (!demographics.mostUsedPlatform || typeof demographics.mostUsedPlatform !== 'string') return false;

  // Validate ASMC (6 questions)
  for (let i = 1; i <= 6; i++) {
    if (typeof body.asmc[`q${i}`] !== 'number') return false;
  }

  // Validate BIDQ (8 questions)
  for (let i = 1; i <= 8; i++) {
    if (typeof body.bidq[`q${i}`] !== 'number') return false;
  }

  // Validate RSES (10 questions)
  for (let i = 1; i <= 10; i++) {
    if (typeof body.rses[`q${i}`] !== 'number') return false;
  }

  return true;
};

router.post('/submit', async (req, res) => {
  try {
    const data = req.body;
    if (!validateSubmission(data)) {
      return res.status(400).json({ success: false, message: 'Invalid submission data.' });
    }

    // Calculate totals
    const asmcTotal = Object.values(data.asmc).reduce((sum, val) => sum + Number(val), 0);
    const bidqTotal = Object.values(data.bidq).reduce((sum, val) => sum + Number(val), 0);
    const rsesTotal = Object.values(data.rses).reduce((sum, val) => sum + Number(val), 0);

    const response = new Response({
      consent: data.consent,
      demographics: {
        gender: data.demographics.gender,
        age: data.demographics.age,
        educationLevel: data.demographics.educationLevel,
        educationOther: data.demographics.educationOther || '',
        hoursOnSocialMedia: data.demographics.hoursOnSocialMedia,
        mostUsedPlatform: data.demographics.mostUsedPlatform,
        platformOther: data.demographics.platformOther || ''
      },
      asmc: {
        item1: data.asmc.q1,
        item2: data.asmc.q2,
        item3: data.asmc.q3,
        item4: data.asmc.q4,
        item5: data.asmc.q5,
        item6: data.asmc.q6,
        totalScore: asmcTotal
      },
      bidq: {
        item1: { score: data.bidq.q1 },
        item2: { score: data.bidq.q2 },
        item3: { score: data.bidq.q3 },
        item4: { score: data.bidq.q4 },
        item5: { score: data.bidq.q5 },
        item6: { score: data.bidq.q6 },
        item7: { score: data.bidq.q7 }
      },
      rses: {
        item1: data.rses.q1,
        item2: data.rses.q2,
        item3: data.rses.q3,
        item4: data.rses.q4,
        item5: data.rses.q5,
        item6: data.rses.q6,
        item7: data.rses.q7,
        item8: data.rses.q8,
        item9: data.rses.q9,
        item10: data.rses.q10,
        totalScore: rsesTotal
      }
    });

    const saved = await response.save();
    return res.json({ success: true, id: saved._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/responses', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;
    const docs = await Response.find().sort({ submittedAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Response.countDocuments();
    return res.json({ success: true, page, limit, total, responses: docs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/responses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const doc = await Response.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Response not found' });
    }
    return res.json({ success: true, response: doc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalResponses = await Response.countDocuments();
    const genders = await Response.aggregate([
      { $group: { _id: '$demographics.gender', count: { $sum: 1 } } }
    ]);
    const genderDistribution = { male: 0, female: 0 };
    genders.forEach((g) => {
      if (g._id === 'Male') genderDistribution.male = g.count;
      if (g._id === 'Female') genderDistribution.female = g.count;
    });
    const avgAsmc = await Response.aggregate([
      { $group: { _id: null, avg: { $avg: '$asmc.totalScore' } } }
    ]);
    const avgRses = await Response.aggregate([
      { $group: { _id: null, avg: { $avg: '$rses.totalScore' } } }
    ]);
    const bidqAgg = await Response.aggregate([
      { $group: {
        _id: null,
        item1: { $avg: '$bidq.item1.score' },
        item2: { $avg: '$bidq.item2.score' },
        item3: { $avg: '$bidq.item3.score' },
        item4: { $avg: '$bidq.item4.score' },
        item5: { $avg: '$bidq.item5.score' },
        item6: { $avg: '$bidq.item6.score' },
        item7: { $avg: '$bidq.item7.score' }
      } }
    ]);
    const ageBucket = await Response.aggregate([
      { $group: { _id: '$demographics.age', count: { $sum: 1 } } }
    ]);
    const ageDistribution = { '13': 0, '14': 0, '15': 0, '16': 0, '17': 0, '18': 0, '19': 0 };
    ageBucket.forEach((entry) => {
      if (ageDistribution[entry._id] !== undefined) {
        ageDistribution[entry._id] = entry.count;
      }
    });

    return res.json({
      success: true,
      totalResponses,
      genderDistribution,
      averageAsmcScore: avgAsmc.length ? Number(avgAsmc[0].avg.toFixed(2)) : 0,
      averageRsesScore: avgRses.length ? Number(avgRses[0].avg.toFixed(2)) : 0,
      bidqAverages: bidqAgg.length ? {
        item1: Number(bidqAgg[0].item1.toFixed(2)),
        item2: Number(bidqAgg[0].item2.toFixed(2)),
        item3: Number(bidqAgg[0].item3.toFixed(2)),
        item4: Number(bidqAgg[0].item4.toFixed(2)),
        item5: Number(bidqAgg[0].item5.toFixed(2)),
        item6: Number(bidqAgg[0].item6.toFixed(2)),
        item7: Number(bidqAgg[0].item7.toFixed(2))
      } : {
        item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0, item7: 0
      },
      ageDistribution
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
