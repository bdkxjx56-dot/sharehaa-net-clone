/**
 * سكريبت لإرجاع منتجات الشرايح والراوترات لحالة متوفر
 * (عكس عملية mark-products-out-of-stock.js)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

// الاتصال بقاعدة البيانات
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI أو MONGO_URI غير موجود في ملف .env");
    }
    await mongoose.connect(mongoUri);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
  } catch (error) {
    console.error("❌ خطأ في الاتصال بقاعدة البيانات:", error);
    process.exit(1);
  }
}

// دالة للتحقق من أن المنتج شريحة أو راوتر
function isSimCardOrRouter(product) {
  if (!product) return false;

  const name = (product.name || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const subCategory = (product.subCategory || "").toLowerCase();

  // الكلمات الدالة على الشرايح والراوترات
  const simKeywords = ["شريحة", "شرايح", "sim", "سيم"];
  const routerKeywords = ["راوتر", "روتر", "router"];

  const allKeywords = [...simKeywords, ...routerKeywords];

  // التحقق من الاسم أو الفئة أو الفئة الفرعية
  return allKeywords.some(
    (keyword) =>
      name.includes(keyword) ||
      category.includes(keyword) ||
      subCategory.includes(keyword)
  );
}

// تنفيذ السكريبت الرئيسي
async function restoreProductsStock() {
  try {
    console.log("🔍 جاري البحث عن منتجات الشرايح والراوترات الغير متوفرة...\n");

    // جلب جميع المنتجات الغير متوفرة
    const allProducts = await Product.find({ inStock: false });
    console.log(`📦 تم العثور على ${allProducts.length} منتج نفذت كميته\n`);

    let restoredCount = 0;
    const restoredProducts = [];

    for (const product of allProducts) {
      // التحقق من أن المنتج شريحة أو راوتر
      if (isSimCardOrRouter(product)) {
        // إرجاع المنتج لحالة متوفر
        product.inStock = true;
        await product.save();
        restoredCount++;
        restoredProducts.push({
          name: product.name,
          _id: product._id,
        });
        console.log(`✅ تم الاسترجاع: ${product.name} -> متوفر`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 ملخص العملية:");
    console.log("=".repeat(60));
    console.log(`✅ عدد المنتجات التي تم إرجاعها للمخزون: ${restoredCount}`);
    console.log(`📦 إجمالي المنتجات المفحوصة: ${allProducts.length}`);
    console.log("=".repeat(60) + "\n");

    if (restoredProducts.length > 0) {
      console.log("📝 المنتجات التي تم إرجاعها:");
      restoredProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p._id})`);
      });
      console.log("");
    }

    console.log("✨ تمت العملية بنجاح!");
  } catch (error) {
    console.error("❌ خطأ أثناء استرجاع المنتجات:", error);
    throw error;
  }
}

// تشغيل السكريبت
async function main() {
  await connectDB();

  console.log("🚀 بدء عملية استرجاع المنتجات...\n");
  console.log("📋 القواعد:");
  console.log("  • إرجاع جميع الشرايح والراوترات لحالة متوفر");
  console.log("  • تفعيل زر الشراء والإضافة للسلة\n");
  console.log("=".repeat(60) + "\n");

  await restoreProductsStock();

  await mongoose.connection.close();
  console.log("\n✅ تم إغلاق الاتصال بقاعدة البيانات");
  process.exit(0);
}

// تشغيل السكريبت
main().catch((error) => {
  console.error("❌ خطأ فادح:", error);
  process.exit(1);
});
