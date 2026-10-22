const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  nameAr: { type: String, default: "" },
  nameEn: { type: String, default: "" },
  addressAr: { type: String, default: "" },
  addressEn: { type: String, default: "" },
  phone: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
  website: { type: String, default: "" },
  email: { type: String, default: "" },
  currencyAr: { type: String, default: "" },
  currencyEn: { type: String, default: "" },
  taxNumber: { type: String, default: "" },
  shippingCompany: { type: String, default: "" },
  paymentMethod: { type: String, default: "" },
  details: { type: String, default: "" },
  logo: { type: String, default: "" },
  header: { type: String, default: "" },
  footer: { type: String, default: "" },
  stamp: { type: String, default: "" },
  cancelStamp: { type: String, default: "" },
  qrImage: { type: String, default: "" },
  qrLink: { type: String, default: "" },
  number1: { type: String, default: "" },
  img1: { type: String, default: "" },
  link1: { type: String, default: "" },
  link1Type: { type: String, default: "link" },
  file1: { type: String, default: "" },
  number2: { type: String, default: "" },
  img2: { type: String, default: "" },
  link2: { type: String, default: "" },
  link2Type: { type: String, default: "link" },
  file2: { type: String, default: "" },

  // Footer Documents & Certifications
  crName: { type: String, default: "" },
  crNumber: { type: String, default: "" },
  crImage: { type: String, default: "" },
  crLink: { type: String, default: "" },

  bcTitle: { type: String, default: "" },
  bcSubtitle: { type: String, default: "" },
  bcNumber: { type: String, default: "" },
  bcImage: { type: String, default: "" },
  bcLink: { type: String, default: "" },

  vatTitle: { type: String, default: "" },
  vatImage: { type: String, default: "" },
  vatPdf: { type: String, default: "" },

  footerItems: [
    {
      number: { type: String, default: "" },
      image: { type: String, default: "" },
      linkType: { type: String, default: "link" },
      link: { type: String, default: "" },
      file: { type: String, default: "" },
    }
  ],
  
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
