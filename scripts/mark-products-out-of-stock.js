/**
 * سكريبت لجعل منتجات الشرايح والراوترات نفذت الكمية
 * باستثناء المنتجات التي مدة اشتراكها سنة أو 6 أشهر
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

// دالة للتحقق من مدة الاشتراك من المواصفات
function hasValidSubscription(product) {
  if (!product.specifications || !Array.isArray(product.specifications)) {
    return false;
  }

  // البحث في جميع مجموعات المواصفات
  for (const specGroup of product.specifications) {
    if (!specGroup.items || !Array.isArray(specGroup.items)) {
      continue;
    }

    // البحث عن حقل يتعلق بمدة الاشتراك
    for (const item of specGroup.items) {
      if (!item.label || !item.value) continue;

      const label = item.label.toLowerCase();
      const value = item.value.toLowerCase();

      // التحقق من وجود كلمات تدل على مدة الاشتراك
      if (
        label.includes("اشتراك") ||
        label.includes("الاشتراك") ||
        label.includes("مدة") ||
        label.includes("صلاحية") ||
        label.includes("subscription") ||
        label.includes("duration") ||
        label.includes("validity")
      ) {
        // التحقق من القيم المسموحة: سنة أو 6 أشهر
        if (
          value.includes("سنة") ||
          value.includes("سنه") ||
          value.includes("١٢ شهر") ||
          value.includes("12 شهر") ||
          value.includes("12 month") ||
          value.includes("1 year") ||
          value.includes("٦ أشهر") ||
          value.includes("6 أشهر") ||
          value.includes("6 شهور") ||
          value.includes("6 month")
        ) {
          return true;
        }
      }
    }
  }

  return false;
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
async function markProductsOutOfStock() {
  try {
    console.log("🔍 جاري البحث عن منتجات الشرايح والراوترات...\n");

    // جلب جميع المنتجات (متوفرة أو غير متوفرة)
    const allProducts = await Product.find({});
    console.log(`📦 تم العثور على ${allProducts.length} منتج إجمالي\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updatedProducts = [];
    const skippedProducts = [];

    for (const product of allProducts) {
      // التحقق من أن المنتج شريحة أو راوتر
      if (isSimCardOrRouter(product)) {
        // التحقق من مدة الاشتراك
        if (hasValidSubscription(product)) {
          // استثناء هذا المنتج (مدة اشتراكه سنة أو 6 أشهر)
          skippedCount++;
          skippedProducts.push({
            name: product.name,
            _id: product._id,
            reason: "مدة الاشتراك سنة أو 6 أشهر",
          });
          console.log(`⏩ تم تجاهل: ${product.name} (مدة الاشتراك سنة أو 6 أشهر)`);
        } else {
          // تحديث المنتج ليكون نفذت الكمية (فقط إذا كان متوفراً)
          if (product.inStock) {
            product.inStock = false;
            await product.save();
            updatedCount++;
            updatedProducts.push({
              name: product.name,
              _id: product._id,
            });
            console.log(`✅ تم التحديث: ${product.name} -> نفذت الكمية`);
          } else {
            console.log(`⏭️ تخطي: ${product.name} (بالفعل نفذت الكمية)`);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 ملخص العملية:");
    console.log("=".repeat(60));
    console.log(`✅ عدد المنتجات التي نفذت الكمية: ${updatedCount}`);
    console.log(`⏩ عدد المنتجات المستثناة: ${skippedCount}`);
    console.log(`📦 إجمالي المنتجات المفحوصة: ${allProducts.length}`);
    console.log("=".repeat(60) + "\n");

    if (updatedProducts.length > 0) {
      console.log("📝 المنتجات التي تم تحديثها:");
      updatedProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p._id})`);
      });
      console.log("");
    }

    if (skippedProducts.length > 0) {
      console.log("📝 المنتجات المستثناة:");
      skippedProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} - ${p.reason} (${p._id})`);
      });
      console.log("");
    }

    console.log("✨ تمت العملية بنجاح!");
  } catch (error) {
    console.error("❌ خطأ أثناء تحديث المنتجات:", error);
    throw error;
  }
}

// تشغيل السكريبت
async function main() {
  await connectDB();

  console.log("🚀 بدء عملية تحديث المنتجات...\n");
  console.log("📋 القواعد:");
  console.log("  • تحديث الشرايح والراوترات لتكون نفذت الكمية");
  console.log("  • استثناء المنتجات التي مدة اشتراكها سنة أو 6 أشهر");
  console.log("  • حظر زر الشراء والإضافة للسلة تلقائياً عند inStock = false\n");
  console.log("=".repeat(60) + "\n");

  await markProductsOutOfStock();

  await mongoose.connection.close();
  console.log("\n✅ تم إغلاق الاتصال بقاعدة البيانات");
  process.exit(0);
}

// تشغيل السكريبت
main().catch((error) => {
  console.error("❌ خطأ فادح:", error);
  process.exit(1);
});
