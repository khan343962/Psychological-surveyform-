const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  submittedAt: { type: Date, default: Date.now },
  consent: { type: String, required: true },
  demographics: {
    gender: { type: String },
    age: { type: Number },
    educationLevel: { type: String },
    educationOther: { type: String },
    hoursOnSocialMedia: { type: String },
    mostUsedPlatform: { type: String },
    platformOther: { type: String }
  },
  asmc: {
    item1: { type: Number }, item2: { type: Number },
    item3: { type: Number }, item4: { type: Number },
    item5: { type: Number }, item6: { type: Number },
    item7: { type: Number }, item8: { type: Number },
    item9: { type: Number }, item10: { type: Number },
    item11: { type: Number }, item12: { type: Number },
    item13: { type: Number },
    totalScore: { type: Number }
  },
  bidq: {
    item1: { score: { type: Number }, openText: { type: String } },
    item2: { score: { type: Number }, openText: { type: String } },
    item3: { score: { type: Number } },
    item4: { score: { type: Number } },
    item5: { score: { type: Number }, openText: { type: String } },
    item6: { score: { type: Number }, openText: { type: String } },
    item7: { score: { type: Number }, openText: { type: String } }
  },
  rses: {
    item1: { type: Number }, item2: { type: Number }, item3: { type: Number },
    item4: { type: Number }, item5: { type: Number }, item6: { type: Number },
    item7: { type: Number }, item8: { type: Number }, item9: { type: Number },
    item10: { type: Number }, totalScore: { type: Number }
  }
});

module.exports = mongoose.model('Response', responseSchema);
